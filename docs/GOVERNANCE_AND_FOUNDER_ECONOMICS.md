# Governance and Founder Economics — CARD

How to choose a board, what the revised supply split does, whether to charge a 3% trade
fee, and whether to pay yourself a salary.

> **Not legal, tax, or financial advice.** This is analysis to make the conversation with
> counsel and an accountant faster. See `docs/LEGAL-BRIEFING.md` for the securities-law
> groundwork this document builds on.

---

## Thesis

**The only asset CARD has is that its claims are checkable.** At a ~$20,000 fully diluted
valuation, the token has no liquidity moat, no user base, and no network effect. What it
has is a contract with nothing hidden in it, a locked pool, a renounced owner, and a page
that tells people not to buy. That verifiability *is* the product.

Three of the four proposals — 40% founder retention, a 3% trade fee, and a salary paid out
of trading activity — each spend that asset. And the arithmetic below shows they buy almost
nothing with it: a 3% fee at realistic volume for a token this size funds roughly **$2,000
to $11,000 a year**, which is not a salary. You would be trading the entire trust story for
less than the cost of the legal work you already need.

The board is the opposite case. A small board inside a separate LLC is the one proposal
that *adds* to the asset, because it converts "trust us with the treasury" into "two other
people have to agree," and it keeps a token dispute from ever reaching the book.

**Form the new LLC and give it a boring name. Seat three people. Replace the bare 100M
hold with a public timelock. Skip the fee. Pay yourself — from the treasury, under board
approval, disclosed on the ledger page.**

---

## The numbers, restated

Your message gave figures that need reconciling against what's in the repo. Here is the
reading this document uses:

| Your words | Interpretation | Source |
|---|---|---|
| "250,000 coins" | 250,000,000 CARD total supply | `contracts/CardinalsPromise.sol` — `TOTAL_SUPPLY = 250_000_000e18` |
| "I invested 10k" | ~$10,000 of your own money: ETH for the pool plus launch costs | `TOKEN_LAUNCH_STRATEGY.md` budgets 2–5 ETH into the pool |
| "hold onto 100 mill" | 100,000,000 CARD (40%) retained by you personally | New — supersedes the old split |
| "only 100 mill initially released" | 100,000,000 CARD (40%) into the Uniswap pool at launch | New — was 200M (80%) |
| Remainder | 50,000,000 CARD (20%) treasury | Unchanged from `TOKEN_LAUNCH_STRATEGY.md` |

**This is a material change from the shipped plan.** The launch strategy puts 80% in the
pool specifically because "screeners flag deployer-heavy tokens as rug risks," and warns
that holding back more than 20% "looks extractive." You are proposing to hold back 40%
personally *on top of* the 20% treasury — 60% of supply in team-controlled hands.

Assuming ~$8,000 of the $10,000 goes into the pool and ~$2,000 covers the lock, gas,
verification, and fees:

- Launch spot price: **$0.00008 per CARD**
- Fully diluted valuation: **$20,000**
- Value of your 100M retained: **$8,000 on paper** — exactly equal to the entire pool, which
  is the problem in one line

### What $8,000 of liquidity actually feels like

| Buy size | CARD received | Average price paid | Spot price move |
|---|---|---|---|
| $100 | 1.23M | $0.000081 | +2.5% |
| $500 | 5.88M | $0.000085 | +12.9% |
| $1,000 | 11.11M | $0.000090 | +26.6% |
| $5,000 | 38.46M | $0.000130 | +164% |

Halving the pool from 200M to 100M CARD doubles the launch price but does not deepen the
book — a $1,000 buy still moves spot ~27%, and a $1,000 sell moves it down comparably. The
pool is thin in both directions. That is survivable and honest. It only becomes dangerous
when combined with the next section.

---

## Part I — The board

You said **small**. Correct, and the right number is **three**.

Three is odd, so nothing deadlocks. Two is not a board, it's a standoff. Five is right when
there is real money and real liability; at a $20,000 FDV, five people is theater and you
will not be able to get five good ones to show up.

### Before you can have a board, you need something for it to be a board *of*

A board with no entity is a mailing list. **Decision taken: a new, separate LLC** — not an
existing entity, not you personally.

That is the right call, and the "separate" part is doing most of the work:

- **Liability ring-fence.** The token is the riskiest thing in this repo. A securities
  complaint, an angry buyer, or a contract bug should reach the LLC's assets and stop
  there — not the book royalties, not the other software in this repo, not your house.
  Sharing an entity with the book would put the memoir's income inside the blast radius of
  a $20,000 token experiment. That trade is absurd, and it is exactly what a separate LLC
  prevents.
