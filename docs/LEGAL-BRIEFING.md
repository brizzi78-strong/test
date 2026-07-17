# Legal Briefing — Cardinals Promise (CARD) Token Launch

> **This is research, not legal advice.** It was prepared to make the
> conversation with a qualified lawyer faster and cheaper, and every claim
> links to the primary source so counsel can verify. Do not launch on the
> basis of this document alone.

## Facts of the planned launch (what counsel will ask first)

- Fixed-supply ERC-20 on Ethereum mainnet: 250M hard cap, all minted at
  deploy, ownership renounced immediately (no ongoing issuer control).
- No sale by the issuer: 80% of supply placed into a Uniswap V2 pool
  (LP locked 12 months), 20% held in a disclosed treasury wallet.
- No promised returns, dividends, staking yield, or buybacks; no
  fundraising round; trading is peer-to-pool on a DEX.

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
2. How should the 50M treasury be handled (lockup, disclosure, OTC vs. market sales)?
3. Does the name "Promise" itself create marketing risk, and what disclaimer language mitigates it?
4. State-level (blue sky) and money-transmission exposure?

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

One consult (1–2 hours) with a crypto-specialized lawyer in your country of
residence, bringing: this briefing, the one-page site, LAUNCH.md, and the
answers to (a) where you live and pay tax, (b) where you'll market, and
(c) what the treasury will be used for. Those three facts determine most of
the analysis above.
