// src/application/dto/withdrawal/create-withdrawal.dto.ts
import { z as z2 } from "zod";

// src/core/validator.ts
import { z } from "zod";
var ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
var ethAddressSchema = z.string().regex(ETH_ADDRESS_REGEX, "Invalid Ethereum address");
var txHashSchema = z.string().regex(TX_HASH_REGEX, "Invalid transaction hash");

// src/application/dto/withdrawal/create-withdrawal.dto.ts
var CreateWithdrawalDtoSchema = z2.object({
  escrow_ids: z2.array(z2.number()).min(1).max(100),
  destination_chain: z2.enum(["BASE", "ETH", "POLYGON"]),
  recipient_address: ethAddressSchema
});
export {
  CreateWithdrawalDtoSchema
};
//# sourceMappingURL=create-withdrawal.dto.js.map