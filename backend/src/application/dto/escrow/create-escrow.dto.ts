import { z } from 'zod';

const InsuranceSchema = z.object({
  pool_address: z.string().min(1).optional(),
  policy_address: z.string().min(1).optional(),
  coverage_amount: z.number().positive().optional(),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const CreateEscrowDtoSchema = z.object({
  type: z.string().min(1),
  counterparty: z.string().min(1).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  external_reference: z.string().min(1).optional(),
  amount: z.number().positive(),
  currency: z.object({
    type: z.enum(['fiat', 'crypto']),
    code: z.string().min(1),
  }),
  metadata: z.record(z.unknown()).optional(),
  resolver_address: z.string().min(1).optional(),
  insurance: InsuranceSchema.optional(),
});
export type CreateEscrowDto = z.infer<typeof CreateEscrowDtoSchema>;
