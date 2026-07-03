// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CARD Token
/// @notice Fixed-supply ERC-20. The entire 250M supply is minted once at
///         deployment; there is no mint function, no transfer tax, no
///         blacklist, and no pausing. See TOKEN_LAUNCH_STRATEGY.md.
/// @dev Ownable is inherited solely so that `renounceOwnership()` can be
///      called as a public, verifiable launch step (owner becomes the zero
///      address). No function in this contract is owner-gated — ownership
///      grants no power even before it is renounced.
contract CardToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 250_000_000 * 1e18;

    constructor() ERC20("CARD", "CARD") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
