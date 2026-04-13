// src/core/validator.ts
import { z } from "zod";
function validate(schema, data) {
  return schema.parse(data);
}
var ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
var ethAddressSchema = z.string().regex(ETH_ADDRESS_REGEX, "Invalid Ethereum address");
var txHashSchema = z.string().regex(TX_HASH_REGEX, "Invalid transaction hash");
export {
  ETH_ADDRESS_REGEX,
  TX_HASH_REGEX,
  ethAddressSchema,
  txHashSchema,
  validate
};
//# sourceMappingURL=validator.js.map