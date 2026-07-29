# Cardinal Verify — consent-based verification

The legitimate, no-vendor part of background screening: with the candidate's
**written consent**, confirm their **references**, past **employment**, and
**education** by asking the source directly. No Consumer Reporting Agency, no
purchased data — and deliberately **no criminal or credit** lookups (those are
consumer reports that require a credentialed CRA).

One self-contained app with three surfaces:

| Page | Who | What |
|---|---|---|
| `GET /` | you (the employer) | Console: create a request, watch results, copy links. Password-gated in production. |
| `GET /c/:token` | the candidate | Reads the disclosure, sees exactly who/what will be contacted, and e-signs consent. |
| `GET /v/:token` | a reference / past employer / school | A short form to confirm (or decline) — no login. |

## The flow

```
1. You add the candidate + who to verify (name, email).      → request: awaiting_consent
2. Candidate opens /c/:token, reads the disclosure, e-signs.  → in_progress   ← the gate
3. Each source opens /v/:token and confirms or declines.      → items complete
4. All items answered.                                        → request: completed
```

**Consent is enforced in code:** the verifier links return *409 not active yet*
until the candidate has signed. Every step is on an append-only history, and the
candidate's signature is recorded with a timestamp, IP, and disclosure version.

## HTTP API

Admin (gated): `POST /api/companies`, `POST /api/candidates`,
`POST /api/requests`, `GET /api/requests[/:id]`, `GET /api/candidates`.
Public (token): `GET|POST /api/consent/:token`, `GET|POST /api/verify/:token`.

## Run it

```bash
npm start                               # PORT default 4600 (in-memory store)
VERIFY_DB=/path/data.db npm start       # durable SQLite
VERIFY_USER=admin VERIFY_PASSWORD=… npm start   # gate the console
npm test                                # service + HTTP e2e
npm run typecheck
```

| Env | Purpose |
|---|---|
| `PORT` | Listen port (default 4600). |
| `VERIFY_DB` | SQLite file path; unset uses the in-memory store. |
| `VERIFY_USER` / `VERIFY_PASSWORD` | Optional password gate on the console. The consent and verifier links are never gated. |
| `VERIFY_BASE_URL` | Absolute URL used in the links inside emails, e.g. `https://verify.blueridgepressllc.com`. Defaults to `http://localhost:$PORT`. |
| `SENDGRID_API_KEY` + `VERIFY_MAIL_FROM` | Set both to send real email via SendGrid. `VERIFY_MAIL_FROM_NAME` optionally sets the display name. Unset → links are logged to the console instead. |

## Sending the links — automatic

The links are emailed for you, on the same consent-first schedule the API
enforces:

- **You create a request** → the **candidate** is emailed their consent link.
  No source is contacted yet.
- **The candidate e-signs** → each **source** is emailed their private
  verifier link — never before.

Delivery goes through a small `Notifier` interface (`src/notify/`). With no
mail config it logs each message (so links stay copy-pasteable from the
console); set `SENDGRID_API_KEY` + `VERIFY_MAIL_FROM` to send real email via
SendGrid's HTTP API — no SDK, still zero-dependency. Any other transport
(Postmark, Mailgun, raw SMTP) is a drop-in implementation of the same
interface. Every send is recorded on the request's history as `*.emailed` or
`*.email_failed`, and a failed send never blocks consent — the link can always
be re-sent or copied from the console.

## Scope, honestly

This covers what **consent + the source's own attestation** make lawful:
references, employment, education. For **criminal, credit, identity-document, or
driving** checks you must go through a credentialed CRA — see the `hirecheck`
module's provider interface, which is built to plug one in.
