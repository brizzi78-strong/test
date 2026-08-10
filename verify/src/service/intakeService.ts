/**
 * IntakeService — the bridge from the public website to a real check.
 *
 * The website can take an order; it cannot start a check. That separation is
 * deliberate and load-bearing:
 *
 *   A verification request causes us to email a named person a formal
 *   "authorize a background check on yourself" message, and then to email
 *   their employers and references. If an anonymous visitor could trigger
 *   that, the service would be a ready-made tool for harassment — and a
 *   verification company that can be aimed at strangers has no credibility
 *   left to sell. So the public endpoint only ever records an *intake* and
 *   tells the operator. Nothing leaves the building until a human approves.
 *
 * Approval is the single point where an intake becomes a VerificationRequest,
 * creating the company and candidate as needed and handing off to
 * VerifyService, which owns the consent-gated workflow from there.
 */

import type { Intake, IntakeSource, VerificationRequest } from '../domain/types.ts';
import { ITEM_TYPES } from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';
import type { VerifyService } from './verifyService.ts';
import type { Notifier } from '../notify/notifier.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SOURCES = 12;
const MAX_TEXT = 200;
const MAX_NOTE = 2000;

export interface IntakeInput {
  requesterName: string;
  requesterEmail: string;
  companyName?: string;
  candidateFirstName: string;
  candidateLastName: string;
  candidateEmail: string;
  sources: IntakeSource[];
  note?: string;
}

export interface IntakeServiceOptions {
  store: Store;
  verify: VerifyService;
  notifier?: Notifier;
  /** Where to tell the operator a new order arrived. */
  operatorEmail?: string;
  baseUrl?: string;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export class IntakeService {
  private readonly store: Store;
  private readonly verify: VerifyService;
  private readonly notifier?: Notifier;
  private readonly operatorEmail?: string;
  private readonly baseUrl: string;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: IntakeServiceOptions) {
    this.store = opts.store;
    this.verify = opts.verify;
    this.notifier = opts.notifier;
    this.operatorEmail = opts.operatorEmail;
    this.baseUrl = (opts.baseUrl ?? 'http://localhost:4600').replace(/\/+$/, '');
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((p) => `${p}_${crypto.randomUUID().replace(/-/g, '')}`);
  }

  /**
   * Public: record an order from the website. Never contacts the candidate or
   * any source — only notifies the operator that something is waiting.
   */
  async submit(input: IntakeInput): Promise<{ id: string; status: 'pending' }> {
    const intake: Intake = {
      id: this.newId('intake'),
      status: 'pending',
      requesterName: text(input.requesterName, 'requesterName'),
      requesterEmail: email(input.requesterEmail, 'requesterEmail'),
      companyName: input.companyName?.trim() ? text(input.companyName, 'companyName') : text(input.requesterName, 'requesterName'),
      candidateFirstName: text(input.candidateFirstName, 'candidateFirstName'),
      candidateLastName: text(input.candidateLastName, 'candidateLastName'),
      candidateEmail: email(input.candidateEmail, 'candidateEmail'),
      sources: sources(input.sources),
      note: input.note?.trim() ? clamp(input.note.trim(), MAX_NOTE) : undefined,
      createdAt: this.now().toISOString(),
    };
    this.store.intakes.put(intake);
    await this.notifyOperator(intake);
    return { id: intake.id, status: 'pending' };
  }

  /** Operator: everything waiting, newest first. */
  list(filter?: { status?: Intake['status'] }): Intake[] {
    return this.store.intakes
      .list((i) => !filter?.status || i.status === filter.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): Intake {
    const intake = this.store.intakes.get(id);
    if (!intake) throw new NotFoundError('Intake', id);
    return intake;
  }

  /**
   * Operator: approve an order. This is the only path that turns a website
   * submission into a real request — and therefore the only path that causes
   * anyone to be emailed.
   */
  async approve(id: string): Promise<VerificationRequest> {
    const intake = this.get(id);
    if (intake.status !== 'pending') {
      throw new ConflictError(`intake is already ${intake.status}`);
    }

    // Reuse an existing company of the same name so a repeat client keeps one
    // portal and one history rather than accumulating duplicates.
    const existing = this.store.companies.list((c) => c.name === intake.companyName)[0];
    const company = existing ?? this.verify.createCompany({ name: intake.companyName });

    const candidate = this.verify.createCandidate({
      companyId: company.id,
      firstName: intake.candidateFirstName,
      lastName: intake.candidateLastName,
      email: intake.candidateEmail,
    });

    const request = await this.verify.createRequest({
      companyId: company.id,
      candidateId: candidate.id,
      items: intake.sources.map((s) => ({
        type: s.type,
        subject: s.subject,
        detail: s.detail,
        contactEmail: s.contactEmail,
      })),
    });

    intake.status = 'approved';
    intake.decidedAt = this.now().toISOString();
    intake.requestId = request.id;
    this.store.intakes.put(intake);
    return request;
  }

  /** Operator: decline an order. Nothing is created and nobody is contacted. */
  decline(id: string, reason?: string): Intake {
    const intake = this.get(id);
    if (intake.status !== 'pending') {
      throw new ConflictError(`intake is already ${intake.status}`);
    }
    intake.status = 'declined';
    intake.decidedAt = this.now().toISOString();
    if (reason?.trim()) intake.declineReason = clamp(reason.trim(), MAX_NOTE);
    this.store.intakes.put(intake);
    return intake;
  }

  private async notifyOperator(intake: Intake): Promise<void> {
    if (!this.notifier || !this.operatorEmail) return;
    const lines = intake.sources.map((s) => `  · ${s.type}: ${s.subject} <${s.contactEmail}>`).join('\n');
    try {
      await this.notifier.send({
        to: this.operatorEmail,
        subject: `New check request from ${intake.requesterName}`,
        text:
          `${intake.requesterName} (${intake.requesterEmail}) requested a verification.\n\n` +
          `Company: ${intake.companyName}\n` +
          `Candidate: ${intake.candidateFirstName} ${intake.candidateLastName} <${intake.candidateEmail}>\n\n` +
          `To verify:\n${lines}\n` +
          (intake.note ? `\nNote: ${intake.note}\n` : '') +
          `\nNobody has been contacted yet. Approve it in the console to start the check:\n${this.baseUrl}/\n`,
      });
    } catch {
      // A failed notification must never lose the order — it is stored either
      // way, and the console lists everything pending.
    }
  }
}

// --- validation ------------------------------------------------------------

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required`);
  return clamp(value.trim(), MAX_TEXT);
}

function email(value: unknown, field: string): string {
  const v = text(value, field);
  if (!EMAIL_RE.test(v)) throw new ValidationError(`${field} is not a valid address: ${v}`);
  return v;
}

function sources(value: unknown): IntakeSource[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('at least one reference, employer, or school is required');
  }
  if (value.length > MAX_SOURCES) {
    throw new ValidationError(`no more than ${MAX_SOURCES} sources per request`);
  }
  return value.map((raw, i) => {
    const s = raw as Partial<IntakeSource>;
    if (!ITEM_TYPES.includes(s.type as never)) {
      throw new ValidationError(`sources[${i}].type must be one of: ${ITEM_TYPES.join(', ')}`);
    }
    return {
      type: s.type as IntakeSource['type'],
      subject: text(s.subject, `sources[${i}].subject`),
      detail: s.detail?.trim() ? clamp(s.detail.trim(), MAX_TEXT) : undefined,
      contactEmail: email(s.contactEmail, `sources[${i}].contactEmail`),
    };
  });
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}
