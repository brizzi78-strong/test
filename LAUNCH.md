# Cardinals Promise (CARD) — Launch Runbook

## Decided launch parameters

| Decision | Value |
| --- | --- |
| Supply | Mint all 1B at deploy to the deployer; `renounceOwnership()` from the deployer once the pool is live and the LP is locked. No mint, no burn, no pause, no blacklist |
| Transfer fee | **2%, immutable** (`FEE_BPS = 200`) to an immutable `treasury` address set in the constructor (reverts if zero or equal to the deployer). Charged on every transfer between two non-treasury addresses: recipient gets 98%, treasury gets 2%. Transfers to or from the treasury are fee-exempt; self-transfers are no-ops; the fee rounds down (under 50 wei pays nothing). No setter — the rate and destination can never change. Supply never changes; the fee moves coins, it never creates or destroys them |
| Uniswap pool | 400M CARD (40%) paired with ~$4,000 of ETH (≈1.6–1.67 ETH; recompute on the day), **created by the treasury wallet** so the pair receives the full 400M fee-free. LP tokens go to the treasury wallet |
| Founder allocation | 400M CARD (40%), **held unlocked in the deployer wallet** (`0xe01e588d3A4Ef5e088B3438C1A518E9C13a7ED2D`). The deployer *is* the founder wallet — no separate transfer. Unlocked by decision; no vesting or timelock contract exists in the repo |
| Treasury | 200M CARD (20%) plus every fee, in a single wallet held by the founder — one key, not a multisig (`0xDAE63eBEe60A691e1538D480AE3F6509068ab300`, published on cp17.org). If it ever moves behind a multisig, the fee still flows to the immutable address in the contract, so the address is chosen once and carefully |
| What a buyer pays | 2% on the buy + 2% on the sell + Uniswap's 0.3% each way ≈ **4.5% round trip** before gas, slippage and price impact. Set slippage to at least 3% |
| LP tokens | Locked 12 months (Team Finance or UNCX) |
| Launch date | **Saturday, October 4, 2026** |
| Timeline | Sepolia rehearsal → independent audit + legal consult → mainnet on launch day |
| Before mainnet | Publish the one-page site (`site/index.html`) at **cp17.org** — deliberately not the book's domain, so the token is not presented to the book's audience as an extension of it |

Status of each step on the road to mainnet. Items marked ✅ are done in this
repo; items marked 🔑 need something only the project owner can provide
(keys, funds, signatures, legal engagement).

## ✅ Done

| Step | Where |
| --- | --- |
| Token contract (1B fixed supply — no mint, no burn; immutable 2% fee to an immutable treasury; OpenZeppelin ERC20 + Ownable) | `contracts/CardinalsPromise.sol` |
| Test suite — the full suite (Foundry-style Solidity incl. fuzz + invariants, plus node:test/viem), all passing | `contracts/*.t.sol`, `test/CardinalsPromise.ts` |
| Machine-checkable launch-claims ledger — 9/9 claims verified in CI (`npm run verify`) | `verification/claims.json` |
| Static analysis — Slither v0.11.5, all 101 detectors, **0 findings** | run locally, see below to reproduce |
| Local deployment rehearsal (Ignition, treasury constructor argument via `ignition/parameters.json`) | `ignition/modules/CardinalsPromise.ts`, `ignition/parameters.example.json` |
| CI — build + full test suite + claims verification on every push/PR | `.github/workflows/verify.yml` |
| Sepolia + mainnet network config | `hardhat.config.ts` |
| Etherscan verification config | `hardhat.config.ts` (`verify.etherscan`) |
| Uniswap V2 liquidity script (runs from the treasury signer; `CARD_TREASURY_ADDRESS` required) | `scripts/add-liquidity.ts` |
| Fee-aware Sepolia test swap (buy + sell round trip from a separate buyer wallet) | `scripts/test-swap-sepolia.ts` |
| Logo (SVG + 256px/32px PNG) and token metadata | `assets/` |
| **Full launch dress rehearsal** — real Uniswap V2 stack deployed locally; deploy → fund treasury → treasury seeds the pool → buyer swap through the fee-supporting router functions (2% fee + 0.3% Uniswap fee verified) → renounceOwnership, all green | `scripts/rehearse-launch.ts` |

### Reproducing the Slither run

Slither doesn't yet parse Hardhat 3's split build-info files. Workaround:
compile, then merge each `artifacts/build-info/*.json` + `*.output.json`
pair into one file with the Hardhat 2 keys (`input`, `output`,
`solcVersion`), strip the `project/` source-name prefix, rewrite
`npm/<pkg>@<version>/` source names to `node_modules/<pkg>/`, ensure
`settings.optimizer` exists, and run
`slither . --compile-force-framework hardhat --ignore-compile
--filter-paths "forge-std|\.t\.sol|openzeppelin"`.

## ⚠️ Where the remaining steps must run

