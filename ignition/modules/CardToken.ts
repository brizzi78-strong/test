import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CardTokenModule", (m) => {
  const token = m.contract("CardToken");

  return { token };
});
