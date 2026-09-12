/**
 * The SquareFare pricing engine.
 *
 * The whole formula is public and fits on a napkin:
 *
 *   subtotal   = base + perKm * distance + perMin * duration      (per tier)
 *   fare       = max(minimumFare, subtotal) * demandMultiplier
 *   riderPays  = fare  (no booking fees, no "temporary" surcharges)
 *   driverGets = fare * (1 - TAKE_RATE)  + 100% of any tip
 *
 * The demand multiplier is derived from the live request/driver ratio and is
 * hard-capped at SURGE_CAP. It is always disclosed on the quote as its own
 * line — a quote never hides it inside the totals.
 */

import type { FareLine, LatLng, Quote, VehicleTier } from './types.ts';
import { distanceKm, travelMinutes } from './geo.ts';

/** Flat platform take. Uber keeps roughly 25–30%; SquareFare keeps 10%. */
export const TAKE_RATE = 0.1;

/** Demand pricing can never exceed 1.5x, full stop. */
export const SURGE_CAP = 1.5;

/** How long a quote is honoured, in milliseconds. */
export const QUOTE_TTL_MS = 5 * 60 * 1000;

interface TierRates {
  label: string;
  base: number;
  perKm: number;
  perMin: number;
  minimumFare: number;
}

export const TIER_RATES: Record<VehicleTier, TierRates> = {
  standard: { label: 'Standard', base: 2.5, perKm: 1.1, perMin: 0.3, minimumFare: 7 },
  green: { label: 'Green (EV)', base: 2.5, perKm: 1.2, perMin: 0.3, minimumFare: 7.5 },
  xl: { label: 'XL (6 seats)', base: 3.5, perKm: 1.6, perMin: 0.4, minimumFare: 10 },
};

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Demand multiplier from live supply and demand. Rises gently once open
 * requests outnumber available drivers; capped at SURGE_CAP.
 */
export function demandMultiplier(openRequests: number, availableDrivers: number): number {
  if (availableDrivers <= 0) return SURGE_CAP;
  const pressure = openRequests / availableDrivers;
  if (pressure <= 1) return 1;
  return roundMoney(Math.min(SURGE_CAP, 1 + (pressure - 1) * 0.25));
}

export interface QuoteInput {
  pickup: LatLng;
  dropoff: LatLng;
  tier: VehicleTier;
  multiplier: number;
  now: number;
  id: string;
}

export function buildQuote(input: QuoteInput): Quote {
  const { pickup, dropoff, tier, multiplier, now, id } = input;
  const rates = TIER_RATES[tier];
  const km = distanceKm(pickup, dropoff);
  const min = travelMinutes(pickup, dropoff);

  const base = rates.base;
  const distanceCharge = roundMoney(rates.perKm * km);
  const timeCharge = roundMoney(rates.perMin * min);
  const subtotal = base + distanceCharge + timeCharge;
  const floored = Math.max(rates.minimumFare, subtotal);

  const lines: FareLine[] = [
    { label: `${rates.label} base fare`, amount: roundMoney(base) },
    { label: `Distance (${km.toFixed(2)} km @ $${rates.perKm.toFixed(2)}/km)`, amount: distanceCharge },
    { label: `Time (${min.toFixed(0)} min @ $${rates.perMin.toFixed(2)}/min)`, amount: timeCharge },
  ];
  if (floored > subtotal) {
    lines.push({ label: 'Minimum fare adjustment', amount: roundMoney(floored - subtotal) });
  }
  if (multiplier > 1) {
    lines.push({
      label: `Demand multiplier x${multiplier.toFixed(2)} (capped at x${SURGE_CAP.toFixed(1)})`,
      amount: roundMoney(floored * (multiplier - 1)),
    });
  }

  const total = roundMoney(lines.reduce((sum, l) => sum + l.amount, 0));
  const platformFee = roundMoney(total * TAKE_RATE);
  const driverEarnings = roundMoney(total - platformFee);

  return {
    id,
    tier,
    pickup,
    dropoff,
    distanceKm: roundMoney(km),
    durationMin: Math.round(min),
    demandMultiplier: multiplier,
    lines,
    total,
    driverEarnings,
    platformFee,
    expiresAt: now + QUOTE_TTL_MS,
  };
}
