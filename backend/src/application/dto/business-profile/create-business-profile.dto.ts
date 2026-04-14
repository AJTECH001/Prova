import { z } from 'zod';

export const CreateBusinessProfileDtoSchema = z.object({
  business_name: z.string().min(1).max(200),
  business_type: z.enum(['RETAIL', 'SERVICE']),
  business_address: z.string().max(500).optional(),
  tax_id: z.string().max(50).optional(),
  country: z.string().min(2).max(100).optional(),
  registration_number: z.string().min(1).max(100).optional(),
});
export type CreateBusinessProfileDto = z.infer<typeof CreateBusinessProfileDtoSchema>;

export const BusinessProfileResponseSchema = z.object({
  id: z.string(),
  business_name: z.string(),
  business_type: z.string(),
  business_address: z.string().optional(),
  tax_id: z.string().optional(),
  country: z.string().optional(),
  registration_number: z.string().optional(),
  kyb_status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});
export type BusinessProfileResponse = z.infer<typeof BusinessProfileResponseSchema>;
