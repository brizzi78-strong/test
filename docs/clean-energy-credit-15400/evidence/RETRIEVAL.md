# Evidence retrieval kit

For confirming the advertising claims in Chapter 11 §11.4.6 (Tesla and the Model Y) and §11.4.4 (the lease channel) against primary captures.

## Why this kit exists

The dissertation was researched in a sandboxed environment whose network policy blocks outbound HTTP to general hosts. Every attempt to reach `web.archive.org`, `archive.ph`, `timetravel.mementoweb.org`, `tesla.com`, and `forbes.com` failed at the CONNECT stage. Only a search tool was available, which returns result summaries and links rather than page content or images.

Consequently **no advertising claim in §11.4.6 has been confirmed against a capture.** All of it rests on secondary reporting. This kit exists so that confirmation can be done in one sitting on a machine with ordinary internet access.

Run `./fetch-captures.sh` from this directory. It queries the Wayback availability API for the capture nearest each target date, downloads both the toolbar-injected and raw versions, and writes the capture timestamp to a sidecar file, since the timestamp is what makes a capture citable.

## Checklist of claims to confirm

Each row corresponds to an assertion in the text. Mark confirmed, corrected, or unfound, and record the capture timestamp against each.

### Group A — the 2019 gas-savings precedent

| # | Claim | Where to look |
|---|---|---|
| A1 | Tesla's US site displayed prices net of estimated fuel savings and incentives | `tesla.com/model3` and `/models`, captures from 2018–2019 |
| A2 | Wettbewerbszentrale required the practice to stop in Germany, deadline March 20, 2019 | German trade press; Wettbewerbszentrale releases; Reuters/Euronews March 2019 |
| A3 | Tesla's German site showed base price only by March 8, 2019 | `tesla.com/de_DE/model3`, captures early March 2019 |
| A4 | Tesla retained gas-savings pricing on the US site after the German change | `tesla.com/model3`, captures mid-March 2019 onward. Forbes, March 10, 2019 |

A3 and A4 together are the comparative finding. Capture both sites within the same week to make the contrast unambiguous.

### Group B — the display record, 2022–2025

| # | Claim | Where to look |
|---|---|---|
| B0 | Pre-2023 landing pages showed price net of "probable savings" / "potential savings", the dialog breaking it into ~6 years of estimated gas savings **plus** the full $7,500 credit | `tesla.com/model3`, `/modely`, captures 2022 through early 2023 |
| B1 | Tesla's US site began showing actual purchase price up front | Captures early 2023; InsideEVs coverage |
| B2 | **June 8, 2023**: Model 3 and Model Y pages again showed prices after the federal credit, while the configurator showed price normally | Captures bracketing June 8 2023, both the model landing page and the design/configurator page |
| B3 | Configurator hierarchy: actual price first, larger and bolded; potential-savings figure below, smaller and greyed | Configurator captures, any date 2023–2025 |
| B4 | July 2023 configurator note that a credit reduction was "likely" after Dec 31 | `tesla.com/modely` and `/model3`, July 2023 |
| B5 | Disclosure text: "Eligible customers who take delivery of a qualified new Tesla and meet all federal requirements are eligible to receive $7,500 off the purchase price", applied at time of delivery | Captures 2024; search page HTML for "meet all federal requirements" |
| B6 | 2023 Model Y at $47,240 "for qualifying buyers"; 2024 Model Y at $40,490 "for qualified buyers"; LR AWD $48,490 less $7,500 = $37,080; all new 2024 Model Y at $43,990 | Captures 2023–2024; cross-check against contemporaneous deal listings |
| B7 | Credit-inclusive price front and centre in bold on the **inventory** page, before click-through | `tesla.com/inventory/new/my`, captures Nov 2024 |

**B2, B3, and B7 together are the most important rows in this kit**, and they are why §11.4.6 was rewritten. The claim in the chapter is no longer that Tesla headlined the inclusive price. It is that Tesla ran *different prominence conventions on different surfaces at the same time*: actual-price-first on the configurator, credit-inclusive-first on the landing and inventory pages. That is a specific, falsifiable claim about three distinct pages, and it can only be settled by capturing all three from the same week.

Capture at full width. Record where the qualifying language sat relative to the price, and how many clicks deep it was.

Record exact strings. "For qualified buyers", "for qualifying buyers", and "meet all federal requirements" all appear in the sources, and the differences matter to the legal analysis.

### Group B2 — the February 2023 MSRP reclassification

| # | Claim | Where to look |
|---|---|---|
| BB1 | Treasury reclassification raised the applicable MSRP cap for certain crossovers from $55,000 to $80,000 | Treasury/IRS releases, Feb 2023 |
| BB2 | Tesla raised the Model Y price within days of the reclassification | `tesla.com/modely` captures bracketing early Feb 2023; CNBC and Fortune, Feb 4 2023 |

This group supports the counter-evidence on incidence now in Chapter 6. It is the one clean instance of apparent **seller capture** in the record, and it cuts against the pass-through reading suggested by the October 2025 evidence. Capture the price immediately before and immediately after the reclassification. The magnitude of the increase relative to the $25,000 of new headroom is the quantity of interest.

