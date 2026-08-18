# Functional readiness: a thesis and its examination

*Assessed 18 August 2026, against head `e1f7120`.*

## The thesis

The project makes one claim, printed at the top of its own website:

> **A promise you can check.**

Everything else — the fixed supply, the immutable fee, the renounced
ownership, the published wallets, the blunt disclosures — is a mechanism in
service of that sentence. So the functional question is not "does the code
compile." It is:

**For every promise this project makes in public, is there a working
mechanism behind it, and can a stranger verify that mechanism without
trusting anyone?**

This document examines that claim system by system, and separates what has
been *proven* from what is merely *believed*.

## Method, and its limits

Three grades of evidence appear below, and they are not equal.

- **Proven** — executed by machine and currently passing. The repository
  runs a claims harness: `verification/claims.json` maps every public
  promise to executable evidence, and CI fails if any claim's evidence is
  missing, renamed, or failing. This is the strongest grade available here.
- **Reasoned** — derived by arithmetic or by reading source, not executed.
  Correct reasoning about untested behaviour is still untested behaviour.
- **Assumed** — believed on the basis of intent, with nothing behind it yet.

One limitation applies throughout: the development sandbox cannot download
a Solidity compiler, so nothing is compiled locally. **CI is the sole build
of record.** Every "proven" below means "proven by CI on this commit," and
would need re-proving on any commit CI has not seen.

## Findings

### 1. The token contract — PROVEN

46 lines. Fixed supply of 250,000,000 minted once; a 2% fee as a `constant`;
the treasury as an `immutable`; no owner-gated function anywhere, so
renouncing ownership is a real event rather than a gesture.

Evidence: **8 claims**, backed by **10 Solidity tests, 3 invariants, and 6
Node tests**, all passing in CI on the current head. The invariants include
supply conservation and the permanence of renouncing. Static analysis
(Slither 0.11.6, run from the companion session) returned 8 findings, all
informational, none high, medium, or low.

This is the most thoroughly verified component of the project, and it is
also the smallest.

### 2. The verification harness — PROVEN, and the most original thing here

The claims file is the mechanism that makes the thesis true rather than
merely stated. A public promise cannot silently drift from the code,
because the promise and its evidence fail together. This is unusual: most
projects publish assurances and ask for trust. This one publishes
assurances that break the build when they stop being accurate.

If any part of this work deserves to outlive the coin, it is this.

### 3. The website — FUNCTIONAL

Three static pages, no JavaScript, no dependencies, no build step. A page
with no code is a page that cannot be compromised by code, which is a real
security property and not merely an aesthetic one.

Content is honest to an unusual degree: the founder's unlocked holding is
disclosed, the round-trip cost is stated as ~4% rather than the flattering
2%, the buying walkthrough opens by advising against buying, and the front
page says *"If you haven't bought, don't buy"* directly beneath its own buy
button.

Two dependencies remain: DNS for cp17.org is not yet pointed, and the buy
button's deep link cannot be finalised until a contract address exists.

### 4. The launch sequence — REASONED, NOT PROVEN

The scripts exist (`launch-check`, `add-liquidity`, `renounce`,
`rehearse-launch`, `transfer-treasury`). The seeding route is resolved on
paper: a direct deployer-to-pair transfer would be taxed, delivering 98M
instead of 100M and setting the opening price ~2% off intent, so the pool
is seeded deployer → treasury → pair, exempt at both hops.

**But no part of this has touched a real pool.** Three behaviours are
reasoned from router source rather than executed:

- that buys fail at Uniswap's default 0.5% slippage against the 2% fee;
- that sells require the fee-on-transfer router functions;
- that the two-step seed arrives whole.

All three are almost certainly right. None is proven. **This is the largest
technical gap in the project**, and the Sepolia dry run exists to close it.

### 5. The marketplace prototype — NOT FUNCTIONAL, CORRECTLY LABELLED

The hosted prototype is a concept: no wallet, payment, identity, exchange,
or blockchain service is connected, and it says so on every screen. Its
labelling discipline is better than most shipped products.

It is not on the critical path to launching the token, and it should not
become one. Its own blockers — a regulated on-ramp, a wallet provider, a
CARD/USDC pool distinct from the planned CARD/ETH pool, production hosting,
KYC/AML posture — are each larger than everything else in this document.

### 6. Governance and the board — DOCUMENTED, NOT CONSTITUTED

~1,850 lines of decision log, with superseded decisions preserved rather
than erased, which is what makes it trustworthy as a record.

But: **no board has been seated, no member has accepted, no entity exists.**
The five names are candidates. The grants are designed and unissued. The
CPA arrangement is proposed and unsigned.

### 7. Entity, counsel, and tax — NOT STARTED

Cardinals Platform LLC is not formed. No lawyer has reviewed anything. The
board-grant tax exposure — vesting tokens are compensation, and recipients
may owe cash tax on illiquid paper — has not been put to the CPA.

## What is proven versus what is assumed

The uncomfortable summary: **the components that are most rigorously proven
are the ones that matter least to whether this succeeds, and everything
that gates launch is human, legal, or financial rather than technical.**

The contract will work. Whether the project should exist, whether the
entity is formed correctly, whether the board members understand their tax
exposure, whether counsel approves the structure — none of that is a
software problem, and none of it is done.

## Failure modes, ranked

1. **Launching before counsel.** Everything else is recoverable. This is
   the one that ends badly and cannot be undone by a commit.
2. **Board members receiving a tax bill for tokens they cannot sell.**
   Real, specific, and avoidable only before grants are issued.
3. **The two properties disagreeing about what CARD is.** cp17.org says
   souvenir, don't buy. The marketplace prototype says currency, utility,
   value you can put to work. A complainant quotes whichever is worse.
4. **Fee-on-transfer behaviour failing in the wild.** Every first buyer
   hits a failed transaction and concludes the token is broken.
5. **Reputational coupling to the book.** The asymmetric risk: the coin can
   damage the memoir far more than the memoir can help the coin.

## Critical path

Ordered, with dependencies:

1. Counsel reviews token structure, entity, and the marketplace's claims.
2. Form the entity; clear the "Cardinal" trademark question before filing.
3. CPA rules on board-grant taxation. Only then, offer grants.
4. Seat the board; get written acceptances.
5. Sepolia dry run: seed a real pool, buy, sell, verify all three reasoned
   behaviours above.
6. Point DNS; publish the site.
7. Deploy, seed via the two-step route, lock liquidity, renounce.
8. Fill in the ledger; send the one launch email.

The marketplace is not on this list. It resumes after step 8, if at all.

## Verdict

**The machine works. The business does not exist yet.**

The thesis — *a promise you can check* — is presently true of every promise
the code makes, and untrue of nothing. That is a genuine achievement and
it is verifiable by anyone with a browser.

It is also not the hard part. The hard part is steps 1 through 4, all of
which require other people, and none of which can be done by writing more
code.
