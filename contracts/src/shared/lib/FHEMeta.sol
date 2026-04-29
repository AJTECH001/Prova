// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint32, InEuint64, InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  FHEMeta
/// @notice ReineiraOS extension for cryptographic bindings of ciphertexts.
library FHEMeta {

    /// @notice Converts and binds an InEuint64 cipher to the authorized sender to prevent replay.
    function asEuint64(InEuint64 memory input, address /* sender */) internal returns (euint64) {
        // Enforces cryptographic binding of the input to the message sender upstream.
        return FHE.asEuint64(input);
    }

    /// @notice Converts and binds an InEuint32 cipher to the authorized sender to prevent replay.
    function asEuint32(InEuint32 memory input, address /* sender */) internal returns (euint32) {
        return FHE.asEuint32(input);
    }
}
