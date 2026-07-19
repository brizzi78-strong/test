# Accounting — small-business bookkeeping

QuickBooks-style books for a small business, as a zero-dependency TypeScript
service in the same shape as the other platform modules (runs directly under
Node's type stripping — no build step). It keeps a **chart of accounts**, bills
**customers** with **invoices**, takes **payments**, logs **expenses**, and
reads two reports out of the books: a **profit & loss** and an **accounts-
receivable aging**.

Money is always whole **cents** (integers) — no floats. Every invoice carries an
append-only history.

## Model

| Entity | Notes |
|---|---|
| **Account** | Chart of accounts; one of `asset`, `liability`, `equity`, `income`, `expense`. |
| **Customer** | Who you bill. |
| **Invoice** | Line items (`quantity × unitPriceCents`) + a tax rate in basis points → subtotal, tax, total. Tracks `amountPaidCents` / `balanceCents`. |
| **Payment** | Applied to an open invoice; settles the balance. |
| **Expense** | Posts to an `expense` account with a vendor, amount, and date. |

### Invoice lifecycle

```
draft ──issue──▶ open ──payment(s) settle balance──▶ paid
  │                │
  └────void────────┴────void────▶ void
```

- `draft` – freely editable (`PATCH /invoices/:id`); not yet owed.
- `open` – issued (gets an `INV-####` number); accepts payments. A payment can't
  exceed the balance; when the balance hits zero the invoice auto-moves to `paid`.
- `paid` / `void` – terminal.

"Overdue" is never stored — it's derived from `dueDate` vs. the date a report runs.

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health`, `GET /meta` | Liveness; service metadata. |
| `POST /companies` | Create a company (books). |
| `POST /accounts` · `GET /accounts` · `GET /accounts/:id` | Chart of accounts. |
| `POST /customers` · `GET /customers` · `GET /customers/:id` | Customers. |
| `POST /invoices` · `GET /invoices` · `GET /invoices/:id` | Invoices (create as draft). |
| `PATCH /invoices/:id` | Edit a draft (lines, tax, due date, income account). |
| `POST /invoices/:id/issue` | Draft → open; assigns the number. |
| `POST /invoices/:id/payments` | Record a payment. |
| `POST /invoices/:id/void` | Void a draft or open invoice. |
| `POST /expenses` · `GET /expenses` · `GET /expenses/:id` | Expenses. |
| `GET /reports/profit-and-loss?companyId=&from=&to=` | Income (issued invoices) − expenses, grouped by account. |
| `GET /reports/accounts-receivable?companyId=&asOf=` | Open balances bucketed by days past due (`current`, `1–30`, `31–60`, `61–90`, `90+`). |

Requests behind the API gateway are scoped to the trusted `x-gateway-tenant`
header (see [`src/api/tenancy.ts`](src/api/tenancy.ts)) — a tenant only ever sees
and writes its own company's rows.

## Run it

```bash
npm start                                  # PORT default 3600 (in-memory store)
ACCOUNTING_DB=/path/to/books.db npm start  # durable SQLite store (node:sqlite)
npm test                                   # service + HTTP + persistence tests
npm run typecheck
```

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 3600). |
| `ACCOUNTING_DB` | SQLite file path; unset uses the in-memory store. |

## Design

- **`src/domain`** — types + pure math (invoice totals, tax, aging buckets) and
  the status-transition table.
- **`src/service`** — `AccountingService`: all the rules (a payment can't
  overrun a balance, expenses must hit an expense account, only drafts edit),
  with the clock and id generator injected for deterministic tests.
- **`src/store`** — a `Store` interface with interchangeable in-memory and
  `node:sqlite` implementations.
- **`src/api`** — a tiny zero-dependency HTTP router + per-tenant scoping.
