// Checklist step 6: renounce ownership. ⚠️ POINT OF NO RETURN.
//
// Before sending anything this script re-checks every abort criterion it can
// verify on-chain (treasury holds exactly 50M, deployer holds 0, pool holds
// ~200M) and makes you confirm the ones it can't (source verified, test swap
// done, LP locked) by typing "renounce forever". If any check fails it stops
// without sending.
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
const token = await viem.getContractAt("CardToken", config.token);
const publicClient = await viem.getPublicClient();

console.log(`network: ${config.network}`);
console.log(`token:   ${config.token}`);

const hash = await renounce(token, publicClient, deployer, config);

console.log(`\n✅ Ownership renounced — the contract is now final, forever.`);
console.log(`Save this link, it goes in the announcement:`);
console.log(`   ${explorerTxUrl(config.network, hash)}`);
