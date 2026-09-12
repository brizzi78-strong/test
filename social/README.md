# The Cardinal — a social network

A Facebook-style social site, built in phases, but built around a different idea:
**real, verified people who actually show up for each other** — not an engagement
machine. **Zero third-party vendors** — only Node.js built-ins (`node:http`,
`node:sqlite`, `node:crypto`).

## The signature feature — "Reach out"

The differentiator no other network has: a member can quietly raise a **care signal**
("I could use some support") with an optional note. Their **friends only** see it at the
top of their feed and can **Reach out 💛** in one tap, which sends that person a
notification that someone is thinking of them. It turns a feed into a support network —
the digital version of showing up for the people you care about.

## Run it

```bash
node social/server.mjs      # then open http://localhost:4000
```

Env: `PORT` (default 4000), `NEST_DB` (default `social/nest.db`, git-ignored).

## Install it on a phone (PWA)

The site is a **progressive web app** — a web-manifest, a service worker that caches
the app shell (never the API or the live stream), and app icons. Open it in a mobile
browser and choose **Add to Home Screen**; it launches full-screen like a native app
and opens instantly. Nothing to install from a store.

## Put it online (your own server, one command)

No SaaS, no vendor lock-in — just Node.js and Caddy for automatic HTTPS. On a fresh
Ubuntu/Debian server whose domain's DNS already points at it:

```bash
sudo bash social/deploy/setup.sh yourdomain.com
```

That installs Node 22, runs the app as a locked-down `cardinal-social` systemd service
on port 4000, seeds the founder profile, and installs Caddy to fetch a free Let's
Encrypt certificate. When it finishes, `https://yourdomain.com` is live and installable.
It runs on port 4000, so it can share a server with the Cardinal dating app (port 3000).

- Logs: `journalctl -u cardinal-social -f`
- Restart: `systemctl restart cardinal-social`

**Seed the founder profile** (optional, idempotent) — creates Rob Brizzi's account with
photo and a welcome post so a fresh database isn't empty:

```bash
node social/seed.mjs        # log in: rob@thecardinal.com / cardinal1
```

**Or seed a whole living demo community** (optional, idempotent) — six fictional
people, friendships, posts with likes and comments, a group with its own thread, and
one care signal raised, so you can see every feature working at once:

```bash
node social/demo.mjs        # every demo account's password is: cardinal1
```

Log in as `rob@thecardinal.com` to see the full feed and the "someone could use
support" strip; the demo people are sample data, not real members.

## Roadmap

| Phase | Status | What |
|-------|--------|------|
| **1 — Feed** | ✅ done | Accounts, profiles (name, bio, photo), **posts (text + photo), news feed, likes, comments** |
| **2 — Friends** | ✅ done | **People search, friend requests/accept/decline, feed scoped to your circle** |
| **3 — Notifications + Reach out** | ✅ done | **Real-time notification bell (likes, comments, friend events) via server-sent events, plus the "care signal / reach out" feature** |
| **4 — Messaging** | ✅ done | **Direct messages between friends, real-time delivery, unread badge, conversation list** |
| **5 — Groups** | ✅ done | **Create groups, join/leave, a members list, and a members-only group feed you post into** |
| 6 — Photos & profiles | next | Albums, richer profile pages |

## Phase 1 — what works today

- **Accounts** — sign up / log in / log out; scrypt-hashed passwords, cookie sessions.
- **Profiles** — name, bio, and a profile photo (stored in the app's own database).
- **Composer** — write a post, optionally attach a photo.
- **News feed** — everyone's posts, newest first, with author, time, likes, and comment counts.
- **Likes** — one-tap like/unlike, live count.
- **Comments** — open any post, read comments, add your own.

Photos are stored in the database and served by the app itself — no image host or CDN.

## Design

Sharp, modern UI: indigo brand, slate neutrals, soft shadows, rounded cards, a
sticky glass top bar, gradient avatars with initials, and an animated like button.
Light and dark themes both supported.
