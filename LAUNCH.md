# Cardinals Promise (CARD) — Launch Runbook

## Decided launch parameters

| Decision | Value |
| --- | --- |
| Supply | Mint all 250M at deploy, `renounceOwnership()` immediately after verification |
| Uniswap pool | 200M CARD (80%) paired with 2–5 ETH |
| Treasury | 50M CARD (20%) in a publicly announced wallet |
| LP tokens | Locked 12 months (Team Finance or UNCX) |
| Timeline | Week 0: Sepolia rehearsal → Weeks 1–2: independent audit + legal consult → Week 3: mainnet |
| Before mainnet | Publish the one-page site (`site/`) explaining what the promise is |

Status of each step on the road to mainnet. Items marked ✅ are done in this
repo; items marked 🔑 need something only the project owner can provide
(keys, funds, signatures, legal engagement).

## ✅ Done

| Step | Where |
| --- | --- |
| Token contract (250M fixed supply — no mint, no burn; OpenZeppelin ERC20 + Ownable) | `contracts/CardinalsPromise.sol` |
| Test suite — 17 tests (Foundry-style Solidity incl. fuzz + invariants, plus node:test/viem), all passing | `contracts/*.t.sol`, `test/CardinalsPromise.ts` |
| Machine-checkable launch-claims ledger — 8/8 claims verified in CI (`npm run verify`) | `verification/claims.json` |
| Static analysis — Slither v0.11.5, all 101 detectors, **0 findings** | run locally, see below to reproduce |
| Local deployment rehearsal (Ignition) | `ignition/modules/CardinalsPromise.ts` |
| CI — build + full test suite + claims verification on every push/PR | `.github/workflows/verify.yml` |
| Sepolia + mainnet network config | `hardhat.config.ts` |
| Etherscan verification config | `hardhat.config.ts` (`verify.etherscan`) |
| Uniswap V2 liquidity script | `scripts/add-liquidity.ts` |
| Logo (SVG + 256px/32px PNG) and token metadata | `assets/` |
| **Full launch dress rehearsal** — real Uniswap V2 stack deployed locally; deploy → seed 10M CARD/100 ETH pool → buyer swap (price verified incl. 0.3% fee) → renounceOwnership, all green | `scripts/rehearse-launch.ts` |

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

- [ ] Create a fresh deployer wallet (hardware wallet or offline-generated key).
- [ ] Create a Gnosis Safe multisig for the 50M treasury allocation.
- [ ] Get an RPC endpoint (Alchemy/Infura free tier works) and an Etherscan
      API key (free at etherscan.io/apis).

## 🔑 Step 2 — Sepolia rehearsal (one command each)

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY     # fund it from a Sepolia faucet first
npx hardhat keystore set ETHERSCAN_API_KEY

npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
npx hardhat verify --network sepolia <deployed-address>
```

Then: add the token to a wallet, send a few transfers, confirm Etherscan
shows verified source and correct metadata.

## 🔑 Step 3 — Audit (owner engages, before real value)

The contract is tiny (~20 lines over audited OpenZeppelin v5 base contracts)
and Slither-clean, which keeps audit cost low. In rough order of cost: Slither/Mythril pass (done/free) → independent
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

npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network mainnet
npx hardhat verify --network mainnet <deployed-address>
```

Immediately after:
- [ ] Verify source on Etherscan (command above).
- [ ] `renounceOwnership()` (supply locked forever) **or**
      `transferOwnership(<multisig>)` — publish the tx either way.
- [ ] Record the contract address in `assets/token-metadata.json` and README.

## 🔑 Step 6 — Liquidity + listings

```bash
CARD_NETWORK=mainnet CARD_TOKEN_ADDRESS=0x... CARD_AMOUNT=... ETH_AMOUNT=... \
  npx hardhat run scripts/add-liquidity.ts
```

- [ ] The CARD/ETH ratio you pass sets the launch price — sanity-check it.
- [ ] Lock the LP tokens (Unicrypt, Team Finance) and publish the lock.
- [ ] Submit logo + info to Etherscan (token update form, uses
      `assets/logo-32.png`), CoinGecko, and a Uniswap token list.
- [ ] Publish the contract address on your site/socials so nobody gets
      phished by fakes.
