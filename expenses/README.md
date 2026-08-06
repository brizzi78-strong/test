# Expenses

Expense reporting without the Concur pain. The thesis: most expense reports are
fine, so a human should only ever look at the exceptions — and the filer should
know about every exception *while typing*, not days later in a rejection email.

## What makes it better than Concur

- **Instant policy feedback.** Every expense is evaluated against policy the
  moment it is entered. Missing receipt, category cap, stale or future date,
  duplicate — the filer sees the exact flag and message before submitting.
- **Auto-approval.** A fully compliant report at or under the ceiling
  (default $200) is approved the instant it is submitted, with a
  `policy-engine` entry in the audit history. No human, no waiting.
- **Duplicate detection.** Same merchant + amount + date is flagged both within
  a report and across all of the filer's other reports (case-insensitive on
  merchant).
- **Mileage done for you.** Enter miles; the server computes the amount at the
  IRS standard rate (70¢/mile for 2025). No receipt demanded for mileage.
- **An approval queue with the work already done.** Approvers only see flagged
  or over-ceiling reports, with each flag spelled out per line item.
- **One screen, zero training.** Reports, approvals, and spend analytics in a
  single page.

## Run

```sh
npm start          # http://localhost:3900  (override with PORT)
```

Zero runtime dependencies — Node ≥ 22.18 with built-in TypeScript
type-stripping and `node:sqlite`.

- `EXPENSES_DB=/path/to/data.db` — durable SQLite storage (default in-memory)
- `EXPENSES_USER` / `EXPENSES_PASSWORD` — enable an HTTP Basic auth gate
- `BRAND_NAME` — rebrand the web UI title/header

Identity is the `x-user-id` header (default `demo`), matching the other apps
in this repo; the web UI has an "Acting as" switcher so you can play both
filer and approver.

## Lifecycle

```
draft ──submit──▶ approved (auto, when compliant ≤ ceiling)
   │
   └──submit──▶ submitted ──approve──▶ approved ──reimburse──▶ reimbursed
                    │  ▲
                 reject └── reopen ──▶ draft (revise and resubmit)
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/policy` | Active policy (limits, mileage rate, ceiling) |
| POST | `/reports` | Create draft `{ title, approverId? }` |
| GET | `/reports` | My reports, each with a live policy evaluation |
| GET | `/reports/:id` | One report + evaluation |
| DELETE | `/reports/:id` | Delete a draft |
| POST | `/reports/:id/expenses` | Add expense (mileage: send `miles`, amount is computed) |
| PUT | `/reports/:id/expenses/:expenseId` | Update expense |
| DELETE | `/reports/:id/expenses/:expenseId` | Remove expense |
| POST | `/reports/:id/submit` | Submit; auto-approves when compliant |
| POST | `/reports/:id/reopen` | Submitted/rejected → draft |
| GET | `/approvals` | Reports waiting on my approval |
| POST | `/reports/:id/approve` | Approve (approver only, never the owner) |
| POST | `/reports/:id/reject` | Reject `{ reason }` |
| POST | `/reports/:id/reimburse` | Mark approved report paid |
| GET | `/analytics` | My spend by category/status, auto-approval count |

Amounts are integer cents. Dates are `YYYY-MM-DD`.

## Test

```sh
npm test           # node:test — policy engine units + full API walkthrough
npm run typecheck
```
