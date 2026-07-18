// Exercises the launch-day helpers end-to-end on the in-process simulated
// network: deploy → check → fund treasury → simulate pool funding → check →
// renounce → check. Also proves the guardrails fire (double-send blocked,
// renounce blocked while the deployer still holds tokens). Runs with no real
// network and no real money:
//
//   npx hardhat run scripts/smoke-test-local.ts

import assert from "node:assert/strict";
import { network } from "hardhat";

import {
  describeStage,
  POOL_AMOUNT,
  readState,
  renounce,
  transferTreasury,
} from "./launch-lib.js";

const { viem } = await network.create("hardhatMainnet");
const publicClient = await viem.getPublicClient();
const [deployerWallet, treasuryWallet, poolWallet] = await viem.getWalletClients();
const deployer = deployerWallet.account.address;
const treasury = treasuryWallet.account.address;
const pool = poolWallet.account.address; // stands in for the Uniswap pair

const token = await viem.deployContract("CardinalsPromise");
console.log("deployed CardinalsPromise at", token.address);

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

// Renounce still blocked (deployer still holds the 200M)
await assert.rejects(
  renounce(token, publicClient, deployer, { treasury, pool }, { confirm: async () => true }),
  /ABORT/,
);
console.log("✔ renounce correctly blocked before pool is funded");

// "Create the pool": send the 200M to the stand-in pool address
const hash = await token.write.transfer([pool, POOL_AMOUNT]);
await publicClient.waitForTransactionReceipt({ hash });
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
