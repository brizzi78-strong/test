# Offboarding

The mirror of [MyHR onboarding](../myhr/README.md): when someone leaves, an
**offboarding case** is opened for them with a separation **checklist**, and
each task is completed or marked not-applicable. The case status is derived from
its tasks, so a completed case means every item was actually handled. Same
standalone, zero-dependency TypeScript style as the rest of the platform.

Together with Recruiting (hire) and the Directory (system of record), this
closes the employee lifecycle.

## What it does

- Open a **case** for a departing employee with a **reason** (`voluntary`,
  `involuntary`, `layoff`, `retirement`, `end_of_contract`) and a **last day**.
- Seed a **checklist** — the default covers exit interview, return equipment,
  revoke access, collect badge, final paycheck, COBRA notice, benefits
  termination, knowledge transfer, and remove-from-directory — or supply your own.
- Work each task to **done** or **N/A** (with who + when + an optional note).
- **Derived status**: `not_started → in_progress → completed`, plus `cancelled`.
- Append-only **history** on every case.

## Case lifecycle

```
not_started ──resolve a task──▶ in_progress ──every task done / N/A──▶ completed
      │                                                                  (terminal)
      └────────────────────── cancel ──────────────────────▶ cancelled  (terminal)
```

Case status is derived from the tasks (`src/domain/workflow.ts`); only
`cancelled` is set explicitly.

## Layout

```
src/
├── domain/{types.ts, workflow.ts}      # entities, task/case states, derivation
├── store/{store.ts, sqliteStore.ts}    # in-memory + durable SQLite (same interface)
├── service/{offboardingService.ts, errors.ts}
├── api/{router.ts, server.ts}
├── index.ts
└── __tests__/                          # service + API + persistence
```

## Requirements

- **Node.js ≥ 22.18** — no build step, no runtime dependencies.

## Running

```bash
npm start                              # HTTP API on PORT (default 3800), in-memory
OFFBOARDING_DB=./data/offboarding.db npm start   # durable SQLite storage
```

## Testing & typechecking

```bash
npm test
npm run typecheck
```

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health` · `GET /meta` | Liveness / service info + reasons + task types |
| `POST /companies` | Create a company `{ name }` |
| `POST /employees` | Create an employee `{ companyId, firstName, lastName, email }` |
| `POST /cases` | Open a case `{ companyId, employeeId, reason, lastDay, tasks? }` |
| `GET /cases` | List (`?companyId=&employeeId=&status=`) |
| `GET /cases/:id` | Fetch a case (tasks + history) |
| `POST /cases/:id/tasks/:type/complete` | Mark a task done `{ by, note? }` |
| `POST /cases/:id/tasks/:type/na` | Mark a task not applicable `{ by, note? }` |
| `POST /cases/:id/cancel` | Cancel a non-terminal case `{ reason? }` |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` conflict / already resolved).

### Example

```bash
BASE=http://localhost:3800
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
EMP=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin@globex.com\"}" | jq -r .id)
CASE=$(curl -s -XPOST $BASE/cases \
  -d "{\"companyId\":\"$CO\",\"employeeId\":\"$EMP\",\"reason\":\"voluntary\",\"lastDay\":\"2026-09-30\",\"tasks\":[\"return_equipment\",\"revoke_access\"]}" | jq -r .id)

curl -s -XPOST $BASE/cases/$CASE/tasks/return_equipment/complete -d '{"by":"it@globex"}'
curl -s -XPOST $BASE/cases/$CASE/tasks/revoke_access/complete -d '{"by":"it@globex"}'
```
