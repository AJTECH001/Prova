// src/application/dto/auth/verify-wallet.dto.ts
import { z as z2 } from "zod";

// src/core/validator.ts
import { z } from "zod";
var ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
var ethAddressSchema = z.string().regex(ETH_ADDRESS_REGEX, "Invalid Ethereum address");
var txHashSchema = z.string().regex(TX_HASH_REGEX, "Invalid transaction hash");

// src/application/dto/auth/verify-wallet.dto.ts
var VerifyWalletDtoSchema = z2.object({
  wallet_address: ethAddressSchema,
  message: z2.string().min(1),
  signature: z2.string().regex(/^0x/, "Signature must start with 0x"),
  email: z2.string().email().optional()
});
var TokenResponseSchema = z2.object({
  access_token: z2.string(),
  refresh_token: z2.string(),
  token_type: z2.literal("Bearer"),
  expires_in: z2.number()
});
export {
  TokenResponseSchema,
  VerifyWalletDtoSchema
};
//# sourceMappingURL=verify-wallet.dto.js.map