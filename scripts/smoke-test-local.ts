// Exercises the launch-day helpers end-to-end on the in-process simulated
// network: deploy → check → fund treasury → simulate pool funding → check →
// renounce → check. Also proves the guardrails fire (double-send blocked,
// renounce blocked until the staged pool inventory moves). Runs with no real
// network and no real money:
//
//   npx hardhat run scripts/smoke-test-local.ts

import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

import {
  describeStage,
  fundPoolSim,
  readState,
  renounce,
  transferTreasury,
} from "./launch-lib.js";

const { viem } = await network.create("hardhatMainnet");
const publicClient = await viem.getPublicClient();
const [deployerWallet, treasuryWallet, poolWallet, buyerWallet] = await viem.getWalletClients();
const deployer = deployerWallet.account.address;
const treasury = treasuryWallet.account.address;
const pool = poolWallet.account.address; // stands in for the Uniswap pair

const token = await viem.deployContract("CardinalsPromise", [treasury]);
console.log("deployed CARD at", token.address);

// Fresh deploy → stage 1, no problems
let state = await readState(token, deployer, treasury, pool);
let verdict = describeStage(state, deployer);
assert.equal(verdict.problems.length, 0, verdict.problems.join("; "));
assert.match(verdict.stage, /transfer-treasury/);
console.log("✔ fresh-deploy state recognized:", verdict.stage);

// Renounce must be blocked this early
await assert.rejects(
  renounce(token, publicClient, deployer, { treasury, pool }, { confirm: async () => true }),
  /ABORT/,
);
console.log("✔ renounce correctly blocked before setup is complete");

// Fund the treasury
await transferTreasury(token, publicClient, deployer, treasury);
state = await readState(token, deployer, treasury, pool);
verdict = describeStage(state, deployer);
assert.equal(verdict.problems.length, 0, verdict.problems.join("; "));
assert.match(verdict.stage, /Uniswap pool/);
console.log("✔ treasury funded:", verdict.stage);

// Double-send must be blocked
await assert.rejects(transferTreasury(token, publicClient, deployer, treasury), /already holds/);
console.log("✔ second treasury transfer correctly blocked");

// Renounce still blocked (the pool inventory is still in the treasury)
await assert.rejects(
  renounce(token, publicClient, deployer, { treasury, pool }, { confirm: async () => true }),
  /ABORT/,
);
console.log("✔ renounce correctly blocked before pool is funded");

// "Create the pool" via the practice helper
await fundPoolSim(token, publicClient, deployer, treasury, pool, treasury);

// Running it twice must be blocked
await assert.rejects(fundPoolSim(token, publicClient, deployer, treasury, pool, treasury), /already holds/);
console.log("✔ second pool-sim transfer correctly blocked");

// Simulate the token leg of a test buy. The pair loses the gross amount, the
// buyer receives 98%, and treasury rises above its retained 50M. Launch guards
// must accept this expected, disclosed fee delta.
await token.write.transfer([buyerWallet.account.address, parseEther("1000")], {
  account: poolWallet.account,
});
assert.equal(await token.read.balanceOf([buyerWallet.account.address]), parseEther("980"));
assert.equal(await token.read.balanceOf([treasury]), parseEther("50000020"));

state = await readState(token, deployer, treasury, pool);
verdict = describeStage(state, deployer);
assert.equal(verdict.problems.length, 0, verdict.problems.join("; "));
assert.match(verdict.stage, /renounce/);
console.log("✔ pool funded:", verdict.stage);

// Renounce with confirmation declined must send nothing
await assert.rejects(
  renounce(token, publicClient, deployer, { treasury, pool }, { confirm: async () => false }),
  /not confirmed/,
);
assert.notEqual(BigInt(await token.read.owner()), 0n);
console.log("✔ declining the confirmation sends nothing");

// Renounce for real
await renounce(token, publicClient, deployer, { treasury, pool }, { confirm: async () => true });
state = await readState(token, deployer, treasury, pool);
verdict = describeStage(state, deployer);
assert.equal(verdict.problems.length, 0, verdict.problems.join("; "));
assert.match(verdict.stage, /RENOUNCED/);
console.log("✔ renounced:", verdict.stage);

console.log("\n✅ smoke test passed — all launch scripts behave as intended.");
