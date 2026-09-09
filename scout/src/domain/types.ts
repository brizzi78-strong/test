/**
 * Domain types for Cardinal Scout. All money is integer cents.
 */

/** Physical condition of the copy in hand. */
export type Condition = 'new' | 'like-new' | 'very-good' | 'good' | 'acceptable';

export const CONDITIONS: readonly Condition[] = [
  'new',
  'like-new',
  'very-good',
  'good',
  'acceptable',
];

/**
 * What the market says about one edition: how fast it sells and for how much.
 * This is the "books the world wants to buy" list — kept current by hand or by
 * whatever feed you wire in later.
 */
export interface DemandSignal {
  isbn13: string;
  title: string;
  author: string;
  binding: 'hardcover' | 'paperback';
  /** Marketplace sales rank; lower means it sells faster. */
  salesRank: number;
  /** Average recent sold price for a mid-grade copy. */
  avgSoldCents: number;
  /** Lowest competing active offer, if known. You must price at or below it. */
  activeOfferCents?: number;
}

export type VelocityTierName = 'hot' | 'strong' | 'steady' | 'slow' | 'dead';

export interface VelocityTier {
  tier: VelocityTierName;
  /** Rough days-to-sell estimate once listed competitively. */
  estDaysToSell: number;
  /** Base contribution to the 0–100 demand score. */
  baseScore: number;
}

/** The full worked appraisal for one copy at one asking price. */
export interface Appraisal {
  isbn13: string;
  title: string;
  condition: Condition;
  tier: VelocityTierName;
  estDaysToSell: number;
  demandScore: number;
  /** What this copy should sell for, condition-adjusted and offer-capped. */
  expectedSaleCents: number;
  feeCents: number;
  shippingCents: number;
  /** expectedSale − fee − shipping. */
  netProceedsCents: number;
  /** The most you can pay and still hit minimum profit AND minimum ROI. */
  maxBuyCents: number;
  askCents: number;
  verdict: 'buy' | 'pass';
  reasons: string[];
  /** netProceeds − ask; only meaningful on a buy. */
  projectedProfitCents: number;
  /** Projected return on the ask, in basis points; null when the copy is free. */
  roiBps: number | null;
}
