# Cardinals Promise (CARD) — Launch Runbook

Status of each step on the road to mainnet. Items marked ✅ are done in this
repo; items marked 🔑 need something only the project owner can provide
(keys, funds, signatures, legal engagement).

## ✅ Done

| Step | Where |
| --- | --- |
| Token contract (250M hard cap, burnable, capped mint) | `contracts/CardinalsPromise.sol` |
| Test suite — 19 tests, all passing | `test/CardinalsPromise.ts` |
| Static analysis — Slither v0.11.5, all 101 detectors, **0 findings** | run locally, see below to reproduce |
| Local deployment rehearsal (Ignition) | `ignition/modules/CardinalsPromise.ts` |
| CI — compile + tests on every push/PR | `.github/workflows/ci.yml` |
| Sepolia + mainnet network config | `hardhat.config.ts` |
| Etherscan verification config | `hardhat.config.ts` (`verify.etherscan`) |
| Uniswap V2 liquidity script | `scripts/add-liquidity.ts` |
| Logo (SVG + 256px/32px PNG) and token metadata | `assets/` |

### Reproducing the Slither run

Slither doesn't yet parse Hardhat 3's split build-info files. Workaround:
compile, then merge each `artifacts/build-info/*.json` + `*.output.json`
pair into one file with the Hardhat 2 keys (`input`, `output`,
`solcVersion`), strip the `project/` source-name prefix, ensure
`settings.optimizer` exists, and run
`slither . --compile-force-framework hardhat --ignore-compile`.

## 🔑 Step 1 — Keys and wallets (owner)

- [ ] Create a fresh deployer wallet (hardware wallet or offline-generated key).
- [ ] Create a Gnosis Safe multisig for the treasury/ownership if the supply
      won't be fully minted at launch.
- [ ] Get an RPC endpoint (Alchemy/Infura free tier works) and an Etherscan
      API key (free at etherscan.io/apis).

## 🔑 Step 2 — Sepolia rehearsal (one command each)

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY     # fund it from a Sepolia faucet first
npx hardhat keystore set ETHERSCAN_API_KEY

npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
npx hardhat verify --network sepolia <deployed-address> 250000000000000000000000000
```

Then: add the token to a wallet, send a few transfers, confirm Etherscan
shows verified source and correct metadata.

## 🔑 Step 3 — Audit (owner engages, before real value)

The contract is small (~190 lines) and Slither-clean, which keeps audit cost
low. In rough order of cost: Slither/Mythril pass (done/free) → independent
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
npx hardhat verify --network mainnet <deployed-address> 250000000000000000000000000
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
