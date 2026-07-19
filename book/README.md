# Client Booking Site — public self-book

The page your customers use to book themselves online. It shows one business's
service menu and lets a client request an appointment; the business confirms the
time from the [Schedule](../schedule) UI.

## Deliberately narrow (safe to expose publicly)

Unlike the internal [Schedule](../schedule) UI (which proxies the whole Booking
API), this backend-for-frontend exposes only two public actions for **one
configured company**:

| Method & path | Purpose |
|---|---|
| `GET /` | The self-contained booking page. |
| `GET /health` | Liveness. |
| `GET /api/services` | The business's menu (name, duration, price only). |
| `POST /api/book` | Create a **requested** appointment. |

There is no way from here to read the schedule, see other clients or workers, or
confirm/cancel anything — those are `404`. The company id is fixed by
configuration (`BUSINESS_COMPANY_ID`), never chosen by the caller, and only
public menu fields and a minimal confirmation are returned.

```
customer ── /  /api/* ──▶ book (narrow BFF) ── HTTP ──▶ booking ──▶ SQLite
             (same origin)      list services / request only
```

## Run it

```bash
BUSINESS_COMPANY_ID=co_… BUSINESS_NAME="Serenity Massage" npm start   # PORT default 4300
npm test            # boots a real Booking service in-process and drives the flow
npm run typecheck
```

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 4300). |
| `BOOKING_URL` | Booking base URL (default `http://booking:4100`). |
| `BUSINESS_COMPANY_ID` | The company clients book into — required to accept bookings. |
| `BUSINESS_NAME` | Shown on the page. |
| `GATEWAY_API_KEY` | Optional bearer key sent upstream, kept off the browser. |

A booking lands as a **requested** appointment on the schedule, where staff
assign a provider and confirm — so a self-booked slot never silently commits a
provider's time.
