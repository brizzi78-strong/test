# Cardinal Books — bookkeeping UI

A simple, usable bookkeeping app for one business — think QuickBooks, but
simpler. It's a self-contained single-page app served by a **backend-for-
frontend** that proxies to the [Accounting](../accounting) service, so every
invoice, payment, and expense is real and persisted upstream.

Configured for **Blue Ridge Press LLC** by default.

## What you can do

- **Dashboard** — outstanding A/R, overdue, income and net (month-to-date), an
  A/R aging bar, and recent invoices.
- **Invoices** — create a draft (line items + tax), **issue** it (gets an
  `INV-####` number), **record payments** (auto-marks paid when settled; can't
  overpay), or **void** it.
- **Customers** — add customers and see each one's open balance.
- **Expenses** — log expenses against expense accounts.
- **Reports** — Profit & Loss and A/R aging, for this month or all time.

Matches the platform's Cardinal design system; works in light and dark.

## How it fits

```
browser ── /  /api/* ──▶ books (BFF) ── HTTP ──▶ accounting ──▶ SQLite
             (same origin)   proxy + bootstrap
```

On first use the BFF ensures the business exists in Accounting and seeds a
default chart of accounts (Consulting Revenue, Retainers, Software, Contractors,
Office), so it opens to a usable, empty set of books. The browser only ever
calls same-origin `/api/*`; the BFF adds any upstream credentials server-side.

## Run it

```bash
# start the accounting service first (in ../accounting): PORT=4400 npm start
ACCOUNTING_URL=http://localhost:4400 npm start   # PORT default 4500
npm test          # boots a real Accounting service in-process and drives the flow
npm run typecheck
```

Then open <http://localhost:4500>.

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 4500). |
| `ACCOUNTING_URL` | Accounting base URL (default `http://accounting:4400`). |
| `BUSINESS_NAME` | Company these books belong to (default `Blue Ridge Press LLC`). |
| `BUSINESS_COMPANY_ID` | Reuse an existing Accounting company id. Not required — the app also finds an existing company by `BUSINESS_NAME`, so restarts don't create duplicate books. |
| `BOOKS_USER` / `BOOKS_PASSWORD` | Optional HTTP Basic auth gate. Set **both** when the app is reachable publicly — everything except `/health` then requires the login. |
| `GATEWAY_API_KEY` | Optional bearer key sent upstream, kept off the browser. |

## Deploy it live

See [`../deploy/DEPLOY-BOOKS.md`](../deploy/DEPLOY-BOOKS.md). The quickest path is
the **Render** blueprint (`render.yaml` in the repo root): connect the repo, set a
password, and Render runs [`../deploy/allinone.ts`](../deploy/allinone.ts) — the
Accounting service + this app in one container with a persistent disk and
automatic HTTPS.

The whole stack also comes up together with
`docker compose -f deploy/docker-compose.yml up --build` (Cardinal Books on
`:4500`).
