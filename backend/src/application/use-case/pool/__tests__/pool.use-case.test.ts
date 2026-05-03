import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { CreatePoolUseCase } from '../create-pool.use-case.js';
import { StakeUseCase } from '../stake.use-case.js';
import { UnstakeUseCase } from '../unstake.use-case.js';
import { GetPoolStatusUseCase } from '../get-pool-status.use-case.js';
import { AddPolicyUseCase } from '../add-policy.use-case.js';
import { MemoryPoolStakeRepository } from '../../../../infrastructure/repository/memory/memory-pool-stake.repository.js';
import { PoolStake } from '../../../../domain/pool/model/pool-stake.js';
import { PoolStakeStatus } from '../../../../domain/pool/model/pool-stake-status.enum.js';

const USER_ID = randomUUID();
const POOL_ADDRESS = '0xpool123';
const POLICY_ADDRESS = '0xpolicy456';
const POOL_FACTORY_ADDRESS = '0xfactory789';
const USDC_ADDRESS = '0xusdc000';

function setEnv(overrides: Record<string, string> = {}) {
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
  process.env.POOL_ADDRESS = POOL_ADDRESS;
  process.env.POLICY_ADDRESS = POLICY_ADDRESS;
  process.env.POOL_FACTORY_ADDRESS = POOL_FACTORY_ADDRESS;
  process.env.USDC_ADDRESS = USDC_ADDRESS;
  Object.assign(process.env, overrides);
}

describe('CreatePoolUseCase', () => {
  let useCase: CreatePoolUseCase;

  beforeEach(() => {
    setEnv();
    useCase = new CreatePoolUseCase();
  });

  it('returns a contract call targeting the pool factory', async () => {
    const result = await useCase.execute({ policy_address: POLICY_ADDRESS });

    expect(result.call.contract_address).toBe(POOL_FACTORY_ADDRESS);
    expect(result.call.abi_function_signature).toBe('createPool(address,address,uint256)');
  });

  it('includes policy_address and asset_address in abi_parameters', async () => {
    const result = await useCase.execute({ policy_address: POLICY_ADDRESS });

    expect(result.call.abi_parameters.policy_address).toBe(POLICY_ADDRESS);
    expect(result.call.abi_parameters.asset_address).toBe(USDC_ADDRESS);
  });

  it('defaults initial_liquidity to 0 when not provided', async () => {
    const result = await useCase.execute({ policy_address: POLICY_ADDRESS });

    expect(result.call.abi_parameters.initial_liquidity).toBe(0);
  });

  it('passes initial_liquidity when provided', async () => {
    const result = await useCase.execute({ policy_address: POLICY_ADDRESS, initial_liquidity: 500 });

    expect(result.call.abi_parameters.initial_liquidity).toBe(500);
  });
});

describe('StakeUseCase', () => {
  let useCase: StakeUseCase;
  let repo: MemoryPoolStakeRepository;

  beforeEach(() => {
    setEnv();
    repo = new MemoryPoolStakeRepository();
    useCase = new StakeUseCase(repo);
  });

  it('returns pool_address in response', async () => {
    const result = await useCase.execute({ amount: 100 }, USER_ID);

    expect(result.pool_address).toBe(POOL_ADDRESS);
  });

  it('converts amount to USDC smallest unit (6 decimals)', async () => {
    const result = await useCase.execute({ amount: 100 }, USER_ID);

    expect(result.amount_smallest_unit).toBe('100000000');
  });

  it('converts fractional USDC amount correctly', async () => {
    const result = await useCase.execute({ amount: 1.5 }, USER_ID);

    expect(result.amount_smallest_unit).toBe('1500000');
  });

  it('saves stake to repository with PENDING status', async () => {
    const result = await useCase.execute({ amount: 50 }, USER_ID);

    const saved = await repo.findByPublicId(result.public_id);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(PoolStakeStatus.PENDING);
  });

  it('saves stake with correct userId and amount', async () => {
    const result = await useCase.execute({ amount: 75 }, USER_ID);

    const saved = await repo.findByPublicId(result.public_id);
    expect(saved!.userId).toBe(USER_ID);
    expect(saved!.amount).toBe(75);
  });

  it('uses pool_address override when provided', async () => {
    const customPool = '0xcustompool';
    const result = await useCase.execute({ amount: 100, pool_address: customPool }, USER_ID);

    expect(result.pool_address).toBe(customPool);
  });

  it('returns public_id and amount in response', async () => {
    const result = await useCase.execute({ amount: 200 }, USER_ID);

    expect(result.public_id).toBeTruthy();
    expect(result.amount).toBe(200);
    expect(result.pool_address).toBe(POOL_ADDRESS);
  });
});

