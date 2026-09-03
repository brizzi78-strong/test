// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CardinalsPromise} from "./CardinalsPromise.sol";
import {CardinalVesting} from "./CardinalVesting.sol";

/// @notice Verifies the founder vesting schedule — above all, the things it
///         must never allow: early release, acceleration, or any route to the
///         tokens other than the passage of time.
contract CardinalVestingTest is Test {
    CardinalsPromise token;
    CardinalVesting vesting;

    address founder = makeAddr("founder");
    address stranger = makeAddr("stranger");

    uint64 constant START = 1_800_000_000;
    uint64 constant DURATION = 3 * 365 days; // three years
    uint64 constant CLIFF = 90 days;
    uint256 constant ALLOCATION = 800_000_000e18; // 80% of supply

    function setUp() public {
        token = new CardinalsPromise();
        vesting = new CardinalVesting(founder, START, DURATION, CLIFF);
        token.transfer(address(vesting), ALLOCATION);
        vm.warp(START);
    }

    // ---------------------------------------------------------------- setup

    function test_HoldsTheFounderAllocation() public view {
        assertEq(token.balanceOf(address(vesting)), ALLOCATION);
    }

    function test_ScheduleParameters() public view {
        assertEq(vesting.start(), START);
        assertEq(vesting.duration(), DURATION);
        assertEq(vesting.end(), START + DURATION);
        assertEq(vesting.cliff(), START + CLIFF);
        assertEq(vesting.owner(), founder);
    }

    // ---------------------------------------------------------------- cliff

    function test_NothingVestedAtStart() public view {
        assertEq(vesting.releasable(address(token)), 0);
    }

    function test_NothingVestedTheSecondBeforeCliff() public {
        vm.warp(START + CLIFF - 1);
        assertEq(vesting.releasable(address(token)), 0);
    }

    function test_ReleaseBeforeCliffTransfersNothing() public {
        vm.warp(START + CLIFF - 1);
        vesting.release(address(token));
        assertEq(token.balanceOf(founder), 0);
        assertEq(token.balanceOf(address(vesting)), ALLOCATION);
    }

    function test_CliffOpensProRataAmount() public {
        vm.warp(START + CLIFF);
        // At the cliff the schedule catches up: the elapsed fraction vests.
        assertEq(
            vesting.releasable(address(token)),
            (ALLOCATION * CLIFF) / DURATION
        );
    }

    // ------------------------------------------------------------- schedule

    function test_HalfwayThroughReleasesHalf() public {
        vm.warp(START + DURATION / 2);
        assertApproxEqAbs(
            vesting.releasable(address(token)),
            ALLOCATION / 2,
            1e18
        );
    }

    function test_FullyVestedAtEnd() public {
        vm.warp(START + DURATION);
        assertEq(vesting.releasable(address(token)), ALLOCATION);
    }

    function test_NeverExceedsAllocationAfterEnd() public {
        vm.warp(START + DURATION + 3650 days);
        assertEq(vesting.releasable(address(token)), ALLOCATION);
    }

    function test_ReleaseSendsToBeneficiary() public {
        vm.warp(START + DURATION);
        vesting.release(address(token));
        assertEq(token.balanceOf(founder), ALLOCATION);
        assertEq(token.balanceOf(address(vesting)), 0);
    }

    function test_ScheduleIsMonotonic() public {
        uint256 previous;
        for (uint256 i = 0; i <= 36; i++) {
            vm.warp(START + uint64((DURATION * i) / 36));
            uint256 vested = vesting.vestedAmount(
                address(token),
                uint64(block.timestamp)
            );
            assertGe(vested, previous, "vested amount went backwards");
            previous = vested;
        }
        assertEq(previous, ALLOCATION);
    }

    function testFuzz_NeverReleasesMoreThanScheduled(uint64 t) public {
        t = uint64(bound(t, START, START + DURATION));
        vm.warp(t);

        uint256 expected = t < START + CLIFF
            ? 0
            : (ALLOCATION * (t - START)) / DURATION;

        assertEq(vesting.releasable(address(token)), expected);

        vesting.release(address(token));
        assertEq(token.balanceOf(founder), expected);
    }

    // ----------------------------------------------------- what it can't do

    /// The beneficiary has no power to take tokens ahead of schedule.
    function test_RevertWhen_BeneficiaryTriesToPullTokensDirectly() public {
        vm.warp(START + CLIFF - 1);
        vm.prank(founder);
        vm.expectRevert();
        token.transferFrom(address(vesting), founder, ALLOCATION);
        assertEq(token.balanceOf(founder), 0);
    }

    /// Owning the wallet is not a lever on the schedule.
    function test_OwnershipTransferDoesNotAccelerate() public {
        vm.prank(founder);
        vesting.transferOwnership(stranger);

        vm.warp(START + CLIFF - 1);
        vesting.release(address(token));
        assertEq(token.balanceOf(stranger), 0);

        // The new owner receives on the original schedule, not sooner.
        vm.warp(START + DURATION);
        vesting.release(address(token));
        assertEq(token.balanceOf(stranger), ALLOCATION);
    }

    /// Release is permissionless, but the destination is not negotiable.
    function test_StrangerCanCallReleaseButTokensGoToBeneficiary() public {
        vm.warp(START + DURATION);
        vm.prank(stranger);
        vesting.release(address(token));
        assertEq(token.balanceOf(founder), ALLOCATION);
        assertEq(token.balanceOf(stranger), 0);
    }

    /// Repeated calls cannot double-release.
    function test_RepeatedReleasesDoNotOverpay() public {
        vm.warp(START + DURATION / 2);
        vesting.release(address(token));
        uint256 afterFirst = token.balanceOf(founder);

        vesting.release(address(token));
        vesting.release(address(token));
        assertEq(token.balanceOf(founder), afterFirst);

        vm.warp(START + DURATION);
        vesting.release(address(token));
        assertEq(token.balanceOf(founder), ALLOCATION);
    }

    function test_ReleasedAccountingTracksTransfers() public {
        vm.warp(START + DURATION / 2);
        vesting.release(address(token));
        assertEq(vesting.released(address(token)), token.balanceOf(founder));
    }
}
