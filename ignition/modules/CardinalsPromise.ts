import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Cardinals Promise (CARD) token. The full 250M supply is minted
 * to the deployer, who then distributes it per the launch sequence (pool,
 * founder, treasury). The contract takes no constructor arguments: it is a
 * plain fixed-supply ERC-20 with no fee, no treasury role, and no owner
 * powers.
 *
 *   npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia
 */
export default buildModule("CardinalsPromiseModule", (m) => {
  const token = m.contract("CardinalsPromise", []);

  return { token };
});
