# CARD Token Launch Strategy

Launch plan for the CARD token: 250M fixed supply, Uniswap fair launch, trust-first design.
Every decision below optimizes for the same thing — being verifiably safe on-chain, so that
token scanners, screeners, and skeptical buyers have nothing to flag.

## Decision Summary

| Decision | Call | Rationale |
|---|---|---|
| Supply at launch | Mint all 250M, then **renounce ownership immediately** | "Nobody can ever print more" is the single strongest trust signal a small token can have, and it costs nothing |
| Into the Uniswap pool | **100M CARD (40%)** | The tradeable float. Halving it from the original 200M doubles the launch price but does not deepen the book — see the slippage table in `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Founder-held | **100M (40%), unlocked, in a disclosed wallet** | Decision taken: no timelock. This is the weakest point in the design and it is deliberate. Mitigation is disclosure plus a written sell policy, not code — see `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Treasury | 50M (20%) behind a Safe multisig, publicly announced | Any more looks extractive; label it, and require more than one signature to move it |
| ETH into the pool | **2–5 ETH** to start | Enough that a few-hundred-dollar buy doesn't spike the price ~20%; small enough not to risk savings on an experiment |
| LP tokens | **Lock for 12 months** (Team Finance or UNCX) | The pool being yankable is the #1 thing token scanners and buyers check |

## Token Parameters

- **Name / Symbol:** Cardinals Promise / CARD
- **Fee:** flat 2% on every non-treasury transfer, accruing to the treasury; rate and recipient immutable at deployment
- **Total supply:** 250,000,000 (fixed — minted once at deployment, no mint function reachable after renounce)
- **Distribution:**
  - 100,000,000 (40%) → Uniswap liquidity pool
  - 100,000,000 (40%) → founder, held unlocked in a publicly disclosed wallet
  - 50,000,000 (20%) → treasury, behind a Safe multisig, publicly disclosed
- **Ownership:** renounced immediately after setup is complete

## Launch Sequence

Order matters — several of these steps are only trustworthy if done in the right sequence.

1. **Deploy the token contract.** Mint the full 250M supply to the deployer. Use a plain,
   audited ERC-20 base (OpenZeppelin) carrying exactly one mechanic: a flat, immutable 2%
   treasury fee. No blacklist, no mint, no pause. Scanners flag fee-on-transfer tokens —
   accepted; the answer is the fee's immutability and the renounce, not a denial.
2. **Verify the source code** on Etherscan immediately. Unverified contracts are treated as
   hostile by default.
3. **Transfer 50M to the treasury wallet.** Do this *before* renouncing and *before* the pool
   exists, so the transfer is visibly a setup step rather than a post-launch extraction.
4. **Create the Uniswap V2 pool** with 100M CARD + 2–5 ETH, via `addLiquidityETH` on the
   router (`scripts/add-liquidity.ts`). This is not a swap — you are depositing both sides
   and thereby *setting* the opening price, not paying one. The CARD/ETH ratio is the price:
   with 100M in the pool, 3 ETH implies 0.00000003 ETH/CARD. Check the ratio twice; it is the
   one number here that cannot be undone without trading against your own pool.
5. **Lock the LP tokens for 12 months** via Team Finance or UNCX. Save the lock URL — it's
   the first link to publish.
6. **Renounce ownership** of the token contract (`renounceOwnership()` / transfer owner to
   the zero address). This is last among the contract steps so any needed setup (exclusions,
   pool address config) can happen first — but it must happen *before* announcing.
7. **Announce.** The announcement should lead with the three verifiable claims and their
   proof links:
   - Ownership renounced → link to the renounce transaction
   - Liquidity locked 12 months → link to the Team Finance/UNCX lock
   - Treasury wallet is X (20%) → link to the labeled address

## Treasury Wallet Policy

The 20% held back is the only part of this setup that requires ongoing trust, so constrain it:

- Announce the address publicly at launch and label it (Etherscan name tag request).
- State what it's for (development, listings, liquidity top-ups) before launch, not after.
- Any spend from it should be announced before or as it happens. Silent outflows from a
  known team wallet read as a slow rug.
- Optional strengthener: put it behind a multisig (e.g. Safe) or a vesting/timelock contract —
  turns "trust us" into "verify it."

## What This Setup Deliberately Avoids

- **Mintable supply** — renounced, so impossible.
- ~~**Deployer holding a large share**~~ — **not avoided.** The founder holds 40% unlocked. This is the one item on this list the design does not solve, and the launch materials say so in those words rather than working around it.
- **Yankable liquidity** — LP locked 12 months.
- **Hidden team allocation** — the 20% is announced and labeled.
- **Owner-controlled fees, blacklists, pausing** — none. The 2% fee exists but is
  hardcoded and ungated: no one can raise, lower, redirect, or disable it.

## Known Trade-offs

- **Fee-on-transfer mechanics.** Buys and sells must route through Uniswap's
  `...SupportingFeeOnTransferTokens` functions; some aggregators and tools handle this
  poorly, and scanners will flag the token. Accepted by decision.
- **Seeding pays the fee.** The 100M pool seed from the deployer skims 2% (2M CARD) to the
  treasury unless the pool is seeded from the treasury itself — decide which before
  launch and disclose it.

- **Renouncing is irreversible.** No parameter can ever be changed, no bug patched, no
  migration forced. Acceptable for a simple fixed-supply ERC-20; it's the point.
- **2–5 ETH is thin liquidity.** Early trades will still move price noticeably; that's the
  accepted cost of keeping personal risk small. Liquidity can be deepened later from the
  treasury (announce it when doing so).
- **12-month lock, not burned LP.** Locking preserves the option to migrate/re-pool after a
  year; burning would be a stronger forever-signal but removes all flexibility.

---
*This is an engineering/launch-mechanics document, not financial or legal advice. Token
launches may have securities-law and tax implications depending on jurisdiction — check
before launch.*
