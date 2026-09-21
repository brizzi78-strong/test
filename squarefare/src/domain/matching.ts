/**
 * Driver matching: pick the best available driver for a pickup.
 *
 * Score = ETA to pickup, minus a small credit for a strong rating. That keeps
 * waits short without turning rating into a winner-takes-all leaderboard.
 * SquareFare shows riders who they matched with and why (the ETA), and never
 * deprioritizes drivers for declining trips.
 */

import type { Driver, LatLng, VehicleTier } from './types.ts';
import { travelMinutes } from './geo.ts';

/** Drivers further than this from the pickup are not considered. */
export const MAX_PICKUP_KM = 8;

const RATING_CREDIT_MIN_PER_STAR = 0.8;

export interface Match {
  driver: Driver;
  etaMinutes: number;
}

export function matchDriver(
  drivers: Iterable<Driver>,
  pickup: LatLng,
  tier: VehicleTier,
): Match | undefined {
  let best: Match | undefined;
  let bestScore = Infinity;

  for (const driver of drivers) {
    if (driver.status !== 'available' || driver.tier !== tier) continue;
    const eta = travelMinutes(driver.location, pickup);
    if (eta > (MAX_PICKUP_KM / 28) * 60) continue;
    const score = eta - (driver.rating - 4) * RATING_CREDIT_MIN_PER_STAR;
    if (score < bestScore) {
      bestScore = score;
      best = { driver, etaMinutes: Math.max(1, Math.round(eta)) };
    }
  }
  return best;
}
