# Cardinal — the safety roadmap (from the women themselves)

We asked the women Cardinal is for what they want. The answer was **all of it** —
safety isn't a feature here, it's the product. This is that list, turned into a
prioritized plan.

**The compass for every decision:** *does this protect the person, or just the
metrics?* If it only protects engagement, it's not a Cardinal feature.

---

## What they said they want

**Safety features**
- **Share my date** — tell a trusted friend who you're meeting, where, and when;
  a check-in timer; a discreet panic button / emergency contact.
- **Only verified people** — ID-verified and background-checked before anyone can
  contact you.
- **I control contact** — women decide who can message (women-message-first or
  verified-only); easy block/mute; no unsolicited photos.
- **Real consequences** — reports go to human moderators who act fast; bad
  actors are removed and can't just make a new account.

**What makes them trust it and stay**
- **Safe in-person events** — vetted group meetings so first dates aren't alone
  with a stranger.
- **A real standard** — a code of conduct everyone agrees to, with visible proof
  that violators are removed.
- **Privacy by default** — incognito, hide distance/last name, control who sees
  you.
- **It's genuinely for them** — women-first design and tone throughout.

---

## Priority plan

### P0 — Table stakes (partly built in the demo)
- ✅ **Verified + background-checked gate** before joining (demo: simulated).
- ✅ **Block / report** that removes people; **privacy** toggles (incognito,
  hide-from-discovery, hide age).
- ✅ **Women-first design & tone**, invite-only, interview to enter.
- ⏳ **Women control contact** — women-message-first or verified-only DMs, and
  "no unsolicited photos" enforced. *(Partly modeled; needs real messaging.)*

### P1 — Personal safety tools (highest emotional value)
- ✅ **Share my date** — built in the demo: set a **trusted contact**, share a
  date plan (who/where/when), a live **check-in timer** that escalates when
  overdue ("your contact would be alerted"), an **I'm safe** button, and a
  one-tap **panic button**. In production this needs a backend + notifications
  and should be native for the panic button + live location.
- ⏳ **Squad / friend vouch** — *"if you want to get with me, you've got to get
  with my friends."* Let a member loop in her friends: friends can see a match
  and vouch (or flag) before a date, "bring a friend" to a first meet, and group
  dates. This is safety *and* the sorority social dynamic in one — dating inside
  a trusted circle, not alone. Strong next build.
- ⏳ **Photo verification enforced** so "verified" is real, not a badge.

### P2 — Moderation & real consequences (operational, not just code)
- ⏳ **Human moderation** with a fast triage queue; action within hours, not
  weeks.
- ⏳ **Ban-evasion prevention** (device/phone/photo fingerprinting) so a removed
  person can't re-register.
- ⏳ **Transparency** — tell a reporter their report led to action. Trust comes
  from *seeing* it work.

### P3 — Trust & community
- ✅ **Safe in-person events** exist in the demo — add a safety layer: public
  venues, hosts/chaperones, check-in, and a post-event "everyone get home okay?"
- ⏳ **Code of conduct** agreed at signup, with visible enforcement.
- ✅ **Privacy by default** (extend with hide-distance / hide-last-name).

---

## Where this needs real infrastructure (be honest)

The features women want most — real background checks, ID/photo verification,
human moderation, and the panic button / share-my-date safety net — are exactly
the ones a client-side demo can't fake. They need:
- a **backend** (accounts, real data, notifications),
- **vendors** (Checkr/Persona, moderation),
- and **human operations** (moderators, a safety/response team, a law-enforcement
  process).

That's not a reason to wait — it's the reason this is a *company*, not just an
app. Safety done for real is the moat and the mission.

---

## The one-line summary for the team

Everything we build answers to one question the women already answered for us:
**"Does this actually keep me safe?"** Build the yes. Cut the rest.
