# The CARD Design

### A thesis and dissertation on a 250,000,000-supply fixed token under the verifiable-restraint framework

August 2026

*Companion to the general study in [`crypto-startups-thesis/`](crypto-startups-thesis/README.md),
whose framework, instrument, and evidence base this document applies to one specific token. The
launch mechanics live in [`TOKEN_LAUNCH_STRATEGY.md`](TOKEN_LAUNCH_STRATEGY.md); this document is
the argument for the design.*

> **Note on the adopted design.** The decision record in
> [`docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`](docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md) adopts the
> same 100/100/50 split analysed here but assigns the tranches differently: the 100M held tranche
> is the **founder's, unlocked by deliberate decision** (mitigated by disclosure and a written sell
> policy, not code), and the 50M is the treasury behind a 2-of-3 Safe. That decision governs the
> launch. This dissertation's schedule-bound architecture — timelocked treasury, vesting reserve —
> stands as the framework's recommendation, and §5a below scores the adopted design honestly
> against it rather than pretending the two coincide.

---

## Abstract

CARD is a fixed-supply token of 250,000,000 units, allocated at genesis as 100,000,000 released
into circulation, 100,000,000 held in treasury, and 50,000,000 held back in reserve. This
dissertation analyses that design under the verifiable-restraint framework: the finding, from
twenty-four firm cases between 2020 and 2026, that digital-asset ventures survive and retain
market access in proportion to how much of their own future discretion they irreversibly and
checkably surrender.

The central tension of the CARD design is stated rather than hidden: **60% of supply remains under
issuer control at launch.** Under the framework this is the design's defining fact. A launch that
circulates 80% asks the market for very little ongoing trust; a launch that circulates 40% asks
for a great deal, continuously, for years. The thesis of this document is that such a design is
defensible on exactly one condition — that every unit of retained supply is placed under
machine-enforced schedule and multi-party control before the first unit circulates, so that "the
issuer holds 60%" becomes, verifiably, "60% is held by contracts whose rules anyone can read and
no one can quietly change."

The document specifies that conversion in full: the allocation ledger, the timelock and vesting
architecture, the disclosure obligations, the instrument scoring of the design as specified versus
as merely announced, and the conditions under which the launch should not proceed at all.

## Thesis statement

> A token that retains most of its supply must earn at launch what a fair launch earns by
> construction. CARD's 100/100/50 allocation is credible if and only if the two retained tranches
> are governed by on-chain schedule rather than by intention — a timelocked, multisig treasury
> with a published purpose and a vesting reserve that cannot move early — because in a market
> defined by adverse selection, retained supply under discretion is indistinguishable from a rug
> in waiting, and retained supply under verifiable schedule is a balance sheet.

---

## 1. The design, specified

| Tranche | Amount | Share | Disposition at genesis |
|---|---|---|---|
| **Released** | 100,000,000 | 40% | Circulating: liquidity pool plus any launch distribution |
| **Treasury** | 100,000,000 | 40% | Held: development, listings, liquidity deepening — under multisig + timelock |
| **Reserve (held back)** | 50,000,000 | 20% | Held: long-horizon buffer — under vesting contract, no early movement possible |
| **Total** | 250,000,000 | 100% | Minted once; ownership renounced; no mint function reachable thereafter |

Fixed properties, machine-enforced at genesis:

- **Supply:** 250,000,000, minted in a single transaction. Ownership renounced immediately after
  setup, so the supply cannot ever increase. The renounce transaction is the design's first
  artifact.
- **No exotic mechanics:** no transfer taxes, no blacklist, no pausability, no upgradability. The
  contract is a plain audited ERC-20 base. (This is what makes the renounce safe to perform: there
  is nothing that could later need fixing.)
- **Liquidity:** the pool seeded from the released tranche is LP-locked for a minimum of 12 months,
  lock URL published at launch.

## 2. Why 60% retained is the design's defining problem

The general study's failure data (Chapter 5 of the companion) shows the modal small-token death is
indifference, not theft — but its *trust* data is equally specific: screeners and buyers treat
issuer-heavy supply as the primary rug signal, second only to unlocked liquidity. The prior CARD
plan circulated 80% precisely to buy that signal cheaply.

This design chooses the opposite trade. Retaining 150M units keeps real capacity — to deepen
liquidity, fund development for years, and support the token's use inside a product — at the cost
of tripling the trust the market must extend. Under the framework (companion, §3.4), trust
extended on assertion is worthless and trust extended on artifact is cheap. So the design question
is not "is 60% too much to hold?" — it is "can 60% be held in a form that requires no trust?"

The answer the framework gives: yes, if and only if discretion is converted to schedule.
Enumerated, delayed, and announced discretion is a different object from discretion that merely
exists (companion, §12.3). Concretely:

### 2.1 The treasury tranche (100M, 40%)

- **Safe multisig, mandatory,** signers on physically separate devices. No single key can move a
  unit.
- **Timelock on every spend.** Each outflow is queued on-chain and visible for a fixed delay
  (recommended: 48–72 hours) before it can execute. The market never learns of a treasury movement
  after the fact.
- **Published purpose before launch:** development, exchange listings, liquidity deepening — stated
  in the launch announcement, not improvised later.
- **Announced spends:** every planned outflow is published before it is queued. A silent outflow
  from a known treasury reads as a slow rug; under this architecture a silent outflow is
  impossible, which is the point.
- **Etherscan label** requested at launch so the address is publicly identified.

### 2.2 The reserve tranche (50M, 20%)

The reserve is the tranche most likely to be read as "team allocation waiting to dump," so it gets
the strongest constraint available:

