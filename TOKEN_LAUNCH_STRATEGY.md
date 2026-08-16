# CARD Token Launch Strategy

Launch plan for the CARD token: 250M fixed supply, Uniswap fair launch, trust-first design.
Every decision below optimizes for two things, in this order: **giving someone a reason to hold
CARD**, and being verifiably safe on-chain so that token scanners, screeners, and skeptical buyers
have nothing to flag.

This revision incorporates the findings of the [verifiable-restraint study](crypto-startups-thesis/README.md)
in this repository. The prior version of this plan solved trust and ignored demand; the study's
scoring of that version ([48/100, with the missing points enumerated](crypto-startups-thesis/10-application.md))
drives every change below.

## Launch Gate — the demand test (new, and it comes first)

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
| Supply at launch | Mint all 250M, then **renounce ownership immediately** | "Nobody can ever print more" is the single strongest trust signal a small token can have |
| Into the Uniswap pool | **200M CARD (80%)** | Screeners flag deployer-heavy tokens as rug risks |
| Kept back | 50M (20%) in a **multisig** treasury, publicly announced | Any more looks extractive; the multisig is mandatory, not optional (see Treasury) |
| ETH into the pool | **2–5 ETH** to start | Small enough not to risk savings on an experiment |
| Recovery reserve | **Additional ETH held outside the pool**, amount and policy published | Buffer sized to the worst outcome (pool drained), not the average one |
| LP tokens | **Lock for 12 months** (Team Finance or UNCX) | The pool being yankable is the #1 thing scanners check |
| Deployer key | **Fresh, hardware-backed, single-purpose** | The signing path is the one unrecoverable failure surface (see Key Ceremony) |

## Token Parameters

- **Name / Symbol:** CARD
- **Total supply:** 250,000,000 (fixed — minted once at deployment, no mint function reachable after renounce)
- **Distribution:**
  - 200,000,000 (80%) → Uniswap liquidity pool
  - 50,000,000 (20%) → treasury multisig, publicly disclosed
- **Ownership:** renounced immediately after setup is complete

## Key Ceremony (new — mandatory)

The study's sharpest technical lesson comes from the February 2025 Bybit loss: $1.5B taken not by
breaking cryptography but by compromising one vendor component in the signing path, so that signers
approved what a lying screen showed them. Every irreversible step below runs through keys, and the
renounce makes any key mistake permanent. Rules:

1. **Fresh deployer key, hardware-backed, single-purpose.** Generated on a hardware wallet that has
   never been connected to a browser wallet or a machine used for anything else. It deploys, seeds,
   locks, renounces, and is never used again.
2. **Out-of-band address verification.** Before the 50M treasury transfer, the treasury address is
   read aloud and compared across two devices that did not share the copy-paste path. Same for the
   lock contract address.
3. **Separate sessions for irreversible steps.** The LP lock and the renounce are performed in
   separate sittings, with every parameter re-read from the chain (not from the UI) between them.
   Verify what you sign on a device that did not fetch the transaction.
4. **Inventory the signing path.** Write down every component between intent and signature — wallet
   firmware, browser extension, dapp front-end, RPC endpoint — before the ceremony. If a component
   wasn't listed, it doesn't get used.

## Launch Sequence

Order matters — several of these steps are only trustworthy if done in the right sequence.

1. **Pass the launch gate.** Publish which path (load-bearing or experiment) applies, before anything
   is deployed.
2. **Deploy the token contract.** Mint the full 250M supply to the deployer. Use a plain, audited
   ERC-20 base (OpenZeppelin) with no taxes, no blacklist, no mint function — exotic mechanics are
   the second thing scanners flag after unlocked liquidity.
3. **Verify the source code** on Etherscan immediately. Unverified contracts are treated as hostile
   by default.
4. **Transfer 50M to the treasury multisig.** Do this *before* renouncing and *before* the pool
   exists, so the transfer is visibly a setup step rather than a post-launch extraction. Address
   verified per the Key Ceremony.
5. **Create the Uniswap pool** with 200M CARD + 2–5 ETH. The ETH amount sets the launch price.
6. **Lock the LP tokens for 12 months** via Team Finance or UNCX. Save the lock URL — it's the first
   link to publish. Separate session from step 7.
7. **Renounce ownership** of the token contract. Last among the contract steps, and it must happen
   *before* announcing.
8. **Announce.** See Disclosure below for what the announcement must contain.

## Treasury Wallet Policy

The 20% held back is the only part of this setup that requires ongoing trust after the renounce —
it is the *entire* remaining trust surface — so it is constrained accordingly:

- **Safe multisig, mandatory.** Signers on physically separate devices. An EOA treasury is not
  acceptable in this plan.
- Announce the address publicly at launch and label it (Etherscan name tag request).
- State what it's for (development, listings, liquidity top-ups) before launch, not after.
- Any spend from it is announced before or as it happens. Silent outflows from a known team wallet
  read as a slow rug.
- Optional strengthener on top of the multisig: a timelock, so every spend is visible before it
  executes. Discretion that is enumerated, delayed, and announced is a different object from
  discretion that merely exists.

## Recovery Reserve (new)

Buffers get sized to the worst plausible loss, not the average one — the study's survivors
(Bybit's $1.5B night) had the answer in place before the event. At this scale the worst plausible
losses are the pool being drained by a router/contract bug, or treasury key loss.

- Hold a stated amount of ETH **outside the pool**, earmarked publicly to re-seed liquidity.
- Publish the amount and the conditions under which it deploys, at launch.
- Treasury key loss is mitigated by the multisig (no single key can lose it) — that is part of why
  the multisig is mandatory.

## Disclosure (new — the announcement's required contents)

The announcement leads with the verifiable claims and their proof links:

- Ownership renounced → link to the renounce transaction
- Liquidity locked 12 months → link to the Team Finance/UNCX lock
- Treasury is X (20%), multisig → link to the labeled Safe
- Recovery reserve is Y ETH → link to the address and the policy

And then it states the weakest item plainly, because a disclosed weakness beats a discovered one
(the study's best operators publish the number that most damages them, every quarter):

- **If launching under the experiment path:** "There is no revenue behind this token today. Here is
  what would have to become true for that to change, and here is the date by which we will report
  on it." Then report on that date, whatever the news is. Once you start publishing on a schedule,
  stopping is itself a signal — do not start unless prepared to publish in a bad quarter too.

## Legal Posture (new)

Silence is not a neutral position. Before launch:

- Obtain a written opinion from counsel on this specific structure — fixed supply, renounced, no
  yield, no promises of appreciation — with a stated jurisdiction and a decision about who may buy.
- Write the analysis to be re-run when the CLARITY Act resolves; it will determine which token
  structures are commodities and which are securities.

## What This Setup Deliberately Avoids

- **Launching on trust mechanics alone** — the demand gate exists because scanner-clean tokens with
  no reason to be bought are the modal dead project of 2025–26.
- **Mintable supply** — renounced, so impossible.
- **Deployer holding a large share** — 80% is in the pool.
- **Yankable liquidity** — LP locked 12 months.
- **Hidden team allocation** — the 20% is announced, labeled, and multisig.
- **Single-key custody of anything that persists** — the deployer key retires at renounce; the
  treasury never depends on one key.
- **Tax/fee/blacklist mechanics** — none; keeps scanner scores clean.

## Known Trade-offs

- **Renouncing is irreversible.** No parameter can ever be changed, no bug patched, no migration
  forced. Acceptable for a simple fixed-supply ERC-20; it's the point. It is also why the Key
  Ceremony is mandatory: irreversibility does not distinguish between misbehavior and error.
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
