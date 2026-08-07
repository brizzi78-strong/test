# TaxFile — simple online tax prep

A deliberately simple online tax filing app — the guided-interview idea of
TurboTax without the sprawl: five plain-language steps on one page, a live
refund tracker, and one button to file. Zero runtime dependencies (Node 22+
built-ins only), same layering as the other apps in this repo
(domain / service / store / api).

## What it does

- **Guided interview** — About You → Filing Status → Dependents → Income →
  Deductions, then Review & File. Every save recomputes the whole return and
  updates the refund/owe tracker.
- **Tax year 2025 federal 1040 engine** (post-OBBBA parameters), pure and
  fully unit-tested:
  - ordinary brackets for all four filing statuses
  - standard deduction (incl. age-65/blind extras) vs itemized, chosen
    automatically — medical 7.5%-AGI floor, OBBBA SALT cap ($40k with the
    high-income phase-down), mortgage interest, charity
  - **medical expense tracker** — log each expense (date, provider, category,
    amount) as the year goes; every computation reports total tracked spend,
    the 7.5%-of-AGI floor, the deductible excess, and how much more qualifying
    spend it would take before anything becomes deductible
  - qualified dividends & long-term capital gains via the 0/15/20% worksheet,
    with the $3,000 capital-loss limit
  - self-employment: Schedule C-lite (1099-NEC minus expenses), SE tax with
    the wage-base cap, half-SE-tax deduction, simplified 20% QBI deduction
  - above-the-line: student loan interest (cap + phase-out), IRA, HSA,
    educator expenses
  - child tax credit ($2,200/child under 17) + $500 other-dependent credit
    with the AGI phase-out; additional Medicare tax; NIIT
- **Mock e-file** — validates the return is complete, freezes it, and issues
  a confirmation id. A real product would transmit through IRS MeF here.
- **Web app** at `/` — single HTML file, no build step.
- **Lightweight multi-user** — returns are scoped by an `x-user-id` header
  (default `demo`), matching the tenancy style of the sibling apps.

## Run

```sh
cd taxfile
npm start              # http://localhost:4600 (PORT to override)
TAXFILE_DB=/data/tax.db npm start   # durable SQLite storage instead of memory
```

Optional environment:

- `TAXFILE_USER` / `TAXFILE_PASSWORD` — set both to gate every route (except
  `/health`) behind HTTP Basic auth. Required in any public deployment:
  returns contain SSNs.
- `BRAND_NAME` — display name substituted into the web app's title and header
  (the Render deployment uses "Blue Ridge Tax").

## Deploy (Render)

The repo's `render.yaml` blueprint includes a `blue-ridge-tax` web service:
Docker runtime running `node taxfile/src/index.ts`, a 1 GB disk mounted at
`/data` for the SQLite store, and the Basic-auth gate enabled. Apply the
blueprint at Render (New + → Blueprint → this repo → Apply), set
`TAXFILE_PASSWORD` when prompted, and the app comes up at
`https://blue-ridge-tax-*.onrender.com`. If the blueprint was already applied
for the other services, sync it (or re-Apply) to pick up the new service.

Test and typecheck:

```sh
npm test
npm install && npm run typecheck
```

## API

| Method & path | Purpose |
| --- | --- |
| `POST /returns` | start a new 2025 return |
| `GET /returns` | list your returns |
| `GET /returns/:id` | return + live computation |
| `PUT /returns/:id/personal` | taxpayer, spouse, address |
| `PUT /returns/:id/filing-status` | one of `single`, `married-joint`, `married-separate`, `head-of-household` |
| `PUT /returns/:id/dependents` | dependents array |
| `PUT /returns/:id/income` | W-2s, 1099-INT/DIV/NEC, gains, unemployment, estimated payments |
| `PUT /returns/:id/deductions` | itemized amounts (incl. `medicalExpenseEntries`) + above-the-line adjustments |
| `GET /returns/:id/review` | computation + list of anything blocking e-file |
| `POST /returns/:id/file` | mock e-file; freezes the return on acceptance |
| `DELETE /returns/:id` | delete (in-progress returns only) |

## Honest limitations

This is a demonstration filing engine, not tax advice and not a filing-ready
product. Deliberately out of scope: EITC, AMT, the refundable portion of the
CTC (ACTC), education/energy credits, dependent-care credit, Schedule E/F,
state returns, above-threshold QBI limitations, and real IRS transmission.
Amounts are computed in dollars and cents rather than IRS whole-dollar
rounding. See `src/domain/taxYear2025.ts` for every parameter the engine
uses — a new tax year is a new parameters file.
