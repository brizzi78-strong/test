import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Hope Coin (HOP) token. The full 250M supply is minted to the
 * deployer; the flat immutable 2% fee accrues to the treasury address given
 * as a parameter — on mainnet this MUST be the treasury Safe, passed via
 * ignition parameters. Defaults to the deployer for local rehearsal only.
 *
 *   npx hardhat ignition deploy ignition/modules/HopeCoin.ts --network sepolia \
 *     --parameters '{"HopeCoinModule": {"treasury": "0xSAFE..."}}'
 */
export default buildModule("HopeCoinModule", (m) => {
  const treasury = m.getParameter("treasury", m.getAccount(0));
  const token = m.contract("HopeCoin", [treasury]);

  return { token };
});
