import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createApp, type App } from '../api/server.ts';
import { RideService } from '../service/rideService.ts';
import { Store } from '../store/store.ts';
import { TAKE_RATE } from '../domain/pricing.ts';

const PICKUP = { lat: 40.75, lng: -73.99 };
const DROPOFF = { lat: 40.765, lng: -73.975 };

let app: App;
let base: string;
let clock = 1_000_000;
let service: RideService;

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  service = new RideService(new Store(), () => clock);
  app = createApp(service);
  app.stopSimulation(); // tests drive the clock and ticks by hand
  await new Promise<void>((resolve) => app.server.listen(0, resolve));
  const addr = app.server.address();
  assert.ok(addr && typeof addr === 'object');
  base = `http://127.0.0.1:${addr.port}`;
});

after(() => {
  app.server.close();
});

describe('platform endpoints', () => {
  it('health, config, drivers, stats', async () => {
    const health = await call('GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);

    const config = await call('GET', '/api/config');
    assert.equal(config.body.takeRate, TAKE_RATE);
    assert.equal(config.body.surgeCap, 1.5);
    assert.ok(config.body.tiers.standard.base > 0);

    const drivers = await call('GET', '/api/drivers');
    assert.ok(drivers.body.drivers.length >= 10);
    assert.ok(drivers.body.drivers.every((d: { status: string }) => d.status === 'available'));

    const stats = await call('GET', '/api/stats');
    assert.equal(stats.body.tripsCompleted, 0);
  });

  it('serves the rider app for non-API paths', async () => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('FairFare'));
  });

  it('rejects malformed requests clearly', async () => {
    const badTier = await call('POST', '/api/quotes', { pickup: PICKUP, dropoff: DROPOFF, tier: 'helicopter' });
    assert.equal(badTier.status, 400);
    const badCoords = await call('POST', '/api/quotes', { pickup: { lat: 999, lng: 0 }, dropoff: DROPOFF });
    assert.equal(badCoords.status, 400);
    const missing = await call('GET', '/api/trips/nope');
    assert.equal(missing.status, 404);
    const noRoute = await call('GET', '/api/nothing-here');
    assert.equal(noRoute.status, 404);
  });
});

describe('ride flow end to end', () => {
  it('quote -> request -> simulate -> complete -> rate, with a 90/10 split', async () => {
    const quote = await call('POST', '/api/quotes', { pickup: PICKUP, dropoff: DROPOFF, tier: 'standard' });
    assert.equal(quote.status, 201);
    const q = quote.body;
    assert.equal(Math.round((q.driverEarnings + q.platformFee) * 100), Math.round(q.total * 100));
    assert.ok(q.lines.length >= 3);

    const trip = await call('POST', '/api/trips', { quoteId: q.id, riderName: 'Ada Tester' });
    assert.equal(trip.status, 201);
    assert.equal(trip.body.status, 'matched');
    assert.ok(trip.body.driver.name.length > 0);

    // Quote is single-use once a trip is booked.
    const reuse = await call('POST', '/api/trips', { quoteId: q.id, riderName: 'Copycat' });
    assert.equal(reuse.status, 404);

    // Drive the simulation forward one hour of city driving: trip must finish.
    service.tick(3600);
    const done = await call('GET', '/api/trips/' + trip.body.id);
    assert.equal(done.body.status, 'completed');

    const stats = await call('GET', '/api/stats');
    assert.equal(stats.body.tripsCompleted, 1);
    assert.equal(stats.body.effectiveTakeRate, TAKE_RATE);
    assert.equal(
      Math.round((stats.body.driverTotalEarned + stats.body.platformTotalFees) * 100),
      Math.round(stats.body.riderTotalPaid * 100),
    );

    const rated = await call('POST', `/api/trips/${trip.body.id}/rate`, { stars: 5, tip: 3 });
    assert.equal(rated.status, 200);
    assert.equal(rated.body.rating, 5);
    assert.equal(rated.body.tip, 3);

    const again = await call('POST', `/api/trips/${trip.body.id}/rate`, { stars: 4 });
    assert.equal(again.status, 409);
  });

  it('free cancel inside the window, driver-paid fee after it', async () => {
    const q1 = (await call('POST', '/api/quotes', { pickup: PICKUP, dropoff: DROPOFF, tier: 'green' })).body;
    const t1 = (await call('POST', '/api/trips', { quoteId: q1.id })).body;
    const freeCancel = await call('POST', `/api/trips/${t1.id}/cancel`);
    assert.equal(freeCancel.status, 200);
    assert.equal(freeCancel.body.cancellationFee, 0);

    const q2 = (await call('POST', '/api/quotes', { pickup: PICKUP, dropoff: DROPOFF, tier: 'green' })).body;
    const t2 = (await call('POST', '/api/trips', { quoteId: q2.id })).body;
    clock += 3 * 60 * 1000; // three minutes later — past the free window
    const lateCancel = await call('POST', `/api/trips/${t2.id}/cancel`);
    assert.equal(lateCancel.body.cancellationFee, 4);
    assert.equal(lateCancel.body.status, 'cancelled');
  });

  it('expired quotes are refused with 410', async () => {
    const q = (await call('POST', '/api/quotes', { pickup: PICKUP, dropoff: DROPOFF, tier: 'standard' })).body;
    clock += 6 * 60 * 1000; // past the 5-minute quote TTL
    const res = await call('POST', '/api/trips', { quoteId: q.id });
    assert.equal(res.status, 410);
  });

  it('books out the XL fleet and reports no supply honestly', async () => {
    let last;
    for (let i = 0; i < 4; i++) {
      const q = (await call('POST', '/api/quotes', { pickup: PICKUP, dropoff: DROPOFF, tier: 'xl' })).body;
      last = await call('POST', '/api/trips', { quoteId: q.id });
    }
    assert.equal(last?.status, 409); // only 3 XL drivers in the seed fleet
    service.tick(3600); // let the booked XL trips finish so later tests see a free fleet
  });
});
