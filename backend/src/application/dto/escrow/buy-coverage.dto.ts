import { z } from 'zod';

export const BuyCoverageDtoSchema = z.object({
  pool_address: z.string().min(1).optional(),
  coverage_amount: z.number().positive().optional(),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Hex-encoded bytes2 country code (e.g. "0x4742" for "GB"). Defaults to 0x0000 (not set).
  country_code: z.string().regex(/^0x[0-9a-fA-F]{4}$/).optional(),
  // Hex-encoded bytes4 industry code (e.g. "0x41424344" for "ABCD"). Defaults to 0x00000000 (not set).
  industry_code: z.string().regex(/^0x[0-9a-fA-F]{8}$/).optional(),
});
export type BuyCoverageDto = z.infer<typeof BuyCoverageDtoSchema>;

export interface BuyCoverageResponse {
  escrow_on_chain_id: string;
  pool_address: string;
  policy_address: string;
  coverage_amount_smallest_unit: string;
  expiry: number;
  risk_proof: string;
  policy_data: string;
  contract_address: string;
  abi_function_signature: string;
}
