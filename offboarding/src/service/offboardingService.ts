/**
 * OffboardingService — orchestration for employee separation.
 *
 * Open a case for a departing employee with a separation checklist, then work
 * each task to done or not-applicable. The case status is derived from its
 * tasks, and a completed case means every item was actually handled.
 *
 * Clock and id generator are injected for deterministic tests.
 */

import { randomUUID } from 'node:crypto';
import type {
  CaseEvent,
  CaseStatus,
  Company,
  Employee,
  OffboardingCase,
  OffboardingTask,
  OffboardingTaskType,
  SeparationReason,
} from '../domain/types.ts';
import { DEFAULT_CHECKLIST, OFFBOARDING_TASK_TYPES, SEPARATION_REASONS } from '../domain/types.ts';
import { canTransitionTask, deriveStatus } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class OffboardingService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies / employees ---------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = { id: this.newId('co'), name: requireString(input.name, 'name'), createdAt: this.timestamp() };
    this.store.companies.put(company);
    return company;
  }

  createEmployee(input: { companyId: string; firstName: string; lastName: string; email: string }): Employee {
    this.requireCompany(input.companyId);
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) throw new ValidationError(`email is not a valid address: ${email}`);
    const employee: Employee = {
      id: this.newId('emp'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      createdAt: this.timestamp(),
    };
    this.store.employees.put(employee);
    return employee;
  }

  // --- Cases -------------------------------------------------------------

  createCase(input: {
    companyId: string;
    employeeId: string;
    reason: SeparationReason;
    lastDay: string;
    tasks?: OffboardingTaskType[];
  }): OffboardingCase {
    const company = this.requireCompany(input.companyId);
    const employee = this.require(this.store.employees, 'Employee', input.employeeId);
    if (employee.companyId !== company.id) throw new ValidationError('employee does not belong to company');
    if (!SEPARATION_REASONS.includes(input.reason)) throw new ValidationError(`unknown reason: ${String(input.reason)}`);
    if (!DATE_RE.test(input.lastDay ?? '')) throw new ValidationError('lastDay must be an ISO date (YYYY-MM-DD)');

    const checklist = this.validateTaskTypes(input.tasks ?? [...DEFAULT_CHECKLIST]);
    const ts = this.timestamp();
    const tasks: OffboardingTask[] = checklist.map((type) => ({ type, status: 'pending' }));
    const offboarding: OffboardingCase = {
      id: this.newId('case'),
      companyId: company.id,
      employeeId: employee.id,
      reason: input.reason,
      lastDay: input.lastDay,
      status: deriveStatus(tasks),
      tasks,
      history: [{ at: ts, event: 'opened' }],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.cases.put(offboarding);
    return offboarding;
  }

  getCase(id: string): OffboardingCase {
    return this.require(this.store.cases, 'OffboardingCase', id);
  }

  listCases(filter?: { companyId?: string; employeeId?: string; status?: CaseStatus }): OffboardingCase[] {
    return this.store.cases.list((c) => {
      if (filter?.companyId && c.companyId !== filter.companyId) return false;
      if (filter?.employeeId && c.employeeId !== filter.employeeId) return false;
      if (filter?.status && c.status !== filter.status) return false;
      return true;
    });
  }

  completeTask(caseId: string, type: OffboardingTaskType, input: { by: string; note?: string }): OffboardingCase {
    return this.resolveTask(caseId, type, 'done', input);
  }

  markTaskNotApplicable(caseId: string, type: OffboardingTaskType, input: { by: string; note?: string }): OffboardingCase {
    return this.resolveTask(caseId, type, 'na', input);
  }

  cancelCase(caseId: string, input?: { reason?: string }): OffboardingCase {
    const c = this.getCase(caseId);
    if (c.status === 'completed' || c.status === 'cancelled') {
      throw new ConflictError(`case is already in terminal state '${c.status}'`);
    }
    c.status = 'cancelled';
    this.record(c, { event: 'cancelled', note: input?.reason });
    return this.save(c);
  }

  // --- internals ---------------------------------------------------------

  private resolveTask(
    caseId: string,
    type: OffboardingTaskType,
    to: 'done' | 'na',
    input: { by: string; note?: string },
  ): OffboardingCase {
    const c = this.getCase(caseId);
    if (c.status === 'cancelled') throw new ConflictError('case is cancelled');
    const task = c.tasks.find((t) => t.type === type);
    if (!task) throw new NotFoundError('OffboardingTask', `${caseId}/${type}`);
    if (!canTransitionTask(task.status, to)) {
      throw new ConflictError(`task '${type}' is already '${task.status}'`);
    }
    const by = requireString(input.by, 'by');
    task.status = to;
    task.completedBy = by;
    task.completedAt = this.timestamp();
    task.note = input.note;
    this.record(c, { event: to === 'done' ? 'task.done' : 'task.na', taskType: type, by, note: input.note });
    c.status = deriveStatus(c.tasks);
    return this.save(c);
  }

  private record(c: OffboardingCase, meta: Omit<CaseEvent, 'at'>): void {
    c.history.push({ at: this.timestamp(), ...meta });
  }

  private save(c: OffboardingCase): OffboardingCase {
    c.updatedAt = this.timestamp();
    this.store.cases.put(c);
    return c;
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

  private validateTaskTypes(types: OffboardingTaskType[]): OffboardingTaskType[] {
    if (!Array.isArray(types) || types.length === 0) throw new ValidationError('tasks must be a non-empty array');
    const seen = new Set<OffboardingTaskType>();
    for (const t of types) {
      if (!OFFBOARDING_TASK_TYPES.includes(t)) throw new ValidationError(`unknown task type: ${String(t)}`);
      seen.add(t);
    }
    return [...seen];
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}
