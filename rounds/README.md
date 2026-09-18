# Cardinal Rounds — leader rounding that closes the loop

A lightweight, self-hosted alternative to the leader-rounding software sold by
Studer Group / Huron (and similar patient-experience suites). It implements the
part of evidence-based leadership that actually moves engagement and HCAHPS
numbers — **structured rounding with visible follow-through** — without the
consulting contract, the per-bed license, or the data leaving your building.

## The loop

1. **Round** — a leader rounds on an employee or patient using a template
   (two evidence-based templates ship built in; add your own via the API).
2. **Harvest** — while saving the round, log what you heard: issues and
   recognitions are captured at the source, in the same motion.
3. **Stoplight** — every issue lands on a green / yellow / red board.
   Going **red requires a written "why"** — the honest explanation staff
   actually get shown, which is the whole point of stoplight reports.
4. **Recognize** — kudos go on a recognition wall instead of dying in a
   leader's notebook.
5. **See it** — the dashboard rolls up rounding cadence vs. goal, average
   scores (1–5), open issues, and recognitions per unit over 30 days.

## Where it beats the incumbents

| | Studer/Huron-style suites | Cardinal Rounds |
|---|---|---|
| Cost | Enterprise contract + coaching engagement | Free, self-hosted |
| Data | Vendor cloud | Your disk (SQLite) or in-memory |
| Deploy | Sales cycle, IT project | `node src/index.ts` |
| Dependencies | Proprietary platform | Zero runtime dependencies (Node ≥ 22.18) |
| Red issues | Often just a status | Requires a published reason — accountability by design |
| Extensibility | Vendor roadmap | Plain REST API + readable TypeScript |

It does not replace the coaching, benchmarking, or survey-vendor integrations
of the big suites — it replaces the software loop at their core.

## Run it

```sh
cd rounds
npm install        # dev-only deps (typescript, @types/node)
npm start          # http://localhost:4700
```

Configuration (all optional):

| Env var | Effect |
|---|---|
| `PORT` | Listen port (default 4700) |
| `ROUNDS_DB` | Path to a SQLite file for durable storage (default: in-memory) |
| `ROUNDS_USER` / `ROUNDS_PASSWORD` | Enable an HTTP Basic-auth gate |
| `BRAND_NAME` | Rebrand the web UI title/header |

## API

Requests are scoped by the `x-user-id` header (default `demo`), the same
lightweight tenancy the other apps in this repo use.

```
GET  /health
GET  /                    web app
POST /units               { name, cadenceGoal? }        GET /units
GET  /templates           (seeds 2 built-ins)           POST /templates
POST /rounds              { templateId, unitId, leader, subject,
                            answers: [{questionId, value}],
                            issues?: [{description, owner?}],
                            recognitions?: [{recipient, message}], notes? }
GET  /rounds              GET /rounds/:id
POST /issues              { unitId, description, owner? }
GET  /issues[?status=green|yellow|red]
PUT  /issues/:id          { status?, statusReason?, owner?, description? }
                          (status "red" requires statusReason)
POST /recognitions        { unitId, recipient, message }   GET /recognitions
GET  /summary             dashboard rollup
```

Answer values are validated against the template's question kinds:
`scale` → integer 1–5, `yesNo` → boolean, `text` → non-empty string.

## Tests

```sh
npm test          # 15 tests: service behavior + HTTP round trips
npm run typecheck
```
