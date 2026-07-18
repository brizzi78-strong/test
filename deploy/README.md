# Deploying the Cardinal HR platform

Run the whole platform — all seven services plus the marketing website — with a
single command. Each service is a zero-dependency TypeScript project run
directly under Node (no build step), backed by a durable SQLite volume.

## Run it all locally

```bash
docker compose -f deploy/docker-compose.yml up --build
```

That starts:

| Service | URL |
|---|---|
| **API gateway** (authenticated entry) | http://localhost:8080 |
| Website (nginx) | http://localhost:8081 |
| Recruiting | http://localhost:3200 |
| Screening (HireCheck) | http://localhost:3000 |
| MyHR onboarding | http://localhost:3100 |
| Training | http://localhost:3300 |
| Benefits | http://localhost:3400 |
| Payroll | http://localhost:3500 |
| Employee Directory | http://localhost:3600 |

Health-check any service at `GET /health`. Data persists in per-service named
volumes (`docker volume ls`); remove them with `docker compose ... down -v`.

The **gateway** is the authenticated front door: issue a key against it and call
any service through `http://localhost:8080/<service>/...` (see
`gateway/README.md`). The individual service ports above are exposed for local
development and debugging — in a real deployment you'd keep only the gateway (and
website) public and drop the direct `ports:` mappings so traffic must be
authenticated.

```bash
export GATEWAY_ADMIN_TOKEN=change-me
docker compose -f deploy/docker-compose.yml up --build
KEY=$(curl -s -XPOST localhost:8080/admin/keys -H "x-admin-token: $GATEWAY_ADMIN_TOKEN" \
  -d '{"companyId":"co_acme","name":"Acme"}' | jq -r .key)
curl -s -H "authorization: Bearer $KEY" localhost:8080/directory/health
```

## What's here

- **`Dockerfile`** — one shared `node:22-alpine` image for every service (the
  service + port are chosen per-container in compose). No `npm install` because
  the services have no runtime dependencies.
- **`docker-compose.yml`** — the seven services (each with its own port and
  SQLite volume) plus an nginx container serving `cardinal-hr/`.
- **`.dockerignore`** (repo root) — keeps the image to just the HR modules.

## Notes toward production

This is deployment **scaffolding** — enough to run everything together on a
host you control. Before a real public launch you'd still want:

- **A reverse proxy / gateway** in front (TLS, one hostname, routing to
  services) instead of exposing seven ports.
- **Authentication & multi-tenancy** — the services are currently unauthenticated.
- **A managed database** (Postgres) instead of file-based SQLite once you need
  concurrent writers, backups, and horizontal scaling — swap it in behind each
  module's existing `Store` interface.
- **Real provider credentials** (Equifax for screening; a registered payroll-tax
  filer) supplied via secrets, not committed.
- **Health checks, logging, and CI** wired into your platform of choice.

Any of these can be added incrementally — the module boundaries (Store
interface, provider interface, env-based config) were built to make each a
localized change.
