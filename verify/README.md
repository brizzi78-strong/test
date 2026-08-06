# Cardinal Verify — consent-based verification

The legitimate, no-vendor part of background screening: with the candidate's
**written consent**, confirm their **references**, past **employment**, and
**education** by asking the source directly. No Consumer Reporting Agency, no
purchased data — and deliberately **no criminal or credit** lookups (those are
consumer reports that require a credentialed CRA).

One self-contained app with three surfaces:

| Page | Who | What |
|---|---|---|
| `GET /` | you (the employer) | Console: create a request, watch results, copy links, download the PDF report. Password-gated in production. |
| `GET /c/:token` | the candidate | Reads the disclosure, sees exactly who/what will be contacted, and e-signs consent. |
| `GET /v/:token` | a reference / past employer / school | A short form to confirm (or decline) — no login. |
| `GET /verify` | anyone holding a report | Public authenticity check: enter (or QR-scan into) the tracking number + code, get the certificate of authenticity. |

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

## Report authenticity

Every request carries a derived, tamper-evident identity — nothing extra is
stored; all three are deterministic functions of the request and
`VERIFY_CERT_SECRET`:

- a **tracking number** (`BRP-2026-XXXXXX`) printed on the report;
- an unguessable **verification code** (`XXXX-XXXX`);
- an **HMAC-SHA256 integrity seal** over the report's exact findings — editing
  any finding breaks it.

The branded **PDF report** (`GET /api/requests/:id/report.pdf`) prints all
three plus a scannable **QR** (in-house ISO 18004 encoder, `src/service/qr.ts`)
that lands on `/verify`, where anyone can confirm the report is genuine. The
public certificate is privacy-preserving — issuer, requester, candidate
*initials*, scope, source counts, result — never names, sources, or answers. A
wrong code and a missing report both return 404, so codes can't be probed.

**Never rotate `VERIFY_CERT_SECRET` once real reports exist** — every printed
tracking number, code, and seal derives from it.

## HTTP API

Admin (gated): `POST /api/companies`, `POST /api/candidates`,
`POST /api/requests`, `GET /api/requests[/:id]`, `GET /api/candidates`,
`GET /api/requests/:id/report.pdf`, `GET /api/certificate/:id/qr`.
Public (token): `GET|POST /api/consent/:token`, `GET|POST /api/verify/:token`,
`GET /api/certificate/:ref?code=…`.

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
| `VERIFY_BASE_URL` | Absolute URL used in emailed links and report QR codes, e.g. `https://verify.blueridgepressllc.com`. Falls back to `RENDER_EXTERNAL_URL` (set automatically on Render), then `http://localhost:$PORT`. |
| `VERIFY_CERT_SECRET` | Keys the report tracking numbers, verification codes, and integrity seals. Set once, never rotate after real reports exist. |
| `SENDGRID_API_KEY` + `VERIFY_MAIL_FROM` | Send real email via SendGrid (HTTP API). `VERIFY_MAIL_FROM_NAME` optionally sets the display name. |
| `SMTP_HOST` + `VERIFY_MAIL_FROM` | Send real email via SMTP instead — works with a domain mailbox, Gmail, Fastmail, iCloud, etc. Also honors `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` (`true` for implicit TLS on 465; otherwise STARTTLS is used when offered). |

With no mail config set, links are logged to the console instead of sent. When
both a SendGrid key and SMTP host are present, SendGrid is used.

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
