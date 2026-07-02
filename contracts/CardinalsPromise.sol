// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Cardinals Promise (CARD)
/// @notice A self-contained ERC-20 token on Ethereum with a hard supply cap,
///         owner-controlled minting up to that cap, and holder-initiated burning.
/// @dev Implements the ERC-20 standard (EIP-20) without external dependencies.
contract CardinalsPromise {
    // ---------------------------------------------------------------------
    // ERC-20 metadata
    // ---------------------------------------------------------------------

    string public constant name = "Cardinals Promise";
    string public constant symbol = "CARD";
    uint8 public constant decimals = 18;

    /// @notice Hard cap: 250 million CARD. No mint can ever exceed this.
    uint256 public constant MAX_SUPPLY = 250_000_000 * 10 ** 18;

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    uint256 public totalSupply;
    address public owner;

    mapping(address account => uint256) public balanceOf;
    mapping(address account => mapping(address spender => uint256)) public allowance;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error ZeroAddress();
    error InsufficientBalance(uint256 requested, uint256 available);
    error InsufficientAllowance(uint256 requested, uint256 available);
    error MaxSupplyExceeded(uint256 requested, uint256 remaining);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @param initialSupply Amount minted to the deployer at creation (in wei units).
    constructor(uint256 initialSupply) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    // ---------------------------------------------------------------------
    // ERC-20 core
    // ---------------------------------------------------------------------

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        _spendAllowance(from, msg.sender, value);
        _transfer(from, to, value);
        return true;
    }

    // ---------------------------------------------------------------------
    // Supply management
    // ---------------------------------------------------------------------

    /// @notice Mint new tokens, up to MAX_SUPPLY. Owner only.
    function mint(address to, uint256 value) external onlyOwner {
        _mint(to, value);
    }

    /// @notice Burn tokens from the caller's balance.
    function burn(uint256 value) external {
        _burn(msg.sender, value);
    }

    /// @notice Burn tokens from `from` using the caller's allowance.
    function burnFrom(address from, uint256 value) external {
        _spendAllowance(from, msg.sender, value);
        _burn(from, value);
    }

    // ---------------------------------------------------------------------
    // Ownership
    // ---------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Irreversibly give up minting rights, fixing the supply forever.
    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < value) revert InsufficientBalance(value, fromBalance);
        unchecked {
            balanceOf[from] = fromBalance - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _spendAllowance(address from, address spender, uint256 value) internal {
        uint256 current = allowance[from][spender];
        if (current != type(uint256).max) {
            if (current < value) revert InsufficientAllowance(value, current);
            unchecked {
                allowance[from][spender] = current - value;
            }
        }
    }

    function _mint(address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 remaining = MAX_SUPPLY - totalSupply;
        if (value > remaining) revert MaxSupplyExceeded(value, remaining);
        unchecked {
            totalSupply += value;
            balanceOf[to] += value;
        }
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < value) revert InsufficientBalance(value, fromBalance);
        unchecked {
            balanceOf[from] = fromBalance - value;
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
    }
}
