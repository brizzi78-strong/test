# 7. Eight propositions

The findings of Chapters 5 and 6 are consolidated here into eight propositions. Each is stated with
its supporting evidence, the cost of adopting it (since a costless prescription cannot be a
separating signal under §3.1), the observation that would falsify it, and its exposure to the
regulatory-timing confound identified in §4.6.

The propositions map to the framework as follows: P1 operationalises C1; P2 and P5 operationalise
C2 and C3; P3 and P4 operationalise C4; P6–P8 concern implementation of restraint under specific
technical, organisational, and financing conditions.

---

## P1 — Revenue must be causally independent of the asset price

**Proposition.** A firm's durability is determined by whether its customers' willingness to pay is
causally downstream of its product rather than of the asset price. (Tests H1.)

**Evidence.** The modal 2026 closure was a token-funded project whose users departed with the
airdrop (§5.2). Against this: Chainalysis and Fireblocks sell to institutions whose demand derives
from legal obligation, which does not soften in a drawdown; Bridge sold payment infrastructure to
SpaceX and the US Treasury; Coinbase raised subscription and services revenue from 29% to 48% of net
revenue in under two years and posted growth through the 2026 drawdown as a result (§6.2).

**Cost.** Enterprise revenue is slow. It requires procurement cycles, security review, and sustained
patience, during which a token-funded competitor will out-perform on every metric investors observe.
The divergence appears years later.

**Falsified by.** A substantial population of firms whose revenue is endogenous to their own token
surviving a full drawdown with operations intact.

**Regulatory-timing exposure.** Low. The proposition holds under any regime.

---

## P2 — Customer assets must be structurally unreachable by the firm's own losses

**Proposition.** Bankruptcy-remote custody without rehypothecation is the highest-value single
control available, and it is inexpensive relative to the loss it prevents. (Tests H2.)

**Evidence.** It is the common factor absent from FTX, Celsius, Voyager and BlockFi, and present in
every large exchange that survived 2022. It is also what permitted Bybit to state that user funds
remained fully backed while $1.5bn sat in an attacker's wallet (§6.7). The discontinuity of these
failures is precisely what Diamond and Dybvig (1983) predict for demandable liabilities against
illiquid assets.

**Cost.** Real and recurring. Segregated assets earn the firm nothing, and competitors lending
against customer balances will out-earn it on identical volume and appear better run until they do
not. The cost is the point: under §3.1 it is what makes the signal separate.

**Falsified by.** Commingled-asset firms typically degrading gradually and recovering, rather than
failing totally and suddenly.

**Regulatory-timing exposure.** Low and falling; the GENIUS Act now mandates a version of it for
stablecoin issuers.

---

## P3 — Publish before you are required to

**Proposition.** Voluntary disclosure and voluntary constraint are the cheapest available means of
purchasing credibility and the most reliable external indicator of internal quality. (Tests H4.)

**Evidence.** Circle's quarterly attestations and licence stack were an expensive minority position
for years and became the precondition for a $1.1bn listing once the category was legitimised (§6.1).
Kalshi's independent reproduction of the pattern in prediction markets (§6.8) is the out-of-sample
replication.

The mechanism is §3.4: a published commitment raises the cost of the firm's own future misbehavior
in a way an unpublished one does not. The strongest form is machine-enforced — a renounced owner, a
locked pool, a timelocked treasury — because enforcement does not depend on a regulator's attention.

**Cost.** Disclosure is irreversible in practice. Publishing quarterly binds the firm during its
worst quarter as well as its best, since ceasing to publish is itself a signal. Firms unprepared to
honour it in a bad quarter should not begin.

**Falsified by.** Firms with minimal voluntary disclosure obtaining equivalent access to regulated
markets and institutional counterparties. Chapter 8 examines the case that comes closest.

**Regulatory-timing exposure.** Moderate. Some of Circle's 2025 payoff was timing; the Kalshi
replication is the principal evidence that the mechanism is not merely that.

---

## P4 — Identify and publish the firm's weakest line item

**Proposition.** Well-run firms can state, and do state publicly, where margin actually originates
and what would remove it.

**Evidence.** Circle discloses that roughly 59% of gross revenue leaves as distribution and
transaction costs — an admission that it rents its distribution — and its 2026 ARC initiative is a
direct response to a number the firm obliged itself to confront (§6.1). Coinbase discloses segment
mix quarterly including the quarters it misses (§6.2).

**Cost.** The firm hands competitors and short-sellers its own analysis of its weakest point.

**Falsified by.** Firms that systematically conceal their principal dependency outperforming
comparable disclosers on durability over a full cycle.

**Regulatory-timing exposure.** None.

---

## P5 — Size reserves to the maximal plausible loss, not the modal one

**Proposition.** Excess capital held specifically against total technical failure is what separates
survivable incidents from terminal ones, and it must exist before the incident. (Tests H3.)

