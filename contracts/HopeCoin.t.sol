// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {HopeCoin} from "./HopeCoin.sol";

contract HopeCoinTest is Test {
    HopeCoin token;
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        token = new HopeCoin(treasury);
    }

    /// 2% of `amount`, exactly as the contract computes it.
    function fee(uint256 amount) internal pure returns (uint256) {
        return (amount * 200) / 10_000;
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Hope Coin");
        assertEq(token.symbol(), "HOPE");
        assertEq(token.decimals(), 18);
    }

    function test_FeeConstantsAreFixed() public view {
        assertEq(token.FEE_BPS(), 200);
        assertEq(token.treasury(), treasury);
    }

    function test_RevertWhen_TreasuryIsZero() public {
        vm.expectRevert(bytes("HopeCoin: treasury is zero"));
        new HopeCoin(address(0));
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
        assertEq(token.balanceOf(alice), 1_000e18 - fee(1_000e18));
    }

    function test_FullSupplyMintedToDeployer() public view {
        assertEq(token.totalSupply(), 250_000_000e18);
        assertEq(token.balanceOf(address(this)), token.totalSupply());
    }

    function test_TransferTakesFixedFee() public {
        token.transfer(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 980e18);
        assertEq(token.balanceOf(treasury), 20e18);
        assertEq(token.balanceOf(address(this)), 250_000_000e18 - 1_000e18);
    }

    function test_TransferToTreasuryNetsFullAmount() public {
        token.transfer(treasury, 1_000e18);
        // 980 as recipient + 20 as fee: the treasury nets the full amount.
        assertEq(token.balanceOf(treasury), 1_000e18);
    }

    function test_TinyTransferBelowFeeGranularityIsUntaxed() public {
        token.transfer(alice, 49); // 49 * 200 / 10_000 == 0
        assertEq(token.balanceOf(alice), 49);
        assertEq(token.balanceOf(treasury), 0);
    }

    function testFuzz_TransferPreservesTotalSupply(uint256 amount) public {
        amount = bound(amount, 0, token.totalSupply());
        token.transfer(alice, amount);
        assertEq(token.totalSupply(), 250_000_000e18);
        assertEq(
            token.balanceOf(alice) + token.balanceOf(treasury) + token.balanceOf(address(this)),
            token.totalSupply()
        );
    }

    function testFuzz_FeeIsExactlyTwoPercent(uint256 amount) public {
        amount = bound(amount, 0, token.totalSupply());
        token.transfer(alice, amount);
        assertEq(token.balanceOf(treasury), fee(amount));
        assertEq(token.balanceOf(alice), amount - fee(amount));
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
        assertEq(token.balanceOf(bob), 500e18 - fee(500e18));
        assertEq(token.balanceOf(treasury), fee(500e18));
        assertEq(token.allowance(address(this), alice), 0);
    }
}
