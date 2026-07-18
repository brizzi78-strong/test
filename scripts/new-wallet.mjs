// Generates a throwaway wallet locally — no MetaMask, no signup, nothing
// leaves this machine. For PRACTICE (Sepolia) use only: the key is printed to
// the terminal, so treat it as burned the moment real value is involved. For
// mainnet, use a hardware wallet or an offline-generated key (see LAUNCH.md).
//
//   node scripts/new-wallet.mjs            # one wallet
//   node scripts/new-wallet.mjs deployer treasury pool   # one per label
//
// Put the private key in the Hardhat keystore (npx hardhat keystore set
// SEPOLIA_PRIVATE_KEY) and the addresses in launch.json.

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const labels = process.argv.slice(2);
if (labels.length === 0) labels.push("wallet");

for (const label of labels) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log(`${label}:`);
  console.log(`  address:     ${account.address}`);
  console.log(`  private key: ${privateKey}`);
  console.log("");
}

console.log(
  "⚠️  Practice wallets only. Anyone who sees a private key controls that",
);
console.log(
  "wallet — never fund these with real ETH, and never screen-share them.",
);
