# Invest — a Robinhood-style trading UI

A usable single-page trading app — home/portfolio, browse, watchlist, and
order history, plus a buy/sell drawer with market and limit orders — served
by a backend-for-frontend that proxies to the [Trading](../trading) engine
and opens to one paper-trading account. No build step: the whole app is one
HTML file returned by the BFF, and its JavaScript talks only to same-origin
`/api/*`.

It's a demo, not a real brokerage: the market feed is a deterministic mock
(see `trading/src/domain/priceEngine.ts`) and the starting cash is paper
money. Point it at a durable Trading deployment and every order, position,
and watchlist entry is real and persisted — just not connected to any actual
market or bank account.

## What it does

- **Home** — total equity, today's change, buying power, market value,
  unrealized P&L, and a positions table.
- **Browse** — every instrument in the mock market with a live quote; click a
  row to open its detail/trade drawer.
- **Watchlist** — star any stock to track it; toggle again to remove it.
- **Orders** — full order history with status; cancel a resting limit order.
- **Trade drawer** — quote, an intraday sparkline, buy/sell, market/limit,
  share quantity, and an estimated cost before you submit.

## Run it

```bash
npm start            # node src/index.ts   (PORT, default 5000)
npm test             # node --test
npm run typecheck    # tsc --noEmit
```

Config (env vars):

| Var | Purpose |
|---|---|
| `TRADING_URL` | Trading service base URL (default `http://trading:4900`). |
| `ACCOUNT_NAME` | Demo account name (default `Rob`); reused across restarts by name. |
| `ACCOUNT_ID` | Pin an existing Trading account id instead of looking one up by name. |
| `STARTING_CASH_CENTS` | Starting buying power for a newly created account (Trading defaults to $10,000). |
| `INVEST_USER` / `INVEST_PASSWORD` | Optional HTTP Basic auth gate in front of the whole app. |

No credentials reach the browser — the BFF holds the Trading connection
server-side and the browser only ever talks to `/api/*` on the same origin.
