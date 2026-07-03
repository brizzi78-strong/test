// Exports the solc standard JSON input for CardToken.sol so the contract can
// be verified manually on Etherscan (Verify & Publish -> Solidity
// Standard-JSON-Input) when the hardhat-verify API route isn't available.
//
// Usage:
//   HARDHAT_BUNDLED_SOLC=1 npx hardhat build --build-profile production
//   node scripts/export-solc-input.mjs
//
// Writes verification/CardToken.solc-input.json and prints the exact compiler
// version string to pick in the Etherscan form.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildInfoDir = join(root, "artifacts", "build-info");
const target = "project/contracts/CardToken.sol";

const candidates = readdirSync(buildInfoDir)
  .filter((f) => f.endsWith(".json") && !f.endsWith(".output.json"))
  .map((f) => JSON.parse(readFileSync(join(buildInfoDir, f), "utf8")))
  .filter((bi) => target in bi.input.sources)
  // Prefer the compilation job rooted at the contract itself (fewest sources)
  // over the test job, which drags in forge-std.
  .sort(
    (a, b) =>
      Object.keys(a.input.sources).length -
      Object.keys(b.input.sources).length,
  );

if (candidates.length === 0) {
  console.error(
    `No build info contains ${target} — run \`npx hardhat build --build-profile production\` first.`,
  );
  process.exit(1);
}

const buildInfo = candidates[0];
const optimizer = buildInfo.input.settings.optimizer ?? {};
if (!optimizer.enabled) {
  console.error(
    "Warning: this build info has the optimizer DISABLED. Ignition deploys " +
      "use the production profile (optimizer on, 200 runs); rebuild with " +
      "--build-profile production so the verification input matches the " +
      "deployed bytecode.",
  );
  process.exit(1);
}

const outDir = join(root, "verification");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "CardToken.solc-input.json");
writeFileSync(outFile, JSON.stringify(buildInfo.input, null, 2) + "\n");

console.log(`Wrote ${outFile}`);
console.log(`Compiler version for the Etherscan form: v${buildInfo.solcLongVersion}`);
console.log(`Contract to select after upload: ${target}:CardToken`);
