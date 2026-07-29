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
- **Discover** — browse other members with complete profiles (people you haven't acted on yet).
- **Matching** — like or pass. A **match** is created only when *both* people like each other.
- **Messaging** — matched people can message each other; messages persist and are private to that pair.

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

- **Background checks / identity verification** — running real checks requires a data
  source. The plan is to use your own background-check company as that source, wired
  in behind a verification step before an account can go live.
- **Payments (Cardinal+ for men)** — charging a card legally requires a payment
  processor. That's the one unavoidable outside service if/when you charge.
- **Photos, real-time chat, notifications, events, referrals** — straightforward
  next additions on top of this same self-hosted base.

Nothing here depends on a third party to function.
