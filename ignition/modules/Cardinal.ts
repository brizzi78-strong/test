import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys The Cardinal (CARD) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/Cardinal.ts --network sepolia
 */
export default buildModule("CardinalModule", (m) => {
  const token = m.contract("Cardinal");

  return { token };
});
