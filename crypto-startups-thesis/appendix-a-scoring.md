# Appendix A — Coding rules and full scoring

This appendix reproduces the coding rules and every item score, so that a reader may recode any firm
and locate disagreement on a specific line rather than in aggregate (§4.5, §13.4).

## A.1 Instrument specification

Ten items, each scored 0, 1 or 2, multiplied by the item weight. Weights sum to 50; the maximum
score is therefore 100.

| # | Item | Condition tested | Weight | Max |
|---|---|---|---|---|
| 1 | Revenue independence | C1 | 7 | 14 |
| 2 | Asset segregation | C2 | 7 | 14 |
| 3 | Reserves vs maximal loss | C3 | 6 | 12 |
| 4 | Disclosure ahead of requirement | C4 | 5 | 10 |
| 5 | States its weakest line item | C4 | 4 | 8 |
| 6 | Signing path inventoried and verified | C3 | 6 | 12 |
| 7 | Constraints machine-enforced | C4 | 5 | 10 |
| 8 | Licensure rather than arbitrage | C4 | 4 | 8 |
| 9 | Can decline a bad window | C1 | 3 | 6 |
| 10 | Token load-bearing | C1 | 3 | 6 |
| | **Total** | | **50** | **100** |

Anchors for each item are specified in [Chapter 9](09-instrument.md) and are not repeated here.

## A.2 Coding rules

**R1 — Absence of evidence is coded as absence.** A firm that does not publish an attestation scores
0 on item 4, not "unknown". This systematically penalises private firms by an estimated 10–20 points
(§9.4, §13.5).

**R2 — Structure over intent.** A firm segregating assets by policy rather than legal structure
scores 1, irrespective of stated commitment. The construct concerns what a firm *cannot* do.

**R3 — Item 2 is quasi-disqualifying.** A score of 0 on item 2 caps the useful interpretation of the
aggregate regardless of other items, because it is the failure mode with no gradual form (P2).

**R4 — Item 10 is bimodal at the top.** "No token" and "token required by the product with disclosed
economics" both score 2. Only the intermediate case — a token existing because financing is easier
than revenue — scores 0.

**R5 — Regulated discretion is not machine-enforced restraint.** A firm retaining freeze or upgrade
powers because its regulator requires them scores at most 1 on item 7. This is a genuine conflict
between items 7 and 8, discussed at §12.3.

## A.3 Full scoring matrix

Points shown are weighted (score × weight), not raw 0–2 codes.

| Item (max) | Circle | Coinbase | Bridge | Bybit | Tether | Modal 2026 closure | CARD plan |
|---|---|---|---|---|---|---|---|
| 1. Revenue independence (14) | 7 | 7 | 14 | 7 | 14 | 0 | 0 |
| 2. Asset segregation (14) | 14 | 14 | 7 | 14 | 7 | 7 | 14 |
| 3. Reserves vs maximal loss (12) | 12 | 12 | 6 | 12 | 12 | 0 | 0 |
| 4. Disclosure ahead of requirement (10) | 10 | 10 | 5 | 10 | 5 | 0 | 10 |
| 5. States weakest line item (8) | 8 | 8 | 4 | 8 | 4 | 0 | 4 |
| 6. Signing path (12) | 6 | 12 | 6 | 0 | 6 | 0 | 0 |
| 7. Machine-enforced constraints (10) | 5 | 5 | 5 | 5 | 0 | 5 | 10 |
| 8. Licensure vs arbitrage (8) | 8 | 8 | 8 | 4 | 0 | 0 | 4 |
| 9. Can decline a bad window (6) | 6 | 6 | 6 | 6 | 6 | 0 | 6 |
| 10. Token load-bearing (6) | 6 | 6 | 6 | 3 | 6 | 0 | 0 |
| **Total** | **82** | **88** | **67** | **69** | **60** | **12** | **48** |

## A.4 Coding notes on contested items

**Circle, item 7 (5/10).** USDC's contract is upgradeable and includes a freeze function. Under R5
this caps the item at 1 despite being a regulatory requirement rather than a governance failure.
This is the clearest instance of items 7 and 8 pulling in opposite directions.

**Circle, item 1 (7/14).** Customers hold USDC for settlement rather than speculation, which argues
for 2. Reserve income is interest income and distribution is concentrated in a single partner
absorbing ~59% of gross revenue, which argues for 1. Coded 1; a reader weighting customer identity
over revenue sensitivity would code 2 and reach 89.

**Coinbase, item 6 (12/12).** Coded 2 on a decade of custody operation at scale without material
breach and published key-architecture detail sufficient to assess. This is the least
directly-evidenced 2 in the matrix.

**Bridge, items 4–6 (15 points lost).** Coded low under R1 as a private company. The acquirer's
diligence is a reasonable substitute signal and is not credited by the instrument. This is the
matrix's clearest illustration of the private-firm bias (§13.2).

**Bybit, item 6 (0/12).** Coded 0 on the firm's own published account: the signing path contained a
third-party component that displayed a transaction other than the one being authorised.

**Bybit, item 10 (3/6).** Coded 1 rather than 2 on historical token affiliations; a reader treating
the exchange as tokenless would code 2 and reach 72.

**Tether, item 4 (5/10).** Attestation by BDO on a recurring schedule earns 1. A completed
financial-statement audit would earn 2; none has been published.

**CARD plan, item 2 (14/14).** Coded 2 because the structure holds no customer assets; there is
nothing to commingle. This is a maximum score earned by absence of the risk rather than by control
of it, and it flatters the total.

## A.5 Reproducibility

Every figure underlying these codes is cited at its point of use in Chapters 6, 9 and 10, with source
hierarchy per §4.4. No score in this matrix depends on non-public information. Coding was performed
by a single analyst with knowledge of outcomes; see §13.4 for the resulting limitation and the design
that would address it.
