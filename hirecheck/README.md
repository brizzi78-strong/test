# HireCheck — new-hire background screening service

A small, self-contained service that lets a company run pre-employment
background checks on a candidate and drive the result through a compliant
hiring decision.

It is a **standalone project** in this workspace — it has nothing to do with
the Cardinal caregiver app, the book, or the CARD token. It lives here only
because that's where the work was requested.

## What it does

- Model **companies**, **candidates**, and reusable **screening packages**
  (named bundles of checks such as "Standard" or "Driver").
- Open a **screening order** for a candidate and walk it through a lifecycle
  that mirrors how real employment screening works — including the parts the
  law requires.
- Delegate the actual lookups to a pluggable **provider** (a Consumer Reporting
  Agency). A deterministic mock provider ships for tests and local demos; a real
  deployment implements the same interface against a vendor (Checkr, HireRight,
  Sterling, …).
- Keep an append-only **audit history** of every status change on each order.

### A note on scope and compliance

In the United States, pre-employment background checks are *consumer reports*
governed by the **Fair Credit Reporting Act (FCRA)**, and many states/cities
add their own rules (ban-the-box, individualized assessment, lookback limits).
This service encodes the workflow's hard gates so they can't be skipped by
accident:

1. **No checks run before the candidate authorizes.** An order cannot leave the
   `authorized` state into `in_progress` until a disclosure + authorization is
   recorded.
2. **Adverse decisions can't be instant.** Deciding "adverse" does not reject
   the candidate; it issues a *pre-adverse action* notice and opens a dispute
   window. Only after the waiting period (default 5 business days) can *final
   adverse action* be taken — and the candidate can be cleared instead if they
   dispute successfully.

This code helps run the process correctly; it is **not legal advice**. Confirm
your obligations with counsel and your CRA before going live.

## Order lifecycle

```
created ──authorize──▶ authorized ──submit──▶ in_progress ──checks done──▶ completed
                                                                              │
                                              adjudicate: clear ◀─────────────┤
                                                    │                         │
                                                    ▼             adjudicate: adverse
                                                  clear                       │
                                                    ▲                         ▼
                                    clear-dispute ──┴──────────────  pre_adverse_action
                                                                              │
                                                          waiting period ends │ finalize
                                                                              ▼
                                                                       adverse_action
```

`canceled` is reachable from any non-terminal state. Terminal states are
`clear`, `adverse_action`, and `canceled`. Transitions are enforced centrally
in `src/domain/workflow.ts`.

## Layout

```
src/
├── domain/
│   ├── types.ts            # entities, check types, order status, FCRA fields
│   └── workflow.ts         # allowed transitions + status helpers
├── providers/
│   ├── provider.ts         # ScreeningProvider (CRA) interface
│   └── mockProvider.ts     # deterministic, network-free mock CRA
├── store/
│   └── store.ts            # Store interface + in-memory implementation
├── service/
│   ├── screeningService.ts # orchestration + FCRA gating (the core)
│   └── errors.ts           # DomainError → HTTP status
├── api/
│   ├── router.ts           # zero-dependency HTTP router
│   └── server.ts           # wires service + store + provider + http server
├── index.ts                # entry point
└── __tests__/              # service + API test suites (node:test)
```

The service depends only on interfaces (`Store`, `ScreeningProvider`), so the
in-memory store and mock CRA can be swapped for a database and a real vendor
without touching business logic.

## Requirements

- **Node.js ≥ 22.18** — the source runs directly under Node's built-in
  TypeScript type-stripping, so there is **no build step and no runtime
  dependencies**.

## Running

```bash
npm start                 # starts the HTTP API on PORT (default 3000)
PORT=4000 npm start
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
| `GET /meta` | Service info + supported check types |
| `POST /companies` | Create a company `{ name }` |
| `POST /candidates` | Create a candidate `{ companyId, firstName, lastName, email, position }` |
| `POST /packages` | Create a screening package `{ companyId, name, checkTypes[] }` |
| `POST /orders` | Open an order `{ companyId, candidateId, packageId }` |
| `GET /orders` | List orders (`?companyId=&status=`) |
| `GET /orders/:id` | Fetch an order (with checks + audit history) |
| `POST /orders/:id/authorization` | Record FCRA authorization `{ method, disclosureVersion, ipAddress? }` |
| `POST /orders/:id/submit` | Run the package's checks via the provider |
| `POST /orders/:id/adjudication` | Decide `{ decision: "clear" \| "adverse", adjudicatedBy, notes? }` |
| `POST /orders/:id/adverse-action` | Finalize adverse action after the waiting period `{ reason? }` |
| `POST /orders/:id/clear-dispute` | Clear the candidate after a successful dispute `{ by, note? }` |
| `POST /orders/:id/cancel` | Cancel a non-terminal order `{ reason? }` |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` illegal state transition).

### Supported check types

`ssn_trace`, `sex_offender_registry`, `global_watchlist`, `national_criminal`,
`county_criminal`, `employment_verification`, `education_verification`,
`motor_vehicle_record`.

### Example: a full run with `curl`

```bash
BASE=http://localhost:3000
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
CAND=$(curl -s -XPOST $BASE/candidates \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin.park@example.com\",\"position\":\"Analyst\"}" | jq -r .id)
PKG=$(curl -s -XPOST $BASE/packages \
  -d "{\"companyId\":\"$CO\",\"name\":\"Standard\",\"checkTypes\":[\"ssn_trace\",\"national_criminal\"]}" | jq -r .id)
ORD=$(curl -s -XPOST $BASE/orders \
  -d "{\"companyId\":\"$CO\",\"candidateId\":\"$CAND\",\"packageId\":\"$PKG\"}" | jq -r .id)

curl -s -XPOST $BASE/orders/$ORD/authorization -d '{"method":"e_signature","disclosureVersion":"v1"}'
curl -s -XPOST $BASE/orders/$ORD/submit
curl -s -XPOST $BASE/orders/$ORD/adjudication -d '{"decision":"clear","adjudicatedBy":"recruiter@globex"}'
```

> Mock-provider demo tip: a candidate email whose local part contains
> `consider` forces every check to return `consider` (needs review), and
> `error` forces a provider error — handy for exercising the adverse-action and
> error paths without waiting on chance.
