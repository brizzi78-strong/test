import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys CARD v2.
 *
 * Required parameters:
 * - treasury: receives the entire fixed 1B supply at deployment
 * - admin: operational owner during the pilot; use a Safe multisig on mainnet
 *
 * Example:
 * npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia \
 *   --parameters '{"CardinalsPromiseModule":{"treasury":"0xTREASURY","admin":"0xADMIN"}}'
 */
export default buildModule("CardinalsPromiseModule", (m) => {
  const treasury = m.getParameter("treasury");
  const admin = m.getParameter("admin");
  const token = m.contract("CardinalsPromise", [treasury, admin]);

  return { token };
});
