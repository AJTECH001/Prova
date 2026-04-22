import { httpClient } from '@/http-client/HttpClient';

export interface PoolStatus {
  pool_address: string;
  policy_address: string;
  total_staked: string;
  premiums_earned: string;
  active_stakers: number;
  chain_id: number;
}

export interface PoolContractCall {
  contract_address: string;
  abi_function_signature: string;
  abi_parameters: Record<string, unknown>;
}

export interface StakeResponse {
  public_id: string;
  call: PoolContractCall;
  amount: number;
  pool_address: string;
}

export interface UnstakeResponse {
  public_id: string;
  call: PoolContractCall;
}

export class PoolService {
  static async getStatus(): Promise<PoolStatus> {
    const { data } = await httpClient.get<{ data: PoolStatus }>('/v1/pool');
    return data.data;
  }

  static async stake(amount: number): Promise<StakeResponse> {
    const { data } = await httpClient.post<{ data: StakeResponse }>('/v1/pool/stake', { amount });
    return data.data;
  }

  static async unstake(stakePublicId: string): Promise<UnstakeResponse> {
    const { data } = await httpClient.post<{ data: UnstakeResponse }>(`/v1/pool/unstake/${stakePublicId}`);
    return data.data;
  }
}
