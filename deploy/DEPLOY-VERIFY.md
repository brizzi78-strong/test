# Deploy the Cardinal Verify portal (background checks)

This gets your consent-first background-check portal live at a real HTTPS URL —
the employer console, the candidate's e-sign/consent page, and the per-source
verifier page — with a durable database, in about 10 minutes. No server to
manage.

## Prerequisites
1. **Merge PR #65** so `main` contains the `verify/` module. (Or, to deploy
   before merging, edit `deploy/render-verify.yaml` and change `branch: main`
   to `branch: claude/background-check-services-rss0ky`.)
2. A **Render account** (render.com) — the free signup is fine; a persistent
   disk needs the ~$7/mo Starter plan.

## Steps
1. At **render.com**: **New +  →  Blueprint**.
2. **Connect** this GitHub repo (`brizzi78-strong/test`).
3. When it asks which blueprint, pick **`deploy/render-verify.yaml`** → **Apply**.
4. Set **`VERIFY_PASSWORD`** when prompted (this gates the employer console;
   `VERIFY_USER` is `admin`). The candidate/verifier links stay public — they
   have no login.
5. Render builds the image, attaches the disk, and gives you a URL like
   **`https://cardinal-verify-xxxx.onrender.com`**.
6. Open that URL → log in with `admin` / your password → you're in the console.
7. **Point the links at the host:** edit the service's `VERIFY_BASE_URL` env var
   to that URL (or your custom domain) and redeploy, so consent/verifier links
   are correct.

## Make it verify.blueridgepressllc.com (optional)
- In the Render service: **Settings → Custom Domains → Add** `verify.blueridgepressllc.com`.
- Render shows a target host. Add a **CNAME** record for `verify` pointing at it
  (I can add that DNS record for you on WordPress.com — just ask).
- Update `VERIFY_BASE_URL` to `https://verify.blueridgepressllc.com` and redeploy.

## Turn on real email (optional)
Until you set this, the console shows each consent/verifier link to copy by hand.
To auto-send:
- **SendGrid:** set `SENDGRID_API_KEY` + `VERIFY_MAIL_FROM`.
- **SMTP:** set `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`) +
  `VERIFY_MAIL_FROM`.
See `verify/README.md` and `deploy/README.md` for deliverability notes
(SPF/DKIM/DMARC).

## What this deploys
This blueprint stands up **two** services in one Apply:
- **cardinal-verify** — the consent-based portal (works today, has the UI).
- **cardinal-hirecheck** — the automated screening API. It runs the deterministic
  **mock** until you set `HIRECHECK_PROVIDER=checkr` + `CHECKR_API_KEY`, then it
  returns real criminal / verification / MVR / **drug** results with no code
  change. It has no public UI — it's the backend the portal and site call.
