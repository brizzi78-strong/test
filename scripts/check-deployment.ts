import { getContract, parseAbi, formatUnits } from 'viem';
import { network } from 'hardhat';

const ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function TOTAL_SUPPLY() view returns (uint256)',
  'function treasury() view returns (address)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
]);

async function main() {
  const networkName = process.env.CARD_NETWORK ?? 'sepolia';
  const address = process.env.CARD_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!address) throw new Error('Set CARD_TOKEN_ADDRESS to the deployed CARD v2 address');

  const { viem } = await network.getOrCreate(networkName);
  const publicClient = await viem.getPublicClient();
  const token = getContract({ address, abi: ABI, client: publicClient });

  const bytecode = await publicClient.getCode({ address });
  if (!bytecode || bytecode === '0x') throw new Error(`No contract bytecode at ${address}`);

  const [name, symbol, totalSupply, expectedSupply, treasury, owner, paused] = await Promise.all([
    token.read.name(), token.read.symbol(), token.read.totalSupply(), token.read.TOTAL_SUPPLY(),
    token.read.treasury(), token.read.owner(), token.read.paused(),
  ]);

  const failures: string[] = [];
  if (name !== 'Cardinals Promise') failures.push(`unexpected name: ${name}`);
  if (symbol !== 'CARD') failures.push(`unexpected symbol: ${symbol}`);
  if (totalSupply !== expectedSupply) failures.push('totalSupply differs from TOTAL_SUPPLY constant');
  if (totalSupply !== 1_000_000_000n * 10n ** 18n) failures.push('total supply is not exactly 1B CARD');
  if (treasury === '0x0000000000000000000000000000000000000000') failures.push('treasury is zero address');
  if (owner === '0x0000000000000000000000000000000000000000') failures.push('owner/admin is zero address');
  if (paused) failures.push('contract is unexpectedly paused');

  console.log(`Network: ${networkName}`);
  console.log(`Contract: ${address}`);
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Supply: ${formatUnits(totalSupply, 18)} CARD`);
  console.log(`Treasury: ${treasury}`);
  console.log(`Admin/owner: ${owner}`);
  console.log(`Paused: ${paused}`);

  if (failures.length) {
    console.error('\nDeployment check FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nDeployment check PASSED. This verifies deployment state only; it is not authorization to use mainnet.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