- **Clean books.** The board's credibility depends on the treasury being auditable. If
  gift money, book money, and personal money touch the same account, nothing on the ledger
  page is verifiable and the board cannot certify anything.
- **A clean handoff.** You can give the board real power over the LLC without giving them
  any say over the book or the rest of your work.
- **A clean exit.** If CARD goes nowhere, you dissolve one LLC. Nothing else is affected.

**Structure: new LLC + a 2-of-3 Safe multisig on the treasury.** Skip the nonprofit for
now — do not file a 501(c)(3) for a $20,000 project; the formation cost, exemption
application, and annual filings would exceed the treasury's entire value at spot. If the
giving grows enough to need real charitable standing, use **fiscal sponsorship** (an
existing 501(c)(3) receives and disburses the gifts for a percentage) rather than building
your own.

The multisig is what makes the governance real. A corporate bylaw is a promise; a 2-of-3
Safe is checkable on-chain by a stranger at 2am. Same design principle as the renounced
ownership and the locked LP.

### What the LLC should and should not hold

| Put it in the LLC | Keep it out |
|---|---|
| The 50M treasury (via the Safe) | The book, its royalties, and its IP |
| The `cp17.org` domain and the coin site | Your personal 100M CARD position (see below) |
| Deployment ops, the lock, listings, audits | The other apps and businesses in this repo |
| The gift program and its records | Personal accounts of any kind |
| The board, the gift policy, your comp agreement | |

On your personal 100M: **hold it personally and timelock it**, rather than contributing it
to the LLC. Keeping it out means the LLC — the entity a regulator or plaintiff would call
"the issuer" — discloses a clean 20% treasury rather than a 60% position. Either choice is
defensible, but pick one *before* launch and publish which one it is. Silence on this
question is worse than either answer.

### Two things to settle before anyone deploys anything

1. **Who deploys?** The deployer address is permanent, public, and is the first thing
   anyone uses to decide who "the issuer" is. If the LLC is the issuer, the LLC's wallet
   deploys the contract and seeds the pool. Deploying personally and transferring later
   leaves a permanent record that contradicts your own org chart.
2. **How does the $10,000 get in?** As a **documented capital contribution** to the LLC,
   into the LLC's own bank account, with its own EIN — not as you personally paying costs
   on the LLC's behalf. Commingling at the very first transaction is the single most common
   way an LLC's liability shield gets pierced, and it would make the separation you just
   paid for decorative.

### On the name — "Cardinal" / "Cardinals Platform"

You asked whether the name is a problem and said you'd change it if so. Short version:
**the name is a moderate risk, and the cheapest fix is to make the LLC name boring and keep
"Cardinal" as the public story.** The entity name is the one place where distinctiveness
buys you nothing.

What's crowded:

- **Cardinal Health** — a Fortune 20 healthcare company. This is the real collision, not
  the sports teams. Your project is hospice- and care-adjacent, which is precisely their
  lane, and confusion is likeliest where the goods and services overlap.
- **Cardinals (MLB / NFL)** — strong marks, but in sports entertainment and apparel. Lower
  risk for a software and giving platform; the risk climbs sharply the moment merchandise
  appears.
- **Cardinal Financial, Cardinal Capital, and similar** — "Cardinal" is well-worn in
  financial services, which is where a token platform sits.

There is also a structural reason to avoid it: naming the entity after the book means any
complaint about the token carries the memoir's brand in its caption. A boring LLC name is a
feature, not a compromise.

| Option | Assessment |
|---|---|
| **CP17 LLC** | **Recommended.** Already matches `cp17.org` and the `cp17-site` folder in this repo. Distinctive, uncrowded, and says nothing a plaintiff can quote |
| **Cardinal's Promise LLC** | Second choice. Ties to a title you already use publicly, which is a genuine defense, but keeps the book and the token sharing one brand |
| **Cardinals Platform LLC** | Weakest of the three. Closest to the crowded marks, and "Platform" adds nothing |

Use **CP17 LLC** as the legal entity and "the Cardinal's Promise" as the public name of the
project — a d/b/a if you want it registered. That keeps the story you care about and
removes the entity from the line of fire.

Before filing, do three cheap things in this order: a **state entity-name availability
search** (free, minutes), a **USPTO search** covering the classes that matter here —
software, financial services, and charitable or care services — and a **domain check**. A
trademark screen costs a small fraction of a rebrand after launch, and after launch the
name is on a contract address that cannot be edited.

