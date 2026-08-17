// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Cardinals Promise (CARD)
/// @notice Fixed-supply ERC-20 with a flat, immutable 2% transfer fee that
///         accrues to a fixed treasury address. The entire 250M supply is
///         minted once at deployment; there is no mint function, no
///         blacklist, and no pausing — and the fee can never be changed,
///         removed, or redirected, by anyone, including the owner.
/// @dev Ownable is inherited solely so that `renounceOwnership()` can be
///      called as a public, verifiable launch step (owner becomes the zero
///      address). No function in this contract is owner-gated — ownership
///      grants no power even before it is renounced. Transfers to or from
///      the treasury are fee-exempt so treasury operations (gifts, the
///      book program) arrive whole and do not self-tax.
contract CardinalsPromise is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 250_000_000 * 1e18;

    /// @notice Transfer fee in basis points, fixed forever at deployment.
    uint256 public constant FEE_BPS = 200; // 2%

    /// @notice Where every fee goes. Immutable: set once, never changeable.
    address public immutable treasury;

    constructor(address treasury_) ERC20("Cardinals Promise", "CARD") Ownable(msg.sender) {
        require(treasury_ != address(0), "CardinalsPromise: treasury is zero");
        treasury = treasury_;
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /// @dev Skims the fee on every real transfer between non-treasury
    ///      parties. Minting (from == 0) is never taxed.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && from != treasury && to != treasury) {
            uint256 fee = (value * FEE_BPS) / 10_000;
            if (fee != 0) {
                super._update(from, treasury, fee);
                value -= fee;
            }
        }
        super._update(from, to, value);
    }
}
