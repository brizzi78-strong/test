# Go live: the Blue Ridge Press verify portal

This takes the portal from this repo to a real HTTPS URL your clients use —
the operator console, the candidate consent page, the per-source verifier
pages, the public report-verification page (`/verify`, the QR target), and
branded PDF reports — then walks the rest of the way to your first real check.

Everything below assumes the **one-click blueprints** in this folder. There is
nothing to type during deploy: the admin password and the certificate secret
are auto-generated, and the app discovers its own public URL.

## 1 · Deploy (5 minutes)

1. At **render.com**: **New + → Blueprint** → connect `brizzi78-strong/test`.
2. Pick a blueprint:
   - **`deploy/render-verify-free.yaml`** — $0/mo. Perfect for demoing this
     week. Spins down when idle (~30–60s wake) and the database is **wiped on
     restart** — do not run paying clients here.
   - **`deploy/render-verify.yaml`** — ~$7/mo with a persistent 1 GB disk.
     Use this the day you charge anyone: consent records are your audit trail
     and must survive restarts.
3. **Apply.** Render builds and serves `https://cardinal-verify-….onrender.com`.
4. Log in: user **admin**, password: the service's **Environment** tab →
   `VERIFY_PASSWORD` (auto-generated; change it there if you like).

Verify it worked: open `https://<your-url>/health` → `{"status":"ok"}`, then
create a test request in the console and confirm the consent link opens.

> Both blueprints currently deploy `branch: claude/background-check-services-rss0ky`.
> After PR #68 merges, edit that line to `branch: main` (one-word change).

## 2 · Your domain (10 minutes, do before marketing)

1. Render service → **Settings → Custom Domains** → add
   `verify.blueridgepressllc.com`.
2. At your DNS host, create the **CNAME** exactly as Render displays it
   (`verify` → `cardinal-verify-….onrender.com`). HTTPS is automatic once it
   resolves.
3. **Environment** tab → add `VERIFY_BASE_URL=https://verify.blueridgepressllc.com`.
   From then on, consent emails and the QR on every PDF report carry your
   domain instead of onrender.com.
4. Add a button on blueridgepressllc.com ("Client portal" / "Verify a report")
   pointing at the domain — `/verify` is the public report-check page.

## 3 · Real email (5 minutes)

Until this step, the console shows every consent/verifier link for you to
copy-paste — fully workable, just manual.

### Option A (recommended): your existing Professional Email mailbox

You already pay for Professional Email (Titan) on the WordPress.com domains,
and the app speaks SMTP natively — so there is nothing new to sign up for.

In the Render **Environment** tab, add:

| Key | Value |
|---|---|
| `SMTP_HOST` | `smtp.titan.email` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | your full mailbox address |
| `SMTP_PASSWORD` | that mailbox's password |
| `VERIFY_MAIL_FROM` | the same address |

Port 465 uses implicit TLS (the app sets `secure` automatically from the
port; `587` with STARTTLS also works). Redeploy and candidates/sources get
their links directly.

**Prerequisite:** the domain must actually have Titan MX records — confirm
mail to that address works from your phone first. A paid subscription alone
is not enough; the mailbox has to exist.

**Sending limits:** Titan caps daily volume (a few hundred messages), which
is ample at this stage but not for bulk marketing. If you outgrow it, switch
to Option B without touching any code.

### Option B: SendGrid

1. Create a free **SendGrid** account (100 emails/day).
2. Verify a sender: **Settings → Sender Authentication** — ideally the whole
   domain; quickest is single-sender verification.
3. Create an API key (Mail Send permission) and set in Render:
   - `SENDGRID_API_KEY` = the key
   - `VERIFY_MAIL_FROM` = your from address

If both SendGrid and SMTP are configured, SendGrid wins.

## 4 · Dry run end-to-end (10 minutes)

Run one full check on yourself before any client does:

1. Console → new request: you as candidate, one real reference who's expecting
   it (or your own second email address).
2. Open the consent email → e-sign.
3. Answer the verifier link.
4. Download the PDF report → **scan the QR with your phone** → confirm the
   public page says *Authentic report* on your domain.

If all four steps pass, the machinery is live.

## 5 · First paying client checklist

- [ ] Portal on the **starter** (persistent-disk) blueprint, custom domain, email sending
- [ ] Attorney has reviewed the Terms, disclosure, and authorization (one flat-fee session)
- [ ] $39 payment link tested end-to-end (QuickBooks)
- [ ] Google Business Profile submitted
- [ ] You've done the §4 dry run this week

## Costs

| Item | Monthly |
|---|---|
| Render starter (portal + disk) | ~$7 |
| SendGrid free tier | $0 |
| Domain (already owned) | — |
| **Total infrastructure** | **~$7** |

## If something breaks

- **502 / slow first load** on free tier: it's waking from idle; wait a minute.
- **Links point at onrender.com** after adding your domain: set
  `VERIFY_BASE_URL` (step 2.3) and redeploy.
- **Emails not arriving**: check SendGrid → Activity; usually the sender
  address isn't verified yet (step 3.2).
- **Data disappeared**: you're on the free blueprint — it's ephemeral by
  design. Move to `render-verify.yaml`.
- **Never** rotate `VERIFY_CERT_SECRET` once real reports exist: tracking
  numbers, verification codes, and integrity seals all derive from it, and
  rotating it invalidates every QR and code already printed.