- **On-chain vesting contract.** The 50M is locked in a vesting/timelock contract at genesis, with
  a published schedule — recommended: a 12-month cliff (nothing can move in year one), then linear
  or stepped release over a further 24–36 months. The contract address and schedule are launch
  artifacts.
- **No acceleration path.** The contract has no owner function that can release early. This is the
  reserve's version of the renounce: the capacity to defect is removed, not promised away.
- **Stated purpose:** long-horizon buffer — future liquidity, product integration incentives, or
  burn. If the intended use is undecided, say that; "undecided, cannot move before [date]" is an
  honest and verifiable statement.

### 2.3 What this buys, in the instrument's terms

With both retained tranches under schedule, an outside analyst can verify, without trusting
anyone: total supply can never grow (renounce), the pool cannot be pulled (LP lock), 40% cannot
move without a multi-party, publicly delayed transaction (treasury), and 20% cannot move at all
for a year and only on schedule after (reserve). The honest summary a screener can compute:
**at genesis, 0% of CARD's supply is movable by any single person's decision.** That sentence is
the design's entire trust case, and every clause of it is a link.

## 3. The released tranche (100M, 40%)

The circulating allocation divides between the liquidity pool and any launch distribution. Design
constraints from the companion study:

- **The pool takes the large majority of the released tranche.** A thin pool against a large loose
  float invites the first sellers to consume all liquidity. If 100M is released, on the order of
  80–90M belongs in the locked pool unless a specific, published distribution (product users,
  integration partners) accounts for the remainder.
- **ETH side sized to appetite, buffered against catastrophe.** The prior plan's 2–5 ETH remains
  the sensible scale, with the recovery reserve — ETH held *outside* the pool, amount and policy
  published — carried over unchanged from the launch strategy.
- **No emissions, no airdrop-as-traction.** The study's modal failure rented users with
  distributed tokens and reported the activity as demand. Any distribution from the released
  tranche must be to parties with a role (users of the product CARD is load-bearing in,
  integration partners), not to wallets recruited to look like a community.

## 3a. The pool arithmetic: what "market cap" means here

Every figure in this section assumes the flat 2% transfer fee introduced in the pending
CARD revision, which taxes the pool-seeding transfer itself: seeding "100M CARD" delivers
**98M to the pair and 2M to the treasury**, because the exemption covers only the treasury
and the deployer is not it. All arithmetic below therefore uses a 98M pool balance.
Uniswap's own 0.3% swap fee is omitted except where noted; it makes the figures marginally
worse, never better.

### 3a.1 The launch price is set, not discovered

In a constant-product pool, price is simply the ratio of the two balances. Both balances are
chosen by the issuer. So at the moment of launch, market capitalisation is an arithmetic
consequence of two numbers the founder picked — not a valuation anyone external has offered:

| ETH seeded | Price per CARD | Fully diluted cap (250M) |
|---|---|---|
| **$3,000** | **$0.0000306** | **$7,653** |
| $10,000 | $0.000102 | $25,510 |
| $20,000 | $0.000204 | $51,020 |
| $40,000 | $0.000408 | $102,041 |

This matters because a higher launch capitalisation is not a better launch. It prices the
same tokens against the same ETH; only the ETH is genuinely at risk. Choosing a larger
seed buys a bigger headline number and a bigger loss surface, in equal measure.

### 3a.2 The capitalisation cannot be realised

Fully diluted capitalisation is the marginal price extrapolated across supply that cannot
transact at that price. The constant-product curve makes the gap explicit. Taking the
$40,000 case — pool of 98,000,000 CARD and $40,000, so *k* ≈ 3.92 × 10¹²:

| Sale | ETH extracted | Price after | Drawdown |
|---|---|---|---|
| 10M CARD (4% of supply) | ~$3,640 | $0.000337 | −17% |
| 100M CARD (the founder tranche) | ~$20,000 | $0.000102 | **−75%** |

The second row is the one that matters. **The founder's 100M reads as $40,816 at fully
diluted price and is realisably worth about $20,000** — half — and realising it leaves the
token at a quarter of its launch price. The paper figure and the attainable figure differ by
roughly 2×, and the gap is structural rather than a matter of poor execution or bad timing.

**The drawdown percentages are scale-invariant.** A constant-product curve depends on the
*ratio* of balances, not their magnitude, so the proportions above hold at every seed size.
At a $3,000 seed, a 4% sale still moves price −17% and the founder tranche still cuts it
−75%; only the dollars change — roughly $273 and $1,500 extracted rather than $3,640 and
$20,000.

This has a direct practical consequence. A larger seed buys **no structural improvement**:
not deeper proportional liquidity, not better price stability, not a smaller founder
overhang in percentage terms. It buys a larger headline capitalisation and a proportionally
larger sum at risk, and nothing else. The market's shape is fixed by the token distribution;
only the amount the issuer stands to lose is a free variable.

### 3a.3 The pool is the entire realisable market

There is no external capital inside a launch capitalisation. Every dollar any participant
withdraws is a dollar the founder deposited. Until a buyer arrives who is not selling back
into the same pool, the seed *is* the market — which is the same conclusion the demand gate
reaches from the opposite direction (§4), arrived at here through arithmetic rather than
through the failure base rate.

### 3a.4 Consequences for the disclosure

Two follow directly, and both strengthen rather than weaken the design's honesty case.

**The sell policy becomes meaningful rather than decorative.** §5a scored the unlocked
founder hold at a five-point discount because a written policy is a commitment rather than
a machine-enforced constraint. The arithmetic above supplies the missing quantitative
companion: the launch materials can state that the founder's tranche, if sold, would extract
roughly half the pool and cut the price by about three quarters. A disclosure carrying that
number is materially more useful to a prospective buyer than one asserting good intentions,
and it is checkable by anyone willing to run the curve.

