// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CardinalsPromise} from "./CardinalsPromise.sol";

contract CardinalsPromiseTest is Test {
    CardinalsPromise token;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        token = new CardinalsPromise();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Cardinals Promise");
        assertEq(token.symbol(), "CARD");
        assertEq(token.decimals(), 18);
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
        assertEq(token.balanceOf(alice), 1_000e18);
    }

    function test_FullSupplyMintedToDeployer() public view {
        assertEq(token.totalSupply(), 250_000_000e18);
        assertEq(token.balanceOf(address(this)), token.totalSupply());
    }

    function test_Transfer() public {
        token.transfer(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 1_000e18);
        assertEq(token.balanceOf(address(this)), 250_000_000e18 - 1_000e18);
    }

    function testFuzz_TransferPreservesTotalSupply(uint256 amount) public {
        amount = bound(amount, 0, token.totalSupply());
        token.transfer(alice, amount);
        assertEq(token.totalSupply(), 250_000_000e18);
        assertEq(
            token.balanceOf(alice) + token.balanceOf(address(this)),
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
        assertEq(token.balanceOf(bob), 500e18);
        assertEq(token.allowance(address(this), alice), 0);
    }
}
