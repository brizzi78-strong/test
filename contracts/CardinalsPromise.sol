// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Cardinals Promise (CARD)
/// @notice A plain, fixed-supply ERC-20. The entire 250M supply is minted
///         once at deployment to the deployer. There is no mint function,
///         no burn, no transfer fee, no blacklist, and no pausing. A
///         transfer moves exactly the amount sent — nothing is skimmed by
///         anyone, including the issuer.
/// @dev There is deliberately no `_update` override: the contract adds no
///      behaviour whatsoever to OpenZeppelin's ERC20. That is the point.
///      Ownable is inherited solely so that `renounceOwnership()` can be
///      called as a public, verifiable launch step (owner becomes the zero
///      address). No function here is owner-gated — ownership grants no
///      power even before it is renounced.
contract CardinalsPromise is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 250_000_000 * 1e18;

    constructor() ERC20("Cardinals Promise", "CARD") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