**Seed size should be set by tolerance for loss, not by target capitalisation.** Since the
seed is the only realisable value in the pool and the pool is the only market, the seed
should be sized as money the issuer is content never to recover. Sizing it to produce an
impressive headline capitalisation inverts the decision, putting more at risk to make a
number larger that nobody outside has endorsed.

### 3a.5 What $1 per token would require

The question is asked of every small token, so it is worth answering with the curve rather
than with an opinion. **$1 per CARD is a fully diluted capitalisation of $250,000,000** —
32,668× the $7,653 the $3,000 seed establishes.

In a constant-product pool the ETH reserve needed to hold a given price follows directly
from the invariant: if *E₀* is the seeded ETH, *C* the pooled CARD, and *P* the target
price, then the pool at that price holds *E* = √(*E₀* · *P* · *C*) in ETH and *C* / √(*P* /
*P₀*) in CARD. Applied to the $3,000 seed and its 98,000,000 pooled tokens:

| Target price | Fully diluted cap | Net ETH that must buy in | CARD left in pool | Share of pooled float consumed |
|---|---|---|---|---|
| $0.001 | $250,000 | ~$14,100 | 17,150,000 | 82.5% |
| $0.01 | $2,500,000 | ~$51,200 | 5,420,000 | 94.5% |
| $0.10 | $25,000,000 | ~$168,500 | 1,715,000 | 98.3% |
| **$1.00** | **$250,000,000** | **~$539,000** | **542,000** | **99.45%** |

The dollar figure in the fourth row is not the obstacle. **The obstacle is the last
column.** Reaching $1 requires that 99.45% of every token in the pool be bought out of it,
and the constant-product curve prices the final tranche asymptotically: each additional
token costs more ETH than the last, without bound, as the CARD reserve approaches zero. A
pool seeded with $3,000 has no depth through which that volume can transact. This is a
structural statement about the curve, not a pessimistic forecast.

**A larger seed does not help, and the direction of the effect is counterintuitive.** Since
*E* = √(*E₀* · *P* · *C*), the required inflow rises with the *square root* of the seed. At
a $40,000 seed the same $1 target requires roughly **$1,940,000** of net buying — 3.6× more
absolute capital than the $3,000 case, not less, because the larger pool retains more tokens
at $1 and each must be backed by ETH. What the larger seed buys is a marginally shallower
climb in proportional terms — 98.0% of the float consumed rather than 99.45%. Both sit on
the vertical part of the curve. The seed size trades one infeasibility for another; it does
not convert either into a feasible one.

**And the resulting capitalisation would be mostly notional even if it happened.** The
$250,000,000 headline would rest on approximately $539,000 of money that actually changed
hands — every dollar entering the pool marks up roughly $464 of fully diluted
capitalisation. The founder's 100,000,000 and the treasury's 50,000,000 were never in the
pool; they would mark at $100,000,000 and $50,000,000 respectively, funded by nothing, and
§3a.2's arithmetic would still govern what either could realise on the way out.

**One honest limitation.** This analyses the pool *as seeded and never re-seeded*. A token
with genuine demand does not stay in a single thin pool: liquidity is deepened, additional
venues open, and the curve above is replaced by a different and much deeper one. The finding
is therefore not that $1 is impossible in principle — it is that **$1 is not reachable
through pool mechanics, at any seed size the issuer would rationally choose.** It is
reachable only through the thing the demand gate (§4) asks for and no allocation decision
can substitute for: enough external parties wanting the token badly enough to fund that
depth. The arithmetic in this section does not add a constraint the demand gate had not
already imposed. It prices it.

**Consequence for the disclosure.** The launch materials should be able to answer the
question directly when it is asked, because it will be. "What would it take to reach $1"
has a checkable answer — roughly half a million dollars of net buying, consuming 99% of the
pooled float — and publishing it is a straightforward instance of the disclosure discipline
the framework treats as the cheapest credibility available. A project willing to state the
number is distinguishable from one that lets the question hang.

### 3a.6 Manipulation prints the price but cannot fund it

§3a.5 shows what $1 costs in *bought* liquidity. It does not show what $1 costs in
*displayed* price, and the two are far apart. The honest answer to "could someone manipulate
CARD to $1" is **yes, cheaply, and the design cannot prevent it** — which is precisely why
the distinction between printed price and realisable value has to be stated at launch rather
than discovered afterwards.

**The cheap attack is a second pool.** Anyone holding CARD — the founder, the treasury, a
buyer, a stranger — can create an additional pair at any ratio they choose. Seeding a fresh
CARD/ETH pool with 100 CARD and $100 of ETH sets that pool's price at $1 per CARD. The cost
is roughly $100 plus gas. Price aggregators and token screeners frequently surface a new
pair's price before any liquidity-weighting is applied, so a $250,000,000 fully diluted
capitalisation can be *displayed* for the price of a modest dinner. Nothing in a fixed-supply
renounced ERC-20 can stop this: creating pools is permissionless by design, and the same
permissionlessness that makes the renounce credible makes the price surface unownable.

**Wash-trading the canonical pool is more expensive and self-defeating.** Round-tripping
enough volume through the main pool to touch $1 and return costs roughly 4.6% of the traded
notional — 2% transfer fee on each leg plus Uniswap's 0.3% on each — or about $25,000 on the
~$539,000 of notional §3a.5 requires. More to the point, a manipulator pumping this pool is
buying into an overhang of **150,000,000 tokens held outside it** — 1.5× the pooled float,
across the founder and treasury addresses — any part of which can be sold into the pump and
take the manipulator's ETH. Outside manipulation of the primary pool is therefore poorly
motivated. The party for whom the manoeuvre is *not* self-defeating is the founder, since
the founder holds the overhang. That is the same exposure §5a discounts five points for, seen
from a second angle.