describe('UnstakeUseCase', () => {
  let useCase: UnstakeUseCase;
  let repo: MemoryPoolStakeRepository;

  function makeActiveStake(): PoolStake {
    return new PoolStake({
      id: randomUUID(),
      publicId: randomUUID(),
      userId: USER_ID,
      poolAddress: POOL_ADDRESS,
      amount: 100,
      status: PoolStakeStatus.ACTIVE,
      createdAt: new Date(),
    });
  }

  beforeEach(() => {
    setEnv();
    repo = new MemoryPoolStakeRepository();
    useCase = new UnstakeUseCase(repo);
  });

  it('returns a contract call with correct abi signature', async () => {
    const stake = makeActiveStake();
    await repo.save(stake);

    const result = await useCase.execute(stake.publicId, USER_ID);

    expect(result.call.abi_function_signature).toBe('unstake(bytes32)');
    expect(result.call.contract_address).toBe(POOL_ADDRESS);
  });

  it('returns the stake public_id in the response', async () => {
    const stake = makeActiveStake();
    await repo.save(stake);

    const result = await useCase.execute(stake.publicId, USER_ID);

    expect(result.public_id).toBe(stake.publicId);
  });

  it('transitions stake to UNSTAKING status', async () => {
    const stake = makeActiveStake();
    await repo.save(stake);

    await useCase.execute(stake.publicId, USER_ID);

    const updated = await repo.findByPublicId(stake.publicId);
    expect(updated!.status).toBe(PoolStakeStatus.UNSTAKING);
  });

  it('throws 404 when stake not found', async () => {
    await expect(useCase.execute('nonexistent', USER_ID)).rejects.toThrow('Stake not found');
  });

  it('throws 403 when stake belongs to a different user', async () => {
    const stake = makeActiveStake();
    await repo.save(stake);

    await expect(useCase.execute(stake.publicId, 'other-user-id')).rejects.toThrow('Unauthorized');
  });

  it('throws 422 when stake is not ACTIVE', async () => {
    const stake = new PoolStake({
      id: randomUUID(),
      publicId: randomUUID(),
      userId: USER_ID,
      poolAddress: POOL_ADDRESS,
      amount: 100,
      status: PoolStakeStatus.PENDING,
      createdAt: new Date(),
    });
    await repo.save(stake);

    await expect(useCase.execute(stake.publicId, USER_ID)).rejects.toThrow('Stake is not active');
  });
});

describe('GetPoolStatusUseCase', () => {
  let useCase: GetPoolStatusUseCase;
  let repo: MemoryPoolStakeRepository;

  beforeEach(() => {
    setEnv();
    repo = new MemoryPoolStakeRepository();
    useCase = new GetPoolStatusUseCase(repo);
  });

  it('returns pool and policy addresses from env', async () => {
    const result = await useCase.execute();

    expect(result.pool_address).toBe(POOL_ADDRESS);
    expect(result.policy_address).toBe(POLICY_ADDRESS);
  });

  it('returns zero stats when no stakes exist', async () => {
    const result = await useCase.execute();

    expect(result.total_staked).toBe('0.00');
    expect(result.active_stakers).toBe(0);
  });

  it('counts only ACTIVE stakes in total_staked and active_stakers', async () => {
    const active = new PoolStake({
      id: randomUUID(),
      publicId: randomUUID(),
      userId: USER_ID,
      poolAddress: POOL_ADDRESS,
      amount: 200,
      status: PoolStakeStatus.ACTIVE,
      createdAt: new Date(),
    });
    const pending = new PoolStake({
      id: randomUUID(),
      publicId: randomUUID(),
      userId: randomUUID(),
      poolAddress: POOL_ADDRESS,
      amount: 500,
      status: PoolStakeStatus.PENDING,
      createdAt: new Date(),
    });

    await repo.save(active);
    await repo.save(pending);

    const result = await useCase.execute();

    expect(result.total_staked).toBe('200.00');
    expect(result.active_stakers).toBe(1);
  });

  it('sums amounts across multiple active stakes', async () => {
    for (const amount of [100, 250, 50]) {
      await repo.save(
        new PoolStake({
          id: randomUUID(),
          publicId: randomUUID(),
          userId: randomUUID(),
          poolAddress: POOL_ADDRESS,
          amount,
          status: PoolStakeStatus.ACTIVE,
          createdAt: new Date(),
        }),
      );
    }

    const result = await useCase.execute();

    expect(result.total_staked).toBe('400.00');
    expect(result.active_stakers).toBe(3);
  });
});

describe('AddPolicyUseCase', () => {
  let useCase: AddPolicyUseCase;

  beforeEach(() => {
    setEnv();
    useCase = new AddPolicyUseCase();
  });

  it('returns a contract call targeting the pool address', async () => {
    const result = await useCase.execute(POLICY_ADDRESS);

    expect(result.call.contract_address).toBe(POOL_ADDRESS);
    expect(result.call.abi_function_signature).toBe('addPolicy(address)');
  });

  it('includes the policy_address in abi_parameters', async () => {
    const result = await useCase.execute(POLICY_ADDRESS);

    expect(result.call.abi_parameters.policy_address).toBe(POLICY_ADDRESS);
  });
});