### The three seats

Design the seats first, then find people for them. Choosing people first and inventing
roles afterward is how boards fill up with friends.

**Seat 1 — The Constraint.** Someone with financial, legal, or fiduciary experience who
holds **no CARD** and has no upside if the price rises. Their entire job is to be able to
say no to you and mean it. This is the seat that makes the board real; if you fill only one
seat, fill this one. Look for: a CPA, an estate or nonprofit attorney, a retired finance
officer, a credit-union or community-bank board veteran.

**Seat 2 — The Domain.** A hospice or palliative-care professional — a chaplain, a hospice
social worker, a bereavement coordinator, a volunteer director. Their job is to make the
giving real: to choose recipients, to say which gifts actually help a family and which are
performative, and to lend their professional reputation to the claim that this project
knows what it is talking about. Given the book and the mission, this seat is also your
strongest credibility signal to non-crypto audiences.

**Seat 3 — You.** Vision, execution, and the only person doing the daily work.

Note the structural consequence: on any question where you are conflicted — your own
salary, a treasury spend that benefits you, selling treasury tokens — you recuse, and the
other two decide. **That means you can be outvoted 2-0 on your own compensation.** If that
sentence makes you want to redesign the board, the board is not the thing you actually
want, and it is better to know that before you recruit anyone.

### Who must not be on it

- **Anyone paid in CARD.** A board member holding tokens is a trader with a vote. It
  destroys the independence of the only body whose independence matters.
- **Crypto influencers or "advisors" who want an allocation.** The ask itself is the
  disqualification.
- **Anyone who cannot say no to you.** Family, close friends, employees, anyone who owes
  you. Warmth is not the qualification here; friction is.
- **Anyone who wants the title but not the four hours a month.**

### Scoring candidates

Rate each 1–5. Anyone scoring below 3 on independence or willingness to dissent is a no,
regardless of the total.

| Criterion | Weight | What you are testing |
|---|---|---|
| Independence | ×3 | No token position, no financial dependence on you, no shared upside |
| Willingness to dissent on the record | ×3 | Will they put a "no" in published minutes with their name on it |
| Domain or fiduciary credibility | ×2 | Would a skeptical outsider find their presence reassuring |
| Reputational skin in the game | ×2 | Do they have a professional reputation that a bad outcome would damage |
| Availability (~4 hrs/month) | ×1 | Meetings, signing, reading before signing |
| Understands the mission | ×1 | Has read the book or worked in end-of-life care |

### The three conversations

1. **The mission conversation.** No ask. Just the book, the project, and why. You are
   testing whether they care.
2. **The failure conversation.** Walk them through the worst case out loud: the price goes
   to zero, someone calls it a scam publicly, a buyer says they were misled. Then ask the
   only screening question that reliably works: **"What would make you resign?"** A good
   answer is specific and comes quickly — "if you moved treasury funds without telling me,"
   "if the gift ledger stopped being published." No answer, or "I can't imagine that," means
   they have not taken the seat seriously and will not be a constraint when you need one.
3. **The powers conversation.** Show them the multisig, the gift policy, and the
   compensation clause. Ask if they would sign as-is. Their edits tell you more about them
   than their résumé.

### What the seat comes with

- **A key on a 2-of-3 Safe multisig holding the 50M treasury.** No treasury movement — no
  gift, no listing fee, no salary — happens with one signature.
- **A written gift policy** adopted before the first gift, not after.
- **Sole authority over founder compensation**, with you recused.
- **Quarterly minutes published** to `cp17-site/ledger.html`, including dissents by name.
- **A one-year renewable term**, and a standing commitment that any resignation letter is
  published unedited. That last clause is what gives a board member real leverage and gives
  buyers a real signal.

### Compensation for board members

Cash or nothing — a small honorarium (a few hundred dollars a meeting) or expenses only,
paid from the treasury. **Never tokens.** At this scale, most of the right people will
serve for free because they believe in the mission; if someone needs an equity-like stake
to serve, they are the wrong person for the Constraint seat by definition.

---

## Part II — Holding 100M personally

The concept is fine. The *mechanism* is what decides whether it helps or hurts.

**A bare hold in your own wallet is the worst version.** On-chain it is indistinguishable
from a pending dump: 40% of supply in a deployer-adjacent wallet, movable at any second,
against a pool holding $8,000. If you sold even 10% of your position into that pool, the
price would collapse. Every scanner will surface this. Every skeptical buyer checks it
first. And it directly contradicts the reasoning already published in
`TOKEN_LAUNCH_STRATEGY.md`.