**What manipulation cannot do is change §3a.2.** A printed price of $1 does not put a dollar
into the pool. Extraction remains bounded by the ETH actually deposited, whatever the ticker
says: the pool holds what it holds. Manipulation therefore does not narrow the gap between
capitalisation and realisable value — **it widens it arbitrarily**, and a $250,000,000
headline sitting above a $3,000 pool is the widest form that gap can take. Anyone treating a
displayed capitalisation as evidence of value is making an error the arithmetic here is
meant to foreclose.

**Three commitments follow, and all three are cheap to make and checkable.**

1. **Name the canonical pool at launch.** Publish the pair address and state that prices from
   any other venue are neither endorsed nor meaningful. A named pool converts the second-pool
   attack from a claim into an obvious discrepancy.
2. **Never cite a price the project created.** The project does not quote a market
   capitalisation, a token price, or a "valuation" derived from its own pool in any
   promotional material. If a number is quoted, it is quoted with the extraction table beside
   it.
3. **Publish the extraction arithmetic itself.** §3a.2 and §3a.5 are the disclosure. A reader
   holding them can check any price they are shown against what the pool could actually pay,
   which is the only defence against a printed number that generalises to attacks nobody has
   thought of yet.

### 3a.7 What a 20,000,000-token grant is actually worth

The proposed distributions (see the counsel/CPA memo) would transfer 20,000,000 CARD —
8% of supply — to each of several recipients. The curve prices that grant precisely, and
the result is worth stating before any grant is executed rather than after.

**Today, against the $3,000 seed, the grant marks at $612 and realises about $500.** Selling
20,000,000 into a pool of 98,000,000 CARD and $3,000 delivers 19,600,000 after the transfer
fee, leaving the pool at $2,500. And the grants are not independent of one another — the pool
pays the first seller best:

| Sequence | Extracts | Pool remaining | Price after |
|---|---|---|---|
| First 20M sold | $500 | $2,500 | −31% |
| Second 20M sold | $357 | $2,143 | −49% |
| Third 20M sold | $268 | $1,875 | −61% |
| **Three grants, combined** | **$1,125** | | |

Sixty million tokens — 24% of total supply, marking at $1,836 — realise $1,125 between them,
and the third recipient receives roughly half of what the first does for holding exactly the
same asset. **The grant is close to fully realisable only because it is close to worthless.**

**At a printed $1.00 the position inverts completely.** Per §3a.5 the pool at that price holds
about 542,000 CARD and $542,000. A single grantee selling 20,000,000 into it extracts
**$527,621 — essentially the entire pool — and leaves the price at $0.000725**, down 99.9%.
The first board member out takes nearly everything that ever entered; the others hold
20,000,000 tokens each against a pool containing $14,000. A twenty-million-dollar paper
position converts to roughly half a million dollars for exactly one holder.

**For a single 20,000,000 grant to be genuinely worth $1,000,000, the pool must reach
$3.50 per CARD** — a fully diluted capitalisation of **$875,664,547**, requiring about
**$1,011,782 of net external buying**. At that point the pool holds $1,014,782 and the sale
takes $1,000,000 of it, leaving $14,782 for everyone else. Three recipients each realising
$1,000,000 therefore requires not $3,000,000 of external money but considerably more, since
each exit deepens the curve for the next.

None of this says the grants are a bad idea. It says the grants are **recognition, not
compensation**, at any pool size the project will plausibly reach, and the paperwork and the
conversation with each recipient should say so in those words. A recipient who believes they
have been given $20,000,000 has been misled by an arithmetic the project is in a position to
correct.

**The inversion that actually endangers recipients is tax, not disappointment.** Absent a
timely §83(b) election, a vesting grant is ordinarily taxed at each vesting date on the fair
market value then — a number derived from a price feed. §3a.6 establishes that a price feed
for this token can be moved to $1 by a stranger for about $100. A recipient could therefore
face a tax liability computed from a number nobody paid, against a position the pool cannot
liquidate at anything near it. Whether a manipulated thin-pool print would survive scrutiny
as fair market value is a question for the CPA and not one this document can answer — but it
is the reason the §83(b) question in the memo is the most time-sensitive item in it, and the
reason the election should be evaluated while the whole grant demonstrably marks at $612.

### 3a.8 Buy-and-hold: the honest case, and what it does to the pool

Manipulation aside, the fair question is what happens if the token simply finds buyers who
intend to keep it. The answer is more favourable than §3a.5 might suggest, and it fails in a
way worth understanding before it is relied on.

**The upside is real and it is convex.** With no selling, price rises as the *square* of the
ETH in the pool: *P* = *E*² / *k*. Ten times the pooled ETH is a hundred times the price.
That is a genuinely powerful dynamic and it deserves to be stated plainly:

| Net bought in | Price | Fully diluted cap | Multiple | CARD left in pool | Float consumed |
|---|---|---|---|---|---|
| $10,000 | $0.000575 | $143,707 | 19× | 22,615,385 | 76.9% |
| $25,000 | $0.002667 | $666,667 | 87× | 10,500,000 | 89.3% |
| $50,000 | $0.009554 | $2,388,605 | 312× | 5,547,170 | 94.3% |
| **$100,000** | **$0.036085** | **$9,021,259** | **1,179×** | **2,854,369** | **97.1%** |
| $250,000 | $0.217718 | $54,429,422 | 7,112× | 1,162,055 | 98.8% |

