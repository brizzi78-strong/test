# The AI Verification Gap — and a Working Solution in This Repo

## TL;DR

The biggest exploitable gap in AI today is not generation — it's **verification**.
Models produce code, analysis, and claims faster than humans can check them, so
human review has become the bottleneck and the trust ceiling of every AI
workflow. The highest-leverage thing to build today is systems where **claims
compile to evidence**: every assertion an AI (or a human) makes must be backed
by an executable check that anyone can re-run.

This repo now contains a working demonstration of that pattern, applied to the
domain where unverified claims are most expensive: a token launch.

```
npm run verify
```

runs a **claims ledger** (`verification/claims.json`) that maps every trust
claim from `TOKEN_LAUNCH_STRATEGY.md` — "no mint function", "no transfer tax",
"ownership grants no power" — to executable evidence: ABI-level structural
proofs, example tests, and stateful fuzz invariants. If any claim loses its
backing, the build fails.

---

## Part 1: The Gap

### Generation has outrun checking

Three years ago, the scarce resource in software (and analysis generally) was
producing the artifact. Today a model writes a plausible ERC-20, a legal memo,
or a financial model in seconds. What did *not* get faster is deciding whether
the artifact is **correct** — and correctness is the only property buyers of
high-stakes work actually pay for.

This creates a structural imbalance:

| | Pre-LLM | Today |
|---|---|---|
| Cost to produce an artifact | High | Near zero |
| Cost to verify an artifact | High | **Still high** |
| Ratio of produced : verified work | ~1 : 1 | Widening every quarter |

Every AI-adoption failure mode traces back to this imbalance. "The model
hallucinated" is a verification failure. "We can't put AI code in production"
is a verification failure. "Legal won't sign off on AI output" is a
verification failure. The generation problem is largely solved; the checking
problem is wide open.

### Why review-by-reading doesn't scale

The default answer — "a human reviews the AI's output" — fails for three
compounding reasons:

1. **Volume.** Reviewers face 10–100× more output than before, produced by a
   writer who never gets tired and never pushes back.
2. **Plausibility.** LLM output is optimized to look right. Human review
   evolved to catch human mistakes (typos, omissions, sloppy logic), not
   confident, well-formatted, *specifically wrong* claims.
3. **Asymmetry of attention.** The generator spent seconds; the reviewer must
   spend minutes to be sure. Whoever spends less attention per artifact wins,
   and today that is always the generator.

The conclusion: **review must move from reading artifacts to checking
evidence.** A human cannot reliably read a diff and certify "this contract
cannot mint." A machine can prove it in milliseconds — *if* the claim is
written down in checkable form.

### Why this is the right gap to attack *today*

- **No research required.** Verification harnesses are built from existing
  parts: compilers, fuzzers, static analysis, property-based testing, and —
  where judgment is needed — a second adversarial model pass. The gap is an
  engineering and product gap, not a capability gap.
- **Measurable value.** "Caught N would-be-shipped violations" is a metric.
  Most AI products can't state their value; a verifier can.
- **Willingness to pay already exists.** Smart-contract audits run five to
  seven figures. SOC 2 auditors, financial controllers, and compliance
  reviewers are all paid, today, to be human verification layers. Automating
  the checkable part of their job is selling into an existing budget line.
- **It compounds with generation.** Every improvement in generation *increases*
  demand for verification. This is the rare product whose market grows when
  the underlying models get better.

---

## Part 2: The Solution Pattern — Claims Compile to Evidence

The core idea is a discipline, enforced by tooling:

> **A claim that is not backed by an executable check is treated as false.**

Concretely, a verification harness has four parts:

1. **A claims registry** — every load-bearing assertion about the system,
   written down in machine-readable form, with a pointer to where the claim is
   made (docs, marketing, natspec). This is the contract between what you *say*
   and what the code *is*.
2. **Evidence compilers** — checkers that turn each claim into a pass/fail
   verdict. They come in escalating strength:
   - **Structural** proofs: the capability *cannot exist* (e.g. the compiled
     ABI contains no mint function). Strongest — no execution needed, no
     sampling gap.
   - **Behavioral** examples: the property holds on specific scenarios
     (unit tests).
   - **Stateful/adversarial** evidence: the property survives thousands of
     randomized action sequences (fuzzing, invariant testing) — this is what
     catches the bugs nobody thought to write an example for.
3. **A verifier that fails loudly** — one command, nonzero exit, wired into
   CI. Partial verification reported as success is worse than none.
