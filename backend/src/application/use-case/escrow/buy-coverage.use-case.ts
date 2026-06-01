import { encodeAbiParameters } from 'viem';
import { ApplicationHttpError } from '../../../core/errors.js';
import { getEnv } from '../../../core/config.js';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { PolicyAdminService } from '../../../infrastructure/chain/policy-admin.service.js';
import type { BuyCoverageDto, BuyCoverageResponse } from '../../dto/escrow/buy-coverage.dto.js';

// purchaseCoverage(uint256 holder, address pool, address policy, uint256 escrowId,
//                  uint256 coverageAmount, uint256 expiry, bytes policyData, bytes riskProof)
const ABI_FUNCTION_SIGNATURE =
  'purchaseCoverage(uint256,address,address,uint256,uint256,uint256,bytes,bytes)';

const USDC_DECIMALS = 6;
const DEFAULT_COVERAGE_DAYS = 90;
const DEFAULT_COVERAGE_PERCENTAGE_BPS = 9000; // 90% — standard trade-credit coverage

/**
 * Convert a decimal amount (number or numeric string from DB) to the smallest
 * unit integer for USDC (6 decimals) without float precision loss.
 *
 * String path: parses the decimal string directly — no float arithmetic involved.
 * Number path: uses Math.round which is safe for USDC amounts up to ~$9B.
 */
function amountToSmallestUnit(amount: number | string, decimals: number): bigint {
  if (typeof amount === 'string') {
    const dotIdx = amount.indexOf('.');
    if (dotIdx === -1) return BigInt(amount) * BigInt(10 ** decimals);
    const intPart = amount.slice(0, dotIdx) || '0';
    const fracPart = amount.slice(dotIdx + 1).padEnd(decimals, '0').slice(0, decimals);
    return BigInt(intPart) * BigInt(10 ** decimals) + BigInt(fracPart || '0');
  }
  return BigInt(Math.round(amount * 10 ** decimals));
}

export class BuyCoverageUseCase {
  constructor(
    private readonly escrowRepository: IEscrowRepository,
    private readonly policyAdminService: PolicyAdminService,
  ) {}

  async execute(
    escrowPublicId: string,
    dto: BuyCoverageDto,
    userId: string,
    walletAddress: string,
  ): Promise<BuyCoverageResponse> {
    const escrow = await this.escrowRepository.findByPublicId(escrowPublicId);
    if (!escrow) {
      throw new ApplicationHttpError(404, 'Escrow not found');
    }
    if (escrow.userId !== userId) {
      throw new ApplicationHttpError(403, 'Unauthorized');
    }
    if (!escrow.onChainEscrowId) {
      throw new ApplicationHttpError(422, 'Escrow is not yet on-chain — wait for EscrowCreated event');
    }
    if (escrow.coverageId) {
      throw new ApplicationHttpError(409, 'Coverage already purchased for this escrow');
    }

    const env = getEnv();
    const poolAddress = dto.pool_address ?? env.POOL_ADDRESS ?? escrow.poolAddress ?? '';
    const policyAddress = escrow.policyAddress ?? env.POLICY_ADDRESS ?? '';

    if (!poolAddress) throw new ApplicationHttpError(422, 'pool_address is required (or set POOL_ADDRESS env var)');
    if (!policyAddress) throw new ApplicationHttpError(422, 'POLICY_ADDRESS not configured');

    const coverageAmount = dto.coverage_amount ?? escrow.amount;
    const coverageAmountSmallest = amountToSmallestUnit(coverageAmount, USDC_DECIMALS);

    const expiryTimestamp = dto.expiry
      ? Math.floor(new Date(dto.expiry + 'T00:00:00Z').getTime() / 1000)
      : Math.floor(Date.now() / 1000) + DEFAULT_COVERAGE_DAYS * 24 * 60 * 60;

    const buyerAddr = (escrow.counterparty ?? walletAddress).toLowerCase().replace('0x', '');
    const debtorId = `0x${buyerAddr.padStart(64, '0')}` as `0x${string}`;

    await this.policyAdminService.ensurePoolManagerCorrect(poolAddress);
    await this.policyAdminService.ensureCcmWired();
    await this.policyAdminService.ensurePolicyReady(poolAddress, policyAddress);
    await this.policyAdminService.ensureDebtorRegistered(policyAddress, debtorId);

    const invoiceAmountSmallest = amountToSmallestUnit(escrow.amount, USDC_DECIMALS);

    // Country and industry codes from DTO, or zeros (risk model disabled for that dimension).
    // Callers should provide ISO 3166-1 alpha-2 country codes encoded as bytes2 hex,
    // and NACE/SIC industry codes encoded as bytes4 hex.
    const countryCode  = (dto.country_code  ?? '0x0000')     as `0x${string}`;
    const industryCode = (dto.industry_code ?? '0x00000000') as `0x${string}`;

    const policyData = encodeAbiParameters(
      [
        { name: 'debtorId',              type: 'bytes32' },
        { name: 'poolId',                type: 'address' },
        { name: 'buyerCreditLimit',      type: 'uint64'  },
        { name: 'coveragePercentageBps', type: 'uint16'  },
        { name: 'countryCode',           type: 'bytes2'  },
        { name: 'industryCode',          type: 'bytes4'  },
        { name: 'invoiceAmount',         type: 'uint64'  },
        { name: 'escrowId',              type: 'uint256' },
      ],
      [
        debtorId,
        poolAddress as `0x${string}`,
        coverageAmountSmallest,
        DEFAULT_COVERAGE_PERCENTAGE_BPS,
        countryCode,
        industryCode,
        invoiceAmountSmallest,
        BigInt(escrow.onChainEscrowId!),
      ],
    );

    const coverageManagerAddress = env.COVERAGE_MANAGER_ADDRESS ?? '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

    return {
      escrow_on_chain_id: escrow.onChainEscrowId,
      pool_address: poolAddress,
      policy_address: policyAddress,
      coverage_amount_smallest_unit: coverageAmountSmallest.toString(),
      expiry: expiryTimestamp,
      risk_proof: '0x',
      policy_data: policyData,
      contract_address: coverageManagerAddress,
      abi_function_signature: ABI_FUNCTION_SIGNATURE,
    };
  }
}
