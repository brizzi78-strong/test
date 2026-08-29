// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CardinalsPromise} from "./CardinalsPromise.sol";

contract CardinalsPromiseHandler {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    CardinalsPromise public immutable token;
    address public immutable treasury;
    address public immutable admin;
    address[] public members;
    address[] public merchants;

    constructor(uint256 numMembers, uint256 numMerchants) {
        treasury = address(uint160(0xCA4D1000));
        admin = address(this);
        token = new CardinalsPromise(treasury, admin);

        for (uint256 i = 0; i < numMembers; i++) {
            address actor = address(uint160(0xCA4D2000 + i));
            members.push(actor);
            token.setMember(actor, true);
        }

        for (uint256 i = 0; i < numMerchants; i++) {
            address actor = address(uint160(0xCA4D3000 + i));
            merchants.push(actor);
            token.setMerchant(actor, true);
        }
    }

    function memberCount() external view returns (uint256) {
        return members.length;
    }

    function merchantCount() external view returns (uint256) {
        return merchants.length;
    }

    function distribute(uint256 memberSeed, uint256 amount) external {
        address member = members[memberSeed % members.length];
        uint256 balance = token.balanceOf(treasury);
        amount = amount % (balance + 1);
        vm.prank(treasury);
        token.transfer(member, amount);
    }

    function spend(uint256 memberSeed, uint256 merchantSeed, uint256 amount) external {
        address member = members[memberSeed % members.length];
        address merchant = merchants[merchantSeed % merchants.length];
        uint256 balance = token.balanceOf(member);
        amount = amount % (balance + 1);
        vm.prank(member);
        token.transfer(merchant, amount);
    }

    function reconcileMerchant(uint256 merchantSeed, uint256 amount) external {
        address merchant = merchants[merchantSeed % merchants.length];
        uint256 balance = token.balanceOf(merchant);
        amount = amount % (balance + 1);
        vm.prank(merchant);
        token.transfer(treasury, amount);
    }

    function returnMember(uint256 memberSeed, uint256 amount) external {
        address member = members[memberSeed % members.length];
        uint256 balance = token.balanceOf(member);
        amount = amount % (balance + 1);
        vm.prank(member);
        token.transfer(treasury, amount);
    }
}

contract CardinalsPromiseInvariantTest is Test {
    uint256 internal constant NUM_MEMBERS = 8;
    uint256 internal constant NUM_MERCHANTS = 4;

    CardinalsPromiseHandler handler;
    CardinalsPromise token;

    function setUp() public {
        handler = new CardinalsPromiseHandler(NUM_MEMBERS, NUM_MERCHANTS);
        token = handler.token();
        targetContract(address(handler));
    }

    function invariant_TotalSupplyConstant() public view {
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    function invariant_BalancesSumToTotalSupply() public view {
        uint256 sum = token.balanceOf(handler.treasury());

        uint256 n = handler.memberCount();
        for (uint256 i = 0; i < n; i++) {
            sum += token.balanceOf(handler.members(i));
        }

        uint256 m = handler.merchantCount();
        for (uint256 i = 0; i < m; i++) {
            sum += token.balanceOf(handler.merchants(i));
        }

        assertEq(sum, token.totalSupply());
    }

    function invariant_RolesRemainSeparated() public view {
        uint256 n = handler.memberCount();
        for (uint256 i = 0; i < n; i++) {
            address member = handler.members(i);
            assertTrue(token.members(member));
            assertFalse(token.merchants(member));
        }

        uint256 m = handler.merchantCount();
        for (uint256 i = 0; i < m; i++) {
            address merchant = handler.merchants(i);
            assertTrue(token.merchants(merchant));
            assertFalse(token.members(merchant));
        }
    }
}
