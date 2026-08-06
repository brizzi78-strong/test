# AidFinder — free money for college, on autopilot

The money is out there — Pell, state grants, tax credits, employer tuition
benefits, and big national scholarships — but finding it, qualifying it, and
hitting the deadlines is a part-time job. AidFinder automates that job: fill
in a five-minute profile once, and the app continuously answers "what am I
eligible for, how much is each worth, and what do I do next?"

Zero runtime dependencies (Node 22+ built-ins only), same layering as the
other apps in this repo (domain / service / store / api).

## What it automates

- **Matching** — a curated catalog of 15 legitimate free-money sources
  (federal grants, the Next NC Scholarship, national scholarships like
  Coca-Cola Scholars / Gates / Jack Kent Cooke / Dell / Horatio Alger,
  the AOTC and Lifetime Learning tax credits, §127 employer tuition
  assistance, GI Bill) is screened against the student profile: state,
  degree level, field, GPA, household income/size, service, military
  affiliation. Every match explains *why* it matched.
- **Dollar estimates** — each match carries a best-guess annual value. The
  Pell Grant is actually computed (a simplified post-2024 model: full award
  at ≤175% of the federal poverty line, tapering to zero at 400%); the rest
  use the program's typical range.
- **The plan** — matches and tracked applications merge into one
  deadline-ordered to-do list. Recurring deadlines roll to the correct next
  calendar date automatically, with days-left counts and a single next
  action per item ("Finish and submit — due 2026-12-01 (117 days)").
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
```

Optional environment:

- `AIDFINDER_USER` / `AIDFINDER_PASSWORD` — set both to gate every route
  (except `/health`) behind HTTP Basic auth.
- `BRAND_NAME` — display name substituted into the web app's title and
  header.

Storage is in-memory (this is a demo; restart clears it).

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
| `GET /plan` | deadline-ordered action plan across matches + tracked applications |
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
