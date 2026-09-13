/**
 * Pricing and quoting — pure functions, no I/O.
 *
 * The CARD discount is a *merchant discount*: pay in CARD, pay less. That is
 * ordinary commerce (cash discounts have existed forever). It is deliberately
 * not a distribution of profits to token holders, which would make CARD a
 * security. See ../../BOOKSTORE_PLATFORM_PLAN.md.
 */

import type { OrderItem, PaymentMethod } from './types.ts';

/** Default discount for paying in CARD, in basis points (500 = 5%). */
export const DEFAULT_CARD_DISCOUNT_BPS = 500;

/** How long a USD→CARD quote stays good. Crypto rates move; quotes expire. */
export const DEFAULT_QUOTE_TTL_MS = 15 * 60 * 1000;

/** Upper bound on the discount, so a misconfigured env var can't zero out prices. */
export const MAX_DISCOUNT_BPS = 5000; // 50%

export function subtotalOf(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotalCents, 0);
}

/**
 * Discount in cents for the given payment method. USD orders get none; CARD
 * orders get `discountBps`, rounded down so rounding never favors the buyer
 * against the seller by a fraction of a cent.
 */
export function discountFor(
  subtotalCents: number,
  method: PaymentMethod,
  discountBps: number = DEFAULT_CARD_DISCOUNT_BPS,
): number {
  if (method !== 'card_token') return 0;
  const bps = clampBps(discountBps);
  return Math.floor((subtotalCents * bps) / 10_000);
}

export function clampBps(bps: number): number {
  if (!Number.isFinite(bps) || bps <= 0) return 0;
  return Math.min(Math.floor(bps), MAX_DISCOUNT_BPS);
}

/**
 * Convert a USD total to a CARD amount at `centsPerCard`.
 *
 * Returns a decimal string with 6 places — enough precision for a token priced
 * in fractions of a cent, without dragging float error into money. Rounds up so
 * the seller is never short-paid by truncation.
 */
export function cardAmountFor(usdCents: number, centsPerCard: number): string {
  if (!Number.isFinite(centsPerCard) || centsPerCard <= 0) {
    throw new Error('centsPerCard must be a positive number');
  }
  const SCALE = 1_000_000n;
  // Scale both sides to integers to avoid float drift, then round up.
  const numerator = BigInt(Math.round(usdCents * 1_000_000)) * SCALE;
  const denominator = BigInt(Math.round(centsPerCard * 1_000_000));
  const scaled = (numerator + denominator - 1n) / denominator; // ceil
  const whole = scaled / SCALE;
  const frac = (scaled % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return frac.length > 0 ? `${whole}.${frac}` : whole.toString();
}

export function isQuoteExpired(expiresAt: string, now: Date): boolean {
  return now.getTime() > new Date(expiresAt).getTime();
}

/** Loose shape check for an EVM transaction hash: 0x + 64 hex characters. */
export function isValidTxHash(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/** Loose shape check for an EVM address: 0x + 40 hex characters. */
export function isValidAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}
