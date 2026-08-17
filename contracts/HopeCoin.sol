// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Hope Coin (HOPE)
/// @notice Fixed-supply ERC-20 with one deliberate, permanent mechanic: every
///         transfer sends a fixed 2% fee to the treasury address named at
///         deployment. The entire 250M supply is minted once at deployment;
///         there is no mint function, no blacklist, and no pausing. The fee
///         rate and the treasury address are constants — the contract contains
///         no function that can change either. See TOKEN_LAUNCH_STRATEGY.md
///         and LAUNCH.md.
/// @dev Ownable is inherited solely so that `renounceOwnership()` can be
///      called as a public, verifiable launch step (owner becomes the zero
///      address). No function in this contract is owner-gated — ownership
///      grants no power even before it is renounced.
///
///      Fee mechanics: on every transfer of `value`, `value * 2%` (rounded
///      down) goes to `treasury` and the remainder to the recipient. Because
///      this is a fee-on-transfer token, DEX swaps must use the router
///      functions that support fee-on-transfer tokens.
contract HopeCoin is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 250_000_000 * 1e18;

    /// Fee in basis points (200 = 2%). A constant: it can never be changed.
    uint256 public constant FEE_BPS = 200;

    /// Where every transfer's 2% goes. Immutable: set once at deployment,
    /// no function can ever point it anywhere else.
    address public immutable treasury;

    constructor(address treasury_) ERC20("Hope Coin", "HOPE") Ownable(msg.sender) {
        require(treasury_ != address(0), "HopeCoin: treasury is zero");
        treasury = treasury_;
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /// @dev Routes 2% of every transfer to the treasury. The mint in the
    ///      constructor (from == address(0)) passes through untaxed; no burn
    ///      path exists. Supply is conserved: fee moves balance, never
    ///      destroys it.
    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * FEE_BPS) / 10_000;
        if (fee != 0) {
            super._update(from, treasury, fee);
        }
        super._update(from, to, value - fee);
    }
}
