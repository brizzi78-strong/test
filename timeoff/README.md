# Time Off (PTO)

Leave management: a company defines **leave policies**, employees **accrue**
balances, and they file **time-off requests** that a manager approves or denies.
An approval deducts from the balance; cancelling an approved request refunds it.
Same standalone, zero-dependency TypeScript style as the rest of the platform.

## What it does

- **Leave policies** per company and type (`vacation`, `sick`, `personal`,
  `unpaid`) — annual accrual, an optional balance cap, and whether a negative
  balance is allowed.
- **Accrual balances** per employee per type. A balance is always
  `accrued − used`, so "available" can't drift from the request history.
- **Requests** move `pending → approved | denied`, and can be `cancelled`.
  - **Approve** checks the available balance (unless the policy allows going
    negative) and deducts the hours.
  - **Cancel** of an *approved* request refunds the hours.
- Append-only **history** on every request.

## Request lifecycle

```
pending ──approve──▶ approved ──cancel──▶ cancelled
   │                    (refunds hours)
   ├──deny──▶ denied            (terminal)
   └──cancel──▶ cancelled       (terminal)
```

Balances move only on accrue (adds accrued) and approve (adds used); a
cancel-of-approved subtracts used. Transitions live in `src/domain/workflow.ts`.

## Layout

```
src/
├── domain/{types.ts, workflow.ts}      # entities, request states, balance math
├── store/{store.ts, sqliteStore.ts}    # in-memory + durable SQLite (same interface)
├── service/{timeOffService.ts, errors.ts}
├── api/{router.ts, server.ts}
├── index.ts
└── __tests__/                          # service + API + persistence
```

## Requirements

- **Node.js ≥ 22.18** — no build step, no runtime dependencies.

## Running

```bash
npm start                      # HTTP API on PORT (default 3700), in-memory
TIMEOFF_DB=./data/timeoff.db npm start   # durable SQLite storage
```

## Testing & typechecking

```bash
npm test
npm run typecheck
```

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health` · `GET /meta` | Liveness / service info + leave types |
| `POST /companies` | Create a company `{ name }` |
| `POST /employees` | Create an employee `{ companyId, firstName, lastName, email }` |
| `POST /policies` | Create a policy `{ companyId, type, name, annualAccrualHours, maxBalanceHours?, allowNegativeBalance? }` |
| `GET /policies?companyId=` | List a company's policies |
| `POST /employees/:id/accrue` | Grant hours `{ type, hours }` |
| `GET /employees/:id/balances` | All balances for an employee |
| `GET /employees/:id/balances/:type` | One balance |
| `POST /requests` | File a request `{ companyId, employeeId, type, startDate, endDate, hours, reason? }` |
| `GET /requests` | List (`?companyId=&employeeId=&status=&type=`) |
| `GET /requests/:id` | Fetch a request |
| `POST /requests/:id/approve` | Approve `{ reviewedBy }` (deducts balance) |
| `POST /requests/:id/deny` | Deny `{ reviewedBy, reason? }` |
| `POST /requests/:id/cancel` | Cancel `{ by?, reason? }` (refunds if approved) |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` conflict / insufficient balance).

### Example

```bash
BASE=http://localhost:3700
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
EMP=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin@globex.com\"}" | jq -r .id)

curl -s -XPOST $BASE/employees/$EMP/accrue -d '{"type":"vacation","hours":40}'
REQ=$(curl -s -XPOST $BASE/requests \
  -d "{\"companyId\":\"$CO\",\"employeeId\":\"$EMP\",\"type\":\"vacation\",\"startDate\":\"2026-08-03\",\"endDate\":\"2026-08-04\",\"hours\":16}" | jq -r .id)
curl -s -XPOST $BASE/requests/$REQ/approve -d '{"reviewedBy":"mgr@globex"}'
curl -s $BASE/employees/$EMP/balances/vacation
```
