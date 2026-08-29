// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Cardinals Promise (CARD)
/// @notice Fixed-supply community token for an earned-and-spent network.
/// @dev The full 1B supply is minted once to the treasury. There is no public
///      minting, burning, transfer tax, AMM integration, or unrestricted
///      wallet-to-wallet transfer path. The owner is an operational control
///      role intended to be held by a multisig during the pilot.
contract CardinalsPromise is ERC20, Ownable, Pausable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;

    address public immutable treasury;

    mapping(address => bool) public members;
    mapping(address => bool) public merchants;

    error ZeroAddress();
    error TransferNotPermitted(address from, address to);
    error BurnDisabled();
    error OwnershipRenunciationDisabled();
    error RoleConflict(address account);

    event MemberStatusChanged(address indexed account, bool approved);
    event MerchantStatusChanged(address indexed account, bool approved);

    constructor(address treasury_, address admin_)
        ERC20("Cardinals Promise", "CARD")
        Ownable(admin_)
    {
        if (treasury_ == address(0) || admin_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        _mint(treasury_, TOTAL_SUPPLY);
    }

    /// @notice Approve or remove a member wallet.
    function setMember(address account, bool approved) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        if (approved && merchants[account]) revert RoleConflict(account);
        members[account] = approved;
        emit MemberStatusChanged(account, approved);
    }

    /// @notice Approve or remove a participating merchant wallet.
    function setMerchant(address account, bool approved) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        if (approved && members[account]) revert RoleConflict(account);
        merchants[account] = approved;
        emit MerchantStatusChanged(account, approved);
    }

    /// @notice Emergency stop for pilot operations.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice CARD v2 requires an administrator for participant controls and
    ///         emergency response, so ownership may be transferred but not
    ///         irreversibly discarded.
    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }

    /// @dev Allowed value flows:
    ///      treasury -> approved member/merchant (distribution)
    ///      approved member -> approved merchant (spending)
    ///      any existing holder -> treasury (return/reconciliation, including
    ///      after a role is revoked so balances cannot become stranded)
    ///      No member->member, merchant->member, or arbitrary-contract path.
    ///      transferFrom cannot bypass these rules because all ERC-20 movement
    ///      reaches _update().
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        // Constructor mint only.
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }

        if (to == address(0)) revert BurnDisabled();

        bool allowed =
            (from == treasury && (members[to] || merchants[to])) ||
            (members[from] && merchants[to]) ||
            (to == treasury);

        if (!allowed) revert TransferNotPermitted(from, to);
        super._update(from, to, value);
    }
}
