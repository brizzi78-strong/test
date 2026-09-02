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
- **Real receipts.** Attach the actual image or PDF (stored as a capped data:
  URL); approvers open it in place. List payloads carry only a marker, not the
  bytes.
- **Budgets, the way Mint did them.** A monthly limit per category with a
  progress meter that turns amber at 80% and red past the limit, "$spent of
  $available / $left" on every row, a month stepper, and optional rollover
  that carries an unused (or overspent) balance into the next month. Spend
  counts every expense you file that month — card and out-of-pocket alike —
  except rejected reports.
- **Tax-ready, not just spend-ready.** `GET /tax/schedule-c` rolls a year up by
  Schedule C line with the real federal treatment applied: business meals at
  50%, entertainment at nothing since the TCJA, travel and office in full, and
  mileage recomputed at the IRS standard rate rather than at whatever the
  company reimbursed. A purchase filed on two reports is deducted once. The
  total is what `taxfile/` takes as `businessExpenses` to derive net profit and
  self-employment tax. Ordinary-case rules and a starting point, not tax advice.
- **Card feed without reconciliation.** Import corporate card charges; a
  charge auto-matches when you enter the expense (same amount, ±3 days),
  or becomes an expense in one click with date/merchant/amount prefilled.
  Dismiss personal spend. Card-paid expenses are excluded from the
  reimbursable total, so reports show both "total" and "what we owe you".
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
- `EXPENSES_POLICY` — JSON overrides merged into the default policy, e.g.
  `{"autoApproveCeilingCents":50000,"categoryLimitCents":{"meals":10000}}`
  (invalid values fail startup loudly rather than silently changing policy)

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
| POST | `/reports/:id/expenses` | Add expense (mileage: send `miles`, amount is computed; `receipt` is a name or `{ name, dataUrl }` attachment; `paymentMethod` `personal` opts out of card matching, `card` declares card spend) |
| PUT | `/reports/:id/expenses/:expenseId` | Update expense |
| DELETE | `/reports/:id/expenses/:expenseId` | Remove expense |
| POST | `/reports/:id/submit` | Submit; auto-approves when compliant |
| POST | `/reports/:id/reopen` | Submitted/rejected → draft |
| GET | `/approvals` | Reports waiting on my approval |
| GET | `/reimbursements` | Approved reports I can pay out |
| POST | `/reports/:id/approve` | Approve (approver only, never the owner) |
| POST | `/reports/:id/reject` | Reject `{ reason }` |
| POST | `/reports/:id/reimburse` | Mark approved report paid |
| GET | `/analytics` | My spend by category/status, card vs out-of-pocket split |
| GET | `/export.csv` | My expenses as CSV (`?scope=approvals` for my queue) |
| GET | `/tax/schedule-c` | A year's deductible spend by Schedule C line (`?year=YYYY`, default this year) |
| GET | `/budgets` | My monthly category budgets |
| PUT | `/budgets/:category` | Set/replace a budget `{ amountCents, rollover?, startMonth? }` |
| DELETE | `/budgets/:category` | Remove a budget |
| GET | `/budgets/summary` | Budget progress for a month (`?month=YYYY-MM`, default this month) |
| POST | `/card-transactions/import` | Import card charges `{ transactions: [{ date, merchant, amountCents, last4 }] }` (re-imports dedupe) |
| GET | `/card-transactions` | My card feed (`?status=unmatched\|matched\|dismissed`) |
| POST | `/card-transactions/:id/expense` | One-click expense from a charge `{ reportId, category }` |
| POST | `/card-transactions/:id/dismiss` | Mark a charge as personal spend |
| POST | `/card-transactions/:id/restore` | Undo a dismissal |

Amounts are integer cents. Dates are `YYYY-MM-DD`. Receipt attachments are
image/PDF `data:` URLs capped at ~500 KB; list endpoints replace the bytes
with `hasData: true` — fetch the single report for the full attachment.

## Test

```sh
npm test           # node:test — policy engine units + full API walkthrough
npm run typecheck
```