The sandboxed environment this repo was built in blocks all outbound network
traffic except package registries — no Ethereum RPC endpoint is reachable, so
steps 2–6 cannot execute from it. Run them either:

- **on your own machine** — clone the repo, `npm install`, follow the
  commands below; or
- **in a Claude Code session** whose environment network policy allows
  outbound traffic (configurable when creating the environment at
  https://code.claude.com/docs/en/claude-code-on-the-web) — then Claude can
  run the Sepolia rehearsal for you once a funded key is in the keystore.

## 🔑 Step 1 — Keys and wallets (owner)

- [ ] The deployer wallet is the founder wallet (hardware wallet or offline-generated key). It
      keeps the 400M founder hold, unlocked.
- [ ] The treasury wallet is a separate single-key wallet held by the founder — not the
      deployer, not a multisig. Its address is the constructor argument and can never change,
      so confirm it (and that you control its key) before deploying anything.
- [ ] Get an RPC endpoint (Alchemy/Infura free tier works) and an Etherscan
      API key (free at etherscan.io/apis).

## 🔑 Step 2 — Sepolia rehearsal (one command each)

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY     # fund it from a Sepolia faucet first
npx hardhat keystore set ETHERSCAN_API_KEY

# ignition/parameters.json holds {"CardinalsPromiseModule":{"treasury":"0x..."}}
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia --parameters ignition/parameters.json
npx hardhat verify --network sepolia <token-address> <treasury-address>
```

Then: add the token to a wallet, send a few transfers between non-treasury
wallets and confirm the recipient gets 98% and the treasury 2%, send one to
the treasury and confirm it arrives whole, and confirm Etherscan shows
verified source and correct metadata. The full walkthrough — including the
600M treasury transfer, seeding the pool from the treasury, and the fee-aware
test swap — is `SEPOLIA_DRY_RUN.md`.

## 🔑 Step 3 — Audit (owner engages, before real value)

The contract is tiny (a few dozen lines over audited OpenZeppelin v5 base
contracts; the only custom logic is the `_update` override that skims the
fee) and Slither-clean, which keeps audit cost low. In rough order of cost: Slither/Mythril pass (done/free) → independent
experienced reviewer → community platform (Code4rena, Sherlock) →
professional firm. Do not skip this if the token will hold real value.

## 🔑 Step 4 — Legal review (owner engages, before mainnet)

Token issuance can be a regulated activity (US: Howey test; EU: MiCA).
Engage a crypto-literate lawyer on: what CARD is for, how it's distributed,
whether it's sold, and required disclosures. Keep marketing free of any
implied returns — the name "Promise" makes this doubly important.

## 🔑 Step 5 — Mainnet deployment

```bash
npx hardhat keystore set MAINNET_RPC_URL
npx hardhat keystore set MAINNET_PRIVATE_KEY

# ignition/parameters.json: the mainnet treasury address (0xDAE6…b300)
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network mainnet --parameters ignition/parameters.json
npx hardhat verify --network mainnet <token-address> <treasury-address>
```

Immediately after:
- [ ] Verify source on Etherscan (command above).
- [ ] Check `treasury()` on Etherscan reads the intended address — it cannot be changed.
- [ ] Record the contract address in `assets/token-metadata.json` and README.
- [ ] `npx hardhat run scripts/transfer-treasury.ts` — sends 600M from the deployer to the
      treasury in one transfer (200M it keeps + 400M staged for the pool). Deployer now
      holds exactly 400M, the founder hold.

## 🔑 Step 6 — Liquidity, renounce, listings

Run from the **treasury** signer (a transfer from the treasury is fee-exempt, so the pair
receives the full 400M). The deployer needs only gas ETH.

```bash
CARD_NETWORK=mainnet CARD_TOKEN_ADDRESS=0x... CARD_TREASURY_ADDRESS=0xDAE6...b300 \
  CARD_AMOUNT=400000000 ETH_AMOUNT=... npx hardhat run scripts/add-liquidity.ts
```

- [ ] The CARD/ETH ratio you pass sets the launch price — sanity-check it.
- [ ] Test swap from a separate buyer wallet: buy with
      `swapExactETHForTokensSupportingFeeOnTransferTokens`, sell with
      `swapExactTokensForETHSupportingFeeOnTransferTokens` (the Uniswap app does this
      automatically; slippage at least 3%). Confirm 2% of each leg landed in the treasury.
- [ ] Lock the LP tokens (held by the treasury wallet) for 12 months (Team Finance, UNCX)
      and publish the lock.
- [ ] `npx hardhat run scripts/renounce.ts` from the deployer — publish the tx.
      Balances at this point: deployer 400M, treasury 200M (+ fees), pool ~400M.
- [ ] Submit logo + info to Etherscan (token update form, uses
      `assets/logo-32.png`), CoinGecko, and a Uniswap token list.
- [ ] Publish the contract address on your site/socials so nobody gets
      phished by fakes.
