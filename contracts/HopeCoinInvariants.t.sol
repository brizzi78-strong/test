// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {HopeCoin} from "./HopeCoin.sol";

/// @notice Fuzz handler for HopeCoin invariant testing. The invariant runner
///         calls these entry points in random sequences from random senders;
///         the handler narrows that randomness onto valid token operations so
///         sequences exercise real state transitions instead of reverting.
///         Deliberately NOT a Test subclass: its only public surface is the
///         operations we want fuzzed (plus view helpers), so the runner cannot
///         wander into inherited helpers.
contract HopeCoinHandler {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    HopeCoin public immutable token;
    address public immutable treasury = address(uint160(0x0000000000000000000000000000000000007EA5));
    address[] public actors;
    bool public renounced;

    uint256 private constant FEE_BPS = 200;

    constructor(uint256 numActors) {
        token = new HopeCoin(treasury);
        uint256 share = token.totalSupply() / (numActors * 2);
        for (uint256 i = 0; i < numActors; i++) {
            address actor = address(uint160(0xCA4D0000 + i));
            actors.push(actor);
            token.transfer(actor, share);
        }
        // The handler keeps the remaining supply and is itself an actor, so
        // transfers to/from a large holder are exercised too.
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
        uint256 treasuryBefore = token.balanceOf(treasury);
        uint256 fee = (amount * FEE_BPS) / 10_000;

        vm.prank(from);
        token.transfer(to, amount);

        // Fixed-fee property: every transfer moves exactly amount-fee to the
        // recipient and exactly fee to the treasury, never more, never less.
        if (from != to) {
            require(token.balanceOf(to) == toBefore + amount - fee, "recipient got wrong net amount");
            require(token.balanceOf(from) == fromBefore - amount, "sender charged wrong amount");
        } else {
            require(token.balanceOf(from) == fromBefore - fee, "self-transfer should cost exactly the fee");
        }
        require(token.balanceOf(treasury) == treasuryBefore + fee, "treasury got wrong fee");
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
        uint256 treasuryBefore = token.balanceOf(treasury);
        uint256 fee = (amount * FEE_BPS) / 10_000;

        vm.prank(spender);
        token.transferFrom(owner, to, amount);

        if (owner != to) {
            require(token.balanceOf(to) == toBefore + amount - fee, "transferFrom recipient got wrong net");
        }
        require(token.balanceOf(treasury) == treasuryBefore + fee, "transferFrom treasury got wrong fee");
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

/// @notice Stateful verification of HopeCoin's launch-critical properties.
///         Each invariant is re-checked after every randomized call sequence
///         against the handler above (256 sequences by default).
contract HopeCoinInvariantTest is Test {
    uint256 internal constant NUM_ACTORS = 8;

    HopeCoinHandler handler;
    HopeCoin token;

    function setUp() public {
        handler = new HopeCoinHandler(NUM_ACTORS);
        token = handler.token();
        targetContract(address(handler));
    }

    /// Supply can never change: no mint, no burn, no rebase. The 2% fee moves
    /// balance to the treasury; it never destroys it.
    function invariant_TotalSupplyConstant() public view {
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    /// Tokens are conserved: every unit of supply is in some actor's balance
    /// or in the treasury.
    function invariant_BalancesSumToTotalSupply() public view {
        uint256 sum = token.balanceOf(handler.treasury());
        uint256 n = handler.actorCount();
        for (uint256 i = 0; i < n; i++) {
            sum += token.balanceOf(handler.actors(i));
        }
        assertEq(sum, token.totalSupply());
    }

    /// The fee rate and destination are fixed at deployment, forever.
    function invariant_FeeParametersImmutable() public view {
        assertEq(token.FEE_BPS(), 200);
        assertEq(token.treasury(), handler.treasury());
    }

    /// Once ownership is renounced it can never come back.
    function invariant_RenounceIsPermanent() public view {
        if (handler.renounced()) {
            assertEq(token.owner(), address(0));
        }
    }
}
