# Going Green — greener rides, no surprises

A ride-hailing platform built to beat Uber where it actually hurts: trust.
Same core product — tap a map, get matched, ride, pay — but every place Uber
is opaque or extractive, Going Green is transparent and driver-first by design,
with a first-class Green (EV) tier baked into the fleet.

## Why it's superior to Uber

| | Uber | Going Green |
|---|---|---|
| Platform take | ~25–30%, varies per trip, undisclosed | **Flat 10%**, printed on every quote |
| Fare formula | Black-box "upfront pricing" | **Public formula** (below) with an itemized quote |
| Surge | Unbounded, hidden inside the total | **Capped at 1.5×**, always its own line item |
| Tips | To the driver, after prompting screens | **100% to the driver**, one tap, no dark patterns |
| Cancellation fees | Kept partly by the platform | **Paid to the driver**, who lost the time |
| Booking / service fees | Added on top | **None.** The quote is the price |

The whole fare formula fits on a napkin, and the app shows every term:

```
subtotal   = base + perKm x distance + perMin x duration       (per tier)
fare       = max(minimumFare, subtotal) x demandMultiplier     (multiplier <= 1.5)
riderPays  = fare                                              (no other fees)
driverGets = fare x 0.90  +  100% of tip
```

The invariant `riderPaid = driverEarned + platformFees` is enforced by
construction and covered by tests — the effective take rate cannot drift
from 10%.

## Run it

Requires Node >= 22.18 (runs TypeScript directly — no build step, no
dependencies).

```bash
cd goinggreen
npm start          # serves http://localhost:4700  (PORT env var to change)
npm test           # engine + end-to-end API tests
npm run typecheck  # strict TypeScript
```

Open http://localhost:4700: click the map to drop pickup and dropoff pins,
compare tiers, and book. A simulated fleet of 12 drivers accepts the trip,
drives to you, and completes the ride in accelerated time; the receipt shows
exactly what you paid, what the driver received, and what the platform kept.

## Architecture

```
src/
  domain/      pure logic, no I/O — fully unit-tested
    geo.ts       haversine distance, ETAs, interpolation
    pricing.ts   the published fare engine (tiers, surge cap, 90/10 split)
    matching.ts  nearest-driver matching with a small rating credit
    trips.ts     trip state machine: matched -> arriving -> in_progress -> completed
  service/     RideService — application layer; injectable clock for tests
  store/       in-memory store with a deterministic seeded demo fleet
  api/         Node http server: JSON API under /api/*, rider SPA elsewhere
  web/         single-file rider app (canvas map, live trip tracking, receipts)
  __tests__/   node:test suites: engine unit tests + end-to-end API tests
```

### API

| Method & path | Purpose |
|---|---|
| `GET /api/health` | liveness |
| `GET /api/config` | city bounds, tier rates, take rate, surge cap |
| `GET /api/drivers` | live fleet positions and status |
| `POST /api/quotes` | `{pickup, dropoff, tier}` → itemized quote (5-min TTL) |
| `POST /api/trips` | `{quoteId, riderName}` → match a driver, start the trip |
| `GET /api/trips/:id` | live trip state (driver position, status) |
| `POST /api/trips/:id/cancel` | free within 2 min; flat $4 to the driver after |
| `POST /api/trips/:id/rate` | `{stars, tip}` — tip goes entirely to the driver |
| `GET /api/stats` | totals + effective take rate (always 0.10) |

## Honest scope

This is a working single-city demo, not a deployed marketplace: the fleet is
simulated, payments are ledger entries, and state is in-memory. What's real is
the part that makes it *superior* — the pricing engine, the matching, the trip
lifecycle, and the transparency guarantees, all tested. Swapping the store for
a database and the simulator for real driver apps changes none of the
economics above.
