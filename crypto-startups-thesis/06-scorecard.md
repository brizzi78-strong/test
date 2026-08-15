# 06 — A scorecard

The point of a rubric is to force a judgment before the outcome is known. This one is designed to be
answerable from public information about a company you are considering joining, funding, building,
or trusting with assets.

Ten questions. Each scores 0, 1, or 2, multiplied by its weight. The weights sum to 50, so a
perfect score is 100.

## The rubric

| # | Question | Weight | Max | 0 points | 1 point | 2 points |
|---|---|---|---|---|---|---|
| 1 | **Would customers pay if the token/market fell 80%?** | ×7 | 14 | Revenue is emissions, airdrop-driven activity, or own-token appreciation | Mixed; a real product exists but usage tracks price | Customers pay for an outcome they need regardless of price |
| 2 | **Can the company's own losses reach customer assets?** | ×7 | 14 | Commingled or lent against | Segregated by policy, not by structure | Bankruptcy-remote, qualified custodian, no rehypothecation |
| 3 | **Are reserves sized to the worst plausible loss?** | ×6 | 12 | No stated buffer | Buffer sized to routine losses | Excess capital explicitly held against total-loss scenarios |
| 4 | **Is there disclosure beyond what is required?** | ×5 | 10 | None | Periodic marketing-grade updates | Recurring third-party attestation or audit on a fixed schedule |
| 5 | **Does the company state its own weakest line item?** | ×4 | 8 | Not discussed | Acknowledged when asked | Quantified in recurring public reporting |
| 6 | **Is the signing path inventoried and independently verified?** | ×6 | 12 | Single vendor flow, no out-of-band verification | Multisig, but the same UI for all signers | Independent hardware verification; vendor components in the path inventoried and reviewed |
| 7 | **Are constraints machine-enforced or promised?** | ×5 | 10 | "Trust us" | Contractual or policy commitment | On-chain and irreversible: renounced owner, locked LP, timelock/multisig |
| 8 | **Is the regulatory posture licensure or arbitrage?** | ×4 | 8 | Jurisdiction-shopping | Registered where forced | Licensed ahead of requirement in its primary market |
| 9 | **Can the company decline a bad financing or listing window?** | ×3 | 6 | Needs money within 12 months | 12–24 months of runway | Profitable or funded through a full cycle |
| 10 | **Is the token, if any, load-bearing in the product?** | ×3 | 6 | Token is the fundraise | Token has a use but the product works without it | No token, or the token is a required mechanism with disclosed economics |
| | **Total** | **50** | **100** | | | |

**Interpretation.** Above 80: institutionally trustworthy. 60–80: sound but with a named structural
weakness — find it before committing. 40–60: an ordinary startup carrying crypto-specific tail risk
it has not priced. Below 40: the historical base rate applies, and the historical base rate is
death.

Question 2 is effectively disqualifying. A zero there caps the useful score regardless of the rest,
because it is the failure mode with no gradual version.

## Worked examples

Scores are my judgments from public information as of August 2026, not the companies' own claims.
Reasonable people will differ by a band on individual items; the item-by-item breakdown is given so
the disagreement can be located rather than argued in the aggregate.

| | Circle | Coinbase | Bridge | Bybit | Tether | Typical 2026 shutdown |
|---|---|---|---|---|---|---|
| 1. Revenue independence (14) | 7 | 7 | 14 | 7 | 14 | 0 |
| 2. Asset segregation (14) | 14 | 14 | 7 | 14 | 7 | 7 |
| 3. Reserves vs worst loss (12) | 12 | 12 | 6 | 12 | 12 | 0 |
| 4. Disclosure beyond required (10) | 10 | 10 | 5 | 10 | 5 | 0 |
| 5. States weakest line (8) | 8 | 8 | 4 | 8 | 4 | 0 |
| 6. Signing path (12) | 6 | 12 | 6 | 0 | 6 | 0 |
| 7. Machine-enforced constraints (10) | 5 | 5 | 5 | 5 | 0 | 5 |
| 8. Licensure vs arbitrage (8) | 8 | 8 | 8 | 4 | 0 | 0 |
| 9. Can decline a bad window (6) | 6 | 6 | 6 | 6 | 6 | 0 |
| 10. Token load-bearing (6) | 6 | 6 | 6 | 3 | 6 | 0 |
| **Total** | **82** | **88** | **67** | **69** | **60** | **12** |

### Reading the columns

**Coinbase (88)** and **Circle (82)** score highest, and both lose the same 7 points on question 1 —
roughly half of Coinbase's revenue is still transaction-linked, and Circle's reserve income is
interest income, so a rate-cutting cycle compresses it regardless of execution. Coinbase's 6-point
edge is question 6: it has run institutional custody at scale for a decade without a material
breach, and publishes enough about its key architecture to score it. Both lose half of question 7,
because their constraints are legal and audited rather than machine-enforced — USDC in particular
has an upgradeable contract with a freeze function, which is the opposite of irreversible restraint
and is required of it by the regime it chose.

**Bridge (67)** is the case that shows the rubric's bias most clearly. It scores maximum on question
1 and lost 15 points across questions 4, 5, and 6 almost entirely for being private. A company that
returned 5.5x on $58 million in three years scores in the "named structural weakness" band. That is
not a mistake in the reading — it is a limitation of the instrument, stated in the next section.

**Bybit (69)** is the single most informative column. It scores maximum on questions 3 and 4, which
is why it survived the largest theft in the sector's history, and zero on question 6, which is why
it had to. The column is a portrait of a firm that bought exactly one form of insurance and needed
precisely that one.

**Tether (60)** sits mid-band while earning roughly $100 million of profit per employee. That gap is
the entire subject of [Chapter 05](05-counter-thesis.md). The rubric measures durability of access
and the size of the tail, not the size of the profit, and a 60 here should not be read as predicting
the profit will stop.

## What the rubric systematically gets wrong

Three known biases, worth stating so the score is used correctly.

**It under-scores private companies by roughly 10–20 points.** Questions 4 and 5, worth 18 combined,
reward public reporting that a private company has no mechanism to produce. Bridge and Privy both
lose points for the disclosure regime they were never in. The correction is to compare private
companies against each other, not against public ones.

**It measures durability, not return.** A high score predicts that a company will still exist and
still have access to its markets in five years. It says nothing about upside. Bridge scored 67 and
produced the best risk-adjusted outcome in the study; Tether scored 60 and is the most profitable
company per employee in the history of finance. Do not use this to pick investments.

**Question 3 is nearly unreachable for small companies.** "Excess capital held against total-loss
scenarios" assumes a balance sheet. A two-person launch has no way to score 2 on it, which caps
small projects around 88 no matter how well run. Chapter 07 works through what the question
translates to at that scale.

## Using it

The rubric is most useful applied twice: once to a company you are evaluating, and once to your own.
The second application is uncomfortable, which is the reason to do it. Most founders discover they
have scored 2 on question 7 — because locking liquidity and renouncing a contract are cheap,
one-time, and visible — and 0 on question 1, because building revenue that survives an 80% drawdown
is expensive, ongoing, and invisible.

That inversion is the single most common structural error in the sector, and it is the subject of
[Chapter 07](07-application.md).
