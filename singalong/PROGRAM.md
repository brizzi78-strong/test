# The Memory Care Music Program

A ready-to-run music program for residents in memory care, built on the Sing
Along app in this directory. The app supplies the tooling (musical profiles,
playlists, a lyrics prompter, response logging); this document plus the
seeded song kit supply the program — what to run, when, with which songs, and
how to get better at it every week.

It follows the two formats used across the field: **group sing-along
circles** (active engagement) and **personalized listening** (the Music &
Memory model). Both arms are individualized, and both feed the app's logging
loop.

## What the evidence actually supports — read this before quoting anything

Be careful what you claim, to families most of all. Stated honestly:

- **Music-based sessions reliably produce moments of pleasure, engagement,
  and connection**, at essentially no cost and with no serious adverse
  events reported across trials. There is moderate-certainty evidence for
  improvement in **depressive symptoms** and some evidence for overall
  behavioural problems and social engagement.
- **Do not claim it reduces agitation or medication use.** The largest
  pragmatic trial to date (54 nursing homes, 976 residents) found
  personalized music **not significantly effective** on its primary
  agitation measure or on psychotropic drug use; a pre-specified secondary
  analysis found a small reduction in *observed verbal* agitation and more
  observed pleasure, with no effect on physical agitation. The 2025
  Cochrane review concludes music-based interventions **likely do not
  improve agitation or aggression**.
- **Personalization is about reaching the person**, not behavior control:
  small comparisons favor a person's own preferred music over generic
  "relaxing" tracks, and observed in-session response predicts who benefits
  — which is exactly what this program's logging is for.
- **Why familiar music still lands late in the disease** is plausibly
  explained by imaging work showing the regions that encode long-known music
  are relatively spared in Alzheimer's — a promising mechanism, not a
  settled one.

The honest pitch: reliable moments of joy and connection, a calmer shape to
the day, and a record of what reaches each person — not a treatment.

## Getting started (once)

You need Node.js 22.18 or newer (`node --version` to check), then:

```bash
cd singalong
npm install                                     # once; needed for typecheck/dev tooling
SINGALONG_DB=./data.db npm run seed:program     # new facility + the 22-song kit
SINGALONG_DB=./data.db npm start                # open http://localhost:4900
```

`./data.db` is just a file the app creates — any writable path works, but
**use the same path in every command**. The seeder prints a facility ID
(`fac_…`): copy it, you'll need it. A warning that "SQLite is an
experimental feature" is harmless. For each resident: create their musical
profile in the console, then build their four program playlists from the
command line:

```bash
SINGALONG_DB=./data.db npm run seed:program -- --facility fac_… --resident res_…
```

Reruns are safe — existing songs and playlists are skipped. To reach the app
from the activity-room tablet, browse to `http://<this computer's
address>:4900` on the same network (find the address with `ipconfig` on
Windows or `ip addr` on Mac/Linux), and gate the console first:
`SINGALONG_USER` / `SINGALONG_PASSWORD`.

## The weekly rhythm

| When | What | Format | Staffing |
| --- | --- | --- | --- |
| 2× per week, same days, same time, same room | **Sing-along circle** (30–40 min inside a 60-min block) | Group, 4–10 residents | 1 facilitator + 1 aide per 4–5 residents; a CNA reachable |
| 3× per week or as needed | **Personalized listening** (15–30 min) | One resident, headphones or a quiet corner | Any staff member |
| During and leading into care that a resident finds hard; the hours a particular resident struggles | Their own music, the songs that have settled them before | One resident | The caregiver doing the task |
| Weekly, 20 minutes | **Review the week — by song, across the house** | Activity director | — |

Same days, same time, same opening song: in memory care the routine *is* the
program. Residents who can't keep track of "Tuesday at 2" can still feel
"this is the singing time" when the gathering song starts. Schedule the
circle to start 15–20 minutes after a toileting round — that one sentence
prevents more mid-session exits than anything else. Budget the full hour:
getting eight residents in takes 10–15 minutes before song one, and out
takes ten more.

## The sing-along circle: session arc

Every circle follows the same arc. The seeded playlists are already in this
order. Designate two core songs as droppable for slow days — rushing reads
instantly to the room.

1. **Gather** — play/sing *Hail, Hail, the Gang's All Here* while residents
   settle; loop it as long as arrivals need. Keep an empty chair near the
   door; the aide seats latecomers silently — never re-greet from the front.
2. **Warm up** — two minutes of shoulder rolls, deep breaths, hands open and
   closed. Wakes the voice, covers late arrivals, doubles as range-of-motion.
