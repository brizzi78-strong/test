# Sing Along — guided, personalized music for memory care

A facility-run tool for the core mechanic behind SingFit and Music & Memory:
match songs to a resident's own musical past, prompt the lyrics during a
guided sing-along, and log how it landed — so the next playlist is better
than the last one.

This exists because of the assessment in
[`../DEMENTIA_MUSIC_SOFTWARE_ASSESSMENT.md`](../DEMENTIA_MUSIC_SOFTWARE_ASSESSMENT.md):
the category is crowded, price-anchored near $1,000 by a nonprofit-run
program (Music & Memory, part of IMNF since 2025), and licensing-heavy
(SingFit's catalog). This app takes the two costliest parts off the table
instead of competing on them.

## What it does — and deliberately doesn't

- **No licensed audio catalog.** This app never hosts or streams a
  recording. A song's `audioUrl` points at wherever the facility already has
  the right to play it from — their own streaming account, a ripped CD on a
  shared drive, a physical iPod (the Music & Memory model). The app itself
  therefore carries no music-licensing exposure; the *audio source's own
  terms* are the facility's responsibility (a personal streaming account's
  terms usually don't cover group playback in an activity room — check).
- **No clinical data.** A resident's profile is a musical one — preferred
  eras, genres, favorite artists, and freeform biographical notes. No
  diagnoses, medications, or care-plan fields. See
  [`../SENIOR_CARE_PLACEMENT_STRATEGY.md`](../SENIOR_CARE_PLACEMENT_STRATEGY.md)
  for why that line matters early.
- **Personalized suggestions.** `suggestSongs` ranks the facility's own song
  library against a resident's known preferences. Personalization is about
  *reaching* the person — small studies favor someone's own preferred music
  over generic "relaxing" tracks, and in-session response predicts who
  benefits. (Do not oversell it: the best evidence says music-based sessions
  produce engagement and pleasure and likely help depressive symptoms, but
  likely do **not** reduce agitation — see PROGRAM.md's evidence section
  before quoting anything to a family or a surveyor.)
- **A guided prompter.** Step through a playlist one song at a time with the
  title, artist, lyrics, and a link to the facility's own audio source, sized
  for a shared screen or tablet.
- **Learn what works.** Staff log each song's response
  (`sang_along` / `listened_attentively` / `moved_or_tapped` /
  `moved_to_tears` / `no_visible_response` / `agitated`) plus an optional
  mood before/after. Tears score as the music *reaching* someone.
  `topSongsForResident` turns history into a ranked "what works for this
  resident" list from completed sessions only.

## The program

The app is the tooling; [`PROGRAM.md`](PROGRAM.md) is the ready-to-run
**Memory Care Music Program** built on it: twice-weekly sing-along circles on
a four-week themed cycle, personalized listening between them, and a weekly
by-song review of the logs. `npm run seed:program` loads its 22-song
public-domain kit (words included) into a facility's library.

[`demo/index.html`](demo/index.html) is a self-contained, client-side
walkthrough of the program with sample data — open it in any browser, or let
the repo's `../render.yaml` blueprint serve it as a free static site.

## Run it

**Prerequisites:** Node.js 22.18+ (`node --version`; install from
nodejs.org), then `npm install` once (only the dev tooling needs it — the
app itself runs dependency-free). A warning that *"SQLite is an experimental
feature"* will print on every run; it's harmless.

```bash
SINGALONG_DB=./data.db npm run seed:program     # once: new facility + 22-song kit (prints the fac_… ID — save it)
SINGALONG_DB=./data.db npm start                # serve the console on http://localhost:4900
npm test
npm run typecheck
```

`./data.db` is just a file the app creates — any writable path, but use the
**same path in every command**. The env vars combine; a real deployment is
one line:

```bash
PORT=4900 SINGALONG_DB=./data.db SINGALONG_USER=admin SINGALONG_PASSWORD=yourpassword npm start
```

Without `SINGALONG_DB` the store is in-memory (and the seeder becomes an
explicit dry run). From another device on the same network — the
activity-room tablet — browse to `http://<this computer's address>:4900`
(find it with `ipconfig` on Windows, `ip addr` on Mac/Linux).

Seeding, all idempotent (reruns skip what exists):

```bash
SINGALONG_DB=./data.db npm run seed:program -- --facility fac_…                  # kit into an existing facility
SINGALONG_DB=./data.db npm run seed:program -- --facility fac_… --resident res_… # the 4 program playlists for a real resident
SINGALONG_DB=./data.db npm run seed:program -- --facility fac_… --demo-resident  # an example resident + playlists
```

In the console: add residents (musical profile only) and any local songs,
then run a session from the "Run a session" tab.

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health`, `GET /api/meta` | Liveness; status. |
| `POST /api/facilities` | Create a facility. |
| `POST /api/residents` · `GET /api/residents?facilityId=` · `GET /api/residents/:id` | Musical profiles. |
| `GET /api/residents/:id/suggestions?limit=` | Library songs ranked for this resident. |
| `GET /api/residents/:id/insights?limit=` | Songs ranked by average logged engagement (completed sessions only). |
| `POST /api/songs` · `GET /api/songs?facilityId=` · `GET /api/songs/:id` | Song library (title, artist, era, tags, lyrics, `audioUrl`, `source`). |
| `POST /api/playlists` · `GET /api/playlists?facilityId=&residentId=` · `GET /api/playlists/:id` | Per-resident playlists. |
| `POST /api/playlists/:id/songs` | Add a song to a playlist. |
| `POST /api/sessions` | Start a session (`facilityId, residentId`, optional `playlistId`, `moodBefore`). |
| `GET /api/sessions?facilityId=&residentId=` · `GET /api/sessions/:id` | Session history. |
| `POST /api/sessions/:id/log` | Log one song's engagement while a session is `in_progress`. |
| `POST /api/sessions/:id/complete` · `/cancel` | End the session; `complete` accepts `moodAfter`. |

## A note on sensitive data

This is demonstration scaffolding, not a compliance program — and the data
deserves more respect than "non-clinical" suggests. The app stores, per
named resident, a time-stamped series of session responses (including
`agitated`) and mood impressions. Nothing in it is a diagnosis or an
assessment, and none of it substitutes for the chart — but a named
resident's observed states over time are resident health information by any
sensible reading. Treat them that way: gate the console
(`SINGALONG_USER`/`SINGALONG_PASSWORD`), run it inside the facility's own
network and privacy obligations (expect your compliance reviewer to ask, and
expect to need a BAA if anyone hosts it for you), and keep staff notes
biographical — no diagnoses, medications, or incident reports. If this ever
needs to record outcomes for a care plan rather than "which songs to try
next," that's a different, fully HIPAA-scoped product — see the placement
strategy doc for why that line is worth holding.
