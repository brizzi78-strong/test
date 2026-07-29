# Cardinal — the functional app

A real, working, multi-user dating app for Cardinal. **No third-party vendors.**
The entire thing runs on Node.js built-in modules — no npm packages, nothing to
sign up for, nobody to pay.

- **Web server** — `node:http`
- **Database** — `node:sqlite` (a real SQLite database on disk)
- **Accounts & security** — `node:crypto` (scrypt-hashed passwords, random session tokens)

## What works today

- **Accounts** — sign up / sign in / sign out, with securely hashed passwords and cookie sessions.
- **Profiles** — name, age, gender, who you're seeking, city/campus, bio, and one prompt.
- **Verification gate** — after building a profile, a member must submit their legal name,
  date of birth, and consent to a background check. Until they're **verified**, they cannot
  see anyone or be seen. Only verified members appear in Discover. Status flows
  `unverified → in_review → verified | rejected`.
- **Discover** — browse other *verified* members with complete profiles (people you haven't acted on yet).
- **Matching** — like or pass. A **match** is created only when *both* people like each other.
- **Messaging** — matched people can message each other; messages persist and are private to that pair.

## Verification / background checks

The transition out of `in_review` is the single seam where a background-check
provider — the operator's **own background-check company** — plugs in. When a check
returns PASS/FAIL, that decision is applied via `app/admin.mjs`:

```bash
node app/admin.mjs list             # applicants and their status
node app/admin.mjs verify <email>   # check passed  -> verified
node app/admin.mjs reject <email>   # check failed  -> rejected
```

Nothing is auto-approved. In production the same call is made by a webhook or an
internal dashboard when the provider responds. No third-party service is baked in.

## Install on a phone (it's a PWA)

Cardinal is an installable app — no App Store, no Apple/Google fees, no build tools.
Once it's reachable at a URL, on a phone you **open it in the browser → Share →
"Add to Home Screen."** It then launches fullscreen from a home-screen icon (red
heart on navy), works like a native app, and loads instantly (the interface is
cached by a service worker; live data still comes from the server).

The one requirement is that the phone can reach the server over the network — see
"Making it reachable" below.

## Run it

```bash
node app/server.mjs
# then open http://localhost:3000
```

Environment variables (all optional):

- `PORT` — port to listen on (default `3000`)
- `CARDINAL_DB` — path to the SQLite database file (default `app/cardinal.db`)

The database file is created automatically on first run and is git-ignored.

## Honest notes on scope

This is the real foundation of the product. A few things are deliberately **not**
built yet, and two of them genuinely can't be "no-vendor":

- **Background checks / identity verification** — the *gate* is built (see above); running
  the actual check requires a data source. The plan is to use your own background-check
  company as that source, wired into the `in_review → verified/rejected` transition.
- **Payments (Cardinal+ for men)** — charging a card legally requires a payment
  processor. That's the one unavoidable outside service if/when you charge.
- **Photos, real-time chat, notifications, events, referrals** — straightforward
  next additions on top of this same self-hosted base.

Nothing here depends on a third party to function.

## Making it reachable (so the phone can open it)

The app is installable; to install it on a phone, the phone has to reach the server.
Least-"vendor" options, in order:

1. **Same Wi-Fi (try it today):** run `node app/server.mjs` on a computer, find that
   computer's local IP, and on the phone open `http://<computer-ip>:3000`. Works
   immediately on the same network — good for testing on your own phone. (Add-to-Home-Screen
   and the service worker want HTTPS on most phones, so use option 2/3 for the real thing.)
2. **Your own server (recommended, still no SaaS):** run it on a small VPS or a machine
   you control, put a domain in front, and terminate HTTPS with a free Let's Encrypt
   certificate. You own the box and the code end to end — nobody to sign up with.
3. **A platform host** (Render/Railway/Fly/etc.) is the fastest path but *is* a third-party
   vendor — listed only for completeness.

