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
| `index.html` | Marketing / lead-generation landing page |
| `tracker.html` | **Working prototype** — the authorization dashboard the landing page advertises |
| `appeal-letters.html` | **Working prototype** — denial and termination appeal letter builder |
| `docs/nc-snf-ma-reference.md` | North Carolina filing routes, PT documentation standards, appeal data |

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

## Data handling

These prototypes are deliberately backend-free. `tracker.html` keeps case data
in browser `localStorage` and prompts for initials or a room number rather than
full names. `appeal-letters.html` persists **only** facility letterhead details;
member name, ID, dates, and clinical narrative are held in memory and cleared on
reload. Nothing is transmitted anywhere.

Both are working aids for tracking deadlines and drafting correspondence. A
facility's EHR and medical record remain the system of record, and neither tool
provides clinical, legal, or billing advice. Any production version of this
product would need a real HIPAA posture — BAAs, encryption at rest, audit
logging, access control — none of which a static page provides.
