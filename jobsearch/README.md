# Cardinal Job Search — outreach copilot

A private, offline single-page app that automates the *work* of a job search — drafting personalized LinkedIn messages, tracking every application, and scheduling follow-ups — while you stay the one who clicks **send**. Open `index.html` in any browser; everything is stored in `localStorage` on your device and never leaves it.

## What it does

- **Pipeline** — track target jobs (company, role, recruiter/hiring-manager contact, posting link, notes) through stages: Saved → Applied → Outreach sent → Replied → Interview → Offer/Closed.
- **Compose** — generate a ready-to-send message for the moment you're in, personalized from your profile and the specific job:
  - connection request note (with a live 300-character counter, LinkedIn's limit)
  - first message after connecting
  - follow-up after applying
  - referral ask
  - gentle nudge after ~a week of silence
  - interview scheduling reply
  - post-interview thank-you
  Edit the draft so it sounds like you, hit **Copy**, paste into LinkedIn, send. Then **Mark sent** logs it and schedules a follow-up 5 days out.
- **Today** — a daily worklist: every follow-up that's due or overdue, plus upcoming interviews and pipeline stats. Work the list, keep the cadence, and the interviews follow.
- **Profile** — your name, target role, one-line pitch, a concrete win, and top strengths: the raw material every draft is personalized from.
- **Backup** — export/import your whole pipeline as JSON.

## Why it doesn't send for you

Tools that log into LinkedIn and auto-send messages or auto-apply violate LinkedIn's User Agreement (which prohibits bots and automated access), and LinkedIn actively restricts or bans accounts that use them — losing your account mid-job-search is the worst possible outcome. There's also no public LinkedIn API for messaging or applications.

Just as important: recruiters ignore template blasts. What gets replies — and interviews — is a short, specific, personalized message from a real person, sent consistently and followed up on. That's the part people fail at through disorganization, not through lack of a bot. This app automates the disorganized part (drafting, tracking, remembering to follow up) and leaves the ten seconds of pasting and sending to you.

## Suggested daily routine

1. Open **Today**. Send every follow-up that's due (Compose → Copy → paste in LinkedIn → Mark sent).
2. Add 2–3 new target jobs to **Pipeline**; apply on the posting, then send the connection note to the recruiter.
3. Move stages as replies come in. When someone offers a time, use the *scheduling reply* template and log the interview date.

Fifteen minutes a day of this cadence is what lines up interviews.
