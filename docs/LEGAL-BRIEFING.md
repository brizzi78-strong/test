# Legal Briefing — Cardinals Promise (CARD) Token Launch

> **This is research, not legal advice.** It was prepared to make the
> conversation with a qualified lawyer faster and cheaper, and every claim
> links to the primary source so counsel can verify. Do not launch on the
> basis of this document alone.

## Facts of the planned launch (what counsel will ask first)

- **Issuer residence and tax domicile: North Carolina, United States.**
- Fixed-supply ERC-20 on Ethereum mainnet: 250M hard cap, all minted at
  deploy, ownership renounced immediately (no ongoing issuer control).
- No sale by the issuer: 80% of supply placed into a Uniswap V2 pool
  (LP locked 12 months), 20% held in a disclosed treasury wallet.
- No promised returns, dividends, staking yield, or buybacks; no
  fundraising round; trading is peer-to-pool on a DEX.
- **No marketing campaign.** Public communications are limited to factual
  disclosures: contract address, supply, the renouncement transaction, the
  LP lock, and risk warnings. No price commentary, no growth or return
  language, no promotional push.
- **Treasury policy: charitable donation only, never sold by the issuer.**
  The 50M treasury allocation is to be distributed to five selected
  nonprofit organizations on a rotating basis, with dated records kept of
  each transfer (recipient, token amount, and fair market value at the time
  of transfer). The issuer does not intend to sell treasury tokens into the
  market at any time. Recipients identified so far: **Goodwill**, **The
  Salvation Army**, and **the Napoleon Hill Foundation**; two further
  organizations are undecided.

The last two facts matter disproportionately. The residual securities risk
in this design was concentrated in marketing conduct and in treasury
disposition; the stated policy on both is the conservative option in each
case. Counsel should confirm the policies are sufficient and advise on how
to document them durably.

## United States — securities law

