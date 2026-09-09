# Nolax (NOLAX)

A fixed-supply ERC-20 token on Ethereum.

| | |
| --- | --- |
| Name | Nolax |
| Symbol | NOLAX |
| Decimals | 18 |
| Total supply | 250,000,000 NOLAX (fixed) |

## What the contract does — and doesn't

The entire 250M supply is minted once, to the deployer, in the constructor.
After that the contract has no privileged behaviour at all:

- **No mint function.** Supply can never increase. Not by the owner, not by anyone.
- **No burn, no rebase.** Supply can never decrease either — it is constant forever.
- **No transfer tax.** A transfer of N tokens moves exactly N tokens. Nothing is skimmed.
- **No blacklist / no pause.** No address can be frozen and transfers can never be halted.
- **No owner-gated functions.** `Ownable` is inherited *only* so that
  `renounceOwnership()` can be called as a public, verifiable launch step.
  Ownership grants no power even before it is renounced.

`contracts/Nolax.sol` is the whole contract — it is deliberately small enough to
read in one sitting.

## Tests

17 tests covering metadata, supply, transfers, approvals, ownership renouncement,
and the launch-critical invariants:

```bash
npm install
npm test
```

The invariant suite runs 256 randomized call sequences against a handler
contract and re-checks after every sequence that:

1. total supply never changes,
2. every unit of supply is accounted for in some holder's balance
   (no tokens created or destroyed by any sequence of operations),
3. once ownership is renounced it can never come back.

If the machine building this can't reach `binaries.soliditylang.org`, compile
with the bundled WASM compiler instead — same 0.8.28 compiler, identical
bytecode:

```bash
HARDHAT_BUNDLED_SOLC=1 npm test
```

## Deploying

Set the secrets in Hardhat's encrypted keystore (they are never written to disk
in plaintext, and never committed):

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY     # fund from a Sepolia faucet first
npx hardhat keystore set ETHERSCAN_API_KEY
```

Then deploy and verify:

```bash
npm run deploy:sepolia
npx hardhat verify --network sepolia <deployed-address>
```

Mainnet uses `MAINNET_RPC_URL` / `MAINNET_PRIVATE_KEY` and `npm run deploy:mainnet`.

**Rehearse on Sepolia first.** Deploy, add the token to a wallet, send a few
transfers, and confirm Etherscan shows verified source with the correct
metadata — before anything touches mainnet.

## Suggested launch sequence

1. Deploy to Sepolia, verify on Etherscan, exercise transfers.
2. Independent audit / review before real value is at stake.
3. Deploy to mainnet from a fresh, dedicated deployer wallet.
4. Verify the source on Etherscan so anyone can read what they're buying.
5. Call `renounceOwnership()` and point people at the transaction.
6. Seed liquidity, and lock the LP tokens.

Steps 3–6 involve real funds and irreversible transactions. Move deliberately.
