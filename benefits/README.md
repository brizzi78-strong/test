# Benefits — benefits election / enrollment

The final onboarding step: a new hire **chooses their benefits**. A company
offers benefit plans (medical, dental, 401k, …), each with coverage tiers and a
monthly cost; the employee elects a plan + tier per benefit type (or waives it),
lists dependents, submits, and a benefits administrator confirms.

Like its siblings (Recruiting, Screening/HireCheck, MyHR, Training), it's a
**standalone project** — zero runtime dependencies, no build step.

## What it does

- Manage a company's **plan catalog** — a plan has a benefit type, a carrier,
  and one or more **coverage tiers** (employee, employee + spouse, employee +
  children, family), each with a monthly premium.
- Track an employee's **enrollment**: elect a plan + tier per benefit type, or
  waive it; add dependents and link them to an election.
- Compute the **total monthly premium** across elected benefits (integer cents,
  no float drift).
- Lock edits after submission (reopen to change), and keep an append-only
  **history** of the whole decision trail.

### Benefit types & coverage tiers

Types: `medical`, `dental`, `vision`, `life`, `disability`, `retirement_401k`,
`hsa`, `fsa`. Tiers: `employee`, `employee_spouse`, `employee_children`,
`family`.

## Enrollment lifecycle

```
not_started ──first election/waiver──▶ in_progress ──submit──▶ submitted ──confirm──▶ confirmed
                                            ▲                        │
                                            └──────── reopen ────────┘
```

Only `not_started` / `in_progress` enrollments are editable; a `submitted` one
must be reopened first. `confirmed` is terminal. Transitions and the premium
calculation live in `src/domain/workflow.ts`.

## Layout

```
src/
├── domain/
│   ├── types.ts            # company, employee, plan, tier, dependent, election, enrollment
│   └── workflow.ts         # status transitions + monthly-premium computation
├── store/
│   └── store.ts            # Store interface + in-memory implementation
├── service/
│   ├── benefitsService.ts  # orchestration + election/validation rules (the core)
│   └── errors.ts           # DomainError → HTTP status
├── api/
│   ├── router.ts           # zero-dependency HTTP router
│   └── server.ts           # wires service + store + http server
├── index.ts                # entry point
└── __tests__/              # service + API test suites (node:test)
```

## Requirements

- **Node.js ≥ 22.18** — no build step, no runtime dependencies.

## Running

```bash
npm start                 # HTTP API on PORT (default 3400)
PORT=4400 npm start
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
| `GET /meta` | Service info + benefit types + coverage tiers |
| `POST /companies` | Create a company `{ name }` |
| `POST /employees` | Create an employee `{ companyId, firstName, lastName, email }` |
| `POST /plans` | Create a benefit plan `{ companyId, type, name, carrier?, tiers: [{ tier, monthlyCostCents }] }` |
| `GET /plans` | List plans (`?companyId=&type=`) |
| `GET /plans/:id` | Fetch a plan |
| `POST /enrollments` | Start an enrollment `{ companyId, employeeId }` |
| `GET /enrollments` | List enrollments (`?companyId=&employeeId=`) |
| `GET /enrollments/:id` | Fetch an enrollment (elections, dependents, history) |
| `GET /enrollments/:id/summary` | Enrollment + computed `monthlyCostCents` |
| `POST /enrollments/:id/dependents` | Add a dependent `{ name, relationship, dateOfBirth? }` |
| `POST /enrollments/:id/elect` | Elect a plan `{ type, planId, tier, dependentIds? }` |
| `POST /enrollments/:id/waive` | Waive a benefit `{ type }` |
| `POST /enrollments/:id/submit` | Submit elections |
| `POST /enrollments/:id/confirm` | Confirm `{ confirmedBy }` |
| `POST /enrollments/:id/reopen` | Reopen a submitted enrollment for edits |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` illegal state transition).

> Premiums are stored and returned in **integer cents**. This service tracks
> elections and cost; it is not tax or benefits advice, and does not adjudicate
> eligibility rules (age-out, ACA affordability, etc.).

### Example: a full run with `curl`

```bash
BASE=http://localhost:3400
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
EMP=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin@example.com\"}" | jq -r .id)
PLAN=$(curl -s -XPOST $BASE/plans \
  -d "{\"companyId\":\"$CO\",\"type\":\"medical\",\"name\":\"PPO\",\"tiers\":[{\"tier\":\"employee\",\"monthlyCostCents\":10000},{\"tier\":\"family\",\"monthlyCostCents\":30000}]}" | jq -r .id)
ENR=$(curl -s -XPOST $BASE/enrollments -d "{\"companyId\":\"$CO\",\"employeeId\":\"$EMP\"}" | jq -r .id)

curl -s -XPOST $BASE/enrollments/$ENR/elect -d "{\"type\":\"medical\",\"planId\":\"$PLAN\",\"tier\":\"family\"}"
curl -s -XPOST $BASE/enrollments/$ENR/waive -d '{"type":"dental"}'
curl -s $BASE/enrollments/$ENR/summary
curl -s -XPOST $BASE/enrollments/$ENR/submit
curl -s -XPOST $BASE/enrollments/$ENR/confirm -d '{"confirmedBy":"benefits@globex"}'
```
