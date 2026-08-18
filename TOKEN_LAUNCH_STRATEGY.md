# CARD Token Launch Strategy

Launch plan for the CARD token: 250M fixed supply, Uniswap fair launch, trust-first design.
Every decision below optimizes for two things, in this order: **giving someone a reason to hold
CARD**, and being verifiably safe on-chain so that token scanners, screeners, and skeptical buyers
have nothing to flag.

This revision incorporates the findings of the [verifiable-restraint study](crypto-startups-thesis/README.md)
in this repository. The prior version of this plan solved trust and ignored demand; the study's
scoring of that version ([48/100, with the missing points enumerated](crypto-startups-thesis/10-application.md))
drives every change below.

**Allocation:** supply is allocated 100M pool / 100M founder-held / 50M treasury. The governance
decisions behind that split — including the deliberate choice to hold the founder tranche unlocked —
are recorded in [`docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`](docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md),
which governs where documents differ. The [`CARD-DISSERTATION.md`](CARD-DISSERTATION.md) companion
analyses this design under the study's framework, including what the unlocked hold costs on the
scorecard and the timelock/vesting architecture it recommends instead.

## Launch Gate — the demand test (comes first)

The study's central empirical finding: the modal dead crypto project of 2025–26 was
scanner-clean, honestly run, and had no reason to be bought. Trust mechanics floor the downside
from *misbehavior*; nothing below floors the downside from *indifference*. So the launch is gated:

**CARD does not launch until one of the following is true:**

1. **Load-bearing:** CARD is a required mechanism in one shipping product from this repo with at
   least one paying customer — a prepaid credit, an access right, or a settlement unit — with the
   economics written down and published before launch. *Or*
2. **Deliberate experiment:** we launch anyway, and say so plainly in the announcement (see
   Disclosure below), with expectations set to match: this is an experiment attached to a mission,
   not an investment attached to a business.

Path 1 is the goal. Path 2 is permitted only because pretending an experiment is a business is the
one dishonesty this plan refuses. "No token yet" is also an acceptable outcome of this gate — the
study found no-token outcomes (Bridge, Privy) were the sector's best risk-adjusted results.

## Decision Summary

| Decision | Call | Rationale |
|---|---|---|
| Launch condition | **Demand gate above must pass** | Indifference, not rugging, is what kills small tokens |
| Supply at launch | Mint all 250M, then **renounce ownership immediately** | "Nobody can ever print more" is the single strongest trust signal a small token can have, and it costs nothing |
| Into the Uniswap pool | **100M CARD (40%)** | The tradeable float. Halving it from the original 200M doubles the launch price but does not deepen the book — see the slippage table in `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Founder-held | **100M (40%), unlocked, in a disclosed wallet** | Decision taken: no timelock. This is the weakest point in the design and it is deliberate. Mitigation is disclosure plus a written sell policy, not code — see `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Treasury | 50M (20%) behind a Safe multisig, publicly announced | Any more looks extractive; label it, and require more than one signature to move it |
| ETH into the pool | **2–5 ETH** to start | Enough that a few-hundred-dollar buy doesn't spike the price ~20%; small enough not to risk savings on an experiment |
| Recovery reserve | **Additional ETH held outside the pool**, amount and policy published | Buffer sized to the worst outcome (pool drained), not the average one |
| LP tokens | **Lock for 12 months** (Team Finance or UNCX) | The pool being yankable is the #1 thing token scanners and buyers check |
| Deployer key | **Fresh, hardware-backed, single-purpose** | The signing path is the one unrecoverable failure surface (see Key Ceremony) |

## Token Parameters

- **Name / Symbol:** Cardinals Promise / CARD
- **Total supply:** 250,000,000 (fixed — minted once at deployment, no mint function reachable after renounce)
- **Distribution:**
  - 100,000,000 (40%) → Uniswap liquidity pool
  - 100,000,000 (40%) → founder, held unlocked in a publicly disclosed wallet
  - 50,000,000 (20%) → treasury, behind a Safe multisig, publicly disclosed
