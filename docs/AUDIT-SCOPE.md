# Audit Scope — CardinalsPromise.sol

Everything an auditor needs to start cold. One ~20-line contract over
OpenZeppelin v5 base contracts.

## Scope

| Item | Value |
| --- | --- |
| Files in scope | `contracts/CardinalsPromise.sol` |
| Inherited (out of scope unless integration is wrong) | OpenZeppelin v5 `ERC20`, `Ownable` |
| Solidity version | 0.8.24+ (compiled with 0.8.28) |
| Upgradeability | None — not a proxy, no delegatecall |
| Oracles / external calls | None — the contract never calls out |
| Deployment target | Ethereum mainnet, via Hardhat Ignition (`ignition/modules/CardinalsPromise.ts`) |

## Intended behavior (the spec to audit against)

1. Standard ERC-20 (EIP-20) semantics, exactly as inherited from
   OpenZeppelin `ERC20` — name "Cardinals Promise", symbol "CARD",
   18 decimals.
2. The full supply (250,000,000 × 10¹⁸) is minted to the deployer in the
   constructor, once. **No code path can ever change `totalSupply` again:
   there is no mint, no burn, no rebase.**
3. `Ownable` is inherited solely so `renounceOwnership()` can be executed
   as a public, verifiable launch step. **No function is owner-gated** —
   ownership grants no power even before it is renounced.
4. No fees, no hooks, no callbacks, no blocklist, no pause — a transfer of
   N tokens always moves exactly N tokens.

## Existing verification (all runnable, all in CI)

- **Machine-checkable claims ledger** — `verification/claims.json` maps
  every launch claim to executable evidence; `npm run verify` fails CI if
  any claim loses its backing. Evidence types include ABI-absence checks
  (no mint/burn/pause/blacklist function exists) and an exact
  write-surface check (the ABI's state-changing functions are exactly the
  ERC-20 five plus the two Ownable handover functions).
- **Foundry-style Solidity tests** (`contracts/CardinalsPromise.t.sol`)
  including fuzz tests, plus a **handler-based stateful invariant suite**
  (`contracts/CardinalsPromiseInvariants.t.sol`): supply constant, balances
  sum to supply, renounce is permanent, no-tax property asserted inside
  every fuzzed transfer.
- **TypeScript tests** (node:test + viem) in `test/CardinalsPromise.ts`.
- **Slither v0.11.5**, all 101 detectors: 0 findings (see LAUNCH.md for
  the Hardhat-3 reproduction workaround).
- Full launch sequence rehearsed against a real Uniswap V2 deployment
  locally (`scripts/rehearse-launch.ts`), including a third-party swap.

## What to focus on

Given the contract is a thin composition of audited OZ code, the highest-
value review targets are: (a) the composition itself (constructor,
inheritance order, missing overrides), (b) the claims ledger — is any
launch claim *not* actually enforced by the evidence cited? — and (c) the
operational scripts' parameters (`scripts/add-liquidity.ts`), an opinion on
which is welcome but not required.
