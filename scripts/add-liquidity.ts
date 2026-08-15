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
import { getContract, parseEther, parseUnits, formatUnits, parseAbi } from "viem";
import { network } from "hardhat";

// Canonical Uniswap V2 router deployments.
const ROUTERS: Record<string, `0x${string}`> = {
  mainnet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  sepolia: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
};

const ROUTER_ABI = parseAbi([
  "function factory() external view returns (address)",
  "function WETH() external view returns (address)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
]);

const FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) external view returns (address)",
]);

const TOKEN_ABI = parseAbi([
  "function approve(address spender, uint256 value) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
]);

async function main() {
  const networkName = process.env.CARD_NETWORK ?? "sepolia";
  const tokenAddress = process.env.CARD_TOKEN_ADDRESS as `0x${string}` | undefined;
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

  const { viem } = await network.getOrCreate(networkName);
  const publicClient = await viem.getPublicClient();
  const [signer] = await viem.getWalletClients();
  const clients = { public: publicClient, wallet: signer };

  const token = getContract({ address: tokenAddress, abi: TOKEN_ABI, client: clients });
  const router = getContract({ address: routerAddress, abi: ROUTER_ABI, client: clients });

  const tokenUnits = parseUnits(cardAmount, 18);
  const ethUnits = parseEther(ethAmount);
  const symbol = await token.read.symbol();

  const balance = await token.read.balanceOf([signer.account.address]);
  if (balance < tokenUnits) {
    throw new Error(
      `Insufficient ${symbol}: have ${formatUnits(balance, 18)}, need ${cardAmount}`,
    );
  }

  console.log(`Network:  ${networkName}`);
  console.log(`Signer:   ${signer.account.address}`);
  console.log(`Pairing:  ${cardAmount} ${symbol} + ${ethAmount} ETH`);
  console.log(
    `Implied price: 1 ${symbol} = ${Number(ethAmount) / Number(cardAmount)} ETH`,
  );

  console.log(`Approving router ${routerAddress}...`);
  let hash = await token.write.approve([routerAddress, tokenUnits]);
  await publicClient.waitForTransactionReceipt({ hash });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  console.log("Adding liquidity...");
  hash = await router.write.addLiquidityETH(
    [tokenAddress, tokenUnits, tokenUnits, ethUnits, signer.account.address, deadline],
    { value: ethUnits },
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Liquidity added in tx ${receipt.transactionHash}`);

  const factoryAddress = await router.read.factory();
  const factory = getContract({ address: factoryAddress, abi: FACTORY_ABI, client: clients });
  const pair = await factory.read.getPair([tokenAddress, await router.read.WETH()]);
  console.log(`Pair address: ${pair}`);
  console.log(
    "Consider locking the LP tokens (e.g. Unicrypt/Team Finance) so holders know liquidity can't be pulled.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
