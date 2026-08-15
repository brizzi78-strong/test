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
| `site/index.html` | Marketing / lead-generation landing page — **public** |
| `app/index.html` | Hub for the gated tools — **gated** |
| `app/tracker.html` | **Working prototype** — the authorization dashboard the landing page advertises |
| `app/appeal-letters.html` | **Working prototype** — denial and termination appeal letter builder |
| `app/outcomes.html` | **Working prototype** — outcomes log; the measurement instrument behind the traction number |
| `app/rules.html` | **Working prototype** — plan rules registry; what each payer requires, dated and sourced |
| `app/investors.html` | Investor presentation deck — **gated** |
| `app/one-pager.html` | Executive summary / leave-behind — **gated** |
| `deploy/` | Gated static server (zero-dependency Node) + Dockerfile |
| `docs/nc-snf-ma-reference.md` | North Carolina filing routes, PT documentation standards, appeal data |
| `docs/gap-analysis.md` | Honest distance between these artifacts and a fundable company |
| `docs/audit-2026-08.md` | Independent 20-agent audit, with remediation status |
| `docs/rules-registry.md` | What a production plan-rules registry requires — and why it is the moat |
| `docs/test-report-2026-08.md` | Ten-agent test pass: 17 defects found, all fixed |
| `tests/` | Executable suite — 179 tests, sandboxed logic + real-browser E2E |

`site/index.html` and `app/investors.html` are deliberately separate documents for
two different audiences, and neither links to the other — a buyer should not land
on the raise, and an investor should not be read the sales pitch.

## Deploying

Two Render services, defined in the repo-root `render.yaml`:

| Service | Root | Access |
| --- | --- | --- |
| `cardinal-coverage` | `site/` | **Public** static site, free tier |
| `cardinal-coverage-app` | `app/` | **HTTP Basic auth**, via `deploy/server.mjs` |

The split is deliberate. The tools are where resident data gets typed and there
is no Business Associate Agreement behind them, and the investor materials still
carry `FILL IN BEFORE PRESENTING` blocks — neither belongs on the open web. Every
gated page also carries a `noindex` meta tag and the server sends
`X-Robots-Tag: noindex`.

Set `CC_PASSWORD` when Render prompts on first deploy (`CC_USER` defaults to
`cardinal`). **The server exits rather than start without a password**, so a
misconfiguration fails closed instead of publishing the tools.

`deploy/server.mjs` is zero-dependency Node — timing-safe credential comparison,
path-traversal guard, an unauthenticated `/health` for Render's check, and a
restrictive CSP (the pages are self-contained, so `default-src 'none'` holds).
Verified locally: refuses to start with no password, 401 unauthenticated, 401 on
a wrong password, 404 on traversal attempts, 200 with the credential.

Every page is self-contained: open it in any browser, no build, no
dependencies, no network calls. Design tokens match the Cardinal palette used
across the other Cardinal apps, with a light/dark toggle in each header.

