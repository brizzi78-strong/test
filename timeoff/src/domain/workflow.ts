/**
 * Request state machine + balance helper. Balance side effects (deduct on
 * approve, refund on cancel-of-approved) are applied by the service; this module
 * owns the allowed transitions and the available-hours calculation.
 */

import type { Balance, RequestStatus } from './types.ts';

const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  pending: ['approved', 'denied', 'cancelled'],
  // An approved request can still be cancelled (which refunds the hours).
  approved: ['cancelled'],
  denied: [],
  cancelled: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RequestStatus): boolean {
  return status === 'denied' || status === 'cancelled';
}

/** Hours available to spend: accrued minus already used. */
export function availableHours(balance: Balance): number {
  return balance.accruedHours - balance.usedHours;
}
