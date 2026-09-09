# Household Ledger

A single-page net worth statement for the household, as of September 5, 2026.
One self-contained `index.html` — no build step, no dependencies, no data leaves
the page. Open it in a browser or serve the folder.

## What it shows

- **Confirmed working total** — $1,175,000, the household number of record.
- **Reconciliation** — the nine accounts itemized here total **$588,000**, so
  $587,000 of the working total is not broken out yet. The page says so plainly
  rather than implying the ledger ties out.
- **The house** — $650,000 value against a $610,000 mortgage: 93.8% LTV, $40,000
  of equity.
- **Allocation** — computed from the nine itemized accounts, not estimated.
- **Milestones** — $1M (passed, +$175,000), $1.5M (78.3%), equity in the home (6.2%).
- **Accounting note** — the July 30, 2026 Tesla sale ($37,500) is disclosed and
  deliberately *not* added again, since the proceeds are assumed to already sit
  in the cash and brokerage balances.

## Updating it

Balances are literal values in `index.html`. When you change one, update in the
same pass: the account row's amount and its bar width (`width` is the account's
size relative to the largest holding), the itemized subtotal, the reconciliation
cells, and the allocation band percentages. The footnotes state the method, so
keep them true.

## Notes

- Light and dark themes, print styles, and a **Hide amounts** toggle that blurs
  every figure — useful when the screen is not private. The preference is stored
  in `localStorage` and never leaves the browser.
- This page contains personal financial figures. It is deliberately **not** wired
  into `render.yaml` and carries `noindex` — keep it off public hosting.
