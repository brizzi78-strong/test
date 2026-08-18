# 10. Application to a small launch

The preceding chapters are about companies with balance sheets. This one applies the same rubric at
the other end of the scale, to the kind of launch a two-person team can actually execute — using the
[CARD token plan](../TOKEN_LAUNCH_STRATEGY.md) in this repository as the worked example, since it is
specified in enough detail to grade.

## 10.1 Scoring the plan as written

| # | Question | Score | Points | Max | Why |
|---|---|---|---|---|---|
| 1 | Customers pay if price falls 80%? | 0 | 0 | 14 | The plan has no revenue mechanism. Token demand is the only demand |
| 2 | Company losses can reach customer assets? | 2 | 14 | 14 | No custody of user assets. Nothing to commingle |
| 3 | Reserves sized to worst plausible loss? | 0 | 0 | 12 | 2–5 ETH of liquidity; no buffer contemplated |
| 4 | Disclosure beyond requirement? | 2 | 10 | 10 | Renounce tx, lock URL, and labeled treasury address published at launch |
| 5 | States its own weakest line item? | 1 | 4 | 8 | Names treasury trust as the residual risk, which is honest, but not the demand problem |
| 6 | Signing path inventoried and verified? | 0 | 0 | 12 | Not addressed. A single deployer key authorizes every irreversible step |
| 7 | Constraints machine-enforced? | 2 | 10 | 10 | Renounced ownership, 12-month LP lock, fixed supply, no mint function |
| 8 | Licensure or arbitrage? | 1 | 4 | 8 | Neither sought nor evaded; the plan is silent |
| 9 | Can decline a bad window? | 2 | 6 | 6 | Self-funded, no outside capital, no obligation to launch on any date |
| 10 | Token load-bearing in the product? | 0 | 0 | 6 | The token is the product |
| | **Total** | | **48** | **100** | |

That is a genuinely above-average score for a fair-launch token — the modal comparable scores around
12. It earns it in exactly the place Chapter 9 predicted: full marks on question 7, because
machine-enforced constraints are cheap, one-time, and visible.

And it fails in exactly the predicted place too. Zeros on 1 and 10 are the same zero stated twice.
There is no business here that a token is attached to. There is a token.

## 10.2 The missing 52 points

Six items are short. They are listed here in order of **points earned per unit of effort**, not in
rubric order, because that ordering is the actual finding.

### 10.2.1 Signing path — 12 points, one afternoon

The best ratio on the board by a wide margin, and the only large item that costs essentially nothing.

Every irreversible step in the launch sequence — deploy, transfer 50M, create the pool, lock,
renounce — is authorized by one key on one machine. Renouncing ownership makes a compromise of that
key permanent and uncorrectable, which is the same property that makes the renounce valuable.

To score 2:
- Generate a fresh hardware-backed deployer key that has never touched a browser wallet or a machine
  used for anything else.
- Verify the treasury address out of band — read it aloud against a second device — before the 50M
  transfer, not after.
- Run the LP lock and the renounce as separate sessions, re-reading every parameter between them.
  The Bybit lesson is that signers approve what they are shown; the defense is to confirm what you
  are signing somewhere that did not fetch the transaction.
- Put the treasury behind a Safe multisig rather than an EOA, with signers on physically separate
  devices.

The plan currently lists the multisig as an optional strengthener. After the renounce, the treasury
is the *only* remaining trust surface in the entire structure. It should not be optional.

### 10.2.2 State the real weakest item — 4 points, one paragraph

The plan names treasury trust as its residual risk. That is honest but it is not the biggest one.
The biggest one is that nobody has a reason to buy this. Say so, in the launch material, in the same
plain register the rest of the document uses: there is no revenue behind this token today, here is
what would have to become true for that to change, here is the date by which we will report on it.

Circle earns its 8 points on this question by publishing the number that most damages it, every
quarter. The small-scale version is the same move and costs a paragraph.

