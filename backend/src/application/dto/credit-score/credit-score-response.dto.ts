import { z } from 'zod';

export const CreditScoreResponseSchema = z.object({
  buyer_address: z.string(),
  raw_score: z.number().int().min(0).max(1000),
  risk_proof: z.string(),
  expires_at: z.number().int(),
});

export type CreditScoreResponse = z.infer<typeof CreditScoreResponseSchema>;
