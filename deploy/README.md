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
| **Admin portal** (the usable HR app) | http://localhost:4000 |
| **API gateway** (authenticated entry) | http://localhost:8080 |
| Website (nginx) | http://localhost:8081 |
| Recruiting | http://localhost:3200 |
| Screening (HireCheck) | http://localhost:3000 |
| MyHR onboarding | http://localhost:3100 |
| Training | http://localhost:3300 |
| Benefits | http://localhost:3400 |
| Payroll | http://localhost:3500 |
| Employee Directory | http://localhost:3600 |
| Time Off (PTO) | http://localhost:3700 |
| Offboarding | http://localhost:3800 |
| Orchestrator (shared identity) | http://localhost:3900 |
| Booking (scheduling + references) | http://localhost:4100 |
| Live Schedule (day-view UI) | http://localhost:4200 |
| Client booking site (public self-book) | http://localhost:4300 |
| Cardinal Books (bookkeeping UI) | http://localhost:4500 |
| Cardinal Verify (consent-based checks) | http://localhost:4600 |
| Cardinal Payroll (Run Payroll console) | http://localhost:4700 |

Health-check any service at `GET /health`. Data persists in per-service named
volumes (`docker volume ls`); remove them with `docker compose ... down -v`.

The **gateway** is the authenticated front door: issue a key against it and call
any service through `http://localhost:8080/<service>/...` (see
`gateway/README.md`). The individual service ports above are exposed for local
development and debugging — in a real deployment you'd keep only the gateway (and
website) public and drop the direct `ports:` mappings so traffic must be
authenticated.

The **orchestrator** is the shared-identity layer: register a company once and
`POST /orchestrator/companies/:id/hire` a person, and it cascades the creation
into Directory, HireCheck, MyHR, Training, Benefits, and Time Off — recording
the id each service assigned, so one canonical record resolves everywhere (see
`orchestrator/README.md`).

The **admin portal** at http://localhost:4000 is the human-facing app: a
single-page HR console (register a company, hire employees, click an employee to
see that one record resolve into every service) backed by a
backend-for-frontend that proxies to the orchestrator server-side — so no
credentials ever reach the browser (see `portal/README.md`).

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

## Cardinal Verify — turning on email (and getting it delivered)

Cardinal Verify (http://localhost:4600) emails the candidate their consent link
when a request is created, and each source their verifier link the moment the
candidate signs. Point the links at your real host and pick a transport:

```bash
# Where the emailed links point (your public URL for the verify service):
VERIFY_BASE_URL=https://verify.blueridgepressllc.com
VERIFY_MAIL_FROM=no-reply@blueridgepressllc.com
VERIFY_MAIL_FROM_NAME="Blue Ridge Press LLC"

# Option A — SMTP (works with a mailbox you already have):
SMTP_HOST=smtp.example.com
SMTP_PORT=587            # 587 = STARTTLS (default); 465 = implicit TLS
SMTP_USER=no-reply@blueridgepressllc.com
SMTP_PASSWORD=…          # an app-specific password for Gmail/iCloud/Fastmail
# SMTP_SECURE=true       # set only for port 465

# Option B — SendGrid (HTTP API, no SMTP):
# SENDGRID_API_KEY=SG.…  (used in preference to SMTP if both are set)
```

With none of these set, links are logged to the console instead of sent (fine
for local/testing) — and the console UI still shows every link to copy by hand.

### Deliverability — read before going live

Getting mail *sent* is not the same as getting it *delivered to the inbox*. Two
levels:

- **Fine for low volume / personal use:** sending through a personal mailbox
  (iCloud, Gmail) over SMTP works, but these enforce **low daily send limits**
  and mail is **more likely to land in spam** — especially when the visible
  `From` domain (e.g. `blueridgepressllc.com`) doesn't match the sending
  account. Use an **app-specific password**, not your login password.
- **Recommended for anything real:** send from an address **on your own domain**
  (`no-reply@blueridgepressllc.com`) through a proper relay — **SendGrid**,
  Postmark, Amazon SES, or your domain host's SMTP. Then publish **SPF, DKIM,
  and DMARC** DNS records for `blueridgepressllc.com` so receivers can verify the
  mail is really from you. Without those, verification emails to candidates and
  references will frequently be filtered — which quietly defeats the whole flow.

Either transport is a drop-in behind the same `Notifier` interface
(`verify/src/notify/`), so you can start on SMTP and move to a relay later
without touching application code. Every send is recorded on the request's
history as `*.emailed` / `*.email_failed`, and a failed send never blocks
consent — the link can always be re-sent or copied from the console.

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
