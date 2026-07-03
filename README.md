# CARD Token — Foundry/Hardhat Skeleton

A hybrid smart-contract project skeleton that works with **both** toolchains:

- **Hardhat 3** — TypeScript tests (`node:test` + viem) and Foundry-compatible
  Solidity tests, run together with a single command.
- **Foundry** — the same contracts and `.t.sol` tests run under `forge test`;
  `foundry.toml` and `remappings.txt` point forge at the npm dependency tree,
  so there is one set of dependencies for both tools.

The sample contract is `CardToken` (CARD), the fixed-supply ERC-20 described in
the token launch strategy (`TOKEN_LAUNCH_STRATEGY.md`, PR #18): the full
250,000,000 supply is minted to the deployer at construction, and the contract
has no owner, no mint function, and no pause/blocklist — supply can never change
and there is no privileged role to renounce.

## Layout

```
contracts/CardToken.sol       # the token
contracts/CardToken.t.sol     # Foundry-style Solidity tests (forge-std)
test/CardToken.ts             # TypeScript tests (node:test + viem)
ignition/modules/CardToken.ts # Hardhat Ignition deployment module
hardhat.config.ts             # Hardhat 3 config
foundry.toml + remappings.txt # Foundry config (deps resolved from node_modules)
```

## Getting started

```bash
npm install
```

### Hardhat

```bash
npx hardhat test          # runs Solidity AND TypeScript tests
npx hardhat build         # compile
```

### Foundry (optional)

With [Foundry](https://getfoundry.sh) installed, the same Solidity tests run
natively:

```bash
forge test
```

## Deployment

Deploy with Hardhat Ignition. RPC URLs and keys are supplied through the
[Hardhat keystore / configuration variables](https://hardhat.org/docs) —
nothing sensitive lives in the repo:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat ignition deploy ignition/modules/CardToken.ts --network sepolia
```

A `mainnet` network is pre-wired the same way (`MAINNET_RPC_URL`,
`MAINNET_PRIVATE_KEY`) for when the launch checklist in
`TOKEN_LAUNCH_STRATEGY.md` is ready to execute.
