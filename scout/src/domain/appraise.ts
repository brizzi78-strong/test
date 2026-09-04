/**
 * The appraisal engine: pure functions from a demand signal + the copy in your
 * hand + its asking price, to a buy/pass verdict with the margin math shown.
 * Everything is deterministic and in integer cents.
 */

import type { Appraisal, Condition, DemandSignal, VelocityTier } from './types.ts';

/** Marketplace referral fee taken from the sale price. */
export const MARKETPLACE_FEE_BPS = 1500;
/** Cost to pack and ship one book (media mail + mailer). */
export const OUTBOUND_SHIPPING_CENTS = 350;
/** Never buy unless the flip clears at least this much. */
export const MIN_PROFIT_CENTS = 300;
/** …and returns at least this on the cash put in (50%). */
export const MIN_ROI_BPS = 5000;

/** How much of the mid-grade sold price each condition actually fetches. */
export const CONDITION_BPS: Record<Condition, number> = {
  'new': 10000,
  'like-new': 9500,
  'very-good': 8500,
  'good': 7000,
  'acceptable': 5000,
};

/** True when the string is thirteen digits with a valid ISBN-13 check digit. */
export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  const digits = [...isbn].map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

/** Map a sales rank to how fast the book turns. Lower rank = faster. */
export function velocityTier(salesRank: number): VelocityTier {
  if (salesRank <= 25_000) return { tier: 'hot', estDaysToSell: 7, baseScore: 90 };
  if (salesRank <= 150_000) return { tier: 'strong', estDaysToSell: 21, baseScore: 70 };
  if (salesRank <= 600_000) return { tier: 'steady', estDaysToSell: 60, baseScore: 50 };
  if (salesRank <= 1_500_000) return { tier: 'slow', estDaysToSell: 180, baseScore: 30 };
  return { tier: 'dead', estDaysToSell: 365, baseScore: 10 };
}

/**
 * 0–100 "does the world want this" score: velocity, plus a bump when the
 * money on the table is meaningful.
 */
export function demandScore(signal: DemandSignal): number {
  const base = velocityTier(signal.salesRank).baseScore;
  const sale = uncappedSaleCents(signal);
  const bonus = sale >= 2500 ? 10 : sale >= 1500 ? 5 : 0;
  return Math.min(100, base + bonus);
}

/** Sale price before condition adjustment: avg sold, capped by a lower active offer. */
function uncappedSaleCents(signal: DemandSignal): number {
  const offer = signal.activeOfferCents;
  return offer && offer > 0 ? Math.min(signal.avgSoldCents, offer) : signal.avgSoldCents;
}

/** What this particular copy should realistically sell for. */
export function expectedSaleCents(signal: DemandSignal, condition: Condition): number {
  return Math.round((uncappedSaleCents(signal) * CONDITION_BPS[condition]) / 10000);
}

/** The full worked appraisal for one copy at one asking price. */
export function appraise(signal: DemandSignal, condition: Condition, askCents: number): Appraisal {
  const { tier, estDaysToSell } = velocityTier(signal.salesRank);
  const sale = expectedSaleCents(signal, condition);
  const fee = Math.round((sale * MARKETPLACE_FEE_BPS) / 10000);
  const net = sale - fee - OUTBOUND_SHIPPING_CENTS;
  const maxBuy = Math.max(
    0,
    Math.min(net - MIN_PROFIT_CENTS, Math.floor((net * 10000) / (10000 + MIN_ROI_BPS))),
  );

  const reasons: string[] = [];
  if (tier === 'dead') {
    reasons.push(`demand is dead — sales rank ${signal.salesRank.toLocaleString('en-US')}`);
  }
  if (net <= 0) {
    reasons.push('sells for less than fees + shipping at this condition');
  } else if (tier !== 'dead' && askCents > maxBuy) {
    reasons.push(`ask ${usd(askCents)} is over the ${usd(maxBuy)} max buy`);
  }

  const verdict = reasons.length === 0 ? 'buy' : 'pass';
  const profit = net - askCents;
  return {
    isbn13: signal.isbn13,
    title: signal.title,
    condition,
    tier,
    estDaysToSell,
    demandScore: demandScore(signal),
    expectedSaleCents: sale,
    feeCents: fee,
    shippingCents: OUTBOUND_SHIPPING_CENTS,
    netProceedsCents: net,
    maxBuyCents: maxBuy,
    askCents,
    verdict,
    reasons,
    projectedProfitCents: profit,
    roiBps: askCents > 0 ? Math.round((profit * 10000) / askCents) : null,
  };
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
