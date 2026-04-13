// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IConditionResolver} from "../interfaces/IConditionResolver.sol";

/// @title ConfidentialEscrow
/// @notice Core escrow contract for PROVA trade credit insurance.
/// @dev Each escrow tracks its own funded balance separately from other escrows.
contract ConfidentialEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Escrow {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        address resolver;
        uint256 escrowId;
        bool active;
    }

    mapping(uint256 => Escrow) public escrows;

    /// @notice Tracks how much each individual escrow has been funded by the buyer.
    /// @dev Isolated per escrowId — fixes the shared-balance cancel bug.
    mapping(uint256 => uint256) public escrowBalances;

    uint256 public nextEscrowId;

    event EscrowCreated(uint256 indexed escrowId, address indexed seller, address indexed buyer, uint256 amount);
    event EscrowSettled(uint256 indexed escrowId);
    event FundsReleased(uint256 indexed escrowId, address indexed to, uint256 amount);

    /// @notice Emitted when a seller cancels an escrow.
    /// @param refundAmount Amount returned to the buyer (0 if unfunded).
    /// @param refundTo     Buyer address if refund was sent, address(0) if no refund.
    event EscrowCancelled(uint256 indexed escrowId, uint256 refundAmount, address indexed refundTo);

    constructor() Ownable(msg.sender) {}

    /// @notice Create a new trade-credit escrow.
    /// @dev No upfront funds from the seller — the buyer settles debt via settleDebt().
    function createEscrow(
        address buyer,
        address token,
        uint256 amount,
        address resolver,
        bytes calldata data
    ) external nonReentrant returns (uint256 escrowId) {
        require(amount > 0, "Amount must be > 0");
        require(buyer != address(0), "Invalid buyer");
        require(resolver != address(0), "Invalid resolver");

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            seller: msg.sender,
            buyer: buyer,
            token: token,
            amount: amount,
            resolver: resolver,
            escrowId: escrowId,
            active: true
        });

        IConditionResolver(resolver).onConditionSet(escrowId, data);

        emit EscrowCreated(escrowId, msg.sender, buyer, amount);
    }

    /// @notice Buyer deposits funds into escrow to settle their debt.
    /// @dev Tracks per-escrow balance to isolate funds across concurrent escrows.
    function settleDebt(uint256 escrowId, uint256 amount) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.active, "Escrow not active");
        require(msg.sender == escrow.buyer, "Only buyer can settle debt");
        require(amount >= escrow.amount, "Insufficient payment amount");

        IERC20(escrow.token).safeTransferFrom(msg.sender, address(this), amount);
        escrowBalances[escrowId] += amount;
    }

    /// @notice Settle the escrow once the resolver confirms the condition is met.
    /// @dev Releases exactly escrow.amount to the seller; refunds any overpayment to buyer.
    function settleEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.active, "Escrow not active");
        require(
            IConditionResolver(escrow.resolver).isConditionMet(escrowId),
            "Condition not met"
        );

        uint256 funded = escrowBalances[escrowId];
        require(funded >= escrow.amount, "Escrow not funded");

        escrow.active = false;
        escrowBalances[escrowId] = 0;

        // Release invoice amount to seller
        IERC20(escrow.token).safeTransfer(escrow.seller, escrow.amount);

        // Refund any overpayment to buyer
        if (funded > escrow.amount) {
            IERC20(escrow.token).safeTransfer(escrow.buyer, funded - escrow.amount);
        }

        emit EscrowSettled(escrowId);
        emit FundsReleased(escrowId, escrow.seller, escrow.amount);
    }

    /// @notice Seller cancels the escrow before settlement.
    /// @dev If the buyer has already deposited funds, they are refunded to the buyer — not the seller.
    ///      Emits EscrowCancelled (not FundsReleased) to distinguish cancel from settlement.
    function cancelEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.active, "Escrow not active");
        require(msg.sender == escrow.seller, "Only seller can cancel");

        escrow.active = false;

        uint256 funded = escrowBalances[escrowId];
        escrowBalances[escrowId] = 0;

        if (funded > 0) {
            // Buyer deposited — return their funds, not the seller's
            IERC20(escrow.token).safeTransfer(escrow.buyer, funded);
            emit EscrowCancelled(escrowId, funded, escrow.buyer);
        } else {
            // Unfunded — nothing to refund
            emit EscrowCancelled(escrowId, 0, address(0));
        }
    }
}
