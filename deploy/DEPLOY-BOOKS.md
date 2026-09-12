# Deploying Cardinal Books (live, for Blue Ridge Press LLC)

This gets **Cardinal Books** running on the real internet with HTTPS, a password,
and data that persists — the actual books for Blue Ridge Press LLC.

> Cardinal Books can't run on WordPress.com — it's a Node app and needs a host
> that runs it. WordPress stays your public marketing site; Books is a separate,
> private admin tool you log into.

Three ways to do it. **Options A and B need no server and are the recommended path.**

---

## Option A — Render (no server to manage) ✅ recommended

Render deploys straight from this GitHub repo using the `render.yaml` blueprint
in the repo root. ~$7/month (a persistent disk requires a paid instance).

1. Go to **https://render.com** and sign up (you can log in with GitHub).
2. **New +  ->  Blueprint**, connect this repository, and click **Apply**.
   Render reads `render.yaml` and sets up one web service with a 1 GB data disk.
3. When prompted, set **BOOKS_PASSWORD** to a strong password. (Username is
   `admin` by default — change `BOOKS_USER` in the blueprint if you want.)
4. Render builds it and gives you a URL like
   **https://cardinal-books-xxxx.onrender.com** — HTTPS is automatic.
5. Open it, log in, and you're looking at Blue Ridge Press LLC's live books.

**Custom domain (optional):** in the service's **Settings -> Custom Domains**,
add `books.blueridgepressllc.com`, then add the CNAME record Render shows you at
your DNS. Now it's on your own domain.

That's it. Data persists on the disk across restarts and redeploys; pushing new
commits auto-deploys.

*(Railway and Fly.io work the same way — a Docker web service running
`node deploy/allinone.ts` with a volume mounted at `/data` and
`ACCOUNTING_DB=/data/accounting.db`.)*

---

## Option B — Koyeb (no server to manage)

Koyeb builds straight from this repo's `deploy/Dockerfile` and gives you an
`https://<app>-<org>.koyeb.app` URL with HTTPS. Free eco instances are available;
persistent data needs a paid instance with a Volume attached.

1. Go to **https://app.koyeb.com** and sign up (GitHub login works).
2. Click the button below (edit `BOOKS_PASSWORD` in the URL first, or set it
   after the form loads):

   [![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&name=cardinal-books&repository=brizzi78-strong%2Ftest&branch=main&builder=dockerfile&dockerfile=deploy%2FDockerfile&command=node&args=deploy%2Fallinone.ts&ports=8000%3Bhttp%3B%2F&env%5BPORT%5D=8000&env%5BBUSINESS_NAME%5D=Blue+Ridge+Press+LLC&env%5BACCOUNTING_DB%5D=%2Fdata%2Faccounting.db&env%5BBOOKS_USER%5D=admin&env%5BBOOKS_PASSWORD%5D=CHANGE_ME)

   This pre-fills: Git deployment from `brizzi78-strong/test` on `main`,
   building `deploy/Dockerfile` (build context is the repo root, matching the
   `COPY` paths inside it), running `node deploy/allinone.ts`, and exposing
   port `8000` — plus the env vars below. If a field doesn't carry over,
   copy it in by hand on the review screen; nothing here is required to be
   set through the link.
3. Before clicking **Deploy**, set **BOOKS_PASSWORD** to a strong password
   (`BOOKS_USER` defaults to `admin`).
4. **Attach a Volume** for durable storage (skip this and Cardinal Books
   still runs, but the ledger resets on every redeploy): in the service's
   **Volumes** settings, add a Volume mounted at `/data`. This requires an
   instance type that supports Volumes (not the free eco tier) — see
   [Koyeb Volumes](https://www.koyeb.com/docs/reference/volumes).
5. Deploy. Koyeb gives you a URL like
   **https://cardinal-books-yourorg.koyeb.app** — open it, log in, and push
   to `main` to auto-deploy new commits.

**Custom domain (optional):** in the service's **Domains** settings, add
`books.blueridgepressllc.com` and point the CNAME Koyeb shows you at your DNS.

---

## Option C — your own small server (VPS)

If you'd rather run your own box (~$5–6/month), full control:

1. **Create a VPS** (DigitalOcean, Hetzner, Linode, Vultr) running Ubuntu 24.04.
   You'll get an IP like `203.0.113.10`.
2. **Point a subdomain** at it: DNS **A record** `books` -> the IP.
3. **Install Docker:** `ssh root@THE_IP`, then `curl -fsSL https://get.docker.com | sh`.
4. **Get the code:** `git clone https://github.com/brizzi78-strong/test.git cardinal && cd cardinal`
   (until PR #59 merges, add `-b claude/background-check-services-rss0ky`).
5. **Set the domain + password:**
   ```bash
   # in deploy/Caddyfile: change books.example.com to books.blueridgepressllc.com
   # then create deploy/.env with your password:
   printf 'BOOKS_USER=admin\nBOOKS_PASSWORD=choose-a-strong-password\n' > deploy/.env
   ```
6. **Launch:**
   ```bash
   docker compose --env-file deploy/.env -f deploy/books-stack.yml up --build -d
   ```
   Caddy fetches an HTTPS certificate automatically. Open
   **https://books.blueridgepressllc.com** and log in.

---

## Link it from your website (optional)
Bookmark the URL, or add a **private** "Books" link in WordPress (admin menu or a
hidden page) — don't put it in your public navigation. It's password-gated, so
only you can get in.

## Running it
- **Data** lives on the disk / `accounting-data` volume and survives restarts and
  redeploys. Restarting reuses the same Blue Ridge Press LLC books (the app finds
  the existing company by name).
- **Update** (VPS): `git pull && docker compose --env-file deploy/.env -f deploy/books-stack.yml up --build -d`. On Render or Koyeb, pushing to the branch auto-deploys.
- **Back up** (VPS): `docker run --rm -v cardinal-books_accounting-data:/d -v $PWD:/b alpine tar czf /b/books-backup.tgz -C /d .`

## For actual tax filing
Cardinal Books is a clean, self-hosted ledger — great for tracking invoices,
payments, and expenses. It is **not** a substitute for a CPA or for filing
software; keep using real QuickBooks/Xero for taxes. When you outgrow SQLite
(concurrent users, formal backups), swap in managed Postgres behind the
accounting module's existing `Store` interface.
