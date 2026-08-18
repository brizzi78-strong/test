# 5. The failure base rate

*This chapter reports the first body of findings and tests H1 and H2 (§3.5). Per the design in §4.2,
the failure population is analysed for the absence of specified conditions rather than survivors for
the presence of shared traits.*

Before asking what the best-run companies do, it is worth being precise about what the ordinary
outcome is, because in this sector the ordinary outcome is death and the distribution of causes is
narrower than the folklore suggests.

## 5.1 The raw numbers

Roughly 176 crypto projects shut down in 2025. By late July 2026 the running count for the year was
between 95 and 110, depending on whose list you use
([RootData via Cryptotimes](https://www.cryptotimes.io/2026/08/04/from-bitmex-to-leap-wallet-100-crypto-projects-have-shut-down-in-h1-2026/),
[Cryptopolitan](https://www.cryptopolitan.com/2026-year-of-crypto-shutdowns/)). Notably, the 2026
cohort included centralized exchanges — BitMEX, BitMart, AscendEX — a category that had survived the
2022 collapse largely intact. BitMart's July 2026 notice is worth reading for its candor: the
company concluded that "the business and future market opportunities may not be sufficiently
helpful to continue operations." That is a firm shutting down while solvent because the unit
economics stopped working, which is a healthier failure than the 2022 vintage and a sign the sector
is maturing in at least one respect.

Funding contracted in parallel. Crypto startups raised about $4 billion across 355 deals in Q1 2026,
a 50% decline in capital from the prior quarter
([Galaxy Research](https://www.galaxy.com/insights)). The capital that remained concentrated in
infrastructure and payments rather than consumer applications.

## 5.2 The causes, ordered by frequency

**1. Revenue that was a derivative of the company's own token.** This is the modal failure and it is
not close. The pattern: raise on a token, use the token to bootstrap users through emissions or an
airdrop, report the resulting activity as traction, discover that the activity was rented rather
than owned. The 2026 shutdown reporting is blunt about it — the model "promised token appreciation
after the initial raise" and Web3 products "failed to retain users beyond their initial airdrop
stage." A company in this position has no independent revenue and therefore no ability to survive a
drawdown, because the drawdown reduces both the treasury and the demand simultaneously. The two
failures are perfectly correlated by construction.

This maps directly onto condition C1 as defined in §3.3, and it is why that condition is
listed first.

**2. Commingled or rehypothecated customer assets.** Less frequent, vastly more destructive. FTX,
Celsius, Voyager, and BlockFi are the canonical cases and they share a structure: customer assets
were treated as balance-sheet assets, deployed to earn yield or cover losses, and the gap was only
visible at the moment of a withdrawal run. This failure mode has a distinctive signature — it is
invisible until it is total. There is no gradual version.

What makes it worth its own category rather than a subcase of general fraud is that the control
which prevents it is cheap, well understood, and legally available: hold customer assets with a
qualified custodian in a bankruptcy-remote structure, and do not lend against them. Firms that
implemented that control survived 2022 while sitting next to firms that did not.

**3. Security failures that exceeded the firm's reserve capacity.** Distinct from #2 because the
firm is honest and still dies. A bridge or exchange is compromised for more than its excess capital,
and the shortfall becomes a customer loss, which becomes a run, which becomes a wind-down. The Ronin
and Mt. Gox failures are the archetypes.

Crucially, this is the failure mode that a well-run firm converts into a survivable event by holding
excess reserves against exactly this scenario. Chapter 6's Bybit case is the demonstration: same
attack class, same order of magnitude, opposite outcome, and the difference was entirely
pre-committed balance sheet.

**4. Regulatory termination.** A licence is refused or revoked, or an enforcement action makes the
business uneconomic. This was the dominant fear from 2021 to 2024 and it has receded sharply in the
US since the GENIUS Act. It has not receded elsewhere, and the firms most exposed are the ones whose
compliance posture was jurisdiction-shopping rather than licensure.

**5. Ordinary startup death.** No product-market fit, ran out of money, founders left. Underweighted
in crypto commentary because it is boring, but it is a large share of the 2026 shutdown list —
wallets, analytics tools, NFT platforms and games that simply never found paying customers. These
firms did nothing dishonorable. They were just companies, and most companies fail.

## 5.3 What the ordering implies

The first three causes are all failures of the same underlying thing: the company had no buffer
between a bad day and an existential day. Token-derived revenue means no buffer against price.
Commingled assets means no buffer between the company's losses and the customer's. Insufficient
reserves means no buffer against a breach that the industry's own history says is a
when-not-if event.

The generalization, which the rest of this dissertation elaborates: **well-run crypto companies are
distinguished less by what they do on good days than by how much of a good day they deliberately
give up in order to have a floor under the bad ones.** Every principle in Chapter 7 is a version of
paying for a floor.
