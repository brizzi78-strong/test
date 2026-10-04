# Cardinal — dating-app demo

> Cardinals mate for life and stay through every winter.

A small, self-contained dating-app front end themed around the cardinal.
It runs entirely in the browser — no build step, no server, no tracking.
All state (your profile, who you've seen, your matches, your messages) lives
in `localStorage`.

## Run it

Open `dating/index.html` in any browser, or serve the folder:

```bash
cd dating
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's in it

- **Landing** — the pitch: one honest profile, thoughtful matches, no games.
- **Invite gate** — Cardinal is **invite-only**. Redeem an invite code, or join
  the **waitlist** (women move up first).
- **Onboarding** — build a profile (name, age, city, plumage color, bio,
  interests, and a conversation prompt).
- **Join gate (vetting)** — before meeting the flock, every new member passes a
  short **membership interview** and clears a (simulated) **background check**.
  Cardinal is **free for women**, who pledge at least **30 minutes of activity a
  month** to keep the flock warm; that activity is tracked on the profile.
- **Refer & earn** — a **multi-level** referral ladder: 1 credit per direct
  invite, 0.5 per second-level, climbing status levels (Fledgling → Flock
  Leader → Cardinal Circle) that unlock perks.
- **Discover** — a swipeable card deck of a sample "flock." Drag left/right,
  use the pass / like buttons, or the ← / → arrow keys.
- **Matches** — everyone who called back, with a detail view and a first
  message.
- **Likes** — people who liked you first; like back for an instant match.
  Women see it free; free men get a blurred teaser that converts to the
  Cardinal+ upgrade.
- **Events** — monthly in-person events (speed dating, group hike, mixer,
  brunch) with RSVP that persists. Free for women; Cardinal+ men get priority.
- **Safety — Share my date** — set a trusted contact, share a date plan
  (who/where/when), run a check-in timer that escalates when overdue, mark "I'm
  safe," and a one-tap panic button. Because meeting someone new shouldn't mean
  going in alone.
- **Profile** — a preview of what the flock sees, editable any time, plus a
  **Safety & privacy** section: photo-verification badge, block/report (the ⋯
  on a card or "Report / block" in a match), and privacy toggles (incognito,
  hide from Discover, hide age). Verified profiles show a ✓ badge.

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup for all views and the match modal |
| `styles.css` | Theme (light/dark), layout, swipe-card and control styles |
| `app.js` | State, localStorage persistence, deck/swipe logic, matching |

## Notes

The people in Discover are fictional sample data defined in `app.js`
(`FLOCK`). Whether a like is returned is deterministic per person (~70% call
back) so the demo behaves the same every run. Nothing leaves the browser.
