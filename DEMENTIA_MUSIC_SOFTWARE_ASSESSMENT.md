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

## The evidence is real

This is the category's biggest asset: it is one of the best-evidenced
non-drug interventions in dementia care.

- A pragmatic randomized controlled trial across nursing homes (~976
  residents) found personalized music reduced the frequency of verbally
  agitated behaviors versus usual care.
- A rural VA study found antipsychotic dose reductions in five of eight
  veterans after a personalized music intervention.
- Individualized selections outperform generic "relaxing" music; musical
  memory is encoded in brain regions affected later in dementia than verbal
  memory, which is why familiar music still reaches people late in the
  disease.

For facilities under pressure to reduce antipsychotic use, that is a genuine
purchasing motive.

## But the market is already occupied — and price-anchored by a nonprofit

- **Music & Memory** (nonprofit): 5,800+ care sites certified. Training runs
  **$599–$999 one-time** with ~$200/year optional membership. This sets the
  price ceiling for the whole category: hard to sell a $500/month SaaS next
  to a $999-lifetime nonprofit program.
- **SingFit** (Musical Health Technologies): the licensed-content incumbent,
  in 500+ long-term-care facilities, plus an at-home caregiver product.
- **Free/DIY substitutes**: Spotify/YouTube playlists on a $30 MP3 player.
  Several states (Wisconsin, Texas, California via CAHF) run supported
  Music & Memory rollouts; **North Carolina already has "My Music NC"**
  through the Dementia Alliance of North Carolina.

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
nonprofit that has already set prices near zero.

Instead, fold music into the placement business as a differentiator:

1. Learn which Triangle facilities run Music & Memory or SingFit programs
   (NC's "My Music NC" program is a starting map).
2. Use evidence-based music programming as a placement criterion families
   care about — especially for memory-care placements where agitation
   management matters.
3. If the placement tool later tracks facility attributes, "certified music
   program" is a searchable field — data about facilities, not clinical data
   about residents, keeping the early product outside HIPAA scope.
