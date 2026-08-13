/**
 * Full offline dress rehearsal of the HERE launch sequence against a local
 * Hardhat node — no external network needed. It deploys a real Uniswap V2
 * stack (WETH9, factory, router from the official build artifacts), then
 * runs the exact steps LAUNCH.md prescribes for mainnet:
 *
 *   1. deploy Presence (full 250M supply to the deployer)
 *   2. create + seed the HERE/WETH pool
 *   3. execute a buyer swap (ETH -> HERE) to prove the market works
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

const POOL_CARD = parseEther("10000000"); // 10M HERE into the pool
const POOL_ETH = parseEther("100"); // paired with 100 ETH

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer, buyer] = await viem.getWalletClients();
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

  // --- Step 1: deploy HERE --------------------------------------------
  const token = await viem.deployContract("Presence");
  console.log(`HERE deployed at ${token.address}`);
  const totalSupply = (await token.read.totalSupply()) as bigint;
  console.log(`  totalSupply: ${formatEther(totalSupply)} HERE`);

  // --- Step 2: seed the HERE/WETH pool --------------------------------
  let hash = await token.write.approve([router.address, POOL_CARD]);
  await publicClient.waitForTransactionReceipt({ hash });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  hash = await router.write.addLiquidityETH(
    [token.address, POOL_CARD, POOL_CARD, POOL_ETH, deployer.account.address, deadline],
    { value: POOL_ETH },
  );
  await publicClient.waitForTransactionReceipt({ hash });

  const pair = await factory.read.getPair([token.address, weth.address]);
  console.log(`Pool seeded: 10,000,000 HERE + 100 ETH, pair at ${pair}`);
  console.log(`  implied launch price: 1 ETH = 100,000 HERE`);

  // --- Step 3: a buyer swaps ETH for HERE ------------------------------
  const buyerRouter = getContract({
    address: router.address,
    abi: router.abi,
    client: { public: publicClient, wallet: buyer },
  });
  hash = await buyerRouter.write.swapExactETHForTokens(
    [0n, [weth.address, token.address], buyer.account.address, deadline],
    { value: parseEther("1") },
  );
  await publicClient.waitForTransactionReceipt({ hash });
  const bought = (await token.read.balanceOf([buyer.account.address])) as bigint;
  console.log(`Buyer swapped 1 ETH -> ${formatEther(bought)} HERE`);

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
