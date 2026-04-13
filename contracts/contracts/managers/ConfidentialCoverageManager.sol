// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IUnderwriterPolicy} from "../interfaces/IUnderwriterPolicy.sol";
import {PremiumPool} from "./PremiumPool.sol";
import {FHE, euint16, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ConfidentialCoverageManager
/// @notice Manages insurance coverage for PROVA escrows.
///
/// Premium payment flow:
///
///   Sync path  (MockUnderwriterPolicy / plain bps ≤ 10000):
///     payPremium() → evaluateRisk() → detect plain bps → charge premium → emit PremiumPaid
///
///   Async path (ProvaUnderwriterPolicy / FHE ciphertext handle > 10000):
///     Tx 1: payPremium() → evaluateRisk() → detect ciphertext handle →
///           store PendingPremium → emit PremiumPending
///     [CoFHE threshold network decrypts the value off-chain]
///     Tx 2: settlePremium() → FHE.getDecryptResultSafe() → decrypted bps ready →
///           charge premium → emit PremiumPaid
///
contract ConfidentialCoverageManager is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Coverage {
        uint256 escrowId;
        address underwriter;
        address beneficiary;
        address token;
        uint256 coverageAmount;
        uint256 premiumAmount;
        bool active;
    }

    /// @notice Pending FHE-decrypt premium state stored between payPremium and settlePremium.
    struct PendingPremium {
        address token;
        address buyer;    // address that will be charged the premium on settlement
        uint256 ctHash;   // euint32 ciphertext handle returned by evaluateRisk() (stored as uint256)
        bool exists;
    }

    mapping(uint256 => Coverage) public coverages;
    mapping(uint256 => PendingPremium) public pendingPremiums;
    uint256 public nextCoverageId;

    address public premiumPool;

    event CoverageCreated(uint256 indexed coverageId, uint256 indexed escrowId, address underwriter);
    event PremiumPaid(uint256 indexed coverageId, uint256 amount);
    /// @notice Emitted when the FHE decrypt result is not yet available.
    ///         Listen for this event, wait for the CoFHE network to decrypt,
    ///         then call settlePremium(coverageId).
    event PremiumPending(uint256 indexed coverageId, uint256 ctHash);
    event ClaimFiled(uint256 indexed coverageId, uint256 claimId);

    constructor(address premiumPool_) Ownable(msg.sender) {
        premiumPool = premiumPool_;
    }

    function createCoverage(
        uint256 escrowId,
        address underwriter,
        address beneficiary,
        address token,
        uint256 coverageAmount,
        bytes calldata policyData
    ) external returns (uint256 coverageId) {
        require(coverageAmount > 0, "Invalid coverage amount");

        coverageId = nextCoverageId++;
        coverages[coverageId] = Coverage({
            escrowId: escrowId,
            underwriter: underwriter,
            beneficiary: beneficiary,
            token: token,
            coverageAmount: coverageAmount,
            premiumAmount: 0,
            active: false
        });

        // Set policy
        IUnderwriterPolicy(underwriter).onPolicySet(coverageId, policyData);

        emit CoverageCreated(coverageId, escrowId, underwriter);
    }

    /// @notice Initiate premium payment.
    /// @dev For plain-bps underwriters (mock/testing) this completes synchronously.
    ///      For FHE underwriters (ProvaUnderwriterPolicy) this stores pending state and
    ///      emits PremiumPending — call settlePremium() once CoFHE decryption completes.
    ///
    ///      For the async path the caller must pre-approve this contract for the maximum
    ///      possible premium (coverageAmount) because the exact amount is unknown until
    ///      the decrypt result arrives.
    function payPremium(uint256 coverageId, bytes calldata riskProof, address token) external nonReentrant {
        Coverage storage coverage = coverages[coverageId];
        require(!coverage.active, "Coverage already active");
        require(!pendingPremiums[coverageId].exists, "Premium settlement already pending");

        // evaluateRisk returns either:
        //   • A plain bps value (0-10000) from sync/mock policies, or
        //   • A euint32 ciphertext handle (very large uint256) from FHE policies.
        uint256 riskResult = IUnderwriterPolicy(coverage.underwriter).evaluateRisk(coverageId, riskProof);

        if (riskResult <= 10000) {
            // ── Sync path ──────────────────────────────────────────────────────
            // Plain basis-point value — charge premium immediately.
            _chargePremium(coverageId, coverage, token, msg.sender, riskResult);
        } else {
            // ── Async path ─────────────────────────────────────────────────────
            // Ciphertext handle returned by ProvaUnderwriterPolicy.
            // The policy already called FHE.decrypt() internally, submitting the
            // task to the CoFHE threshold network.  Once the network delivers the
            // decrypted value, anyone can call settlePremium(coverageId) to complete
            // the premium charge.
            pendingPremiums[coverageId] = PendingPremium({
                token: token,
                buyer: msg.sender,
                ctHash: riskResult,
                exists: true
            });
            emit PremiumPending(coverageId, riskResult);
        }
    }

    /// @notice Complete an FHE-async premium payment once CoFHE decryption is ready.
    /// @dev Anyone can call this (typically a keeper or the buyer themselves).
    ///      Reverts with "Decryption not yet complete" if the threshold network has not
    ///      yet delivered the result — simply retry after a few blocks.
    function settlePremium(uint256 coverageId) external nonReentrant {
        PendingPremium storage pending = pendingPremiums[coverageId];
        require(pending.exists, "No pending premium");

        Coverage storage coverage = coverages[coverageId];
        require(!coverage.active, "Coverage already active");

        // Convert stored uint256 handle back to bytes32 for euint16.wrap().
        // ProvaUnderwriterPolicy uses euint16 (minimum bit-width); assembly avoids
        // the Solidity type-conversion restriction between uint256 and bytes32.
        bytes32 ctHashBytes;
        uint256 rawHash = pending.ctHash;
        assembly { ctHashBytes := rawHash }

        // Query the TaskManager for the decrypted result (non-reverting).
        (uint16 decryptedBps, bool ready) = FHE.getDecryptResultSafe(euint16.wrap(ctHashBytes));
        require(ready, "Decryption not yet complete");

        address buyer = pending.buyer;
        address token = pending.token;
        delete pendingPremiums[coverageId];

        // Cap at 10000 bps (100%) — euint16 max is 65535 so overflow is possible
        uint256 bps = uint256(decryptedBps) > 10000 ? 10000 : uint256(decryptedBps);
        _chargePremium(coverageId, coverage, token, buyer, bps);
    }

    function fileClaim(uint256 coverageId, bytes calldata claimData) external returns (uint256 claimId) {
        Coverage memory coverage = coverages[coverageId];
        require(coverage.active, "Coverage not active");
        require(msg.sender == coverage.beneficiary, "Only beneficiary can file claim");

        // Judge claim
        bool verdict = IUnderwriterPolicy(coverage.underwriter).judge(coverageId, claimData);
        require(verdict, "Claim denied");

        claimId = uint256(keccak256(abi.encodePacked(coverageId, block.timestamp)));

        // Payout
        uint256 payout = coverage.coverageAmount;
        PremiumPool(premiumPool).withdrawPayout(coverage.token, payout, coverage.beneficiary);

        coverages[coverageId].active = false;
        emit ClaimFiled(coverageId, claimId);
    }

    // For testing: transfer pool ownership back to original owner
    function transferPoolOwnership(address newOwner) external onlyOwner {
        PremiumPool(premiumPool).transferOwnership(newOwner);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    /// @dev Charges `buyer` the premium derived from `bps` and activates coverage.
    function _chargePremium(
        uint256 coverageId,
        Coverage storage coverage,
        address token,
        address buyer,
        uint256 bps
    ) internal {
        uint256 premiumAmount = (coverage.coverageAmount * bps) / 10000;
        require(premiumAmount > 0, "Premium must be greater than zero");

        coverage.premiumAmount = premiumAmount;
        coverage.active = true;

        IERC20(token).safeTransferFrom(buyer, address(this), premiumAmount);
        IERC20(token).approve(premiumPool, premiumAmount);
        PremiumPool(premiumPool).depositPremium(token, premiumAmount);

        emit PremiumPaid(coverageId, premiumAmount);
    }
}
