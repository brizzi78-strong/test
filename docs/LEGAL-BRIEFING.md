# Legal Briefing — Cardinals Promise (CARD) Token Launch

> **This is research, not legal advice.** It was prepared to make the
> conversation with a qualified lawyer faster and cheaper, and every claim
> links to the primary source so counsel can verify. Do not launch on the
> basis of this document alone.

## Facts of the planned launch (what counsel will ask first)

- **Issuer residence and tax domicile: North Carolina, United States.**
- Fixed-supply ERC-20 on Ethereum mainnet: **1,000,000,000 CARD** hard cap,
  all minted at deploy to the deployer, ownership renounced once setup is
  complete (no ongoing issuer control over the contract). Planned launch
  date: Saturday, October 4, 2026.
- **An immutable 2% transfer fee.** On every transfer between two
  non-treasury addresses, 2% of the amount goes to a treasury address fixed
  in the constructor and the recipient receives 98%. Transfers to or from
  the treasury are exempt. There is no setter for the rate or the
  destination, no exemption list, and ownership is renounced, so neither
  can ever change. Otherwise the contract is a plain OpenZeppelin ERC-20: no
  mint function, no burn, no blacklist, no pause, no owner-gated functions.
  The fee is the project's only built-in revenue; at 2% it covers small
  fixed costs (LLC, website) if there is trading, and does not come close to
  funding professionals.
- **What a buyer pays:** 2% on the buy (to the treasury), 2% on the sell,
  plus Uniswap's 0.3% each way — about 4.5% for a simple round trip before
  gas, slippage and price impact. This is disclosed as a cost, in those
  terms, everywhere the token is described.
- Allocation:

  | Holder | Amount | Share | Status |
  | --- | --- | --- | --- |
  | Uniswap V2 pool | 400,000,000 CARD | 40% | Seeded from the treasury wallet; LP tokens locked 12 months |
  | **Founder allocation** | **400,000,000 CARD** | **40%** | **Held unlocked, personally, in the deployer wallet** (`0xe01e588d3A4Ef5e088B3438C1A518E9C13a7ED2D`) |
  | Treasury | 200,000,000 CARD | 20% | A single wallet held by the founder — one key, not a multisig (`0xDAE63eBEe60A691e1538D480AE3F6509068ab300`, published on cp17.org); also receives every fee |

- The founder allocation **is held personally and is not locked.** The
  deployer wallet is the founder wallet; no vesting or timelock contract
  exists in the repository. This is a decision, not an omission: the
  mitigation is disclosure and a written sell policy
  (`docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`), not code.
- The treasury is the fee destination baked into the contract. If it is
  ever moved behind a multisig, fees still flow to the original address.
  Any charitable giving is personal, discretionary, and not promised or
  committed to anyone.

- Pool is seeded with roughly $4,000 of ETH. At that size the launch spot
  price is a small fraction of a cent and the pool is thin enough that a
  single sizeable trade moves it materially.
- **No marketing campaign.** Public communications are limited to factual
  disclosures: the contract address, supply, the 2% fee and the round-trip
  cost, the renouncement transaction, the LP lock, the 40% founder
  allocation and the fact that it is unlocked, the treasury address, and
  risk warnings. No price commentary and no growth or return language.
- No pre-sale, no private round, no fundraising, no allocation issued in
  exchange for services or anything else of value. Trading is peer-to-pool
  on a DEX.
- The book and the token are kept separate: buying the book does not provide
  CARD, and buying CARD is not a donation.

## The fact that most needs counsel's attention

**Two facts, and counsel should be told both first.**

1. **The founder holds 40% of total supply, unlocked, personally.** Earlier
   framings in this document are superseded and should not be relied on: it
   once described the launch as involving "no sale by the issuer" (untrue
   once a founder allocation existed at all), and for a period it described
   an 80% allocation locked in a vesting contract. That contract was removed;
   the decision taken is a smaller allocation, held unlocked, governed by
   disclosure and a written sell policy rather than code. Counsel should be
   asked whether a promise a buyer has to trust is an adequate answer to
   "could the issuer sell into its buyers?" and what disclosure it requires.
2. **The contract charges a 2% fee on every trade and sends it to a wallet
   the founder controls.** This is ongoing revenue to the issuer from
   secondary trading, collected by code that the issuer wrote and cannot
   now change. Counsel should be asked whether an issuer-directed fee stream
   changes the *Howey* analysis (a continuing economic interest in trading
   volume), whether it creates income-tax or sales-tax questions in North
   Carolina, and how it must be disclosed.

The combined float is 40% of supply (the pool), with the treasury's 20%
also liquid at the founder's discretion, so the market is thin and easy to
move.

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

1. **Sales by the founder.** The 40% founder hold is unlocked. Any sale from
   it is a sale by the issuer into a market the issuer created, constrained
   only by a written policy.
