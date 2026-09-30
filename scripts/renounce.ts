// Checklist step 6: renounce ownership. ⚠️ POINT OF NO RETURN.
//
// Before sending anything this script re-checks every abort criterion it can
// verify on-chain (treasury at least 200M, founder exactly 400M, pool about 400M) and makes you
// confirm the ones it can't (source verified, test swap
// done, LP locked) with a network-specific confirmation phrase. Mainnet uses
// "renounce forever"; disposable Sepolia practice uses "renounce practice".
// If any check fails it stops without sending.
//
//   npx hardhat run scripts/renounce.ts
//
// Addresses and network come from launch.json — including "pool", which must
// be filled in by this point.

import { network } from "hardhat";

import { explorerTxUrl, loadLaunchConfig, renounce } from "./launch-lib.js";

const config = loadLaunchConfig(new URL("../launch.json", import.meta.url));
const { viem } = await network.create(config.network);

const [wallet] = await viem.getWalletClients();
const deployer = wallet.account.address;
if (deployer.toLowerCase() !== config.deployer.toLowerCase()) {
  throw new Error(`connected wallet ${deployer} is not launch.json deployer ${config.deployer}`);
}
const token = await viem.getContractAt("CardinalsPromise", config.token);
const publicClient = await viem.getPublicClient();

console.log(`network: ${config.network}`);
console.log(`token:   ${config.token}`);

const hash = await renounce(token, publicClient, config.deployer, config);

console.log(`\n✅ Ownership renounced — the contract is now final, forever.`);
console.log(`Save this link, it goes in the announcement:`);
console.log(`   ${explorerTxUrl(config.network, hash)}`);
