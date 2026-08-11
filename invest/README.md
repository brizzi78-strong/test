# Cardinal Trading — a Robinhood-style trading UI

> **Don't ever trade alone again.**

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
- **Email verification** — signup sends a 24-hour, single-use verification
  link; until it's clicked the app shows a "verify your email" banner with a
  resend button. With no mailer configured the link is logged to the console
  (copy-pasteable), so the flow works in dev with zero setup.
- **Password reset** — "Forgot password?" emails a 1-hour, single-use reset
  link (the response is the same whether or not the address exists, so
  accounts can't be enumerated). Setting a new password logs the user out of
  every session, clears any failed-login lockout, and — since opening the
  link proves mailbox control — marks the email verified.
- **Home** — total equity, today's change, and the big portfolio chart
  (1D/1W/1M/3M) — your equity history replayed from fills and valued at
  historical prices — plus buying power, market value, unrealized P&L, and a
  positions table.
- **Browse** — today's gainers and losers up top, then every instrument with a
  live quote; click any card or row to open its detail/trade drawer.
- **Watchlist** — star any stock to track it; toggle again to remove it.
- **Orders** — full order history with status; cancel a resting limit order.
- **Trade drawer** — quote, a chart with 1D/1W/1M/3M ranges (scrub it with a
  mouse or a finger to read any point), **your position** when you hold the
  stock (shares, average cost, market value, total return), buy/sell,
  market/limit, dollars-or-shares entry, an estimate before you submit, and
  key stats (previous close, today, day range, open orders).
- **Recurring** — pick a repeat cadence on any dollar-based buy and it becomes
  a standing plan (daily/weekly/biweekly/monthly); the Recurring view lists
  plans with next/last run and pause/resume/delete. Installments execute
  automatically whenever the account is touched after they come due.

## Hardening

- **Rate limiting** — login/signup attempts are capped per client IP, and
  repeated *failed* logins lock that email out for the window (a successful
  login clears the count).
- **CSRF** — the session cookie is SameSite=Lax, and on top of that any
  state-changing request carrying a cross-site `Origin` is rejected with a
  403.
- **Security headers** — `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` on every response;
  a restrictive Content-Security-Policy on the page; `Cache-Control:
  no-store` on everything under `/auth` and `/api`.
- **Secure cookies** — set `INVEST_COOKIE_SECURE=1` (or run behind a proxy
  with `INVEST_TRUST_PROXY=1` and `x-forwarded-proto: https`) and the
  session cookie gains the `Secure` flag.
- **Audit trail** — signups, logins, failures, lockouts, logouts, and orders
  placed/cancelled are appended to an audit log (timestamp, action, client
  IP, user) in the auth store. It is never exposed over HTTP — read it from
  the database.

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
| `INVEST_DB` | SQLite path so users, sessions, and the audit trail survive restarts (unset → in-memory). |
| `STARTING_CASH_CENTS` | Starting buying power for each new signup (Trading defaults to $10,000). |
| `INVEST_COOKIE_SECURE` | `1` to always set the `Secure` flag on the session cookie. |
| `INVEST_TRUST_PROXY` | `1` when behind a reverse proxy: trust `x-forwarded-for` for rate limiting/audit IPs and `x-forwarded-proto` for Secure-cookie detection. |
| `SENDGRID_API_KEY` + `INVEST_MAIL_FROM` | Send real verification/reset email via SendGrid's HTTP API (`INVEST_MAIL_FROM_NAME` optional). Unset → links are logged to the console. |
| `INVEST_BASE_URL` | Absolute origin used in emailed links (e.g. `https://invest.example.com`); inferred from the request Host when unset. |

Serve it over HTTPS in any real deployment — the session cookie is HttpOnly
and SameSite=Lax, but it is only as private as the transport.
