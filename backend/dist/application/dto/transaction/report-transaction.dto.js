// src/application/dto/transaction/report-transaction.dto.ts
import { z as z2 } from "zod";

// src/core/validator.ts
import { z } from "zod";
var ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
var ethAddressSchema = z.string().regex(ETH_ADDRESS_REGEX, "Invalid Ethereum address");
var txHashSchema = z.string().regex(TX_HASH_REGEX, "Invalid transaction hash");

// src/application/dto/transaction/report-transaction.dto.ts
var ReportEscrowTransactionDtoSchema = z2.object({
  tx_hash: txHashSchema,
  entity_id: z2.string().min(1)
});
var ReportWithdrawalTransactionDtoSchema = z2.object({
  tx_hash: txHashSchema,
  step: z2.enum(["redeem", "bridge"])
});
var ReportTransactionResponseSchema = z2.object({
  entity_id: z2.string(),
  tx_hash: z2.string(),
  status: z2.string()
});
export {
  ReportEscrowTransactionDtoSchema,
  ReportTransactionResponseSchema,
  ReportWithdrawalTransactionDtoSchema
};
//# sourceMappingURL=report-transaction.dto.js.map