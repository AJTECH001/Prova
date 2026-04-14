import type { IBusinessProfileRepository } from '../../../domain/business-profile/repository/business-profile.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import type { BusinessProfileResponse } from '../../dto/business-profile/create-business-profile.dto.js';

export class GetBusinessProfileUseCase {
  constructor(private readonly businessProfileRepository: IBusinessProfileRepository) {}

  async execute(userId: string): Promise<BusinessProfileResponse> {
    const profile = await this.businessProfileRepository.findByUserId(userId);
    if (!profile) {
      throw ApplicationHttpError.notFound('Business profile not found');
    }

    return {
      id: profile.id,
      business_name: profile.businessName,
      business_type: profile.businessType,
      business_address: profile.businessAddress,
      tax_id: profile.taxId,
      country: profile.country,
      registration_number: profile.registrationNumber,
      kyb_status: profile.kybStatus,
    };
  }
}
