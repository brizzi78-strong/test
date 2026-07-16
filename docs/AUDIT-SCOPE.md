# Audit Scope — CardinalsPromise.sol

Everything an auditor needs to start cold. One contract, no dependencies,
~190 lines.

## Scope

| Item | Value |
| --- | --- |
| Files in scope | `contracts/CardinalsPromise.sol` (only) |
| Solidity version | 0.8.28 (checked arithmetic; `unchecked` blocks are annotated below) |
| External dependencies | None — no OpenZeppelin, no libraries, no inheritance |
| Upgradeability | None — not a proxy, no delegatecall |
| Oracles / external calls | None — the contract never calls out |
| Deployment target | Ethereum mainnet, via Hardhat Ignition (`ignition/modules/CardinalsPromise.ts`) |

## Intended behavior (the spec to audit against)

1. Standard ERC-20 (EIP-20) semantics for `transfer`, `approve`,
   `transferFrom`, and the `Transfer`/`Approval` events.
2. `totalSupply` can never exceed `MAX_SUPPLY` (250,000,000 × 10¹⁸) under
   any call sequence.
3. Only `owner` can `mint`; after `renounceOwnership`, no path to minting
   exists forever.
4. `burn`/`burnFrom` destroy tokens and reduce `totalSupply`; `burnFrom`
   requires allowance (with the `type(uint256).max` infinite-allowance
   convention: never decremented).
5. No fees, no hooks, no callbacks, no blocklist, no pause — a transfer of
   N tokens always moves exactly N tokens.
6. Approvals to the zero address revert; transfers/mints to the zero
   address revert (burns emit `Transfer` to the zero address per EIP-20).

## Design decisions an auditor will ask about

- **`unchecked` blocks** in `_transfer`, `_mint`, `_burn`,
  `_spendAllowance`: each is guarded by an explicit balance/allowance/cap
  check immediately before, so overflow/underflow is unreachable. Verify.
- **One-step ownership transfer** (not two-step Ownable2Step): accepted
  risk, mitigated by the plan to renounce at launch (see LAUNCH.md).
- **No EIP-2612 permit**: deliberately omitted to keep the surface minimal.
- **Constructor mints to deployer**: launch plan mints the full cap, making
  `mint` dead code post-renounce — but it must still be safe if a deployer
  chooses a smaller initial supply.

## Invariants (fuzz/formal targets)

- `sum(balanceOf[a] for all a) == totalSupply` after any call sequence.
- `totalSupply <= MAX_SUPPLY` always.
- `owner == address(0)` is a terminal state.
- No call by a non-owner changes `totalSupply` upward.
- `transferFrom` never moves more than `min(balance, allowance)`.

## Existing verification

- 19-test mocha+ethers suite (`test/CardinalsPromise.ts`), run in CI on
  every push (`.github/workflows/ci.yml`).
- Slither v0.11.5, all 101 detectors: **0 findings** (see LAUNCH.md for the
  Hardhat-3 reproduction workaround).
- Full launch sequence rehearsed against a real Uniswap V2 deployment
  locally (`scripts/rehearse-launch.ts`), including a third-party swap.

## Out of scope

`scripts/`, `ignition/`, `site/` — operational tooling, not on-chain code.
(An opinion on `scripts/add-liquidity.ts` parameters is welcome but not
required.)
