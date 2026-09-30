/**
 * Executes the required fee-aware Sepolia round trip from a separate buyer
 * wallet. The script is hard-blocked on mainnet.
 *
 * Prerequisites: launch.json contains the Sepolia token, treasury, and pair;
 * the pair is funded; SEPOLIA_PRIVATE_KEY currently points to a buyer wallet.
 *
 *   CARD_BUY_ETH=0.001 npx hardhat run scripts/test-swap-sepolia.ts --network sepolia
 */
import assert from "node:assert/strict";
import { network } from "hardhat";
import { formatEther, getContract, parseAbi, parseEther } from "viem";

import { loadLaunchConfig } from "./launch-lib.js";

const SEPOLIA_ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";

const TOKEN_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function treasury() external view returns (address)",
]);

const ROUTER_ABI = parseAbi([
  "function WETH() external view returns (address)",
  "function factory() external view returns (address)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] path, address to, uint deadline) external payable",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external",
]);
const FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) external view returns (address)",
]);

const config = loadLaunchConfig(new URL("../launch.json", import.meta.url));
if (config.network !== "sepolia") {
  throw new Error("test-swap-sepolia.ts is hard-blocked outside Sepolia");
}
if (!config.pool) {
  throw new Error('launch.json: fill in "pool" with the verified CARD/WETH pair first');
}

const buyEth = parseEther(process.env.CARD_BUY_ETH ?? "0.001");
assert(buyEth > 0n, "CARD_BUY_ETH must be positive");

const { viem } = await network.getOrCreate("sepolia");
const publicClient = await viem.getPublicClient();
const [buyer] = await viem.getWalletClients();
const buyerAddress = buyer.account.address;
if (
  buyerAddress.toLowerCase() === config.deployer.toLowerCase() ||
  buyerAddress.toLowerCase() === config.treasury.toLowerCase()
) {
  throw new Error("connect a separate buyer wallet, not the deployer or treasury");
}

const clients = { public: publicClient, wallet: buyer };
const token = getContract({ address: config.token, abi: TOKEN_ABI, client: clients });
const router = getContract({ address: SEPOLIA_ROUTER, abi: ROUTER_ABI, client: clients });
assert.equal((await token.read.treasury()).toLowerCase(), config.treasury.toLowerCase());

const weth = await router.read.WETH();
const factory = getContract({
  address: await router.read.factory(),
  abi: FACTORY_ABI,
  client: publicClient,
});
assert.equal(
  (await factory.read.getPair([config.token, weth])).toLowerCase(),
  config.pool.toLowerCase(),
  "launch.json pool is not the official Sepolia V2 router's CARD/WETH pair",
);
const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
const treasuryBefore = await token.read.balanceOf([config.treasury]);
const buyerBefore = await token.read.balanceOf([buyerAddress]);

const buyHash = await router.write.swapExactETHForTokensSupportingFeeOnTransferTokens(
  [0n, [weth, config.token], buyerAddress, deadline],
  { value: buyEth },
);
let receipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
assert.equal(receipt.status, "success", `buy failed: ${buyHash}`);

const buyerAfterBuy = await token.read.balanceOf([buyerAddress]);
const treasuryAfterBuy = await token.read.balanceOf([config.treasury]);
const bought = buyerAfterBuy - buyerBefore;
assert(bought > 0n, "buyer received no CARD");
assert(treasuryAfterBuy > treasuryBefore, "treasury received no CARD fee on buy");

const sellAmount = bought / 2n;
assert(sellAmount > 0n, "buy was too small to exercise a sell");
const approvalHash = await token.write.approve([SEPOLIA_ROUTER, sellAmount]);
receipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
assert.equal(receipt.status, "success", `approval failed: ${approvalHash}`);

const sellHash = await router.write.swapExactTokensForETHSupportingFeeOnTransferTokens([
  sellAmount,
  0n,
  [config.token, weth],
  buyerAddress,
  deadline,
]);
receipt = await publicClient.waitForTransactionReceipt({ hash: sellHash });
assert.equal(receipt.status, "success", `sell failed: ${sellHash}`);

const treasuryAfterSell = await token.read.balanceOf([config.treasury]);
assert.equal(
  treasuryAfterSell - treasuryAfterBuy,
  (sellAmount * 200n) / 10_000n,
  "sell did not credit the exact 2% token fee",
);
console.log(`buyer: ${buyerAddress}`);
console.log(`bought net: ${formatEther(bought)} CARD`);
console.log(`sold gross: ${formatEther(sellAmount)} CARD`);
console.log(`treasury fee delta: ${formatEther(treasuryAfterSell - treasuryBefore)} CARD`);
console.log(`buy tx: ${buyHash}`);
console.log(`sell tx: ${sellHash}`);
console.log("✅ Sepolia fee-aware buy and sell passed");
