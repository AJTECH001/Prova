// src/application/dto/auth/request-nonce.dto.ts
import { z as z2 } from "zod";

// src/core/validator.ts
import { z } from "zod";
var ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
var ethAddressSchema = z.string().regex(ETH_ADDRESS_REGEX, "Invalid Ethereum address");
var txHashSchema = z.string().regex(TX_HASH_REGEX, "Invalid transaction hash");

// src/application/dto/auth/request-nonce.dto.ts
var RequestNonceDtoSchema = z2.object({
  wallet_address: ethAddressSchema
});
var RequestNonceResponseSchema = z2.object({
  nonce: z2.string()
});
export {
  RequestNonceDtoSchema,
  RequestNonceResponseSchema
};
//# sourceMappingURL=request-nonce.dto.js.map