A hundred thousand dollars of genuine, patient buying produces a nine-million-dollar
capitalisation. Nothing in this study says that cannot happen, and §3a.5's pessimism about
$1 should not be read as pessimism about every price.

**The failure mode is in the last column.** Buy-and-hold does not deepen the market; **it
consumes it.** Every purchase removes CARD from the pool, so the more completely the strategy
succeeds, the less liquidity remains behind the price it produced. At the $100,000 state the
entire tradeable market is 2,854,369 tokens — about 1.1% of supply — and the consequences are
severe:

| Sold into the pool | Share of supply | Extracts | Price impact |
|---|---|---|---|
| 1,000,000 CARD | 0.4% | $26,325 | **−44.6%** |
| 3,000,000 CARD | 1.2% | $52,261 | −75.7% |
| 10,000,000 CARD | 4.0% | $79,767 | −94.9% |
| 20,000,000 CARD | 8.0% | $89,907 | −98.4% |

**A single holder disposing of 0.4% of supply halves the price.** One board grant, one early
buyer changing their mind, one estate being settled. The nine-million-dollar figure is not
protected by the holders' collective intention, because the pool does not know their
intention — it knows only the next trade.

**Which makes buy-and-hold a coordination game, and an unstable one.** The strategy pays
every participant well precisely as long as every participant follows it, while the payoff to
being the first to stop rises with the price and falls sharply for everyone who goes second.
This is not a claim that holders would act in bad faith. It requires no bad faith at all: a
medical bill, a divorce, a portfolio rebalance, a death, a change of mind. The strategy asks
strangers for unanimous, indefinite, unenforced coordination.

**And by this study's own standard, that is the weakest class of commitment there is.** §5a
deducted five points because the founder's written sell policy is a commitment rather than a
machine-enforced constraint. A buy-and-hold ethos among holders is strictly weaker than that
policy — unwritten, undertaken by parties with no relationship to the project, enforceable by
nobody. The framework cannot count it, and neither should a launch that takes the framework
seriously.

**The correct response to it working is to deepen the pool, not to celebrate.** And here the
arithmetic is unkind, because adding liquidity requires matching both sides at the prevailing
ratio, so **depth is cheapest exactly when it is least needed:**

| Pool state | Cost of adding 20,000,000 CARD of depth |
|---|---|
| At launch | **$612** |
| After $10,000 of buying | $11,497 |
| After $100,000 of buying | **$721,701** |

Depth that costs $612 on day one costs $721,701 at a nine-million-dollar capitalisation —
1,179× more, by the same convexity that produced the gain. Any plan to "add liquidity later
if it takes off" should be priced now, because later it is unaffordable. (Uniswap's 0.3% swap
fee does accrue to the pool and thickens it slightly with volume; at these sizes the effect
is real but small relative to the figures above.)

**This does not contradict §3a.2, which answers a different question.** That section found
drawdown scale-invariant for a *fixed fraction of supply sold* — a ratio, and therefore
independent of magnitude. This section measures *pool depletion per dollar of price achieved*,
which is not a ratio and is not scale-invariant. Both hold: a bigger seed does not improve the
risk from any given percentage sold, and a bigger seed does leave a proportionally deeper pool
at any given achieved price. The two findings answer "what does selling cost?" and "what does
rising cost?" respectively.

**Finally, success makes the grant problem worse rather than better.** Under a $100,000
buy-and-hold, a 20,000,000 board grant marks at **$721,701** and a vesting third of it
represents **$240,579** of income at a price real buyers actually paid — so the valuation is
defensible in a way §3a.7's manipulated case was not. Selling that tranche realises
**$71,684** and moves the price **−90.8%**. A recipient could owe tax computed on $240,579
while able to obtain $71,684, and only by destroying the position of everyone who held. This
is the classic illiquid-appreciated-property trap, it arrives in the *good* scenario, and it
is the strongest argument in this document for settling the §83(b) question before any grant
is signed.

**What would make patient holding structurally real**, rather than a hope, is the same short
list the rest of this study keeps arriving at: machine-enforced locks that holders opt into,
liquidity deep enough to absorb an exit, or a reason to hold the token that is not the
expectation of selling it. The first two cost money. The third is the demand gate (§4).

### 3a.9 What the pool can actually fund, and the comparison that decides it

The project exists to fund something — a scholarship in Lou's memory. §3a.8 shows that
patient buying can produce a large capitalisation, so the operative question is not whether
the number can get big but **how much of it reaches a student.** The curve answers precisely.

The treasury holds 50,000,000 tokens and is exempt from the transfer fee. Selling that tranche
into the pool at various levels of genuine buy-side interest:

| Buyers put in | Pool holds | Treasury 50M marks at | Actually funds | Share of buyers' money | Price after |
|---|---|---|---|---|---|
| $25,000 | $28,000 | $133,333 | $23,140 | 92.6% | −97.0% |
| $50,000 | $53,000 | $477,721 | $47,707 | 95.4% | −99.0% |
| **$100,000** | **$103,000** | **$1,804,252** | **$97,438** | **97.4%** | **−99.7%** |
| $250,000 | $253,000 | $10,885,884 | $247,254 | 98.9% | −99.9% |

Two things are true at once here, and both matter.

**The good news is real: the mechanism works, and it is efficient.** Roughly 97% of every
dollar buyers put in can be converted into scholarship funding. That is a respectable
conversion rate and it should not be dismissed.

**The bad news is what the third and sixth columns say together.** The treasury tranche
*marks* at $1,804,252 and *funds* $97,438 — and doing so takes the price down 99.7%, because
the funding comes out of the same pool the price is made of. **Every dollar the scholarship
receives is a dollar a buyer deposited**, less leakage. The token does not generate the money.
It transports it, and it is destroyed in transit.

