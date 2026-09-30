# Velocity Werks — BMW & Mercedes tuning, Orlando FL

A single, self-contained web page for a real-world ECU tuning business:
customers pick their BMW or Mercedes, see the tune packages available for
their platform (Stage 1 / Stage 2 / transmission), and request a booking.

The actual tuning is done **in person, in the shop** — this page is the
storefront and booking funnel, not the tuning tool. It takes no payment;
booking requests are confirmed by the shop, which then sends a deposit link.

## What's on the page

- **Car picker** — BMW (B48, B58, S55) and Mercedes (M264, M256, M177/M178)
  platforms, each with stock hp/lb-ft figures.
- **Tune packages** — per-platform Stage 1 (software only), Stage 2 (requires
  hardware, flagged **off-road only**), and transmission tunes, each with
  price and expected gains.
- **Booking form** — name, contact, preferred day, notes. Requests are stored
  locally for now; wire the `#book` handler to a real backend or form service
  before going live.
- **The honest fine print** — warranty impact, emissions legality (off-road
  maps are closed-course only and not street-legal in CARB states), octane
  requirements, and a health-check-first policy.

## ⚠️ Before going live

- **Replace the placeholder numbers.** The gains and prices in `CARS` are
  typical-for-the-platform placeholders. Swap in the shop's own dyno results
  and pricing — quoting numbers you can't reproduce is how you get chargebacks.
- **Turn on bookings** (one line). Open the `CONFIG` block near the top of the
  page's script and either paste a form endpoint into `formEndpoint` (create a
  free one at [Formspree](https://formspree.io) — requests get emailed to you)
  **or** set `shopEmail` and leave `formEndpoint` empty (the button then opens
  the customer's email app with a pre-filled booking message). Until one of
  these is set, an on-page reminder shows and a local backup copy of every
  request is kept in the browser.
- **Pick a real business name** — "Velocity Werks" is a placeholder; register
  your own name/LLC and update the branding before launch.

## Free datalog health check (LogWerks)

The storefront links to **LogWerks** (`../datalog/`) as a free "post-tune health
check" — customers drop in an ECU datalog and see whether it's safe (knock,
boost vs. target, lean-under-load, heat soak). It's a real retention hook: most
shops give the customer nothing after the sale. Keep the `datalog/` folder
deployed alongside `tuneshop/` so the relative link resolves.

## How it's built

One file, same pattern as the rest of this repo: HTML + CSS design tokens
(light/dark) + vanilla JavaScript, no frameworks, no external assets. Bookings
submit via a configurable form endpoint with an email fallback; a local backup
copy is always kept so a request is never silently lost.
