# Cardinal Scout — book scouting console

**Constantly finding the books the world wants to buy.** A usable single-page
app for sourcing used books to resell: keep a live *demand catalog* of the
editions the market actually wants, appraise any copy in your hand in seconds,
and only spend money when the math says the flip works.

## What you can do

- **Dashboard** — realized profit, cash invested, listed value, buy/pass rate,
  the **hot list** (every tracked edition ranked by a 0–100 demand score), and
  recent scans.
- **Scout** — pick the book, its condition, and the asking price; get an
  instant **BUY / PASS** verdict with the full worked math: expected sale
  (condition-adjusted, capped by the lowest competing offer), marketplace fee,
  shipping, net proceeds, **max buy price**, projected profit, and ROI.
- **Inventory** — every buy walks *owned → listed → sold*; profit is computed
  at sale time (sale − 15% fee − $3.50 shipping − cost).
- **Catalog** — the demand signals behind it all: sales rank, average sold
  price, and lowest active offer per ISBN-13 (check-digit validated). Keep
  them fresh and the verdicts stay honest.

Matches the platform's Cardinal design system; works in light and dark.

## The appraisal rules

- **Velocity** from sales rank: hot (≤25k, ~7 days to sell), strong (≤150k),
  steady (≤600k), slow (≤1.5M), dead (worse). Dead demand is always a pass.
- **Expected sale** = avg sold price, capped by a lower active offer, then
  scaled by condition (new 100% → acceptable 50%).
- **Net proceeds** = expected sale − 15% marketplace fee − $3.50 shipping.
- **Max buy** = the most you can pay and still clear **$3 minimum profit**
  *and* **50% minimum ROI** — whichever bites first.

All money is integer cents; the engine (`src/domain/appraise.ts`) is pure and
fully unit-tested. Data is in-memory — a restart starts a fresh shop.

## Run it

```bash
npm start         # PORT default 4600
npm test
npm run typecheck
```

Then open <http://localhost:4600>. It opens seeded with nine real editions so
the hot list is immediately usable.

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 4600). |
| `BRAND_NAME` | Display name (default `Cardinal Scout`). |
| `SCOUT_USER` / `SCOUT_PASSWORD` | Optional HTTP Basic auth gate. Set **both** when the app is reachable publicly — everything except `/health` then requires the login. |

## API

```
GET  /health
GET  /api/catalog               hot list, most-wanted first
POST /api/catalog               add or update a demand signal
POST /api/scans                 appraise a copy -> verdict
GET  /api/scans
POST /api/scans/:id/buy         convert a scan into inventory
GET  /api/inventory
POST /api/inventory/:id/list    { priceCents }
POST /api/inventory/:id/sold    { soldCents? } defaults to list price
GET  /api/stats
```