**Which invites the comparison that actually decides the question.** Take the same $100,000
of goodwill and route it two ways:

| | Reaches the scholarship | Donor keeps | Donor is left holding |
|---|---|---|---|
| **Through the token pool** | $97,438 | nothing | tokens worth ~99.7% less than paid |
| **As direct donations** | ~$97,100 (2.9% processing) | a deduction worth **$22,000–$37,000** | nothing, by design |

The two routes deliver the same amount to the student. One of them additionally hands the
donors $22,000–$37,000 in tax relief and leaves nobody holding a depreciated asset; the other
converts a gift into what looks, on a public and permanent price chart, like a loss. **For the
purpose of funding a scholarship, a donation mechanism dominates a token on every axis that
can be measured** — and it carries no securities question, no §83(b) problem, no
custody risk, and no key ceremony.

The one genuine argument on the other side deserves stating: a token may reach people who
would never donate. That is true, and it is not nothing. But money raised that way arrives
carrying an expectation of return that this structure cannot meet, from exactly the
population a securities analysis is most concerned about, and the eventual chart is a public
record of what happened to them. A scholarship funded that way is funded once.

**None of this argues against the mission. It argues about the instrument.** The structure
this study keeps arriving at is the same one §4 describes from the other direction: something
real is sold, it earns revenue, and a published share of that revenue funds the scholarship —
reported on a schedule, in bad quarters as well as good, which is verifiable restraint applied
to the mission rather than to the tokenomics. That structure funds a scholarship every year
instead of once, requires no buyer to lose money for a student to gain it, and needs no token
at all. If a token is later load-bearing inside that business, it will have a reason to exist
that this section cannot supply and the pool arithmetic cannot fake.

## 4. The demand gate is unchanged and unweakened

Nothing in this allocation answers the question the companion study puts first: who buys this, and
why, when the price is down 80%? The launch gate from the strategy document applies verbatim:

1. **Load-bearing path:** CARD is a required mechanism in one shipping product from this
   repository with at least one paying customer, with the economics published before launch; *or*
2. **Experiment path:** the launch proceeds explicitly labeled as an experiment, with the
   announcement stating plainly that no revenue stands behind the token today, what would have to
   become true for that to change, and the date by which progress will be reported.

The larger treasury makes this gate *more* binding, not less. A 100M treasury attached to a
product with revenue is a war chest; attached to nothing, it is 100M units of overhang that every
prospective buyer prices as future sell pressure. The retained supply is only an asset if the
token has a job.

## 5. Scoring the design

Applying the companion's instrument (Chapter 9; coding rules in Appendix A) to CARD as specified
here — with the treasury timelocked, the reserve vesting, and the demand gate unresolved:

| Item (max) | Score | Note |
|---|---|---|
| 1. Revenue independence (14) | 0 | Unchanged until the demand gate passes on the load-bearing path |
| 2. Asset segregation (14) | 14 | No customer assets held; nothing to commingle |
| 3. Reserves vs maximal loss (12) | 6 | Recovery reserve published; full marks require a balance sheet this project does not have |
| 4. Disclosure ahead of requirement (10) | 10 | Renounce, lock, treasury, vesting schedule — all published artifacts |
| 5. States weakest item (8) | 8 | This document names the 60% retention and the demand gap as the weakest items, in public |
| 6. Signing path (12) | 6 | Key ceremony mandatory per the launch strategy; multisig everywhere that persists; single-key exposure remains only in the genesis ceremony itself |
| 7. Machine-enforced constraints (10) | 10 | Renounce + LP lock + treasury timelock + reserve vesting: the maximal set available at this scale |
| 8. Licensure vs arbitrage (8) | 4 | Written counsel opinion required pre-launch; re-run at CLARITY resolution |
| 9. Can decline a bad window (6) | 6 | Self-funded; no obligation to launch on any date — the gate institutionalises this |
| 10. Token load-bearing (6) | 0 | The open item; moves to 3–6 only when the gate passes on path 1 |
| **Total** | **64 / 100** | |

Two readings of that number. Against the previous CARD plan's 48, the design as specified here is
sixteen points stronger — all of it earned in items 3, 5, 6 and 7, i.e. in restraint mechanics,
which is what this document specifies. Against the study's bands, 64 sits in "sound, with a named
structural weakness": the weakness is named, and it is the same one it has always been. **Items 1
and 10 — twenty points — move only when CARD has a job.** No allocation design can move them.

A third reading matters most: this 64 is the score of the design *as specified*, with timelock and
vesting contracts deployed and verifiable. The identical allocation announced without those
contracts — "we hold 60% and we'll be responsible with it" — scores in the low 40s and, more
importantly, reads to every screener as the standard prelude to a slow rug. The distance between
those two versions of the same allocation is the entire thesis of this document.

## 5a. Scoring the adopted design

The design actually adopted (see the note at the head of this document) differs from the
specification above in one material respect: the 100M held tranche is the founder's, unlocked,
with disclosure and a written sell policy as the mitigation rather than a timelock or vesting
contract. Rescoring only the items that move:

- **Item 7 (machine-enforced constraints), 10 → 5.** The renounce and LP lock remain
  machine-enforced; the treasury Safe is multi-party but the largest retained tranche is
  constrained by policy, not code. Under coding rule R2 (structure over intent), a written sell
  policy scores as a commitment, not a constraint.
- **Item 5 (states weakest item), 8 held.** The adopted materials name the unlocked hold as the
  design's weakest point in plain words, which is exactly what this item rewards. Full marks stand.
- No other item moves.

