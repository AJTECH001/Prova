export interface ContractCall {
  contract_address: string;
  abi_function_signature: string;
  abi_parameters: Record<string, unknown>;
}

export interface CreatePoolResponse {
  call: ContractCall;
}

export interface AddPolicyResponse {
  call: ContractCall;
}

export interface StakeResponse {
  public_id: string;
  pool_address: string;
  amount: number;
  amount_smallest_unit: string;
}

export interface UnstakeResponse {
  public_id: string;
  call: ContractCall;
}

export interface PoolStatusResponse {
  pool_address: string;
  policy_address: string;
  total_staked: string;
  premiums_earned: string;
  active_stakers: number;
  chain_id: number;
}
