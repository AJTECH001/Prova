import { httpClient } from '@/http-client/HttpClient';
import type { PaginatedResponse, TransactionResponse } from './TransactionService';

export interface PlatformStats {
  totalVolume: number;
  activeEscrows: number;
  settledEscrows: number;
}

export class AdminService {
  static async listEscrows(params?: {
    limit?: number;
    continuation_token?: string;
    status?: string;
  }): Promise<PaginatedResponse<TransactionResponse>> {
    const { data } = await httpClient.get<PaginatedResponse<TransactionResponse>>('/v1/admin/escrows', { params });
    return data;
  }

  static async getStats(): Promise<PlatformStats> {
    const { data } = await httpClient.get<PlatformStats>('/v1/admin/stats');
    return data;
  }
}
