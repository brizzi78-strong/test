# Ecosystem roadmap

How the pieces of **The Cardinal Companion** fit together, and what comes next.
The guiding pipeline:

> Book → Website → Email series → Resource database → Community portal

## Where things stand

| Stage | Status | Notes |
| --- | --- | --- |
| Book pages | ✅ Built | `books/promise.html`, `books/toolkit.html` — need real copy, covers, buy links. |
| Website hub | ✅ Built | Home, nav, shared design system. |
| Reader portal | ✅ Built (v1) | Landing + links; bonus content/downloads to be added. |
| Discussion guides | ✅ Built | On-page guides; printable PDFs to add. |
| Resource library | ✅ Built | Data-driven, searchable; vet & localize entries. |
| Newsletter | ✅ Built | Form + welcome-series outline; connect a provider. |
| Email series | 🔜 Next | Recreate the welcome series in the chosen provider. |
| Charity / donations | 🔜 Next | Honest donation path (see below). |
| Companion course | 🗓️ Planned | Self-paced path through the Toolkit. |
| Members area | 🗓️ Planned | Gated downloads / login. |
| Community portal | 🗓️ Planned | Moderated space for readers to connect. |

## Recommended build order

1. **Fill real content.** Replace every `class="placeholder"` with real synopses,
   covers, buy links, and vetted resources. This is the highest-value, lowest-effort step.
2. **Connect the newsletter** to a provider and build the welcome sequence. This is the
   engine that turns one-time readers into an ongoing audience.
3. **Add a charity / donation page** (see below).
4. **Ship printable PDFs** for the discussion guides and Toolkit worksheets — easy wins
   that make the site genuinely useful to support groups.
5. **Companion course.** The Toolkit's chapters map directly onto self-paced modules.
   Can start as a simple gated page set before any course platform.
6. **Community portal.** Highest effort and highest moderation responsibility — do this
   last, once there's an audience to fill it.

## Charity / donation path (the right way)

The goal of "donate proceeds to charity" is well served **without** selling any token:

- **Proceeds pledge page** — state plainly what share of book proceeds goes to a named
  charity (e.g. a hospice foundation, caregiver alliance, or grief organization).
- **Direct-donate button** — let readers give straight to the cause (Stripe, PayPal,
  JustGiving, or the charity's own page). The money flows to the charity, not through a
  speculative middle layer.
- **"Gift a book" / pay-it-forward** — readers fund a free copy for a caregiver who can't
  afford one.
- **Crypto _donations_ (optional)** — if crypto is desired, accept BTC/ETH _donations_ to a
  charity wallet. That's giving, not selling a speculative asset to vulnerable readers.

### Explicitly out of scope: a sellable token/coin

A real, tradeable token marketed to this audience is intentionally excluded:

- **Harm to buyers.** Grieving, exhausted readers are exactly the people most likely to be
  hurt if a token loses value — and most tokens do.
- **Legal exposure.** A token sold with an expectation of profit will generally be treated
  as an unregistered security in many jurisdictions, creating real liability.
- **Brand risk.** This brand's entire value is trust and comfort. A single "coin" failure or
  enforcement action would poison both books.

Charity is achievable through the honest options above, which carry none of these risks.

## Technical notes

- **No build step.** Everything is static HTML/CSS/JS. Keep it that way as long as possible —
  it's cheap, fast, durable, and impossible to "break the build."
- **Single source of truth for resources.** `data/resources.json` drives the library; the
  same pattern can power a future "downloads" or "events" list.
- **Progressive enhancement.** Forms and JS degrade gracefully; the content is readable even
  if scripts fail.
- **When to add a framework / CMS.** Only when non-technical editors need to update content
  without touching code, or when a real members area / course requires accounts. Until then,
  static is the right call.