**The fix costs you nothing you actually want.** If your intent is genuinely to hold, then
prove it, using the same tools already in the launch plan:

- Put the 100M in a **vesting or timelock contract** — 24 to 48 months, linear release,
  publicly verifiable. If you never intended to sell soon, a lock takes away nothing.
- **Publish the address and the unlock schedule** on the ledger page alongside the LP lock.
- **Announce the schedule before launch**, not after someone asks.

That converts your largest liability into your second-strongest trust signal, right behind
the renounced ownership. "The founder locked 40% of supply for four years, here is the
contract" is a materially better sentence than "80% went into the pool" — but only if the
lock exists. Without it, holding 40% is strictly worse than the original 80%-in-pool plan.

One more consequence: with only 100M in the pool and 100M in your hands, the *float* is 40%
of supply and your position equals the entire pool's CARD side. Thin float amplifies both
directions — it is why the price will look exciting early and why a single seller can erase
it. Do not read an early price rise as validation of the model. It is a measure of how
little liquidity there is.

---

## Part III — The 3% trade fee

**Recommendation: don't.** Not on moral grounds — on arithmetic.

### What it would earn

| Daily volume | 3% fee/day | Annualized |
|---|---|---|
| $200 (realistic for a micro-cap most days) | $6 | **$2,190** |
| $1,000 (a good day) | $30 | **$10,950** |
| $3,650 (sustained, implausible here) | $110 | $39,968 |
| $10,000 (would require a real user base) | $300 | $109,500 |

To pay yourself even $40,000 a year from a 3% fee you need **$1.33 million of annual trading
volume** — about $3,650 every single day, roughly 45% of the pool's entire depth turning
over daily, forever. Tokens with $8,000 of liquidity do not do that. Realistically, the fee
earns somewhere between **$2,000 and $11,000 a year**, before the cost of building and
auditing the mechanism that collects it.

### What it would cost

1. **It breaks a published claim.** `cp17-site/index.html` currently reads: *"Every trade
   costs 0.3%. That's a fee, and we're not going to call it anything softer. It's charged by
   Uniswap... not something we added to this one, and it stays in the locked pool rather
   than going to a wallet we can reach into."* A 3% fee routed to you makes that paragraph
   false. Rewriting it before launch is honest; shipping it as-is is not, and the tone of
   the whole site rests on that paragraph being true.

2. **It breaks the contract's core promise.** `CardinalsPromise.sol` has no tax hook, and
   `TOKEN_LAUNCH_STRATEGY.md` lists "tax/fee/blacklist mechanics" under *What This Setup
   Deliberately Avoids*, noting exotic mechanics are "the second thing scanners flag after
   unlocked liquidity." A fee-on-transfer token needs different, more complex, unaudited
   code — the opposite direction from a plain OpenZeppelin ERC-20.

3. **It cannot coexist with renouncing ownership.** A fee needs a recipient address, an
   exclusion list for the pool, and the ability to fix it when it breaks. Renouncing locks
   the fee in forever; not renouncing forfeits the single strongest trust signal you have.
   You cannot have both, and the fee is worth far less than the renouncement.

4. **It worsens the securities analysis.** `docs/LEGAL-BRIEFING.md` notes the design
   "deliberately weakens several Howey prongs — no capital is raised by the issuer,
   ownership renouncement removes ongoing 'efforts of others.'" A 3% rake paid to the
   founder from every trade re-establishes an issuer taking economic value from trading,
   and a founder whose income depends on price and volume is a founder with an obvious
   motive to promote. That is exactly the "efforts of others" fact pattern the current
   design avoids. Combine it with a 40% unlocked founder position and you have assembled a
   substantial part of the plaintiff's argument yourself.

5. **It costs the buyer more than it looks.** 3% in, 3% out, plus 0.3% each way to Uniswap,
   plus gas — a round trip on a $200 purchase loses ~7% to fees before the network charge,
   against a page that says it doesn't want people trapped.

### If you charge one anyway

Then do it properly: cap it at **1%**, apply it symmetrically to buys and sells, route it
to the **multisig treasury** rather than a personal wallet, disclose the exact rate and
destination on the coin page above the fold, and get the contract audited. A 1% fee routed
to a board-controlled treasury is a defensible design. A 3% fee routed to the founder is
the thing your own launch document was written to avoid.

---

## Part IV — Paying yourself a salary

**Short answer: yes, you should be paid for real work — and no, not out of trading fees,
and not yet.**

