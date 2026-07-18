// Shared logic for the launch-day scripts (launch-check, transfer-treasury,
// renounce). The CLI scripts read addresses from launch.json at the repo
// root; smoke-test-local.ts calls these functions directly against an
// in-process network.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { formatEther, getAddress, parseEther } from "viem";

export const TOTAL_SUPPLY = parseEther("250000000");
export const TREASURY_AMOUNT = parseEther("50000000"); // 20%
export const POOL_AMOUNT = parseEther("200000000"); // 80%

export interface LaunchConfig {
  network: string;
  token: `0x${string}`;
  treasury: `0x${string}`;
  pool?: `0x${string}`;
}

// The subset of the Hardhat viem contract instance the scripts use.
interface CardinalsPromise {
  read: {
    name: () => Promise<string>;
    symbol: () => Promise<string>;
    totalSupply: () => Promise<bigint>;
    owner: () => Promise<`0x${string}`>;
    balanceOf: (args: [`0x${string}`]) => Promise<bigint>;
  };
  write: {
    transfer: (args: [`0x${string}`, bigint]) => Promise<`0x${string}`>;
    renounceOwnership: () => Promise<`0x${string}`>;
  };
}

interface PublicClientLike {
  waitForTransactionReceipt: (args: {
    hash: `0x${string}`;
  }) => Promise<{ status: string }>;
}

export function loadLaunchConfig(url: URL): LaunchConfig {
  const raw = JSON.parse(readFileSync(url, "utf8"));
  if (!raw.token) {
    throw new Error(
      "launch.json: fill in \"token\" with the deployed CardinalsPromise address first.",
    );
  }
  if (!raw.treasury) {
    throw new Error(
      "launch.json: fill in \"treasury\" with the treasury wallet address first.",
    );
  }
  return {
    network: raw.network || "sepolia",
    token: getAddress(raw.token),
    treasury: getAddress(raw.treasury),
    pool: raw.pool ? getAddress(raw.pool) : undefined,
  };
}

export function explorerTxUrl(network: string, hash: string): string {
  const host =
    network === "mainnet"
      ? "etherscan.io"
      : network === "sepolia"
        ? "sepolia.etherscan.io"
        : undefined;
  return host ? `https://${host}/tx/${hash}` : `tx ${hash}`;
}

export const fmt = (wei: bigint): string =>
  `${Number(formatEther(wei)).toLocaleString("en-US")} CARD`;

export interface LaunchState {
  name: string;
  symbol: string;
  totalSupply: bigint;
  owner: `0x${string}`;
  deployerBalance: bigint;
  treasuryBalance: bigint;
  poolBalance?: bigint;
}

export async function readState(
  token: CardinalsPromise,
  deployer: `0x${string}`,
  treasury: `0x${string}`,
  pool?: `0x${string}`,
): Promise<LaunchState> {
  return {
    name: await token.read.name(),
    symbol: await token.read.symbol(),
    totalSupply: await token.read.totalSupply(),
    owner: await token.read.owner(),
    deployerBalance: await token.read.balanceOf([deployer]),
    treasuryBalance: await token.read.balanceOf([treasury]),
    poolBalance: pool ? await token.read.balanceOf([pool]) : undefined,
  };
}

// Maps the on-chain state to the launch checklist: which step you're on and
// whether anything looks wrong. `problems` non-empty means DO NOT proceed.
export function describeStage(
  s: LaunchState,
  deployer: `0x${string}`,
): { stage: string; problems: string[] } {
  const problems: string[] = [];

  if (s.name !== "Cardinals Promise" || s.symbol !== "CARD") {
    problems.push(
      `token name/symbol is ${s.name}/${s.symbol}, expected "Cardinals Promise"/CARD — is the token address right?`,
    );
  }
  if (s.totalSupply !== TOTAL_SUPPLY) {
    problems.push(`total supply is ${fmt(s.totalSupply)}, expected ${fmt(TOTAL_SUPPLY)}`);
  }

  const renounced = BigInt(s.owner) === 0n;
  if (!renounced && getAddress(s.owner) !== getAddress(deployer)) {
    problems.push(`owner is ${s.owner}, which is neither the connected wallet nor the zero address`);
  }

  let stage: string;
  if (renounced) {
    stage = "Ownership RENOUNCED — contract is final. (checklist step 6 done)";
  } else if (s.treasuryBalance === 0n && s.deployerBalance === TOTAL_SUPPLY) {
    stage = "Deployed, treasury not yet funded — next: transfer-treasury (checklist step 3)";
  } else if (s.treasuryBalance === TREASURY_AMOUNT && s.deployerBalance === POOL_AMOUNT) {
    stage = "Treasury funded — next: create the Uniswap pool (checklist step 4)";
  } else if (s.treasuryBalance === TREASURY_AMOUNT && s.deployerBalance === 0n) {
    stage = "Pool funded — next: test swap, lock LP, then renounce (checklist steps 4-6)";
  } else {
    stage = "UNRECOGNIZED state — balances don't match any expected launch step";
    problems.push(
      `deployer holds ${fmt(s.deployerBalance)} and treasury holds ${fmt(s.treasuryBalance)}; ` +
        `expected one of: 250M/0 (fresh), 200M/50M (treasury funded), 0/50M (pool funded)`,
    );
  }

  return { stage, problems };
}

