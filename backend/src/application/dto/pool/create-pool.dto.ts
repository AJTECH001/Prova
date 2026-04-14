import { z } from 'zod';

// createPool(address paymentToken) — no policy or liquidity at creation time.
// Use AddPolicyDto to register a policy and StakeDto to add liquidity after pool is created.
export const CreatePoolDtoSchema = z.object({});
export type CreatePoolDto = z.infer<typeof CreatePoolDtoSchema>;

export const AddPolicyDtoSchema = z.object({
  policy_address: z.string().min(1),
});
export type AddPolicyDto = z.infer<typeof AddPolicyDtoSchema>;
