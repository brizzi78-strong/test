/**
 * Full offline dress rehearsal of the HOPE launch sequence against a local
 * Hardhat node — no external network needed. It deploys a real Uniswap V2
 * stack (WETH9, factory, router from the official build artifacts), then
 * runs the exact steps LAUNCH.md prescribes for mainnet:
 *
 *   1. deploy HopeCoin (full 250M supply to the deployer; treasury set forever)
 *   2. create + seed the HOPE/WETH pool (the pool nets 98% — the 2% fee goes
 *      to the treasury, which the rehearsal verifies)
 *   3. execute a buyer swap (ETH -> HOPE) through the fee-on-transfer router
 *      function to prove the market works
 *   4. renounceOwnership to lock the supply
 *
 * Run with: npx hardhat run scripts/rehearse-launch.ts
 */
import { readFileSync } from "node:fs";
import { getContract, parseEther, formatEther, type Abi, type Hex } from "viem";
import { network } from "hardhat";

function loadBuild(pkg: string, name: string): { abi: Abi; bytecode: Hex } {
  const json = JSON.parse(
    readFileSync(
      new URL(`../node_modules/@uniswap/${pkg}/build/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
  return { abi: json.abi, bytecode: json.bytecode };
}

const POOL_HOPE = parseEther("10000000"); // 10M HOPE into the pool
const POOL_ETH = parseEther("100"); // paired with 100 ETH

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer, buyer, treasuryWallet] = await viem.getWalletClients();
  const treasury = treasuryWallet.account.address;
  console.log(`Deployer: ${deployer.account.address}`);

  async function deployRaw(
    build: { abi: Abi; bytecode: Hex },
    args: unknown[] = [],
  ) {
    const hash = await deployer.deployContract({
      abi: build.abi,
      bytecode: build.bytecode,
      args,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.contractAddress == null) throw new Error("deployment failed");
    return getContract({
      address: receipt.contractAddress,
      abi: build.abi,
      client: { public: publicClient, wallet: deployer },
    });
  }

  // --- Uniswap V2 stack (official build artifacts) --------------------
  const weth = await deployRaw(loadBuild("v2-periphery", "WETH9"));
  const factory = await deployRaw(loadBuild("v2-core", "UniswapV2Factory"), [
    deployer.account.address,
  ]);
  const router = await deployRaw(loadBuild("v2-periphery", "UniswapV2Router02"), [
    factory.address,
    weth.address,
  ]);
  console.log(`Uniswap V2 deployed — router at ${router.address}`);

  // --- Step 1: deploy HOPE --------------------------------------------
  const token = await viem.deployContract("HopeCoin", [treasury]);
  console.log(`HOPE deployed at ${token.address} (treasury: ${treasury})`);
  const totalSupply = (await token.read.totalSupply()) as bigint;
  console.log(`  totalSupply: ${formatEther(totalSupply)} HOPE`);

  // --- Step 2: seed the HOPE/WETH pool --------------------------------
  // HOPE charges a 2% fee on every transfer, so the pair receives 98% of what
  // the router pulls: set amountTokenMin accordingly or addLiquidityETH
  // reverts. The 2% lands in the treasury — verified below.
  let hash = await token.write.approve([router.address, POOL_HOPE]);
  await publicClient.waitForTransactionReceipt({ hash });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  hash = await router.write.addLiquidityETH(
    [token.address, POOL_HOPE, (POOL_HOPE * 98n) / 100n, POOL_ETH, deployer.account.address, deadline],
    { value: POOL_ETH },
  );
  await publicClient.waitForTransactionReceipt({ hash });

  const pair = await factory.read.getPair([token.address, weth.address]);
  const pairBalance = (await token.read.balanceOf([pair])) as bigint;
  const treasuryBalance = (await token.read.balanceOf([treasury])) as bigint;
  console.log(`Pool seeded: ${formatEther(pairBalance)} HOPE + 100 ETH, pair at ${pair}`);
  console.log(`  treasury collected ${formatEther(treasuryBalance)} HOPE from the seeding fee`);
  console.log(`  implied launch price: 1 ETH = ${formatEther((pairBalance * 1_000_000_000_000_000_000n) / POOL_ETH)} HOPE`);

  // --- Step 3: a buyer swaps ETH for CARD ------------------------------
  const buyerRouter = getContract({
    address: router.address,
    abi: router.abi,
    client: { public: publicClient, wallet: buyer },
  });
  // Fee-on-transfer tokens need the "SupportingFeeOnTransferTokens" swap
  // variant — the plain one reverts on the balance check.
  hash = await buyerRouter.write.swapExactETHForTokensSupportingFeeOnTransferTokens(
    [0n, [weth.address, token.address], buyer.account.address, deadline],
    { value: parseEther("1") },
  );
  await publicClient.waitForTransactionReceipt({ hash });
  const bought = (await token.read.balanceOf([buyer.account.address])) as bigint;
  console.log(`Buyer swapped 1 ETH -> ${formatEther(bought)} HOPE (net of the 2% fee)`);

  // --- Step 4: lock the supply -----------------------------------------
  hash = await token.write.renounceOwnership();
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Ownership renounced — owner is now ${await token.read.owner()}`);

  console.log("\nRehearsal complete: deploy → pool → swap → supply locked, all green.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
