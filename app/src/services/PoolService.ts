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
  pool_address: string;
  amount: number;
  amount_smallest_unit: string;
}

export interface UnstakeResponse {
  public_id: string;
  call: PoolContractCall;
}

export interface BuyCoverageRequest {
  pool_address?: string;
  coverage_amount?: number;
  expiry?: string;
}

export interface BuyCoverageResponse {
  escrow_on_chain_id: string;
  pool_address: string;
  policy_address: string;
  coverage_amount_smallest_unit: string;
  expiry: number;
  risk_proof: string;
  contract_address: string;
  abi_function_signature: string;
}

export class PoolService {
  static async getStatus(): Promise<PoolStatus> {
    const { data } = await httpClient.get<PoolStatus>('/v1/pool');
    return data;
  }

  static async stake(amount: number): Promise<StakeResponse> {
    const { data } = await httpClient.post<StakeResponse>('/v1/pool/stake', { amount });
    return data;
  }

  static async confirmStake(publicId: string, txHash?: string, onChainStakeId?: string): Promise<void> {
    await httpClient.post(`/v1/pool/confirm-stake/${publicId}`, {
      tx_hash: txHash,
      on_chain_stake_id: onChainStakeId,
    });
  }

  static async unstake(stakePublicId: string): Promise<UnstakeResponse> {
    const { data } = await httpClient.post<UnstakeResponse>(`/v1/pool/unstake/${stakePublicId}`);
    return data;
  }

  static async confirmUnstake(stakePublicId: string): Promise<void> {
    await httpClient.post(`/v1/pool/confirm-unstake/${stakePublicId}`);
  }

  static async buyCoverage(escrowPublicId: string, req: BuyCoverageRequest = {}): Promise<BuyCoverageResponse> {
    const { data } = await httpClient.post<BuyCoverageResponse>(
      `/v1/escrows/${escrowPublicId}/coverage`,
      req,
    );
    return data;
  }
}
