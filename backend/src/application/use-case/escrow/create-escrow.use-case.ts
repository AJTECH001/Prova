import { randomUUID } from 'crypto';
import { encodeAbiParameters, isAddress } from 'viem';
import type { IFheService } from '../../../infrastructure/fhe/fhe.service.js';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import { Escrow } from '../../../domain/escrow/model/escrow.js';
import { Currency } from '../../../domain/escrow/model/currency.js';
import { EscrowStatus } from '../../../domain/escrow/model/escrow-status.enum.js';
import { getEnv } from '../../../core/config.js';
import type { CreateEscrowDto } from '../../dto/escrow/create-escrow.dto.js';
import type { CreateEscrowResponse, CreateEscrowClientEncryptResponse } from '../../dto/escrow/escrow-response.dto.js';

export type EncryptionMode = 'server' | 'client';

const DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  USD: 2,
  EUR: 2,
};

const DEFAULT_DECIMALS = 18;

const ABI_FUNCTION_SIGNATURE = 'createEscrow((bytes,int32,uint8,bytes),(bytes,int32,uint8,bytes),address,bytes)';

/**
 * ABI-encodes resolver data for ProvaPaymentResolver.onConditionSet.
 * Matches the Solidity decode: abi.decode(data, (address, address, uint256, uint256))
 *
 * @param buyerAddress  - Bruno's wallet address (the debtor)
 * @param sellerAddress - Amara's wallet address (the insured)
 * @param invoiceAmount - Invoice value in USDC smallest units (6 decimals)
 * @param deadlineDate  - Invoice due date as YYYY-MM-DD string
 */
function buildResolverData(
  buyerAddress: string,
  sellerAddress: string,
  invoiceAmount: bigint,
  deadlineDate: string | undefined,
): string {
  if (!isAddress(buyerAddress)) return '0x';

  // Convert YYYY-MM-DD to Unix timestamp (UTC midnight).
  // Fallback: 30 days from now if no deadline provided.
  const dueDate = deadlineDate
    ? BigInt(Math.floor(new Date(deadlineDate + 'T00:00:00Z').getTime() / 1000))
    : BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  return encodeAbiParameters(
    [
      { name: 'buyer',         type: 'address' },
      { name: 'seller',        type: 'address' },
      { name: 'invoiceAmount', type: 'uint256' },
      { name: 'dueDate',       type: 'uint256' },
    ],
    [
      buyerAddress  as `0x${string}`,
      sellerAddress as `0x${string}`,
      invoiceAmount,
      dueDate,
    ],
  );
}

function toSmallestUnit(amount: number, currencyCode: string): bigint {
  const decimals = DECIMALS[currencyCode.toUpperCase()] ?? DEFAULT_DECIMALS;
  return BigInt(Math.round(amount * 10 ** decimals));
}

export class CreateEscrowUseCase {
  constructor(
    private readonly fheService: IFheService,
    private readonly escrowRepository: IEscrowRepository,
  ) {}

  async execute(
    dto: CreateEscrowDto,
    userId: string,
    walletAddress: string,
    encryptionMode: EncryptionMode = 'server',
  ): Promise<CreateEscrowResponse | CreateEscrowClientEncryptResponse> {
    const amountInSmallestUnit = toSmallestUnit(dto.amount, dto.currency.code);

    const env = getEnv();

    const escrow = new Escrow({
      id: randomUUID(),
      publicId: randomUUID(),
      userId,
      type: dto.type,
      counterparty: dto.counterparty,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      externalReference: dto.external_reference,
      amount: dto.amount,
      currency: new Currency({ type: dto.currency.type, code: dto.currency.code }),
      status: EscrowStatus.PENDING,
      walletId: walletAddress,
      metadata: dto.metadata,
      createdAt: new Date(),
      resolverAddress: dto.resolver_address ?? env.RESOLVER_ADDRESS,
      poolAddress: dto.insurance?.pool_address ?? env.POOL_ADDRESS,
      policyAddress: dto.insurance?.policy_address ?? env.POLICY_ADDRESS,
    });

    await this.escrowRepository.save(escrow);

    const contractAddress = env.ESCROW_CONTRACT_ADDRESS ?? '';

    if (encryptionMode === 'client') {
      const resolverData = buildResolverData(
        dto.counterparty ?? '',   // buyer wallet address (Bruno)
        walletAddress,            // seller wallet address (Amara)
        amountInSmallestUnit,
        dto.deadline,
      );

      return {
        public_id: escrow.publicId,
        contract_address: contractAddress,
        abi_function_signature: ABI_FUNCTION_SIGNATURE,
        abi_parameters: {
          resolver: escrow.resolverAddress ?? '0x0000000000000000000000000000000000000000',
          resolver_data: resolverData,
        },
        owner_address: walletAddress,
        amount: dto.amount,
        amount_smallest_unit: amountInSmallestUnit.toString(),
      };
    }

    const encryptedData = await this.fheService.encryptEscrowData(amountInSmallestUnit, walletAddress, walletAddress);

    const abiParameters = encryptedData.getContractCallParameters();

    return {
      public_id: escrow.publicId,
      contract_address: contractAddress,
      abi_function_signature: ABI_FUNCTION_SIGNATURE,
      abi_parameters: abiParameters,
    };
  }
}
