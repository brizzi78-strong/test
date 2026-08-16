import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Hope Coin (HOP) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/HopeCoin.ts --network sepolia
 */
export default buildModule("HopeCoinModule", (m) => {
  const token = m.contract("HOP");

  return { token };
});
