# Cardinal Coverage

SNF Medicare Advantage management — the marketing page, two working prototype
tools, and the operational reference they're built on.

> **Naming note:** "Cardinal Coverage" is a working name chosen to fit the
> Cardinal product family. It appears in page headers, titles, footers, and one
> form subject line — a find-and-replace away from whatever the product is
> ultimately called.

## What's here

| File | What it is |
| --- | --- |
| `index.html` | Marketing / lead-generation landing page — **buyer-facing** |
| `investors.html` | Investor presentation deck — **investor-facing** |
| `one-pager.html` | Single-page executive summary / leave-behind — **investor-facing** |
| `tracker.html` | **Working prototype** — the authorization dashboard the landing page advertises |
| `appeal-letters.html` | **Working prototype** — denial and termination appeal letter builder |
| `outcomes.html` | **Working prototype** — outcomes log; the measurement instrument behind the traction number |
| `docs/nc-snf-ma-reference.md` | North Carolina filing routes, PT documentation standards, appeal data |

`index.html` and `investors.html` are deliberately separate documents for two
different audiences, and neither links to the other — a buyer should not land on
the raise, and an investor should not be read the sales pitch.

Every page is self-contained: open it in any browser, no build, no
dependencies, no network calls. Design tokens match the Cardinal palette used
across the other Cardinal apps, with a light/dark toggle in each header.

## `index.html` — landing page

Built directly from the messaging framework in
[`../SNF_MEDICARE_ADVANTAGE_MESSAGING.md`](../SNF_MEDICARE_ADVANTAGE_MESSAGING.md).

| Section | Framework layer |
| --- | --- |
| Hero | Core sales statement + tagline ("Know every covered day. Keep every earned dollar.") |
| The Problem | Step 1 (pain) + Step 2 (reflect their experience — the inbox, the spreadsheet, the late deadline, the invisible exposure) |
| The Dashboard | Step 3 (future picture) made literal: an illustrative authorization board with status, covered days, deadlines, and exposure |
| How It Works | Step 4 (the bridge): admission → stay → deadlines → discharge |
| What Changes | Step 5 (outcome-focused language), all six outcomes |
| Request a Demo | Lead capture — mailto-based form, no backend, nothing stored |

The dashboard table on this page uses **sample data only** and says so; the
footer carries a plain-language disclaimer (no outcome guarantees, no
clinical/legal/billing advice) consistent with the messaging doc's ethical
guardrails.

## `investors.html` — investor presentation

A 16-slide deck that presents in the browser: arrow keys or space to advance,
**N** toggles speaker notes, **P** prints to PDF (one slide per page). A progress
bar and slide counter sit bottom-right.

Narrative arc: the shift (55% of Medicare is now MA) → the problem (facilities
absorb the authorization burden as unpaid labor) → the insight (the denials are
mostly wrong, so this is a workflow problem software can win) → why now (the
regulatory floor already in force, plus the CMS-0057-F Prior Authorization FHIR
API mandate landing 1 Jan 2027) → product and working proof → market and
beachhead → competition → go-to-market, model, traction, team, risks, and the ask.

The competition slide names PointClickCare and MatrixCare directly and concedes
what they genuinely do — record authorization numbers and coverage dates as a
billing field — before drawing the category line: everyone else is downstream of
the denial, working the claim after it is refused; this product is upstream of
it, working the stay while it is happening. Hedging that slide costs credibility
with anyone who knows the market.

Slide numbers are generated from document order at load, so inserting a slide
cannot desync the labels.

**Every market and problem statistic on the deck is sourced and cited on-slide** —
KFF enrollment data, the AHCA/NCAL provider survey, the 2026 HHS OIG report, and
the Acentra BFCC-QIO focused study.

**Nothing about the business is invented.** Traction, team, pricing, TAM math,
and the raise are dashed-border `FILL IN BEFORE PRESENTING` blocks with prompts
for what belongs there. That is deliberate: fabricated metrics in an investor
deck are both checkable and unrecoverable. Fill them in before showing this to
anyone, and where the honest answer is "pre-traction," the notes recommend saying
so and demonstrating the prototype instead.

