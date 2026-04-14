export type BusinessType = 'RETAIL' | 'SERVICE';
export type KybStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BusinessProfileParams {
  id: string;
  userId: string;
  businessName: string;
  businessType: BusinessType;
  businessAddress?: string;
  taxId?: string;
  country?: string;
  registrationNumber?: string;
  kybStatus?: KybStatus;
}

export class BusinessProfile {
  readonly id: string;
  readonly userId: string;
  readonly businessName: string;
  readonly businessType: BusinessType;
  readonly businessAddress?: string;
  readonly taxId?: string;
  readonly country?: string;
  readonly registrationNumber?: string;
  kybStatus: KybStatus;

  constructor(params: BusinessProfileParams) {
    this.id = params.id;
    this.userId = params.userId;
    this.businessName = params.businessName;
    this.businessType = params.businessType;
    this.businessAddress = params.businessAddress;
    this.taxId = params.taxId;
    this.country = params.country;
    this.registrationNumber = params.registrationNumber;
    this.kybStatus = params.kybStatus ?? 'PENDING';
  }
}
