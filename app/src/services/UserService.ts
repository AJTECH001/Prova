import { httpClient } from '@/http-client/HttpClient';
import type { UserRole } from '@/stores/auth-store';

export interface UserProfile {
  id: string;
  wallet_address: string;
  wallet_provider: string;
  email?: string;
  role?: UserRole;
  created_at: string;
}

export class UserService {
  static async getCurrentUser(): Promise<UserProfile> {
    const { data } = await httpClient.get<UserProfile>('/v1/users/me');
    return data;
  }

  static async setRole(role: UserRole): Promise<{ role: UserRole }> {
    const { data } = await httpClient.post<{ role: UserRole }>('/v1/users/me/role', { role });
    return data;
  }
}
