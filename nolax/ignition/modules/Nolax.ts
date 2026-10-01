import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Nolax (NOLAX) token. The full 250M supply is minted to the
 * deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/Nolax.ts --network sepolia
 */
export default buildModule("NolaxModule", (m) => {
  const token = m.contract("Nolax");

  return { token };
});
