# Legal Briefing — Cardinals Promise (CARD) Token Launch

> **This is research, not legal advice.** It was prepared to make the
> conversation with a qualified lawyer faster and cheaper, and every claim
> links to the primary source so counsel can verify. Do not launch on the
> basis of this document alone.

## Facts of the planned launch (what counsel will ask first)

- **Issuer residence and tax domicile: North Carolina, United States.**
- Fixed-supply ERC-20 on Ethereum mainnet: **1,000,000,000 CARD** hard cap,
  all minted at deploy, ownership renounced immediately after verification
  (no ongoing issuer control over the contract).
- **No transfer fee.** The contract is a plain OpenZeppelin ERC-20: no fee,
  no mint function, no blacklist, no pause, no owner-gated functions.
- Allocation:

  | Holder | Amount | Share | Status |
  | --- | --- | --- | --- |
  | Uniswap V2 pool | 550,000,000 CARD | 55% | LP tokens locked 12 months |
  | **Founder, personally** | **250,000,000 CARD** | **25%** | **Unlocked** |
  | Treasury | 200,000,000 CARD | 20% | Disclosed wallet |

- Pool is seeded with roughly $4,000 of ETH. At that size the launch spot
  price is a small fraction of a cent and the pool is thin enough that a
  single sizeable trade moves it materially.
- **No marketing campaign.** Public communications are limited to factual
  disclosures: contract address, supply, the renouncement transaction, the
  LP lock, the founder holding, and risk warnings. No price commentary and
  no growth or return language.
- No pre-sale, no private round, no fundraising, no allocation issued in
  exchange for services or anything else of value. Trading is peer-to-pool
  on a DEX.
- The book and the token are kept separate: buying the book does not provide
  CARD, and buying CARD is not a donation.

## The fact that most needs counsel's attention

**The founder holds 25% of supply personally, and it is not locked.** An
earlier version of this briefing described the launch as involving "no sale
by the issuer." That is no longer accurate and should not be relied on.

The current policy is: no founder sales while pool liquidity is below
$100,000; above that threshold, sales follow a public schedule with a small
quarterly cap. **This is a stated policy, not a smart-contract lock.**
Nothing in the code prevents the founder from selling at any time, and a
buyer has only the founder's word.

This single fact drives most of the analysis below, because it converts the
question from "did the issuer sell?" to "when, how, and with what
disclosure will the issuer sell?" Counsel should be pointed at it directly
rather than allowed to discover it in an appendix.

## United States — securities law

