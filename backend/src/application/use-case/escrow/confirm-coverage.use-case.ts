import { ApplicationHttpError } from '../../../core/errors.js';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';

export class ConfirmCoverageUseCase {
  constructor(private readonly escrowRepository: IEscrowRepository) {}

  async execute(
    escrowPublicId: string,
    coverageId: string,
    userId: string,
  ): Promise<void> {
    const escrow = await this.escrowRepository.findByPublicId(escrowPublicId);
    if (!escrow) throw new ApplicationHttpError(404, 'Escrow not found');
    if (escrow.userId !== userId) throw new ApplicationHttpError(403, 'Unauthorized');

    escrow.coverageId = coverageId;
    await this.escrowRepository.update(escrow);
  }
}
