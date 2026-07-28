# API Gateway — authentication & routing

The single authenticated entry point in front of the Cardinal HR services. It
verifies an API key, resolves the caller's tenant (company), rate-limits, and
reverse-proxies to the right service — injecting a **trusted** `X-Company-Id` so
the internal services never see raw keys and a client can't spoof its tenant.

Zero runtime dependencies, same standalone TypeScript style as the services.

## Why a gateway

Authenticating at the edge means the seven services stay simple and consistent
instead of each re-implementing auth. It's the standard production shape: one
public door, many private rooms.

## What it does

- **API-key auth** — every request needs `Authorization: Bearer <key>` (or
  `X-API-Key: <key>`); missing → `401`, unknown → `401`.
- **Tenant injection** — the key maps to a company; the gateway strips any
  client-supplied `X-Company-Id` / `X-Gateway-Tenant` and sets its own trusted
  values downstream. Services **enforce** this header (see below), so it is real
  data isolation, not just a hint.
- **Rate limiting** — a per-key token bucket (default 20 req/s); over the limit → `429`.
- **Routing** — the first path segment selects the service:
  `/directory/...` → the Directory service, `/hirecheck/...` → Screening, etc.
  The `/<service>` prefix is stripped before proxying.
- **Admin key API** (guarded) — issue and list keys.
- **Durable keys** — set `GATEWAY_DB` to persist keys in SQLite (Node's built-in
  `node:sqlite`); default is in-memory.

## Requirements

- **Node.js ≥ 22.18** — no build step, no runtime dependencies.

## Running

```bash
GATEWAY_ADMIN_TOKEN=change-me npm start   # listens on PORT (default 8080)
```

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 8080) |
| `GATEWAY_DB` | SQLite key store path (default: in-memory) |
| `GATEWAY_ADMIN_TOKEN` | Enables `/admin/keys` when set |
| `GATEWAY_RATE_LIMIT` | Requests/sec per key (default 20) |
| `<SERVICE>_URL` | Override an upstream, e.g. `DIRECTORY_URL=http://127.0.0.1:3600` |

Services (path prefix → default upstream): `recruiting`, `hirecheck`, `myhr`,
`training`, `benefits`, `payroll`, `directory`, `timeoff`, `offboarding`,
`orchestrator`.

## HTTP surface

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness (no auth) |
| `POST /admin/keys` | Issue a key `{ companyId, name }` — requires `X-Admin-Token` |
| `GET /admin/keys` | List keys (masked) — requires `X-Admin-Token` |
| `ANY /<service>/<path...>` | Authenticated proxy to a service |

### Example

```bash
BASE=http://localhost:8080
# issue a key for a tenant (admin)
KEY=$(curl -s -XPOST $BASE/admin/keys -H "x-admin-token: $GATEWAY_ADMIN_TOKEN" \
  -d '{"companyId":"co_acme","name":"Acme"}' | jq -r .key)

# call any service through the gateway with that key
curl -s -H "authorization: Bearer $KEY" $BASE/directory/health
curl -s -XPOST -H "authorization: Bearer $KEY" $BASE/directory/companies -d '{"name":"Acme"}'
```

## Per-tenant isolation (enforced)

Edge auth is now real multi-tenant isolation: every service enforces the
gateway's trusted `X-Gateway-Tenant` header (see each service's
`src/api/tenancy.ts`). For any request that arrives with that header, a service:

- **stamps writes** with the tenant's company id — a body claiming a different
  `companyId` is overridden, so you can only create/update under your own tenant;
- **constrains list reads** to the tenant;
- **hides other tenants' records** — a single record owned by another tenant
  comes back as `404`.

So a key issued for one company cannot read or write another company's data,
whatever it puts in the request body. Requests **without** the header (direct
local access, or internal calls from the orchestrator) are unenforced — in
production only the gateway is exposed publicly.

Residual: a targeted mutation of another tenant's record by its opaque id still
persists before the response is hidden as a 404; closing that fully needs a
per-service ownership check at the store layer. Reads, list queries, and record
creation are fully isolated today.
