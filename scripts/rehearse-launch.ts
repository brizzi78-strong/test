/**
 * Full offline dress rehearsal of the CARD launch sequence against a local
 * Hardhat node — no external network needed. It deploys a real Uniswap V2
 * stack (WETH9, factory, router from the official build artifacts), then
 * runs the exact steps LAUNCH.md prescribes for mainnet:
 *
 *   1. deploy CardinalsPromise (full 250M supply to the deployer)
 *   2. create + seed the CARD/WETH pool
 *   3. execute a buyer swap (ETH -> CARD) to prove the market works
 *   4. renounceOwnership to lock the supply
 *
 * Run with: npx hardhat run scripts/rehearse-launch.ts
 */
import { readFileSync } from "node:fs";
import { network } from "hardhat";

function loadBuild(pkg: string, name: string) {
  const json = JSON.parse(
    readFileSync(
      new URL(`../node_modules/@uniswap/${pkg}/build/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
  return { abi: json.abi, bytecode: json.bytecode };
}

const UNITS = 10n ** 18n;
const TOTAL_SUPPLY = 250_000_000n * UNITS;
const POOL_CARD = 10_000_000n * UNITS; // 10M CARD into the pool
const POOL_ETH = 100n * UNITS; // paired with 100 ETH

async function main() {
  const { ethers } = await network.getOrCreate();
  const [deployer, buyer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // --- Uniswap V2 stack (official build artifacts) --------------------
  const weth9 = loadBuild("v2-periphery", "WETH9");
  const factoryBuild = loadBuild("v2-core", "UniswapV2Factory");
  const routerBuild = loadBuild("v2-periphery", "UniswapV2Router02");

  const weth = await new ethers.ContractFactory(weth9.abi, weth9.bytecode, deployer).deploy();
  const factory = await new ethers.ContractFactory(
    factoryBuild.abi,
    factoryBuild.bytecode,
    deployer,
  ).deploy(deployer.address);
  const router = await new ethers.ContractFactory(
    routerBuild.abi,
    routerBuild.bytecode,
    deployer,
  ).deploy(await factory.getAddress(), await weth.getAddress());
  console.log(`Uniswap V2 deployed — router at ${await router.getAddress()}`);

  // --- Step 1: deploy CARD --------------------------------------------
  const token = await ethers.deployContract("CardinalsPromise", [TOTAL_SUPPLY]);
  const tokenAddress = await token.getAddress();
  console.log(`CARD deployed at ${tokenAddress}`);
  console.log(`  totalSupply: ${ethers.formatUnits(await token.totalSupply(), 18)} CARD`);

  // --- Step 2: seed the CARD/WETH pool --------------------------------
  await (await token.approve(await router.getAddress(), POOL_CARD)).wait();
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  await (
    await router.addLiquidityETH(
      tokenAddress,
      POOL_CARD,
      POOL_CARD,
      POOL_ETH,
      deployer.address,
      deadline,
      { value: POOL_ETH },
    )
  ).wait();
  const pairAddress = await factory.getPair(tokenAddress, await weth.getAddress());
  console.log(`Pool seeded: 10,000,000 CARD + 100 ETH, pair at ${pairAddress}`);
  console.log(`  implied launch price: 1 ETH = 100,000 CARD`);

  // --- Step 3: a buyer swaps ETH for CARD ------------------------------
  const buyerRouter = router.connect(buyer) as typeof router;
  await (
    await buyerRouter.swapExactETHForTokens(
      0n,
      [await weth.getAddress(), tokenAddress],
      buyer.address,
      deadline,
      { value: 1n * UNITS },
    )
  ).wait();
  const bought = await token.balanceOf(buyer.address);
  console.log(`Buyer swapped 1 ETH -> ${ethers.formatUnits(bought, 18)} CARD`);

  // --- Step 4: lock the supply -----------------------------------------
  await (await token.renounceOwnership()).wait();
  console.log(`Ownership renounced — owner is now ${await token.owner()}`);

  console.log("\nRehearsal complete: deploy → pool → swap → supply locked, all green.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
