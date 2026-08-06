# SquareFare — one search, every ride

The Expedia of ride hailing. SquareFare compares every way to make a trip —
Uber, Lyft, the local taxi fleet, and SquareFare's own driver network — and
ranks them by what the rider will actually pay. Book external rides with one
tap via deep link into the provider's app; book SquareFare-network rides right
in the app at an exact, itemized, locked-in price.

## Why this beats Uber and Lyft

Aggregators win by sitting **above** the suppliers, the way Expedia sits above
airlines and hotels:

- **Riders start here** — nobody wants to check three apps to find the fair
  price. Whoever owns the comparison owns the customer.
- **Uber and Lyft become suppliers, not competitors.** Their scale works for
  us: every driver they recruit makes our comparison more useful.
- **Our own network is the margin play.** Because SquareFare takes a flat 10%
  (vs their 25–30%), our exact quotes routinely undercut their estimates while
  paying drivers more — and every comparison screen advertises that fact.
- **Honesty is the moat.** External prices are shown as estimates from
  published city rates with the caveat that their surge is uncapped; our
  prices are exact and itemized. Riders learn fast which number they can trust.

### The SquareFare-network pledge

The whole fare formula for our own drivers fits on a napkin, and the app
shows every term:

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
runtime dependencies).

```bash
cd squarefare
npm start          # serves http://localhost:4700  (PORT env var to change)
npm test           # engine + aggregator + end-to-end API tests
npm run typecheck  # strict TypeScript
```

Open http://localhost:4700: click the map to drop pickup and dropoff pins and
the comparison appears — UberX, UberXL, Lyft, Lyft XL, metered taxi, and every
SquareFare tier with a nearby driver, cheapest first. External offers open
pre-filled in the provider's app; SquareFare offers book in-app, and a
simulated fleet completes the ride in accelerated time with a receipt showing
the exact rider/driver/platform split.

## Architecture

```
src/
  domain/      pure logic, no I/O — fully unit-tested
    geo.ts       haversine distance, ETAs, interpolation
    providers.ts THE AGGREGATOR CORE: external rate cards (Uber, Lyft, taxi),
                 deep-link builders, and price-ranked comparison
    pricing.ts   the published SquareFare-network fare engine (90/10 split)
    matching.ts  nearest-driver matching with a small rating credit
    trips.ts     trip state machine: matched -> arriving -> in_progress -> completed
  service/     RideService — application layer; injectable clock for tests
  store/       in-memory store with a deterministic seeded demo fleet
  api/         Node http server: JSON API under /api/*, rider SPA elsewhere
  web/         single-file rider app (canvas map, comparison list, live tracking)
  __tests__/   node:test suites: engine + aggregator unit tests, end-to-end API
```

### API

| Method & path | Purpose |
|---|---|
| `POST /api/compare` | `{pickup, dropoff}` → every provider's offer, cheapest first |
| `GET /api/health` | liveness |
| `GET /api/config` | city bounds, tier rates, take rate, surge cap |
| `GET /api/drivers` | live SquareFare fleet positions and status |
| `POST /api/quotes` | `{pickup, dropoff, tier}` → itemized network quote (5-min TTL) |
| `POST /api/trips` | `{quoteId, riderName}` → match a driver, start the trip |
| `GET /api/trips/:id` | live trip state (driver position, status) |
| `POST /api/trips/:id/cancel` | free within 2 min; flat $4 to the driver after |
| `POST /api/trips/:id/rate` | `{stars, tip}` — tip goes entirely to the driver |
| `GET /api/stats` | totals + effective take rate (always 0.10) |

## Honest scope

Uber and Lyft closed their public pricing APIs, so external offers are
estimates computed from published per-city rate cards — the same approach
production aggregators like RideGuru and Obi use — and are labelled as
estimates in the UI, with booking handled by deep link into the provider's
app. The SquareFare network side is a working single-city demo: simulated
fleet, ledger-entry payments, in-memory state. The comparison engine, pricing,
matching, trip lifecycle, and transparency guarantees are real and tested.
