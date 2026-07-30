# Timeclock — time & attendance

Record hours worked and total them for a pay period. Deliberately small: the
value is the **summary**, which turns a list of dated entries into "hours in
[from, to]" — exactly what payroll needs to pay an hourly worker for a period.
`runpay` (Cardinal Payroll) reads this so logged hours flow straight into a Run
Payroll batch.

Same zero-dependency TypeScript style as the rest of the platform (`node:sqlite`,
`node:test`, no build step). Hours are stored as integer **minutes** to avoid
floating-point drift; the API accepts and returns decimal hours.

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/entries` | Record hours: `{ companyId, employeeId, date, hours, note? }`. |
| `GET` | `/entries?employeeId&companyId&from&to` | List entries (sorted by date). |
| `DELETE` | `/entries/:id` | Remove an entry. |
| `GET` | `/summary?employeeId&from&to` | Total hours for one employee over an inclusive date range. |
| `GET` | `/health`, `/meta` | Liveness / descriptor. |

## Run it

```bash
npm start                             # PORT default 4800 (in-memory store)
TIMECLOCK_DB=/path/data.db npm start  # durable SQLite
npm test
npm run typecheck
```

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 4800). |
| `TIMECLOCK_DB` | SQLite file path; unset uses the in-memory store. |
