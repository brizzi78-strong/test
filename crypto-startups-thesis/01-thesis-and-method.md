# 01 — Thesis, definitions, and method

## The question, stated precisely

"Which crypto startups are best run?" is a question about process, but almost everyone who asks it
answers with outcomes. They name the companies that got big. This is a mistake, and in crypto it is
a particularly expensive mistake, because the sector has produced more large, admired, well-funded
companies that later turned out to be frauds than any other technology sector of the last twenty
years. In November 2022, a reasonable person compiling a list of the best-run crypto companies would
have put FTX near the top. It had revenue, growth, brand-name investors, a regulatory strategy, and a
founder testifying before Congress about consumer protection.

So the thesis has to be about something observable *before* the outcome is known. That is the
constraint this study accepts.

## Definition of "well-run"

A crypto company is well-run to the extent that it satisfies four conditions simultaneously:

**1. Revenue independence.** Some identifiable set of customers pays the company for something, and
would continue paying if the company's own token, or the broader market, fell 80%. The test is not
"is the revenue large" but "is the revenue causally downstream of the company's product rather than
of the asset price."

**2. Asset segregation.** Customer assets are held such that the company's own insolvency, or its own
bad trade, cannot consume them. In practice this means bankruptcy-remote custody, no
rehypothecation, and reserves that are attested by someone with a license to lose for lying.

**3. Failure survivability.** The company has pre-committed resources — excess reserves, insurance,
an incident process, a key-management architecture with no single point of compromise — sufficient
that the worst plausible technical failure is a bad quarter rather than an extinction event.

**4. Disclosure ahead of requirement.** The company publishes things it is not yet compelled to
publish, and constrains itself in ways it is not yet compelled to accept. This is the condition that
does the most predictive work, for reasons argued below.

A company can be enormously profitable while failing three of the four. Chapter 05 is about one.

## Why disclosure-ahead-of-requirement is the load-bearing condition

The other three conditions are expensive and mostly invisible from the outside. Disclosure is the
one that is cheap to verify and costly to fake, which makes it the useful signal.

The mechanism is straightforward. A company that publishes a reserve attestation every quarter has
bound its future self. If the reserves later stop covering the liabilities, it must either publish
that fact, stop publishing, or lie to an auditor. All three are detectable. The value of the
commitment is not the document; it is that the company has voluntarily raised the cost of its own
future misbehavior.

This generalizes past reserves. Renouncing a token contract's ownership means nobody can ever mint
more, and the renounce transaction is a permanent, checkable artifact. Locking liquidity for twelve
months means the pool cannot be pulled, and the lock is a public contract. Segregating customer
assets in a qualified custodian means the company cannot quietly borrow from them at 3am during a
liquidity squeeze — which is, in the well-documented cases, exactly when firms do it.

In each case the company converts "trust us" into "verify it." In an industry where the marginal
customer has already been defrauded once, that conversion is the highest-return marketing spend
available, and it is denominated in restraint rather than dollars.

## Method

**Sample.** Roughly two dozen firms, chosen to include:

- every crypto-native company that completed a US listing in 2025–26 (Circle, Bullish, Gemini,
  Figure), because listing forces disclosure that private firms can withhold;
- the largest private infrastructure firms by capital raised (Fireblocks, Chainalysis, Alchemy,
  Anchorage, Kraken);
- the two acquisition outcomes that repriced the sector's exit expectations (Bridge, Privy);
- the two prediction-market firms, as the clearest 2026-vintage test of whether the pattern
  generalizes to a new category;
- Tether, as the deliberate counterexample;
- a control group of firms that failed, drawn from the 2025–26 shutdown lists.

**Evidence.** Public filings and press releases where they exist; reputable trade and financial
press otherwise; on-chain data where it settles a question that reporting does not. Private-company
valuations and revenues are reported as ranges because the underlying reporting disagrees, often by
a factor approaching two.

**The survivorship problem, and what I did about it.** Studying survivors and inferring what caused
survival is the standard error in this genre. Two partial corrections are applied.

First, the control group is read for *absence* rather than presence. Rather than asking what the
survivors did that the dead did not, which any sufficiently long list will answer trivially, the
dead are examined for which of the four conditions they failed. That produces a much shorter and
more useful list, because the failures cluster hard: nearly all of them fail condition 1 or
condition 2, and the ones that fail condition 2 fail catastrophically rather than gradually.

Second, the thesis is stated so that it can be wrong. Chapter 05 identifies the observation that
most damages it — a firm that fails conditions 2 and 4 by any reasonable reading and is nonetheless
the most profitable company per employee in the history of financial services — and works out what
survives that observation and what does not. What survives is narrower than the thesis I started
with.

**What this study cannot do.** It cannot tell you whether a specific private company's controls are
real, because controls are only observable through disclosure and disclosure is what private
companies economize on. It cannot distinguish luck from skill in any individual case; the sample is
far too small and the sector's returns are far too fat-tailed. And it is written from inside a
period — mid-2026 — in which US federal law has just been rewritten in the sector's favor. Some
portion of what looks like operating discipline in the 2025–26 winners is regulatory timing that
happened to land right. Chapter 04 flags the specific findings most exposed to that.
