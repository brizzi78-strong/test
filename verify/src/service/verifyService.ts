/**
 * VerifyService — orchestration for consent-based verification.
 *
 * Responsibilities:
 *   - manage companies and candidates
 *   - open a verification request (references / employment / education), each
 *     item getting a private link token
 *   - record the candidate's e-signed consent — the gate that unlocks all
 *     collection (nothing can be verified before it)
 *   - let a source (via their token) confirm or decline an item; complete the
 *     request when every item is resolved
 *   - keep an append-only history
 *
 * Clock and id generator are injected for deterministic tests. This module
 * never touches criminal or credit data — only what the candidate's consent and
 * the source's own attestation make lawful.
 */

import { randomUUID } from 'node:crypto';
import type {
  Candidate,
  Company,
  Consent,
  Item,
  ItemResponse,
  ItemType,
  RequestEvent,
  RequestStatus,
  VerificationRequest,
} from '../domain/types.ts';
import { ITEM_TYPES } from '../domain/types.ts';
import { allItemsResolved, canTransition, progressOf, type Progress } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';
import { ConsoleNotifier, type Notifier } from '../notify/notifier.ts';
import { consentEmail, verifierEmail } from '../notify/messages.ts';

/** The disclosure text version the candidate consents to (bump when it changes). */
export const DISCLOSURE_VERSION = '2026-07';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
  /** How links are sent (default: log them so they stay copy-pasteable). */
  notifier?: Notifier;
  /** Absolute base for the links in emails, e.g. https://verify.example.com. */
  baseUrl?: string;
}

export interface ItemInput {
  type: ItemType;
  subject: string;
  detail?: string;
  contactName?: string;
  contactEmail: string;
}

export interface RequestView {
  request: VerificationRequest;
  candidate: Candidate;
  /** The requesting client — the console lists checks across all of them. */
  company: Company;
  progress: Progress;
}

/** Public, minimal context for a verifier's form (no other items leaked). */
export interface ItemContext {
  companyName: string;
  candidateName: string;
  item: Pick<Item, 'id' | 'type' | 'subject' | 'detail' | 'contactName' | 'status'>;
  alreadyResponded: boolean;
}

