import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HardhatUserConfig } from "hardhat/config";
import { configVariable } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

// Use the solc WASM build bundled with the `solc` npm package instead of
// downloading a compiler binary (binaries.soliditylang.org may be unreachable
// in sandboxed environments).
const solcJsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "node_modules",
  "solc",
  "soljson.js",
);

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        path: solcJsPath,
      },
      production: {
        version: "0.8.28",
        path: solcJsPath,
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
    // Deploy to Sepolia with:
    //   npx hardhat keystore set SEPOLIA_RPC_URL
    //   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
    //   npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
};

export default config;
