# Employee Directory — HRIS core

The system of record the rest of the platform hangs off: the canonical
**employee** record, the **department** tree, and the **manager** relationships
that form the org chart. Recruiting hands a hired candidate here; Payroll,
Benefits, MyHR, and Training all reference an employee that lives here.

Same standalone, zero-dependency TypeScript style as the other modules.

## What it does

- Maintain the **employee record** — name, work/personal email, phone, job
  title, department, manager, employment type, status, hire/termination dates,
  location.
- Organize a **department tree** (departments can have a parent).
- Keep the **org graph sound**:
  - work email is **unique per company**
  - a manager must be in the **same company**, never oneself, and not terminated
  - no **cycles** in the manager hierarchy or the department tree
- Drive **employment status** through a small state machine
  (`active ⇄ on_leave → terminated`, with rehire `terminated → active`).
- Answer **org-chart questions**: an employee's direct reports and full
  reporting chain.
- Search / filter the directory by company, department, manager, status, or a
  free-text query.

## Employment status

```
   ┌──────────────┐   on_leave    ┌──────────────┐
   │    active    │ ⇄──────────── │   on_leave   │
   └──────┬───────┘               └──────┬───────┘
          │ terminate                    │ terminate
          ▼                              ▼
   ┌─────────────────────────────────────────────┐
   │  terminated   ──rehire──▶  active            │
   └─────────────────────────────────────────────┘
```

Transitions and the cycle/reporting-chain helpers live in
`src/domain/orgchart.ts`.

## Layout

```
src/
├── domain/
│   ├── types.ts             # company, department, employee, enums
│   └── orgchart.ts          # status transitions + cycle detection + chains
├── store/
│   └── store.ts             # Store interface + in-memory implementation
├── service/
│   ├── directoryService.ts  # orchestration + invariants (the core)
│   └── errors.ts            # DomainError → HTTP status
├── api/
│   ├── router.ts            # zero-dependency HTTP router
│   └── server.ts            # wires service + store + http server
├── index.ts                 # entry point
└── __tests__/               # service + API test suites (node:test)
```

## Requirements

- **Node.js ≥ 22.18** — no build step, no runtime dependencies.

## Running

```bash
npm start                 # HTTP API on PORT (default 3600)
PORT=4600 npm start
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
| `GET /meta` | Service info + employment types |
| `POST /companies` | Create a company `{ name }` |
| `POST /departments` | Create a department `{ companyId, name, parentId? }` |
| `GET /departments?companyId=` | List a company's departments |
| `POST /employees` | Create an employee (name, workEmail, jobTitle, employmentType, hireDate, departmentId?, managerId?, …) |
| `GET /employees` | List/search (`?companyId=&departmentId=&managerId=&status=&search=`) |
| `GET /employees/:id` | Fetch an employee |
| `PATCH /employees/:id` | Update mutable fields (name, workEmail, jobTitle, phone, personalEmail, location) |
| `POST /employees/:id/department` | Assign/clear department `{ departmentId | null }` |
| `POST /employees/:id/manager` | Assign/clear manager `{ managerId | null }` |
| `POST /employees/:id/status` | Change status `{ to, effectiveDate? }` |
| `GET /employees/:id/reports` | Direct reports |
| `GET /employees/:id/reporting-chain` | Manager chain, top-most last |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` conflict / illegal transition / cycle).

### Example: build a mini org with `curl`

```bash
BASE=http://localhost:3600
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
CEO=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Dana\",\"lastName\":\"Cole\",\"workEmail\":\"dana@globex.com\",\"jobTitle\":\"CEO\",\"employmentType\":\"full_time\",\"hireDate\":\"2020-01-01\"}" | jq -r .id)
IC=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"workEmail\":\"robin@globex.com\",\"jobTitle\":\"Engineer\",\"employmentType\":\"full_time\",\"hireDate\":\"2026-09-01\",\"managerId\":\"$CEO\"}" | jq -r .id)

curl -s $BASE/employees/$CEO/reports
curl -s $BASE/employees/$IC/reporting-chain
```
