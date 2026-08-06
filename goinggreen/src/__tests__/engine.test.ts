import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { distanceKm, interpolate, travelMinutes } from '../domain/geo.ts';
import {
  buildQuote,
  demandMultiplier,
  roundMoney,
  SURGE_CAP,
  TAKE_RATE,
  TIER_RATES,
} from '../domain/pricing.ts';
import { matchDriver } from '../domain/matching.ts';
import {
  advanceTrip,
  cancelTrip,
  CANCELLATION_FEE,
  FREE_CANCEL_WINDOW_MS,
  settleTrip,
} from '../domain/trips.ts';
import type { Driver, Trip } from '../domain/types.ts';

const A = { lat: 40.75, lng: -73.99 };
const B = { lat: 40.76, lng: -73.99 }; // ~1.11 km due north

function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 'drv_test',
    name: 'Test Driver',
    vehicle: 'Test Car',
    plate: 'TST-000',
    tier: 'standard',
    rating: 4.8,
    tripsCompleted: 100,
    status: 'available',
    location: { ...A },
    earnings: 0,
    ...overrides,
  };
}

function makeTrip(driver: Driver, dropoff = B): Trip {
  const quote = buildQuote({ pickup: A, dropoff, tier: 'standard', multiplier: 1, now: 0, id: 'qte_test' });
  return {
    id: 'trp_test',
    quote,
    riderName: 'Test Rider',
    driverId: driver.id,
    status: 'matched',
    driverLocation: { ...driver.location },
    createdAt: 0,
    cancellationFee: 0,
    tip: 0,
  };
}

describe('geo', () => {
  it('haversine matches known distances', () => {
    assert.equal(distanceKm(A, A), 0);
    const oneDegreeLat = distanceKm({ lat: 40, lng: -74 }, { lat: 41, lng: -74 });
    assert.ok(Math.abs(oneDegreeLat - 111.19) < 0.2, `got ${oneDegreeLat}`);
  });

  it('travel time follows city speed', () => {
    const km = distanceKm(A, B);
    assert.ok(Math.abs(travelMinutes(A, B) - (km / 28) * 60) < 1e-9);
  });

  it('interpolate clamps and lands on endpoints', () => {
    assert.deepEqual(interpolate(A, B, 0), A);
    assert.deepEqual(interpolate(A, B, 1), B);
    assert.deepEqual(interpolate(A, B, 5), B);
    const mid = interpolate(A, B, 0.5);
    assert.ok(Math.abs(mid.lat - (A.lat + B.lat) / 2) < 1e-12);
  });
});

describe('pricing', () => {
  it('no surge when supply covers demand', () => {
    assert.equal(demandMultiplier(3, 5), 1);
    assert.equal(demandMultiplier(5, 5), 1);
  });

  it('surge rises gently and is hard-capped', () => {
    const mild = demandMultiplier(6, 5);
    assert.ok(mild > 1 && mild < SURGE_CAP);
    assert.equal(demandMultiplier(500, 5), SURGE_CAP);
    assert.equal(demandMultiplier(1, 0), SURGE_CAP);
  });

  it('quote lines sum exactly to the total', () => {
    const q = buildQuote({ pickup: A, dropoff: B, tier: 'standard', multiplier: 1.3, now: 0, id: 'q1' });
    const sum = roundMoney(q.lines.reduce((s, l) => s + l.amount, 0));
    assert.equal(sum, q.total);
  });

  it('driver share + platform fee = total, at the flat take rate', () => {
    const far = { lat: 40.79, lng: -73.94 };
    const q = buildQuote({ pickup: A, dropoff: far, tier: 'xl', multiplier: 1, now: 0, id: 'q2' });
    assert.equal(roundMoney(q.driverEarnings + q.platformFee), q.total);
    assert.ok(Math.abs(q.platformFee / q.total - TAKE_RATE) < 0.005);
  });

  it('short hops are floored at the minimum fare, shown as a line', () => {
    const nearby = { lat: 40.7502, lng: -73.99 };
    const q = buildQuote({ pickup: A, dropoff: nearby, tier: 'standard', multiplier: 1, now: 0, id: 'q3' });
    assert.equal(q.total, TIER_RATES.standard.minimumFare);
    assert.ok(q.lines.some((l) => l.label === 'Minimum fare adjustment'));
  });

  it('surge appears as its own disclosed line, never silently', () => {
    const surged = buildQuote({ pickup: A, dropoff: B, tier: 'standard', multiplier: 1.5, now: 0, id: 'q4' });
    const plain = buildQuote({ pickup: A, dropoff: B, tier: 'standard', multiplier: 1, now: 0, id: 'q5' });
    assert.ok(surged.lines.some((l) => l.label.includes('Demand multiplier')));
    assert.ok(!plain.lines.some((l) => l.label.includes('Demand multiplier')));
    assert.equal(surged.total, roundMoney(plain.total * 1.5));
  });
});

