# Trading — commission-free brokerage engine

A Robinhood-style trading engine, in the same shape as the other platform
modules (zero-dependency TypeScript, runs directly under Node's type
stripping — no build step). It opens **accounts** with paper buying power,
quotes a small universe of **instruments** off a deterministic mock market
feed, executes **market and limit orders**, and derives **positions** and
**realized P&L** from the fill history.

There is no real money and no real market data — see `invest/` for the
single-page app built on top of this engine.

## Model

| Entity | Notes |
|---|---|
| **Account** | Cash / buying power in cents. Starts with $10,000 (paper money) unless `startingCashCents` is given. |
| **Instrument** | A small fixed universe (`GET /instruments`) — enough to browse and demo with. |
| **Order** | `market` (fills immediately at the current quote) or `limit` (rests `open` until the feed crosses `limitPriceCents`). Quantities are **fractional shares** (6 decimal places); a market order can instead be placed in **dollars** (`amountCents`) and the engine computes the fractional quantity. |
| **Position** | Derived, not stored — replayed from filled orders using average-cost basis (`src/domain/portfolioMath.ts`). |
| **Watchlist** | Per-account list of symbols to track. |
| **RecurringPlan** | A standing dollar-based buy (`amountCents` of `symbol` every `daily`/`weekly`/`biweekly`/`monthly`). Executed lazily: any account touch first runs every due plan at the current quote; an unaffordable run is recorded as skipped, and the schedule advances from the moment of execution so an idle account gets one catch-up buy, not a pile. |

### Market data: mock by default, live via Yahoo Finance

Quotes and history come from a pluggable `MarketDataSource`
(`src/domain/marketData.ts`), selected by the `MARKET_DATA` env var:

- **`mock` (default)** — `src/domain/priceEngine.ts`, a pure function of
  `(symbol, time)`: a small sum of sine waves, seeded per symbol, that
  wanders smoothly and boundedly around each instrument's reference price.
  Deterministic (same instant → same price, so fills and quotes are
  reproducible in tests) and "live" (real wall-clock time passing moves the
  price) with no ticking background process or persisted price history.
- **`MARKET_DATA=yahoo`** — real quotes and real intraday history from Yahoo
  Finance's public chart API. No API key needed. Responses are TTL-cached
  (quotes 15s, history 60s) so browsing doesn't hammer the endpoint; an
  unreachable or malformed upstream surfaces as a 502 `upstream` error.

`GET /meta` reports which source is active. Adding another vendor means
implementing the two-method `MarketDataSource` interface — nothing else in
the service knows where prices come from.

### Order lifecycle

```
market order ──────────────────────────────▶ filled (immediately)

limit order ──rests "open"──▶ feed crosses limitPriceCents ──▶ filled
     └──────────────────────────cancel───────────────────────▶ cancelled
```

Limit orders are settled lazily: placing a new order, listing orders, or
reading a portfolio first re-checks every resting limit order on that account
against the current quote. A resting buy limit doesn't reserve cash up front
(so it can't double-book buying power across several open orders) — if it's
no longer affordable when the price finally crosses, it's left open to retry
rather than auto-cancelled.

## HTTP API

| Method & path | Purpose |
|---|---|
| `POST /accounts` | Open an account: `{ name, startingCashCents? }`. |
| `GET /accounts?name=` | List accounts, optionally by exact name (idempotent bootstrap). |
| `GET /accounts/:id` | Read an account. |
| `GET /instruments` | The tradable universe. |
| `GET /instruments/:symbol` | One instrument's static metadata. |
| `GET /quotes` | Live quote for every instrument. |
| `GET /quotes/:symbol` | Live quote for one instrument. |
| `GET /quotes/:symbol/history?points=&intervalMinutes=` | A price series for a chart. |
| `POST /orders` | Place an order: `{ accountId, symbol, side, type, quantity? | amountCents?, limitPriceCents? }` — `amountCents` (dollar-based, market only) or fractional `quantity`. |
| `GET /orders?accountId=&status=&symbol=` | List orders, newest first. |
| `GET /orders/:id` | Read one order. |
| `POST /orders/:id/cancel` | Cancel a resting (`open`) order. |
| `GET /portfolio/:accountId` | Cash, positions (live-valued), equity, day change, unrealized P&L. |
| `GET /realized-pnl/:accountId` | Realized gain/loss from sells, trade by trade. |
| `POST /plans` | Start a recurring buy: `{ accountId, symbol, amountCents, cadence }` — the first installment executes immediately. |
| `GET /plans?accountId=` | List plans (settles due runs first). |
| `GET /plans/:id` | Read one plan. |
| `POST /plans/:id/pause` · `/resume` | Pause / resume (resuming a past-due plan invests on the next touch). |
| `DELETE /plans/:id` | Delete a plan. |
| `GET /watchlist/:accountId` | The account's watchlist, with live quotes. |
| `POST /watchlist/:accountId` | Add a symbol: `{ symbol }`. |
| `DELETE /watchlist/:accountId/:symbol` | Remove a symbol. |

## Run it

```bash
npm start            # node src/index.ts   (PORT, default 4900)
npm test             # node --test
npm run typecheck    # tsc --noEmit
```

`TRADING_DB=/path/to/data.db` persists to SQLite (built-in `node:sqlite`);
unset uses an in-memory store. `MARKET_DATA=yahoo` switches from the
deterministic mock feed to live Yahoo Finance quotes (no key required).
