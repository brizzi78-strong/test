import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Cardinals Promise (CARD) token. The full 1B supply is minted to
 * the deployer in the constructor — there are no parameters.
 *
 * There is no transfer fee and no treasury address in the contract: CARD is a
 * plain fixed-supply ERC-20, and the treasury is simply a wallet the deployer
 * sends tokens to afterwards. Allocation happens by transfer after deployment,
 * not by constructor argument.
 *
 *   npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
 */
export default buildModule("CardinalsPromiseModule", (m) => {
  const token = m.contract("CardinalsPromise");

  return { token };
});
