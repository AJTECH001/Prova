import { z } from 'zod';

export const StakeDtoSchema = z.object({
  amount: z.number().positive(),
  pool_address: z.string().min(1).optional(),
});
export type StakeDto = z.infer<typeof StakeDtoSchema>;
