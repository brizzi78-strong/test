// PRACTICE ONLY — Sepolia dry run, step 4 (simulated pool).
//
// Sends the remaining 200,000,000 CARD from the deployer to the practice
// "pool" wallet named in launch.json, so the balances look like a funded
// Uniswap pool to launch-check and renounce. On the real launch day you do
// NOT run this — you create an actual Uniswap pool instead.
//
//   npx hardhat run scripts/fund-pool-sim.ts

import { network } from "hardhat";

import { explorerTxUrl, fmt, fundPoolSim, loadLaunchConfig, POOL_AMOUNT } from "./launch-lib.js";

const config = loadLaunchConfig(new URL("../launch.json", import.meta.url));
if (!config.pool) {
  throw new Error('launch.json: fill in "pool" with the practice pool wallet address first.');
}
if (config.network === "mainnet") {
  throw new Error("this is a practice-only script — never run it against mainnet.");
}

const { viem } = await network.create(config.network);
const [wallet] = await viem.getWalletClients();
const deployer = wallet.account.address;
const token = await viem.getContractAt("CardinalsPromise", config.token);
const publicClient = await viem.getPublicClient();

console.log(`network:  ${config.network} (practice)`);
console.log(`sending   ${fmt(POOL_AMOUNT)}`);
console.log(`from      ${deployer} (deployer)`);
console.log(`to        ${config.pool} (simulated pool)\n`);

const hash = await fundPoolSim(token, publicClient, deployer, config.treasury, config.pool);

console.log(`✅ done: ${explorerTxUrl(config.network, hash)}`);
console.log("Balances now look like a funded pool — run launch-check to confirm.");
