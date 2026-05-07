import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { EscrowStatus } from '../../../domain/escrow/model/escrow-status.enum.js';

export interface ReportFundedEscrowDto {
  on_chain_id: string;
  tx_hash: string;
}

export interface ReportFundedEscrowResponse {
  on_chain_id: string;
  tx_hash: string;
  status: string;
}

export class ReportFundedEscrowUseCase {
  constructor(private readonly escrowRepository: IEscrowRepository) {}

  async execute(dto: ReportFundedEscrowDto): Promise<ReportFundedEscrowResponse> {
    const escrow = await this.escrowRepository.findByOnChainId(dto.on_chain_id);
    if (!escrow) {
      throw ApplicationHttpError.notFound('Escrow not found');
    }

    if (escrow.status === EscrowStatus.ON_CHAIN) {
      escrow.markAsFunded();
      await this.escrowRepository.update(escrow);
    }

    return {
      on_chain_id: dto.on_chain_id,
      tx_hash: dto.tx_hash,
      status: escrow.status,
    };
  }
}
