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

**Seed the founder profile** (optional, idempotent) — creates Rob Brizzi's account with
photo and a welcome post so a fresh database isn't empty:

```bash
node social/seed.mjs        # log in: rob@thecardinal.com / cardinal1
```

## Roadmap

| Phase | Status | What |
|-------|--------|------|
| **1 — Feed** | ✅ done | Accounts, profiles (name, bio, photo), **posts (text + photo), news feed, likes, comments** |
| **2 — Friends** | ✅ done | **People search, friend requests/accept/decline, feed scoped to your circle** |
| **3 — Notifications + Reach out** | ✅ done | **Real-time notification bell (likes, comments, friend events) via server-sent events, plus the "care signal / reach out" feature** |
| **4 — Messaging** | ✅ done | **Direct messages between friends, real-time delivery, unread badge, conversation list** |
| 5 — Groups | next | Create/join groups, group feeds |
| 6 — Photos & profiles | | Albums, richer profile pages |

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
