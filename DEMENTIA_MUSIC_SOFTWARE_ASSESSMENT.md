# Assessment: Software for Dementia Music Training

Evaluation of building software for music-based training/therapy for people
with dementia, viewed against the placement-first strategy in
`SENIOR_CARE_PLACEMENT_STRATEGY.md`.

## What the category is

Two overlapping product types exist today:

1. **Personalized listening programs** — staff or caregivers build playlists
   of music from the person's youth to reduce agitation and anxiety
   (Music & Memory model).
2. **Active therapeutic engagement** — guided singing / cognitive and physical
   stimulation sessions run by activity staff (SingFit model).

## The evidence, stated carefully

It is one of the most *widely adopted* non-drug interventions in dementia
care — low-cost, low-risk (no serious adverse events across 30 trials), with
moderate-certainty evidence for improving depressive symptoms and reliable
moments of engagement and pleasure. But sell it honestly:

- The largest pragmatic trial (54 nursing homes, ~976 residents) found
  personalized music **not significantly effective** on its primary
  agitation measure or on psychotropic drug use; a pre-specified secondary
  analysis found a small reduction in *observed verbal* agitation and more
  observed pleasure. The 2025 Cochrane review concludes music-based
  interventions **likely do not improve agitation or aggression**.
- A small rural VA quality-improvement project (published as non-research:
  no control group, no statistics, 8 of 18 enrollees completing) reported
  antipsychotic dose reductions in five of its eight completers — an
  anecdote, not evidence, and its home-care setting doesn't transfer to
  facilities.
- Personalization is about *reaching* the person: small comparisons favor
  someone's own preferred music over generic "relaxing" tracks, and observed
  in-session response predicts who benefits. Imaging work suggests the
  regions encoding long-known music are relatively spared in Alzheimer's — a
  plausible mechanism, not a settled one.

The purchasing motive that survives scrutiny is engagement, family
satisfaction, and program quality — not antipsychotic reduction.

## But the market is already occupied — and price-anchored by a nonprofit

- **Music & Memory** (a program of the nonprofit Institute for Music and
  Neurologic Function since their January 2025 merger): 5,800+ organizations
  certified cumulatively since 2010 (the currently active count is not
  published). Training runs **$599–$999 one-time** (three tiers by org size,
  first year of support included) plus an optional **$200/year** per-site
  membership. This sets the price ceiling for the whole category: hard to
  sell a $500/month SaaS next to a ~$1,000-one-time nonprofit-run program.
- **SingFit** (Musical Health Technologies): the licensed-content incumbent,
  in 940+ long-term-care facilities and 50+ enterprise customers, plus an
  at-home caregiver product (~$15/month). Their licensed catalog is the
  moat.
- **Free/DIY substitutes**: Spotify/YouTube playlists on a $30 MP3 player.
  Several states *ran* state-funded facility rollouts of Music & Memory
  (Wisconsin 2013–2016, California via CAHF through mid-2018; Texas HHSC has
  signaled a new FY2026 sponsorship) — state money comes and goes, so a
  facility can't count on a subsidy. Separately, **"My Music NC"** (Dementia
  Alliance of North Carolina, a nonprofit) gives free Music & Memory at Home
  kits to North Carolinians living with dementia **at home** — a
  consumer-side substitute, not a facility program.

## Hidden structural costs

- **Music licensing.** In the US, delivering recorded music inside a product
  requires negotiating recording and publishing rights. SingFit's licensed
  catalog is its moat and took years to build. A new entrant either pays for
  licensing, restricts itself to public-domain recordings, or pushes playback
  onto the user's own Spotify/Apple accounts (limited APIs, terms-of-service
  risk).
- **Buyer profile.** The buyer is an activity director or memory-care
  operator with a small activities budget and a long sales cycle — not the
  independent placement agent our strategy is built around.
- **Health data.** A playlist product can stay low-risk if it stores only
  music preferences. The moment it records diagnoses, behavior incidents, or
  outcomes tracking for facilities, the sensitive-data obligations flagged in
  the placement strategy (HIPAA, BAAs, access controls) apply here too.

## Verdict

| Path | Assessment |
| --- | --- |
| Building new dementia music software from scratch | Crowded, licensing-heavy, price-anchored by a nonprofit |
| Competing with SingFit on licensed active-engagement content | Capital-intensive; their catalog is the moat |
| Using existing music programs as a placement differentiator | Low cost, immediately actionable |
| Music software as the wedge into senior-care software | Weaker wedge than the placement-agent tool |

## Recommendation

Do not build this as the software entry point. It fails the core test of the
placement-first strategy: we would not be our own first user, the buyer is
not the placement agent we understand, and the strongest competitor is a
nonprofit-run program that has already anchored prices around $1,000
one-time.

Instead, fold music into the placement business as a differentiator:

1. Learn which Triangle facilities run Music & Memory or SingFit programs
   (Music & Memory's public Map of Certified Organizations is the starting
   map, plus NCDHHS's Music & Memory page; My Music NC serves home-based
   families, not facilities).
2. Use evidence-based music programming as a placement criterion families
   care about — especially for memory-care placements where agitation
   management matters.
3. If the placement tool later tracks facility attributes, "certified music
   program" is a searchable field — data about facilities, not clinical data
   about residents, keeping the early product outside HIPAA scope.
