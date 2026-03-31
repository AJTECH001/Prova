// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IConditionResolver} from "../interfaces/IConditionResolver.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProvaPaymentResolver
 * @dev Plugin for ReineiraOS ConfidentialEscrow.
 * Evaluates payment conditions based on off-chain fiat settlement proofs
 * verified via zkTLS (Reclaim Protocol).
 */
contract ProvaPaymentResolver is IConditionResolver, ERC165, ReentrancyGuard {
    
    struct EscrowConfig {
        address buyer;
        uint256 invoiceAmount;
        uint256 dueDate;
    }

    // Maps escrow ID to its configuration initialized at start
    mapping(uint256 => EscrowConfig) public configs;
    
    // Validated escrows that are ready to be released
    mapping(uint256 => bool) public fulfilled;
    
    // Replay attack protection for zkTLS proofs
    mapping(bytes32 => bool) public usedProofs;

    error EscrowAlreadyConfigured();
    error ProofAlreadyUsed();
    error EscrowNotConfigured();

    /**
     * @dev Initialize payment requirements.
     * @param escrowId Provided by ConfidentialEscrow
     * @param data ABI-encoded (address buyer, uint256 invoiceAmount, uint256 dueDate)
     */
    function onConditionSet(uint256 escrowId, bytes calldata data) external override {
        if (configs[escrowId].buyer != address(0)) {
            revert EscrowAlreadyConfigured();
        }

        (address buyer, uint256 amount, uint256 due) = abi.decode(
            data, (address, uint256, uint256)
        );

        configs[escrowId] = EscrowConfig(buyer, amount, due);
    }

    /**
     * @dev Submits a zkTLS proof of an off-chain Fiat payment.
     * Note: In MVP, this accepts a simulated hashed payload representing a verified zkTLS proof.
     * @param escrowId Target escrow
     * @param zkTlsProof The Reclaim Protocol proof bytes
     */
    function submitPaymentProof(uint256 escrowId, bytes calldata zkTlsProof) external nonReentrant {
        if (configs[escrowId].buyer == address(0)) revert EscrowNotConfigured();

        bytes32 proofHash = keccak256(zkTlsProof);
        if (usedProofs[proofHash]) revert ProofAlreadyUsed();
        
        // TODO: Call official Reclaim/zkTLS verifier contract here
        // bool isValid = zkTLSVerifier.verifyProof(zkTlsProof);
        // require(isValid, "Invalid zkTLS proof");

        usedProofs[proofHash] = true;
        fulfilled[escrowId] = true;
    }

    /**
     * @dev Hot-path view function called aggressively by ConfidentialEscrow.
     * Needs to be highly gas efficient.
     */
    function isConditionMet(uint256 escrowId) external view override returns (bool) {
        return fulfilled[escrowId];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IConditionResolver).interfaceId || super.supportsInterface(interfaceId);
    }
}