**Adopted-design total: 59/100** — five points below the specified architecture, eleven above the
prior plan. The five-point gap is the measured price of the flexibility the decision purchases,
and it is a legitimate trade for a founder to make *provided it is disclosed as such*, which the
adopted materials do. What the gap buys back is real: the capacity to respond to a genuine need in
month six that a cliff would have made impossible (§7). What it costs is equally real: every
screener that reads "40% unlocked founder hold" prices future sell pressure into the launch, and
no sell policy, however honestly kept, is checkable in advance. The framework's view is that this
is the single decision most worth revisiting once the demand gate passes — a token that has become
load-bearing in a revenue product justifies, and can afford, the stronger constraint.

## 5b. The burn option: the cheapest route back to the discounted points

Burning supply is worth analysing carefully, because the instinct behind it is correct for a
reason quite different from the one usually given.

**First, the correction.** Burning tokens held *outside* the pool moves the price by exactly
zero. Price is the ratio of the two pool balances (§3a.1); tokens in a founder wallet or a
treasury Safe are not in that ratio, and destroying them does not change it. The widespread
belief that burning supply raises price is, for supply held off-pool, simply false. What a
burn does is remove tokens that could otherwise have been sold — **it removes a downside
rather than creating an upside**, which is precisely what this study's central claim says
verifiable restraint does and does not do (§3a.3 is unaffected: the pool remains the entire
realisable market).

That is not a reason to dismiss the idea. It is the reason to take it seriously, because
removing the downside is exactly the problem §5a docked five points for.

### 5b.1 Two burns that share a name and nothing else

**A per-transfer burn tax should be rejected.** Burning a percentage of every transfer is a
mechanic, not a restraint: it signals nothing about the founder's intent, removes no
overhang, and compounds badly with the 2% treasury fee already in the pending revision.
Round-trip cost would rise from roughly 4.6% to roughly 8.6%, the standard Uniswap sell path
already broken by the existing fee would break further, and every screener that classifies
tokens by tax rate would classify this one unfavourably. It buys a deflationary narrative at
the cost of the clean-mechanics posture the launch strategy deliberately maintains.

**Burning founder supply is the strong form, and it is genuinely available.** It is costly,
irreversible, verifiable by anyone at a block explorer, and differentially expensive for a
founder who intends to extract — which is the exact structure of a separating signal under
this study's framework (§3.2). A founder planning to dump cannot burn, because burning
destroys the thing they would dump. A founder planning to build forfeits only optionality.

**A 5% burn on every sale, specifically.** The most appealing version of the tax burn is one
that falls only on selling — it sounds like it should protect the price, and it does, by an
amount too small to matter. Taking the $100,000 buy-and-hold state from §3a.8 (pool of
2,854,369 CARD and $103,000) and selling 3,000,000 tokens under different tax rates:

| Tax on the sale | Reaches the pool | Seller extracts | Price impact |
|---|---|---|---|
| none | 3,000,000 | $52,781 | −76.2% |
| 2% (current design) | 2,940,000 | $52,261 | −75.7% |
| 5% burn | 2,850,000 | $51,461 | −75.0% |
| 2% fee + 5% burn | 2,790,000 | $50,913 | −74.4% |

**Seven percent of taxation buys 1.8 percentage points of price protection.** The result is
not close, and the reason is structural: price impact is governed by the size of the sale
relative to the depth of the pool, and shaving a few percent off the input barely moves that
ratio. A sell tax cannot fix a depth problem. Only depth fixes a depth problem.

What the 5% does buy is cost to the holder. Round-trip cost for a buyer who later wants out
rises from **4.5%** under the current design to **9.4%** with a 5% sell burn stacked on the
existing fee — approaching the range where screeners classify a token as effectively
untradeable, and where the standard Uniswap sell path (already broken by the 2% fee, per the
review of the pending contract revision) fails more often and more confusingly for ordinary
users.

**The decisive objection is not arithmetic but signalling.** A sell tax higher than the buy
tax is the defining on-chain signature of a honeypot, because asymmetric exit taxation is the
mechanism honeypots use. An honest implementation is indistinguishable from a dishonest one
by inspection — which is precisely the pooling outcome this study says a credible firm must
avoid (§3.2). Adopting it would mean taking the one mechanic that *cannot* separate an honest
issuer from a predatory one and installing it in a project whose entire case rests on that
separation. It moves CARD toward the indistinguishable pool, not away from it.

There is also an exemption problem with no good answer. Someone must be exempt from the burn
or the treasury cannot fund anything. If the exemption covers the founder, the design reads —
correctly — as *retail pays to exit and the largest holder does not*, which is the extraction
pattern this document exists to argue against. If it does not, the founder pays 5% to honour
the sell policy, which is a strange thing to build on purpose.

**The contrast with §5b's recommendation is the whole point, and the two proposals share only
a word.** A one-time burn of founder supply is voluntary, self-imposed, borne by the person
making the promise, and costly precisely to the party whose restraint is in question. A burn
on every sale is involuntary, imposed on others, borne by the buyers the disclosure exists to
protect, and costs the founder nothing. The first is a signal. The second is a fee with a
better name.

### 5b.2 What each burn size does

Founder tranche burned from the 100,000,000 held, worst case being the founder selling
everything remaining into the pool at launch depth:

| Founder keeps | Total supply | FDV | Max self-extraction | Price drawdown | Off-pool overhang ÷ float |
|---|---|---|---|---|---|
| 100M (no burn) | 250M | $7,653 | $1,500 | −75.0% | 1.53× |
| 75M | 225M | $6,888 | $1,286 | −67.3% | 1.28× |
| **50M** | **200M** | **$6,122** | **$1,000** | **−55.6%** | **1.02×** |
| 25M | 175M | $5,357 | $600 | −36.0% | 0.77× |

