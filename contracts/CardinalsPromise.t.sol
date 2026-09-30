// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CardinalsPromise} from "./CardinalsPromise.sol";

contract CardinalsPromiseTest is Test {
    CardinalsPromise token;
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        token = new CardinalsPromise(treasury);
    }

    function test_RevertWhen_TreasuryIsZero() public {
        vm.expectRevert("CardinalsPromise: treasury is zero");
        new CardinalsPromise(address(0));
    }

    function test_RevertWhen_TreasuryIsDeployer() public {
        vm.expectRevert("CardinalsPromise: treasury is deployer");
        new CardinalsPromise(address(this));
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Cardinals Promise");
        assertEq(token.symbol(), "CARD");
        assertEq(token.decimals(), 18);
        assertEq(token.FEE_BPS(), 200);
        assertEq(token.treasury(), treasury);
    }

    function test_OwnerIsDeployer() public view {
        assertEq(token.owner(), address(this));
    }

    function test_RenounceOwnershipSetsOwnerToZero() public {
        token.renounceOwnership();
        assertEq(token.owner(), address(0));
    }

    function test_TransfersStillWorkAfterRenounce() public {
        token.renounceOwnership();
        token.transfer(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 980e18);
    }

    function test_FullSupplyMintedToDeployer() public view {
        assertEq(token.totalSupply(), 1_000_000_000e18);
        assertEq(token.balanceOf(address(this)), token.totalSupply());
    }

    function test_TransferTakesExactTwoPercentFee() public {
        token.transfer(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 980e18);
        assertEq(token.balanceOf(treasury), 20e18);
        assertEq(token.balanceOf(address(this)), 1_000_000_000e18 - 1_000e18);
    }

    function test_TreasuryTransfersAreExempt() public {
        token.transfer(treasury, 1_000e18);
        assertEq(token.balanceOf(treasury), 1_000e18);

        vm.prank(treasury);
        token.transfer(bob, 400e18);
        assertEq(token.balanceOf(bob), 400e18);
        assertEq(token.balanceOf(treasury), 600e18);
    }

    function test_TransferToTreasuryIsExempt() public {
        token.transfer(treasury, 1_000e18);
        assertEq(token.balanceOf(treasury), 1_000e18);
        assertEq(token.balanceOf(address(this)), 1_000_000_000e18 - 1_000e18);
    }

    function test_TinyTransferRoundsFeeDown() public {
        token.transfer(alice, 49);
        assertEq(token.balanceOf(alice), 49);
        assertEq(token.balanceOf(treasury), 0);
    }

    function test_SelfTransferIsNoOp() public {
        uint256 beforeBalance = token.balanceOf(address(this));
        token.transfer(address(this), 1_000e18);
        assertEq(token.balanceOf(address(this)), beforeBalance);
        assertEq(token.balanceOf(treasury), 0);
    }

    function testFuzz_TransferPreservesTotalSupply(uint256 amount) public {
        amount = bound(amount, 0, token.totalSupply());
        token.transfer(alice, amount);
        assertEq(token.totalSupply(), 1_000_000_000e18);
        assertEq(
            token.balanceOf(alice) + token.balanceOf(treasury) + token.balanceOf(address(this)),
            token.totalSupply()
        );
    }

    function test_RevertWhen_TransferExceedsBalance() public {
        vm.prank(alice);
        vm.expectRevert();
        token.transfer(bob, 1);
    }

    function test_ApproveAndTransferFrom() public {
        token.approve(alice, 500e18);
        vm.prank(alice);
        token.transferFrom(address(this), bob, 500e18);
        assertEq(token.balanceOf(bob), 490e18);
        assertEq(token.balanceOf(treasury), 10e18);
        assertEq(token.allowance(address(this), alice), 0);
    }
}
