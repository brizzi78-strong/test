/**
 * Request status transitions and progress helpers.
 *
 * The service advances a request explicitly (created → consented → …); this
 * module owns the allowed-transition table and the pure progress calculation so
 * both live in one testable place.
 */

import type { Item, RequestStatus } from './types.ts';

const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  awaiting_consent: ['in_progress', 'canceled'],
  in_progress: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RequestStatus): boolean {
  return status === 'completed' || status === 'canceled';
}

/** Every item has a response (completed or declined) → the request is done. */
export function allItemsResolved(items: readonly Item[]): boolean {
  return items.length > 0 && items.every((i) => i.status !== 'pending');
}

export interface Progress {
  total: number;
  completed: number;
  declined: number;
  pending: number;
}

export function progressOf(items: readonly Item[]): Progress {
  const p: Progress = { total: items.length, completed: 0, declined: 0, pending: 0 };
  for (const i of items) {
    if (i.status === 'completed') p.completed++;
    else if (i.status === 'declined') p.declined++;
    else p.pending++;
  }
  return p;
}
