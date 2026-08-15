# 11. The gap and the yield

Two questions this study exists to answer, stated bluntly: what does the token path actually return,
and how far is this project from a company that launched successfully?

## The yield on the plan as written

The CARD launch as specified puts 2–5 ETH into a pool alongside 200M tokens, locks the LP for twelve
months, renounces the contract, and publishes the proof links. Cost is the ETH, gas, and a lock fee.

The realistic outcome distribution, from the base rate in [Chapter 5](05-failure-base-rate.md) and
the 2025–26 shutdown data:

- **Most likely.** A handful of buyers trade against the pool in the first days because it is
  scanner-clean and new. Volume decays inside two to six weeks. Twelve months later the LP unlocks
  holding roughly the ETH that went in, minus impermanent loss, and a large number of tokens with no
  bid. The 20% treasury is nominally worth something and practically unsellable, because selling it
  is the thing that ends the price. Net: you get back a fraction of the ETH and spent the time.
- **Tail.** Something catches — a mention, a list, a moment — and the pool briefly supports real
  volume. This is a lottery outcome, not a plan, and the study's own data says it decays too when
  there is nothing behind it.
- **Downside.** The deployer key is compromised during the sequence, or the treasury address was
  wrong when you signed. Both are permanent, both are unrecoverable after the renounce, and both are
  in the current plan's blind spot ([Chapter 10](10-application.md), item 1).

So the expected yield on the token path *by itself* rounds to slightly negative, with a small
lottery attached. That is not a criticism of the plan's execution. The plan is well built. It is a
statement about what the format returns when there is no business behind it, which is what the 2026
shutdown list is a record of.

The yield on the *product* path is a different question with a different answer, and it is the only
one worth optimizing.

## The gap, in five dimensions

Against the companies in [Chapter 6](06-case-studies.md), here is the honest distance.

**1. Revenue: zero, versus any positive number.** This is not a difference of degree. Every firm in
the study that lasted had someone paying it for an outcome before it had anything else notable.
Bridge had paying customers before its Series A. Chainalysis sold to institutions with legal
obligations. Even Tether's $10 billion is float income from people who chose to hold the thing for a
reason. Zero to one paying customer is the entire gap, and everything past the first one is
comparatively easy.

**2. Distribution: none, and no budget for it.** Circle pays out roughly 59% of gross revenue to
rent distribution from Coinbase, and it does that because distribution is the scarcest thing in this
industry. A token launch appears to solve distribution — you can pay people to show up with
emissions or an airdrop — but that is renting attention with an instrument you print, and Chapter 5
is a list of what happens when the rent stops.

**3. Buffer: none.** Bybit survived the largest theft on record because the excess reserves existed
before the attack. This project has no buffer against anything, which means every adverse event is
terminal rather than expensive. That is acceptable at this scale, but it should be known rather than
discovered.

**4. Legal posture: silent.** Every company in the study had one, including the ones that chose
arbitrage. Silence is a position that gets chosen for you later, by someone else.

**5. Concentration — and this is the real one.** This repository contains roughly forty directories:
scheduling, payroll, timeclock, HR, booking, recruiting, tax filing, verification, a book pipeline,
a music app, a care-placement product, an iOS app, and a token. Bridge built one API. Privy built
one thing. Tether does one thing with a hundred people. Kalshi litigated for years over one product
category.

The gap is not talent and it is not code. There is more working software in this repository than
most seed-stage companies have. The gap is that the effort is spread across forty surfaces, none of
which has an invoice attached, and a successful launch company is the same amount of effort pointed
at one surface until someone pays for it.

That is the uncomfortable finding, and it is the only one on this list entirely within your control.

## What closes it

In order:

1. **Pick one.** Of everything in this repo, choose the single product with the most identifiable
   person who has the problem it solves. Care placement and the HR/scheduling tools for small care
   agencies are the strongest candidates, because the buyer is nameable and already spending money on
   the problem.
2. **Charge for it in dollars.** Not a token, not a waitlist, not a free tier with a plan. An
   invoice, to one customer, this quarter. This is the step that converts a portfolio of projects
   into a company, and it is worth more than every other item in this document combined.
3. **Then decide about the token.** With revenue, the question becomes answerable on the merits: is
   the token load-bearing in this product, or is it a fundraise? [Chapter 10](10-application.md)
   notes the asymmetry — having no token scores the same as having an essential one. Only the middle
   scores zero.
4. **Fix the signing path regardless.** Twelve rubric points for an afternoon, and it closes the one
   failure mode in the current plan that is irreversible and total. Do this even if the token never
   launches, because the same key discipline applies to any treasury.

## The honest summary

The token plan is well built and solves the wrong problem. It optimizes for *not being distrusted*,
which it achieves — renounce, lock, verify, disclose is the complete set of moves available at this
scale and the sequencing is right. But nobody is currently distrusting it, because nobody is
currently looking, and the reason nobody is looking is that there is no product with a customer
behind it.

The distance to a successful launch company is one paying customer and the discipline to ignore
thirty-nine of the forty directories until that customer exists. Every company in
[Chapter 6](06-case-studies.md) is a version of that sentence.
