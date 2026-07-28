# Payroll — gross-to-net engine (Raleigh, NC)

Computes an employee's paycheck — gross → deductions → taxes → net — and the
employer's payroll-tax liability, configured for a **Raleigh, North Carolina**
work location. Same standalone, zero-dependency TypeScript style as the rest of
the platform.

## ⚠️ Read this first

**This is a withholding *calculator*, not filing-ready payroll.** It does **not**
remit taxes, move money (ACH direct deposit), or file returns (941, W-2, NC-3).
The tax figures are seeded from a specific year's published tables and **must be
verified for your tax year** — see the banner in
[`src/domain/taxTables.ts`](src/domain/taxTables.ts). For real payroll, back this
with a registered payroll provider and confirm with a tax professional.

## Why Raleigh is a clean model

North Carolina has a **flat state income tax** and **no local/city income tax** —
there is no Raleigh or Wake County wage tax. So the calculation is **federal +
NC-flat only**, with no local layer.

## What it computes

For each pay period, per employee:

- **Gross** from salary (÷ periods) or hourly (rate × hours)
- **Pre-tax deductions**, with the crucial distinction that a 401(k) reduces
  income-tax wages but *not* FICA, while a Section-125 premium/HSA reduces both
- **FICA**: Social Security (capped at the annual wage base) + Medicare
  (+ Additional Medicare above the YTD threshold)
- **Federal income tax** via the annual percentage method (Pub. 15-T), by
  filing status, with W-4 dependents credit and extra withholding
- **NC state income tax**: flat rate on annualized wages after the standard
  deduction and NC-4 allowances
- **Net pay**, and **employer taxes**: FICA match, FUTA, and NC SUTA

Year-to-date wage bases (for the SS cap and Additional Medicare threshold) are
accumulated from prior payslips in the same calendar year. Money is integer
cents throughout.

### Worked example (verified in tests)

A $52,000/yr single employee paid biweekly in Raleigh:

| Line | Amount |
|---|---|
| Gross | $2,000.00 |
| Social Security (6.2%) | −$124.00 |
| Medicare (1.45%) | −$29.00 |
| Federal income tax | −$201.29 |
| NC state income tax (3.99%) | −$60.23 |
| **Net pay** | **$1,585.48** |

## Layout

```
src/
├── domain/
│   ├── types.ts            # pay frequency, filing status, employee comp, payslip
│   ├── taxTables.ts        # EDITABLE Raleigh-NC tax config (verify yearly)
│   └── engine.ts           # pure gross-to-net calculation
├── store/
│   └── store.ts            # Store interface + in-memory implementation
├── service/
│   ├── payrollService.ts   # orchestration + YTD accumulation (the core)
│   └── errors.ts           # DomainError → HTTP status
├── api/
│   ├── router.ts           # zero-dependency HTTP router
│   └── server.ts           # wires service + store + http server
├── index.ts                # entry point
└── __tests__/              # engine (hand-verified math), service, API
```

## Requirements

- **Node.js ≥ 22.18** — no build step, no runtime dependencies.

## Running

```bash
npm start                 # HTTP API on PORT (default 3500)
PORT=4500 npm start
```

### Durable storage

By default the store is in-memory (data is lost on restart). Set `PAYROLL_DB` to
a file path to use the durable SQLite store (Node's built-in `node:sqlite`, no
external dependency, same `Store` interface):

```bash
PAYROLL_DB=./data/payroll.db npm start
```

## Testing & typechecking

```bash
npm test                  # node --test over src/__tests__
npm run typecheck         # tsc --noEmit (dev-only: typescript + @types/node)
```

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness probe |
| `GET /meta` | Jurisdictions, filing statuses, pay frequencies |
| `POST /companies` | Create a company `{ name, jurisdiction? }` (defaults to `raleigh_nc`) |
| `POST /employees` | Create an employee (comp, filing status, deductions) |
| `GET /employees` | List employees (`?companyId=`) |
| `GET /employees/:id` | Fetch an employee |
| `POST /employees/:id/payroll` | Run payroll for a period `{ payDate, hours? }` → a payslip |
| `GET /payslips` | List payslips (`?companyId=&employeeId=`) |
| `GET /payslips/:id` | Fetch a payslip |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` illegal state).

### Employee fields

`payType` (`salary`|`hourly`), `annualSalaryCents` or `hourlyRateCents`,
`payFrequency` (`weekly`|`biweekly`|`semimonthly`|`monthly`), `filingStatus`
(`single`|`married_joint`|`head_of_household`), optional `ncAllowances`,
`federalExtraWithholdingCents`, `federalDependentsAnnualCreditCents`,
`preTaxDeductions[]` (each `{ name, amountCents, reducesFederalTaxable,
reducesStateTaxable, reducesFica }`), `postTaxDeductions[]`.

### Example: run a paycheck with `curl`

```bash
BASE=http://localhost:3500
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
EMP=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"payType\":\"salary\",\"annualSalaryCents\":5200000,\"payFrequency\":\"biweekly\",\"filingStatus\":\"single\"}" | jq -r .id)

curl -s -XPOST $BASE/employees/$EMP/payroll -d '{"payDate":"2026-01-16"}' | jq
```
