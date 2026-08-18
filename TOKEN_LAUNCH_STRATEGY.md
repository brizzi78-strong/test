# CARD Token Launch Strategy

Launch plan for the CARD token: 250M fixed supply, Uniswap fair launch, trust-first design.
Every decision below optimizes for the same thing — being verifiably safe on-chain, so that
token scanners, screeners, and skeptical buyers have nothing to flag.

## Decision Summary

| Decision | Call | Rationale |
|---|---|---|
| Supply at launch | Mint all 250M, then **renounce only after verification, two-way swap testing, and LP lock** | Renouncement is irreversible; the launch must be proven first |
| Into the Uniswap pool | **100M CARD (40%)** | The tradeable float. Initial ETH and CARD reserves jointly determine starting price and depth — see `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Founder-held | **100M (40%), unlocked, in a disclosed wallet** | Decision taken: no timelock. This is the weakest point in the design and it is deliberate. Mitigation is disclosure plus a written sell policy, not code — see `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Treasury | 50M (20%) behind a Safe multisig, publicly announced | Any more looks extractive; label it, and require more than one signature to move it |
| ETH into the pool | **2–5 ETH** to start | Enough that a few-hundred-dollar buy doesn't spike the price ~20%; small enough not to risk savings on an experiment |
| LP tokens | **Lock for 12 months** (Team Finance or UNCX) | The pool being yankable is the #1 thing token scanners and buyers check |

## Token Parameters

- **Name / Symbol:** Cardinals Promise / CARD
- **Fee:** flat 2% on transfers between non-treasury addresses, accruing to the treasury; transfers to/from the treasury are exempt; rate, recipient, and exemption rule are immutable
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
3. **Transfer 150M to the treasury wallet.** This stages 100M for fee-exempt pool seeding
   and leaves 50M in the treasury afterward. The founder retains the other 100M.
4. **Create the Uniswap V2 pool** with 100M CARD + 2–5 ETH, via `addLiquidityETH` on the
   router (`scripts/add-liquidity.ts`). This is not a swap — you are depositing both sides
   and thereby *setting* the opening price, not paying one. The CARD/ETH ratio is the price:
   with 100M in the pool, 3 ETH implies 0.00000003 ETH/CARD. Check the ratio twice; it is the
   one number here that cannot be undone without trading against your own pool.
5. **Lock the LP tokens for 12 months** via Team Finance or UNCX. Save the lock URL — it's
   the first link to publish.
6. **Renounce ownership** of the token contract (`renounceOwnership()` / transfer owner to
   the zero address). This is last among the contract steps and happens only after the
   verified source, fee-aware buy and sell, exact pool balance, and LP lock are confirmed.
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
- **Seeding pays the fee unless it is routed through the treasury.** A direct
  deployer → pair transfer is taxed like any other: seeding "100M CARD" would deliver
  **98M to the pool and 2M to the treasury**, and since the opening price is set by what
  the pair actually receives, the launch price would land ~2% off intent. Transfers *to*
  and *from* the immutable treasury are fee-exempt, so a two-step seed arrives whole:

      deployer → treasury   (exempt: to == treasury)     100,000,000 CARD
      treasury → pair       (exempt: from == treasury)   100,000,000 CARD

  **Decision: seed the pool this way.** It costs one extra transaction and keeps the
  published 100M figure literally true. If a direct seed is ever used instead, the
  98M/2M split must be disclosed on the ledger page before launch, not after.

- **Slippage must be raised to clear the fee.** Uniswap's default 0.5% tolerance is below
  the 2% skim, so a default-settings buy fails the router's minimum-received check. The
  how-to-buy page instructs buyers to set 3%. Sells must use the
  `...SupportingFeeOnTransferTokens` router functions; the Uniswap interface selects them
  automatically, in-wallet swap features often do not — which is why the walkthrough sends
  people to the Uniswap site rather than the wallet's Swap button.

- **Round-trip cost is about 4.5% before gas and price impact.** The token fee alone
  compounds to 3.96%; two 0.3% Uniswap charges bring the simple estimate to about 4.5%.

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
