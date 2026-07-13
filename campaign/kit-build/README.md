# Kit Build — Ready to Deploy

Status as of July 13, 2026:

- ✅ **Sequence created in Kit:** "Toolkit Warm Sequence — Aging Parent Cardinal's Toolkit"
  (ID 2825112, from robertbrizzi@thecardinalspromise.com, sends 10:00 AM ET)
- ⏸️ **Emails 1–5:** blocked by Kit tool-approval in the automated session.
  Full copy lives in [emails.md](emails.md) — paste into the sequence, or approve
  the MCP calls in an interactive Claude session and ask Claude to load them.
- ⏸️ **Tags:** same approval block. Create the taxonomy below (Kit → Grow → Tags),
  or approve and re-run.

## Tag taxonomy to create

Segments (the five reader paths):

- `segment-recovery`
- `segment-hospice-eol`
- `segment-faith`
- `segment-adoption`
- `segment-financial-coaching`

Campaign/funnel tags:

- `toolkit-lead` — downloaded a Toolkit worksheet lead magnet
- `toolkit-buyer` — confirmed Toolkit purchase
- `memoir-preorder` — preorder receipt confirmed (sync with Notion Preorder Buyers DB)
- `memoir-buyer` — post-launch purchase
- `launch-team` — ARC/review team member
- `bulk-prospect` / `bulk-buyer` — institutional pipeline stages
- `families-with-kids` — children's book lead magnet or storytime signup
- `event-rollio` — registered/attended the Jan 9 live event

## Existing account state (for reference)

Tags already present: GDPR: Email Consent, Medicare Guide, Bedside Guide,
plus three import-date tags (candidates for cleanup).

Sequences already present:

| Sequence | Emails |
|----------|--------|
| Free Guides Welcome — Cardinal Companion (cp17.org) | 0 |
| 5 ways to love an addict | 3 |
| Cardinal's Promise — Nurture Sequence | 7 |
| Welcome Sequence — Cardinal's Promise | 5 |

Note: the "Free Guides Welcome" sequence has zero emails — anyone entering it
today receives nothing. Either fill it or route its form to the new Toolkit
warm sequence.

## Wiring once emails exist

1. Lead magnet form ("The First 72 Hours" worksheet) → adds `toolkit-lead`
   → enters "Toolkit Warm Sequence"
2. Purchase confirmation → `toolkit-buyer` → exits warm sequence
   (add exclusion rule so buyers don't get the pitch emails)
3. All five emails are drafted with `[LINK: …]` placeholders — swap in the real
   worksheet URL and Amazon page before publishing.
