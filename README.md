# The Cardinal Companion

A companion website hub for two books — **The Cardinal's Promise** and **The
Cardinal's Toolkit** — built for a caregiving, grief, and remembrance audience.
It's a plain static site: no build step, no framework, no dependencies. It runs
on any static host (GitHub Pages, Netlify, Cloudflare Pages) by serving the
folder as-is.

The cardinal is a long-standing symbol of remembrance — a sign that a loved one
is near — which sets the gentle, trustworthy tone of the whole site.

## The vision

> Book → Website → Email series → Resource database → Community portal

One asset feeds the next: a reader meets the book, finds the site, joins the
newsletter, draws on the resource library, and eventually joins a community of
people who understand. This repo builds the connective tissue for that pipeline.

## What's here

| Page | Path | Purpose |
| --- | --- | --- |
| Home hub | `index.html` | Ties everything together; entry point. |
| The Cardinal's Promise | `books/promise.html` | The story book — synopsis, audience, buy links. |
| The Cardinal's Toolkit | `books/toolkit.html` | The practical book — what's inside, buy links. |
| Reader Portal | `portal/index.html` | Calm home base for readers; bonus material hub. |
| Discussion Guides | `guides/index.html` | Questions for book clubs, support groups, self-reflection. |
| Resource Library | `resources/index.html` | Searchable, filterable caregiver/grief/crisis directory. |
| Newsletter | `newsletter/index.html` | Signup form + welcome-series outline + provider setup. |
| Support | `support/index.html` | Proceeds pledge, donations, gift-a-book (no sellable token). |
| Free guide (lead magnet) | `free-guide/` | Email-capture funnel: opt-in → thank-you/delivery → printable checklist. |
| Not found | `404.html` | Friendly fallback. |

### Email-capture funnel (`free-guide/`)

A lead-magnet funnel to grow the newsletter list:

1. `free-guide/index.html` — opt-in landing page offering the free **Caregiver's
   First-Week Checklist**.
2. `free-guide/thank-you.html` — delivery / confirmation page (noindexed).
3. `free-guide/caregivers-first-week-checklist.html` — the printable lead magnet
   itself (print-to-PDF styled).

The opt-in form uses `data-redirect="thank-you.html"`: until a provider is
connected it sends visitors straight to the delivery page. To go live, set the
form `action` to your provider's endpoint and point the provider's post-signup
redirect at `thank-you.html`. A hidden `lead_magnet` field tags the source.

### Shared assets

- `assets/css/styles.css` — the full design system (colors, type, components).
- `assets/js/main.js` — mobile nav, active-link highlighting, footer year, and a
  progressively-enhanced signup form (works with or without an email provider).
- `assets/js/resources.js` — renders the resource library with live filter + search.
- `data/resources.json` — **the single source of truth for the resource library.**
  Add an entry here and it appears automatically.

## Running it locally

Because the resource library uses `fetch()`, open the site over HTTP (not by
double-clicking the file). Any static server works:

```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Customizing

Content meant for you to replace is marked inline with a striped
**placeholder** style — search the HTML for `class="placeholder"`. Key things to
fill in:

- Real book synopses, cover art, and retailer/buy links (`books/*.html`).
- Your real discussion questions and downloadable PDFs (`guides/index.html`).
- Localize and vet the resource list (`data/resources.json`).
- Connect an email provider (see below).

### Connecting the newsletter

The signup forms post the fields `email`, `first_name`, and `interest`. To go live,
paste your provider's form **action URL** into the `action=""` attribute on the form
in `newsletter/index.html` (and the short form on `index.html`). Until then the form
shows a friendly confirmation instead of erroring. Recreate the welcome-series outline
as an automated sequence in your provider.

### Adding a resource

Append an object to `resources` in `data/resources.json`:

```json
{
  "title": "Organization name",
  "category": "caregiving",
  "type": "Hotline",
  "region": "United States",
  "url": "https://example.org/",
  "description": "One sentence on how it helps."
}
```

Use an existing `category` id (or add a new one to the `categories` array).

## Deploying

This is a static site, so deployment is just "serve the folder":

- **GitHub Pages:** enable Pages on this branch; the site serves from the root.
  (The `404.html` uses absolute paths so it works at the domain root.)
- **Netlify / Cloudflare Pages:** point at the repo, no build command, publish
  directory = repository root.

## Roadmap

See [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md) for the full plan, including the
planned **companion course**, **gated members area**, **community portal**, and a
legitimate **charity / donation** path.

## A note on scope

This project deliberately does **not** include any cryptocurrency or sellable
token. The audience here is often grieving and emotionally vulnerable, and a
speculative asset aimed at them carries real risk of financial harm (and likely
securities-law exposure) — the opposite of what a trust-based companion brand
needs. Raising money for charity is supported through honest, direct means
(donations, "gift a book", pay-it-forward), documented in the roadmap.