The threshold question is whether offers and sales of CARD are "investment
contracts" under the four-part test of
[SEC v. W.J. Howey Co., 328 U.S. 293 (1946)](https://www.courtlistener.com/opinion/8201185/securities-exchange-commission-v-w-j-howey-co/):
an investment of money, in a common enterprise, with a reasonable
expectation of profits, derived from the efforts of others.

Key points from recent litigation:

- Courts have repeatedly emphasized that the **token itself is not the
  security — the manner of sale is what's analyzed**. In
  [SEC v. Binance Holdings Ltd. (D.D.C. 2024)](https://www.courtlistener.com/opinion/9986922/securities-and-exchange-commission-v-binance-holdings-limited/)
  the court applied *Howey* separately to different categories of BNB
  transactions rather than treating the token as inherently a security.
- Private plaintiffs pursue the same theory: the long-running
  [In re Ripple Labs Inc. Litigation (N.D. Cal.)](https://www.courtlistener.com/opinion/10171931/in-re-ripple-labs-inc-litigation/)
  turned on whether purchasers reasonably expected profits from Ripple's
  efforts — promotional statements by the issuer were central evidence.
- The SEC has also charged intermediaries facilitating token markets, e.g.
  [SEC v. Payward, Inc. (Kraken) (N.D. Cal. 2024)](https://www.courtlistener.com/opinion/10294772/securities-and-exchange-commission-v-payward-inc/).

**What this means for CARD as currently designed.** Several *Howey* prongs
are deliberately weakened: no capital is raised by the issuer at launch,
renouncing ownership removes ongoing control over the contract, and no
profits are promised anywhere. Those are real and worth preserving.

The exposure now concentrates in two places, and counsel should be asked
about both explicitly:

1. **The unlocked 25% founder position.** Sales from it are sales by the
   issuer into a market the issuer created. That is the classic fact
   pattern for "offer or sale," and the stated sell policy — a promise
   rather than a lock — may not carry weight against a buyer's claim.
2. **Conduct after launch.** Renouncing contract ownership does not remove
   "efforts of others" if the founder continues to be the project's public
   face. Communications, not code, decide this prong.

Questions for US counsel:

1. Does seeding a DEX pool constitute an "offer or sale" by the deployer
   under Securities Act § 5?
2. **Does holding 25% unlocked, with a published but unenforceable sell
   policy, materially change the analysis — and would a contractual or
   on-chain lock meaningfully reduce exposure?**
3. What disclosure must accompany any founder sale, and does a pre-published
   schedule help?
4. Does the word "Promise" in the token's name create marketing risk on its
   own, and what disclaimer language mitigates it?
5. How should the 200M treasury be handled — lockup, disclosure, donation
   versus market sales?
6. State-level (blue sky) and money-transmission exposure — see the North
   Carolina section below.

## North Carolina — state law

**Blue sky / securities registration.** North Carolina's Securities Act is
[Chapter 78A of the General Statutes](https://www.ncleg.net/EnactedLegislation/Statutes/PDF/ByArticle/Chapter_78A/Article_3.pdf).
The state counterpart to the federal registration requirement is
[N.C.G.S. § 78A-24](https://www.sosnc.gov/divisions/securities/for_securities_professionals),
administered by the Securities Division of the NC Secretary of State.
"Investment contract" is not separately defined by statute in a way that
displaces *Howey*, so the federal analysis above is the starting point, but
state exemptions and anti-fraud provisions apply independently of the
federal ones — a transaction can be federally exempt and still raise state
issues.

Questions for NC counsel:

7. If CARD is an investment contract, is any § 78A-16 or Article 3 exemption
   available, and does anything need to be filed with the Securities
   Division?
8. Do the state anti-fraud provisions (e.g. § 78A-10, unlawful
   representations) reach the project's disclosure page as drafted?

**Money transmission.** This is the North Carolina item most likely to
surprise. Under the
[Money Transmitters Act, Article 16B of Chapter 53](https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_53/Article_16B.html),
"virtual currency" is a defined term in
[§ 53-208.42](https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_53/GS_53-208.42.html),
and North Carolina treats parties transmitting virtual currency for others
as money transmitters requiring licensure. Licensure is not trivial: per the
[NC Commissioner of Banks](https://nccob.nc.gov/financial-institutions/money-transmitters/money-transmitter-frequently-asked-questions),
application runs through NMLS with a nonrefundable filing fee and a surety
bond starting at $150,000.

The likely position — **to be confirmed by counsel, not assumed** — is that
this project does not trigger licensure, because the issuer never holds,
transmits, or exchanges virtual currency *on behalf of another person*: it
deploys a contract, seeds a pool, and transfers from its own holdings.
Money-transmission regimes generally target custody and transmission for
third parties. But the definition should be read against these specific
facts by someone licensed in the state before mainnet.

Question for NC counsel:

9. Do any of (a) seeding a Uniswap pool, (b) holding the treasury wallet,
   (c) transferring tokens to nonprofits, or (d) operating a companion
   application that links users to Uniswap constitute "money transmission"
   under Article 16B requiring licensure?

## The companion application

A separate paper-trading application exists in this repository. It never
receives customer funds, identity documents, or private keys; its optional
real-CARD controls open Uniswap and are disabled behind a feature flag. See
`docs/REAL-PURCHASE-FLOW.md`.

Question for counsel:

10. Does an interface that links to a DEX for a token the operator issued —
    and in which the operator holds 25% — create broker-dealer, exchange,
    or advice exposure distinct from the token questions above?

## European Union — MiCA

Since 30 December 2024, offers of crypto-assets to the public in the EU are
governed by
[Regulation (EU) 2023/1114 (MiCA)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114).
CARD is neither asset-referenced nor e-money, so Title II is the relevant
regime: an "offer to the public" triggers a white paper obligation and
marketing-communication rules.

No EU-directed activity is contemplated. This section is retained only in
case that changes.

1. **Is there an "offer to the public" at all?** Whether pool-seeding plus a
   website constitutes an offer to the public in the EU is a boundary
   question counsel must answer. Title II contains exemptions for offers
   that are free, small, or directed at fewer than 150 persons per Member
   State — whether any applies needs confirmation against the current text
   and the criteria in
   [Commission Delegated Regulation (EU) 2024/1507](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1507).
2. **Marketing communications** targeting EU residents must be fair, clear,
   and not misleading.
3. **Transfer rules**: transfers of crypto-assets are separately subject to
   the recast Transfer of Funds Regulation
   [(EU) 2023/1113](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1113)
   — mostly an obligation on service providers, not issuers.

## Everywhere — the non-securities exposure

- **Tax.** Pool seeding, LP fees, founder sales, and treasury transfers are
  taxable events. The founder position is the significant one: sales are
  ordinary disposals with basis and holding-period consequences that should
  be settled with a CPA experienced in digital assets *before* the first
  sale, not at filing time.
- **AML.** Converting any holding to fiat runs through exchanges with KYC.
  Keep clean records from day one.
- **Consumer protection.** A disclaimer that the price can go to zero is
  necessary but not sufficient. Counsel should review the final public page,
  particularly its description of the founder holding.

## Suggested engagement

One consult (1–2 hours) with a lawyer admitted in **North Carolina** who has
securities or digital-asset experience.

Bring:

- this briefing,
- the public disclosure page (`site/index.html`),
- `LAUNCH.md` (the launch runbook),
- `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` (the reasoning behind the
  allocation and the sell policy),
- `contracts/CardinalsPromise.sol` — about twenty lines, readable in two
  minutes.

Lead with the founder holding. It is the fact that changes the answers.

If the first lawyer contacted has no digital-asset background, ask whether
the firm can refer one and whether any membership or plan discount applies
to that referral. Afterwards, email counsel your own written summary of what
you were told and ask them to confirm it in writing — that record costs
nothing extra and is worth considerably more than an unrecorded
conversation.
