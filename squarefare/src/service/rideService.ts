/**
 * RideService: the application layer tying pricing, matching, and the trip
 * state machine to the store. All time flows in through `now()` so tests can
 * drive the clock.
 */

import type { LatLng, PlatformStats, Quote, Trip, VehicleTier } from '../domain/types.ts';
import { buildQuote, demandMultiplier, roundMoney, TAKE_RATE, TIER_RATES } from '../domain/pricing.ts';
import { externalOffers, rankOffers, type ProviderOffer } from '../domain/providers.ts';
import { matchDriver } from '../domain/matching.ts';
import { advanceTrip, cancelTrip, settleTrip } from '../domain/trips.ts';
import { Store } from '../store/store.ts';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface TripView extends Trip {
  driver: { name: string; vehicle: string; plate: string; rating: number };
}

export class RideService {
  readonly store: Store;
  private readonly now: () => number;

  constructor(store = new Store(), now: () => number = Date.now) {
    this.store = store;
    this.now = now;
  }

  quote(pickup: LatLng, dropoff: LatLng, tier: VehicleTier): Quote {
    const available = this.store.availableDrivers().filter((d) => d.tier === tier).length;
    const multiplier = demandMultiplier(this.store.activeTrips().length, Math.max(available, 1));
    const q = buildQuote({
      pickup,
      dropoff,
      tier,
      multiplier,
      now: this.now(),
      id: this.store.newId('qte'),
    });
    this.store.quotes.set(q.id, q);
    return q;
  }

  /**
   * The aggregator view: every way to make this trip — Uber, Lyft, taxi
   * estimates plus exact, bookable SquareFare-network quotes — cheapest first.
   */
  compare(pickup: LatLng, dropoff: LatLng): ProviderOffer[] {
    const offers = externalOffers(pickup, dropoff);
    for (const tier of ['standard', 'green', 'xl'] as VehicleTier[]) {
      const match = matchDriver(this.store.drivers.values(), pickup, tier);
      if (!match) continue; // no nearby SquareFare driver for this tier — don't fake an offer
      const q = this.quote(pickup, dropoff, tier);
      offers.push({
        provider: 'SquareFare',
        product: TIER_RATES[tier].label,
        kind: 'exact',
        total: q.total,
        etaMinutes: match.etaMinutes,
        seats: tier === 'xl' ? 6 : 4,
        quoteId: q.id,
        lines: q.lines,
        note: 'Exact locked-in price, itemized. Driver keeps 90%. Books right here.',
      });
    }
    return rankOffers(offers);
  }

  requestRide(quoteId: string, riderName: string): TripView {
    const quote = this.store.quotes.get(quoteId);
    if (!quote) throw new ApiError(404, `Unknown quote: ${quoteId}`);
    if (this.now() > quote.expiresAt) throw new ApiError(410, 'Quote expired — request a new one');

    const match = matchDriver(this.store.drivers.values(), quote.pickup, quote.tier);
    if (!match) throw new ApiError(409, 'No drivers available nearby for that tier right now');

    match.driver.status = 'on_trip';
    const trip: Trip = {
      id: this.store.newId('trp'),
      quote,
      riderName,
      driverId: match.driver.id,
      status: 'matched',
      driverLocation: { ...match.driver.location },
      createdAt: this.now(),
      cancellationFee: 0,
      tip: 0,
    };
    this.store.trips.set(trip.id, trip);
    this.store.quotes.delete(quoteId);
    return this.view(trip);
  }

  getTrip(tripId: string): TripView {
    return this.view(this.mustTrip(tripId));
  }

  cancel(tripId: string): TripView {
    const trip = this.mustTrip(tripId);
    const driver = this.mustDriver(trip.driverId);
    try {
      const { fee } = cancelTrip(trip, driver, this.now());
      if (fee > 0) this.store.driverTotalEarned = roundMoney(this.store.driverTotalEarned + fee);
    } catch (err) {
      throw new ApiError(409, (err as Error).message);
    }
    return this.view(trip);
  }

  /** Rate a completed trip and optionally tip. 100% of the tip goes to the driver. */
  rate(tripId: string, stars: number, tip: number): TripView {
    const trip = this.mustTrip(tripId);
    if (trip.status !== 'completed') throw new ApiError(409, 'Only completed trips can be rated');
    if (trip.rating !== undefined) throw new ApiError(409, 'Trip already rated');
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new ApiError(400, 'Rating must be an integer from 1 to 5');
    }
    if (!(tip >= 0) || tip > 500) throw new ApiError(400, 'Tip must be between 0 and 500');

    const driver = this.mustDriver(trip.driverId);
    trip.rating = stars;
    if (tip > 0) {
      trip.tip = roundMoney(tip);
      driver.earnings = roundMoney(driver.earnings + trip.tip);
      this.store.driverTotalEarned = roundMoney(this.store.driverTotalEarned + trip.tip);
    }
    driver.rating = roundMoney((driver.rating * driver.tripsCompleted + stars) / (driver.tripsCompleted + 1));
    return this.view(trip);
  }

  /** Advance every active trip by `seconds` of simulated time. Settles completions. */
  tick(seconds: number): void {
    const now = this.now();
    for (const trip of this.store.activeTrips()) {
      const driver = this.mustDriver(trip.driverId);
      advanceTrip(trip, driver, seconds, now);
      if (trip.status === 'completed') {
        const payout = settleTrip(trip, driver);
        this.store.tripsCompleted += 1;
        this.store.riderTotalPaid = roundMoney(this.store.riderTotalPaid + trip.quote.total);
        this.store.driverTotalEarned = roundMoney(this.store.driverTotalEarned + payout);
        this.store.platformTotalFees = roundMoney(this.store.platformTotalFees + trip.quote.platformFee);
      }
    }
  }

  stats(): PlatformStats {
    const { tripsCompleted, riderTotalPaid, driverTotalEarned, platformTotalFees } = this.store;
    return {
      tripsCompleted,
      riderTotalPaid,
      driverTotalEarned,
      platformTotalFees,
      effectiveTakeRate: riderTotalPaid > 0 ? roundMoney(platformTotalFees / riderTotalPaid) : TAKE_RATE,
    };
  }

  private mustTrip(tripId: string): Trip {
    const trip = this.store.trips.get(tripId);
    if (!trip) throw new ApiError(404, `Unknown trip: ${tripId}`);
    return trip;
  }

  private mustDriver(driverId: string) {
    const driver = this.store.drivers.get(driverId);
    if (!driver) throw new ApiError(500, `Driver record missing: ${driverId}`);
    return driver;
  }

  private view(trip: Trip): TripView {
    const d = this.mustDriver(trip.driverId);
    return { ...trip, driver: { name: d.name, vehicle: d.vehicle, plate: d.plate, rating: d.rating } };
  }
}