**The four tools are one product, not four files.** Each carries a nav strip
linking the other two, they share a single plan list, and the tracker hands off
directly to the outcomes log: the *Log outcome* button on any case opens
`outcomes.html` with the case ID, plan, and a suggested event type already
filled from that case's current status. Recording what happened is one click and
a note, rather than retyping a case into a second tool — which matters, because
the measurement habit is the thing the gap analysis identifies as most valuable
and most fragile.

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
absorb the authorization burden as unpaid labor) → the insight (these denials do
not survive appeal, so this is a workflow problem software can win) → why now (the
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
problem, the insight that denials do not survive appeal, product, why now, and
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
covered day, **which is the Effective Date printed on the NOMNC (CMS-10123)** —
CMS defines that date as the last day of covered services, not the first
uncovered day. NOMNC deliver-by is two calendar days before it; the printed QIO
deadline is noon on the day before it. A second clock runs from 42 CFR 422.626,
which starts at *delivery* of the notice — earlier than the printed deadline
whenever the notice went out before the two-day minimum — so the tool takes a
delivery date and colours urgency off whichever falls first. Date arithmetic is
local-midnight based and DST-safe, and verified against CMS's worked example.

The recertification clock treats the admission day as day 1 (42 CFR 424.20(d)),
and the page carries a caveat that CMS counts *covered* days rather than
calendar days, which this tool cannot yet express.

Built for short-interval plans — the auth cycle defaults to 3 days.

**Demo data.** The *Demo data* button loads a five-case anonymised caseload dated
relative to today: **two red, two amber, one green**, at $7,050 exposure. The two
reds fail for different reasons on purpose — one has a QIO fast-track deadline at
noon today, the other a physician recertification six days overdue — so a
walkthrough can show both a forfeited-rights clock and a technical-denial clock.
It prompts before overwriting real data.

## `appeal-letters.html` — appeal letter builder

Generates three letters from a shared clinical spine (certified plan of care,
prior level of function, current objective status, skilled-therapist rationale,
termination risk, and an optional *Jimmo* maintenance section):

- **A — Fast-track QIO appeal.** Provider statement to the BFCC-QIO, leading
  with 42 CFR 422.626, which places the burden of proof on the plan.
- **B — Plan reconsideration.** Expedited appeal of a denial, anchored on the
  CMS-4201-F requirement to apply Traditional Medicare criteria, with a formal
  demand for the specific criteria relied upon.
- **C — Short-auth challenge.** Argues under 42 CFR 422.112(b)(8) that
  authorization duration must track the certified plan of care, and under
  42 CFR 422.138(c) that approved determinations may not be reopened.

> **Have counsel review before first use.** The audit flagged an unresolved
> standing question: parties to a plan reconsideration under 42 CFR 422.574 are
> the enrollee, an appointed representative, or a non-contracted provider acting
> as assignee — a facility signature alone may be dismissed without reaching the
> merits. Expedited handling under 422.584(c)(2) is mandatory only on a
> *physician* request. The page carries this warning; the letters do not yet
> resolve it.

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

Metric definitions are stated in the page footer and match the implementation:
recovered days and protected dollars sum **only** won-appeal and recovery events
(the fields are disabled on every other event type); appeal win rate counts
decided appeals only and is withheld below five, showing a raw fraction instead,
because a "100%" off one appeal is an unrecoverable claim in a deck; pending
appeals are tracked per case across all events rather than within the selected
window, and decisions with no matching filing are surfaced rather than silently
clamped. Future-dated and unreadable entries are excluded from every total and
flagged. CSV export covers the selected period — matching what is on screen —
carries a UTF-8 BOM, uses CRLF, and neutralises leading `=`/`+`/`-`/`@` so the
file is safe to email to billing.

## Tests

`node cardinal-coverage/tests/run.mjs` — **179 tests, 11 lanes, currently green.**
Exits non-zero on failure. Two styles: `sandbox()` pulls pure helpers out of a
page's inline `<script>` and exercises them with no DOM; `open()` drives the real
`file://` page in Chromium via Playwright with seedable `localStorage`, collecting
page exceptions and console errors so a test can assert the page stayed quiet.

Coverage: the deadline engine (including DST, leap day and year boundaries, and
regression tests pinning the NOMNC effective-date convention), tracker state and
persistence, outcomes metrics and CSV, the rules registry's freshness discipline,
letter generation and the PHI-persistence promise, two end-to-end browser lanes,
output escaping against injection payloads in every field, and
accessibility/print/responsive.

Tests resolve pages against `app/` (see `APP` in `harness.mjs`), since that is the
gated deploy root.

Playwright is installed in the session scratchpad rather than as a devDependency,
so the browser lanes will not run from a fresh clone until that is fixed.

## Audit

An independent twenty-agent audit ran in August 2026 — full report and
remediation status in [`docs/audit-2026-08.md`](docs/audit-2026-08.md). It found
a safety-critical error in the deadline engine (both notice deadlines computed a
day late), several miscited regulations, and overstated statistics; those are
fixed. The appeal letters carry an unresolved standing question flagged on the
page and awaiting counsel. Findings in the HIGH and STRATEGIC sections remain
partly open and are tracked in that document.

## `rules.html` — plan rules registry

Every payer runs its own submission routes, turnaround times, reauthorization
cadences, appeal fax numbers, and clinical criteria, and they change without
notice. This tracks them with the provenance that makes them safe to rely on:
every entry carries its **source**, the date a **human last confirmed it**, and a
**review interval**. Past review an entry turns amber; at twice the interval it
turns red and the page says plainly not to rely on it. Superseded values are
retained with the date they lapsed — that history is what proves a plan moved its
own requirement mid-stay.

Seeded with eight rules confirmed against named sources during research: the
Aetna and WellCare NC submission routes (including the warning that the 2026
EviCore post-acute program does *not* cover NC), the Acentra QIO contact and
region, and the federal layer — CMS-0057-F turnaround, 42 CFR 422.112(b)(8)
duration, 422.101(b)(6) criteria, the NOMNC effective-date convention, and the
422.626 burden of proof with the CMS-4205-F untimely-appeal right. Nothing is
scraped or inferred.

Import/export is JSON so the registry can migrate to a shared backend without
retyping. [`docs/rules-registry.md`](docs/rules-registry.md) covers what that
production version requires — and argues this registry, not the deadline engine,
is the defensible asset.

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
