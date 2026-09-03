// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
import {VestingWalletCliff} from "@openzeppelin/contracts/finance/VestingWalletCliff.sol";

/// @title Cardinal founder vesting
/// @notice Holds the founder allocation of CARD and releases it to the
///         beneficiary on a fixed schedule: nothing until the cliff, then
///         continuously until the end of the term.
///
/// @dev The point of this contract is what it *cannot* do. There is no
///      function to accelerate the schedule, no function to withdraw early,
///      and no owner privilege that shortens the term — not for the
///      beneficiary, not for the deployer, not for anyone. Once the tokens
///      are sent here the schedule is the only way out, and it is fixed at
///      construction and readable on-chain.
///
///      Both parent contracts are unmodified OpenZeppelin v5 code:
///      `VestingWallet` provides the linear schedule and the release
///      accounting, `VestingWalletCliff` returns zero before the cliff. This
///      contract adds only the constructor wiring, deliberately: the less
///      novel code sits between the tokens and the schedule, the less there
///      is to get wrong.
///
///      `VestingWallet` is `Ownable` and the owner is the beneficiary —
///      ownership here confers only the right to receive released tokens, and
///      transferring it reassigns that right. It grants no power over the
///      schedule.
///
///      `release(address token)` is permissionless: anyone may call it, and
///      the tokens always go to the beneficiary. Calling it early simply
///      releases nothing.
contract CardinalVesting is VestingWalletCliff {
    /// @param beneficiary  Address that receives tokens as they vest.
    /// @param startTimestamp Unix timestamp at which the schedule begins.
    /// @param durationSeconds Total length of the schedule, from start.
    /// @param cliffSeconds Time from start during which nothing is released.
    ///        Must not exceed `durationSeconds`.
    constructor(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    )
        VestingWallet(beneficiary, startTimestamp, durationSeconds)
        VestingWalletCliff(cliffSeconds)
    {}
}
