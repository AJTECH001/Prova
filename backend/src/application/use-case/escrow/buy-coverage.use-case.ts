import { encodeAbiParameters } from 'viem';
import { ApplicationHttpError } from '../../../core/errors.js';
import { getEnv } from '../../../core/config.js';
import { getLogger } from '../../../core/logger.js';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { PolicyAdminService } from '../../../infrastructure/chain/policy-admin.service.js';
import type { BuyCoverageDto, BuyCoverageResponse } from '../../dto/escrow/buy-coverage.dto.js';

// purchaseCoverage(InEaddress holder, address pool, address policy, uint256 escrowId,
//                  InEuint64 coverageAmount, uint256 expiry, bytes policyData, bytes riskProof)
const ABI_FUNCTION_SIGNATURE =
  'purchaseCoverage((uint256,uint8,uint8,bytes),address,address,uint256,(uint256,uint8,uint8,bytes),uint256,bytes,bytes)';

const USDC_DECIMALS = 6;
const DEFAULT_COVERAGE_DAYS = 90;
const DEFAULT_COVERAGE_PERCENTAGE_BPS = 9000; // 90% — standard trade-credit coverage

const logger = getLogger('BuyCoverageUseCase');

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
    const poolAddress = dto.pool_address ?? escrow.poolAddress ?? env.POOL_ADDRESS ?? '';
    const policyAddress = escrow.policyAddress ?? env.POLICY_ADDRESS ?? '';

    if (!poolAddress) throw new ApplicationHttpError(422, 'pool_address is required (or set POOL_ADDRESS env var)');
    if (!policyAddress) throw new ApplicationHttpError(422, 'POLICY_ADDRESS not configured');

    const coverageAmount = dto.coverage_amount ?? escrow.amount;
    const coverageAmountSmallest = BigInt(Math.round(coverageAmount * 10 ** USDC_DECIMALS));

    // Expiry: provided date or default 90 days from now
    const expiryTimestamp = dto.expiry
      ? Math.floor(new Date(dto.expiry + 'T00:00:00Z').getTime() / 1000)
      : Math.floor(Date.now() / 1000) + DEFAULT_COVERAGE_DAYS * 24 * 60 * 60;

    // debtorId: bytes32 canonical identifier for the buyer.
    // Derived by left-padding the buyer's wallet address into 32 bytes —
    // matches bytes32(uint160(address)) in Solidity.
    const buyerAddr = (escrow.counterparty ?? walletAddress).toLowerCase().replace('0x', '');
    const debtorId = `0x${buyerAddr.padStart(64, '0')}` as `0x${string}`;

    // One-time setup: register the policy in ConfidentialPolicyRegistry and whitelist
    // it in the InsurancePool. Required before purchaseCoverage will be accepted.
    try {
      await this.policyAdminService.ensurePolicyReady(poolAddress, policyAddress);
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : String(e) }, 'ensurePolicyReady failed — continuing with coverage params');
    }

    // Per-buyer setup: set concentration cap so _registerExposure doesn't revert
    // with ConcentrationCapNotSet.
    try {
      await this.policyAdminService.ensureDebtorRegistered(policyAddress, debtorId);
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : String(e) }, 'ensureDebtorRegistered failed — continuing with coverage params');
    }

    const invoiceAmountSmallest = BigInt(Math.round(escrow.amount * 10 ** USDC_DECIMALS));

    // ABI-encode policy parameters for TradeCreditInsurancePolicy.onPolicySet().
    // Layout: (bytes32 debtorId, address poolId, uint64 buyerCreditLimit,
    //          uint16 coveragePercentageBps, bytes2 countryCode, bytes4 industryCode, uint64 invoiceAmount)
    const policyData = encodeAbiParameters(
      [
        { name: 'debtorId',              type: 'bytes32' },
        { name: 'poolId',                type: 'address' },
        { name: 'buyerCreditLimit',      type: 'uint64'  },
        { name: 'coveragePercentageBps', type: 'uint16'  },
        { name: 'countryCode',           type: 'bytes2'  },
        { name: 'industryCode',          type: 'bytes4'  },
        { name: 'invoiceAmount',         type: 'uint64'  },
      ],
      [
        debtorId,
        poolAddress as `0x${string}`,
        coverageAmountSmallest,
        DEFAULT_COVERAGE_PERCENTAGE_BPS,
        '0x0000' as `0x${string}`,
        '0x00000000' as `0x${string}`,
        invoiceAmountSmallest,
      ],
    );

    // ConfidentialCoverageManager is a Reineira core contract — address is fixed per network
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