## `one-pager.html` — executive summary

The leave-behind for after a meeting. Prints to exactly one page: market shift,
problem, the insight that denials are mostly wrong, product, why now, and
competition — with a consolidated source line in the footer. Same fill-in
discipline: traction, team, and the ask are a single dashed block that must be
completed before the document is sent to anyone.

## `tracker.html` — authorization tracker

A real, working version of the dashboard `index.html` illustrates. Per case it
computes: auth covered-through, next submission due, NOMNC deliver-by, QIO
fast-track deadline, physician recert due, and weekly progress note due —
colour-coded by urgency, sorted most-urgent-first, with a summary bar for
deadlines inside 48 hours and total exposure at risk.

Deadline conventions, stated in the page footer: "covered through" is the last
covered day; the effective date of non-coverage is the day after; NOMNC
deliver-by is two calendar days before the effective date; the QIO deadline is
noon on the day before the effective date. Date arithmetic is local-midnight
based and DST-safe.

Built for short-interval plans — the auth cycle defaults to 3 days.

**Demo data.** The *Demo data* button loads a five-case anonymised caseload dated
relative to today, so two cases always read red (one with a QIO fast-track
deadline at noon today), two amber, one green, at $7,050 exposure. It exists for
walkthroughs and the investor demo; it prompts before overwriting real data.

## `appeal-letters.html` — appeal letter builder

Generates three letters from a shared clinical spine (certified plan of care,
prior level of function, current objective status, skilled-therapist rationale,
termination risk, and an optional *Jimmo* maintenance section):

- **A — Fast-track QIO appeal.** Provider statement to the BFCC-QIO, leading
  with 42 CFR 422.626, which places the burden of proof on the plan.
- **B — Plan reconsideration.** Expedited appeal of a denial, anchored on the
  CMS-4201-F requirement to apply Traditional Medicare criteria, with a formal
  demand for the specific criteria relied upon.
- **C — Short-auth challenge.** Argues under 42 CFR 422.138 that authorization
  duration must track the treating provider's recommendation, and that approved
  concurrent determinations may not be reopened.

## `outcomes.html` — outcomes log

Built to answer the finding in [`docs/gap-analysis.md`](docs/gap-analysis.md):
the value proposition is entirely unmeasured, and measuring it at one facility
for a quarter is worth more than another quarter of engineering.

Log one event per authorization, denial, or appeal — about thirty seconds each —
and the page computes the scorecard: cases touched, on-time submission rate,
denials and NOMNCs absorbed, appeal win rate, covered days recovered, and dollars
protected, over 30/90/365 days or all time.

Two things make it more than a spreadsheet:

- **It generates the traction sentence.** The exact sentence the investor deck's
  weakest slide needs, assembled from real logged events rather than estimated.
- **It tracks the logging streak.** A fourteen-day dot strip and a consecutive-day
  count, because the measurement only compounds if it actually happens daily.
  Missing today does not break the streak until the day ends.

Metric definitions are stated in the page footer. Appeal win rate counts decided
appeals only, so pending appeals dilute neither numerator nor denominator. CSV
export exists for reconciling against remittance advice — which the page repeatedly
insists on before any figure is quoted to an investor.

## Data handling

These prototypes are deliberately backend-free. `tracker.html` and
`outcomes.html` keep data in browser `localStorage` and prompt for initials or a
room number rather than full names. `appeal-letters.html` persists **only**
facility letterhead details; member name, ID, dates, and clinical narrative are
held in memory and cleared on reload. Nothing is transmitted anywhere.

Both are working aids for tracking deadlines and drafting correspondence. A
facility's EHR and medical record remain the system of record, and neither tool
provides clinical, legal, or billing advice. Any production version of this
product would need a real HIPAA posture — BAAs, encryption at rest, audit
logging, access control — none of which a static page provides.
