import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Cardinals Promise (CARD) token. The full 250M supply is
 * minted to the deployer in the constructor — there are no parameters.
 *
 *   npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
 */
export default buildModule("CardinalsPromiseModule", (m) => {
  const token = m.contract("CardinalsPromise");

  return { token };
});
