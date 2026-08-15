import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Mager Coin (MAGR) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/MagerCoin.ts --network sepolia
 */
export default buildModule("MagerCoinModule", (m) => {
  const token = m.contract("MagerCoin");

  return { token };
});
