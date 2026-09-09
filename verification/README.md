# Manual Etherscan verification (plan B)

Ready-to-upload package for verifying `CardinalsPromise` through Etherscan's web UI —
no API key and no `hardhat verify` run needed. Use this if the API route is
unavailable; otherwise the commands in the main README's "Etherscan
verification" section are less work.

`CardinalsPromise.solc-input.json` is the solc **standard JSON input** for the
`production` build profile (optimizer enabled, 200 runs, evmVersion `cancun`)
— the profile `npx hardhat ignition deploy` uses by default, so it matches the
deployed bytecode. It has been checked to compile standalone with solc
0.8.28.

## Steps

1. Open `https://etherscan.io/address/<token-address>#code` (or
   `sepolia.etherscan.io` for the testnet dry run) and click
   **Verify & Publish**.
2. Fill the form:
   - Compiler type: **Solidity (Standard-JSON-Input)**
   - Compiler version: **v0.8.28+commit.7893614a**
   - License: **MIT**
3. Upload `CardinalsPromise.solc-input.json`.
4. If asked which contract, pick
   `project/contracts/CardinalsPromise.sol:CardinalsPromise`.
5. Constructor arguments: the contract takes one, the treasury address.
   Etherscan wants it ABI-encoded — a 32-byte left-padded address with no
   `0x` prefix, i.e. 24 zeros followed by the 40 hex characters of the
   address (for the launch treasury `0xDAE63eBEe60A691e1538D480AE3F6509068ab300`:
   `000000000000000000000000dae63ebee60a691e1538d480ae3f6509068ab300`).
   Etherscan usually pre-fills this from the deployment transaction; check
   it matches.
6. Submit and confirm the Contract tab shows the green check
   (launch checklist step 2).

## Regenerating

If the contract or compiler settings change, rebuild and re-export:

```bash
HARDHAT_BUNDLED_SOLC=1 npx hardhat build --build-profile production
node scripts/export-solc-input.mjs
```

(Drop `HARDHAT_BUNDLED_SOLC=1` on a network that can reach
`binaries.soliditylang.org`.)

> If you deploy any way other than Ignition's default, make sure the build
> profile used to deploy is the one exported here — optimizer settings must
> match or Etherscan's bytecode comparison fails.
