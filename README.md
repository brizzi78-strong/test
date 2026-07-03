# Cardinals Promise (CARD)

[![CI](https://github.com/brizzi78-strong/test/actions/workflows/ci.yml/badge.svg)](https://github.com/brizzi78-strong/test/actions/workflows/ci.yml)

An ERC-20 token on Ethereum, built with [Hardhat 3](https://hardhat.org) and Solidity 0.8.28.

**Launching for real? Follow the step-by-step [launch runbook](LAUNCH.md).**

## Token overview

| Property | Value |
| --- | --- |
| Name | Cardinals Promise |
| Symbol | CARD |
| Decimals | 18 |
| Max supply | 250,000,000 CARD (hard cap, enforced on-chain) |
| Default initial supply | 250,000,000 CARD minted to the deployer (the full supply) |

### Features

- **Standard ERC-20** (EIP-20): `transfer`, `approve`, `transferFrom`, `balanceOf`, `allowance`, `totalSupply`, plus `Transfer`/`Approval` events.
- **Capped minting** — the owner can mint new tokens, but the total supply can never exceed 250 million CARD. With the default deployment the full supply is minted up front, so no further minting is possible.
- **Burning** — any holder can `burn` their own tokens, or `burnFrom` another account with an allowance. Burns reduce `totalSupply`.
- **Infinite allowance** — an allowance of `type(uint256).max` is never decremented (gas-friendly for routers/AMMs).
- **Ownership controls** — `transferOwnership` hands minting rights to a new address; `renounceOwnership` permanently freezes the supply.
- **No external dependencies** — the contract is self-contained (no OpenZeppelin imports), uses custom errors for cheap reverts, and has no fees, hooks, blocklists, or pausing.

The contract lives at [`contracts/CardinalsPromise.sol`](contracts/CardinalsPromise.sol).

## Getting started

```bash
npm install
npm run build   # compile
npm test        # run the test suite
```

> **Note:** the project compiles with the solc WASM build bundled with the
> `solc` npm package, so no compiler download from
> `binaries.soliditylang.org` is required.

## Deployment

Deployment is managed with [Hardhat Ignition](https://hardhat.org/ignition).

### Local (in-process network)

```bash
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts
```

### Sepolia testnet

Store your RPC URL and deployer key in the encrypted Hardhat keystore, then deploy:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
```

To override the initial supply (value in wei units, 18 decimals — e.g. mint
only 100M up front and leave the rest mintable by the owner):

```bash
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts \
  --parameters '{"CardinalsPromiseModule":{"initialSupply":"100000000000000000000000000"}}'
```

## Project layout

```
contracts/CardinalsPromise.sol        # the token contract
test/CardinalsPromise.ts              # mocha + ethers test suite (19 tests)
ignition/modules/CardinalsPromise.ts  # deployment module
scripts/add-liquidity.ts              # create/seed a Uniswap V2 CARD/ETH pool
assets/                               # logo (SVG + PNG) and token metadata
hardhat.config.ts                     # Hardhat 3 configuration
LAUNCH.md                             # step-by-step launch runbook
```

## Security

- 19-test suite runs in CI on every push (`.github/workflows/ci.yml`).
- Slither v0.11.5 static analysis: 0 findings across all 101 detectors
  (see LAUNCH.md for how to reproduce the run against Hardhat 3 artifacts).
- The contract still needs a professional audit before holding real value.

## Disclaimer

This code is provided as-is for educational purposes. Have any contract
audited by a professional before deploying it to mainnet or accepting real
value, and make sure any token launch complies with the securities and
consumer-protection laws of the relevant jurisdictions.
