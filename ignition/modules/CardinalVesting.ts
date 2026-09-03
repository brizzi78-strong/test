import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the founder vesting wallet that holds the 800M CARD allocation.
 *
 * Every parameter is required — there are deliberately no defaults, because
 * each one is a term of the lock and a wrong value cannot be corrected after
 * deployment. Fix them, publish them, and pass them explicitly.
 *
 *   beneficiary — the address that receives tokens as they vest
 *   start       — unix timestamp when the schedule begins
 *   duration    — total length in seconds (3 years = 94608000)
 *   cliff       — seconds from start with no release (90 days = 7776000)
 *
 *   npx hardhat ignition deploy ignition/modules/CardinalVesting.ts --network sepolia \
 *     --parameters '{"CardinalVestingModule": {
 *        "beneficiary": "0x...",
 *        "start": 1800000000,
 *        "duration": 94608000,
 *        "cliff": 7776000
 *      }}'
 *
 * The tokens are NOT moved by this module. After deployment, transfer the
 * 800M allocation to the vesting address, then verify on Etherscan that the
 * balance and the schedule both read as published.
 */
export default buildModule("CardinalVestingModule", (m) => {
  const beneficiary = m.getParameter("beneficiary");
  const start = m.getParameter("start");
  const duration = m.getParameter("duration");
  const cliff = m.getParameter("cliff");

  const vesting = m.contract("CardinalVesting", [
    beneficiary,
    start,
    duration,
    cliff,
  ]);

  return { vesting };
});