### 10.2.3 Regulatory posture — 4 points, a few thousand dollars

The plan is silent on securities analysis. Silence is not a neutral position; it is a 1. Scoring 2
means a written opinion from counsel on this specific structure — fixed supply, renounced, no yield,
no promises of appreciation — plus a stated jurisdiction and a decision about who may buy.

This item is also the most likely to move under you. The CLARITY Act cleared Senate Banking 15–9 on
14 May 2026 with reconciliation still pending, and its final text will determine which token
structures are commodities and which are securities. An analysis done now should be written to be
re-run when the bill lands.

### 10.2.4 Make the token load-bearing, or delete it — 6 points, a design decision

Note the asymmetry in how question 10 is scored: **"no token" also scores 2.** Killing the token
earns the same 6 points as making it essential. Only the middle position — a token that exists
because a launch is easier than a business — scores 0.

So this is a genuine fork, and both branches score full marks:

- *Load-bearing:* the token becomes a required mechanism in one of this repo's products — a
  prepaid credit for the scheduling or payroll tooling, an access right, a settlement rail between
  parties who need one — with the economics disclosed before launch.
- *No token:* Bridge and Privy are the relevant models. Both captured their value in cash, with a
  fraction of the capital and none of the securities exposure, and both are among the best financial
  outcomes in this entire study.

### 10.2.5 Reserves — 6 points realistically, 12 in theory

For a token launch, "worst plausible loss" does not mean a breach of customer funds, because there
are none. It means the pool is drained by a contract or router bug, or the treasury key is lost.

Scoring 1 (6 points) is achievable: hold ETH back, outside the pool, explicitly earmarked to re-seed
liquidity, and publish the amount and the policy for using it. Scoring 2 requires excess capital
sized to the total loss, which a 2–5 ETH launch does not have and cannot pretend to have. This is
the item Chapter 9 flagged as nearly unreachable at small scale, and the honest ceiling here is 6.

### 10.2.6 Independent revenue — 14 points, a year

The largest single item, last on this list because it is last in effort-efficiency and first in
importance. Everything above is a weekend or a cheque. This one is the actual work.

This repository contains a dozen functioning applications — scheduling, payroll, timeclock, HR,
booking, verification tooling. Charging dollars for one of them, to customers who need it, is what
converts question 1 from 0 to 2. Partial credit is real and worth naming: a product with genuine
recurring usage that still tracks token sentiment scores 1, or 7 points.

## 10.3 The realistic ceiling, and why 100 is the wrong target

Adding it up: 12 + 4 + 4 + 6 + 6 + 14 = 46 of the 52 available. The remaining 6 are the second point
on question 3, which requires a balance sheet this project does not have. **The honest ceiling for a
launch of this size is 94, not 100**, and a plan claiming otherwise would be misrepresenting its own
capital.

More importantly, the ceiling is not the goal. Of the 52 missing points, 32 sit in questions 1, 6,
and 10 — independent revenue, key security, and whether the token is load-bearing. Those three are
the ones that change whether this thing is alive in three years. The other 20 are worth having and
will not save it.

If only one item gets done, it should be question 6, because 12 points for an afternoon of care is
not an offer that appears anywhere else on this scorecard, and because it closes the one failure mode
in the current plan that is both irreversible and total.

## 10.4 The general lesson, restated at small scale

Chapter 7's through-line was that well-run firms buy a floor by giving up upside. A small launch has
no balance sheet to buy a floor with, so it substitutes machine-enforced constraints — which is
correct, and this plan does it well. But those constraints only floor the *downside from
misbehavior*. They do nothing about the downside from indifference, and indifference is what
actually kills small tokens.

The order the evidence supports is: revenue first, then a token if the product needs one. The order
that is tempting is the reverse, because the token is a weekend of work and the revenue is a year.
That asymmetry is precisely why the base rate looks the way it does.
