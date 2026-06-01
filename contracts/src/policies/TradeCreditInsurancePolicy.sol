// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, Common, euint64, euint32, euint16, ebool, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {UnderwriterPolicyBase} from "../shared/extensions/UnderwriterPolicyBase.sol";
import {FHEMeta} from "../shared/lib/FHEMeta.sol";
import {IDebtorProof} from "../interfaces/IDebtorProof.sol";
import {DebtorExposureRegistry} from "../registries/DebtorExposureRegistry.sol";
import {InsuranceClaimsRegistry} from "../registries/InsuranceClaimsRegistry.sol";
import {RiskMathLib} from "../lib/RiskMathLib.sol";
import {FHERiskMath} from "../lib/FHERiskMath.sol";

/// @title  TradeCreditInsurancePolicy
/// @notice FHE-based underwriter policy for trade credit insurance.
///
///         Risk curve thresholds and premiums are stored as encrypted euint32 arrays —
///         no plaintext risk parameters exist in contract state. Country and industry
///         risk add-ons are stored as encrypted euint16 values with no plaintext getters.
///         Concentration cap enforcement is gated using FHE.select on the encrypted
///         boolean returned by DebtorExposureRegistry.
contract TradeCreditInsurancePolicy is UnderwriterPolicyBase {

    // ─── Errors ──────────────────────────────────────────────────────────────

    error PolicyNotSet(uint256 coverageId);
    error InvalidCreditLimit();
    error InvalidCoveragePercentage();
    error InvalidAddonBps();
    error InvalidCurve();
    error InvalidInvoiceAmount();
    error ConcentrationCapNotSet(bytes32 debtorId);

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    /// @notice Policy parameters recorded when coverage is purchased.
    struct Policy {
        euint64 buyerCreditLimitEnc;   // encrypted maximum payout for this coverage
        bytes32 debtorId;              // canonical debtor identifier used to fetch the credit score
        address poolId;                // pool address for currency segregation tracking
        bytes2  countryCode;           // ISO 3166-1 alpha-2 country code of the debtor
                                       // TODO: Replace with zkTLS/zkKYC verification (see TECH_DEBT.md)
        bytes4  industryCode;          // NACE / SIC industry classification code
        uint16  coveragePercentageBps; // percentage of the invoice covered (e.g. 9000 = 90%)
        uint16  curveVersion;          // premium curve version active at issuance time
        ebool   validCapEnc;           // encrypted flag — true if concentration cap was not breached
        bool    set;                   // guard against uninitialised reads
    }

    struct PolicyStorage {
        /// @dev Private — policy terms must not be world-readable.
        mapping(uint256 => Policy) policies;
        /// @dev Country risk add-on table. ISO 3166-1 alpha-2 → encrypted basis points.
        ///      No plaintext getter exists — values are only accessible via FHE authorisation.
        mapping(bytes2 => euint16) countryRisk;
        /// @dev Industry risk add-on table. NACE/SIC code → encrypted basis points.
        ///      No plaintext getter exists — values are only accessible via FHE authorisation.
        mapping(bytes4 => euint16) industryRisk;
        /// @dev Hard concentration cap per debtor used when registering new exposure.
        mapping(bytes32 => uint64) concentrationCaps;
        /// @dev Encrypted score thresholds in descending order. Default: [800, 720, 650, 580, 500, 0].
        euint32[6] encThresholds;
        /// @dev Encrypted premium rates in basis points per bucket. Default: [150, 200, 280, 400, 600, 1000].
        euint32[6] encPremiums;
        /// @notice Current premium curve version. Incremented on every setCurve call.
        uint16 curveVersion;
        /// @notice Adapter that supplies encrypted buyer credit scores.
        IDebtorProof debtorProofAdapter;
        /// @notice Registry that tracks and enforces per-debtor concentration limits.
        DebtorExposureRegistry exposureRegistry;
        /// @notice Encrypted append-only log of all judged claims.
        InsuranceClaimsRegistry lossHistory;
        /// @dev Policy indexed by escrowId for evaluateRisk(escrowId).
        ///      CCM calls evaluateRisk(escrowId) but onPolicySet receives coverageId.
        mapping(uint256 => Policy) policyByEscrow;
    }

    function _policyStorage() private pure returns (PolicyStorage storage $) {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.TradeCreditInsurancePolicy")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a coverage policy is registered.
    /// @dev    Policy terms are intentionally omitted to avoid on-chain data exposure.
    /// @param  coverageId The coverage identifier that was registered.
    event PolicySet(uint256 indexed coverageId);

    /// @notice Emitted when the premium curve is replaced by the owner.
    /// @param  newVersion The new curve version number.
    event CurveUpdated(uint16 newVersion);

    /// @notice Emitted when a country risk add-on is set by the owner.
    /// @param  countryCode ISO 3166-1 alpha-2 country code.
    /// @param  bps         Add-on value in basis points.
    event CountryRiskSet(bytes2 indexed countryCode, uint16 bps);

    /// @notice Emitted when an industry risk add-on is set by the owner.
    /// @param  industryCode NACE or SIC industry classification code.
    /// @param  bps          Add-on value in basis points.
    event IndustryRiskSet(bytes4 indexed industryCode, uint16 bps);

    /// @notice Emitted when the loss history log call fails, so monitoring can detect it.
    /// @param  coverageId Coverage whose claim could not be logged.
    event ClaimLogFailed(uint256 indexed coverageId);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the policy contract, wire external dependencies, and
    ///         encrypt the default 6-bucket premium curve into contract state.
    /// @param  initialOwner        Address that will own this contract.
    /// @param  _debtorProofAdapter Address of the IDebtorProof credit score adapter.
    /// @param  _exposureRegistry   Address of the DebtorExposureRegistry moat contract.
    /// @param  _lossHistory        Address of the InsuranceClaimsRegistry contract.
    /// @param  trustedForwarder    ERC-2771 forwarder address (address(0) to disable).
    function initialize(
        address initialOwner,
        address _debtorProofAdapter,
        address _exposureRegistry,
        address _lossHistory,
        address trustedForwarder
    ) external initializer {
        __UnderwriterPolicyBase_init(initialOwner, trustedForwarder);

        if (_debtorProofAdapter == address(0)) revert ZeroAddress();
        if (_exposureRegistry   == address(0)) revert ZeroAddress();
        if (_lossHistory        == address(0)) revert ZeroAddress();

        PolicyStorage storage $ = _policyStorage();
        $.debtorProofAdapter = IDebtorProof(_debtorProofAdapter);
        $.exposureRegistry   = DebtorExposureRegistry(_exposureRegistry);
        $.lossHistory        = InsuranceClaimsRegistry(_lossHistory);

        _encryptAndStoreCurve(RiskMathLib.defaultThresholds(), RiskMathLib.defaultPremiums());
        $.curveVersion = RiskMathLib.DEFAULT_CURVE_VERSION;
    }

    // ─── Public getters (replacing auto-generated public var getters) ─────────

    /// @notice Current premium curve version.
    function curveVersion() external view returns (uint16) {
        return _policyStorage().curveVersion;
    }

    /// @notice Adapter that supplies encrypted buyer credit scores.
    function debtorProofAdapter() external view returns (IDebtorProof) {
        return _policyStorage().debtorProofAdapter;
    }

    /// @notice Registry that tracks and enforces per-debtor concentration limits.
    function exposureRegistry() external view returns (DebtorExposureRegistry) {
        return _policyStorage().exposureRegistry;
    }

    /// @notice Encrypted append-only log of all judged claims.
    function lossHistory() external view returns (InsuranceClaimsRegistry) {
        return _policyStorage().lossHistory;
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Replace the premium curve with new thresholds and rates.
    ///         Thresholds must be strictly descending and the last element must be zero.
    ///         All values are encrypted and stored on-chain after validation.
    /// @param  thresholds Six credit score thresholds in descending order. Last must be zero.
    /// @param  premiums   Six premium rates in basis points corresponding to each bucket.
    function setCurve(
        uint32[6] calldata thresholds,
        uint32[6] calldata premiums
    ) external onlyOwner {
        for (uint256 i = 0; i < 5; i++) {
            if (thresholds[i] <= thresholds[i + 1]) revert InvalidCurve();
        }
        if (thresholds[5] != 0) revert InvalidCurve();

        _encryptAndStoreCurve(thresholds, premiums);
        PolicyStorage storage $ = _policyStorage();
        $.curveVersion = $.curveVersion + 1;
        emit CurveUpdated($.curveVersion);
    }

    /// @notice Set the risk add-on for a country. The value is encrypted and stored on-chain.
    /// @param  countryCode ISO 3166-1 alpha-2 country code.
    /// @param  bps         Add-on in basis points. Maximum is 500 (5%).
    function setCountryRisk(bytes2 countryCode, uint16 bps) external onlyOwner {
        if (bps > RiskMathLib.MAX_ADDON_BPS) revert InvalidAddonBps();
        euint16 encVal = FHE.asEuint16(bps);
        FHE.allowThis(encVal);
        _policyStorage().countryRisk[countryCode] = encVal;
        emit CountryRiskSet(countryCode, bps);
    }

    /// @notice Set the risk add-on for an industry. The value is encrypted and stored on-chain.
    /// @param  industryCode NACE or SIC industry classification code.
    /// @param  bps          Add-on in basis points. Maximum is 500 (5%).
    function setIndustryRisk(bytes4 industryCode, uint16 bps) external onlyOwner {
        if (bps > RiskMathLib.MAX_ADDON_BPS) revert InvalidAddonBps();
        euint16 encVal = FHE.asEuint16(bps);
        FHE.allowThis(encVal);
        _policyStorage().industryRisk[industryCode] = encVal;
        emit IndustryRiskSet(industryCode, bps);
    }

    /// @notice Set the maximum allowable insured exposure for a debtor across all policies.
    /// @param  debtorId Canonical debtor identifier.
    /// @param  cap      Maximum total exposure in the same units as invoice amounts. Must be > 0.
    function setConcentrationCap(bytes32 debtorId, uint64 cap) external onlyOwner {
        _policyStorage().concentrationCaps[debtorId] = cap;
    }

    /// @notice Update the IDebtorProof adapter address.
    /// @dev    Called after a UUPS upgrade to wire the OracleDebtorProof replacing MockDebtorProof.
    ///         Any address(0) argument is rejected.
    /// @param  newAdapter Address of the new IDebtorProof implementation.
    function setDebtorProofAdapter(address newAdapter) external onlyOwner {
        if (newAdapter == address(0)) revert ZeroAddress();
        _policyStorage().debtorProofAdapter = IDebtorProof(newAdapter);
    }

    // ─── IUnderwriterPolicy ──────────────────────────────────────────────────

    /// @notice Stores coverage policy parameters, registers debtor exposure, and
    ///         binds the calling coverage manager as the authorised caller for this ID.
    /// @dev    Restricted to whitelisted Prova contracts (P5).
    ///         data = abi.encode(bytes32 debtorId, address poolId, uint64 buyerCreditLimit,
    ///                           uint16 coveragePercentageBps, bytes2 countryCode,
    ///                           bytes4 industryCode, uint64 invoiceAmount, uint256 escrowId)
    ///         escrowId is appended at the end so older 7-field decoders ignore it gracefully.
    /// @param  coverageId Unique identifier assigned by the coverage manager.
    /// @param  data       ABI-encoded policy configuration parameters.
    function onPolicySet(uint256 coverageId, bytes calldata data) external override onlyProvaContract {
        _bindManager(coverageId);

        (
            bytes32 debtorId,
            address poolId,
            uint64  buyerCreditLimit,
            uint16  coveragePercentageBps,
            bytes2  countryCode,
            bytes4  industryCode,
            uint64  invoiceAmount
        ) = abi.decode(data, (bytes32, address, uint64, uint16, bytes2, bytes4, uint64));

        // Decode escrowId from byte 224 onward separately to avoid stack-too-deep.
        uint256 escrowId;
        if (data.length >= 256) {
            (escrowId) = abi.decode(data[224:], (uint256));
        }

        if (buyerCreditLimit == 0)                          revert InvalidCreditLimit();
        if (coveragePercentageBps == 0 ||
            coveragePercentageBps > 10_000)                 revert InvalidCoveragePercentage();
        if (invoiceAmount == 0)                             revert InvalidInvoiceAmount();

        // Extracted to helper to avoid stack-too-deep from coincident hardCap + invoiceAmountEnc.
        ebool isCapValid = _registerExposure(debtorId, poolId, invoiceAmount);

        euint64 creditLimitEnc = FHE.asEuint64(buyerCreditLimit);
        FHE.allowThis(creditLimitEnc);

        PolicyStorage storage $ = _policyStorage();
        Policy memory p = Policy({
            buyerCreditLimitEnc:   creditLimitEnc,
            debtorId:              debtorId,
            poolId:                poolId,
            countryCode:           countryCode,
            industryCode:          industryCode,
            coveragePercentageBps: coveragePercentageBps,
            curveVersion:          $.curveVersion,
            validCapEnc:           isCapValid,
            set:                   true
        });
        $.policies[coverageId] = p;
        if (escrowId != 0) $.policyByEscrow[escrowId] = p;

        emit PolicySet(coverageId);
    }

    /// @notice Fetches the buyer's CoFHE-sealed credit score from the oracle adapter,
    ///         evaluates it against the 6-bucket FHE premium curve, and returns an
    ///         encrypted premium in basis points.
    ///
    /// @dev    The adapter's getScore() returns a pre-verified euint32 handle and calls
    ///         FHE.allow(score, address(this)) so this contract can operate on the value.
    ///         No re-verification via FHE.asEuint32(InEuint32) is needed — the ciphertext
    ///         was validated against the CoFHE TaskManager when the oracle called setScore().
    ///
    /// @param  escrowId  The on-chain escrow identifier passed by CCM.
    ///                   CCM calls evaluateRisk(escrowId) not evaluateRisk(coverageId).
    /// @return riskScore Encrypted premium in basis points as a euint64.
    function evaluateRisk(uint256 escrowId, bytes calldata /*riskProof*/)
        external
        override
        onlyProvaContract
        returns (euint64 riskScore)
    {
        PolicyStorage storage $ = _policyStorage();
        Policy memory p = $.policyByEscrow[escrowId];
        if (!p.set) revert PolicyNotSet(escrowId);

        // getScore() grants this contract ACL permission on the returned euint32 handle
        // via FHE.allow(score, msg.sender) inside the adapter.
        // TODO: Enhance with zkTLS off-chain risk data (see TECH_DEBT.md)
        (euint32 creditScore, ) = $.debtorProofAdapter.getScore(p.debtorId);
        FHE.allowThis(creditScore);

        // Evaluate the encrypted credit score against the 6-bucket FHE premium curve.
        euint32 premium = FHERiskMath.evaluateRiskCurveOptimized(
            creditScore,
            $.encThresholds,
            $.encPremiums
        );

        // TODO: Replace manual country risk with zkTLS-verified country proof (see TECH_DEBT.md)
        euint16 countryRisk = $.countryRisk[p.countryCode];
        euint16 industryRisk = $.industryRisk[p.industryCode];

        euint32 addOns = FHERiskMath.addRiskAddons(countryRisk, industryRisk);
        euint32 finalPremium = FHERiskMath.finalizePremium(premium, addOns, p.validCapEnc);

        riskScore = FHERiskMath.convertToEuint64(finalPremium, msg.sender);
    }

    /// @notice Validates a dispute claim within FHE and appends the encrypted
    ///         claim amount to the loss history log.
    /// @dev    disputeProof = abi.encode(InEuint64 encryptedClaimAmount)
    ///         The claim is valid only when the amount is within the credit limit AND the
    ///         concentration cap was not breached at policy issuance. Exposure is released
    ///         proportionally to the validated claim amount.
    /// @param  coverageId    Unique identifier of the coverage being disputed.
    /// @param  disputeProof  ABI-encoded InEuint64 containing the encrypted claim amount.
    /// @return valid         Encrypted boolean — true if the claim is valid.
    function judge(uint256 coverageId, bytes calldata disputeProof)
        external
        override
        onlyBoundManager(coverageId)
        returns (ebool valid)
    {
        PolicyStorage storage $ = _policyStorage();
        Policy memory p = $.policies[coverageId];
        if (!p.set) revert PolicyNotSet(coverageId);

        InEuint64 memory encInput = abi.decode(disputeProof, (InEuint64));
        euint64 claimAmount = FHEMeta.asEuint64(encInput, msg.sender);
        FHE.allowThis(claimAmount);

        // Claim is valid only if within the credit limit AND the cap was not breached.
        ebool withinLimit = FHE.lte(claimAmount, p.buyerCreditLimitEnc);
        valid = FHE.and(withinLimit, p.validCapEnc);
        FHE.allowThis(valid);
        FHE.allow(valid, msg.sender);

        if (address($.lossHistory) != address(0)) {
            // Grant the loss history contract ACL permission before the cross-contract call.
            FHE.allow(claimAmount, address($.lossHistory));
            try $.lossHistory.logClaim(coverageId, uint32(p.curveVersion), claimAmount) {} catch {
                emit ClaimLogFailed(coverageId);
            }
        }

        // Release aggregate exposure proportional to the validated claim only.
        // FHE.select yields claimAmount for a valid claim, 0 for an invalid one.
        if (address($.exposureRegistry) != address(0)) {
            euint64 reductionAmount = FHE.select(valid, claimAmount, FHE.asEuint64(0));
            FHE.allowThis(reductionAmount);
            FHE.allow(reductionAmount, address($.exposureRegistry));
            $.exposureRegistry.reduceExposure(p.debtorId, reductionAmount);
        }
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Validates the debtor concentration cap and registers the invoice exposure.
    ///      Extracted from onPolicySet to keep its stack depth within EVM limits.
    function _registerExposure(
        bytes32 debtorId,
        address poolId,
        uint64 invoiceAmount
    ) private returns (ebool isCapValid) {
        PolicyStorage storage $ = _policyStorage();
        uint64 hardCap = $.concentrationCaps[debtorId];
        if (hardCap == 0) revert ConcentrationCapNotSet(debtorId);
        euint64 invoiceAmountEnc = FHE.asEuint64(invoiceAmount);
        FHE.allow(invoiceAmountEnc, address($.exposureRegistry));
        isCapValid = $.exposureRegistry.addExposure(debtorId, poolId, invoiceAmountEnc, hardCap);
        FHE.allowThis(isCapValid);
    }

    /// @dev Encrypts plaintext curve values and writes them into the encrypted storage arrays.
    /// @param  thresholds Six plaintext score thresholds to encrypt and store.
    /// @param  premiums   Six plaintext premium rates in basis points to encrypt and store.
    function _encryptAndStoreCurve(
        uint32[6] memory thresholds,
        uint32[6] memory premiums
    ) internal {
        PolicyStorage storage $ = _policyStorage();
        for (uint256 i = 0; i < 6; ++i) {
            euint32 encT = FHE.asEuint32(thresholds[i]);
            FHE.allowThis(encT);
            $.encThresholds[i] = encT;

            euint32 encP = FHE.asEuint32(premiums[i]);
            FHE.allowThis(encP);
            $.encPremiums[i] = encP;
        }
    }

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