The last column is the one that matters most, because it is the quantity §3a.6 identified as
the design's real manipulation exposure. At no burn, the tokens sitting outside the pool
outnumber the tradeable float by half again. A 50,000,000 burn brings them to parity; a
75,000,000 burn puts the float in the majority for the first time.

### 5b.3 Effect on the score

§5a's five-point deduction falls on item 7 (machine-enforced constraints), on the reasoning
that the largest retained tranche is governed by a written policy rather than by code. A burn
answers that objection in the strongest available way: **a burned token is not a constraint
on selling, it is the removal of the capacity to sell**, which is the same logical form as the
renounce that item 7 already awards full marks for elsewhere.

Applying Appendix A's rule R2 (structure over intent), item 7 should move materially upward
at a 50,000,000 burn — where the policy-governed tranche no longer exceeds the multisig-
governed one — and further at 75,000,000, where the Safe becomes the dominant retained
tranche. The precise rescore belongs to a coding pass under Appendix A rather than to an
assertion here, but the direction is not in doubt, and **the notable feature is that a burn
recovers those points without a vesting contract at all.** It is strictly stronger than the
timelock architecture §5 specified and §5a recommended revisiting: a timelock delays access,
a burn ends it.

### 5b.4 Four honest costs

1. **It is irreversible in the wrong direction too.** Burned tokens cannot later fund a
   contributor, a listing, a partnership, or an emergency. The flexibility §5a credited the
   unlocked hold with buying is exactly what a burn spends.
2. **It forfeits the founder's own upside permanently.** Today that is a few hundred dollars
   of realisable value, which is why it is cheap to do now — but the real cost is the forgone
   claim on all future value of that supply, and that cost is borne before anyone knows
   whether there will be any. That is what makes it a signal rather than a gesture.
3. **It competes directly with the proposed grants.** The 100,000,000 tranche is one pool of
   tokens with three candidate uses — retain, grant, burn — and they are mutually exclusive
   at the margin. The distributions contemplated in the memo consume 40,000,000 to
   60,000,000 of it. A burn decision and a grant decision are the same decision and should be
   taken together, not sequentially.
4. **It does not touch the demand gate.** A token nobody wants, with less supply, is still a
   token nobody wants. Burning improves the safety of the downside case and the honesty of
   the FDV figure; it moves the central question in §4 not at all.

### 5b.5 Recommendation

If the founder tranche is to be reduced, a burn is the best available use of the reduction on
this framework's terms — better than a timelock, better than a vesting contract, and far
better than a per-transfer burn tax, which should not be adopted. The sequencing that follows
from §5b.4(3) is: settle the grant question with counsel first, then burn a stated portion of
what remains, announce the burn transaction hash alongside the renounce and the LP lock, and
retain the balance under the existing sell policy. A burn executed *before* launch and
disclosed *as* a launch step is worth materially more as a signal than the same burn performed
later in response to pressure.

## 6. Launch protocol deltas

The [launch strategy](TOKEN_LAUNCH_STRATEGY.md) sequence applies with these substitutions:

1. Demand gate: unchanged, still first.
2. Deploy token; verify source. Unchanged.
3. **Deploy the vesting contract; fund it with 50M.** Before the pool exists, so it is visibly a
   setup step. Publish address and schedule.
4. **Transfer 100M to the treasury Safe; queue the timelock module.** Same visibility logic.
5. Create the pool from the released tranche (80–90M CARD + 2–5 ETH); lock LP 12 months.
6. Renounce ownership. Last contract step, before announcing.
7. Announce, leading with the five artifacts: renounce tx, LP lock, treasury Safe + timelock,
   vesting contract + schedule, recovery reserve. Then the weakest-item disclosure, verbatim per
   the strategy document.

The key ceremony, recovery reserve, disclosure, and legal-posture sections of the strategy
document apply without modification.

## 7. Honest limitations

- **This design has not been market-tested.** The claim that schedule-bound retention is read by
  screeners as equivalent to circulation is theory-consistent (companion, §3.4) but empirically
  thinner than the fair-launch evidence; most of the study's clean small launches circulated more.
- **Vesting contracts are code, and code has bugs.** The vesting and timelock contracts join the
  signing path's trust surface. Use audited, widely deployed implementations (e.g. the standard
  OpenZeppelin vesting wallet, Safe with a standard timelock module), not bespoke code.
- **Irreversibility cuts both ways, again.** A 12-month cliff on 50M cannot be shortened if a
  genuine, legitimate need arises in month six. That is the price of the guarantee, accepted with
  eyes open.
- **The score above is self-assigned** by the same single-coder process the companion flags in its
  §13.4. Reasonable recoding moves it several points in either direction; it does not move items 1
  and 10 without a product.

## 8. Conclusion

The 100/100/50 allocation triples the trust CARD asks of the market relative to a fair launch,
and this document's answer is to refuse to ask for it: every retained unit is placed under
contract, schedule, and multi-party control before launch, so that the market is asked to verify
rather than to trust. Done as specified, the design scores 64/100 — the strongest configuration
available to this project short of revenue — and produces a launch whose honest one-line summary
is: *fixed supply forever, pool locked a year, and not one token movable by any single person's
decision.*

What the allocation cannot do is give anyone a reason to buy. The twenty points that separate this
design from the study's institutional band are the same twenty points identified the first time
this project was scored: a product, a customer, an invoice. The treasury now retained is large
enough to fund exactly that work. The framework's last word on CARD is therefore its first one:
the token is finished; the business is the remaining engineering.
