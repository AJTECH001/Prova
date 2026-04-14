// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IConditionResolver} from "../interfaces/IConditionResolver.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title  ProvaPaymentResolver
/// @notice Condition resolver implementing TCI protracted-default rules.
///         A claim triggers when the invoice due date + 7-day waiting period has elapsed
///         and the buyer has not recorded payment.
contract ProvaPaymentResolver is IConditionResolver, ERC165, ReentrancyGuard {

    // ─── Constants ───────────────────────────────────────────────────────────

    /// @notice Waiting period after due date before a default claim becomes valid.
    uint256 public constant WAITING_PERIOD = 7 days;

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ConditionAlreadySet(uint256 escrowId);
    error ConditionNotSet(uint256 escrowId);
    error InvalidBuyer();
    error InvalidSeller();
    error InvalidAmount();
    error InvalidDueDate();
    error NotBuyerOrSeller();
    error InvoiceAlreadyPaid(uint256 escrowId);

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @notice Invoice terms stored per escrow.
    /// @dev    Bools are packed with buyer into one 32-byte slot (20 + 1 + 1 = 22 bytes).
    ///         seller, invoiceAmount, dueDate each occupy their own slot — 4 slots total.
    struct InvoiceCondition {
        address buyer;         // debtor — the party that owes payment      (slot 0: 20 bytes)
        bool    invoicePaid;   // true once either party attests payment     (slot 0: +1 byte)
        bool    set;           // existence flag                             (slot 0: +1 byte)
        address seller;        // creditor — the insured party               (slot 1: 20 bytes)
        uint256 invoiceAmount; // face value in stablecoin smallest unit     (slot 2)
        uint256 dueDate;       // original payment due date (Unix timestamp) (slot 3)
    }

    mapping(uint256 => InvoiceCondition) public conditions;

    // ─── Events ──────────────────────────────────────────────────────────────

    event ConditionSet(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 invoiceAmount,
        uint256 dueDate
    );

    event PaymentRecorded(uint256 indexed escrowId, address recordedBy);

    // ─── IConditionResolver ──────────────────────────────────────────────────

    /// @notice Stores invoice terms when a new escrow is created.
    /// @dev    data = abi.encode(address buyer, address seller, uint256 invoiceAmount, uint256 dueDate)
    function onConditionSet(uint256 escrowId, bytes calldata data) external override nonReentrant {
        if (conditions[escrowId].set) revert ConditionAlreadySet(escrowId);

        (address buyer, address seller, uint256 invoiceAmount, uint256 dueDate) =
            abi.decode(data, (address, address, uint256, uint256));

        if (buyer == address(0))                    revert InvalidBuyer();
        if (seller == address(0) || seller == buyer) revert InvalidSeller();
        if (invoiceAmount == 0)                     revert InvalidAmount();
        if (dueDate <= block.timestamp)             revert InvalidDueDate();

        conditions[escrowId] = InvoiceCondition({
            buyer:         buyer,
            seller:        seller,
            invoiceAmount: invoiceAmount,
            dueDate:       dueDate,
            invoicePaid:   false,
            set:           true
        });

        emit ConditionSet(escrowId, buyer, seller, invoiceAmount, dueDate);
    }

    /// @notice Returns true when dueDate + WAITING_PERIOD has passed and invoice is unpaid.
    ///         Called by ConfidentialEscrow on every redemption attempt.
    function isConditionMet(uint256 escrowId) external view override returns (bool) {
        InvoiceCondition memory c = conditions[escrowId];
        if (!c.set || c.invoicePaid) return false;
        return block.timestamp >= c.dueDate + WAITING_PERIOD;
    }

    // ─── Payment recording ───────────────────────────────────────────────────

    /// @notice Buyer or seller attests that the invoice was paid off-chain.
    ///         Once called, isConditionMet permanently returns false — claim is blocked.
    function recordPayment(uint256 escrowId) external nonReentrant {
        InvoiceCondition storage c = conditions[escrowId];
        if (!c.set)       revert ConditionNotSet(escrowId);
        if (c.invoicePaid) revert InvoiceAlreadyPaid(escrowId);
        if (msg.sender != c.buyer && msg.sender != c.seller) revert NotBuyerOrSeller();

        c.invoicePaid = true;
        emit PaymentRecorded(escrowId, msg.sender);
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    /// @notice Declares IConditionResolver support so ConfidentialEscrow can verify this contract.
    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IConditionResolver).interfaceId
            || super.supportsInterface(interfaceId);
    }
}
