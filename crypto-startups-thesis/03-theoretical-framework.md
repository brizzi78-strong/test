# 3. Theoretical framework

## 3.1 The signaling problem, formally stated

Consider a firm of private type θ ∈ {H, L}, where H denotes a firm that will not appropriate
customer assets or misrepresent solvency and L denotes one that will. Counterparties observe only
the firm's public conduct. Both types can costlessly emit assertions — marketing claims, stated
policies, mission language — so assertions are pooling and convey nothing.

Let the firm choose a level of restraint *r* ≥ 0, understood as the extent to which it irreversibly
forecloses its own future actions. Restraint imposes cost c(r, θ) on the firm. The separating
condition, following Spence (1973), is:

> **∂c/∂r |L > ∂c/∂r |H**

That is, restraint must be strictly more expensive at the margin for the appropriating type than
for the honest one. When this holds, some level of *r* exists that H will adopt and L will not, and
observing *r* is informative about θ.

The condition holds in this market for a specific and somewhat unusual reason. For type H, the
foregone options have low option value, because H did not intend to exercise them: an honest firm
that never planned to lend against segregated customer assets loses only the yield it would have
declined anyway. For type L, the same constraint destroys the business model. Renouncing the mint
function costs an honest issuer nothing it valued and costs a fraudulent one everything.

Three properties are therefore required of restraint before it signals at all, and they define the
construct:

1. **Costly.** It must forgo something of value. A constraint that costs nothing separates nothing.
2. **Irreversible, or reversible only visibly and slowly.** A constraint the firm can quietly
   abandon has no commitment value (Schelling, 1960).
3. **Verifiable by a third party without trusting the firm.** An attestation by an independent
   auditor, a licence held by a supervisor, a transaction on a public ledger. A claim the firm makes
   about itself fails this test by construction.

**Verifiable restraint** is defined as any firm action satisfying all three.

## 3.2 The mechanical case

Public-blockchain settlement makes available a form of restraint that is unusually strong on
properties (2) and (3). Conventional commitments are enforced by law or reputation and can be
breached at a cost. A renounced contract owner is not a promise not to mint; the capability has been
destroyed. Liquidity locked in a time-bound contract is not a pledge not to withdraw; the withdrawal
transaction will revert.

This is the strongest form of the construct, and its availability to firms of any size — including
firms with no balance sheet and no counsel — is a genuine novelty relative to the signaling
literature, which assumes signals are purchased with resources the signaler must possess. Chapter 10
examines what follows from the fact that the cheapest available signal is also the strongest,
including the perverse incentive it creates.

The cost of this strength is symmetric and is stated here rather than left implicit: a mechanically
enforced constraint cannot be relaxed when relaxation is warranted. Irreversibility does not
distinguish between misbehavior and error.

## 3.3 The four conditions

Verifiable restraint is observed across four domains. A firm is treated as well-run to the extent it
satisfies all four simultaneously.

**C1 — Revenue independence.** Identifiable customers pay the firm for an outcome, and would
continue to do so were the firm's token and the broader market to fall by 80%. The test concerns
causal structure rather than magnitude: is revenue downstream of the product, or of the asset price?

This condition is not itself a signal; it is the precondition that makes the other three affordable.
A firm whose revenue is endogenous to its own token cannot sustain costly restraint through a
drawdown, because the drawdown reduces both its resources and its demand simultaneously. The two
failures are perfectly correlated by construction, which is why C1 is stated first.

**C2 — Asset segregation.** Customer assets are held such that the firm's insolvency or trading
losses cannot reach them: bankruptcy-remote structure, qualified custodian, no rehypothecation.
This is bonding expenditure in the sense of Jensen and Meckling (1976), and it converts the
discontinuous failure of Diamond and Dybvig (1983) from possible to structurally impossible.

**C3 — Failure survivability.** Resources are pre-committed — excess reserves, insurance,
independent key architecture — sufficient that the worst plausible technical failure is a bad
quarter rather than a terminal event. The relevant threshold is the maximal loss, not the modal one.
Under Peters (2019), where the barrier is absorbing, expected-value reasoning over the modal case is
the wrong calculation.

**C4 — Disclosure ahead of requirement.** The firm publishes what it is not compelled to publish and
constrains itself in ways it is not compelled to accept.

## 3.4 Why C4 carries the predictive weight

C1–C3 are expensive and largely invisible from outside the firm. C4 is comparatively cheap to
observe and costly to fake, which makes it the informative signal — and, by construction, the one
that reveals the others.

The mechanism is temporal. A firm publishing a reserve attestation on a fixed schedule has bound its
future self. If reserves later cease to cover liabilities, it must disclose that fact, deceive an
auditor, or stop publishing. All three are detectable, and the third is itself a signal. The value
lies not in the document but in the fact that the firm has voluntarily raised the cost of its own
future misbehavior at a moment when it had no obligation to.

This generalises beyond reserves. Each instance converts an unverifiable assertion into a checkable
artifact:

| Assertion | Converted to |
|---|---|
| "We will not mint more tokens" | Renounce transaction, permanently on-chain |
| "We will not withdraw liquidity" | Time-locked LP contract with a public lock record |
| "Customer funds are safe" | Bankruptcy-remote custody with an attestation |
| "We are solvent" | Recurring third-party attestation on a fixed schedule |
| "We are a responsible operator" | Licence held under a supervisor with revocation power |

The left column is available to both types at zero cost. The right column is available cheaply to H
and expensively to L. That asymmetry is the entire theory.

## 3.5 Hypotheses

The framework yields four testable hypotheses, evaluated in Chapters 5–8 and refined into the eight
propositions of Chapter 7.

**H1.** Firms failing C1 will exhibit terminal outcomes at markedly higher rates than firms
satisfying it, and their failures will cluster in market drawdowns.
*Falsified by:* a substantial population of token-revenue-dependent firms surviving a full drawdown
with operations intact.

**H2.** Failures among firms violating C2 will be discontinuous rather than gradual — total loss
with little prior deterioration.
*Falsified by:* commingled-asset firms typically degrading gradually and being observed to recover.

**H3.** Firms satisfying C3 will convert catastrophic technical failures into non-terminal events,
and the determining resources will be observable *before* the event.
*Falsified by:* a firm with demonstrated excess reserves nonetheless failing terminally from a
security loss within those reserves, or a firm surviving such a loss by resources assembled after it.

**H4.** Firms satisfying C4 will retain market access — listings, institutional counterparties,
regulated distribution — at higher rates than firms that do not, *independently of profitability*.
*Falsified by:* firms with minimal voluntary disclosure obtaining equivalent access to regulated
markets and institutional counterparties.

H4 is the discriminating hypothesis. It deliberately predicts access rather than profit, because the
counter-case in Chapter 8 establishes that the framework does not predict profit — a limitation
better stated in advance than discovered.