**Evidence.** Bybit absorbed the largest theft in the sector's history and restored withdrawals
within twelve hours because reserves already exceeded liabilities by a sufficient margin (§6.7).
Tether holds $6.3bn of excess reserves against $186.5bn of liabilities for structurally similar
reasons. The closure lists of 2022 and 2026 are populated by firms that sized their buffer to the
average bad day.

This is the practical content of Peters (2019): where the barrier is absorbing, optimising the
expected case is the wrong calculation, because the time-average outcome of a strategy that
occasionally reaches ruin is ruin.

**Cost.** Substantial permanent drag. The capital cannot be deployed and will resemble
mismanagement in every year it is not required.

**Falsified by.** A firm with demonstrated excess reserves failing terminally from a loss within
those reserves, or a firm surviving such a loss on resources assembled after the fact.

**Regulatory-timing exposure.** None.

---

## P6 — The signing path is only as strong as its least-examined component

**Proposition.** Key management fails at organisational seams — vendors, front-ends, integrations —
rather than at the cryptography.

**Evidence.** Bybit's loss ran through a compromised third-party service in the cold-to-warm
transfer flow, with malicious code injected into the signing process; signers approved what they
were shown, and every control functioned while the display lied (§6.7). The FBI attributed the
intrusion to North Korea.

The practices that follow are unglamorous: verify what is signed on a device that did not fetch the
transaction; maintain an inventory of every component in the signing path including vendor
front-ends; require hardware-enforced independent confirmation for large transfers; subject vendor
code in that path to the scrutiny applied to first-party code.

**Cost.** Permanently slows every large transfer and requires staffing an unrewarding function.

**Falsified by.** A pattern of large custody losses originating in cryptographic rather than
integration failure.

**Regulatory-timing exposure.** None; the threat is increasing rather than decreasing.

---

## P7 — Efficiency is an axis, not a virtue

**Proposition.** Headcount discipline creates genuine optionality but is orthogonal to governance
quality and must not be read as evidence of it.

**Evidence.** Tether earns approximately $100m of profit per employee with roughly 100 staff and
cannot list on a US exchange (Chapter 8). Bridge sold for $1.1bn on $58m of lifetime capital with an
entirely different governance profile (§6.3). Both are efficient; the two facts are independent.

Efficiency matters because it purchases C1 independence directly: a small team with real revenue
need not raise into a hostile market or list into a hostile window. Kraken's ability to pause a $20bn
listing in March 2026 followed from holding $800m and no requirement to act (§6.6).

**Cost.** Concentration risk, thin succession, limited capacity to absorb regulatory or security
surprise.

**Falsified by.** A systematic association between low headcount and governance quality in either
direction.

**Regulatory-timing exposure.** None.

---

## P8 — A token is legitimate only where it is load-bearing

**Proposition.** A token is a defensible mechanism where it is required by the product, and a
liability where it is a financing event in product form.

**Evidence.** The two cleanest financial outcomes in the study — Bridge and Privy — issued no token,
captured value in cash, and carried no associated securities exposure (§6.3). The modal failure of
Chapter 5 is a token-funded project whose token *was* the business model. Circle's ARC presale is
the instructive intermediate case: attached to an operating company with disclosed financials, a
specific distribution problem, and a supervisor able to observe all of it.

Where a token genuinely is the product, the discipline is P3's mechanical form: fixed supply with a
renounced owner; liquidity locked for a stated period with a published record; a treasury that is
disclosed, labelled, and purpose-stated before launch rather than after, behind a multisig or
timelock. Each converts an assertion into an artifact (§3.4).

**Cost.** Machine-enforced constraints are irreversible by construction, so genuine errors cannot be
corrected. This is the price of the guarantee and should be understood before the transaction is
signed.

**Falsified by.** Token-financed firms without independent revenue exhibiting survival rates
comparable to revenue-financed peers across a full cycle.

**Regulatory-timing exposure.** High, and this is the proposition most likely to require revision.
The CLARITY Act passed the House 294–134 in July 2025 and cleared Senate Banking 15–9 on 14 May
2026; its final text will determine which structures are commodities and which are securities.

---

## 7.9 The propositions reduce to one trade

The eight are not independent recommendations. Each is an instance of the same move: **the purchase
of a floor under adverse outcomes at the price of defined upside in favourable ones.** Segregated
assets forgo yield. Excess reserves forgo deployment. Enterprise revenue forgoes speed. Disclosure
forgoes flexibility. Renunciation forgoes control. A paused listing forgoes a valuation.

That this trade is favourable in this sector rather than merely prudent follows from the absorbing
character of the downside. Under Peters (2019), where a strategy admits a path to ruin, the
time-average return diverges from the expected return, and a positive-expectation strategy may still
lead to ruin almost surely. The firms in Chapter 6 that survived did not out-guess the market; they
declined the branch of the payoff tree that ends the game.

The reduction to a single mechanism is what gives the framework portability. It is why it can be
applied in Chapter 9 to firms the study did not sample, in Chapter 10 to an entity with no balance
sheet at all, and — as §6.8 demonstrates — to a category that did not meaningfully exist when the
earlier cases resolved.
