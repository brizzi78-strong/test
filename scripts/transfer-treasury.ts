// Checklist step 3: send 150,000,000 CARD to the treasury: 50M retained and
// 100M staged for the fee-exempt pool seed. Refuses to run twice.
//
//   npx hardhat run scripts/transfer-treasury.ts
//
// Addresses and network come from launch.json.

import { network } from "hardhat";

import { explorerTxUrl, fmt, loadLaunchConfig, readState, transferTreasury, TREASURY_STAGING_AMOUNT } from "./launch-lib.js";

const config = loadLaunchConfig(new URL("../launch.json", import.meta.url));
const { viem } = await network.create(config.network);

const [wallet] = await viem.getWalletClients();
const deployer = wallet.account.address;
if (deployer.toLowerCase() !== config.deployer.toLowerCase()) {
  throw new Error(`connected wallet ${deployer} is not launch.json deployer ${config.deployer}`);
}
const token = await viem.getContractAt("CardinalsPromise", config.token);
const publicClient = await viem.getPublicClient();

console.log(`network:  ${config.network}`);
console.log(`sending   ${fmt(TREASURY_STAGING_AMOUNT)} (50M treasury + 100M pool inventory)`);
console.log(`from      ${deployer} (deployer)`);
console.log(`to        ${config.treasury} (treasury)\n`);

const hash = await transferTreasury(token, publicClient, config.deployer, config.treasury);

console.log(`✅ done — save this link, it's proof link material for the announcement:`);
console.log(`   ${explorerTxUrl(config.network, hash)}\n`);

const after = await readState(token, config.deployer, config.treasury);
console.log(`deployer now holds: ${fmt(after.deployerBalance)}`);
console.log(`treasury now holds: ${fmt(after.treasuryBalance)}`);
