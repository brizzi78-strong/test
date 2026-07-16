/**
 * Order state machine and derived-status helpers.
 *
 * Keeping the allowed transitions in one table (rather than scattered `if`
 * checks) means the FCRA gates — no checks before authorization, no adverse
 * action without a pre-adverse step — are enforced in exactly one place.
 */

import type { CheckResult, OrderStatus } from './types.ts';
import { TERMINAL_STATUSES } from './types.ts';

/** Allowed `from -> to` order transitions. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ['authorized', 'canceled'],
  authorized: ['in_progress', 'canceled'],
  in_progress: ['completed', 'canceled'],
  // After results are in, adjudication either clears the candidate or opens
  // the adverse-action process. Cancellation is still allowed here.
  completed: ['clear', 'pre_adverse_action', 'canceled'],
  // A candidate can dispute during the pre-adverse window; a successful
  // dispute (or reviewer reversal) sends the order back to `clear`.
  pre_adverse_action: ['adverse_action', 'clear', 'canceled'],
  clear: [],
  adverse_action: [],
  canceled: [],
};

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Every status reachable in one step from `from` (for API discoverability). */
export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

/** True once every check has reached a completed outcome. */
export function allChecksResolved(checks: readonly CheckResult[]): boolean {
  return (
    checks.length > 0 &&
    checks.every(
      (c) => c.status === 'clear' || c.status === 'consider' || c.status === 'error',
    )
  );
}

/**
 * True if any completed check needs human review (`consider`) or failed
 * (`error`). Such orders should not be auto-cleared.
 */
export function requiresReview(checks: readonly CheckResult[]): boolean {
  return checks.some((c) => c.status === 'consider' || c.status === 'error');
}
