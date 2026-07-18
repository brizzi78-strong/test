# MyHR — new-hire paperwork service

The onboarding module where a newly hired employee completes and **e-signs**
their new-hire forms, and HR reviews them. It's a sibling to
[HireCheck](../hirecheck/README.md) (the background-check *consent* form lives
here) and follows the same shape: explicit state machines and an append-only
audit trail rather than opaque flags.

Like HireCheck, it's a **standalone project** in this workspace — it does not
depend on the Cardinal caregiver app, the book, or the CARD token.

## What it does

- Model **companies**, **employees** (new hires), and reusable **packet
  templates** (named sets of forms, e.g. "Full-time" or "Contractor").
- Assign an **onboarding packet** to an employee and drive each form through:
  `assigned → submitted → approved`, with `returned` when HR sends one back for
  a fix (and the employee re-submits).
- Capture a typed, timestamped **e-signature** on forms that require one.
- Derive the **packet status** from its items (`not_started → in_progress →
  submitted → complete`, plus `canceled`) so packet and items never drift.
- Keep an **append-only history** of every event on the packet.

### Supported forms

`i9` (Employment Eligibility), `w4` (Federal Tax Withholding), `state_tax`
(State Tax Withholding), `direct_deposit`, `emergency_contact`,
`handbook_acknowledgment`, `code_of_conduct`, `benefits_enrollment`,
`background_check_consent`.

Forms that require a signature to submit: `i9`, `w4`, `state_tax`,
`handbook_acknowledgment`, `code_of_conduct`, `background_check_consent`. The
rest are data-only.

> This service helps run onboarding paperwork; it is not legal or tax advice.
> The actual I-9/W-4 form logic and retention rules are the employer's
> responsibility — MyHR tracks completion, signature, and review state.

## Packet lifecycle

```
        assign packet
             │
             ▼
        not_started ──submit an item──▶ in_progress ──all items submitted──▶ submitted
                                             ▲                                    │
                              HR returns an item                          HR approves items
                                             │                                    │
                                             └──────────── (resubmit) ────────────┘
                                                                                  ▼
                                                                             complete
```

`canceled` is reachable from any non-terminal state. Terminal states are
`complete` and `canceled`. Packet status is always derived from the items
(`src/domain/workflow.ts`); item transitions are enforced there too.

## Layout

```
src/
├── domain/
│   ├── types.ts             # entities, form types, item/packet status, signature
│   └── workflow.ts          # item transitions + packet-status derivation
├── store/
│   └── store.ts             # Store interface + in-memory implementation
├── service/
│   ├── onboardingService.ts # orchestration + signature/transition rules (the core)
│   └── errors.ts            # DomainError → HTTP status
├── api/
│   ├── router.ts            # zero-dependency HTTP router
│   └── server.ts            # wires service + store + http server
├── index.ts                 # entry point
└── __tests__/               # service + API test suites (node:test)
```

## Requirements

- **Node.js ≥ 22.18** — runs directly under Node's TypeScript type-stripping, so
  there is **no build step and no runtime dependencies**.

## Running

```bash
npm start                 # HTTP API on PORT (default 3100)
PORT=4100 npm start
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
| `GET /meta` | Service info + supported paperwork types |
| `POST /companies` | Create a company `{ name }` |
| `POST /employees` | Create an employee `{ companyId, firstName, lastName, email, position, startDate }` |
| `POST /templates` | Create a packet template `{ companyId, name, items[] }` |
| `POST /packets` | Assign a packet `{ companyId, employeeId, templateId }` |
| `GET /packets` | List packets (`?companyId=&employeeId=`) |
| `GET /packets/:id` | Fetch a packet (items + audit history) |
| `POST /packets/:id/items/:type/submit` | Employee submits a form `{ data?, signature?: { name, ipAddress? } }` |
| `POST /packets/:id/items/:type/approve` | HR approves a form `{ reviewedBy }` |
| `POST /packets/:id/items/:type/return` | HR returns a form for correction `{ reviewedBy, note }` |
| `POST /packets/:id/cancel` | Cancel a non-terminal packet `{ reason? }` |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` illegal state transition).

### Example: a full run with `curl`

```bash
BASE=http://localhost:3100
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
EMP=$(curl -s -XPOST $BASE/employees \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin@example.com\",\"position\":\"Analyst\",\"startDate\":\"2026-09-01\"}" | jq -r .id)
TPL=$(curl -s -XPOST $BASE/templates \
  -d "{\"companyId\":\"$CO\",\"name\":\"Standard\",\"items\":[\"i9\",\"background_check_consent\"]}" | jq -r .id)
PKT=$(curl -s -XPOST $BASE/packets \
  -d "{\"companyId\":\"$CO\",\"employeeId\":\"$EMP\",\"templateId\":\"$TPL\"}" | jq -r .id)

curl -s -XPOST $BASE/packets/$PKT/items/i9/submit -d '{"signature":{"name":"Robin Park"}}'
curl -s -XPOST $BASE/packets/$PKT/items/i9/approve -d '{"reviewedBy":"hr@globex"}'
```
