import type { UserRole } from '../../domain/auth/model/user.js';

export interface AuthPayload {
  userId: string;
  walletAddress: string;
  walletProvider: string;
  email?: string;
  role?: UserRole;
  exp: number;
  iat: number;
  iss: string;
  authSource: 'wallet' | 'oauth';
  clientId?: string;
}