- **Ownership:** renounced immediately after setup is complete

## Key Ceremony (mandatory)

The study's sharpest technical lesson comes from the February 2025 Bybit loss: $1.5B taken not by
breaking cryptography but by compromising one vendor component in the signing path, so that signers
approved what a lying screen showed them. Every irreversible step below runs through keys, and the
renounce makes any key mistake permanent. Rules:

1. **Fresh deployer key, hardware-backed, single-purpose.** Generated on a hardware wallet that has
   never been connected to a browser wallet or a machine used for anything else. It deploys, seeds,
   locks, renounces, and is never used again.
2. **Out-of-band address verification.** Before the treasury and founder-wallet transfers, each
   destination address is read aloud and compared across two devices that did not share the
   copy-paste path. Same for the lock contract address.
3. **Separate sessions for irreversible steps.** The LP lock and the renounce are performed in
   separate sittings, with every parameter re-read from the chain (not from the UI) between them.
   Verify what you sign on a device that did not fetch the transaction.
4. **Inventory the signing path.** Write down every component between intent and signature — wallet
   firmware, browser extension, dapp front-end, RPC endpoint — before the ceremony. If a component
   wasn't listed, it doesn't get used.

## Launch Sequence

Order matters — several of these steps are only trustworthy if done in the right sequence.

1. **Pass the launch gate.** Publish which path (load-bearing or experiment) applies, before
   anything is deployed.
2. **Deploy the token contract.** Mint the full 250M supply to the deployer. Use a plain,
   audited ERC-20 base (e.g. OpenZeppelin) with no taxes, no blacklist, no mint function —
   exotic mechanics are the second thing scanners flag after unlocked liquidity.
3. **Verify the source code** on Etherscan immediately. Unverified contracts are treated as
   hostile by default.
4. **Transfer 50M to the treasury Safe and 100M to the disclosed founder wallet.** Do this
   *before* renouncing and *before* the pool exists, so the transfers are visibly setup steps
   rather than post-launch extractions. Addresses verified per the Key Ceremony.
5. **Create the Uniswap V2 pool** with 100M CARD + 2–5 ETH, via `addLiquidityETH` on the
   router (`scripts/add-liquidity.ts`). This is not a swap — you are depositing both sides
   and thereby *setting* the opening price, not paying one. The CARD/ETH ratio is the price:
   with 100M in the pool, 3 ETH implies 0.00000003 ETH/CARD. Check the ratio twice; it is the
   one number here that cannot be undone without trading against your own pool.
6. **Lock the LP tokens for 12 months** via Team Finance or UNCX. Save the lock URL — it's
   the first link to publish. Separate session from step 7.
7. **Renounce ownership** of the token contract (`renounceOwnership()` / transfer owner to
   the zero address). This is last among the contract steps so any needed setup can happen
   first — but it must happen *before* announcing.
8. **Announce.** See Disclosure below for what the announcement must contain.

## Treasury and Founder-Hold Policy

After the renounce, the retained 60% (treasury plus founder hold) is the entire remaining trust
surface, so each tranche carries its stated constraint:

**Treasury (50M, Safe multisig):**
- 2-of-3 Safe, signers on physically separate devices. An EOA treasury is not acceptable.
- Announce the address publicly at launch and label it (Etherscan name tag request).
- State what it's for (development, listings, liquidity top-ups) before launch, not after.
- Any spend from it is announced before or as it happens. Silent outflows from a known team wallet
  read as a slow rug.

**Founder hold (100M, unlocked — the deliberate exception):**
- The decision record is `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`: no timelock, by choice. The
  mitigation is disclosure plus a **written sell policy**, published at launch — what would trigger
  a sale, in what maximum size, with what advance notice.
- The wallet is disclosed and labeled at launch, so every movement is publicly attributable.
- The launch materials say plainly that this is the weakest point in the design, in those words.
  A disclosed weakness beats a discovered one.
- The dissertation's contrary recommendation (timelock/vesting on retained supply) stands as
  written; if the sell policy is ever not honored, adopting that architecture is the repair.

