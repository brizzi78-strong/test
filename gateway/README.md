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
  values downstream.
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
`training`, `benefits`, `payroll`, `directory`.

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

## The next increment: per-tenant isolation

The gateway authenticates and injects a **trusted `X-Company-Id`**, but the
services don't yet *read* it — they still take a `companyId` in the request. The
natural follow-on is to have each service derive/enforce its company from that
header (rejecting mismatches), which turns edge auth into full multi-tenant data
isolation. The header is already there, waiting.
