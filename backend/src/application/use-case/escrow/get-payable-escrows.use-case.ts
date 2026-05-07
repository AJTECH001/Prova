import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { EscrowResponse } from '../../dto/escrow/escrow-response.dto.js';
import { toEscrowResponse } from './get-escrows.use-case.js';

export class GetPayableEscrowsUseCase {
  constructor(private readonly escrowRepository: IEscrowRepository) {}

  async execute(walletAddress: string): Promise<EscrowResponse[]> {
    const escrows = await this.escrowRepository.findPayableByCounterparty(walletAddress);
    return escrows.map(toEscrowResponse);
  }
}
