# Invest — a Robinhood-style trading UI

A usable multi-user trading app — sign up, log in, and get your own
paper-trading account with its own portfolio, watchlist, and order history.
Home/portfolio, browse, watchlist, and orders views, plus a buy/sell drawer
with market and limit orders, served by a backend-for-frontend that proxies
to the [Trading](../trading) engine. No build step: the whole app is one
HTML file returned by the BFF, and its JavaScript talks only to same-origin
`/api/*` and `/auth/*`.

It's a demo, not a real brokerage: every signup starts with paper money and
no orders reach any actual market or bank account. Market data defaults to a
deterministic mock feed, but running the Trading service with
`MARKET_DATA=yahoo` switches the whole app — quotes, charts, fills — to live
Yahoo Finance prices (no API key needed).

## What it does

- **Accounts** — email + password signup and login. Each new user gets a
  fresh Trading account (default $10,000 buying power). Passwords are
  scrypt-hashed; sessions are opaque random tokens in an HttpOnly cookie,
  stored and expired server-side (30 days).
- **Home** — total equity, today's change, buying power, market value,
  unrealized P&L, and a positions table.
- **Browse** — every instrument with a live quote; click a row to open its
  detail/trade drawer.
- **Watchlist** — star any stock to track it; toggle again to remove it.
- **Orders** — full order history with status; cancel a resting limit order.
- **Trade drawer** — quote, an intraday sparkline, buy/sell, market/limit,
  share quantity, and an estimated cost before you submit.

## Per-user isolation

The browser never holds a Trading credential, and it can never act outside
its own account. Every proxied `/api/*` call is forced into the session's
account server-side:

- account-scoped paths (`/api/portfolio/…`, `/api/watchlist/…`,
  `/api/realized-pnl/…`, `/api/accounts/…`) have the account segment
  **replaced** with the session's own account, whatever the client sent;
- `GET /api/orders` has its `accountId` filter **forced**, and
  `POST /api/orders` bodies are **stamped** with it;
- order-by-id reads and cancels are **ownership-checked** first — another
  user's order is a 404;
- anything not on the allowlist (e.g. `POST /accounts` upstream) is a 404.

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
| `INVEST_DB` | SQLite path so users and sessions survive restarts (unset → in-memory). |
| `STARTING_CASH_CENTS` | Starting buying power for each new signup (Trading defaults to $10,000). |

Serve it over HTTPS in any real deployment — the session cookie is HttpOnly
and SameSite=Lax, but it is only as private as the transport.
