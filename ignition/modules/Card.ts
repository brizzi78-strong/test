import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Card (CARD) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/Card.ts --network sepolia
 */
export default buildModule("CardModule", (m) => {
  const token = m.contract("CARD");

  return { token };
});
