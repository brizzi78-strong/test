// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {CardToken} from "./CardToken.sol";

/// @notice Fuzz handler for CardToken invariant testing. The invariant runner
///         calls these entry points in random sequences from random senders;
///         the handler narrows that randomness onto valid token operations so
///         sequences exercise real state transitions instead of reverting.
///         Deliberately NOT a Test subclass: its only public surface is the
///         operations we want fuzzed (plus view helpers), so the runner cannot
///         wander into inherited helpers.
contract CardTokenHandler {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    CardToken public immutable token;
    address[] public actors;
    bool public renounced;

    constructor(uint256 numActors) {
        token = new CardToken();
        uint256 share = token.totalSupply() / (numActors * 2);
        for (uint256 i = 0; i < numActors; i++) {
            address actor = address(uint160(0xCA4D0000 + i));
            actors.push(actor);
            token.transfer(actor, share);
        }
        // The handler keeps the remaining half of the supply and is itself an
        // actor, so transfers to/from a large holder are exercised too.
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

        // No-tax property: every transfer moves exactly the requested amount.
        if (from != to) {
            require(token.balanceOf(to) == toBefore + amount, "transfer taxed recipient");
            require(token.balanceOf(from) == fromBefore - amount, "transfer overcharged sender");
        } else {
            require(token.balanceOf(from) == fromBefore, "self-transfer changed balance");
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
            require(token.balanceOf(to) == toBefore + amount, "transferFrom taxed recipient");
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

/// @notice Stateful verification of CardToken's launch-critical properties.
///         Each invariant is re-checked after every randomized call sequence
///         against the handler above (256 sequences by default).
contract CardTokenInvariantTest is Test {
    uint256 internal constant NUM_ACTORS = 8;

    CardTokenHandler handler;
    CardToken token;

    function setUp() public {
        handler = new CardTokenHandler(NUM_ACTORS);
        token = handler.token();
        targetContract(address(handler));
    }

    /// Supply can never change: no mint, no burn, no rebase.
    function invariant_TotalSupplyConstant() public view {
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    /// Tokens are conserved: every unit of supply is in some actor's balance.
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
