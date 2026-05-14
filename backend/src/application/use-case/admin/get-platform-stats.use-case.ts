import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';

export class GetPlatformStatsUseCase {
  constructor(private readonly escrowRepository: IEscrowRepository) {}

  async execute(): Promise<{ totalVolume: number; activeEscrows: number; settledEscrows: number }> {
    return this.escrowRepository.getGlobalStats();
  }
}
