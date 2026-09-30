/**
 * Offline rehearsal of the canonical CARD launch against a local Hardhat node.
 * It uses separate deployer, treasury, and buyer accounts and a real Uniswap V2
 * stack. The run fails unless fee-exempt seeding, a fee-aware buy, a fee-aware
 * sell, treasury accumulation, fixed supply, and renouncement all work.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatEther,
  getContract,
  parseEther,
  type Abi,
  type Hex,
} from "viem";
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

const POOL_CARD = parseEther("10000000");
const POOL_ETH = parseEther("100");

async function main() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer, treasury, buyer] = await viem.getWalletClients();

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

  const weth = await deployRaw(loadBuild("v2-periphery", "WETH9"));
  const factory = await deployRaw(loadBuild("v2-core", "UniswapV2Factory"), [
    deployer.account.address,
  ]);
  const router = await deployRaw(loadBuild("v2-periphery", "UniswapV2Router02"), [
    factory.address,
    weth.address,
  ]);

  const token = await viem.deployContract("CardinalsPromise", [
    treasury.account.address,
  ]);
  assert.equal(
    (await token.read.treasury()).toLowerCase(),
    treasury.account.address.toLowerCase(),
  );

  const tokenAsTreasury = getContract({
    address: token.address,
    abi: token.abi,
    client: { public: publicClient, wallet: treasury },
  });
  const routerAsTreasury = getContract({
    address: router.address,
    abi: router.abi,
    client: { public: publicClient, wallet: treasury },
  });

  // Stage inventory through the immutable treasury; this hop is fee-exempt.
  let hash = await token.write.transfer([treasury.account.address, POOL_CARD]);
  await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(await token.read.balanceOf([treasury.account.address]), POOL_CARD);

  hash = await tokenAsTreasury.write.approve([router.address, POOL_CARD]);
  await publicClient.waitForTransactionReceipt({ hash });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  hash = await routerAsTreasury.write.addLiquidityETH(
    [token.address, POOL_CARD, POOL_CARD, POOL_ETH, deployer.account.address, deadline],
    { value: POOL_ETH },
  );
  await publicClient.waitForTransactionReceipt({ hash });

  const pair = await factory.read.getPair([token.address, weth.address]);
  assert.notEqual(BigInt(pair), 0n);
  assert.equal(await token.read.balanceOf([pair]), POOL_CARD);
  assert.equal(await token.read.balanceOf([treasury.account.address]), 0n);

  const routerAsBuyer = getContract({
    address: router.address,
    abi: router.abi,
    client: { public: publicClient, wallet: buyer },
  });
  const tokenAsBuyer = getContract({
    address: token.address,
    abi: token.abi,
    client: { public: publicClient, wallet: buyer },
  });

  // Buy through the supporting route so the minimum applies to the net amount.
  hash = await routerAsBuyer.write.swapExactETHForTokensSupportingFeeOnTransferTokens(
    [0n, [weth.address, token.address], buyer.account.address, deadline],
    { value: parseEther("1") },
  );
  await publicClient.waitForTransactionReceipt({ hash });
  const bought = await token.read.balanceOf([buyer.account.address]);
  const treasuryAfterBuy = await token.read.balanceOf([treasury.account.address]);
  assert(bought > 0n);
  assert(treasuryAfterBuy > 0n);

  // Sell half; the treasury must receive exactly 2% of the submitted amount.
  const sellAmount = bought / 2n;
  hash = await tokenAsBuyer.write.approve([router.address, sellAmount]);
  await publicClient.waitForTransactionReceipt({ hash });
  hash = await routerAsBuyer.write.swapExactTokensForETHSupportingFeeOnTransferTokens(
    [sellAmount, 0n, [token.address, weth.address], buyer.account.address, deadline],
  );
  await publicClient.waitForTransactionReceipt({ hash });
  const treasuryAfterSell = await token.read.balanceOf([treasury.account.address]);
  assert.equal(treasuryAfterSell - treasuryAfterBuy, (sellAmount * 200n) / 10_000n);

  assert.equal(await token.read.totalSupply(), parseEther("1000000000"));
  hash = await token.write.renounceOwnership();
  await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(BigInt(await token.read.owner()), 0n);

  console.log(`CARD: ${token.address}`);
  console.log(`Pair: ${pair}`);
  console.log(`Buyer net: ${formatEther(bought)} CARD`);
  console.log(`Treasury after buy + sell: ${formatEther(treasuryAfterSell)} CARD`);
  console.log("✅ canonical rehearsal passed: seed → buy → sell → renounce");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
