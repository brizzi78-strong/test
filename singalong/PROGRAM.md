# The Memory Care Music Program

A ready-to-run music program for residents in memory care, built on the Sing
Along app in this directory. The app supplies the tooling (musical profiles,
playlists, a lyrics prompter, engagement logging); this document plus the
seeded song kit supply the program — what to run, when, with which songs, and
how to get better at it every week.

It follows the two formats the evidence supports (see
[`../DEMENTIA_MUSIC_SOFTWARE_ASSESSMENT.md`](../DEMENTIA_MUSIC_SOFTWARE_ASSESSMENT.md)):
**group sing-along circles** (the SingFit-style active-engagement model) and
**personalized listening** (the Music & Memory model). Individualized music
from a person's own past outperforms generic "relaxing" music at reducing
agitation — musical memory survives late into dementia — so both arms are
personalized, and both feed the app's logging loop.

## Getting started (once)

```bash
cd singalong
SINGALONG_DB=/path/data.db npm run seed:program            # new facility + song kit
SINGALONG_DB=/path/data.db npm start                       # open http://localhost:4900
```

The seeder loads a 20-song public-domain kit — lyrics included — into the
facility's library. Rerunning is safe (existing titles are skipped; use
`-- --facility <id>` to target a facility you already have). Then, per
resident: create their musical profile, and either build playlists from
`suggestions` or run `createProgramPlaylists` (`-- --demo-resident` shows the
shape) to give them the four themed session playlists below.

Add `audioUrl` to songs as you go, pointing at wherever the facility already
has the right to play each recording from — its own streaming account, CDs, an
iPod. The app never hosts audio, and the seeded lyrics are public-domain
text; that keeps the whole program outside music licensing.

## The weekly rhythm

| When | What | Format |
| --- | --- | --- |
| 2× per week, same days, same time, same room | **Sing-along circle** (30–40 min) | Group, 4–10 residents |
| 3× per week or as needed | **Personalized listening** (15–30 min) | One resident, headphones or a quiet corner |
| Before care tasks that reliably cause distress; late afternoon (sundowning) | Personalized listening, the resident's proven calmers | One resident |
| Friday, 10 minutes | **Review the week's logs** | Activity director |

Same days, same time, same opening song: in memory care the routine *is* the
program. Residents who can't hold "Tuesday at 2" can still feel "this is the
singing time" when the gathering song starts.

## The sing-along circle: session arc

Every circle follows the same arc. The seeded playlists are already in this
order.

1. **Gather** — play/sing *Hail, Hail, the Gang's All Here* while residents
   settle. Same opener every session; it's the cue that says what happens now.
2. **Greet** — go around the circle; greet each resident by name.
3. **Core songs (4)** — the week's themed familiar songs, prompter on the
   shared screen. Sing slower and lower-pitched than the recordings; leave
   room for residents' voices to lead the choruses.
4. **Movement song** — one up-tempo number with simple motions: clapping,
   swaying, tapping, "wave when she comes 'round the mountain." One motion at
   a time.
5. **Close** — *Good Night, Ladies*, softer, as a goodbye ritual. End calm,
   not on a peak.

Log every song in the app as you go (`sang_along` / `listened_attentively` /
`moved_or_tapped` / `no_visible_response` / `agitated`), and record mood
before/after — that is what turns next week's playlist into a better one.

## The four-week cycle

Themes rotate; anchors and the movement slot repeat on purpose.

| Week | Theme | Core songs |
| --- | --- | --- |
| 1 | **Songs of Home & Heart** | Home on the Range · Oh! Susanna · My Wild Irish Rose · Down by the Old Mill Stream |
| 2 | **Out & About** | Take Me Out to the Ball Game · Daisy Bell · In the Good Old Summertime · I've Been Working on the Railroad |
| 3 | **Moon & Stars** (softer, slower) | Shine On, Harvest Moon · By the Light of the Silvery Moon · Beautiful Dreamer · Let Me Call You Sweetheart |
| 4 | **Comfort & Joy** | Amazing Grace · Swing Low, Sweet Chariot · Danny Boy · (Saints as the movement song) |

Why songs this old, when residents' youth was the 1940s–60s? The circle runs
on the *communal* canon — songs learned at school, church, and family
gatherings, which for today's residents is exactly these standards — and
pre-1931 publication is what lets this repo ship the lyrics. Era-of-youth
personal favorites belong in the listening arm, where no lyrics are needed
and audio is the facility's own.

## Personalized listening

1. **Intake** — build the musical profile with the resident and their family.
   The questions that matter: What was playing when they were 15–25? What was
   sung at home, at church, at dances? Favorite artists? First-dance song at
   their wedding? Put stories in `notes` ("sang in a church choir for 40
   years") — biographical only, never clinical.
2. **Build** — add their era's songs to the library with `audioUrl`s from the
   facility's own sources, then let `suggestions` rank the library against
   their profile. Start playlists at 5–8 songs.
3. **Use deliberately** — scheduled quiet listening, plus targeted use where
   agitation is predictable: before bathing or other distress-prone care
   tasks, and in the late afternoon.
4. **Log it** — even solo listening gets a session in the app with engagement
   and mood before/after.

## The Friday review

Ten minutes, in the app, per resident with sessions that week:

- **Promote** — `insights` ranks songs by logged engagement. Anything
  consistently `sang_along` / `moved_or_tapped` earns a spot in that
  resident's circle requests and listening playlists.
- **Retire** — repeated `no_visible_response` means rotate it out;
  `agitated` means drop it now and note what was happening.
- **Watch the mood deltas** — before/after mood across a month is the closest
  thing this program keeps to an outcome measure, and it's what you show
  families.

## Facilitation notes

- **Invite, never quiz.** "I love this one" — not "Do you remember this?"
  Recognition without the test.
- **Failure-free means every response counts.** Humming, tapping, a look up —
  log `moved_or_tapped` or `listened_attentively` and treat it as success.
- **If someone becomes agitated**, don't push through the song. Stop or step
  down to a known calmer, log it, and move on. The log is how one bad
  afternoon becomes information instead of a pattern.
- **Keep the room quiet otherwise.** Competing noise (TV, hallway) is the
  most common reason a session that worked last week doesn't work today.
- **Families are a resource.** A daughter who knows all the words is a
  co-facilitator; intake conversations double as family engagement.

## What this program is not

The same lines the app holds (see [`README.md`](README.md)): no licensed
audio, no clinical data. Engagement levels and mood ratings here are activity
observations for choosing next week's songs — not behavioral assessments, not
care-plan documentation, and staff notes must stay out of clinical territory
(no diagnoses, medications, or incident reports). If the facility needs music
documented in care plans, that happens in the facility's own clinical system,
not this one.
