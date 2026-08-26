// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CardinalsPromise} from "./CardinalsPromise.sol";

contract CardinalsPromiseTest is Test {
    CardinalsPromise token;

    address treasury = makeAddr("treasury");
    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address merchant = makeAddr("merchant");
    address merchant2 = makeAddr("merchant2");

    function setUp() public {
        token = new CardinalsPromise(treasury, admin);
        vm.startPrank(admin);
        token.setMember(alice, true);
        token.setMember(bob, true);
        token.setMerchant(merchant, true);
        token.setMerchant(merchant2, true);
        vm.stopPrank();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Cardinals Promise");
        assertEq(token.symbol(), "CARD");
        assertEq(token.decimals(), 18);
    }

    function test_FullSupplyMintedToTreasury() public view {
        assertEq(token.totalSupply(), 1_000_000_000e18);
        assertEq(token.balanceOf(treasury), token.totalSupply());
    }

    function test_OwnerIsAdmin() public view {
        assertEq(token.owner(), admin);
    }

    function test_TreasuryCanDistributeToMember() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 1_000e18);
    }

    function test_TreasuryCanDistributeToMerchant() public {
        vm.prank(treasury);
        token.transfer(merchant, 1_000e18);
        assertEq(token.balanceOf(merchant), 1_000e18);
    }

    function test_MemberCanSpendAtMerchant() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        token.transfer(merchant, 250e18);

        assertEq(token.balanceOf(alice), 750e18);
        assertEq(token.balanceOf(merchant), 250e18);
    }

    function test_MemberCanReturnToTreasury() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        token.transfer(treasury, 400e18);

        assertEq(token.balanceOf(alice), 600e18);
    }

    function test_MerchantCanReturnToTreasury() public {
        vm.prank(treasury);
        token.transfer(merchant, 1_000e18);

        vm.prank(merchant);
        token.transfer(treasury, 400e18);

        assertEq(token.balanceOf(merchant), 600e18);
    }

    function test_RevertWhen_MemberTransfersToMember() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CardinalsPromise.TransferNotPermitted.selector, alice, bob)
        );
        token.transfer(bob, 1e18);
    }

    function test_RevertWhen_MemberTransfersToArbitraryAddress() public {
        address outsider = makeAddr("outsider");
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CardinalsPromise.TransferNotPermitted.selector, alice, outsider)
        );
        token.transfer(outsider, 1e18);
    }

    function test_RevertWhen_MerchantTransfersToMember() public {
        vm.prank(treasury);
        token.transfer(merchant, 1_000e18);

        vm.prank(merchant);
        vm.expectRevert(
            abi.encodeWithSelector(CardinalsPromise.TransferNotPermitted.selector, merchant, alice)
        );
        token.transfer(alice, 1e18);
    }

    function test_TransferFromCannotBypassRestrictions() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        token.approve(bob, 100e18);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(CardinalsPromise.TransferNotPermitted.selector, alice, bob)
        );
        token.transferFrom(alice, bob, 100e18);
    }

    function test_TransferFromCanSpendAtMerchant() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        token.approve(bob, 100e18);

        vm.prank(bob);
        token.transferFrom(alice, merchant, 100e18);
        assertEq(token.balanceOf(merchant), 100e18);
    }

    function test_PauseStopsTransfers() public {
        vm.prank(admin);
        token.pause();

        vm.prank(treasury);
        vm.expectRevert();
        token.transfer(alice, 1e18);
    }

    function test_UnpauseRestoresAllowedTransfers() public {
        vm.startPrank(admin);
        token.pause();
        token.unpause();
        vm.stopPrank();

        vm.prank(treasury);
        token.transfer(alice, 1e18);
        assertEq(token.balanceOf(alice), 1e18);
    }

    function test_OnlyOwnerCanChangeRoles() public {
        vm.prank(alice);
        vm.expectRevert();
        token.setMerchant(alice, true);
    }

    function test_RevertOnBurn() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000e18);

        vm.prank(alice);
        vm.expectRevert(CardinalsPromise.BurnDisabled.selector);
        token.transfer(address(0), 1e18);
    }

    function test_RevertWhen_TransferExceedsBalance() public {
        vm.prank(alice);
        vm.expectRevert();
        token.transfer(merchant, 1);
    }

    function testFuzz_AllowedMemberSpendPreservesSupply(uint256 amount) public {
        amount = bound(amount, 0, 1_000_000e18);
        vm.prank(treasury);
        token.transfer(alice, amount);

        vm.prank(alice);
        token.transfer(merchant, amount);

        assertEq(token.totalSupply(), 1_000_000_000e18);
    }
}
