// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PremiumPool
/// @notice Pool for collecting, distributing insurance premiums, and providing liquidity yield.
contract PremiumPool is Ownable {
    using SafeERC20 for IERC20;

    // The current actual balance of the token owned by LPs (excludes treasury fees directly sent away)
    mapping(address => uint256) public poolBalances;

    // LP Share tracking: token => user => shares
    mapping(address => mapping(address => uint256)) public lpShares;
    
    // Total LP shares: token => total shares
    mapping(address => uint256) public totalLpShares;

    address public treasury;
    uint256 public treasuryFeeBps; // e.g. 500 = 5%
    uint256 public lockPeriod; // seconds cooldown after deposit
    mapping(address => mapping(address => uint256)) public lastDepositTime; // token => provider => timestamp

    event LiquidityProvided(address indexed token, address indexed provider, uint256 amount, uint256 shares);
    event LiquidityRemoved(address indexed token, address indexed provider, uint256 shares, uint256 amount);
    event PremiumDeposited(address indexed token, uint256 totalAmount, uint256 treasuryFee, uint256 poolAmount);
    event PayoutWithdrawn(address indexed token, address indexed to, uint256 amount);
    event TreasuryUpdated(address newTreasury, uint256 newFeeBps);

    constructor() Ownable(msg.sender) {
        treasury = msg.sender;
        treasuryFeeBps = 500; // default 5%
        lockPeriod = 172800; // default 2 days (48h)
    }

    function setLockPeriod(uint256 _newPeriod) external onlyOwner {
        lockPeriod = _newPeriod;
        emit TreasuryUpdated(treasury, treasuryFeeBps); // reuse for simple demo or add new event
    }

    function setTreasury(address _treasury, uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 10000, "Fee too high");
        treasury = _treasury;
        treasuryFeeBps = _feeBps;
        emit TreasuryUpdated(_treasury, _feeBps);
    }

    function provideLiquidity(address token, uint256 amount) external {
        require(amount > 0, "Zero amount");
        
        uint256 sharesToMint = 0;
        uint256 totalShares = totalLpShares[token];
        uint256 currentBalance = poolBalances[token];

        if (totalShares == 0 || currentBalance == 0) {
            sharesToMint = amount;
        } else {
            // shares = amount * totalShares / currentBalance
            sharesToMint = (amount * totalShares) / currentBalance;
        }

        lpShares[token][msg.sender] += sharesToMint;
        totalLpShares[token] += sharesToMint;
        poolBalances[token] += amount;
        lastDepositTime[token][msg.sender] = block.timestamp;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit LiquidityProvided(token, msg.sender, amount, sharesToMint);
    }

    function removeLiquidity(address token, uint256 shares) external {
        require(shares > 0 && lpShares[token][msg.sender] >= shares, "Insufficient shares");
        require(block.timestamp >= lastDepositTime[token][msg.sender] + lockPeriod, "Liquidity locked for cooldown");
        
        uint256 totalShares = totalLpShares[token];
        uint256 currentBalance = poolBalances[token];

        // amount = shares * currentBalance / totalShares
        uint256 amount = (shares * currentBalance) / totalShares;

        lpShares[token][msg.sender] -= shares;
        totalLpShares[token] -= shares;
        poolBalances[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);
        emit LiquidityRemoved(token, msg.sender, shares, amount);
    }

    function depositPremium(address token, uint256 amount) external {
        require(amount > 0, "Zero premium");
        
        uint256 treasuryFee = (amount * treasuryFeeBps) / 10000;
        uint256 poolAmount = amount - treasuryFee;

        // Provide funds from caller to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Send treasury fee
        if (treasuryFee > 0 && treasury != address(0)) {
            IERC20(token).safeTransfer(treasury, treasuryFee);
        }

        // Add poolAmount to pool balance, but DO NOT mint shares. 
        // This increases the value of existing shares.
        poolBalances[token] += poolAmount;

        emit PremiumDeposited(token, amount, treasuryFee, poolAmount);
    }

    // Called by Coverage Manager to pay out claims
    function withdrawPayout(address token, uint256 amount, address to) external onlyOwner {
        require(poolBalances[token] >= amount, "Insufficient pool balance");
        poolBalances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit PayoutWithdrawn(token, to, amount);
    }

    function getBalance(address token) external view returns (uint256) {
        return poolBalances[token];
    }

    /// @notice Dashboard helper: Returns current stablecoin value and shares for an LP.
    function viewEarnings(address token, address user) external view returns (uint256 currentValue, uint256 shares) {
        shares = lpShares[token][user];
        uint256 totalShares = totalLpShares[token];
        if (totalShares == 0) return (0, 0);

        currentValue = (shares * poolBalances[token]) / totalShares;
        return (currentValue, shares);
    }
}