3. **Greet** — around the circle, each resident by name.
4. **Core songs (3–4)** — the week's themed familiar songs, words on the
   shared screen. Sing slower and lower-pitched than the recordings — aging
   voices lose the top of the range — and leave room for residents' voices to
   lead. One sentence of bridge between songs ("my mother used to sing this
   one"), never a quiz.
5. **Movement song** — one up-tempo number with simple motions and **rhythm
   instruments in hands**: egg shakers, tambourines, scarves (~$60 for a full
   basket, and the single biggest engagement multiplier for residents who no
   longer speak). One motion at a time.
6. **Request slot** — one song the room chooses. The same person picking the
   same song every week is a feature: choice is scarce here, and a request is
   a preference signal worth logging.
7. **Close** — *Till We Meet Again*, softer, as the goodbye ritual. End calm,
   not on a peak — then **serve coffee and juice in the same room**. People
   stay seated, the social benefit stretches another fifteen minutes, and
   transport happens calmly one resident at a time. Never end a group
   activity into nothing.

Water on the table throughout: singing is dry work and half the roster has a
hydration goal.

Log each song with one tap — **after the singing, never instead of it**. The
facilitator never leaves the front; logging during the circle is one
room-level impression per song at most. The truthful per-resident notes come
right after the close, ideally from the aide who was floating — they were
the one actually watching faces. Sparse and true beats dense and guessed:
the review loop acts on this data, so an invented log quietly retires the
wrong songs.

## The four-week cycle

Themes rotate (the app tracks which week is current); anchors and the
movement slot repeat on purpose.

| Week | Theme | Core songs |
| --- | --- | --- |
| 1 | **Songs of Home & Heart** | Home on the Range · Home! Sweet Home! · My Wild Irish Rose · Down by the Old Mill Stream |
| 2 | **Out & About** | Take Me Out to the Ball Game · Daisy Bell · In the Good Old Summertime · I've Been Working on the Railroad |
| 3 | **Moon & Stars** (softer, slower) | Shine On, Harvest Moon · By the Light of the Silvery Moon · Beautiful Dreamer · Let Me Call You Sweetheart |
| 4 | **Comfort & Joy** (faith music — see notes below) | Amazing Grace · Swing Low, Sweet Chariot · When the Saints Go Marching In · Danny Boy |

**About the song choices, honestly.** The shipped kit is constrained to
pre-1931 material — that's what lets this repo include the words. The
constraint costs you the WWII-era songs that land hardest with residents
born in the late 1930s and 1940s. Song *titles* aren't copyrightable, so
fill the gap locally: type these into your own library from your facility's
songbook (words from your own hymnal or by ear — don't photocopy modern
arrangements, which carry their own copyrights):

> You Are My Sunshine · Oh, What a Beautiful Mornin' · Don't Sit Under the
> Apple Tree · Sentimental Journey · God Bless America · America the
> Beautiful · In the Garden · The Old Rugged Cross · How Great Thou Art ·
> Red River Valley · Down in the Valley · Sidewalks of New York · When Irish
> Eyes Are Smiling · Too-Ra-Loo-Ra-Loo-Ral · White Christmas · Silent Night

Adapt the canon to your actual house — region, denomination, language. For
Spanish-speaking residents start with *Cielito Lindo*, *Las Mañanitas*, *De
Colores*; Yiddish, *Oyfn Pripetshik* and *Tumbalalaika*; Italian, *Santa
Lucia* and *Funiculì, Funiculà* — all public domain. Add seasonal sessions:
December carols are the highest-attendance programming of the year, July 4th
and **Veterans Day** are enormous for this cohort, and Mother's Day is loaded
— it goes beautifully or badly, resident by resident.

**Week 4 is faith music, so it's opt-in for everyone.** Say it to the room,
not to an individual: "This week we're singing hymns and spirituals — if
that's not your music, [name] has [alternative] in the sunroom, no need to
explain." Check profiles before Week 4; if intake didn't record a faith
background, don't assume one. The spirituals are African American sacred
music — *Swing Low* likely composed by Wallis and Minerva Willis, *Saints*
from the New Orleans tradition — and naming that out loud in one sentence
before singing is the difference between honoring a tradition and helping
yourself to it. Week 4 is also three farewell songs deep: staff it heavier,
expect tears, and don't run it the week after a death on the unit.

## Personalized listening

1. **Intake** — build the musical profile with the resident and their
   family. What was playing when they were 15–25? What was sung at home — at
   church, synagogue, temple, or mosque, or wherever singing happened?
   Favorite artists? First-dance song at their wedding? Put stories in
   `notes` ("sang in a church choir for 40 years") — biographical only,
   never clinical.
2. **Build** — add their era's songs to the library with `audioUrl`s from
   the facility's own sources, then let `suggestions` rank the library
   against their profile. Start playlists at 5–8 songs.
3. **Use deliberately** — scheduled quiet listening, plus targeted use
   *during and leading into* care a resident finds hard (the best small
   study played preferred music through bathing itself), and at the hours a
   particular resident reliably struggles — for many that's late afternoon,
   but go by the individual's pattern, not the clock.
4. **Log it** — even solo listening gets a session with responses and how
   they seemed before and after.

## The weekly review

Twenty minutes, by **song, across the house** — not ten minutes per
resident, which no activity director's Friday survives.

- **One screen:** which songs landed this week, which fell flat, which were
  cut. That's what changes next Tuesday's plan.
- **Let the log surface the residents who need individual attention:**
  anyone with an "upset" flag, anyone with three-plus sessions and no
  visible response, anyone with a care conference coming.
- **Rest a song that isn't reaching someone and try another.** A song that
  upset someone gets dropped that day and not brought back.
- **Bring it to the huddle that already exists.** Every building has a
  weekly at-risk or behavior meeting; "her afternoons are calmer after the
  Tuesday circle" belongs there, where it can actually change a care plan.

**Read the before/after moods for what they are.** The person who ran the
session also rated it, sessions often start at a low point, and there's no
comparison group — so these numbers show whether a session landed, not
whether the program is "working." Use them to pick songs. Share them with
families as "here's how her sessions have been going," never as a measure of
her condition.

## The hard moments

- **Tears.** The most common strong response in this work, and usually the
  point — a resident who weeps through *Danny Boy* and then says her
  father's name has had the best twenty minutes of her month. Don't stop the
  song, don't rush over, don't apologize for the music. Move near, keep
  singing, a hand on the shoulder if they welcome touch. Let it finish, then
  sit with them one-to-one after the circle — that follow-up is the real
  activity. Log it as what it is (the app has a response for tears, scored
  as reaching them, not against them), and tell the family warmly: "she
  cried at Danny Boy and then talked about her father for ten minutes" is a
  good report, not an incident.
- **Real distress.** Step down to a song that has settled them before rather
  than stopping cold; the music not stopping is what keeps one person's hard
  moment from becoming the room's event. Log "upset," and note what else was
  happening — time of day, noise, a bad morning.
- **The dominator.** Employ, don't suppress: seat them at your right hand,
  give them the job ("you've got the strong voice — start us off"), hand
  them the instrument basket to pass.
- **The refuser.** Never argue or bargain; offer twice in different words
  twenty minutes apart, and leave the door open — sitting in the hallway
  within earshot is participation. Log refusals as information: if she
  refuses every Tuesday and comes every Thursday, Tuesday is bath day, and
  that's a scheduling fix.
- **Wandering.** The circle is open and nobody chases. A resident walking
  the perimeter inside the sound is participating — log them as attended.
  Seat known exit-seekers where leaving doesn't cross the circle.
- **Disinhibition.** It will happen in a mixed group with frontal
  impairment, and the plan is decided in advance: a hand signal between
  facilitator and aide, a calm task-based redirect ("Mr. R., help me with
  the songbooks"), escort out without commentary — and **the music does not
  stop**. This is the one case that goes in the facility's real incident
  system, not in this app.

## Facilitation notes

- **Invite, never quiz.** "I love this one" — not "Do you remember this?"
  Recognition without the test.
- **Every response counts.** Humming, tapping, a look up — log it and treat
  it as success. Quiet is not failure; being in the room while the music
  plays is the point.
- **Hearing is the #1 mechanical reason a circle fails.** Pre-session check:
  hearing aids in with live batteries, glasses on, a pocket talker on hand
  for the two or three who need one.
- **Keep the room quiet otherwise.** TV off and unplugged, door positioned
  away from exit-seekers, blinds cut screen glare. Competing noise is the
  most common reason a session that worked last week doesn't work today.
- **Families belong in the circle.** A daughter who knows all the words is a
  co-facilitator; intake conversations double as family engagement. Photos
  and videos need a release on file per resident — and a house rule about
  family members filming other people's relatives.
- **Volunteers make two circles a week into four.** One-page role card,
  background check, and the hard rule that a volunteer never runs the circle
  alone.
- **Infection control:** wipe-down for shared instruments between groups,
  gel at the door, and a doorway-style fallback (residents at their doors
  down the hall, facilitator in the corridor) for outbreak periods.

## What this program is not

- **Not music therapy.** A board-certified music therapist (MT-BC) is a
  credentialed clinician with a distinct scope; representing an activities
  program as therapy has drawn citations. This is therapeutic *activity*
  programming.
- **Not clinical documentation — but treat it with care anyway.** The app
  stores musical biography plus, per named resident, session responses and
  before/after impressions. None of it is a diagnosis or an assessment, and
  none of it substitutes for the chart — but a named resident's states over
  time *are* resident information: keep the console gated, host it inside
  the facility's network and privacy obligations, and show it only to people
  you'd show a care note. Staff notes stay biographical — no diagnoses,
  medications, or incident reports.
- **Not a second charting system.** State surveys still want activity
  participation in the facility's own records; until the app grows an
  export, have the aide transcribe attendance into the real system as part
  of the after-circle notes — a program that makes staff document twice is a
  program that stops being used by November.
- **Not a licensing risk — within its lines.** The seeded songs and their
  lyric text are US public domain, so the repo ships no licensed content.
  That covers the songs, not everything around them: the facility's *audio
  source* must permit group playback (a personal streaming account's terms
  usually don't — check yours), and modern printed arrangements of even PD
  hymns carry their own copyrights, so sing from the app's words or a period
  score.
