# HomeSafe — visit safety, both sides of the door

A single, self-contained, **offline** web page that helps keep people safe around
in-home service visits — the two sides of the same problem that make service
work risky:

- **My home** — you have a repair tech, delivery, cleaner, or caregiver coming
  in. Log who's *supposed* to arrive so an unexpected knock stands out, then run
  a quick at-the-door checklist (name matches the booking, photo ID shown,
  confirmed by calling the company's **official** number).
- **On a visit** — you're a worker (often heading alone into a stranger's home).
  Log the appointment, **share your plan** with a trusted contact in one tap,
  set how long you expect to be there, and **check in**. If you don't check out
  in time, HomeSafe flags the visit as overdue and offers a one-tap alert.

## What it deliberately does *not* do

HomeSafe **never looks anyone up** — no reverse phone, name, or address search.
That kind of lookup is unreliable, privacy-invasive, and the same capability
enables stalking. What actually keeps people safe is lower-tech and real:

- a **plan on the record** (an unexpected visit is obvious),
- **identity confirmed with the person's knowledge** — match what they gave you,
  call the company's official line — not a covert search,
- a **trusted person who knows where you are** and when to worry,
- your **own private notes/flags** on a visit ("felt off — decline future"),
  kept only on your device.

## Privacy

Everything lives in your browser's `localStorage` **on this device** — no
account, no server, no network calls. Clearing your browser data erases it.
Quick actions use your phone's own dialer and messaging (`tel:` / `sms:`) and,
only if you allow it, your location (to attach a map link when you share a plan).

HomeSafe is a safety aid, **not** a background-check or emergency service. In
danger, call your local emergency number.

## Use it

Open `index.html` in any browser — no build, no dependencies. On a phone, add it
to your home screen for one-tap access. It works with no signal.

## How it's built

One file: HTML + CSS custom-property design tokens (light/dark, matching the
Cardinal HR palette) + vanilla JavaScript. State is a small `localStorage`
object (`visits`, `contacts`, `mode`); an interval re-checks for overdue visits.
No frameworks, no external assets.
