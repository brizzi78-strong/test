# CARD Token — Foundry/Hardhat Skeleton

A hybrid smart-contract project skeleton that works with **both** toolchains:

- **Hardhat 3** — TypeScript tests (`node:test` + viem) and Foundry-compatible
  Solidity tests, run together with a single command.
- **Foundry** — the same contracts and `.t.sol` tests run under `forge test`;
  `foundry.toml` and `remappings.txt` point forge at the npm dependency tree,
  so there is one set of dependencies for both tools.

The sample contract is `CardToken` (CARD), the fixed-supply ERC-20 described in
the token launch strategy (`TOKEN_LAUNCH_STRATEGY.md`): the full 250,000,000
supply is minted to the deployer at construction, with no mint function and no
pause/blocklist — supply can never change. `Ownable` is inherited solely so
that `renounceOwnership()` can be executed as a public, verifiable launch step
(see `LAUNCH_DAY_CHECKLIST.md`); no function is owner-gated, so ownership
grants no power even before it is renounced.

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

On first build Hardhat downloads the native `solc` binary from
`binaries.soliditylang.org`. If that host is unreachable (restricted/offline
networks), compile with the WASM build bundled in the `solc` npm package
instead — same compiler version, identical bytecode:

```bash
HARDHAT_BUNDLED_SOLC=1 npx hardhat test
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

## Etherscan verification

Source verification (step 2 of `LAUNCH_DAY_CHECKLIST.md`) goes through
`hardhat-verify`, which ships with the toolbox. Store an
[Etherscan API key](https://etherscan.io/apis) the same way as the RPC
secrets, then verify the deployed address — `CardToken` takes no constructor
arguments:

```bash
npx hardhat keystore set ETHERSCAN_API_KEY
npx hardhat verify --network sepolia <deployed-address>
```

Deployments made with Ignition can be verified in one step from the recorded
deployment instead:

```bash
npx hardhat ignition verify chain-11155111   # sepolia deployment id
```

Verification submits the sources to `etherscan.io`; compilation beforehand
fetches the compiler from `binaries.soliditylang.org` (unless using the
bundled fallback above), so those are the two hosts the toolchain needs to
reach.

If the API route isn't available, `verification/` contains a ready-to-upload
standard JSON input and instructions for verifying manually through
Etherscan's web form — see [verification/README.md](verification/README.md).
