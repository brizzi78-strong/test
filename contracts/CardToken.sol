// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CardToken (CARD)
/// @notice Fixed-supply ERC-20 per the launch strategy: the full 250M supply
///         is minted to the deployer at construction and can never change.
///         There is no owner, no mint function, and no pause/blocklist —
///         nothing to renounce because no privileged role ever exists.
contract CardToken is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 250_000_000e18;

    constructor() ERC20("Cardinal", "CARD") {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