4. **Drift detection in both directions.** If code changes, claims break
   (a new function trips the write-surface check). If claims change, evidence
   must exist (a claim naming a test that isn't defined fails). Neither side
   can silently walk away from the other.

The human's job changes from *reading everything* to *reviewing the claims
ledger* — a far smaller, far more stable surface. That is the actual fix for
the review bottleneck: shrink what requires judgment, mechanize the rest.

---

## Part 3: What Was Built in This Repo

The CARD launch strategy is explicitly trust-first: its pitch to buyers and
token scanners is "no mint, no tax, no blacklist, no pause, renounced
ownership." Those are exactly the kind of claims that are cheap to make and
expensive to verify by eye — which makes this repo a perfect testbed.

### The pieces

| File | Role |
|---|---|
| `verification/claims.json` | The claims registry: 8 launch-critical claims, each citing its source (strategy doc / natspec) and mapped to evidence |
| `scripts/verify-claims.mjs` | The verifier: builds, inspects the compiled ABI, runs the full test suite, and checks every piece of evidence; nonzero exit on any gap |
| `contracts/CardTokenInvariants.t.sol` | Stateful evidence: a fuzz handler drives random transfer / approve / transferFrom / renounce sequences across 9 actors; three invariants are re-checked after every sequence |
| `contracts/CardToken.t.sol`, `test/CardToken.ts` | Behavioral evidence (pre-existing example tests, now referenced by the registry) |
| `npm run verify` | The one command that does all of the above |

### Evidence types implemented

- **`abi-absent`** — structural proof that a forbidden capability does not
  exist: no function whose name matches `mint`, `burn`, `pause`, `freeze`,
  `blacklist`, … appears in the compiled ABI.
- **`abi-write-surface`** — the exact allowlist of state-changing functions.
  The contract's write surface must be *precisely*
  `approve, transfer, transferFrom, renounceOwnership, transferOwnership`.
  Any new external function — whatever it's called — breaks the
  `owner-powerless` claim until a human consciously re-reviews it. This closes
  the loophole of naming a mint function something innocuous.
- **`solidity-test` / `node-test`** — the named test must both *exist in the
  referenced file* and have *passed in this run*. A deleted or renamed test
  fails the claim even if the suite is green, so evidence can't silently rot.
- **`invariant`** — same, for the stateful suite: properties like
  "total supply never changes" and "balances always sum to supply" are checked
  after 256 randomized multi-call sequences, and the fuzz handler additionally
  asserts exact-amount deltas (the no-tax property) inside every fuzzed
  transfer.

### Proof that it catches what it claims to catch

The harness was mutation-tested before being committed: a disguised mint
function was added to the contract —

```solidity
function issueRewards(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
}
```

Note that nothing named "mint" appears in the external interface. The verifier
still failed immediately, twice:

```
✘ supply-immutable
    ✘ [abi-absent] forbidden function(s) in ABI: issueRewards
✘ owner-powerless
    ✘ [abi-write-surface] write surface drifted — unexpected: issueRewards
✘ 2 claim(s) NOT verified — do not ship, and do not repeat these claims in launch material
(exit code 1)
```

`abi-absent` caught it by substring (`issue` is on the forbidden list), and —
independently — the write-surface allowlist caught it *regardless of name*.
Layered evidence means a single clever rename is never enough to slip through.

### Why this matters for this specific project

Every claim in `TOKEN_LAUNCH_STRATEGY.md` that a scanner, screener, or
skeptical buyer will check is now continuously self-verified. If a future
change — human- or AI-written — quietly breaks a launch promise, `npm run
verify` turns red before the change ships. The launch material and the
bytecode can no longer drift apart unnoticed.

---

## Part 4: How This Generalizes to a Product

The pattern in this repo is ~400 lines and one afternoon of work, but it is a
miniature of a real product category. The generalization:

1. **Claim extraction.** An LLM reads what an organization *asserts* — docs,
   marketing pages, PR descriptions, compliance attestations — and drafts the
   claims registry. Humans approve it once; from then on it's the reviewed
   surface.
2. **Evidence synthesis.** For each claim, generate the strongest available
   checker: a static/structural proof where possible, property-based tests
   where behavior is involved, an adversarial LLM pass where judgment is
   required ("try to construct a counterexample to this claim").
3. **Continuous verification.** Every change re-runs the ledger. Failures
   block the pipeline and name the exact claim that would have become a lie.
4. **Attestation.** The green ledger becomes an artifact you can show
   third parties — auditors, buyers, scanners — with each claim traceable to
   re-runnable evidence rather than a PDF snapshot.

Vertical order-of-attack (by cost-of-error × checkability):

- **Smart contracts** (this repo's domain): claims are public, errors are
  irreversible, and buyers already distrust by default. An AI-assisted
  claims-ledger audit is cheaper than a manual audit and *continuous* rather
  than point-in-time.
- **Compliance & security attestations**: SOC 2 / ISO controls are literally
  claims registries checked annually by hand; most controls are mechanically
  checkable daily.
- **Financial reporting**: reconciliation is claim-vs-evidence by definition.
- **AI-generated code at large**: the same ledger pattern is what lets teams
  accept high-volume AI contributions without review collapse — the reviewer
  certifies invariants once, not every diff forever.

The one-line thesis: **in a world where anything can be generated, the durable
business is proving things.** This repo now practices what that thesis
preaches.
