# Live Schedule — day-view scheduling UI

The usable front end for the [Booking](../booking) service: a single-page,
day-at-a-time schedule for a service business (e.g. massage). Book an
appointment, assign a therapist, and work each one through its day —
confirm, complete, no-show, or cancel — grouped by therapist with clear status.

## Architecture — backend-for-frontend

The browser never talks to Booking directly. This is a **BFF**: one Node process
that serves the self-contained schedule app **and** transparently proxies
`/api/*` to the Booking service server-side, so any gateway API key stays off the
client and there's no CORS.

```
browser ── /  /api/* ──▶ schedule (BFF) ── HTTP ──▶ booking ──▶ SQLite
             (same origin)              (key server-side)
```

## Run it

```bash
npm start            # node src/index.ts   (PORT, default 4200)
npm test             # node --test  (boots a real Booking service in-process)
npm run typecheck    # tsc --noEmit
```

Point it at a running Booking service with `BOOKING_URL` (default
`http://booking:4100`); set `GATEWAY_API_KEY` to have the BFF attach a bearer
token upstream. Open http://localhost:4200.

- **Set up** a business (name), add **services** (with durations) and
  **therapists** under "Manage".
- **Book** — pick a service, client, date/time, and optionally a therapist
  (which assigns and confirms in one step).
- **Schedule** — page through days; each appointment shows its time, client,
  service, and status, with the actions valid for that state. A `?companyId=<id>`
  query deep-links straight to a business's schedule.

## Layout

- `src/ui/page.ts` — the whole app as one self-contained HTML string (Cardinal
  palette, light/dark, no external assets).
- `src/api/server.ts` — the BFF: serves the page and proxies `/api/*` to Booking.
- `src/index.ts` — entry point.
