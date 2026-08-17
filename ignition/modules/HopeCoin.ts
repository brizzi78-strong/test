import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the Hope Coin (HOPE) token. The full 250M supply is minted to the
 * deployer in the constructor; the treasury address — where the fixed 2% fee
 * on every transfer goes, forever — is the single constructor parameter.
 *
 *   npx hardhat ignition deploy ignition/modules/HopeCoin.ts --network sepolia \
 *     --parameters '{"HopeCoinModule":{"treasury":"0x..."}}'
 */
export default buildModule("HopeCoinModule", (m) => {
  const treasury = m.getParameter<string>("treasury");
  const token = m.contract("HopeCoin", [treasury]);

  return { token };
});
