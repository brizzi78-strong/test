// Checklist step 3: send exactly 50,000,000 CARD (20%) from the deployer to
// the treasury wallet. Refuses to run if anything has already moved, so it
// cannot double-send.
//
//   npx hardhat run scripts/transfer-treasury.ts
//
// Addresses and network come from launch.json.

import { network } from "hardhat";

import { explorerTxUrl, fmt, loadLaunchConfig, readState, transferTreasury, TREASURY_AMOUNT } from "./launch-lib.js";

const config = loadLaunchConfig(new URL("../launch.json", import.meta.url));
const { viem } = await network.create(config.network);

const [wallet] = await viem.getWalletClients();
const deployer = wallet.account.address;
const token = await viem.getContractAt("CardToken", config.token);
const publicClient = await viem.getPublicClient();

console.log(`network:  ${config.network}`);
console.log(`sending   ${fmt(TREASURY_AMOUNT)}`);
console.log(`from      ${deployer} (deployer)`);
console.log(`to        ${config.treasury} (treasury)\n`);

const hash = await transferTreasury(token, publicClient, deployer, config.treasury);

console.log(`✅ done — save this link, it's proof link material for the announcement:`);
console.log(`   ${explorerTxUrl(config.network, hash)}\n`);

const after = await readState(token, deployer, config.treasury);
console.log(`deployer now holds: ${fmt(after.deployerBalance)}`);
console.log(`treasury now holds: ${fmt(after.treasuryBalance)}`);
