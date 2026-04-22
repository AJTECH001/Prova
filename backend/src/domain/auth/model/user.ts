export type WalletProvider = 'zerodev' | 'walletconnect';
export type UserRole = 'SELLER' | 'BUYER' | 'LP' | 'ADMIN';

export interface UserParams {
  id: string;
  walletAddress: string;
  walletProvider: WalletProvider;
  email?: string;
  role?: UserRole;
  createdAt: Date;
}

export class User {
  readonly id: string;
  readonly walletAddress: string;
  readonly walletProvider: WalletProvider;
  readonly email?: string;
  readonly role?: UserRole;
  readonly createdAt: Date;

  constructor(params: UserParams) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.walletProvider = params.walletProvider;
    this.email = params.email;
    this.role = params.role;
    this.createdAt = params.createdAt;
  }

  withRole(role: UserRole): User {
    return new User({ ...this, role });
  }
}
