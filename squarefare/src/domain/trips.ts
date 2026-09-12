/**
 * Trip lifecycle as a pure state machine.
 *
 *   matched -> arriving -> in_progress -> completed
 *        \--------\------------\-> cancelled
 *
 * `advanceTrip(trip, driver, seconds)` moves a trip forward by simulated wall
 * time: the driver drives to the pickup, the rider boards, the trip runs to
 * the dropoff. Pure functions keep the whole lifecycle unit-testable; the
 * server just calls advance on a timer.
 */

import type { Driver, Trip } from './types.ts';
import { CITY_SPEED_KMH, distanceKm, interpolate } from './geo.ts';
import { roundMoney } from './pricing.ts';

/** Within this distance of the pickup the trip flips to "arriving". */
const ARRIVING_RADIUS_KM = 0.25;

/**
 * Riders can cancel free within this window after matching; after it, a flat
 * fee compensates the driver for time already spent driving over. The fee goes
 * to the driver, not the platform.
 */
export const FREE_CANCEL_WINDOW_MS = 2 * 60 * 1000;
export const CANCELLATION_FEE = 4;

const KM_PER_SECOND = CITY_SPEED_KMH / 3600;

/** Advance an active trip by `seconds` of simulated time. Mutates trip and driver. */
export function advanceTrip(trip: Trip, driver: Driver, seconds: number, now: number): void {
  if (trip.status === 'completed' || trip.status === 'cancelled') return;

  let budgetKm = KM_PER_SECOND * seconds;

  if (trip.status === 'matched' || trip.status === 'arriving') {
    const toPickup = distanceKm(trip.driverLocation, trip.quote.pickup);
    if (budgetKm >= toPickup) {
      budgetKm -= toPickup;
      trip.driverLocation = { ...trip.quote.pickup };
      trip.status = 'in_progress';
      trip.startedAt = now;
    } else {
      trip.driverLocation = interpolate(trip.driverLocation, trip.quote.pickup, budgetKm / toPickup);
      trip.status = distanceKm(trip.driverLocation, trip.quote.pickup) <= ARRIVING_RADIUS_KM
        ? 'arriving'
        : 'matched';
      driver.location = trip.driverLocation;
      return;
    }
  }

  if (trip.status === 'in_progress') {
    const toDropoff = distanceKm(trip.driverLocation, trip.quote.dropoff);
    if (budgetKm >= toDropoff) {
      trip.driverLocation = { ...trip.quote.dropoff };
      trip.status = 'completed';
      trip.completedAt = now;
    } else if (toDropoff > 0) {
      trip.driverLocation = interpolate(trip.driverLocation, trip.quote.dropoff, budgetKm / toDropoff);
    }
  }

  driver.location = trip.driverLocation;
}

/** Settle a completed trip: pay the driver and free them up. Returns driver payout. */
export function settleTrip(trip: Trip, driver: Driver): number {
  const payout = roundMoney(trip.quote.driverEarnings + trip.tip);
  driver.earnings = roundMoney(driver.earnings + payout);
  driver.tripsCompleted += 1;
  driver.status = 'available';
  return payout;
}

export interface CancelResult {
  fee: number;
}

/** Rider cancels. Free inside the window or before pickup progress; fee to the driver after. */
export function cancelTrip(trip: Trip, driver: Driver, now: number): CancelResult {
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    throw new Error(`Trip ${trip.id} is already ${trip.status}`);
  }
  if (trip.status === 'in_progress') {
    throw new Error('Cannot cancel a trip that is already in progress');
  }
  const fee = now - trip.createdAt <= FREE_CANCEL_WINDOW_MS ? 0 : CANCELLATION_FEE;
  trip.status = 'cancelled';
  trip.cancelledBy = 'rider';
  trip.cancellationFee = fee;
  if (fee > 0) {
    driver.earnings = roundMoney(driver.earnings + fee);
  }
  driver.status = 'available';
  return { fee };
}