2. **The fee.** 2% of every trade flows to the founder-controlled treasury.
   That is a continuing economic interest of the issuer in trading volume,
   which counsel may view as bearing on "common enterprise" and "efforts of
   others."
3. **The thin float.** 40% of supply is in the pool; the founder and
   treasury together hold the other 60% liquid. A market that small is easy
   to move, which raises manipulation questions independent of the
   securities analysis and makes the launch price largely notional.
4. **Conduct after launch.** Renouncing contract ownership does not remove
   "efforts of others" if the founder continues to be the project's public
   face. Communications, not code, decide this prong.

Questions for US counsel:

1. Does seeding a DEX pool constitute an "offer or sale" by the deployer
   under Securities Act § 5 — and does it matter that the pool is seeded
   from the treasury wallet rather than the deployer wallet?
2. **Does a 40% allocation held unlocked and personally, governed by a
   written sell policy, create exposure that a lock would have removed?**
   What disclosure must accompany any sale from it?
3. **Does an immutable 2% fee routed to an issuer-controlled wallet change
   the *Howey* analysis?** Is fee income from secondary trading a "profit
   from the efforts of others" in the hands of buyers, or an issuer
   interest that must be disclosed in particular terms?
4. How should the fee be characterised for tax — ordinary income to the
   founder or the LLC on receipt, and at what valuation?
5. With 40% of supply in the pool and the rest liquid in two founder-held
   wallets, does the thin float itself create exposure — market
   manipulation, or a disclosure obligation about price fragility?
6. Does the word "Promise" in the token's name create marketing risk on its
   own, and what disclaimer language mitigates it?
7. State-level (blue sky) and money-transmission exposure — see the North
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

8. If CARD is an investment contract, is any § 78A-16 or Article 3 exemption
   available, and does anything need to be filed with the Securities
   Division?
9. Do the state anti-fraud provisions (e.g. § 78A-10, unlawful
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
deploys contracts, seeds a pool, and transfers from its own holdings.
Money-transmission regimes generally target custody and transmission for
third parties. But the definition should be read against these specific
facts by someone licensed in the state before mainnet.

Question for NC counsel:

10. Do any of (a) seeding a Uniswap pool from the treasury wallet,
    (b) receiving the 2% fee that the contract routes from other people's
    transfers to the treasury, or (c) operating a companion application that
    links users to Uniswap constitute "money transmission" under Article 16B
    requiring licensure? Item (b) is the one to read closely: the issuer
    never holds anything *for* another person, but the contract does take a
    slice of every third-party transfer and deliver it to the issuer.

## The companion application

A separate paper-trading application exists in this repository. It never
receives customer funds, identity documents, or private keys; its optional
real-CARD controls open Uniswap and are disabled behind a feature flag. See
`docs/REAL-PURCHASE-FLOW.md`.

Question for counsel:

11. Does an interface that links to a DEX for a token the operator issued —
    in which the operator holds 40% unlocked and collects 2% of every trade —
    create broker-dealer, exchange, or advice exposure distinct from the
    token questions above?

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

- **Tax.** Pool seeding, LP fees, the 2% fee income arriving in the
  treasury, and any founder sales are taxable events. Two questions need a
  CPA experienced in digital assets *before* launch, not at filing time:
  whether the 600M treasury transfer is itself a taxable transfer, and how
  and when the fee income is recognised (each incoming fee is a receipt of
  property at that moment's value, potentially many per day). Getting this
  wrong is expensive and cannot be undone retroactively.
- **AML.** Converting any holding to fiat runs through exchanges with KYC.
  Keep clean records from day one.
- **Consumer protection.** A disclaimer that the price can go to zero is
  necessary but not sufficient. Counsel should review the final public page,
  particularly its description of the 2% fee (stated as a ~4.5% round-trip
  cost, never softened), the 40% unlocked founder allocation, and the
  single-key treasury.

## Suggested engagement

One consult (1–2 hours) with a lawyer admitted in **North Carolina** who has
securities or digital-asset experience.

Bring:

- this briefing,
- the public disclosure page (`site/index.html`),
- `LAUNCH.md` (the launch runbook),
- `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` (the reasoning behind the
  allocation and the sell policy),
- `contracts/CardinalsPromise.sol` — a few dozen lines, readable in five
  minutes; the `_update` override is the fee.

Lead with the 2% fee flowing to a founder-controlled wallet and the 40%
founder allocation held unlocked. Those are the facts that change the
answers.

If the first lawyer contacted has no digital-asset background, ask whether
the firm can refer one and whether any membership or plan discount applies
to that referral. Afterwards, email counsel your own written summary of what
you were told and ask them to confirm it in writing — that record costs
nothing extra and is worth considerably more than an unrecorded
conversation.
