import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Cardinals Promise (CARD) token. The full 250M supply is minted to the
 * deployer; the flat immutable 2% fee accrues to the treasury address given
 * as a parameter — on mainnet this MUST be the treasury Safe, passed via
 * ignition parameters. There is deliberately no default: an accidental
 * deployer-as-treasury deployment would disable the fee during rehearsal.
 *
 *   npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia \
 *     --parameters '{"CardinalsPromiseModule": {"treasury": "0xSAFE..."}}'
 */
export default buildModule("CardinalsPromiseModule", (m) => {
  const treasury = m.getParameter("treasury");
  const token = m.contract("CardinalsPromise", [treasury]);

  return { token };
});
