# Cardinal Payroll — Run Payroll console (ADP-style)

A usable single-page **Run Payroll** app for one company: add employees, run a
whole pay period in one click, and see every paycheck gross-to-net plus the
company totals — total gross, employee withholding, net pay, employer taxes, and
the **total cash to remit**. Backed by a backend-for-frontend that proxies to the
[`payroll`](../payroll) service, so the browser never holds upstream
credentials, and the real federal + NC / FICA / employer-tax math is done by the
payroll engine (not re-implemented here).

Reachable at http://localhost:4700.

## ⚠️ What this is — and isn't

This is the **employer console** on top of a **withholding calculator**. It
computes each paycheck and the exact taxes owed, and shows pay-stub history with
YTD. It does **not** move money (ACH direct deposit) or file/remit taxes (941,
W-2, NC-3) — that's the registered-filer layer ADP charges for. Point the
underlying payroll engine at a filing provider (or hand these exact numbers to
your accountant) to close that gap. See [`payroll/README.md`](../payroll/README.md).

## Surfaces

| Path | Who | What |
|---|---|---|
| `GET /` | employer | The Run Payroll single-page app (password-gated in production). |
| `GET /me/:token` | employee | **Self-service**: their own pay stubs + YTD, read-only, no login. Always public. |
| `GET /health` | — | Liveness. |
| `GET /api/app` | employer | The configured business `{ companyId, businessName, jurisdiction }` plus upstream tax metadata (filing statuses, pay frequencies). |
| `POST /api/run-batch` | employer | Run one check date across all (or selected) employees; returns per-employee payslips **and company totals**. With `periodStart`/`periodEnd`, hourly hours are pulled from the timeclock (explicitly entered hours override). |
| `GET /api/employees/:id/selflink` | employer | Mint the employee's self-service link `{ token, path }`. |
| `GET /api/me/:token` | employee | That employee's profile + pay stubs + YTD + recent hours. Public; scoped strictly to the token's employee. |
| `POST /api/me/:token/hours` | employee | Log their own hours `{ date, hours, note? }`. Public; scoped to the token's employee. |
| `/api/time/*` | employer | Proxied to the Timeclock service (record / list / delete hours). |
| `GET /api/register?from&to` | employer | Payroll register + **941-style tax-liability** summary over a date range. |
| `GET /api/register.csv?from&to` | employer | The register as a CSV download (for a bookkeeper). |
| `/api/*` | employer | Transparently proxied to the Payroll service (employees, payslips, …). |

### Payroll register & tax liability (what you file)

The **Reports** card totals every paycheck in a period (defaults to the current
quarter) into the exact figures an accountant files:

- **Form 941 federal deposit** = federal income tax withheld + Social Security
  (both employee and employer halves, 12.4%) + Medicare (both halves, 2.9%).
- **NC state income tax** withheld (filed separately).
- Employer **FUTA + NC SUTA** unemployment.

Plus a per-paycheck register table and a **CSV export**. This is the bridge
across the "we compute, you file" seam: it produces the numbers, it does not
remit or file them.

### Benefits & deductions

The employee setup takes per-paycheck **benefits and deductions**, wired to the
engine's exact tax semantics:

- **401(k)** — pre-tax for income tax, **still FICA-taxed**.
- **Health / HSA premium (Section 125)** — pre-tax for income tax **and FICA**.
- **Other post-tax** — a named deduction taken after taxes (e.g. garnishment).

These flow through the real gross-to-net engine, so FICA wages, federal/state
taxable wages, and net pay all reflect them correctly, and each pay stub itemizes
the pre- and post-tax amounts.

### Time & attendance → payroll

Hourly hours don't have to be typed in at run time. Log them through the
console's **Timesheets** card or the employee's own self-service link; they're
stored in the [`timeclock`](../timeclock) service. When you run a pay period with
`periodStart`/`periodEnd`, each hourly employee's hours are **pulled from the
timeclock** for that range and fed into the engine — the result marks whether
each line's hours came from the timeclock or were entered by hand (an explicit
entry always wins).

### Employee self-service (the "MyPay" surface)

From the console, each employee has a **Self-service link** button. It mints a
link like `/me/<token>` where the token is an **HMAC signature of the employee
id** — stateless, no password store. The employee opens it to see only their own
pay stubs and year-to-date totals; the data endpoint always filters payslips to
the token's (verified) employee, so a link can never reveal anyone else's pay. A
tampered or forged token is rejected (401). Set `RUNPAY_TOKEN_SECRET` in
production so links stay valid across restarts (a random per-process secret is
used otherwise).

### The one thing the BFF adds: `run-batch`

A single-employee endpoint can't answer "what does this pay period cost the
company?" `run-batch` runs everyone through the real engine for a check date and
totals it — and an employee who can't be run (e.g. hourly with no hours) is
captured per-line, never aborting the batch:

```json
{
  "payDate": "2026-01-15",
  "lines": [ { "employeeId": "emp_1", "name": "Jordan Rivera", "ok": true, "payslip": { "grossCents": 200000, "netCents": 158548, ... } } ],
  "totals": {
    "employees": 1,
    "grossCents": 200000,
    "employeeWithholdingCents": 41452,
    "netCents": 158548,
    "employerTaxCents": 15300,
    "totalRemittanceCents": 56752
  }
}
```

`totalRemittanceCents` = employee withholding + employer tax = the cash that
leaves the company for taxes that period.

## Run it

```bash
npm start                                  # PORT default 4700
PAYROLL_URL=http://localhost:3500 npm start
npm test                                   # e2e against a real in-process Payroll service
npm run typecheck
```

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 4700). |
| `PAYROLL_URL` | Payroll service base URL (default `http://payroll:3500`). |
| `TIMECLOCK_URL` | Timeclock service base URL (default `http://timeclock:4800`). |
| `BUSINESS_NAME` | Company payroll is run for (default "Blue Ridge Press LLC"). |
| `BUSINESS_COMPANY_ID` | Reuse an existing Payroll company id (recommended in prod). |
| `PAYROLL_JURISDICTION` | Tax jurisdiction for a newly created company (default `raleigh_nc`). |
| `GATEWAY_API_KEY` | Optional Bearer key sent upstream, kept off the browser. |
| `RUNPAY_USER` / `RUNPAY_PASSWORD` | Optional HTTP Basic gate on the console. The self-service links (`/me/...`) are never gated. |
| `RUNPAY_TOKEN_SECRET` | HMAC secret for employee self-service links. Set it so links survive restarts; unset uses a per-process random secret. |

On first use it reuses a Payroll company with `BUSINESS_NAME` (or creates one),
so restarts against a durable Payroll store don't duplicate the company.
