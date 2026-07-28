/**
 * Invoice status transitions and the pure money math.
 *
 * The service advances an invoice explicitly (draft → open → paid, or → void);
 * this module owns the allowed-transition table and the deterministic
 * calculations — line/total computation and aging-bucket classification — so
 * the arithmetic lives in one testable place.
 */

import type { InvoiceLine, InvoiceStatus } from './types.ts';

const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ['open', 'void'],
  open: ['paid', 'void'],
  paid: [],
  void: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: InvoiceStatus): boolean {
  return status === 'paid' || status === 'void';
}

/** Amount for a single line, in cents: quantity × unit price, rounded to a cent. */
export function lineAmountCents(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

export interface Totals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Subtotal (sum of line amounts), tax (subtotal × rate, rounded to a cent), and
 * grand total. Tax rate is basis points: 725 → 7.25%.
 */
export function computeTotals(lines: readonly InvoiceLine[], taxRateBps: number): Totals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export type AgingBucket = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus';

export const AGING_BUCKETS: readonly AgingBucket[] = [
  'current',
  'd1_30',
  'd31_60',
  'd61_90',
  'd90_plus',
];

/**
 * Which aging bucket an open invoice falls in, given how many days past its due
 * date `asOf` is. Not-yet-due (<= 0 days past) is `current`.
 */
export function agingBucket(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return 'current';
  if (daysPastDue <= 30) return 'd1_30';
  if (daysPastDue <= 60) return 'd31_60';
  if (daysPastDue <= 90) return 'd61_90';
  return 'd90_plus';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days `later` is after `earlier` (negative if before). */
export function daysBetween(earlier: string, later: string): number {
  return Math.floor((Date.parse(later) - Date.parse(earlier)) / MS_PER_DAY);
}
