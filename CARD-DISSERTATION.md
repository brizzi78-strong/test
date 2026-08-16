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
