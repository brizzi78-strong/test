# CARD Token Launch Strategy

Launch plan for the CARD token: 1B fixed supply, immutable 2% transfer fee, Uniswap fair
launch, trust-first design. Every decision below optimizes for the same thing — being
verifiably honest on-chain, so that token scanners, screeners, and skeptical buyers find
exactly what the documents say and nothing else. Launch date: **Saturday, October 4, 2026**.

## Decision Summary

| Decision | Call | Rationale |
|---|---|---|
| Supply at launch | Mint all 1B, then **renounce ownership immediately** after setup | "Nobody can ever print more" is the single strongest trust signal a small token can have, and it costs nothing |
| Transfer fee | **2%, immutable, to an immutable treasury address** (`FEE_BPS = 200`; `treasury` set in the constructor, no setter) | The project's only built-in revenue; at 2% it covers small fixed costs (LLC, website) if there is trading, and does not come close to funding professionals |
| Into the Uniswap pool | **400M CARD (40%)**, seeded **from the treasury wallet** | The tradeable float. Halving it from the original 200M doubles the launch price but does not deepen the book — see the slippage table in `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`. Seeding from the treasury is fee-exempt, so the pair receives the full 400M |
| Founder-held | **400M (40%), unlocked, in the deployer wallet** | Decision taken: no timelock. The deployer *is* the founder wallet — no separate transfer, no vesting contract. This is the weakest point in the design and it is deliberate. Mitigation is disclosure plus a written sell policy, not code — see `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md` |
| Treasury | 200M (20%) in a single founder-held wallet, publicly announced | One key, not a multisig, with the address published on cp17.org. It is also the fee destination baked into the contract, so it must be chosen once and carefully — if it ever moves behind a multisig, the fee still flows to the original address |
| ETH into the pool | **~$4,000 of ETH** (≈1.6–1.67 ETH; decision taken — exact ETH amount recomputed on the day) | Enough that a few-hundred-dollar buy doesn't spike the price ~20%; small enough not to risk savings on an experiment |
| LP tokens | **Lock for 12 months** (Team Finance or UNCX) | The pool being yankable is the #1 thing token scanners and buyers check |

## Token Parameters

- **Name / Symbol:** Cardinals Promise / CARD
- **Total supply:** 1,000,000,000 (fixed — minted once at deployment to the deployer, no mint, no burn; the fee moves coins, it never creates or destroys them)
- **Transfer fee:** 2% (`FEE_BPS = 200`) on every transfer between two non-treasury addresses; the recipient gets 98% and the treasury gets 2%. Transfers to or from the treasury are fee-exempt (gifts to the treasury arrive whole; the treasury can seed the pool without paying the fee). Self-transfers are no-ops. The fee rounds down, so amounts under 50 wei pay nothing. No setter exists for the rate or the destination, and ownership is renounced anyway.
- **Distribution:**
  - 400,000,000 (40%) → Uniswap liquidity pool, seeded from the treasury
  - 400,000,000 (40%) → founder, held unlocked in the deployer wallet (`0xe01e588d3A4Ef5e088B3438C1A518E9C13a7ED2D`)
  - 200,000,000 (20%) → treasury, a single founder-held wallet, publicly disclosed (`0xDAE63eBEe60A691e1538D480AE3F6509068ab300`), which also receives every fee
- **Ownership:** renounced immediately after setup is complete
- **No lock on the founder hold:** unlocked by decision; no vesting or timelock contract exists in the repo

## What a buyer pays

Say it plainly: 2% CARD fee on the buy (to the treasury) + 2% on the sell + Uniswap's 0.3%
each way. A simple round trip costs **about 4.5%** before gas, slippage and price impact.

## Known costs of a fee-on-transfer token

- Token scanners flag fee-on-transfer tokens. The fee is disclosed everywhere so the flag
  matches the documents, but it will be there.
- Some wallet swap features and aggregators fail on sells unless they use Uniswap's
  fee-supporting router functions (`swapExactETHForTokensSupportingFeeOnTransferTokens` to
  buy, `swapExactTokensForETHSupportingFeeOnTransferTokens` to sell). The Uniswap app
  handles this automatically.
- Buyers must raise slippage to at least 3%, or the trade reverts.

## Launch Sequence

Order matters — several of these steps are only trustworthy if done in the right sequence.

