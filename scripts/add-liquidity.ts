/**
 * Creates (if needed) and seeds a CARD/WETH pool on Uniswap V2.
 *
 * Usage:
 *   CARD_NETWORK=sepolia \
 *   CARD_TOKEN_ADDRESS=0x... \
 *   CARD_AMOUNT=1000000 \        # CARD to deposit (whole tokens)
 *   ETH_AMOUNT=1.5 \             # ETH to pair with it
 *   npx hardhat run scripts/add-liquidity.ts
 *
 * The CARD_AMOUNT/ETH_AMOUNT ratio sets the initial price, so double-check
 * it before running against mainnet. LP tokens are minted to the caller.
 */
import { network } from "hardhat";

// Canonical Uniswap V2 router deployments.
const ROUTERS: Record<string, string> = {
  mainnet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  sepolia: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
};

const ROUTER_ABI = [
  "function factory() external view returns (address)",
  "function WETH() external view returns (address)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address)",
];

const TOKEN_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
];

async function main() {
  const networkName = process.env.CARD_NETWORK ?? "sepolia";
  const tokenAddress = process.env.CARD_TOKEN_ADDRESS;
  const cardAmount = process.env.CARD_AMOUNT;
  const ethAmount = process.env.ETH_AMOUNT;

  if (!tokenAddress || !cardAmount || !ethAmount) {
    throw new Error(
      "Set CARD_TOKEN_ADDRESS, CARD_AMOUNT (whole CARD) and ETH_AMOUNT (ETH) env vars",
    );
  }
  const routerAddress = ROUTERS[networkName];
  if (routerAddress === undefined) {
    throw new Error(`No Uniswap V2 router configured for network "${networkName}"`);
  }

  const { ethers } = await network.getOrCreate(networkName);
  const [signer] = await ethers.getSigners();

  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);

  const tokenUnits = ethers.parseUnits(cardAmount, 18);
  const ethUnits = ethers.parseEther(ethAmount);
  const symbol: string = await token.symbol();

  const balance: bigint = await token.balanceOf(signer.address);
  if (balance < tokenUnits) {
    throw new Error(
      `Insufficient ${symbol}: have ${ethers.formatUnits(balance, 18)}, need ${cardAmount}`,
    );
  }

  console.log(`Network:  ${networkName}`);
  console.log(`Signer:   ${signer.address}`);
  console.log(`Pairing:  ${cardAmount} ${symbol} + ${ethAmount} ETH`);
  console.log(
    `Implied price: 1 ${symbol} = ${Number(ethAmount) / Number(cardAmount)} ETH`,
  );

  console.log(`Approving router ${routerAddress}...`);
  await (await token.approve(routerAddress, tokenUnits)).wait();

  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  console.log("Adding liquidity...");
  const tx = await router.addLiquidityETH(
    tokenAddress,
    tokenUnits,
    tokenUnits, // exact amounts on first add; loosen for subsequent adds
    ethUnits,
    signer.address,
    deadline,
    { value: ethUnits },
  );
  const receipt = await tx.wait();
  console.log(`Liquidity added in tx ${receipt.hash}`);

  const factory = new ethers.Contract(await router.factory(), FACTORY_ABI, signer);
  const pair = await factory.getPair(tokenAddress, await router.WETH());
  console.log(`Pair address: ${pair}`);
  console.log(
    "Consider locking the LP tokens (e.g. Unicrypt/Team Finance) so holders know liquidity can't be pulled.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
