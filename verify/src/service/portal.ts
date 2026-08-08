/**
 * PortalService — the client's own read-only view of their checks.
 *
 * The operator console is gated behind a single admin password, which is right
 * for the operator but useless for clients: a hiring manager should be able to
 * watch their own checks progress and re-download their own reports without
 * emailing us, and without seeing anybody else's candidates.
 *
 * Each company gets a long, unguessable **access token** derived from a server
 * secret — the same stateless trick the certificate service uses, so no schema
 * change and no new table. The token is a capability: whoever holds the link
 * sees that company's history and nothing else. Every lookup re-checks that the
 * request being asked for actually belongs to the token's company, so a client
 * can't reach another client's report by guessing an id.
 *
 * Read-only by construction: nothing here mutates state.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Company, VerificationRequest } from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { NotFoundError } from './errors.ts';
import type { CertificateService } from './certificate.ts';

/** Operator view: the link to hand a client. */
export interface ClientAccess {
  companyId: string;
  companyName: string;
  token: string;
  url: string;
}

/** One row in the client's history. */
export interface ClientReport {
  requestId: string;
  candidateName: string;
  status: VerificationRequest['status'];
  progress: { completed: number; total: number };
  requestedAt: string;
  consentedAt: string | null;
  trackingNumber: string;
  /** Present only once the check is finished. */
  issuedAt: string | null;
  result: 'all_confirmed' | 'partial' | 'incomplete';
  /** True when a PDF can be downloaded (i.e. the check is complete). */
  reportReady: boolean;
}

export interface ClientHistory {
  companyName: string;
  reports: ClientReport[];
}

export interface PortalOptions {
  store: Store;
  cert: CertificateService;
  /** Server secret keying the client access tokens. */
  secret: string;
  baseUrl: string;
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class PortalService {
  private readonly store: Store;
  private readonly cert: CertificateService;
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(opts: PortalOptions) {
    this.store = opts.store;
    this.cert = opts.cert;
    this.secret = opts.secret;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
  }

  /** Operator: the client portal link for a company. */
  accessLink(companyId: string): ClientAccess {
    const company = this.store.companies.get(companyId);
    if (!company) throw new NotFoundError('Company', companyId);
    const token = this.token(company.id);
    return {
      companyId: company.id,
      companyName: company.name,
      token,
      url: `${this.baseUrl}/client/${token}`,
    };
  }

  /** Client: their own history. A bad token is indistinguishable from none. */
  history(token: string): ClientHistory {
    const company = this.resolve(token);
    const reports = this.store.requests
      .list((r) => r.companyId === company.id)
      .map((r) => this.row(r))
      // Newest first — the client almost always wants their latest check.
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return { companyName: company.name, reports };
  }

  /**
   * Client: one of their requests, by id. Throws unless the request really
   * belongs to the token's company — this is the isolation boundary.
   */
  requestFor(token: string, requestId: string): VerificationRequest {
    const company = this.resolve(token);
    const request = this.store.requests.get(requestId);
    if (!request || request.companyId !== company.id) {
      throw new NotFoundError('VerificationRequest', requestId);
    }
    return request;
  }

  // --- internals ---------------------------------------------------------

  /** A 32-char capability token for a company id. Stateless, secret-keyed. */
  private token(companyId: string): string {
    return b32(createHmac('sha256', this.secret).update(`client:${companyId}`).digest()).slice(0, 32);
  }

  /** Find the company a token belongs to, in constant time per candidate. */
  private resolve(token: string): Company {
    if (typeof token !== 'string' || !token) throw new NotFoundError('client portal', '');
    const wanted = Buffer.from(token.toUpperCase());
    for (const company of this.store.companies.list()) {
      const actual = Buffer.from(this.token(company.id));
      if (actual.length === wanted.length && timingSafeEqual(actual, wanted)) return company;
    }
    throw new NotFoundError('client portal', '');
  }

  private row(request: VerificationRequest): ClientReport {
    const candidate = this.store.candidates.get(request.candidateId);
    const ref = this.cert.reference(request.id);
    // The certificate is the single source of truth for result + issue date,
    // so the client portal can never disagree with the printed report.
    const record = this.cert.certificate(request.id, ref.verificationCode);
    const completed = request.items.filter((i) => i.status !== 'pending').length;
    return {
      requestId: request.id,
      candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown',
      status: request.status,
      progress: { completed, total: request.items.length },
      requestedAt: request.createdAt,
      consentedAt: request.consent?.signedAt ?? null,
      trackingNumber: ref.trackingNumber,
      issuedAt: record.issuedAt,
      result: record.result,
      reportReady: request.status === 'completed',
    };
  }
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