## Recovery Reserve

Buffers get sized to the worst plausible loss, not the average one — the study's survivors
(Bybit's $1.5B night) had the answer in place before the event. At this scale the worst plausible
losses are the pool being drained by a router/contract bug, or treasury key loss.

- Hold a stated amount of ETH **outside the pool**, earmarked publicly to re-seed liquidity.
- Publish the amount and the conditions under which it deploys, at launch.
- Treasury key loss is mitigated by the multisig (no single key can lose it).

## Disclosure (the announcement's required contents)

The announcement leads with the verifiable claims and their proof links:

- Ownership renounced → link to the renounce transaction
- Liquidity locked 12 months → link to the Team Finance/UNCX lock
- Treasury is 50M (20%), Safe multisig → link to the labeled Safe
- Founder holds 100M (40%), unlocked → link to the labeled wallet and the written sell policy
- Recovery reserve is Y ETH → link to the address and the policy

And then it states the weakest items plainly, because a disclosed weakness beats a discovered one
(the study's best operators publish the number that most damages them, every quarter):

- **The founder hold:** "40% of supply is held by the founder, unlocked. Here is the wallet, and
  here is the written policy governing any sale." No euphemism, no working around it.
- **If launching under the experiment path:** "There is no revenue behind this token today. Here is
  what would have to become true for that to change, and here is the date by which we will report
  on it." Then report on that date, whatever the news is. Once you start publishing on a schedule,
  stopping is itself a signal — do not start unless prepared to publish in a bad quarter too.

## Legal Posture

Silence is not a neutral position. Before launch:

- Obtain a written opinion from counsel on this specific structure — fixed supply, renounced, no
  yield, no promises of appreciation, a 40% unlocked founder hold — with a stated jurisdiction and
  a decision about who may buy. See `docs/LEGAL-BRIEFING.md` for the groundwork.
- Write the analysis to be re-run when the CLARITY Act resolves; it will determine which token
  structures are commodities and which are securities.

## What This Setup Deliberately Avoids

- **Launching on trust mechanics alone** — the demand gate exists because scanner-clean tokens with
  no reason to be bought are the modal dead project of 2025–26.
- **Mintable supply** — renounced, so impossible.
- ~~**Deployer holding a large share**~~ — **not avoided.** The founder holds 40% unlocked. This is
  the one item on this list the design does not solve, and the launch materials say so in those
  words rather than working around it.
- **Yankable liquidity** — LP locked 12 months.
- **Hidden team allocation** — the 20% is announced, labeled, and multisig; the founder hold is
  announced and labeled.
- **Single-key custody of the treasury** — the deployer key retires at renounce; the treasury never
  depends on one key.
- **Tax/fee/blacklist mechanics** — none; keeps scanner scores clean.

## Known Trade-offs

- **Renouncing is irreversible.** No parameter can ever be changed, no bug patched, no migration
  forced. Acceptable for a simple fixed-supply ERC-20; it's the point. It is also why the Key
  Ceremony is mandatory: irreversibility does not distinguish between misbehavior and error.
- **The unlocked founder hold trades scorecard points for flexibility.** The dissertation prices
  this trade explicitly (machine-enforced constraints are the cheapest trust available); the
  governance doc explains why it is accepted anyway. Both documents are honest about it being a
  trade, not a free choice.
- **2–5 ETH is thin liquidity.** Early trades will move price noticeably; that's the accepted cost
  of keeping personal risk small. Liquidity can be deepened later from the treasury or the recovery
  reserve (announce it when doing so).
- **12-month lock, not burned LP.** Locking preserves the option to migrate/re-pool after a year;
  burning would be a stronger forever-signal but removes all flexibility.
- **The demand gate may delay launch indefinitely.** That is the gate working. The study's data says
  the expected yield of launching without it rounds to slightly negative with a lottery attached.

---
*This is an engineering/launch-mechanics document, not financial or legal advice. Token launches
may have securities-law and tax implications depending on jurisdiction — the Legal Posture section
above is a checklist for obtaining that advice, not a substitute for it.*
