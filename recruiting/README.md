# Recruiting — job requisitions & applicant tracking

The front of the hiring funnel: post **job requisitions** and move **applications**
through a hiring pipeline. When an application reaches `hired`, that's the
hand-off point to the rest of the suite —
[HireCheck](../hirecheck/README.md) screening and [MyHR](../myhr/README.md)
onboarding.

Like its siblings, it's a **standalone project** — zero runtime dependencies,
no build step — that runs directly under Node's TypeScript type-stripping.

## What it does

- Model **companies** and **job requisitions** (title, department, location,
  employment type), with a status of `open → on_hold → filled | closed`.
- Accept **applications** against open requisitions.
- Move each application through the pipeline
  `applied → screening → interview → offer → hired`, with `rejected` and
  `withdrawn` reachable at any active stage.
- Enforce the transitions centrally (no skipping stages, no un-rejecting).
- Keep an **append-only stage history** on every application (audit trail).

Modules stay decoupled: reaching `hired` is simply the *signal* to start a
HireCheck order and a MyHR packet — this service does not call them.

## Pipeline

```
applied ─▶ screening ─▶ interview ─▶ offer ─▶ hired      (terminal)
   │           │            │          │
   └───────────┴────────────┴──────────┴──▶ rejected / withdrawn  (terminal)
```

Transitions live in `src/domain/workflow.ts`.

## Layout

```
src/
├── domain/
│   ├── types.ts             # company, requisition, application, stages
│   └── workflow.ts          # requisition + application state machines
├── store/
│   └── store.ts             # Store interface + in-memory implementation
├── service/
│   ├── recruitingService.ts # orchestration + transition enforcement (the core)
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
npm start                 # HTTP API on PORT (default 3200)
PORT=4200 npm start
```

### Durable storage

By default the store is in-memory (data is lost on restart). Set `RECRUITING_DB`
to a file path to use the durable SQLite store (Node's built-in `node:sqlite`,
no external dependency, same `Store` interface):

```bash
RECRUITING_DB=./data/recruiting.db npm start
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
| `POST /requisitions` | Open a requisition `{ companyId, title, department, location, employmentType }` |
| `GET /requisitions` | List requisitions (`?companyId=&status=`) |
| `GET /requisitions/:id` | Fetch a requisition |
| `POST /requisitions/:id/status` | Change status `{ status: "open"\|"on_hold"\|"filled"\|"closed" }` |
| `POST /applications` | Submit an application `{ companyId, requisitionId, firstName, lastName, email, phone?, resumeUrl? }` |
| `GET /applications` | List applications (`?companyId=&requisitionId=&stage=`) |
| `GET /applications/:id` | Fetch an application (with stage history) |
| `POST /applications/:id/advance` | Advance one stage `{ toStage, by?, note? }` |
| `POST /applications/:id/hire` | Mark hired `{ by?, fillRequisition? }` |
| `POST /applications/:id/reject` | Reject `{ by?, reason? }` |
| `POST /applications/:id/withdraw` | Withdraw `{ reason? }` |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` illegal state transition).

### Employment types

`full_time`, `part_time`, `contract`, `temporary`, `internship`.

### Example: a full run with `curl`

```bash
BASE=http://localhost:3200
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
REQ=$(curl -s -XPOST $BASE/requisitions \
  -d "{\"companyId\":\"$CO\",\"title\":\"Analyst\",\"department\":\"Finance\",\"location\":\"Remote\",\"employmentType\":\"full_time\"}" | jq -r .id)
APP=$(curl -s -XPOST $BASE/applications \
  -d "{\"companyId\":\"$CO\",\"requisitionId\":\"$REQ\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin@example.com\"}" | jq -r .id)

curl -s -XPOST $BASE/applications/$APP/advance -d '{"toStage":"screening"}'
curl -s -XPOST $BASE/applications/$APP/advance -d '{"toStage":"interview"}'
curl -s -XPOST $BASE/applications/$APP/advance -d '{"toStage":"offer"}'
curl -s -XPOST $BASE/applications/$APP/hire -d '{"by":"recruiter@globex","fillRequisition":true}'
```
