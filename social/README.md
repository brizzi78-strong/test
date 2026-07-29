# Nest — a social network

A Facebook-style social site, built in phases. **Zero third-party vendors** — only
Node.js built-ins (`node:http`, `node:sqlite`, `node:crypto`). "Nest" is a working
name; rename freely.

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
| 3 — Notifications | next | Real-time alerts (likes, comments, requests) via server-sent events |
| 4 — Messaging | | Direct messages |
| 5 — Groups | | Create/join groups, group feeds |
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
