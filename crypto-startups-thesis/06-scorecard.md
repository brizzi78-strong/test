# 06 — A scorecard

The point of a rubric is to force a judgment before the outcome is known. This one is designed to be
answerable from public information about a company you are considering joining, funding, building,
or trusting with assets.

Ten questions, weighted. Each scores 0, 1, or 2. Maximum 100.

## The rubric

| # | Question | Weight | 0 points | 1 point | 2 points |
|---|---|---|---|---|---|
| 1 | **Would customers pay if the token/market fell 80%?** | ×10 | Revenue is emissions, airdrop-driven activity, or own-token appreciation | Mixed; a real product exists but usage tracks price | Customers pay for an outcome they need regardless of price |
| 2 | **Can the company's own losses reach customer assets?** | ×10 | Commingled or lent against | Segregated by policy, not by structure | Bankruptcy-remote, qualified custodian, no rehypothecation |
| 3 | **Are reserves sized to the worst plausible loss?** | ×8 | No stated buffer | Buffer sized to routine losses | Excess capital explicitly held against total-breach scenarios |
| 4 | **Is there disclosure beyond what is required?** | ×8 | None | Periodic marketing-grade updates | Recurring third-party attestation or audit on a fixed schedule |
| 5 | **Does the company state its own weakest line item?** | ×6 | Not discussed | Acknowledged when asked | Quantified in recurring public reporting |
| 6 | **Is the signing path inventoried and independently verified?** | ×8 | Single vendor flow, no out-of-band verification | Multisig, but the same UI for all signers | Independent hardware verification; vendor components in the path are inventoried and reviewed |
| 7 | **Are constraints machine-enforced or promised?** | ×8 | "Trust us" | Contractual or policy commitment | On-chain and irreversible: renounced owner, locked LP, timelock/multisig |
| 8 | **Is the regulatory posture licensure or arbitrage?** | ×6 | Jurisdiction-shopping | Registered where forced | Licensed ahead of requirement in its primary market |
| 9 | **Can the company decline a bad financing or listing window?** | ×4 | Needs money within 12 months | 12–24 months of runway | Profitable or funded through a full cycle |
| 10 | **Is the token, if any, load-bearing in the product?** | ×4 | Token is the fundraise | Token has a use but the product works without it | No token, or the token is a required mechanism with disclosed economics |

**Interpretation.** Above 80: institutionally trustworthy. 60–80: sound but with a named structural
weakness — find it before committing. 40–60: an ordinary startup carrying crypto-specific tail risk
it has not priced. Below 40: the historical base rate applies, and the historical base rate is
death.

Question 2 is effectively disqualifying. A zero there caps the useful score regardless of the rest,
because it is the failure mode with no gradual version.

## Worked examples

Scores below are my judgments from public information as of August 2026, not the companies' own
claims. Reasonable people will differ by a band; the exercise is the reasoning, not the number.

### Circle — 88

Strong on 1 (customers use USDC for settlement, not speculation), 2 (segregated, regulated), 4
(recurring attestation, now public-company reporting), 5 (distribution cost disclosed every
quarter), 8 (licensed years ahead of the GENIUS Act). Loses points on 1 for rate sensitivity and
distribution concentration — 59% of gross revenue leaving the building to a single dominant partner
is a real dependency, and the ARC push is the company saying so.

### Coinbase — 86

Strong across 2, 4, 5, 8, 9. Loses on 1 because roughly half of revenue is still transaction-linked,
and part of the "durable" half is itself rate- and price-exposed. The Q2 2026 miss is the honest
evidence: diversification is a buffer, not a hedge.

### Bridge (at acquisition) — 84

Near-perfect on 1 and 10, strong on 9. Unscored on 2 and 3 in the custody sense. Loses on 4 as a
private company, though a $1.1 billion acquirer's diligence is a reasonable substitute signal.

### Bybit — 74

Exceptional on 3, demonstrated under maximum stress, and strong on 5 during the incident. Scores 0
on 6 by its own published account: the signing path contained a third-party component that
displayed a false transaction. Middling on 8. The score is a fair summary of the firm — it survived
because of the one thing it got right, and needed to because of the one thing it did not.

### Tether — 58

Maximum on 1 and 9. Strong on 3. Weak on 4 (attestation is not audit, no completed Big Four audit),
partial on 2 (gold and bitcoin in a dollar-pegged reserve), weak on 8. The number is the point of
[Chapter 05](05-counter-thesis.md): 58 alongside $10 billion of annual profit. The rubric measures
the durability of access and the size of the tail, not the size of the profit, and it should not be
read as predicting the profit will stop.

### A typical 2026 shutdown — 18

Token-funded, users left with the airdrop, no independent revenue, no reserve, no disclosure beyond
a Medium post. Zero on 1 and 3, 0–1 on everything else, 2 on question 7 if liquidity happened to be
locked. This is the modal crypto company, and 18 is roughly the modal score.

## Using it

The rubric is most useful applied twice: once to a company you are evaluating, and once to your own.
The second application is uncomfortable, which is the reason to do it. Most founders discover they
have scored themselves 2 on question 7 — because locking liquidity and renouncing a contract are
cheap, one-time, and visible — and 0 on question 1, because building revenue that survives an 80%
drawdown is expensive, ongoing, and invisible.

That inversion is the single most common structural error in the sector, and it is the subject of
[Chapter 07](07-application.md).
