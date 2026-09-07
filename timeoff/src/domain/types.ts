/**
 * Core domain types for the Time Off (PTO) module.
 *
 * Employees accrue leave into per-type balances and file time-off requests; a
 * manager approves or denies, and an approval deducts from the balance.
 * Balances are always accrued-minus-used, so they can't drift from the request
 * history. Money-free; time is tracked in whole hours.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type LeaveType = 'vacation' | 'sick' | 'personal' | 'unpaid';

export const LEAVE_TYPES: readonly LeaveType[] = ['vacation', 'sick', 'personal', 'unpaid'];

/**
 * Status of a time-off request.
 * - `pending`   – filed, awaiting review
 * - `approved`  – granted; hours deducted from the balance
 * - `denied`    – rejected (terminal)
 * - `cancelled` – withdrawn; if it was approved, the hours are refunded (terminal)
 */
export type RequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

/** A company's leave policy for one leave type. */
export interface LeavePolicy {
  id: string;
  companyId: string;
  type: LeaveType;
  name: string;
  /** Hours granted per year (informational + used by accrual helpers). */
  annualAccrualHours: number;
  /** Optional cap on accrued balance. */
  maxBalanceHours?: number;
  /** Whether an approval may push the balance negative. */
  allowNegativeBalance: boolean;
  createdAt: string;
}

/** An employee's running balance for one leave type. Id is `${employeeId}:${type}`. */
export interface Balance {
  id: string;
  companyId: string;
  employeeId: string;
  type: LeaveType;
  accruedHours: number;
  usedHours: number;
}

export interface RequestEvent {
  at: string;
  /** e.g. 'requested', 'approved', 'denied', 'cancelled'. */
  event: string;
  by?: string;
  note?: string;
}

export interface TimeOffRequest {
  id: string;
  companyId: string;
  employeeId: string;
  type: LeaveType;
  /** ISO dates (YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  hours: number;
  status: RequestStatus;
  reason?: string;
  reviewedBy?: string;
  history: RequestEvent[];
  createdAt: string;
  updatedAt: string;
}
