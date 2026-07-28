# Booking — scheduling & references for a service business

Built for the concrete case behind it: a massage business with several
therapists who need to **schedule appointments** (a live schedule) and **run
references** on the people they hire. It models the operational spine — who is
going where, when, and whether they've been vetted.

## What it does

- **Services** — the menu (e.g. "60-min massage"), each with a duration that
  determines how long its appointments run.
- **Workers** — the therapists, with contact details and vetting credentials
  (driver's-license state/number, LinkedIn). License numbers are **masked to the
  last four** on the way out; the raw value is never returned in a listing.
- **Appointments** — book a client with a service at a time; the end is derived
  from the service duration. A worker **cannot be double-booked**: confirming,
  booking-with-a-worker, or rescheduling checks for an overlapping appointment
  the worker still owns (back-to-back is fine; touching endpoints don't overlap).
  Status follows a small enforced machine.
- **References** — capture a referee (name, relationship, contact) for a worker,
  then record what came back (received/declined, a 1–5 rating, notes).

```
requested ──confirm(worker)──▶ confirmed ──complete──▶ completed
     └────────────────────────────┴──────cancel──────▶ cancelled
                                   └──────no-show─────▶ no_show
```

## Run it

```bash
npm start            # node src/index.ts   (PORT, default 4100)
npm test             # node --test
npm run typecheck    # tsc --noEmit
```

`BOOKING_DB=/path/to/data.db` persists to SQLite (built-in `node:sqlite`); unset
uses an in-memory store. Behind the gateway, every request is scoped to the
caller's company (see `src/api/tenancy.ts`).

## HTTP surface

| Method & path | Purpose |
|---|---|
| `GET /health`, `GET /meta` | Liveness; statuses. |
| `POST /companies` | Create a company. |
| `POST /services` · `GET /services?companyId=` | Menu of services. |
| `POST /workers` · `GET /workers?companyId=` · `GET /workers/:id` | Therapists (license masked). |
| `POST /appointments` | Book (`companyId, serviceId, clientName, start`, optional `workerId`, `clientPhone`, `address`). |
| `GET /appointments?companyId=&workerId=&status=&from=&to=` | **The live schedule** — time-ordered, filter by worker/status/window. |
| `GET /appointments/:id` | One appointment. |
| `POST /appointments/:id/confirm` | Assign a worker & confirm (checks for clashes). |
| `POST /appointments/:id/complete` · `/cancel` · `/no-show` · `/reschedule` | Move it through its lifecycle. |
| `POST /workers/:id/references` · `GET /workers/:id/references` | Add / list a worker's references. |
| `GET /references/:id` · `POST /references/:id/record` | Read / record a reference response. |

## A note on sensitive data

Driver's-license numbers and LinkedIn are collected for vetting, but this is
demonstration scaffolding: it masks license numbers in responses and keeps
everything scoped per tenant, but a production deployment handling identity
documents needs encryption at rest, access logging, retention limits, and (where
health or benefits data is involved) a proper compliance program — see the
platform's security notes. References are contacted out-of-band with the
worker's knowledge; this service records them, it does not run covert searches.
