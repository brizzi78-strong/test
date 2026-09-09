/**
 * Order state machine — pure functions, no I/O.
 */

import type { OrderStatus } from './types.ts';

const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['fulfilled', 'refunded'],
  fulfilled: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

/**
 * While an order still holds reserved stock. Stock is decremented when the
 * order is placed and returned only if it is cancelled — a fulfilled or
 * refunded order's stock has already left the shelf.
 */
export function holdsStock(status: OrderStatus): boolean {
  return status === 'pending_payment' || status === 'paid';
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED[status].length === 0;
}
