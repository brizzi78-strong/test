/**
 * TimeOffService — orchestration for PTO: policies, accrual balances, and the
 * request lifecycle.
 *
 * Balances are the source of truth for "how much leave is left" and are only
 * moved by two events: accrual (adds to accrued) and approval (adds to used).
 * Cancelling an approved request refunds the used hours. Because available =
 * accrued − used, the number always reflects the request history.
 *
 * Clock and id generator are injected for deterministic tests.
 */

import { randomUUID } from 'node:crypto';
import type {
  Balance,
  Company,
  Employee,
  LeavePolicy,
  LeaveType,
  RequestEvent,
  RequestStatus,
  TimeOffRequest,
} from '../domain/types.ts';
import { LEAVE_TYPES } from '../domain/types.ts';
import { availableHours, canTransition } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class TimeOffService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies / employees / policies ----------------------------------

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

  createPolicy(input: {
    companyId: string;
    type: LeaveType;
    name: string;
    annualAccrualHours: number;
    maxBalanceHours?: number;
    allowNegativeBalance?: boolean;
  }): LeavePolicy {
    this.requireCompany(input.companyId);
    assertType(input.type);
    assertNonNegative(input.annualAccrualHours, 'annualAccrualHours');
    if (input.maxBalanceHours !== undefined) assertNonNegative(input.maxBalanceHours, 'maxBalanceHours');
    const policy: LeavePolicy = {
      id: this.newId('pol'),
      companyId: input.companyId,
      type: input.type,
      name: requireString(input.name, 'name'),
      annualAccrualHours: input.annualAccrualHours,
      maxBalanceHours: input.maxBalanceHours,
      allowNegativeBalance: input.allowNegativeBalance === true,
      createdAt: this.timestamp(),
    };
    this.store.policies.put(policy);
    return policy;
  }

  listPolicies(companyId: string): LeavePolicy[] {
    return this.store.policies.list((p) => p.companyId === companyId);
  }

  // --- Balances ----------------------------------------------------------

  /** Grant accrued hours to an employee's balance (capped by policy maxBalanceHours). */
  accrue(employeeId: string, input: { type: LeaveType; hours: number }): Balance {
    const employee = this.requireEmployee(employeeId);
    assertType(input.type);
    assertPositive(input.hours, 'hours');
    const balance = this.ensureBalance(employee, input.type);
    balance.accruedHours += input.hours;
    const policy = this.policyFor(employee.companyId, input.type);
    if (policy?.maxBalanceHours !== undefined) {
      const maxAccrued = policy.maxBalanceHours + balance.usedHours;
      if (balance.accruedHours > maxAccrued) balance.accruedHours = maxAccrued;
    }
    this.store.balances.put(balance);
    return balance;
  }

  getBalance(employeeId: string, type: LeaveType): Balance {
    this.requireEmployee(employeeId);
    assertType(type);
    return this.store.balances.get(balanceId(employeeId, type)) ?? this.zeroBalance(employeeId, type);
  }

  listBalances(employeeId: string): Balance[] {
    const employee = this.requireEmployee(employeeId);
    return LEAVE_TYPES.map(
      (type) => this.store.balances.get(balanceId(employee.id, type)) ?? this.zeroBalance(employee.id, type),
    );
  }

  // --- Requests ----------------------------------------------------------

  requestTimeOff(input: {
    companyId: string;
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    hours: number;
    reason?: string;
  }): TimeOffRequest {
    const company = this.requireCompany(input.companyId);
    const employee = this.requireEmployee(input.employeeId);
    if (employee.companyId !== company.id) throw new ValidationError('employee does not belong to company');
    assertType(input.type);
    assertPositive(input.hours, 'hours');
    assertDate(input.startDate, 'startDate');
    assertDate(input.endDate, 'endDate');
    if (input.endDate < input.startDate) throw new ValidationError('endDate is before startDate');

    const ts = this.timestamp();
    const request: TimeOffRequest = {
      id: this.newId('req'),
      companyId: company.id,
      employeeId: employee.id,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      hours: input.hours,
      status: 'pending',
      reason: input.reason,
      history: [{ at: ts, event: 'requested' }],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.requests.put(request);
    return request;
  }

  getRequest(id: string): TimeOffRequest {
    return this.require(this.store.requests, 'TimeOffRequest', id);
  }

  listRequests(filter?: { companyId?: string; employeeId?: string; status?: RequestStatus; type?: LeaveType }): TimeOffRequest[] {
    return this.store.requests.list((r) => {
      if (filter?.companyId && r.companyId !== filter.companyId) return false;
      if (filter?.employeeId && r.employeeId !== filter.employeeId) return false;
      if (filter?.status && r.status !== filter.status) return false;
      if (filter?.type && r.type !== filter.type) return false;
      return true;
    });
  }

  approveRequest(id: string, input: { reviewedBy: string }): TimeOffRequest {
    const request = this.getRequest(id);
    this.assertTransition(request, 'approved');
    const employee = this.requireEmployee(request.employeeId);
    const balance = this.ensureBalance(employee, request.type);
    const policy = this.policyFor(request.companyId, request.type);
    const allowNegative = policy?.allowNegativeBalance === true;
    if (!allowNegative && availableHours(balance) < request.hours) {
      throw new ConflictError(
        `insufficient ${request.type} balance: ${availableHours(balance)}h available, ${request.hours}h requested`,
      );
    }
    balance.usedHours += request.hours;
    this.store.balances.put(balance);

    request.reviewedBy = requireString(input.reviewedBy, 'reviewedBy');
    this.transition(request, 'approved', { by: request.reviewedBy });
    return this.save(request);
  }

  denyRequest(id: string, input: { reviewedBy: string; reason?: string }): TimeOffRequest {
    const request = this.getRequest(id);
    this.assertTransition(request, 'denied');
    request.reviewedBy = requireString(input.reviewedBy, 'reviewedBy');
    this.transition(request, 'denied', { by: request.reviewedBy, note: input.reason });
    return this.save(request);
  }

  /** Cancel a request. If it was approved, the deducted hours are refunded. */
  cancelRequest(id: string, input?: { by?: string; reason?: string }): TimeOffRequest {
    const request = this.getRequest(id);
    const wasApproved = request.status === 'approved';
    this.assertTransition(request, 'cancelled');
    if (wasApproved) {
      const balance = this.store.balances.get(balanceId(request.employeeId, request.type));
      if (balance) {
        balance.usedHours = Math.max(0, balance.usedHours - request.hours);
        this.store.balances.put(balance);
      }
    }
    this.transition(request, 'cancelled', { by: input?.by, note: input?.reason });
    return this.save(request);
  }

  // --- internals ---------------------------------------------------------

  private ensureBalance(employee: Employee, type: LeaveType): Balance {
    const existing = this.store.balances.get(balanceId(employee.id, type));
    if (existing) return existing;
    const created: Balance = {
      id: balanceId(employee.id, type),
      companyId: employee.companyId,
      employeeId: employee.id,
      type,
      accruedHours: 0,
      usedHours: 0,
    };
    this.store.balances.put(created);
    return created;
  }

  private zeroBalance(employeeId: string, type: LeaveType): Balance {
    const employee = this.store.employees.get(employeeId);
    return {
      id: balanceId(employeeId, type),
      companyId: employee?.companyId ?? '',
      employeeId,
      type,
      accruedHours: 0,
      usedHours: 0,
    };
  }

  private policyFor(companyId: string, type: LeaveType): LeavePolicy | undefined {
    return this.store.policies.list((p) => p.companyId === companyId && p.type === type)[0];
  }

  private assertTransition(request: TimeOffRequest, to: RequestStatus): void {
    if (!canTransition(request.status, to)) {
      throw new ConflictError(`illegal transition '${request.status}' -> '${to}' for request ${request.id}`);
    }
  }

  private transition(request: TimeOffRequest, to: RequestStatus, meta?: { by?: string; note?: string }): void {
    request.history.push({ at: this.timestamp(), event: to, by: meta?.by, note: meta?.note });
    request.status = to;
  }

  private save(request: TimeOffRequest): TimeOffRequest {
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

  private requireEmployee(id: string): Employee {
    return this.require(this.store.employees, 'Employee', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError(`${what} id is required`);
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }
}

function balanceId(employeeId: string, type: LeaveType): string {
  return `${employeeId}:${type}`;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function assertType(type: unknown): asserts type is LeaveType {
  if (typeof type !== 'string' || !LEAVE_TYPES.includes(type as LeaveType)) {
    throw new ValidationError(`unknown leave type: ${String(type)}`);
  }
}

function assertPositive(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive number of hours`);
  }
}

function assertNonNegative(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative number`);
  }
}

function assertDate(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new ValidationError(`${field} must be an ISO date (YYYY-MM-DD)`);
  }
}
