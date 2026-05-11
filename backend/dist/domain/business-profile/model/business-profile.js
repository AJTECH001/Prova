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
export {
  BusinessProfile
};
//# sourceMappingURL=business-profile.js.map