1. **Deploy the token contract** with the treasury address as its one constructor argument.
   Mint the full 1B supply to the deployer. Audited OpenZeppelin ERC-20 base, no blacklist,
   no mint function; the only addition is the immutable 2% fee, which scanners will flag and
   the documents disclose.
2. **Verify the source code** on Etherscan immediately (`npx hardhat verify --network <net>
   <token> <treasury>`). Unverified contracts are treated as hostile by default.
3. **Transfer 600M to the treasury wallet in one transfer** — 200M the treasury keeps plus
   400M staged for the pool. It goes through the treasury because a transfer *from* the
   treasury is fee-exempt; the deployer seeding the pool directly would lose 2% to the fee.
   The deployer holds exactly 400M (the founder hold) from this point. Do this *before*
   renouncing and *before* the pool exists, so the transfer is visibly a setup step rather
   than a post-launch extraction.
4. **The treasury wallet creates the Uniswap V2 pool** with 400M CARD + about $4,000 of ETH
   (≈1.6–1.67 ETH; recompute on the day), via `addLiquidityETH` on the router
   (`scripts/add-liquidity.ts`, run from the treasury signer with `CARD_TREASURY_ADDRESS`
   set). Because `from == treasury`, the pair receives the full 400M. LP tokens go to the
   treasury wallet. The deployer needs only gas ETH. This is not a swap — you are depositing
   both sides and thereby *setting* the opening price, not paying one. The CARD/ETH ratio is
   the price: with 400M in the pool, 1.6 ETH implies 0.000000004 ETH/CARD. Check the ratio
   twice; it is the one number here that cannot be undone without trading against your own
   pool.
5. **Lock the LP tokens for 12 months** via Team Finance or UNCX. Save the lock URL — it's
   the first link to publish.
6. **Renounce ownership** of the token contract from the deployer (`renounceOwnership()`).
   This is last among the contract steps — but it must happen *before* announcing.
7. **Announce.** The announcement should lead with the verifiable claims and their
   proof links:
   - Ownership renounced → link to the renounce transaction
   - Liquidity locked 12 months → link to the Team Finance/UNCX lock
   - Treasury wallet is X (20%, plus every fee) → link to the labeled address
   - The 2% fee, stated as a cost, with the round-trip number

Balances after setup: deployer 400M, treasury 200M (+ accumulating fees), pool ~400M.

## Treasury Wallet Policy

The 20% held back — plus every fee the contract collects — is the only part of this setup
that requires ongoing trust, so constrain it:

- It is a single wallet held by the founder — one key, not a multisig — with the address
  published on cp17.org. Announce it at launch and label it (Etherscan name tag request).
- State what it's for (fixed costs, listings, liquidity top-ups) before launch, not after.
- Any spend from it should be announced before or as it happens. Silent outflows from a
  known team wallet read as a slow rug.
- If it ever moves behind a multisig, the fee still flows to the immutable address baked
  into the contract. That address must be chosen once and carefully; it cannot follow the
  treasury anywhere.

## What This Setup Deliberately Avoids

- **Mintable supply** — renounced, so impossible.
- ~~**Deployer holding a large share**~~ — **not avoided.** The founder holds 40% unlocked. This is the one item on this list the design does not solve, and the launch materials say so in those words rather than working around it.
- **Yankable liquidity** — LP locked 12 months.
- **Hidden team allocation** — the 20% is announced and labeled.
- **Adjustable fee, blacklist, pause** — none. The 2% fee exists, but it cannot be raised, redirected, or selectively waived: no setter, no exemption list, and the owner is gone.

## Known Trade-offs

- **Renouncing is irreversible.** No parameter can ever be changed, no bug patched, no
  migration forced. Acceptable for a simple fixed-supply ERC-20; it's the point.
- **The fee is a real cost to buyers.** About 4.5% round trip before gas. It is disclosed
  rather than hidden, and it makes the token less attractive to trade than a fee-free one.
- **~$4,000 is thin liquidity.** Early trades will still move price noticeably; that's the
  accepted cost of keeping personal risk small. Liquidity can be deepened later from the
  treasury (announce it when doing so).
- **12-month lock, not burned LP.** Locking preserves the option to migrate/re-pool after a
  year; burning would be a stronger forever-signal but removes all flexibility.

---
*This is an engineering/launch-mechanics document, not financial or legal advice. Token
launches may have securities-law and tax implications depending on jurisdiction — check
before launch.*
