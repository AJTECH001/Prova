import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import { getLogger } from '../../../core/logger.js';

const logger = getLogger('ProcessCoverageEventUseCase');

export type CoverageEventType = 'CoverageCreated' | 'PremiumPaid';

export interface CoverageEventPayload {
  event_type: CoverageEventType;
  coverage_id: string;
  escrow_id?: string;
  amount?: string;
  tx_hash: string;
  block_number: string;
}

export class ProcessCoverageEventUseCase {
  constructor(private readonly escrowRepository: IEscrowRepository) {}

  async execute(events: CoverageEventPayload[]): Promise<void> {
    for (const event of events) {
      if (event.event_type === 'CoverageCreated') {
        await this.handleCoverageCreated(event);
      } else if (event.event_type === 'PremiumPaid') {
        this.handlePremiumPaid(event);
      }
    }
  }

  private async handleCoverageCreated(event: CoverageEventPayload): Promise<void> {
    if (!event.escrow_id) {
      logger.warn({ coverageId: event.coverage_id }, 'CoverageCreated event missing escrow_id');
      return;
    }

    const escrow = await this.escrowRepository.findByOnChainId(event.escrow_id);
    if (!escrow) {
      logger.warn(
        { coverageId: event.coverage_id, escrowId: event.escrow_id },
        'CoverageCreated: no escrow found for on-chain ID',
      );
      return;
    }

    escrow.coverageId = event.coverage_id;
    await this.escrowRepository.update(escrow);

    logger.info(
      { publicId: escrow.publicId, coverageId: event.coverage_id },
      'Coverage linked to escrow',
    );
  }

  private handlePremiumPaid(event: CoverageEventPayload): void {
    // Premium tracking is informational — logged for future analytics.
    // A dedicated premiums table would be added when yield reporting is built.
    logger.info(
      { coverageId: event.coverage_id, amount: event.amount, txHash: event.tx_hash },
      'PremiumPaid event received',
    );
  }
}
