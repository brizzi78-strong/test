# TaxFile — simple federal tax estimator

A deliberately simple guided tax estimator — the interview idea of TurboTax
without the sprawl: six plain-language steps on one page, a live refund
tracker, and a scope screen that refuses rather than guesses. Zero runtime
dependencies (Node 22+ built-ins only), same layering as the other apps in
this repo (domain / service / store / api).

**This is an estimator, not a filing product.** Nothing is transmitted to the
IRS, and finalizing an estimate files nothing. Real filing would require an
EFIN, IRS MeF integration, and passing IRS assurance testing each season.

## What it does

- **Guided interview** — About You → Filing Status → Situation Check →
  Dependents → Income → Deductions, then Review. Every save recomputes the
  whole return and updates the refund/owe tracker.
- **Scope screening** (`src/domain/scope.ts`) — the guardrail that makes the
  rest safe to show. A missing feature is not a neutral gap: with nowhere to
  enter a pension, a naive engine returns a confident wrong refund. The
  screener catches that two ways:
  - **Declared situations** — the filer checks off retirement income, Social
    Security, marketplace insurance, rentals, K-1s, farm income, education or
    child-care costs, digital assets, foreign income, household employees, or
    prior-year carryovers. Any of these marks the return **unsupported**: the
    estimate is withheld entirely and the app points to IRS Direct File.
  - **Derived signals** — likely EITC eligibility or a child tax credit
    clipped by liability (both mean the refund shown is too low), QBI above
    the threshold, possible AMT, IRA phase-out, HSA coverage, capital loss
    carryforwards, underpayment-penalty exposure, and married-filing-separately
    complexity. Each finding says which way the estimate is likely wrong.

  Blocking findings withhold the number *and* prevent finalizing. Cautions
  show the estimate with the caveat attached. Thresholds are rounded screening
  bounds tuned to over-trigger — a false "check this" is cheap; a false
  "you're fine" is not.
- **Tax year 2025 federal 1040 engine** (post-OBBBA parameters), pure and
  fully unit-tested:
  - ordinary brackets for all four filing statuses
  - standard deduction (incl. age-65/blind extras) vs itemized, chosen
    automatically — medical 7.5%-AGI floor, OBBBA SALT cap ($40k with the
    high-income phase-down), mortgage interest, charity
  - qualified dividends & long-term capital gains via the 0/15/20% worksheet,
    with the $3,000 capital-loss limit
  - self-employment: Schedule C-lite (1099-NEC minus expenses), SE tax with
    the wage-base cap, half-SE-tax deduction, simplified 20% QBI deduction
  - above-the-line: student loan interest (cap + phase-out), IRA, HSA,
    educator expenses
  - child tax credit ($2,200/child under 17) + $500 other-dependent credit
    with the AGI phase-out; additional Medicare tax; NIIT
- **Finalize** — validates the estimate is complete and in scope, freezes it,
  and issues a reference id. Nothing is transmitted; a real product would
  integrate with IRS MeF here.
- **Two tax years** — 2025 as filed, or a 2026 projection (Rev. Proc. 2025-32
  parameters; a couple of minor items carry 2025 values pending final pubs,
  erring conservative). A year is a parameters file: `src/domain/taxYearNNNN.ts`
  plus one entry in `src/domain/params.ts`.
- **No SSN, ever** — names, birth years, and an email are all the interview
  asks for. SSN and address fields are optional in the API and absent from the
  UI: an estimate doesn't need them, and not collecting them keeps taxpayer
  identity data out of the system.
- **Accounts** — email + password (scrypt), Bearer-token sessions, per-user
  return isolation. Sessionless `x-user-id` header identity remains as the
  demo/dev mode.
- **Pro plan + billing** — planning scenarios are the paid tier. With
  `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` set, `POST /billing/upgrade` returns a
  Stripe Checkout URL and the signature-verified webhook
  (`STRIPE_WEBHOOK_SECRET`) flips the plan on `checkout.session.completed`;
  with no key configured, upgrade is instant dev-mode so the product is fully
  exercisable before Stripe is connected. Card data never touches this server.
- **Planning scenarios (Pro)** — the same pure engine run against what-ifs:
  IRA headroom (with the tax saved), a quarterly 1040-ES payment schedule,
  the equivalent W-4 withholding fix, and the all-in cost of the next $1,000
  of income.
- **Web app** at `/` — single HTML file, no build step.
- **Lightweight multi-user** — Bearer sessions, or the `x-user-id` header
  (default `demo`), matching the tenancy style of the sibling apps.

## Run

```sh
cd taxfile
npm start              # http://localhost:4600 (PORT to override)
TAXFILE_DB=/data/tax.db npm start   # durable SQLite storage instead of memory
```

Optional environment:

- `TAXFILE_USER` / `TAXFILE_PASSWORD` — set both to gate every route (except
  `/health` and the Stripe webhook) behind HTTP Basic auth; a Bearer session
  from `/auth/login` also passes the gate. Recommended for shared deployments,
  though the app no longer collects SSNs or addresses.
- `BRAND_NAME` — display name substituted into the web app's title and header
  (the Render deployment uses "Blue Ridge Tax").
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`,
  `PUBLIC_BASE_URL` — enable real Stripe Checkout for the Pro plan. Leave
  unset for instant dev-mode upgrades.

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
| `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me` | accounts and sessions |
| `POST /billing/upgrade` | Stripe Checkout URL, or instant upgrade in dev mode |
| `POST /billing/webhook` | Stripe events (signature-verified; exempt from the Basic gate) |
| `POST /returns` | start a return (`{"taxYear": 2025 or 2026}`, default 2025) |
| `GET /returns` | list your returns |
| `GET /returns/:id` | return + live computation |
| `PUT /returns/:id/personal` | taxpayer, spouse, address |
| `PUT /returns/:id/filing-status` | one of `single`, `married-joint`, `married-separate`, `head-of-household` |
| `PUT /returns/:id/situations` | declared out-of-scope situations |
| `PUT /returns/:id/dependents` | dependents array |
| `PUT /returns/:id/income` | W-2s, 1099-INT/DIV/NEC, gains, unemployment, estimated payments |
| `PUT /returns/:id/deductions` | itemized amounts + above-the-line adjustments |
| `GET /returns/:id/review` | computation + scope report + plan + anything blocking finalization |
| `GET /returns/:id/scenarios` | Pro: planning scenarios (402 on the free plan) |
| `POST /returns/:id/file` | finalize the estimate (transmits nothing); freezes the return |
| `DELETE /returns/:id` | delete (in-progress returns only) |

## Honest limitations

This is a demonstration estimator, not tax advice and not a filing-ready
product. Out of scope: EITC, AMT, the refundable portion of the CTC (ACTC),
education/energy credits, dependent-care credit, retirement and Social
Security income, ACA premium tax credit, Schedule E/F, state returns,
above-threshold QBI limitations, and real IRS transmission. Amounts are
computed in dollars and cents rather than IRS whole-dollar rounding.

The difference between this list and a naive engine is that the scope screen
*enforces* it: everything above either blocks the estimate or attaches an
explicit caveat, so the app declines instead of quietly returning a wrong
number. See `src/domain/scope.ts` for the rules and
`src/domain/taxYear2025.ts` for every parameter — a new tax year is a new
parameters file.
