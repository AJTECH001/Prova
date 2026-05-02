// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TestnetCoreBase} from "../shared/TestnetCoreBase.sol";
import {FHE, euint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  InsuranceClaimsRegistry
/// @notice Encrypted append-only log of all judged insurance claims.
///
///         Each entry records the coverage ID, encrypted claim amount as a euint64 handle,
///         block timestamp, and the premium curve version active at the time of judgment.
///         Encrypted amounts are never decrypted on-chain — they are accessible only to
///         FHE-authorised parties via CoFHE.
///
///         Entries are indexed by an opaque keccak256 key derived from the coverage ID,
///         curve version, and insertion position. This prevents external observers from
///         inferring claim volume or growth rate through sequential ID enumeration.
///
///         Only owner-whitelisted policy contracts may append or query entries.
///
/// @dev    TODO: Enhance with zkTLS off-chain loss history integration (see TECH_DEBT.md)
///         Future: Build PROVA's proprietary loss data verification system combining
///         on-chain claims with verified off-chain business data for comprehensive risk assessment.
contract InsuranceClaimsRegistry is TestnetCoreBase {

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a policy contract is granted write and read access.
    /// @param  policy Address of the registered policy contract.
    event PolicyRegistered(address indexed policy);

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @dev A single claim record. The encrypted amount is an FHE handle — never plaintext.
    struct LossEntry {
        uint256 coverageId;      // coverage this claim belongs to
        euint64 encClaimAmount;  // encrypted claim amount — never decrypted on-chain
        uint256 timestamp;       // block timestamp when the claim was judged
        uint32  curveVersion;    // premium curve version active at judgment time
    }

    /// @dev Entry store keyed by opaque keccak256 hashes — never sequential integers.
    mapping(bytes32 => LossEntry) private _entries;

    /// @dev Ordered list of entry keys for cursor-based iteration in recordsForCurve.
    bytes32[] private _entryKeys;

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the loss history log and assign ownership.
    /// @param  initialOwner Address that will own this contract.
    function initialize(address initialOwner) external initializer {
        __TestnetCoreBase_init(initialOwner);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Grant a policy contract write and read access to this log.
    /// @param  policy Address of the policy contract to authorise.
    function registerPolicy(address policy) external onlyOwner {
        _allowedContracts[policy] = true;
        emit PolicyRegistered(policy);
    }

    // ─── Writer API ───────────────────────────────────────────────────────────

    /// @notice Append an encrypted claim to the loss log.
    /// @dev    No event is emitted on write to prevent transaction-matching by external observers.
    ///         The entry key is an opaque hash — position is not externally derivable.
    /// @param  coverageId      Coverage identifier associated with this claim.
    /// @param  version         Premium curve version active when the claim was judged.
    /// @param  encClaimAmount  Encrypted claim amount as a euint64 FHE handle.
    function logClaim(uint256 coverageId, uint32 version, euint64 encClaimAmount)
        external
        onlyProvaContract
    {
        FHE.allowThis(encClaimAmount);

        bytes32 key = keccak256(abi.encodePacked(coverageId, version, _entryKeys.length));
        _entries[key] = LossEntry({
            coverageId:     coverageId,
            encClaimAmount: encClaimAmount,
            timestamp:      block.timestamp,
            curveVersion:   version
        });
        _entryKeys.push(key);
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
        uint256 total = _entryKeys.length;
        if (cursor >= total) return new LossEntry[](0);

        uint256 end = cursor + limit > total ? total : cursor + limit;

        uint256 resultCount = 0;
        for (uint256 i = cursor; i < end; i++) {
            if (_entries[_entryKeys[i]].curveVersion == version) resultCount++;
        }

        LossEntry[] memory result = new LossEntry[](resultCount);
        uint256 j = 0;
        for (uint256 i = cursor; i < end; i++) {
            LossEntry storage e = _entries[_entryKeys[i]];
            if (e.curveVersion == version) {
                result[j] = e;
                j++;
            }
        }
        return result;
    }
}
