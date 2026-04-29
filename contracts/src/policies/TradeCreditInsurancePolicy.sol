// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, Common, euint64, euint32, euint16, ebool, InEuint32, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
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
    error ZeroAddress();
    error InvalidCurve();

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @notice Policy parameters recorded when coverage is purchased.
    struct Policy {
        euint64 buyerCreditLimitEnc;   // encrypted maximum payout for this coverage
        bytes32 debtorId;              // canonical debtor identifier used to fetch the credit score
        address poolId;                // pool address for currency segregation tracking
        bytes2  countryCode;           // ISO 3166-1 alpha-2 country code of the debtor
                                       // TODO: Replace with zkTLS/zkKYC verification (see TECH_DEBT.md)
        bytes4  industryCode;          // NACE / SIC industry classification code
        uint16  coveragePercentageBps; // percentage of the invoice covered (e.g. 9000 = 90%)
        uint8   curveVersion;          // premium curve version active at issuance time
        ebool   validCapEnc;           // encrypted flag — true if concentration cap was not breached
        bool    set;                   // guard against uninitialised reads
    }

    /// @dev Private — policy terms must not be world-readable.
    mapping(uint256 => Policy) private _policies;

    // ─── Risk add-on tables ───────────────────────────────────────────────────

    /// @dev Country risk add-on table. ISO 3166-1 alpha-2 → encrypted basis points.
    ///      No plaintext getter exists — values are only accessible via FHE authorisation.
    mapping(bytes2 => euint16) private _countryRisk;

    /// @dev Industry risk add-on table. NACE/SIC code → encrypted basis points.
    ///      No plaintext getter exists — values are only accessible via FHE authorisation.
    mapping(bytes4 => euint16) private _industryRisk;

    /// @dev Hard concentration cap per debtor used when registering new exposure.
    mapping(bytes32 => uint64) private _concentrationCaps;

    // ─── FHE premium curve ────────────────────────────────────────────────────

    /// @dev Encrypted score thresholds in descending order. Default: [800, 720, 650, 580, 500, 0].
    euint32[6] private _encThresholds;

    /// @dev Encrypted premium rates in basis points per bucket. Default: [150, 200, 280, 400, 600, 1000].
    euint32[6] private _encPremiums;

    /// @notice Current premium curve version. Incremented on every setCurve call.
    uint8 public curveVersion;

    // ─── External integrations ────────────────────────────────────────────────

    /// @notice Adapter that supplies encrypted buyer credit scores.
    IDebtorProof public debtorProofAdapter;

    /// @notice Registry that tracks and enforces per-debtor concentration limits.
    DebtorExposureRegistry public exposureRegistry;

    /// @notice Encrypted append-only log of all judged claims.
    InsuranceClaimsRegistry public lossHistory;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a coverage policy is registered.
    /// @dev    Policy terms are intentionally omitted to avoid on-chain data exposure.
    /// @param  coverageId The coverage identifier that was registered.
    event PolicySet(uint256 indexed coverageId);

    /// @notice Emitted when the premium curve is replaced by the owner.
    /// @param  newVersion The new curve version number.
    event CurveUpdated(uint8 newVersion);

    /// @notice Emitted when a country risk add-on is set by the owner.
    /// @param  countryCode ISO 3166-1 alpha-2 country code.
    /// @param  bps         Add-on value in basis points.
    event CountryRiskSet(bytes2 indexed countryCode, uint16 bps);

    /// @notice Emitted when an industry risk add-on is set by the owner.
    /// @param  industryCode NACE or SIC industry classification code.
    /// @param  bps          Add-on value in basis points.
    event IndustryRiskSet(bytes4 indexed industryCode, uint16 bps);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Initialize the policy contract, wire external dependencies, and
    ///         encrypt the default 6-bucket premium curve into contract state.
    /// @param  initialOwner        Address that will own this contract.
    /// @param  _debtorProofAdapter Address of the IDebtorProof credit score adapter.
    /// @param  _exposureRegistry   Address of the DebtorExposureRegistry moat contract.
    /// @param  _lossHistory        Address of the InsuranceClaimsRegistry contract.
    function initialize(
        address initialOwner,
        address _debtorProofAdapter,
        address _exposureRegistry,
        address _lossHistory
    ) external initializer {
        __UnderwriterPolicyBase_init(initialOwner);

        if (_debtorProofAdapter == address(0)) revert ZeroAddress();
        if (_exposureRegistry   == address(0)) revert ZeroAddress();
        if (_lossHistory        == address(0)) revert ZeroAddress();

        debtorProofAdapter = IDebtorProof(_debtorProofAdapter);
        exposureRegistry   = DebtorExposureRegistry(_exposureRegistry);
        lossHistory        = InsuranceClaimsRegistry(_lossHistory);

        _encryptAndStoreCurve(RiskMathLib.defaultThresholds(), RiskMathLib.defaultPremiums());
        curveVersion = RiskMathLib.DEFAULT_CURVE_VERSION;
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
        curveVersion = curveVersion + 1;
        emit CurveUpdated(curveVersion);
    }

    /// @notice Set the risk add-on for a country. The value is encrypted and stored on-chain.
    /// @param  countryCode ISO 3166-1 alpha-2 country code.
    /// @param  bps         Add-on in basis points. Maximum is 500 (5%).
    function setCountryRisk(bytes2 countryCode, uint16 bps) external onlyOwner {
        if (bps > RiskMathLib.MAX_ADDON_BPS) revert InvalidAddonBps();
        euint16 encVal = FHE.asEuint16(bps);
        FHE.allowThis(encVal);
        _countryRisk[countryCode] = encVal;
        emit CountryRiskSet(countryCode, bps);
    }

    /// @notice Set the risk add-on for an industry. The value is encrypted and stored on-chain.
    /// @param  industryCode NACE or SIC industry classification code.
    /// @param  bps          Add-on in basis points. Maximum is 500 (5%).
    function setIndustryRisk(bytes4 industryCode, uint16 bps) external onlyOwner {
        if (bps > RiskMathLib.MAX_ADDON_BPS) revert InvalidAddonBps();
        euint16 encVal = FHE.asEuint16(bps);
        FHE.allowThis(encVal);
        _industryRisk[industryCode] = encVal;
        emit IndustryRiskSet(industryCode, bps);
    }

    /// @notice Set the maximum allowable insured exposure for a debtor across all policies.
    /// @param  debtorId Canonical debtor identifier.
    /// @param  cap      Maximum total exposure in the same units as invoice amounts.
    function setConcentrationCap(bytes32 debtorId, uint64 cap) external onlyOwner {
        _concentrationCaps[debtorId] = cap;
    }

    // ─── IUnderwriterPolicy ──────────────────────────────────────────────────

    /// @notice Stores coverage policy parameters, registers debtor exposure, and
    ///         binds the calling coverage manager as the authorised caller for this ID.
    /// @dev    data = abi.encode(bytes32 debtorId, address poolId, uint64 buyerCreditLimit,
    ///                           uint16 coveragePercentageBps, bytes2 countryCode,
    ///                           bytes4 industryCode, uint64 invoiceAmount)
    /// @param  coverageId Unique identifier assigned by the coverage manager.
    /// @param  data       ABI-encoded policy configuration parameters.
    function onPolicySet(uint256 coverageId, bytes calldata data) external override {
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

        if (buyerCreditLimit == 0)                          revert InvalidCreditLimit();
        if (coveragePercentageBps == 0 ||
            coveragePercentageBps > 10_000)                 revert InvalidCoveragePercentage();

        euint64 creditLimitEnc = FHE.asEuint64(buyerCreditLimit);
        FHE.allowThis(creditLimitEnc);

        ebool isCapValid;
        if (invoiceAmount > 0 && address(exposureRegistry) != address(0)) {
            uint64 hardCap = _concentrationCaps[debtorId];
            euint64 invoiceAmountEnc = FHE.asEuint64(invoiceAmount);
            // Grant the registry ACL permission before the cross-contract call.
            FHE.allow(invoiceAmountEnc, address(exposureRegistry));
            isCapValid = exposureRegistry.addExposure(debtorId, poolId, invoiceAmountEnc, hardCap);
        } else {
            isCapValid = FHE.asEbool(true);
        }
        FHE.allowThis(isCapValid);

        _policies[coverageId] = Policy({
            buyerCreditLimitEnc:   creditLimitEnc,
            debtorId:              debtorId,
            poolId:                poolId,
            countryCode:           countryCode,
            industryCode:          industryCode,
            coveragePercentageBps: coveragePercentageBps,
            curveVersion:          curveVersion,
            validCapEnc:           isCapValid,
            set:                   true
        });

        emit PolicySet(coverageId);
    }

    /// @notice Fetches the buyer's encrypted credit score, evaluates it against the
    ///         6-bucket FHE premium curve, and returns an encrypted premium in basis points.
    /// @param  coverageId Unique identifier of the coverage being priced.
    /// @return riskScore  Encrypted premium in basis points as a euint64.
    function evaluateRisk(uint256 coverageId, bytes calldata /*riskProof*/)
        external
        override
        onlyBoundManager(coverageId)
        returns (euint64 riskScore)
    {
        Policy memory p = _policies[coverageId];
        if (!p.set) revert PolicyNotSet(coverageId);

        // TODO: Enhance with zkTLS off-chain risk data (see TECH_DEBT.md)
        // Current: Only on-chain credit score
        // Future: Combine with bank history, payment patterns, PROVA's verified loss data system
        (InEuint32 memory encInput, ) = debtorProofAdapter.getScore(p.debtorId);
        euint32 creditScore = FHEMeta.asEuint32(encInput, msg.sender);
        FHE.allowThis(creditScore);

        // Use shared library for risk curve evaluation
        euint32 premium = FHERiskMath.evaluateRiskCurveOptimized(
            creditScore,
            _encThresholds,
            _encPremiums
        );

        // TODO: Replace manual country risk with zkTLS-verified country proof (see TECH_DEBT.md)
        euint16 countryRisk = _countryRisk[p.countryCode];
        euint16 industryRisk = _industryRisk[p.industryCode];

        // Use shared library for add-on calculation
        euint32 addOns = FHERiskMath.addRiskAddons(countryRisk, industryRisk);

        // Use shared library for premium finalization
        euint32 finalPremium = FHERiskMath.finalizePremium(premium, addOns, p.validCapEnc);

        // Convert to euint64 with proper ACL permissions
        riskScore = FHERiskMath.convertToEuint64(finalPremium, msg.sender);
    }

    /// @notice Validates a dispute claim within FHE and appends the encrypted
    ///         claim amount to the loss history log.
    /// @dev    disputeProof = abi.encode(InEuint64 encryptedClaimAmount)
    /// @param  coverageId    Unique identifier of the coverage being disputed.
    /// @param  disputeProof  ABI-encoded InEuint64 containing the encrypted claim amount.
    /// @return valid         Encrypted boolean — true if the claim is within the credit limit.
    function judge(uint256 coverageId, bytes calldata disputeProof)
        external
        override
        onlyBoundManager(coverageId)
        returns (ebool valid)
    {
        Policy memory p = _policies[coverageId];
        if (!p.set) revert PolicyNotSet(coverageId);

        InEuint64 memory encInput = abi.decode(disputeProof, (InEuint64));
        euint64 claimAmount = FHEMeta.asEuint64(encInput, msg.sender);
        FHE.allowThis(claimAmount);

        valid = FHE.lte(claimAmount, p.buyerCreditLimitEnc);
        FHE.allowThis(valid);
        FHE.allow(valid, msg.sender);

        if (address(lossHistory) != address(0)) {
            // Grant the loss history contract ACL permission before the cross-contract call.
            FHE.allow(claimAmount, address(lossHistory));
            try lossHistory.logClaim(coverageId, uint32(p.curveVersion), claimAmount) {} catch {}
        }
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev    Encrypts plaintext curve values and writes them into the encrypted storage arrays.
    /// @param  thresholds Six plaintext score thresholds to encrypt and store.
    /// @param  premiums   Six plaintext premium rates in basis points to encrypt and store.
    function _encryptAndStoreCurve(
        uint32[6] memory thresholds,
        uint32[6] memory premiums
    ) internal {
        for (uint256 i = 0; i < 6; ++i) {
            euint32 encT = FHE.asEuint32(thresholds[i]);
            FHE.allowThis(encT);
            _encThresholds[i] = encT;

            euint32 encP = FHE.asEuint32(premiums[i]);
            FHE.allowThis(encP);
            _encPremiums[i] = encP;
        }
    }
}
