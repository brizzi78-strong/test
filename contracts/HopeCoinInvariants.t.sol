// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {HopeCoin} from "./HopeCoin.sol";

/// @notice Fuzz handler for HopeCoin invariant testing. The invariant runner
///         calls these entry points in random sequences from random senders;
///         the handler narrows that randomness onto valid token operations,
///         checking the exact 2% fee semantics on every hop. The treasury is
///         itself an actor so fee-exempt paths are exercised too.
contract HopeCoinHandler {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    HopeCoin public immutable token;
    address public constant TREASURY = address(0x7EA5);
    address[] public actors;
    bool public renounced;

    constructor(uint256 numActors) {
        token = new HopeCoin(TREASURY);
        uint256 share = token.totalSupply() / (numActors * 2);
        for (uint256 i = 0; i < numActors; i++) {
            address actor = address(uint160(0xCA4D0000 + i));
            actors.push(actor);
            token.transfer(actor, share);
        }
        actors.push(address(this));
        actors.push(TREASURY);
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function transfer(uint256 fromSeed, uint256 toSeed, uint256 amount) external {
        address from = actors[fromSeed % actors.length];
        address to = actors[toSeed % actors.length];
        amount = amount % (token.balanceOf(from) + 1);

        bool exempt = from == TREASURY || to == TREASURY;
        uint256 fee = exempt ? 0 : (amount * token.FEE_BPS()) / 10_000;

        uint256 toBefore = token.balanceOf(to);
        uint256 fromBefore = token.balanceOf(from);
        uint256 tBefore = token.balanceOf(TREASURY);

        vm.prank(from);
        token.transfer(to, amount);

        if (from == to) {
            if (exempt) {
                require(token.balanceOf(from) == fromBefore, "exempt self-transfer changed balance");
            } else {
                require(token.balanceOf(from) == fromBefore - fee, "self-transfer fee wrong");
                require(token.balanceOf(TREASURY) == tBefore + fee, "self-transfer treasury wrong");
            }
        } else if (exempt) {
            require(token.balanceOf(to) == toBefore + amount, "exempt recipient wrong");
            require(token.balanceOf(from) == fromBefore - amount, "exempt sender wrong");
        } else {
            require(token.balanceOf(to) == toBefore + amount - fee, "recipient net wrong");
            require(token.balanceOf(from) == fromBefore - amount, "sender wrong");
            require(token.balanceOf(TREASURY) == tBefore + fee, "treasury fee wrong");
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

        bool exempt = owner == TREASURY || to == TREASURY;
        uint256 fee = exempt ? 0 : (amount * token.FEE_BPS()) / 10_000;
        uint256 toBefore = token.balanceOf(to);

        vm.prank(spender);
        token.transferFrom(owner, to, amount);

        if (owner != to) {
            require(token.balanceOf(to) == toBefore + amount - fee, "transferFrom recipient wrong");
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

/// @notice Stateful verification of HopeCoin's launch-critical properties.
contract HopeCoinInvariantTest is Test {
    uint256 internal constant NUM_ACTORS = 8;

    HopeCoinHandler handler;
    HopeCoin token;

    function setUp() public {
        handler = new HopeCoinHandler(NUM_ACTORS);
        token = handler.token();
        targetContract(address(handler));
    }

    /// Supply can never change: no mint, no burn, no rebase. The fee moves
    /// coins; it never creates or destroys them.
    function invariant_TotalSupplyConstant() public view {
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    /// Tokens are conserved: every unit of supply, fees included, is in
    /// some actor's balance (the treasury is an actor).
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
