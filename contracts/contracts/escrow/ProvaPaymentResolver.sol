// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IConditionResolver} from "../interfaces/IConditionResolver.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ProvaPaymentResolver
/// @dev Condition resolver for payment-based escrow release.
contract ProvaPaymentResolver is IConditionResolver, ERC165, ReentrancyGuard {
    struct PaymentCondition {
        address buyer;
        uint256 amount;
        uint256 dueDate;
        bool set;
    }

    mapping(uint256 => PaymentCondition) public conditions;

    event ConditionSet(uint256 indexed escrowId, address buyer, uint256 amount, uint256 dueDate);

    function onConditionSet(uint256 escrowId, bytes calldata data) external override nonReentrant {
        require(!conditions[escrowId].set, "Condition already set");

        (address buyer, uint256 amount, uint256 dueDate) = abi.decode(data, (address, uint256, uint256));
        require(buyer != address(0), "Invalid buyer");
        require(amount > 0, "Invalid amount");
        require(dueDate > block.timestamp, "Due date must be in future");

        conditions[escrowId] = PaymentCondition({
            buyer: buyer,
            amount: amount,
            dueDate: dueDate,
            set: true
        });

        emit ConditionSet(escrowId, buyer, amount, dueDate);
    }

    function isConditionMet(uint256 escrowId) external view override returns (bool) {
        PaymentCondition memory condition = conditions[escrowId];
        return condition.set && block.timestamp >= condition.dueDate;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IConditionResolver).interfaceId || super.supportsInterface(interfaceId);
    }
}