export function printState(
  s: LaunchState,
  deployer: `0x${string}`,
  config: { treasury: `0x${string}`; pool?: `0x${string}` },
): void {
  const renounced = BigInt(s.owner) === 0n;
  console.log(`token:     ${s.name} (${s.symbol})`);
  console.log(`supply:    ${fmt(s.totalSupply)}`);
  console.log(`owner:     ${renounced ? "0x000...000 (renounced)" : s.owner}`);
  console.log(`deployer:  ${deployer}  ${fmt(s.deployerBalance)}`);
  console.log(`treasury:  ${config.treasury}  ${fmt(s.treasuryBalance)}`);
  if (config.pool && s.poolBalance !== undefined) {
    console.log(`pool:      ${config.pool}  ${fmt(s.poolBalance)}`);
  }
}

// Checklist step 3: send exactly 50M CARD to the treasury. Refuses to run
// unless the token is in the untouched just-deployed state, so it can't
// double-send or fire mid-sequence.
export async function transferTreasury(
  token: CardinalsPromise,
  publicClient: PublicClientLike,
  deployer: `0x${string}`,
  treasury: `0x${string}`,
): Promise<`0x${string}`> {
  if (getAddress(treasury) === getAddress(deployer)) {
    throw new Error("treasury address is the deployer wallet — set the separate treasury wallet in launch.json.");
  }
  const state = await readState(token, deployer, treasury);
  if (BigInt(state.owner) === 0n) {
    throw new Error("ownership already renounced — this script should have run before that.");
  }
  if (state.treasuryBalance !== 0n) {
    throw new Error(`treasury already holds ${fmt(state.treasuryBalance)} — refusing to send again.`);
  }
  if (state.deployerBalance !== TOTAL_SUPPLY) {
    throw new Error(
      `deployer holds ${fmt(state.deployerBalance)}, expected the full ${fmt(TOTAL_SUPPLY)} — ` +
        "tokens have already moved; sort out the balances before using this script.",
    );
  }

  const hash = await token.write.transfer([treasury, TREASURY_AMOUNT]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`transfer transaction ${hash} failed (status: ${receipt.status})`);
  }

  const after = await readState(token, deployer, treasury);
  if (after.treasuryBalance !== TREASURY_AMOUNT) {
    throw new Error(`treasury balance after transfer is ${fmt(after.treasuryBalance)} — investigate before continuing!`);
  }
  return hash;
}

// Checklist step 6: the point of no return. Runs every abort-criteria check
// it can verify on-chain, makes the human confirm the ones it can't (source
// verified, LP locked), then renounces and confirms the owner is zero.
export async function renounce(
  token: CardinalsPromise,
  publicClient: PublicClientLike,
  deployer: `0x${string}`,
  config: { treasury: `0x${string}`; pool?: `0x${string}` },
  opts: { confirm?: () => Promise<boolean> } = {},
): Promise<`0x${string}`> {
  const state = await readState(token, deployer, config.treasury, config.pool);
  const problems: string[] = [];

  if (BigInt(state.owner) === 0n) {
    throw new Error("ownership is already renounced — nothing to do.");
  }
  if (getAddress(state.owner) !== getAddress(deployer)) {
    throw new Error(`connected wallet is not the owner (owner is ${state.owner}).`);
  }
  if (state.treasuryBalance !== TREASURY_AMOUNT) {
    problems.push(`treasury holds ${fmt(state.treasuryBalance)}, expected exactly ${fmt(TREASURY_AMOUNT)}`);
  }
  if (state.deployerBalance !== 0n) {
    problems.push(
      `deployer still holds ${fmt(state.deployerBalance)} — the pool should have taken all 200M (expected 0)`,
    );
  }
  if (config.pool) {
    // The pool needs ~200M; a bit less is fine because the test swap moves a
    // little out and back through fees.
    const min = (POOL_AMOUNT * 99n) / 100n;
    if (state.poolBalance === undefined || state.poolBalance < min) {
      problems.push(`pool holds ${fmt(state.poolBalance ?? 0n)}, expected roughly ${fmt(POOL_AMOUNT)}`);
    }
  } else {
    problems.push("no pool address in launch.json — add it so the pool balance can be checked");
  }

  if (problems.length > 0) {
    throw new Error(
      "ABORT — renounce blocked (see LAUNCH_DAY_CHECKLIST.md abort criteria):\n  - " +
        problems.join("\n  - "),
    );
  }

  const confirmed = await (opts.confirm ?? promptRenounceConfirmation)();
  if (!confirmed) {
    throw new Error("not confirmed — nothing was sent.");
  }

  const hash = await token.write.renounceOwnership();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`renounce transaction ${hash} failed (status: ${receipt.status})`);
  }
  const owner = await token.read.owner();
  if (BigInt(owner) !== 0n) {
    throw new Error(`owner is still ${owner} after the transaction — investigate!`);
  }
  return hash;
}

async function promptRenounceConfirmation(): Promise<boolean> {
  console.log("");
  console.log("⚠️  POINT OF NO RETURN — after this, the contract can NEVER be changed by anyone.");
  console.log("Only proceed if ALL of these are true (the script cannot check them for you):");
  console.log("  1. Source code is verified on Etherscan (green check on the Contract tab)");
  console.log("  2. The test swap worked in both directions");
  console.log("  3. 100% of the LP tokens are locked and the lock page shows the right amount and date");
  console.log("");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Type exactly "renounce forever" to proceed: ');
  rl.close();
  return answer.trim() === "renounce forever";
}
