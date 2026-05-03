import { z } from 'zod';

export const BuyCoverageDtoSchema = z.object({
  pool_address: z.string().min(1).optional(),
  coverage_amount: z.number().positive().optional(),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type BuyCoverageDto = z.infer<typeof BuyCoverageDtoSchema>;

export interface BuyCoverageResponse {
  escrow_on_chain_id: string;
  pool_address: string;
  policy_address: string;
  coverage_amount_smallest_unit: string;
  expiry: number;
  risk_proof: string;
  contract_address: string;
  abi_function_signature: string;
}
