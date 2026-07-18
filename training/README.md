# Training — online training portal

Assign compliance and onboarding **courses** to new hires, track **lesson**
completion, and score a final **assessment**. It's the last step of the
onboarding flow (after Recruiting → Screening → MyHR) and, like its siblings,
a **standalone project** — zero runtime dependencies, no build step.

## What it does

- Manage a company's **course catalog** — fully customizable. A course is a
  list of lessons plus an optional passing score (0–100). Examples: *Sexual
  Harassment Prevention*, *Workplace Safety*, *Code of Conduct*, *Data
  Privacy* — whatever the company defines.
- Enroll **learners** (new hires) and track which lessons they've completed.
- When a course has a **passing score**, the learner must submit an assessment
  at or above it to complete; a low score marks the enrollment `failed` and the
  learner can retake.
- Enrollment status is always **derived** from progress (`not_started →
  in_progress → completed`, or `failed`) — it can't drift from the lessons and
  score behind it.
- Append-only **history** on every enrollment (enrolled, lessons, assessments).

## Enrollment status

```
not_started ──complete a lesson──▶ in_progress ──all lessons + (assessment passed / none)──▶ completed
                                        │
                                        └── all lessons done, assessment below passing ──▶ failed ──(retake)──▶ …
```

Status derivation lives in `src/domain/workflow.ts`.

## Layout

```
src/
├── domain/
│   ├── types.ts            # company, learner, course, enrollment
│   └── workflow.ts         # status derivation from lessons + assessment
├── store/
│   └── store.ts            # Store interface + in-memory implementation
├── service/
│   ├── trainingService.ts  # orchestration (the core)
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
npm start                 # HTTP API on PORT (default 3300)
PORT=4300 npm start
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
| `GET /meta` | Service info |
| `POST /companies` | Create a company `{ name }` |
| `POST /learners` | Create a learner `{ companyId, firstName, lastName, email }` |
| `POST /courses` | Create a course `{ companyId, title, lessons[], description?, passingScore? }` |
| `GET /courses` | List courses (`?companyId=`) |
| `GET /courses/:id` | Fetch a course |
| `POST /enrollments` | Enroll a learner `{ companyId, courseId, learnerId }` |
| `GET /enrollments` | List enrollments (`?companyId=&courseId=&learnerId=&status=`) |
| `GET /enrollments/:id` | Fetch an enrollment (progress + history) |
| `POST /enrollments/:id/lessons` | Mark a lesson complete `{ lesson }` |
| `POST /enrollments/:id/assessment` | Submit an assessment score `{ score }` |

Errors return `{ "error": { "code", "message" } }` with an appropriate status
(`400` validation, `404` not found, `409` illegal state transition).

### Example: a full run with `curl`

```bash
BASE=http://localhost:3300
CO=$(curl -s -XPOST $BASE/companies -d '{"name":"Globex"}' | jq -r .id)
LRN=$(curl -s -XPOST $BASE/learners \
  -d "{\"companyId\":\"$CO\",\"firstName\":\"Robin\",\"lastName\":\"Park\",\"email\":\"robin@example.com\"}" | jq -r .id)
CRS=$(curl -s -XPOST $BASE/courses \
  -d "{\"companyId\":\"$CO\",\"title\":\"Sexual Harassment Prevention\",\"lessons\":[\"intro\",\"scenarios\"],\"passingScore\":80}" | jq -r .id)
ENR=$(curl -s -XPOST $BASE/enrollments \
  -d "{\"companyId\":\"$CO\",\"courseId\":\"$CRS\",\"learnerId\":\"$LRN\"}" | jq -r .id)

curl -s -XPOST $BASE/enrollments/$ENR/lessons -d '{"lesson":"intro"}'
curl -s -XPOST $BASE/enrollments/$ENR/lessons -d '{"lesson":"scenarios"}'
curl -s -XPOST $BASE/enrollments/$ENR/assessment -d '{"score":90}'
```
