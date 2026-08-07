# AidFinder — free money for college, on autopilot

The money is out there — Pell, state grants, tax credits, employer tuition
benefits, and big national scholarships — but finding it, qualifying it, and
hitting the deadlines is a part-time job. AidFinder automates that job: fill
in a five-minute profile once, and the app continuously answers "what am I
eligible for, how much is each worth, and what do I do next?"

Zero runtime dependencies (Node 22+ built-ins only), same layering as the
other apps in this repo (domain / service / store / api).

## What it automates

- **Matching** — a curated catalog of 24 legitimate free-money sources
  (federal grants, the six biggest state programs — Next NC, Cal Grant,
  NY TAP, TEXAS Grant, Florida Bright Futures, Georgia HOPE — national
  scholarships like Coca-Cola Scholars / Gates / Jack Kent Cooke / Dell /
  QuestBridge / Cameron Impact / GE-Reagan / Horatio Alger, the AOTC and
  Lifetime Learning tax credits, §127 employer tuition assistance, the
  AmeriCorps Segal award, GI Bill) is screened against the student
  profile: state, degree level, field, GPA, household income/size,
  service, military affiliation. Every match explains *why* it matched.
- **Near misses** — money the student *almost* qualifies for, where every
  blocker is realistically fixable: a GPA within 0.5 of the cutoff, missing
  community-service hours, sub-half-time enrollment, or an unused employer
  benefit. Each shows exactly what would unlock it and the dollars at stake.
- **Dollar estimates** — each match carries a best-guess annual value. The
  Pell Grant is actually computed (a simplified post-2024 model: full award
  at ≤175% of the federal poverty line, tapering to zero at 400%); the rest
  use the program's typical range.
- **The plan** — matches and tracked applications merge into one
  deadline-ordered to-do list. Recurring deadlines roll to the correct next
  calendar date automatically, with days-left counts and a single next
  action per item ("Finish and submit — due 2026-12-01 (117 days)").
- **Calendar reminders** — one click exports every still-actionable
  deadline as an iCalendar file (`GET /plan.ics`) with week-before and
  day-before alarms, so the deadlines chase the student instead of the
  other way around.
- **The money tracker** — a pipeline (planned → in-progress → submitted →
  won/declined) with a header tally of matched, applied-for, and won
  dollars.

## What it deliberately does not automate

Submitting applications. Scholarship essays and FAFSA signatures must be the
student's own — most programs disqualify (and the FAFSA legally penalizes)
misrepresented applications. AidFinder finds, estimates, and schedules; the
student applies.

Amounts and deadlines are planning estimates that change every award year;
every entry links to its official source for verification. Legitimate aid
never charges an application fee.

## Run

```sh
cd aidfinder
npm start              # http://localhost:4700 (PORT to override)
AIDFINDER_DB=/data/aid.db npm start   # durable SQLite storage instead of memory
```

Optional environment:

- `AIDFINDER_DB` — path to a SQLite file for durable storage (profiles and
  tracked applications survive restarts). Unset = in-memory.
- `AIDFINDER_USER` / `AIDFINDER_PASSWORD` — set both to gate every route
  (except `/health`) behind HTTP Basic auth. Recommended in any public
  deployment: profiles contain household income.
- `BRAND_NAME` — display name substituted into the web app's title and
  header.

## Deploy (Render + thecardinalspromise.blog)

The repo's `render.yaml` blueprint includes an `aidfinder` web service:
Docker runtime running `node aidfinder/src/index.ts`, a 1 GB disk mounted at
`/data` for the SQLite store, and the Basic-auth gate enabled. Apply the
blueprint at Render (New + → Blueprint → this repo → Apply; or Sync if the
blueprint is already applied for the other services), set
`AIDFINDER_PASSWORD` when prompted, and the app comes up at
`https://aidfinder-*.onrender.com`.

To serve it at **thecardinalspromise.blog**: blueprints can't declare custom
domains, so open the service → Settings → Custom Domains → add
`thecardinalspromise.blog` and `www.thecardinalspromise.blog`. Render shows the
DNS records to create at the domain registrar (an A/ALIAS record for the
apex and a CNAME for `www` pointing at the onrender.com host). HTTPS
certificates are issued automatically once DNS propagates. More domains
(e.g. `robertbrizzi.com`) can be added to the same service the same way.

Note on the gate: the Basic-auth login is shared, and requests are scoped by
an `x-user-id` header that browsers don't set — so everyone using the site
shares one profile. That's fine for a family or a pilot; a real multi-student
launch needs per-student accounts first.

## API

Requests are scoped by an `x-user-id` header (default `demo`), matching the
tenancy style of the sibling apps.

| Route | What |
|---|---|
| `GET /health` | liveness probe |
| `GET /` | the single-page web app |
| `GET /profile` / `PUT /profile` | read / replace the student profile |
| `GET /opportunities` | the full curated catalog |
| `GET /matches` | opportunities this student qualifies for, biggest first, with estimates and next deadlines |
| `GET /near-misses` | almost-qualified opportunities, what would unlock each, and the dollars at stake |
| `GET /plan` | deadline-ordered action plan across matches + tracked applications |
| `GET /plan.ics` | the plan's dated deadlines as an iCalendar file with -7d/-1d reminders |
| `POST /applications` | start tracking an opportunity (`{ "opportunityId": "dell-scholars" }`) |
| `GET /applications` | tracked applications + money dashboard (potential / submitted / won) |
| `PUT /applications/:id` | update `status`, `amountWon`, `note` |
| `DELETE /applications/:id` | stop tracking |

## Test

```sh
npm test          # engine + API suites (node:test)
npm run typecheck
```

The engine (Pell model, deadline math, eligibility screening, sorting) is
pure and fully unit-tested; the API suite walks profile → matches → plan →
tracked application → won.
