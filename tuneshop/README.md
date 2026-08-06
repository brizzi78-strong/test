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
- **Wire up the booking form** (mailto:, Formspree, or a booking system) —
  right now requests only persist in the visitor's own browser.
- **Pick a real business name** — "Velocity Werks" is a placeholder; register
  your own name/LLC and update the branding before launch.

## How it's built

One file, same pattern as the rest of this repo: HTML + CSS design tokens
(light/dark) + vanilla JavaScript, no frameworks, no external assets.
