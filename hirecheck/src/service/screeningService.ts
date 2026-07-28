/**
 * ScreeningService — the orchestration layer for new-hire background checks.
 *
 * Responsibilities:
 *   - manage companies, candidates, and reusable screening packages
 *   - drive a screening order through its FCRA-aware lifecycle
 *   - delegate the actual lookups to a pluggable ScreeningProvider
 *   - keep an append-only transition history on every order (audit trail)
 *
 * The clock and id generator are injected so the whole lifecycle is
 * deterministic under test.
 */

import { randomUUID } from 'node:crypto';
import type {
  Adjudication,
  AdjudicationDecision,
  Authorization,
  Candidate,
  CheckResult,
  CheckType,
  Company,
  OrderStatus,
  ScreeningOrder,
  ScreeningPackage,
  TransitionEvent,
} from '../domain/types.ts';
import { CHECK_TYPES } from '../domain/types.ts';
import {
  allChecksResolved,
  canTransition,
  isTerminal,
  requiresReview,
} from '../domain/workflow.ts';
import type { ProviderSubject, ScreeningProvider } from '../providers/provider.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  provider: ScreeningProvider;
  /** Injectable clock; defaults to the system clock. */
  now?: () => Date;
  /** Injectable id factory; defaults to random UUIDs. */
  newId?: (prefix: string) => string;
  /**
   * Business days a candidate has to dispute after a pre-adverse notice before
   * final adverse action may be taken. FCRA has no fixed number; 5 is the
   * widely used safe-harbor default.
   */
  adverseActionWaitingDays?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ScreeningService {
  private readonly store: Store;
  private readonly provider: ScreeningProvider;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;
  private readonly waitingDays: number;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.provider = opts.provider;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.waitingDays = opts.adverseActionWaitingDays ?? 5;
  }

  // --- Companies ---------------------------------------------------------

  createCompany(input: { name: string }): Company {
    const name = requireString(input.name, 'name');
    const company: Company = {
      id: this.newId('co'),
      name,
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  // --- Candidates --------------------------------------------------------

  createCandidate(input: {
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
  }): Candidate {
    this.requireCompany(input.companyId);
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) {
      throw new ValidationError(`email is not a valid address: ${email}`);
    }
    const candidate: Candidate = {
      id: this.newId('cand'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      position: requireString(input.position, 'position'),
      createdAt: this.timestamp(),
    };
    this.store.candidates.put(candidate);
    return candidate;
  }

  // --- Screening packages ------------------------------------------------

  createPackage(input: {
    companyId: string;
    name: string;
    checkTypes: CheckType[];
  }): ScreeningPackage {
    this.requireCompany(input.companyId);
    const checkTypes = this.validateCheckTypes(input.checkTypes);
    const pkg: ScreeningPackage = {
      id: this.newId('pkg'),
      companyId: input.companyId,
      name: requireString(input.name, 'name'),
      checkTypes,
      createdAt: this.timestamp(),
    };
    this.store.packages.put(pkg);
    return pkg;
  }

  // --- Orders ------------------------------------------------------------

  createOrder(input: {
    companyId: string;
    candidateId: string;
    packageId: string;
  }): ScreeningOrder {
    const company = this.requireCompany(input.companyId);
    const candidate = this.require(this.store.candidates, 'Candidate', input.candidateId);
    const pkg = this.require(this.store.packages, 'ScreeningPackage', input.packageId);

    if (candidate.companyId !== company.id) {
      throw new ValidationError('candidate does not belong to company');
    }
    if (pkg.companyId !== company.id) {
      throw new ValidationError('package does not belong to company');
    }

    const ts = this.timestamp();
    const checks: CheckResult[] = pkg.checkTypes.map((type) => ({
      type,
      status: 'pending',
      records: [],
    }));
    const order: ScreeningOrder = {
      id: this.newId('ord'),
      companyId: company.id,
      candidateId: candidate.id,
      packageId: pkg.id,
      status: 'created',
      checks,
      history: [],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.orders.put(order);
    return order;
  }

  getOrder(orderId: string): ScreeningOrder {
    return this.require(this.store.orders, 'ScreeningOrder', orderId);
  }

  listOrders(filter?: { companyId?: string; status?: OrderStatus }): ScreeningOrder[] {
    return this.store.orders.list((o) => {
      if (filter?.companyId && o.companyId !== filter.companyId) return false;
      if (filter?.status && o.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Record the candidate's FCRA disclosure + authorization. Required before any
   * check can run.
   */
  recordAuthorization(
    orderId: string,
    input: { method: string; disclosureVersion: string; ipAddress?: string },
  ): ScreeningOrder {
    const order = this.getOrder(orderId);
    const authorization: Authorization = {
      authorizedAt: this.timestamp(),
      method: requireString(input.method, 'method'),
      disclosureVersion: requireString(input.disclosureVersion, 'disclosureVersion'),
      ipAddress: input.ipAddress,
    };
    order.authorization = authorization;
    this.transition(order, 'authorized', { note: 'candidate authorization recorded' });
    return this.save(order);
  }

  /**
   * Run the package's checks via the provider. The candidate must have
   * authorized first (enforced by the `authorized -> in_progress` transition).
   */
  async submitOrder(orderId: string): Promise<ScreeningOrder> {
    const order = this.getOrder(orderId);
    if (!order.authorization) {
      throw new ConflictError('order has no candidate authorization on file');
    }
    this.transition(order, 'in_progress', { note: 'checks dispatched to provider' });
    this.save(order);

    const candidate = this.require(this.store.candidates, 'Candidate', order.candidateId);
    const subject: ProviderSubject = {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
    };

    order.checks = await Promise.all(
      order.checks.map(async (check): Promise<CheckResult> => {
        const outcome = await this.provider.runCheck(check.type, subject);
        return {
          type: check.type,
          status: outcome.status,
          records: outcome.records,
          completedAt: this.timestamp(),
        };
      }),
    );

    if (allChecksResolved(order.checks)) {
      this.transition(order, 'completed', {
        note: requiresReview(order.checks)
          ? 'results in; review required'
          : 'results in; all clear',
      });
    }
    return this.save(order);
  }

  /**
   * Adjudicate a completed order. `clear` engages the candidate; `adverse`
   * opens the FCRA pre-adverse-action process (it does NOT immediately reject
   * the candidate — a waiting period must elapse first).
   */
  adjudicate(
    orderId: string,
    input: { decision: AdjudicationDecision; adjudicatedBy: string; notes?: string },
  ): ScreeningOrder {
    const order = this.getOrder(orderId);
    if (order.status !== 'completed') {
      throw new ConflictError(
        `order must be 'completed' to adjudicate (is '${order.status}')`,
      );
    }
    const decision = input.decision;
    if (decision !== 'clear' && decision !== 'adverse') {
      throw new ValidationError(`decision must be 'clear' or 'adverse'`);
    }

    const adjudication: Adjudication = {
      decision,
      adjudicatedBy: requireString(input.adjudicatedBy, 'adjudicatedBy'),
      adjudicatedAt: this.timestamp(),
      notes: input.notes,
    };
    order.adjudication = adjudication;

    if (decision === 'clear') {
      this.transition(order, 'clear', { by: adjudication.adjudicatedBy, note: 'adjudicated clear' });
    } else {
      const preAdverseAt = this.now();
      order.adverseAction = {
        preAdverseAt: preAdverseAt.toISOString(),
        earliestFinalAt: addBusinessDays(preAdverseAt, this.waitingDays).toISOString(),
      };
      this.transition(order, 'pre_adverse_action', {
        by: adjudication.adjudicatedBy,
        note: 'pre-adverse action notice issued',
      });
    }
    return this.save(order);
  }

  /**
   * Take final adverse action after the dispute window has elapsed. Rejected if
   * called before `adverseAction.earliestFinalAt`.
   */
  finalizeAdverseAction(orderId: string, input?: { reason?: string }): ScreeningOrder {
    const order = this.getOrder(orderId);
    if (order.status !== 'pre_adverse_action' || !order.adverseAction) {
      throw new ConflictError(
        `order must be in 'pre_adverse_action' to finalize (is '${order.status}')`,
      );
    }
    const earliest = new Date(order.adverseAction.earliestFinalAt);
    if (this.now() < earliest) {
      throw new ConflictError(
        `adverse-action waiting period ends at ${order.adverseAction.earliestFinalAt}`,
      );
    }
    order.adverseAction = {
      ...order.adverseAction,
      adverseAt: this.timestamp(),
      reason: input?.reason,
    };
    this.transition(order, 'adverse_action', { note: 'final adverse action taken' });
    return this.save(order);
  }

  /**
   * Reverse a pending adverse action (e.g. the candidate successfully disputed
   * the report during the waiting period) and clear them instead.
   */
  clearAfterDispute(orderId: string, input: { by: string; note?: string }): ScreeningOrder {
    const order = this.getOrder(orderId);
    if (order.status !== 'pre_adverse_action') {
      throw new ConflictError(
        `order must be in 'pre_adverse_action' to reverse (is '${order.status}')`,
      );
    }
    this.transition(order, 'clear', {
      by: requireString(input.by, 'by'),
      note: input.note ?? 'cleared after dispute',
    });
    return this.save(order);
  }

  cancelOrder(orderId: string, input?: { reason?: string }): ScreeningOrder {
    const order = this.getOrder(orderId);
    if (isTerminal(order.status)) {
      throw new ConflictError(`order is already in terminal state '${order.status}'`);
    }
    this.transition(order, 'canceled', { note: input?.reason ?? 'order canceled' });
    return this.save(order);
  }

  // --- internals ---------------------------------------------------------

  private transition(
    order: ScreeningOrder,
    to: OrderStatus,
    meta?: { by?: string; note?: string },
  ): void {
    if (!canTransition(order.status, to)) {
      throw new ConflictError(
        `illegal transition '${order.status}' -> '${to}' for order ${order.id}`,
      );
    }
    const event: TransitionEvent = {
      at: this.timestamp(),
      from: order.status,
      to,
      by: meta?.by,
      note: meta?.note,
    };
    order.history.push(event);
    order.status = to;
  }

  private save(order: ScreeningOrder): ScreeningOrder {
    order.updatedAt = this.timestamp();
    this.store.orders.put(order);
    return order;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError(`${what} id is required`);
    }
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }

  private validateCheckTypes(types: CheckType[]): CheckType[] {
    if (!Array.isArray(types) || types.length === 0) {
      throw new ValidationError('checkTypes must be a non-empty array');
    }
    const seen = new Set<CheckType>();
    for (const t of types) {
      if (!CHECK_TYPES.includes(t)) {
        throw new ValidationError(`unknown check type: ${String(t)}`);
      }
      seen.add(t);
    }
    return [...seen];
  }
}

/** Add `n` business days (Mon–Fri) to a date, preserving the time of day. */
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from.getTime());
  let remaining = n;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return d;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}
