// src/application/dto/balance/balance-response.dto.ts
import { z } from "zod";
var BalanceResponseSchema = z.object({
  wallet_address: z.string(),
  balance: z.string(),
  formatted_balance: z.string(),
  currency: z.string(),
  chain_id: z.number()
});
export {
  BalanceResponseSchema
};
//# sourceMappingURL=balance-response.dto.js.map