describe('matching', () => {
  it('prefers the closer driver, all else equal', () => {
    const near = makeDriver({ id: 'near', location: { lat: 40.751, lng: -73.99 } });
    const far = makeDriver({ id: 'far', location: { lat: 40.77, lng: -73.99 } });
    assert.equal(matchDriver([far, near], A, 'standard')?.driver.id, 'near');
  });

  it('skips busy drivers and wrong tiers', () => {
    const busy = makeDriver({ id: 'busy', status: 'on_trip' });
    const xl = makeDriver({ id: 'xl', tier: 'xl' });
    assert.equal(matchDriver([busy, xl], A, 'standard'), undefined);
    assert.equal(matchDriver([busy, xl], A, 'xl')?.driver.id, 'xl');
  });

  it('ignores drivers beyond pickup range', () => {
    const distant = makeDriver({ id: 'distant', location: { lat: 41.2, lng: -73.99 } });
    assert.equal(matchDriver([distant], A, 'standard'), undefined);
  });

  it('a strong rating breaks near-ties', () => {
    const good = makeDriver({ id: 'good', rating: 5, location: { lat: 40.7525, lng: -73.99 } });
    const okay = makeDriver({ id: 'okay', rating: 4.2, location: { lat: 40.752, lng: -73.99 } });
    assert.equal(matchDriver([okay, good], A, 'standard')?.driver.id, 'good');
  });
});

describe('trip lifecycle', () => {
  it('drives to pickup, boards, completes, and pays the driver 90% + tip', () => {
    const driver = makeDriver({ location: { lat: 40.74, lng: -73.99 }, status: 'on_trip' });
    const trip = makeTrip(driver);

    advanceTrip(trip, driver, 60, 1_000); // one minute: still heading to pickup
    assert.ok(trip.status === 'matched' || trip.status === 'arriving');
    assert.deepEqual(driver.location, trip.driverLocation);

    advanceTrip(trip, driver, 3600, 2_000); // plenty of time: full trip
    assert.equal(trip.status, 'completed');
    assert.deepEqual(trip.driverLocation, trip.quote.dropoff);

    trip.tip = 2;
    const payout = settleTrip(trip, driver);
    assert.equal(payout, roundMoney(trip.quote.driverEarnings + 2));
    assert.equal(driver.earnings, payout);
    assert.equal(driver.status, 'available');
  });

  it('passes through arriving near the pickup', () => {
    const driver = makeDriver({ location: { lat: 40.7485, lng: -73.99 }, status: 'on_trip' });
    const trip = makeTrip(driver);
    advanceTrip(trip, driver, 15, 500); // ~117m of driving on a ~167m approach
    assert.equal(trip.status, 'arriving');
  });

  it('cancelling inside the free window costs nothing', () => {
    const driver = makeDriver({ status: 'on_trip' });
    const trip = makeTrip(driver);
    const { fee } = cancelTrip(trip, driver, FREE_CANCEL_WINDOW_MS - 1);
    assert.equal(fee, 0);
    assert.equal(trip.status, 'cancelled');
    assert.equal(driver.status, 'available');
    assert.equal(driver.earnings, 0);
  });

  it('a late cancellation pays the driver, not the platform', () => {
    const driver = makeDriver({ status: 'on_trip' });
    const trip = makeTrip(driver);
    const { fee } = cancelTrip(trip, driver, FREE_CANCEL_WINDOW_MS + 1);
    assert.equal(fee, CANCELLATION_FEE);
    assert.equal(driver.earnings, CANCELLATION_FEE);
  });

  it('refuses to cancel a trip in progress', () => {
    const driver = makeDriver({ status: 'on_trip' });
    const trip = makeTrip(driver);
    trip.status = 'in_progress';
    assert.throws(() => cancelTrip(trip, driver, 0), /in progress/);
  });
});
