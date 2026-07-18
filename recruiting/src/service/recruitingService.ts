/**
 * RecruitingService — orchestration for job requisitions and applications.
 *
 * Responsibilities:
 *   - manage companies and job requisitions
 *   - accept applications against open requisitions
 *   - move each application through the hiring pipeline with enforced
 *     transitions, keeping an append-only stage history (audit trail)
 *
 * When an application reaches `hired`, that is the hand-off point to the rest of
 * the suite (HireCheck screening, MyHR onboarding). Those are intentionally not
 * called from here — the modules stay decoupled; `hired` is simply the signal.
 *
 * The clock and id generator are injected so the lifecycle is deterministic
 * under test.
 */

import { randomUUID } from 'node:crypto';
import type {
  Application,
  ApplicationStage,
  Company,
  EmploymentType,
  JobRequisition,
  RequisitionStatus,
  StageEvent,
} from '../domain/types.ts';
import { EMPLOYMENT_TYPES } from '../domain/types.ts';
import {
  canTransitionApplication,
  canTransitionRequisition,
  isApplicationTerminal,
  isRequisitionTerminal,
} from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RecruitingService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies ---------------------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  // --- Requisitions ------------------------------------------------------

  createRequisition(input: {
    companyId: string;
    title: string;
    department: string;
    location: string;
    employmentType: EmploymentType;
  }): JobRequisition {
    this.requireCompany(input.companyId);
    if (!EMPLOYMENT_TYPES.includes(input.employmentType)) {
      throw new ValidationError(`unknown employmentType: ${String(input.employmentType)}`);
    }
    const ts = this.timestamp();
    const requisition: JobRequisition = {
      id: this.newId('req'),
      companyId: input.companyId,
      title: requireString(input.title, 'title'),
      department: requireString(input.department, 'department'),
      location: requireString(input.location, 'location'),
      employmentType: input.employmentType,
      status: 'open',
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.requisitions.put(requisition);
    return requisition;
  }

  getRequisition(id: string): JobRequisition {
    return this.require(this.store.requisitions, 'JobRequisition', id);
  }

  listRequisitions(filter?: { companyId?: string; status?: RequisitionStatus }): JobRequisition[] {
    return this.store.requisitions.list((r) => {
      if (filter?.companyId && r.companyId !== filter.companyId) return false;
      if (filter?.status && r.status !== filter.status) return false;
      return true;
    });
  }

  setRequisitionStatus(id: string, status: RequisitionStatus): JobRequisition {
    const requisition = this.getRequisition(id);
    if (!canTransitionRequisition(requisition.status, status)) {
      throw new ConflictError(
        `illegal requisition transition '${requisition.status}' -> '${status}'`,
      );
    }
    requisition.status = status;
    requisition.updatedAt = this.timestamp();
    this.store.requisitions.put(requisition);
    return requisition;
  }

  // --- Applications ------------------------------------------------------

  createApplication(input: {
    companyId: string;
    requisitionId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
  }): Application {
    const company = this.requireCompany(input.companyId);
    const requisition = this.getRequisition(input.requisitionId);
    if (requisition.companyId !== company.id) {
      throw new ValidationError('requisition does not belong to company');
    }
    if (requisition.status !== 'open') {
      throw new ConflictError(`requisition is not open (status '${requisition.status}')`);
    }
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) {
      throw new ValidationError(`email is not a valid address: ${email}`);
    }

    const ts = this.timestamp();
    const application: Application = {
      id: this.newId('app'),
      companyId: company.id,
      requisitionId: requisition.id,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      phone: input.phone,
      resumeUrl: input.resumeUrl,
      stage: 'applied',
      history: [],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.applications.put(application);
    return application;
  }

  getApplication(id: string): Application {
    return this.require(this.store.applications, 'Application', id);
  }

  listApplications(filter?: {
    companyId?: string;
    requisitionId?: string;
    stage?: ApplicationStage;
  }): Application[] {
    return this.store.applications.list((a) => {
      if (filter?.companyId && a.companyId !== filter.companyId) return false;
      if (filter?.requisitionId && a.requisitionId !== filter.requisitionId) return false;
      if (filter?.stage && a.stage !== filter.stage) return false;
      return true;
    });
  }

  /** Advance an application one step forward in the pipeline. */
  advanceApplication(id: string, input: { toStage: ApplicationStage; by?: string; note?: string }): Application {
    return this.moveApplication(id, input.toStage, { by: input.by, note: input.note });
  }

  rejectApplication(id: string, input: { by?: string; reason?: string }): Application {
    const app = this.moveApplication(id, 'rejected', { by: input.by, note: input.reason });
    app.outcomeReason = input.reason;
    return this.save(app);
  }

  withdrawApplication(id: string, input?: { reason?: string }): Application {
    const app = this.moveApplication(id, 'withdrawn', { note: input?.reason });
    app.outcomeReason = input?.reason;
    return this.save(app);
  }

  /**
   * Mark an application hired (from `offer`). This is the hand-off signal to
   * screening/onboarding; optionally mark the requisition filled in one step.
   */
  hireApplication(id: string, input: { by?: string; fillRequisition?: boolean }): Application {
    const app = this.moveApplication(id, 'hired', { by: input.by, note: 'candidate hired' });
    if (input.fillRequisition) {
      const req = this.getRequisition(app.requisitionId);
      if (!isRequisitionTerminal(req.status)) {
        this.setRequisitionStatus(req.id, 'filled');
      }
    }
    return app;
  }

  // --- internals ---------------------------------------------------------

  private moveApplication(
    id: string,
    to: ApplicationStage,
    meta: { by?: string; note?: string },
  ): Application {
    const app = this.getApplication(id);
    if (isApplicationTerminal(app.stage)) {
      throw new ConflictError(`application is already in terminal stage '${app.stage}'`);
    }
    if (!canTransitionApplication(app.stage, to)) {
      throw new ConflictError(`illegal application transition '${app.stage}' -> '${to}'`);
    }
    const event: StageEvent = {
      at: this.timestamp(),
      from: app.stage,
      to,
      by: meta.by,
      note: meta.note,
    };
    app.history.push(event);
    app.stage = to;
    return this.save(app);
  }

  private save(app: Application): Application {
    app.updatedAt = this.timestamp();
    this.store.applications.put(app);
    return app;
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
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}
