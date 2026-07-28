# Deploying Cardinal Books (live, for Blue Ridge Press LLC)

This gets **Cardinal Books** running on the public internet at your own domain
(e.g. `books.blueridgepressllc.com`), password-protected, with real saved data.
Budget ~20 minutes and about **$5–6/month** for a small server.

> Cardinal Books can't run on WordPress.com — it's a Node app and needs a server
> that runs Docker. WordPress stays your public marketing site; Books is a
> separate, private admin tool you link to.

## What you need

- A small Linux server (a "VPS"). Any of these work: **DigitalOcean**, **Hetzner**,
  **Linode/Akamai**, **Vultr**. Pick the cheapest shared-CPU box (1 GB RAM is plenty).
- A **domain or subdomain** you control. You already own `blueridgepressllc.com`,
  so a subdomain like `books.blueridgepressllc.com` is ideal.

## Steps

### 1. Create the server
Create a VPS running **Ubuntu 24.04**. You'll get an IP address (e.g. `203.0.113.10`).

### 2. Point a subdomain at it
In your domain's DNS, add an **A record**: `books` → your server's IP.
(If your domain's DNS is at WordPress.com, add it there; if elsewhere, add it there.)

### 3. Install Docker on the server
SSH in (`ssh root@203.0.113.10`) and run:
```bash
curl -fsSL https://get.docker.com | sh
```

### 4. Get the code onto the server
```bash
git clone https://github.com/brizzi78-strong/test.git cardinal
cd cardinal
```
(Once PR #59 is merged this is on the default branch; until then add
`-b claude/background-check-services-rss0ky` to the clone.)

### 5. Set your domain + password
```bash
# generate a password hash (replace 'choose-a-strong-password')
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'choose-a-strong-password'
```
Copy the `$2a$...` line it prints. Then edit `deploy/Caddyfile`:
- change `books.example.com` → `books.blueridgepressllc.com`
- change `admin` → the username you want
- paste your hash where the placeholder hash is

### 6. Launch it
```bash
docker compose -f deploy/books-stack.yml up --build -d
```
Caddy automatically fetches an HTTPS certificate. Give it a minute, then open
**https://books.blueridgepressllc.com** and log in. It opens straight to Blue
Ridge Press LLC's books, ready to add customers and invoices.

### 7. Link it from your website (optional)
Add a private "Books" link in your WordPress admin menu (or bookmark it). Because
it's password-gated, only you can get in — don't put it in the public nav.

## Running it
- **Data** lives in the `accounting-data` Docker volume and survives restarts and
  redeploys. Restarting reuses the same Blue Ridge Press LLC books (the app finds
  the existing company by name).
- **Update** after new commits: `git pull && docker compose -f deploy/books-stack.yml up --build -d`
- **Back up** your books: `docker run --rm -v cardinal-books_accounting-data:/d -v $PWD:/b alpine tar czf /b/books-backup.tgz -C /d .`
- **Stop**: `docker compose -f deploy/books-stack.yml down` (add `-v` to also delete data — careful).

## Notes toward "serious" bookkeeping
This runs the real app durably, but it's still simple by design. Before relying
on it for taxes you'd want a managed **Postgres** database (swap it in behind the
accounting module's `Store` interface) for backups and concurrent access, plus
proper user accounts. For actual tax filing, keep using real QuickBooks/Xero —
Cardinal Books is a clean, self-hosted ledger, not a CPA.