There is nothing wrong with a founder being compensated. Unpaid founders burn out and then
make worse decisions with the treasury than a salaried founder ever would. `cp17-site` already
says part of the treasury covers "legal, accounting, **the work itself**" — the disclosure
is in place. The questions are source, amount, and sequence.

### Source, ranked

1. **The book, speaking, and the software.** Your best answer. Ordinary business revenue,
   ordinary tax treatment, no securities question, no conflict with anything published.
2. **The treasury allocation, by board approval.** Legitimate if disclosed and constrained
   — see below.
3. **A trade fee.** Ties your income to trading volume and price, which is precisely the
   incentive the whole design exists to disclaim. Also, per Part III, it doesn't work.
4. **Selling your personal 100M into the pool.** Not a salary. At this liquidity it is the
   dump scenario, and `LEGAL-BRIEFING.md` already flags treasury sales as the asset most
   exposed to a "sale by the issuer" characterization.

### If it comes from the treasury, constrain it

- **Set it by the two non-founder members, with you recused and the recusal in the minutes.**
- **Cash, not CARD.** Paying yourself in tokens makes you a seller later, which is the one
  thing your holders will be watching for.
- **Modest and defensible against the actual work** — hours logged, a written scope. If the
  entity ever becomes a nonprofit, "reasonable compensation" stops being good practice and
  becomes a legal standard with penalties attached.
- **Disclosed on the ledger page** as a line item with amounts and dates, the same as gifts.
  A published, board-approved, modest salary is a *trust-positive* fact. An undisclosed
  outflow from a known team wallet is, in your own launch document's words, "a slow rug."
- **Not before the first gift.** Whatever the order of operations actually is, if the ledger
  shows you paid yourself before you gave anything away, that is the story — permanently,
  and fairly.

### The honest framing

At a $20,000 FDV, there is no salary in this token. The treasury is worth $4,000 at spot and
cannot be sold into an $8,000 pool without destroying it. Any real compensation for the next
year comes from the book and the businesses in this repo, not from CARD. Plan accordingly,
and let the token be what the site already says it is — not an investment, and not a
fundraising campaign.

---

## Risk register

| Risk | Driver | Mitigation |
|---|---|---|
| Rug-pull perception | 60% of supply team-controlled | Timelock the 100M, publish the schedule pre-launch |
| Scanner red flags | Fee-on-transfer mechanics | Ship the plain ERC-20; skip the fee |
| Securities exposure worsens | Founder rake + promotion incentive + unlocked position | No fee; lock the founder position; no price talk in marketing — see `docs/LEGAL-BRIEFING.md` |
| Published claims become false | 3% fee contradicts `cp17-site/index.html` | Either don't add the fee, or rewrite the page *before* launch |
| Treasury discretion | Single-signer wallet | 2-of-3 Safe, written gift policy, published minutes |
| Board capture | Members hold tokens or depend on you | No token comp; independence weighted ×3 in scoring |
| Liability reaching the book | Token and memoir sharing one entity | Separate LLC; book IP and royalties stay out of it |
| LLC shield pierced | Commingled funds from day one | Own EIN and bank account; the $10k in as a documented capital contribution |
| Trademark collision | "Cardinal" is crowded in healthcare and finance | Boring legal name (CP17 LLC); clear it before filing, not after launch |
| Tax surprise | Token receipts and treasury spends are taxable events | Accountant before launch, not after |

---

## Sequence

1. Clear the name (state search, USPTO, domain), form the new LLC, get an EIN, open its
   bank account, and document the $10,000 as a capital contribution. *Before* launch —
   retrofitting an issuer onto a live token is visibly a patch.
2. Open the 2-of-3 Safe and decide who deploys.
3. Recruit the Constraint seat. Everything else is easier once someone can say no. Then the
   Domain seat.
4. Decide the fee question. The recommendation is no fee, plain ERC-20, ownership renounced.
5. Deploy the founder timelock for the 100M and publish the unlock schedule.
6. Update `cp17-site` — new supply split, founder lock, board members, treasury policy — so
   the page matches reality on day one.
7. Adopt the gift policy and the compensation clause in writing, before either is needed.
8. Launch per `TOKEN_LAUNCH_STRATEGY.md`, with the amended split.
9. Publish quarterly: gifts, spends, minutes, compensation.

---

*Prepared as internal strategy analysis. Nothing here is legal, tax, or financial advice.
Review the securities questions in `docs/LEGAL-BRIEFING.md` with qualified counsel, and the
compensation and entity questions with a CPA, before acting on any of it.*