### Group C — the deadline banners, 2025 and 2018

| # | Claim | Where to look |
|---|---|---|
| C1 | "Order by September 30 to Qualify" added to the homepage federal tax advertisement | `tesla.com`, captures Sept 2025, especially the final week |
| C2 | Published clarification that orders placed Sept 30 qualified with no delivery required | Tesla support or order pages, late Sept 2025 |
| C3 | **2018 precedent**: Tesla passed 200,000 cumulative sales in the quarter ending Sept 30 2018; told customers to order by **October 15, 2018** for year-end delivery and the full $7,500 before the step-down to $3,750 | `tesla.com` captures Oct 2018; CBS, NBC, The Drive, TechCrunch, Oct 2018 |

This group supports Chapter 7's argument that the running variable at the September 30, 2025 threshold was deliberately manipulated. C1 is the evidence that the bunching was produced by advertising rather than discovered after the fact. Capture as many days of the final week as available: the date the banner appeared is itself informative about when the push began.

C3 is new and it carries the most research value in this kit. The 2018 event is a structurally similar deadline under the pre-transfer regime, when the credit was deferred, liability-limited, and invisible at the point of sale. Comparing the two bunching episodes isolates the effect of salience on deadline response, which is close to a direct test of the dissertation's central claim. See Chapter 7, Design 3b. Note the asymmetry when capturing: the 2018 deadline was Tesla's own order cut-off, self-imposed to manage delivery against a December 31 placed-in-service requirement, not a statutory date.

### Group D — October 2025 and after

| # | Claim | Where to look |
|---|---|---|
| D1 | Model Y Standard introduced Oct 7, 2025 at $39,990 | `tesla.com/modely`, captures Oct 2025; Bloomberg Oct 7 2025 |
| D2 | Roughly $5,000 below the renamed Premium trim | Same captures |
| D3 | Content deletions: 7 speakers not 15, no AM/FM, no rear screen, textile seats, manual vents/mirrors/wheel adjust, no ventilated front or heated rear seats | Tesla spec pages, Oct 2025; Cars.com and Automotive World reporting |
| D4 | Gas savings display removed from the US site, March 2026 | `tesla.com/modely`, captures Feb and Mar 2026, to bracket the change |

D3 is what supports the quality-adjusted-price argument that now runs through Chapters 6, 7, and 9. It needs the specification pages before and after, not the price alone. Capture the full option and specification listing for the outgoing trim and the Standard trim.

D4 should be bracketed: find the last capture showing the savings display and the first capture without it. If the change falls after March 13, 2026, note it and still do not assert causation with the FTC letters, for the reasons given in the text.

### Group E — the lease channel

| # | Claim | Where to look |
|---|---|---|
| E1 | Hyundai advertised a "$7,500 EV Lease Bonus" on an Ioniq 5 not assembled in North America | `hyundaiusa.com` offers pages, 2024 captures; regional dealer sites |
| E2 | Tesla lease pricing incorporated the §45W credit | `tesla.com/modely` design and lease pages, 2024–2025 |
| E3 | Tesla lease-end purchase policy by model and period | Tesla lease agreements and support pages; asserted only tentatively in the text |

E1 is the concrete example named in §11.4.4 and it is currently carried on a single secondary source. Either confirm it against the advertisement or replace it with a confirmed example before it appears in a submitted version.

E3 is the weakest claim in the chapter. If it cannot be confirmed, cut the sentence rather than soften it further.

## Other routes if the Wayback API is thin

- **Wayback CDX API** for a full capture index rather than the nearest match:
  `https://web.archive.org/cdx/search/cdx?url=tesla.com/modely&from=2024&to=2025&output=json&collapse=digest`
  Collapsing on digest removes consecutive identical captures, which makes it easy to find the dates on which the page actually changed. That is the fastest way to locate the exact day the September banner appeared or the savings display vanished.
- **Internet Archive full-text search** across archived pages for the advertised strings.
- **Enthusiast forums and subreddits** from the relevant weeks often carry user screenshots of configurator and inventory pages. Lower evidentiary weight than an archive capture, but useful for locating dates to then target in the CDX index.
- **Tesla investor relations** for pricing announcements, and the quarterly update decks around Q3 and Q4 2025 for the company's own framing of the credit expiry.
- **The FTC** for the March 13, 2026 warning letters. If the recipient list is public, confirming whether Tesla was or was not on it resolves the question flagged in §11.4.6 and Appendix E.

## Recording conventions

For every confirmed item, record in the chapter or in a footnote:

- the archived URL including the timestamp path segment
- the capture timestamp in UTC
- the date of retrieval
- the exact advertised string, quoted

For every item that cannot be confirmed, either cut the claim or restate it in the text as reported rather than established, and move the entry to the negative-findings list in Appendix E §11.6 conventions.

## A note on running this elsewhere

If the retrieval is to be done by an agent rather than by hand, it needs an environment whose network policy permits outbound HTTP to `archive.org` and `web.archive.org`. The policy is chosen when the environment is created; see the Claude Code on the web documentation at https://code.claude.com/docs/en/claude-code-on-the-web for how environments and their network policies are configured.
