// Safety check: reads the token's on-chain state and says which launch step
// you're on and whether anything matches the checklist's abort criteria.
// Read-only — safe to run as often as you like, at any point.
//
//   npx hardhat run scripts/launch-check.ts
//
// Addresses and network come from launch.json.

import { network } from "hardhat";

import { describeStage, loadLaunchConfig, printState, readState } from "./launch-lib.js";

const config = loadLaunchConfig(new URL("../launch.json", import.meta.url));
const { viem } = await network.create(config.network);

const [wallet] = await viem.getWalletClients();
const deployer = wallet.account.address;
const token = await viem.getContractAt("CardToken", config.token);

console.log(`network:   ${config.network}\n`);
const state = await readState(token, deployer, config.treasury, config.pool);
printState(state, deployer, config);

const { stage, problems } = describeStage(state, deployer);
console.log(`\nstage:     ${stage}`);

if (problems.length > 0) {
  console.log("\n❌ PROBLEMS — do not proceed (see LAUNCH_DAY_CHECKLIST.md abort criteria):");
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("\n✅ No problems detected in the on-chain state.");
