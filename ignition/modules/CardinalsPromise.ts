import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UNITS = 10n ** 18n;

/**
 * Deploys the Cardinals Promise (CARD) token. The default mints the full
 * 250M supply to the deployer; pass a smaller value to leave room for
 * later minting:
 *   npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts \
 *     --parameters '{"CardinalsPromiseModule":{"initialSupply":"100000000000000000000000000"}}'
 */
export default buildModule("CardinalsPromiseModule", (m) => {
  const initialSupply = m.getParameter("initialSupply", 250_000_000n * UNITS);

  const token = m.contract("CardinalsPromise", [initialSupply]);

  return { token };
});
