# Orchestrator — the shared-identity layer

Nine HR services, each with its own database, means a new hire is really nine
disconnected rows: an employee in Directory, a candidate in HireCheck, an
onboarding record in MyHR, a learner in Training, and so on. "One employee
record" is marketing until something ties those rows together.

The orchestrator is that something. It owns a **canonical company and person**,
and a **link map** recording the id that same entity has in each downstream
service. Registering a company creates a matching company in every wired
service; hiring a person cascades their creation across all of them and records
each service's id — so afterward one canonical record resolves to the right row
everywhere.

```
POST /companies                     canonical company + one in every service
POST /companies/:id/hire            canonical person, cascaded into every service
GET  /people/:id                    → { …, links: { directory: "emp_…", myhr: "…", … } }
```

## Run it

```bash
npm start                 # or: node src/index.ts   (PORT, default 3900)
npm test                  # node --test
npm run typecheck         # tsc --noEmit
```

By default the service talks to the downstream services at their docker-compose
names (`http://directory:3600`, …). Override any base URL with an env var
(`DIRECTORY_URL`, `HIRECHECK_URL`, `MYHR_URL`, `TRAINING_URL`, `BENEFITS_URL`,
`TIMEOFF_URL`) for local runs. Set `ORCHESTRATOR_DB=/path/to/data.db` to persist
the canonical records to SQLite; unset uses an in-memory store.

## API

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness. |
| `GET /meta` | The list of services hires cascade into. |
| `POST /companies` | `{ name }` → canonical company; creates a matching company in every wired service and records the link map. |
| `GET /companies/:id` | Fetch a canonical company (including its per-service links). |
| `POST /companies/:id/hire` | `{ firstName, lastName, email, jobTitle, hireDate, employmentType? }` → canonical person, cascaded into every service. |
| `GET /people/:id` | Fetch a canonical person and the id they hold in each service. |
| `GET /people?companyId=` | List people, optionally scoped to one company. |

## Design

- **`domain/types.ts`** — canonical `Company` / `Person` plus the `links`
  (service → external id) maps. `PersonInput` is the normalized identity.
- **`downstream/provisioner.ts`** — a `Provisioner` per service knows how to
  ensure a company and create a person there, mapping the normalized identity to
  that service's own body shape. The HTTP implementation calls the real
  services; tests inject fakes.
- **`service/orchestratorService.ts`** — the cascade. Validates input once,
  then fans creation out across the provisioners and records the ids.
- **`store/`** — the same `Store` / `Collection` interface as every other
  module, with in-memory and `node:sqlite` implementations.
- **`api/`** — a zero-dependency HTTP router/server over `node:http`.

### Honest limitation

The cascade is **best-effort and sequential**, not a distributed transaction. If
a downstream call fails partway through a hire, the services called earlier
already hold the record and the failure surfaces as a `502`. A production build
would make this a saga with compensation, or an outbox with idempotent retries —
the `Provisioner` boundary is where that would slot in. The partial links that
did succeed are still returned, so a retry can be made idempotent per service.