export class VerifyService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;
  private readonly notifier: Notifier;
  private readonly baseUrl: string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID().replace(/-/g, '')}`);
    this.notifier = opts.notifier ?? new ConsoleNotifier();
    this.baseUrl = (opts.baseUrl ?? 'http://localhost:4600').replace(/\/+$/, '');
  }

  // --- Companies / candidates -------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  createCandidate(input: { companyId: string; firstName: string; lastName: string; email: string }): Candidate {
    this.requireCompany(input.companyId);
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) throw new ValidationError(`email is not a valid address: ${email}`);
    const candidate: Candidate = {
      id: this.newId('cand'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      createdAt: this.timestamp(),
    };
    this.store.candidates.put(candidate);
    return candidate;
  }

  getCandidate(id: string): Candidate {
    return this.require(this.store.candidates, 'Candidate', id);
  }

  listCandidates(filter?: { companyId?: string }): Candidate[] {
    return this.store.candidates.list((c) => !filter?.companyId || c.companyId === filter.companyId);
  }

  // --- Requests ----------------------------------------------------------

  async createRequest(input: { companyId: string; candidateId: string; items: ItemInput[] }): Promise<VerificationRequest> {
    const company = this.requireCompany(input.companyId);
    const candidate = this.require(this.store.candidates, 'Candidate', input.candidateId);
    if (candidate.companyId !== company.id) {
      throw new ValidationError('candidate does not belong to company');
    }
    const items = this.buildItems(input.items);
    const ts = this.timestamp();
    const request: VerificationRequest = {
      id: this.newId('req'),
      companyId: company.id,
      candidateId: candidate.id,
      status: 'awaiting_consent',
      consentToken: this.newId('ct'),
      items,
      history: [{ at: ts, event: 'created', note: `${items.length} item(s)` }],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.requests.put(request);

    // Email the candidate their consent link. No source is contacted yet.
    await this.deliver(request, candidate.email, 'consent', () =>
      consentEmail({
        to: candidate.email,
        companyName: company.name,
        candidateFirstName: candidate.firstName,
        url: this.link('/c/', request.consentToken),
      }),
    );
    return this.save(request);
  }

  getRequest(id: string): VerificationRequest {
    return this.require(this.store.requests, 'VerificationRequest', id);
  }

  listRequests(filter?: { companyId?: string; candidateId?: string }): VerificationRequest[] {
    return this.store.requests.list((r) => {
      if (filter?.companyId && r.companyId !== filter.companyId) return false;
      if (filter?.candidateId && r.candidateId !== filter.candidateId) return false;
      return true;
    });
  }

  view(id: string): RequestView {
    const request = this.getRequest(id);
    return {
      request,
      candidate: this.getCandidate(request.candidateId),
      company: this.require(this.store.companies, 'Company', request.companyId),
      progress: progressOf(request.items),
    };
  }

  cancelRequest(id: string): VerificationRequest {
    const request = this.getRequest(id);
    if (!canTransition(request.status, 'canceled')) {
      throw new ConflictError(`a '${request.status}' request can't be canceled`);
    }
    this.transition(request, 'canceled');
    this.record(request, { event: 'canceled' });
    return this.save(request);
  }

  // --- Candidate consent (public, by token) ------------------------------

  /** The request behind a consent link, for rendering the disclosure page. */
  getByConsentToken(token: string): { request: VerificationRequest; candidate: Candidate; company: Company } {
    const request = this.findRequest((r) => r.consentToken === token, 'consent link');
    return {
      request,
      candidate: this.getCandidate(request.candidateId),
      company: this.require(this.store.companies, 'Company', request.companyId),
    };
  }

  /** Record the candidate's e-signed authorization; unlocks collection. */
  async recordConsent(token: string, input: { signedName: string; ip?: string }): Promise<VerificationRequest> {
    const request = this.findRequest((r) => r.consentToken === token, 'consent link');
    if (request.status !== 'awaiting_consent') {
      throw new ConflictError(`consent already recorded or request is '${request.status}'`);
    }
    const consent: Consent = {
      signedName: requireString(input.signedName, 'signedName'),
      signedAt: this.timestamp(),
      disclosureVersion: DISCLOSURE_VERSION,
      ip: optionalString(input.ip),
    };
    request.consent = consent;
    this.transition(request, 'in_progress');
    this.record(request, { event: 'consented', note: consent.signedName });
    this.save(request);

    // Consent is the gate: only now are the sources emailed their links.
    const company = this.requireCompany(request.companyId);
    const candidate = this.getCandidate(request.candidateId);
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    for (const item of request.items) {
      if (item.status !== 'pending') continue;
      await this.deliver(request, item.contactEmail, 'verifier', () =>
        verifierEmail({
          to: item.contactEmail,
          companyName: company.name,
          candidateName,
          itemType: item.type,
          subject: item.subject,
          url: this.link('/v/', item.token),
        }),
      );
    }
    return this.save(request);
  }

  // --- Verifier attestation (public, by token) ---------------------------

  /** Context for a verifier's form. Only available after the candidate consents. */
  getItemByToken(token: string): ItemContext {
    const { request, item } = this.locateItem(token);
    if (!request.consent) throw new ConflictError('this link is not active yet');
    const candidate = this.getCandidate(request.candidateId);
    const company = this.require(this.store.companies, 'Company', request.companyId);
    return {
      companyName: company.name,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      item: {
        id: item.id,
        type: item.type,
        subject: item.subject,
        detail: item.detail,
        contactName: item.contactName,
        status: item.status,
      },
      alreadyResponded: item.status !== 'pending',
    };
  }

  submitVerification(
    token: string,
    input: { verifierName: string; confirmed?: boolean; answers?: Record<string, string>; declined?: boolean },
  ): { ok: true; requestCompleted: boolean } {
    const { request, item } = this.locateItem(token);
    if (!request.consent) throw new ConflictError('this link is not active yet');
    if (item.status !== 'pending') throw new ConflictError('this item has already been answered');

    const verifierName = requireString(input.verifierName, 'verifierName');
    if (input.declined) {
      item.status = 'declined';
      this.record(request, { event: 'item.declined', note: `${item.type}: ${item.subject}` });
    } else {
      const response: ItemResponse = {
        respondedAt: this.timestamp(),
        verifierName,
        confirmed: input.confirmed !== false,
        answers: sanitizeAnswers(input.answers),
      };
      item.response = response;
      item.status = 'completed';
      this.record(request, {
        event: 'item.completed',
        note: `${item.type}: ${item.subject} (${response.confirmed ? 'confirmed' : 'not confirmed'})`,
      });
    }

    let requestCompleted = false;
    if (request.status === 'in_progress' && allItemsResolved(request.items)) {
      this.transition(request, 'completed');
      this.record(request, { event: 'completed' });
      requestCompleted = true;
    }
    this.save(request);
    return { ok: true, requestCompleted };
  }

  // --- internals ---------------------------------------------------------

  private link(prefix: string, token: string): string {
    return `${this.baseUrl}${prefix}${token}`;
  }

  /**
   * Send one email and record the outcome on the request's history. A failed
   * send never throws — consent and request creation still succeed, and the
   * failure is visible so the link can be re-sent (or copied from the console).
   */
  private async deliver(
    request: VerificationRequest,
    to: string,
    kind: 'consent' | 'verifier',
    build: () => { to: string; subject: string; text: string; html?: string },
  ): Promise<void> {
    try {
      await this.notifier.send(build());
      this.record(request, { event: `${kind}.emailed`, note: `${to} via ${this.notifier.kind}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.record(request, { event: `${kind}.email_failed`, note: `${to}: ${message}`.slice(0, 300) });
    }
  }

  private buildItems(items: ItemInput[]): Item[] {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('add at least one item to verify');
    }
    return items.map((raw, i) => {
      if (!ITEM_TYPES.includes(raw?.type)) {
        throw new ValidationError(`items[${i}].type must be one of ${ITEM_TYPES.join(', ')}`);
      }
      const contactEmail = requireString(raw.contactEmail, `items[${i}].contactEmail`);
      if (!EMAIL_RE.test(contactEmail)) {
        throw new ValidationError(`items[${i}].contactEmail is not a valid address`);
      }
      return {
        id: this.newId('item'),
        type: raw.type,
        subject: requireString(raw.subject, `items[${i}].subject`),
        detail: optionalString(raw.detail),
        contactName: optionalString(raw.contactName),
        contactEmail,
        token: this.newId('it'),
        status: 'pending',
      };
    });
  }

  private locateItem(token: string): { request: VerificationRequest; item: Item } {
    for (const request of this.store.requests.list()) {
      const item = request.items.find((it) => it.token === token);
      if (item) return { request, item };
    }
    throw new NotFoundError('verification link', token);
  }

  private findRequest(predicate: (r: VerificationRequest) => boolean, what: string): VerificationRequest {
    const found = this.store.requests.list(predicate)[0];
    if (!found) throw new NotFoundError(what, '');
    return found;
  }

  private transition(request: VerificationRequest, to: RequestStatus): void {
    if (!canTransition(request.status, to)) {
      throw new ConflictError(`illegal transition '${request.status}' -> '${to}'`);
    }
    request.status = to;
  }

  private record(request: VerificationRequest, meta: Omit<RequestEvent, 'at'>): void {
    request.history.push({ at: this.timestamp(), ...meta });
  }

  private save(request: VerificationRequest): VerificationRequest {
    request.updatedAt = this.timestamp();
    this.store.requests.put(request);
    return request;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError(`${what} id is required`);
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('expected a string');
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Keep answers as a flat string→string map, trimmed and bounded. */
function sanitizeAnswers(answers: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (answers && typeof answers === 'object') {
    for (const [k, v] of Object.entries(answers)) {
      if (typeof k === 'string' && typeof v === 'string' && v.trim()) {
        out[k.slice(0, 60)] = v.trim().slice(0, 2000);
      }
    }
  }
  return out;
}
