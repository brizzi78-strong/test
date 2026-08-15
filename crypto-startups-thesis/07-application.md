# 07 — Application to a small launch

The preceding chapters are about companies with balance sheets. This one applies the same rubric at
the other end of the scale, to the kind of launch a two-person team can actually execute — using the
[CARD token plan](../TOKEN_LAUNCH_STRATEGY.md) in this repository as the worked example, since it is
specified in enough detail to grade.

## Scoring the plan as written

| # | Question | Score | Why |
|---|---|---|---|
| 1 | Customers pay if price falls 80%? | **0** | The plan has no revenue mechanism. Token demand is the only demand |
| 2 | Company losses can reach customer assets? | **2** | No custody of user assets. Nothing to commingle |
| 3 | Reserves sized to worst plausible loss? | **0** | 2–5 ETH of liquidity; no buffer contemplated |
| 4 | Disclosure beyond requirement? | **2** | Renounce tx, lock URL, and labeled treasury address published at launch |
| 5 | States its own weakest line item? | **1** | The plan names treasury trust as the residual risk, which is honest, but not the demand problem |
| 6 | Signing path inventoried and verified? | **0** | Not addressed. A single deployer key controls every irreversible step |
| 7 | Constraints machine-enforced? | **2** | Renounced ownership, 12-month LP lock, fixed supply, no mint function. Best-in-class for the format |
| 8 | Licensure or arbitrage? | **1** | Neither sought nor evaded; the plan is silent |
| 9 | Can decline a bad window? | **2** | Self-funded, no outside capital, no obligation to launch on any date |
| 10 | Token load-bearing in the product? | **0** | The token is the product |

**Total: 52 / 100.**

That is a genuinely above-average score for a fair-launch token — the modal comparable scores in the
high teens. It earns it in exactly the place Chapter 06 predicted: full marks on question 7, because
machine-enforced constraints are cheap, one-time, and visible.

And it fails in exactly the predicted place too. Zeros on 1 and 10 are the same zero stated twice.
There is no business here that a token is attached to. There is a token.

## The specific finding

The launch plan's own framing is "optimize for being verifiably safe on-chain, so that token
scanners, screeners, and skeptical buyers have nothing to flag." That objective is correctly
specified and the plan achieves it. Renounce, lock, verify, disclose the treasury, announce spends
before they happen — this is the complete list of what an unfunded launch can do to convert promises
into artifacts, and it is well sequenced. Step 3 in particular, moving the treasury allocation
*before* the pool exists so the transfer reads as setup rather than extraction, is a detail most
launches get wrong.

But safety and demand are different problems, and the plan solves only one. A scanner-clean token
with no reason to be bought is a scanner-clean token with no reason to be bought. Every firm in
Chapter 03 that lasted had a customer paying for an outcome; none of them had a purchase reason that
was "the contract is safe."

The 2026 shutdown data is the empirical version of this. The projects that died were not, in the
main, rugs. They were projects whose only demand driver was the expectation of appreciation, and
that expectation is not a demand driver — it is a bet on the existence of a demand driver.

## What would move the score

Two changes, in order of leverage.

**Attach the token to something someone already pays for.** This repository contains a dozen working
applications — scheduling, payroll, timeclock, HR, booking, verification tooling. Any one of them
with paying customers converts question 1 from a 0 to a 2 and question 10 from a 0 to a 1 or 2,
which is 28 points of the total and, far more importantly, changes what the token *is*. A token
attached to a business with revenue has a floor set by the business. A token attached to nothing has
a floor set by sentiment, and sentiment's floor is zero.

The concrete version: charge for one of these products first, in dollars, to customers who need it.
Then decide whether the token is load-bearing in that product — a credit, an access right, a
settlement rail — or whether it is a fundraise. If it is the second, the honest read of this study is
that Bridge and Privy are the relevant models, and both got there without a token.

**Address question 6.** Every irreversible step in the launch sequence — deploy, transfer 50M,
create the pool, lock, renounce — is authorized by one key on one machine. Renouncing ownership
makes a compromise of that key permanent and uncorrectable, which is the same property that makes
the renounce valuable. The mitigations are cheap: use a fresh hardware-backed deployer key that has
never touched a browser wallet, verify the treasury address out of band before the transfer, do the
LP lock and renounce as separate sessions with a re-read of the parameters between them, and put the
treasury behind a Safe multisig rather than an EOA. The plan already lists the multisig as an
optional strengthener. Given that the treasury is the only remaining trust surface after the
renounce, it should not be optional.

## The general lesson, restated at small scale

Chapter 04's through-line was that well-run firms buy a floor by giving up upside. A small launch has
no balance sheet to buy a floor with, so it substitutes machine-enforced constraints — which is
correct, and this plan does it well. But those constraints only floor the *downside from
misbehavior*. They do nothing about the downside from indifference, and indifference is what
actually kills small tokens.

The order that the evidence supports is: revenue first, then a token if the product needs one. The
order that is tempting is the reverse, because the token is a weekend of work and the revenue is a
year. That asymmetry is precisely why the base rate looks the way it does.
