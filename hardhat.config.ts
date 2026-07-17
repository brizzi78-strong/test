import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import { fileURLToPath } from "node:url";

// Use the solc WASM build bundled in the `solc` npm package instead of
// downloading a native binary from binaries.soliditylang.org. This keeps
// builds hermetic and working behind restricted networks; the npm package
// version pins the compiler version.
const solcPath = fileURLToPath(
  new URL("./node_modules/solc/soljson.js", import.meta.url),
);

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        path: solcPath,
      },
      production: {
        version: "0.8.28",
        path: solcPath,
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    mainnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("MAINNET_RPC_URL"),
      accounts: [configVariable("MAINNET_PRIVATE_KEY")],
    },
  },
  // Verify with: npx hardhat verify --network sepolia <address>
  // (set the key first: npx hardhat keystore set ETHERSCAN_API_KEY)
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
