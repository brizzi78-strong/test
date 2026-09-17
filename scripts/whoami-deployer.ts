// Prints the address controlled by whatever key is currently stored as
// MAINNET_PRIVATE_KEY in the Hardhat keystore — without ever printing the
// key itself. Read-only, sends nothing, costs nothing.
//
// Useful after `npx hardhat keystore set MAINNET_PRIVATE_KEY` to confirm
// which wallet actually got saved, especially if the key was set more than
// once and it's unclear which address is now in the keystore.
//
//   npx hardhat run scripts/whoami-deployer.ts

import { network } from "hardhat";

const { viem } = await network.create("mainnet");
const [wallet] = await viem.getWalletClients();
console.log(`deployer address: ${wallet.account.address}`);
