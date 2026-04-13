// src/application/dto/business-profile/create-business-profile.dto.ts
import { z } from "zod";
var CreateBusinessProfileDtoSchema = z.object({
  business_name: z.string().min(1).max(200),
  business_type: z.enum(["RETAIL", "SERVICE"]),
  business_address: z.string().max(500).optional(),
  tax_id: z.string().max(50).optional()
});
var BusinessProfileResponseSchema = z.object({
  id: z.string(),
  business_name: z.string(),
  business_type: z.string(),
  business_address: z.string().optional(),
  tax_id: z.string().optional()
});
export {
  BusinessProfileResponseSchema,
  CreateBusinessProfileDtoSchema
};
//# sourceMappingURL=create-business-profile.dto.js.map