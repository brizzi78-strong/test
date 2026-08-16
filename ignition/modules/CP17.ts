import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the CP Coin Platform 17 (CP17) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/CP17.ts --network sepolia
 */
export default buildModule("CP17Module", (m) => {
  const token = m.contract("CP17");

  return { token };
});
