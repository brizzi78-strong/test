# Cardinal Coverage — landing page

A single, self-contained marketing/lead-generation page for the SNF Medicare
Advantage management software, built directly from the messaging framework in
[`../SNF_MEDICARE_ADVANTAGE_MESSAGING.md`](../SNF_MEDICARE_ADVANTAGE_MESSAGING.md).

> **Naming note:** "Cardinal Coverage" is a working name chosen to fit the
> Cardinal product family. It appears in the header, title, footer, and one
> form subject line — a find-and-replace away from whatever the product is
> ultimately called.

## How the page maps to the messaging framework

| Section | Framework layer |
| --- | --- |
| Hero | Core sales statement + tagline ("Know every covered day. Keep every earned dollar.") |
| The Problem | Step 1 (pain) + Step 2 (reflect their experience — the inbox, the spreadsheet, the late deadline, the invisible exposure) |
| The Dashboard | Step 3 (future picture) made literal: an illustrative authorization board with status, covered days, deadlines, and exposure |
| How It Works | Step 4 (the bridge): admission → stay → deadlines → discharge |
| What Changes | Step 5 (outcome-focused language), all six outcomes |
| Request a Demo | Lead capture — mailto-based form, no backend, nothing stored |

## Use it locally

Open `index.html` in any browser — no build, no dependencies. Design tokens
match the Cardinal palette used across the other Cardinal apps (light/dark
via the header's theme toggle).

The dashboard table uses **sample data only** and says so on the page; the
footer carries a plain-language disclaimer (no outcome guarantees, no
clinical/legal/billing advice) consistent with the messaging doc's ethical
guardrails.
