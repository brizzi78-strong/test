# CARD Token Launch Strategy

Launch plan for the CARD token: 250M fixed supply, Uniswap fair launch, trust-first design.
Every decision below optimizes for the same thing — being verifiably safe on-chain, so that
token scanners, screeners, and skeptical buyers have nothing to flag.

## Decision Summary

| Decision | Call | Rationale |
|---|---|---|
| Supply at launch | Mint all 250M, then **renounce ownership immediately** | "Nobody can ever print more" is the single strongest trust signal a small token can have, and it costs nothing |
| Into the Uniswap pool | **200M CARD (80%)** | Screeners flag deployer-heavy tokens as rug risks; putting most of the supply in the locked pool is what "fair launch" looks like on-chain |
| Kept back | 50M (20%) in a publicly announced treasury/team wallet | Any more looks extractive; label it or it looks like a dump waiting to happen |
| ETH into the pool | **2–5 ETH** to start | Enough that a few-hundred-dollar buy doesn't spike the price ~20%; small enough not to risk savings on an experiment |
| LP tokens | **Lock for 12 months** (Team Finance or UNCX) | The pool being yankable is the #1 thing token scanners and buyers check |

## Token Parameters

- **Name / Symbol:** CARD
- **Total supply:** 250,000,000 (fixed — minted once at deployment, no mint function reachable after renounce)
- **Distribution:**
  - 200,000,000 (80%) → Uniswap liquidity pool
  - 50,000,000 (20%) → treasury/team wallet, publicly disclosed
- **Ownership:** renounced immediately after setup is complete

## Launch Sequence

Order matters — several of these steps are only trustworthy if done in the right sequence.

1. **Deploy the token contract.** Mint the full 250M supply to the deployer. Use a plain,
   audited ERC-20 base (e.g. OpenZeppelin) with no taxes, no blacklist, no mint function —
   exotic mechanics are the second thing scanners flag after unlocked liquidity.
2. **Verify the source code** on Etherscan immediately. Unverified contracts are treated as
   hostile by default.
3. **Transfer 50M to the treasury wallet.** Do this *before* renouncing and *before* the pool
   exists, so the transfer is visibly a setup step rather than a post-launch extraction.
4. **Create the Uniswap pool** with 200M CARD + 2–5 ETH. The ETH amount sets the launch
   price; with 200M in the pool, 3 ETH implies a starting price of 0.000000015 ETH/CARD.
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
- **Deployer holding a large share** — 80% is in the pool.
- **Yankable liquidity** — LP locked 12 months.
- **Hidden team allocation** — the 20% is announced and labeled.
- **Tax/fee/blacklist mechanics** — none; keeps scanner scores clean.

## Known Trade-offs

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