The threshold question is whether offers and sales of CARD are
"investment contracts" under the four-part test of
[SEC v. W.J. Howey Co., 328 U.S. 293 (1946)](https://www.courtlistener.com/opinion/8201185/securities-exchange-commission-v-w-j-howey-co/):
an investment of money, in a common enterprise, with a reasonable
expectation of profits, derived from the efforts of others.

Key points from recent litigation:

- Courts have repeatedly emphasized that the **token itself is not the
  security — the manner of sale is what's analyzed**. In
  [SEC v. Binance Holdings Ltd. (D.D.C. 2024)](https://www.courtlistener.com/opinion/9986922/securities-and-exchange-commission-v-binance-holdings-limited/)
  the court applied Howey separately to different categories of BNB
  transactions rather than treating the token as inherently a security.
- Private plaintiffs pursue the same theory: the long-running
  [In re Ripple Labs Inc. Litigation (N.D. Cal.)](https://www.courtlistener.com/opinion/10171931/in-re-ripple-labs-inc-litigation/)
  turned on whether purchasers reasonably expected profits from Ripple's
  efforts — promotional statements by the issuer were central evidence.
- The SEC has also charged intermediaries facilitating token markets, e.g.
  [SEC v. Payward, Inc. (Kraken) (N.D. Cal. 2024)](https://www.courtlistener.com/opinion/10294772/securities-and-exchange-commission-v-payward-inc/).

**What this means for CARD's design** (to verify with counsel): the launch
deliberately weakens several Howey prongs — no capital is raised by the
issuer, ownership renouncement removes ongoing "efforts of others," and no
profits are promised. The residual risk concentrates in **marketing**: if
communications create a reasonable expectation that the team's efforts will
raise the price, the analysis worsens regardless of contract design. The
20% treasury is the asset most exposed to a "sale by the issuer"
characterization if it is ever sold into the market.

Questions for US counsel:
1. Does seeding a DEX pool constitute an "offer or sale" by the deployer under Securities Act §5?
2. Does donating treasury tokens to nonprofits (rather than selling them)
   avoid "sale by the issuer" characterization entirely — and can the
   recipients' own subsequent sales be attributed back to the issuer?
3. Does the name "Promise" itself create marketing risk, and what disclaimer language mitigates it?
4. State-level (blue sky) and money-transmission exposure — see the North
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
1. If CARD is an investment contract, is any § 78A-16 or Article 3
   exemption available, and does anything need to be filed with the
   Securities Division?
2. Do the state anti-fraud provisions (e.g. § 78A-10, unlawful
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
deploys a contract, seeds a pool, and donates from its own holdings.
Money-transmission regimes generally target custody and transmission for
third parties. But the definition should be read against these specific
facts by someone licensed in the state before mainnet.

Question for NC counsel:
3. Do any of (a) seeding a Uniswap pool, (b) holding the treasury wallet, or
   (c) transferring tokens to nonprofits constitute "money transmission"
   under Article 16B requiring licensure?

**Charitable donation mechanics.** The treasury policy is charitable
donation of appreciated property, which raises federal tax questions worth
one line of the consult: non-cash charitable contributions above the IRS
threshold generally require a qualified appraisal and Form 8283 substantiation
to support a deduction, and cryptocurrency is treated as property rather
than currency. Counsel or a CPA should confirm the substantiation
requirements before the first transfer, and whether the intended recipients
can accept crypto at all.

## European Union — MiCA

Since 30 December 2024, offers of crypto-assets to the public in the EU are
governed by
[Regulation (EU) 2023/1114 (MiCA)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114).
CARD is neither asset-referenced nor e-money, so Title II ("crypto-assets
other than asset-referenced tokens or e-money tokens") is the relevant
regime: an "offer to the public" triggers a white paper obligation
(drafting, notification to a national competent authority, publication) and
marketing-communication rules.

Points to verify with EU counsel:

1. **Is there an "offer to the public" at all?** The issuer sells nothing;
   liquidity is placed on a DEX. Whether pool-seeding plus a website
   constitutes an offer to the public in the EU is exactly the kind of
   boundary question counsel must answer. Title II contains exemptions for
   offers that are free, small (below monetary thresholds over 12 months),
   or directed at fewer than 150 persons per Member State — whether any
   applies here needs confirmation against the current text and the
   criteria in
   [Commission Delegated Regulation (EU) 2024/1507](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1507).
2. **Marketing communications** targeting EU residents must be fair, clear,
   not misleading, and consistent with the white paper if one is required —
   the site's wording should be reviewed against this standard.
3. **Transfer rules**: transfers of crypto-assets are separately subject to
   the recast Transfer of Funds Regulation
   [(EU) 2023/1113](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1113)
   (the "travel rule") — mostly an obligation on service providers, not
   issuers, but relevant if the project ever touches custody or exchange.

## Everywhere — the non-securities exposure

- **AML**: the issuer holds treasury funds; converting them to fiat runs
  through exchanges with KYC. Keep clean records from day one.
- **Tax**: pool seeding, LP fees, and treasury sales are taxable events in
  most jurisdictions; get the accounting method agreed before launch.
- **Consumer protection**: the site's disclaimer ("price can go to zero, no
  returns promised") is necessary but not sufficient — counsel should
  review the final page.

## Suggested engagement

One consult (1–2 hours) with a lawyer admitted in **North Carolina** who has
securities or digital-asset experience. The three facts that drive most of
the analysis are now settled and stated at the top of this document:
North Carolina residence, disclosure-only communications, and a
donate-never-sell treasury policy.

Bring to the consult:

- this briefing,
- the one-page disclosure site (`site/index.html`),
- `LAUNCH.md` (the launch runbook, including the treasury and LP-lock plan),
- `contracts/CardinalsPromise.sol` — it is about twenty lines and counsel can
  read it in two minutes.

If the first lawyer contacted has no digital-asset background, ask whether
the firm can refer one and whether any membership or plan discount applies to
the referral — the specialization is real, and a generalist will spend
billable time reaching the same starting point this document already provides.

Afterwards, email counsel your own written summary of what you were told and
ask them to confirm it in writing. That record costs nothing extra and is
worth considerably more than an unrecorded conversation if the launch is ever
questioned.
