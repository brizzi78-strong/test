// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CardinalsPromise} from "./CardinalsPromise.sol";

/// @notice Fuzz handler for CardinalsPromise invariant testing. The invariant
///         runner calls these entry points in random sequences from random
///         senders; the handler narrows that randomness onto valid token
///         operations and asserts, on every hop, that a transfer moves
///         exactly the amount sent — no skim, no leak, no special case.
contract CardinalsPromiseHandler {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    CardinalsPromise public immutable token;
    address[] public actors;
    bool public renounced;

    constructor(uint256 numActors) {
        token = new CardinalsPromise();
        uint256 share = token.totalSupply() / (numActors * 2);
        for (uint256 i = 0; i < numActors; i++) {
            address actor = address(uint160(0xCA4D0000 + i));
            actors.push(actor);
            token.transfer(actor, share);
        }
        actors.push(address(this));
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function transfer(uint256 fromSeed, uint256 toSeed, uint256 amount) external {
        address from = actors[fromSeed % actors.length];
        address to = actors[toSeed % actors.length];
        amount = amount % (token.balanceOf(from) + 1);

        uint256 toBefore = token.balanceOf(to);
        uint256 fromBefore = token.balanceOf(from);

        vm.prank(from);
        token.transfer(to, amount);

        if (from == to) {
            require(token.balanceOf(from) == fromBefore, "self-transfer changed balance");
        } else {
            require(token.balanceOf(to) == toBefore + amount, "recipient did not receive full amount");
            require(token.balanceOf(from) == fromBefore - amount, "sender debited wrong amount");
        }
    }

    function approveAndTransferFrom(
        uint256 ownerSeed,
        uint256 spenderSeed,
        uint256 toSeed,
        uint256 amount
    ) external {
        address owner = actors[ownerSeed % actors.length];
        address spender = actors[spenderSeed % actors.length];
        address to = actors[toSeed % actors.length];
        amount = amount % (token.balanceOf(owner) + 1);

        vm.prank(owner);
        token.approve(spender, amount);

        uint256 toBefore = token.balanceOf(to);

        vm.prank(spender);
        token.transferFrom(owner, to, amount);

        if (owner != to) {
            require(token.balanceOf(to) == toBefore + amount, "transferFrom recipient wrong");
        }
        require(
            owner == spender || token.allowance(owner, spender) == 0,
            "allowance not fully consumed"
        );
    }

    function renounceOwnership() external {
        if (renounced) return;
        token.renounceOwnership();
        renounced = true;
    }
}

/// @notice Stateful verification of CardinalsPromise's launch-critical properties.
contract CardinalsPromiseInvariantTest is Test {
    uint256 internal constant NUM_ACTORS = 8;

    CardinalsPromiseHandler handler;
    CardinalsPromise token;

    function setUp() public {
        handler = new CardinalsPromiseHandler(NUM_ACTORS);
        token = handler.token();
        targetContract(address(handler));
    }

    /// Supply can never change: no mint, no burn, no rebase.
    function invariant_TotalSupplyConstant() public view {
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    /// Tokens are conserved: every unit of supply is in some actor's balance.
    /// With no fee there is no other address a token could have gone to.
    function invariant_BalancesSumToTotalSupply() public view {
        uint256 sum;
        uint256 n = handler.actorCount();
        for (uint256 i = 0; i < n; i++) {
            sum += token.balanceOf(handler.actors(i));
        }
        assertEq(sum, token.totalSupply());
    }

    /// Once ownership is renounced it can never come back.
    function invariant_RenounceIsPermanent() public view {
        if (handler.renounced()) {
            assertEq(token.owner(), address(0));
        }
    }
}
