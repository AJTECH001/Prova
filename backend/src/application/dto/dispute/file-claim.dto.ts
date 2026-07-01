import { z } from 'zod';

export const FileClaimDtoSchema = z.object({
  /** Public ID of the covered escrow the claim is filed against. */
  escrow_public_id: z.string().min(1),
  /**
   * Optional ABI-encoded InEuint64 dispute proof (encrypted claim amount) that the
   * coverage manager will pass to TradeCreditInsurancePolicy.judge. Stored for the
   * settlement step; not decoded here.
   */
  dispute_proof: z.string().optional(),
});

export type FileClaimDto = z.infer<typeof FileClaimDtoSchema>;

export const ResolveClaimDtoSchema = z.object({
  accepted: z.boolean(),
  tx_hash: z.string().optional(),
  reason: z.string().optional(),
});

export type ResolveClaimDto = z.infer<typeof ResolveClaimDtoSchema>;
