// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, Common, euint32, InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IDebtorProof} from "../interfaces/IDebtorProof.sol";

/// @title  OracleDebtorProof
/// @notice Production IDebtorProof adapter.
///
///         An authorized oracle (the PROVA backend service) submits CoFHE-encrypted credit
///         scores for registered debtors.  Each score is validated by the CoFHE TaskManager
///         via FHE.asEuint32(InEuint32) at submission time — only valid ciphertexts produced
///         by cofheClient.encryptInputs([Encryptable.uint32(score)]) will be accepted.
///
///         The resulting euint32 handle is stored with FHE.allowThis so this contract holds it.
///         At getScore() time FHE.allow(score, caller) is issued so the calling policy contract
///         can perform FHE operations on the encrypted value without decrypting it.
///
/// @dev    Score submission flow (oracle backend):
///         1. const [enc] = await cofheClient.encryptInputs([Encryptable.uint32(score)]).execute()
///         2. oracle.setScore(debtorId, { ctHash: enc.ctHash, securityZone: enc.securityZone,
///                                        utype: enc.utype, signature: enc.signature })
///         3. Contract validates via FHE.asEuint32 → CoFHE TaskManager → stored as euint32
contract OracleDebtorProof is IDebtorProof, Ownable {

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @dev CoFHE type identifier for euint32. Matches EUINT32_TFHE in cofhe-contracts/FHE.sol.
    uint8 private constant EUINT32_UTYPE = 4;

    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @dev Caller is not the owner or designated oracle address.
    error NotAuthorizedOracle();

    /// @dev debtorId has no valid score stored. Call setScore first.
    error ScoreNotSet(bytes32 debtorId);

    /// @dev ctHash is zero — not a valid CoFHE ciphertext handle.
    error InvalidCiphertextZeroHash();

    /// @dev signature (inputProof) is empty — cofheClient.encryptInputs must provide it.
    error InvalidCiphertextEmptySignature();

    /// @dev Wrong FHE type for euint32 (expected EUINT32_UTYPE = 4).
    error InvalidCiphertextType(uint8 expected, uint8 got);

    // ─── Storage ──────────────────────────────────────────────────────────────

    struct StoredScore {
        euint32 score;     // CoFHE-sealed handle — only readable via FHE operations
        uint256 timestamp; // block.timestamp when the score was last set
        bool    set;       // guard against uninitialised reads
    }

    /// @notice Address authorized to submit encrypted credit scores (PROVA oracle backend).
    address public oracle;

    /// @dev Private — scores must not be world-readable in plaintext.
    mapping(bytes32 => StoredScore) private _scores;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when an encrypted score is stored for a debtor.
    /// @param  debtorId  The debtor whose score was set or refreshed.
    /// @param  timestamp Block timestamp of the update.
    event ScoreSet(bytes32 indexed debtorId, uint256 timestamp);

    /// @notice Emitted when the oracle address is updated.
    /// @param  newOracle The new authorized oracle address.
    event OracleUpdated(address indexed newOracle);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOracle() {
        if (msg.sender != oracle && msg.sender != owner()) revert NotAuthorizedOracle();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param  initialOwner   Address that will own this contract (can rotate oracle).
    /// @param  initialOracle  Address authorized to call setScore (PROVA backend wallet).
    constructor(address initialOwner, address initialOracle) Ownable(initialOwner) {
        if (initialOracle == address(0)) revert InvalidCiphertextZeroHash(); // reuse zero check
        oracle = initialOracle;
        emit OracleUpdated(initialOracle);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Update the authorized oracle address.
    /// @param  newOracle New oracle address. Must be non-zero.
    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidCiphertextZeroHash(); // reuse zero check
        oracle = newOracle;
        emit OracleUpdated(newOracle);
    }

    // ─── Oracle operations ────────────────────────────────────────────────────

    /// @notice Store a CoFHE-encrypted credit score for a debtor.
    /// @dev    encScore MUST be produced by cofheClient.encryptInputs([Encryptable.uint32(score)]).
    ///         Pre-validates the ciphertext structure before calling FHE.asEuint32 which
    ///         validates the signature against the CoFHE TaskManager on-chain.
    /// @param  debtorId  Canonical debtor identifier.
    /// @param  encScore  CoFHE InEuint32 produced by off-chain encryption.
    function setScore(bytes32 debtorId, InEuint32 calldata encScore) external onlyOracle {
        if (encScore.ctHash == 0)
            revert InvalidCiphertextZeroHash();
        if (encScore.signature.length == 0)
            revert InvalidCiphertextEmptySignature();
        if (encScore.utype != EUINT32_UTYPE)
            revert InvalidCiphertextType(EUINT32_UTYPE, encScore.utype);

        // FHE.asEuint32 calls Impl.verifyInput → CoFHE TaskManager validates signature + ctHash.
        // Reverts if the ciphertext was not produced by the real CoFHE encryption system.
        euint32 verified = FHE.asEuint32(encScore);
        FHE.allowThis(verified);

        _scores[debtorId] = StoredScore({score: verified, timestamp: block.timestamp, set: true});
        emit ScoreSet(debtorId, block.timestamp);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Returns true if a valid CoFHE-sealed score exists for debtorId.
    /// @dev    Use this for pre-flight checks before building a UserOperation.
    function hasScore(bytes32 debtorId) external view returns (bool) {
        StoredScore storage data = _scores[debtorId];
        return data.set && Common.isInitialized(data.score);
    }

    // ─── IDebtorProof ─────────────────────────────────────────────────────────

    /// @inheritdoc IDebtorProof
    /// @dev    Grants msg.sender (the calling policy contract) ACL permission on the
    ///         encrypted score handle so it can perform FHE operations without decrypting.
    function getScore(bytes32 debtorId)
        external
        override
        returns (euint32 score, uint256 timestamp)
    {
        StoredScore storage data = _scores[debtorId];
        if (!data.set || !Common.isInitialized(data.score)) revert ScoreNotSet(debtorId);

        // Grant the calling policy contract permission to use the encrypted handle.
        // Without this FHE.allow, the policy's subsequent FHE.gte / FHE.select calls
        // on this score would be rejected by the CoFHE TaskManager ACL check.
        FHE.allow(data.score, msg.sender);
        return (data.score, data.timestamp);
    }
}
