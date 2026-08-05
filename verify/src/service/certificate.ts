/**
 * CertificateService — verifiable authenticity for a completed verification.
 *
 * Every report gets:
 *   - a human **tracking number** (e.g. BRP-2026-K7Q2ML) to print and cite;
 *   - a short **verification code** — a capability derived from a server secret,
 *     so it can't be guessed and can be regenerated without storing it;
 *   - a **tamper-evident integrity hash** — an HMAC over the report's canonical
 *     content, so any later edit to the findings breaks the seal.
 *
 * A recipient scans a QR / opens a link carrying the tracking number + code and
 * gets back a privacy-preserving **certificate of authenticity**: who issued it,
 * for whose initials, the overall result, and the integrity hash — without
 * exposing the candidate's full name, the sources, or their answers.
 *
 * The whole thing is stateless: nothing new is persisted. The tracking number,
 * code, and hash are all deterministic functions of the request and the secret,
 * so they survive restarts and never drift out of sync with stored data.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Candidate, Company, VerificationRequest } from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { NotFoundError } from './errors.ts';

/** Public, privacy-preserving certificate returned to whoever verifies a report. */
export interface Certificate {
  authentic: true;
  issuer: string;
  trackingNumber: string;
  status: VerificationRequest['status'];
  issuedAt: string | null;
  requestedBy: string;
  candidateInitials: string;
  scope: string[];
  sources: { total: number; confirmed: number; declined: number; pending: number };
  result: 'all_confirmed' | 'partial' | 'incomplete';
  integrity: { algorithm: 'HMAC-SHA256'; hash: string };
}

/** Operator-side handle: what to print on the report / encode in the QR. */
export interface CertificateRef {
  trackingNumber: string;
  verificationCode: string;
  verifyUrl: string;
}

const ISSUER = 'Blue Ridge Press LLC';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Crockford-ish, no vowels-only ambiguity

export interface CertificateOptions {
  store: Store;
  /** Server secret; the tracking number, code, and seal all derive from it. */
  secret: string;
  /** Absolute base for the public verify URL, e.g. https://verify.example.com. */
  baseUrl: string;
}

export class CertificateService {
  private readonly store: Store;
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(opts: CertificateOptions) {
    this.store = opts.store;
    this.secret = opts.secret;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
  }

  /** Operator view: the tracking number, code, and verify URL for a report. */
  reference(requestId: string): CertificateRef {
    const request = this.requireRequest(requestId);
    const trackingNumber = this.trackingNumber(request);
    const verificationCode = this.code(request);
    return {
      trackingNumber,
      verificationCode,
      verifyUrl: `${this.baseUrl}/verify?ref=${encodeURIComponent(trackingNumber)}&code=${encodeURIComponent(verificationCode)}`,
    };
  }

  /**
   * Public lookup: given a tracking number (or raw id) and the code, return the
   * certificate of authenticity. A missing request OR a wrong code both surface
   * as "not found" — we never reveal which, so codes can't be probed.
   */
  certificate(key: string, code: string | null | undefined): Certificate {
    const request = this.resolve(key);
    if (!request || !this.codeMatches(request, code)) {
      throw new NotFoundError('certificate', String(key ?? ''));
    }
    const candidate = this.store.candidates.get(request.candidateId);
    const company = this.store.companies.get(request.companyId);

    const counts = { total: request.items.length, confirmed: 0, declined: 0, pending: 0 };
    for (const it of request.items) {
      if (it.status === 'completed' && it.response?.confirmed) counts.confirmed++;
      else if (it.status === 'declined' || (it.status === 'completed' && !it.response?.confirmed)) counts.declined++;
      else counts.pending++;
    }
    const result: Certificate['result'] =
      request.status !== 'completed'
        ? 'incomplete'
        : counts.confirmed === counts.total
          ? 'all_confirmed'
          : 'partial';

    return {
      authentic: true,
      issuer: ISSUER,
      trackingNumber: this.trackingNumber(request),
      status: request.status,
      issuedAt: this.issuedAt(request),
      requestedBy: company?.name ?? 'Unknown',
      candidateInitials: initials(candidate),
      scope: [...new Set(request.items.map((i) => i.type))].sort(),
      sources: counts,
      result,
      integrity: { algorithm: 'HMAC-SHA256', hash: this.integrity(request, candidate, company) },
    };
  }

  // --- derivations (deterministic; secret-keyed) -------------------------

  /** BRP-<year>-<6 chars>, stable for the life of the request. */
  trackingNumber(request: VerificationRequest): string {
    const year = (request.createdAt || '').slice(0, 4) || '0000';
    const body = b32(this.hmac(`track:${request.id}`)).slice(0, 6);
    return `BRP-${year}-${body}`;
  }

  /** An 8-char capability code, grouped XXXX-XXXX. Not derivable without the secret. */
  code(request: VerificationRequest): string {
    const raw = b32(this.hmac(`code:${request.id}`)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  }

  /** HMAC over the report's canonical content — the tamper-evident seal. */
  integrity(request: VerificationRequest, candidate?: Candidate, company?: Company): string {
    return this.hmac(`seal:${canonical(request, candidate, company)}`).toString('hex');
  }

  // --- internals ---------------------------------------------------------

  private codeMatches(request: VerificationRequest, provided: string | null | undefined): boolean {
    if (typeof provided !== 'string') return false;
    const a = Buffer.from(normalizeCode(this.code(request)));
    const b = Buffer.from(normalizeCode(provided));
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Accept either the request id or a tracking number. */
  private resolve(key: string): VerificationRequest | undefined {
    if (typeof key !== 'string' || !key) return undefined;
    const direct = this.store.requests.get(key);
    if (direct) return direct;
    const wanted = key.toUpperCase();
    return this.store.requests.list((r) => this.trackingNumber(r).toUpperCase() === wanted)[0];
  }

  private requireRequest(id: string): VerificationRequest {
    const r = this.store.requests.get(id);
    if (!r) throw new NotFoundError('VerificationRequest', id);
    return r;
  }

  private issuedAt(request: VerificationRequest): string | null {
    if (request.status !== 'completed') return null;
    for (let i = request.history.length - 1; i >= 0; i--) {
      if (request.history[i].event === 'completed') return request.history[i].at;
    }
    return request.updatedAt ?? null;
  }

  private hmac(message: string): Buffer {
    return createHmac('sha256', this.secret).update(message).digest();
  }
}

/**
 * Canonical, order-stable representation of everything a report asserts. Any
 * change to a finding, status, subject, or the consent record changes this
 * string — and therefore the seal.
 */
function canonical(request: VerificationRequest, candidate?: Candidate, company?: Company): string {
  const items = request.items
    .map((it) => ({
      t: it.type,
      s: it.subject,
      st: it.status,
      c: it.response?.confirmed ?? null,
      a: it.response?.answers ?? null,
    }))
    .sort((x, y) => (x.t + x.s).localeCompare(y.t + y.s));
  return JSON.stringify({
    id: request.id,
    status: request.status,
    company: company?.name ?? null,
    candidate: candidate ? `${candidate.firstName} ${candidate.lastName}` : null,
    consentAt: request.consent?.signedAt ?? null,
    disclosure: request.consent?.disclosureVersion ?? null,
    items,
  });
}

function initials(candidate?: Candidate): string {
  if (!candidate) return '—';
  const f = (candidate.firstName || '').trim()[0] ?? '';
  const l = (candidate.lastName || '').trim()[0] ?? '';
  return `${f}${l}`.toUpperCase() || '—';
}

function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z2-7]/g, '');
}

/** Base32 of a buffer, no padding. */
function b32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
