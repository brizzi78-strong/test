import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Presence (HERE) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/Presence.ts --network sepolia
 */
export default buildModule("PresenceModule", (m) => {
  const token = m.contract("Presence");

  return { token };
});
