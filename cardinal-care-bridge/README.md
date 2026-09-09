# Cardinal Care Bridge — landing page

A single, self-contained marketing/lead-generation page for the Triangle
senior living placement business described in
[`../SENIOR_CARE_PLACEMENT_STRATEGY.md`](../SENIOR_CARE_PLACEMENT_STRATEGY.md).
It's the **organic search / content** channel (Priority #4) from
[`../LEAD_GENERATION_STRATEGY.md`](../LEAD_GENERATION_STRATEGY.md) put into
practice, built around the lead magnet named in that doc: *The Cardinal's
Promise Family Guide*.

## What's on the page

- **Hero** — "Peace of Mind Starts Here," with the two calls to action the
  copy specified: *Read the Guide* and *Schedule Your Consultation*.
- **The guide** — what's included (guide, complimentary 30-minute
  consultation, personalized recommendations, tour questions, caregiver
  resources, next steps) plus a short name/email form to request it.
- **How We Help** — the four service pillars: Senior Living Advisory, Care
  Navigation, Move Coordination, Ongoing Family Support.
- **Why Families Choose Cardinal Care Bridge** — the people-first
  positioning ("We don't start with communities. We start with people.").
- **Our Community Promise** — the give-back messaging.
- **Consultation request form** — name, phone, email, loved one's name
  (optional), county, timeline, situation details, and preferred contact
  method — the actual lead-capture point the whole page is built to drive to.

## Use it locally

Open `index.html` in any browser — no build, no dependencies. Design tokens
match the Cardinal palette used across the other Cardinal apps (light/dark
via the header's theme toggle).

## Deploy it

Wired into the repo's `../render.yaml` blueprint as a free static site (no
plan, no disk, no build step needed):

```bash
# One-time, at https://render.com:
#   New + -> Blueprint -> connect this GitHub repo -> Apply.
```

Render provisions it alongside Cardinal Books and gives it its own
`https://cardinal-care-bridge-*.onrender.com` URL with automatic HTTPS. Add a
custom domain (e.g. `www.cardinalcarebridge.com`) in that service's Settings
-> Custom Domains, then point a DNS CNAME at Render.

## Advertise it (free)

The [`advertise/`](advertise/) folder is the free-advertising kit for this
business: a print-ready referral one-pager for hospital discharge planners
(the lead-gen strategy's Priority #1 channel), a bulletin-board flyer with
tear-off tabs for senior centers and community boards, and a copy-paste
kit for every free listing — Google Business Profile, Nextdoor, Facebook,
and the TJCOG / NC 211 community directories. See
[`advertise/README.md`](advertise/README.md) for the run order.

## Before this goes live

Both forms currently open the visitor's email client via a `mailto:` link
pre-filled with what they entered — a working submission path with zero
backend, but not what a real launch should ship with:

- ~~Replace the placeholder contact details~~ — done: forms and footer now
  use the real email and phone.
- **Wire the forms to a real submission path** — a form backend (e.g.
  Formspree, a serverless function) or, better, into whatever internal tool
  ends up tracking leads per the lead-generation strategy's closing point:
  every submission should be tagged with its referral source (in this case,
  "website — guide request" or "website — consultation request") so this
  channel's performance is measurable against the relationship channels, not
  guessed at.
- Consider adding analytics (page views, form starts vs. completions) once
  there's a privacy policy to disclose it in.

## A note on the copy

The page content (headings, the "What's Included" list, the four service
descriptions, the community-promise language) is the brand copy supplied for
Cardinal Care Bridge, laid out here as a page rather than edited — this is a
build task, not a copywriting pass.
