// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreBase} from "../shared/CoreBase.sol";
import {FHE, euint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  InsuranceClaimsRegistry
/// @notice Loss-history commitment anchor for the off-chain encrypted loss store (SCR §124).
///
///         Primary role: the backend keeps the encrypted loss store OFF-CHAIN (reconstructed
///         from the policy's `ClaimJudged` events) and periodically commits a Merkle root of it
///         here via `commitLossRoot`, giving cheap on-chain tamper-evidence without writing
///         per-claim encrypted data on-chain.
///
///         The former encrypted append-only log (`logClaim` / `recordsForCurve`) is DEPRECATED
///         and no longer written by the policy. It is retained — functions and storage slots —
///         only for upgrade compatibility of the already-deployed proxy, and is scheduled for
///         removal at the next breaking deploy.
contract InsuranceClaimsRegistry is CoreBase {

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a policy contract is granted write and read access.
    /// @param  policy Address of the registered policy contract.
    event PolicyRegistered(address indexed policy);

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    /// @dev A single claim record. The encrypted amount is an FHE handle — never plaintext.
    struct LossEntry {
        uint256 coverageId;      // coverage this claim belongs to
        euint64 encClaimAmount;  // encrypted claim amount — never decrypted on-chain
        uint256 timestamp;       // block timestamp when the claim was judged
        uint32  curveVersion;    // premium curve version active at judgment time
    }

    struct ClaimsStorage {
        /// @dev DEPRECATED encrypted append-only log (entries + entryKeys). The policy no longer
        ///      writes here; loss history is off-chain (SCR §124). Retained for upgrade safety —
        ///      do not reuse these two slots.
        mapping(bytes32 => LossEntry) entries;
        bytes32[] entryKeys;
        /// @dev Loss-history commitment: a Merkle root of the off-chain encrypted loss store,
        ///      committed periodically by the owner/backend for tamper-evidence.
        bytes32 latestLossRoot;
        uint64  lossEpoch;
        uint64  lastCommittedAt;
        uint64  lossEntryCount;
    }

    function _claimsStorage() private pure returns (ClaimsStorage storage $) {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.InsuranceClaimsRegistry")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the loss history log and assign ownership.
    /// @param  initialOwner     Address that will own this contract.
    /// @param  trustedForwarder ERC-2771 forwarder address (address(0) to disable).
    function initialize(address initialOwner, address trustedForwarder) external initializer {
        __CoreBase_init(initialOwner, trustedForwarder);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Grant a policy contract write and read access to this log.
    /// @param  policy Address of the policy contract to authorise.
    function registerPolicy(address policy) external onlyOwner {
        _setAllowedFlag(policy, true);
        emit PolicyRegistered(policy);
    }

    // ─── Loss-history commitment (SCR §124) ───────────────────────────────────

    /// @dev Raised when a zero Merkle root is committed.
    error InvalidRoot();
    /// @dev Raised when a commitment reports fewer entries than a prior one (the store only grows).
    error NonMonotonicCount();

    /// @notice Emitted when a new loss-history Merkle-root commitment is recorded.
    /// @param  epoch      Monotonic commitment sequence number.
    /// @param  root       Merkle root of the off-chain encrypted loss store.
    /// @param  entryCount Number of losses represented by this root.
    event LossRootCommitted(uint64 indexed epoch, bytes32 root, uint64 entryCount);

    /// @notice Anchor a Merkle root of the off-chain encrypted loss store on-chain.
    /// @dev    Owner-gated (the backend/committer). The loss store only grows, so `entryCount`
    ///         must be monotonically non-decreasing. Gives tamper-evidence without writing any
    ///         per-claim encrypted data on-chain.
    /// @param  root       Non-zero Merkle root of the current off-chain loss store.
    /// @param  entryCount Total number of losses represented by `root`.
    function commitLossRoot(bytes32 root, uint64 entryCount) external onlyOwner {
        if (root == bytes32(0)) revert InvalidRoot();
        ClaimsStorage storage $ = _claimsStorage();
        if (entryCount < $.lossEntryCount) revert NonMonotonicCount();

        uint64 epoch = $.lossEpoch + 1;
        $.lossEpoch       = epoch;
        $.latestLossRoot  = root;
        $.lastCommittedAt = uint64(block.timestamp);
        $.lossEntryCount  = entryCount;

        emit LossRootCommitted(epoch, root, entryCount);
    }

    /// @notice Returns the latest loss-history commitment.
    /// @return root        Latest committed Merkle root (bytes32(0) if none yet).
    /// @return epoch       Number of commitments made so far.
    /// @return committedAt Block timestamp of the latest commitment.
    /// @return entryCount  Losses represented by the latest root.
    function latestCommitment()
        external
        view
        returns (bytes32 root, uint64 epoch, uint64 committedAt, uint64 entryCount)
    {
        ClaimsStorage storage $ = _claimsStorage();
        return ($.latestLossRoot, $.lossEpoch, $.lastCommittedAt, $.lossEntryCount);
    }

    // ─── Writer API (DEPRECATED — see §124; retained for upgrade compatibility) ──

    /// @notice Append an encrypted claim to the loss log.
    /// @dev    DEPRECATED (SCR §124): the policy no longer calls this — loss history is off-chain.
    ///         Retained for upgrade compatibility only.
    ///         No event is emitted on write to prevent transaction-matching by external observers.
    ///         The entry key is an opaque hash — position is not externally derivable.
    /// @param  coverageId      Coverage identifier associated with this claim.
    /// @param  version         Premium curve version active when the claim was judged.
    /// @param  encClaimAmount  Encrypted claim amount as a euint64 FHE handle.
    function logClaim(uint256 coverageId, uint32 version, euint64 encClaimAmount)
        external
        onlyProvaContract
    {
        ClaimsStorage storage $ = _claimsStorage();
        FHE.allowThis(encClaimAmount);

        bytes32 key = keccak256(abi.encodePacked(coverageId, version, $.entryKeys.length));
        $.entries[key] = LossEntry({
            coverageId:     coverageId,
            encClaimAmount: encClaimAmount,
            timestamp:      block.timestamp,
            curveVersion:   version
        });
        $.entryKeys.push(key);
    }

    // ─── Read API ─────────────────────────────────────────────────────────────

    /// @notice Fetch a paginated slice of claim entries filtered by curve version.
    /// @dev    Restricted to whitelisted contracts. Cursor-based pagination avoids
    ///         exposing the total entry count to external callers.
    /// @param  version Curve version to filter by.
    /// @param  cursor  Index to start reading from in the internal key list.
    /// @param  limit   Maximum number of entries to evaluate in this call.
    /// @return         Array of matching LossEntry records for the given curve version.
    function recordsForCurve(uint32 version, uint256 cursor, uint256 limit)
        external
        view
        onlyProvaContract
        returns (LossEntry[] memory)
    {
        ClaimsStorage storage $ = _claimsStorage();
        uint256 total = $.entryKeys.length;
        if (cursor >= total) return new LossEntry[](0);

        uint256 end = cursor + limit > total ? total : cursor + limit;

        uint256 resultCount = 0;
        for (uint256 i = cursor; i < end; i++) {
            if ($.entries[$.entryKeys[i]].curveVersion == version) resultCount++;
        }

        LossEntry[] memory result = new LossEntry[](resultCount);
        uint256 j = 0;
        for (uint256 i = cursor; i < end; i++) {
            LossEntry storage e = $.entries[$.entryKeys[i]];
            if (e.curveVersion == version) {
                result[j] = e;
                j++;
            }
        }
        return result;
    }

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
