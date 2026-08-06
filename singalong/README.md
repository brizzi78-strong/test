# Sing Along — guided, personalized music for memory care

A facility-run tool for the core mechanic behind SingFit and Music & Memory:
match songs to a resident's own musical past, prompt the lyrics during a
guided sing-along, and log how it landed — so the next playlist is better
than the last one.

This exists because of the assessment in
[`../DEMENTIA_MUSIC_SOFTWARE_ASSESSMENT.md`](../DEMENTIA_MUSIC_SOFTWARE_ASSESSMENT.md):
the clinical case for personalized music is strong, but the category is
crowded and price-anchored by a nonprofit (Music & Memory) and licensing-heavy
(SingFit's catalog). This app takes the two costliest parts off the table
instead of competing on them.

## What it does — and deliberately doesn't

- **No licensed audio catalog.** This app never hosts or streams a
  recording. A song's `audioUrl` points at wherever the facility already has
  the right to play it from — their own streaming account, a ripped CD on a
  shared drive, a physical iPod (the Music & Memory model). That's what keeps
  this out of music licensing.
- **No clinical data.** A resident's profile is a musical one — preferred
  eras, genres, favorite artists, and freeform biographical notes. No
  diagnoses, medications, or care-plan fields. See
  [`../SENIOR_CARE_PLACEMENT_STRATEGY.md`](../SENIOR_CARE_PLACEMENT_STRATEGY.md)
  for why that line matters early.
- **Personalized suggestions.** `suggestSongs` ranks the facility's own song
  library against a resident's known preferences — individualized selections
  are what the evidence says actually reduces agitation, not generic
  "relaxing music."
- **A guided prompter.** Step through a playlist one song at a time with the
  title, artist, lyrics, and a link to the facility's own audio source, sized
  for a shared screen or tablet.
- **Learn what works.** Staff log each song's engagement
  (`sang_along` / `listened_attentively` / `moved_or_tapped` /
  `no_visible_response` / `agitated`) plus an optional mood before/after.
  `topSongsForResident` turns that history into a ranked "what works for this
  resident" list from completed sessions only.

## Run it

```bash
npm start                                    # PORT default 4900 (in-memory store)
SINGALONG_DB=/path/data.db npm start         # durable SQLite
SINGALONG_USER=admin SINGALONG_PASSWORD=… npm start   # gate the console
npm test
npm run typecheck
```

Open `http://localhost:4900`. Set up a facility, add residents (musical
profile only) and a song library, build a playlist, then run a session from
the "Run a session" tab.

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

This is demonstration scaffolding, not a compliance program. Resident names
and preferences are personal information even though they aren't clinical —
gate the console (`SINGALONG_USER`/`SINGALONG_PASSWORD`) in any real
deployment, and don't let staff notes drift into clinical territory (no
diagnoses, medications, or incident reports). If this ever needs to record
outcomes for a care plan rather than "which songs to try next," that's a
different, HIPAA-scoped product — see the placement strategy doc for why that
line is worth holding.
