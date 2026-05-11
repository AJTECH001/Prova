// src/application/use-case/business-profile/create-business-profile.use-case.ts
import { randomUUID } from "crypto";

// src/domain/business-profile/model/business-profile.ts
var BusinessProfile = class {
  id;
  userId;
  businessName;
  businessType;
  businessAddress;
  taxId;
  country;
  registrationNumber;
  kybStatus;
  constructor(params) {
    this.id = params.id;
    this.userId = params.userId;
    this.businessName = params.businessName;
    this.businessType = params.businessType;
    this.businessAddress = params.businessAddress;
    this.taxId = params.taxId;
    this.country = params.country;
    this.registrationNumber = params.registrationNumber;
    this.kybStatus = params.kybStatus ?? "PENDING";
  }
};

// src/application/use-case/business-profile/create-business-profile.use-case.ts
var CreateBusinessProfileUseCase = class {
  constructor(businessProfileRepository) {
    this.businessProfileRepository = businessProfileRepository;
  }
  businessProfileRepository;
  async execute(dto, userId) {
    const profile = new BusinessProfile({
      id: randomUUID(),
      userId,
      businessName: dto.business_name,
      businessType: dto.business_type,
      businessAddress: dto.business_address,
      taxId: dto.tax_id,
      country: dto.country,
      registrationNumber: dto.registration_number
    });
    await this.businessProfileRepository.save(profile);
    return {
      id: profile.id,
      business_name: profile.businessName,
      business_type: profile.businessType,
      business_address: profile.businessAddress,
      tax_id: profile.taxId,
      country: profile.country,
      registration_number: profile.registrationNumber,
      kyb_status: profile.kybStatus
    };
  }
};
export {
  CreateBusinessProfileUseCase
};
//# sourceMappingURL=create-business-profile.use-case.js.map