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

## Sending the links

Today the console gives you each consent/verifier link to copy and send. Wiring
an email sender (SMTP/SendGrid) so it auto-emails is a small, localized add
behind a `Notifier` interface — the natural next step.

## Scope, honestly

This covers what **consent + the source's own attestation** make lawful:
references, employment, education. For **criminal, credit, identity-document, or
driving** checks you must go through a credentialed CRA — see the `hirecheck`
module's provider interface, which is built to plug one in.
