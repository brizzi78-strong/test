# Audit Scope — CardinalsPromise.sol

Everything an auditor needs to start cold. One short contract over
OpenZeppelin v5 base contracts; the only custom logic is a `_update`
override that skims an immutable 2% fee to an immutable treasury address.

## Scope

| Item | Value |
| --- | --- |
| Files in scope | `contracts/CardinalsPromise.sol` |
| Inherited (out of scope unless integration is wrong) | OpenZeppelin v5 `ERC20`, `Ownable` |
| Solidity version | 0.8.24+ (compiled with 0.8.28) |
| Upgradeability | None — not a proxy, no delegatecall |
| Oracles / external calls | None — the contract never calls out |
| Constructor | `constructor(address treasury_)` — reverts if zero or equal to the deployer; sets `address public immutable treasury` |
| Deployment target | Ethereum mainnet, via Hardhat Ignition (`ignition/modules/CardinalsPromise.ts`, treasury supplied through `ignition/parameters.json`) |

## Intended behavior (the spec to audit against)

1. Standard ERC-20 (EIP-20) semantics, exactly as inherited from
   OpenZeppelin `ERC20` — name "Cardinals Promise", symbol "CARD",
   18 decimals.
2. The full supply (1,000,000,000 × 10¹⁸) is minted to the deployer in the
   constructor, once. **No code path can ever change `totalSupply` again:
   there is no mint, no burn, no rebase.** The fee moves coins between
   balances; it never creates or destroys them.
3. `Ownable` is inherited solely so `renounceOwnership()` can be executed
   as a public, verifiable launch step. **No function is owner-gated** —
   ownership grants no power even before it is renounced.
4. **Transfer fee.** `FEE_BPS = 200` (constant). On every transfer where
   `from` and `to` are both non-zero, differ from each other, and neither is
   `treasury`, exactly `value * 200 / 10_000` (rounded down) goes to
   `treasury` and the remainder to `to`. Consequences the audit should
   confirm: transfers to or from the treasury are fee-exempt; self-transfers
   are no-ops; amounts under 50 wei pay nothing; minting is never taxed.
   **There is no setter for the rate or the destination, no exemption list,
   and no way to add either** — the rate and destination can never change.
5. No hooks, no callbacks, no blocklist, no pause. Apart from the fee, a
   transfer of N tokens moves exactly N tokens.

Known costs of a fee-on-transfer token, accepted by design: token scanners
flag it; some wallet swap features and aggregators fail on sells unless they
use Uniswap's `...SupportingFeeOnTransferTokens` router functions; buyers
must raise slippage to at least 3%.

## Existing verification (all runnable, all in CI)

- **Machine-checkable claims ledger** — `verification/claims.json` maps
  every launch claim to executable evidence; `npm run verify` fails CI if
  any claim loses its backing. The nine claims: fixed-supply,
  supply-immutable, no-pause, no-blacklist, fixed-fee (exactly 2% to the
  immutable treasury, treasury-exempt), fee-immutable (no setter, no
  exemption list), owner-powerless, renounce-works, balance-enforced.
  Evidence types include ABI-absence checks (no mint/burn/pause/blacklist/
  fee-setter function exists) and an exact write-surface check (the ABI's
  state-changing functions are exactly the ERC-20 five plus the two Ownable
  handover functions).
- **Foundry-style Solidity tests** (`contracts/CardinalsPromise.t.sol`)
  including fuzz tests, plus a **handler-based stateful invariant suite**
  (`contracts/CardinalsPromiseInvariants.t.sol`): supply constant, balances
  sum to supply, renounce is permanent, exact 2%/98% split (or exemption)
  asserted inside every fuzzed transfer.
- **TypeScript tests** (node:test + viem) in `test/CardinalsPromise.ts`.
- **Slither v0.11.5**, all 101 detectors: 0 findings (see LAUNCH.md for
  the Hardhat-3 reproduction workaround).
- Full launch sequence rehearsed against a real Uniswap V2 deployment
  locally (`scripts/rehearse-launch.ts`), including a third-party swap
  through the fee-supporting router functions; `scripts/test-swap-sepolia.ts`
  repeats the buy/sell round trip on Sepolia.

## What to focus on

Given the contract is a thin composition of audited OZ code, the highest-
value review targets are: (a) the `_update` override — rounding, the
exemption conditions, whether any path lets a fee be skipped or doubled,
and that supply is conserved on every branch; (b) the composition itself
(constructor argument checks, inheritance order, missing overrides); (c)
the claims ledger — is any launch claim *not* actually enforced by the
evidence cited? — and (d) the operational scripts' parameters
(`scripts/add-liquidity.ts`, which must run from the treasury signer so the
pool receives the full 400M), an opinion on which is welcome but not
required.
