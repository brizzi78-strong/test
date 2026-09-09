import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import { fileURLToPath } from "node:url";

// Hardhat downloads the native solc binary from binaries.soliditylang.org on
// first build. On networks where that host is blocked, set
// HARDHAT_BUNDLED_SOLC=1 to compile with the WASM build bundled in the `solc`
// npm package instead — same 0.8.28 compiler, identical bytecode, no download.
const solc = process.env.HARDHAT_BUNDLED_SOLC
  ? {
      version: "0.8.28",
      path: fileURLToPath(
        new URL("./node_modules/solc/soljson.js", import.meta.url),
      ),
    }
  : { version: "0.8.28" };

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        ...solc,
      },
      production: {
        ...solc,
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  // Verify with: npx hardhat verify --network sepolia <address>
  // (set the key first: npx hardhat keystore set ETHERSCAN_API_KEY)
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
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
});
