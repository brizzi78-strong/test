# Sentra Care — an honest safety & handling plan

A single, self-contained web page that turns "how do I make my Sentra safer and
handle better?" into a concrete, prioritized checklist you can work through and
check off. Built for a 2026 Nissan Sentra, but the advice applies to most
naturally-aspirated compact sedans.

## Why this instead of a "tune"

A 2026 Sentra is a new, naturally-aspirated car — there's no turbo to turn up
and no dormant self-driving mode to unlock. What *actually* makes it safer and
sharper is unglamorous and real: good tires at the right pressure, an alignment,
healthy brakes, clean/working driver-assist sensors, and good visibility. This
page ranks those by real impact, with rough cost, effort, and whether it's a
DIY or shop job — and it's honest about the ceiling. No fake horsepower.

## What's inside

- **Prioritized items in three tiers** — do-first (tires, pressure, alignment,
  brake baseline), then visibility & the safety systems you already have (sensor
  cleanliness, camera recalibration after glass work, wipers, headlights,
  dashcam), then refinement & preparedness (rotate/balance, brake-fluid flush,
  an optional rear sway bar, an emergency kit).
- **Each item** shows category (Safety / Handling), impact, ballpark cost, and
  effort (DIY vs shop) with a plain-language "why it matters."
- **Check items off** — progress saves to `localStorage` on your device, with a
  progress ring and Safety / Handling / To-do filters.
- **An explicit "don't"** — don't fit devices that defeat the driver-attention
  system so the car steers unattended; that makes it less safe, not more.

## Honesty / limits

Costs are rough US ballparks and vary by region and shop. Brakes, alignment, and
any driver-assistance calibration should be done by a qualified tech — a
mis-done safety job is worse than none. This page does not modify ProPILOT
Assist / Safety Shield 360; those are maintained by Nissan, and the goal is to
keep them working, not alter them.

## Use it

Open `index.html` in any browser — no build, no dependencies, works offline.

## How it's built

One file: HTML + CSS design tokens (light/dark) + vanilla JavaScript. The plan
is a small in-page `ITEMS` array; state is a `localStorage` map of checked
items. No frameworks, no external assets, no network calls.
