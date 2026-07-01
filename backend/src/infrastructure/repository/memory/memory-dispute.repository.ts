import type {
  IDisputeRepository,
  FindDisputesByUserIdOptions,
  PaginatedResult,
} from '../../../domain/dispute/repository/dispute.repository.js';
import type { Dispute } from '../../../domain/dispute/model/dispute.js';

export class MemoryDisputeRepository implements IDisputeRepository {
  private readonly store = new Map<string, Dispute>();

  async findById(id: string): Promise<Dispute | null> {
    return this.store.get(id) ?? null;
  }

  async findByPublicId(publicId: string): Promise<Dispute | null> {
    for (const dispute of this.store.values()) {
      if (dispute.publicId === publicId) return dispute;
    }
    return null;
  }

  async findByUserId(userId: string, options?: FindDisputesByUserIdOptions): Promise<PaginatedResult<Dispute>> {
    let items = [...this.store.values()]
      .filter((d) => d.userId === userId)
      .filter((d) => (options?.status ? d.status === options.status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.cursor) {
      const cursorIndex = items.findIndex((d) => d.publicId === options.cursor);
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1);
      }
    }

    const limit = options?.limit ?? 20;
    const page = items.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1]!.publicId : undefined;

    return { items: page, cursor: nextCursor };
  }

  async findOpenByEscrowId(escrowId: string): Promise<Dispute | null> {
    for (const dispute of this.store.values()) {
      if (dispute.escrowId === escrowId && dispute.isOpen()) return dispute;
    }
    return null;
  }

  async save(dispute: Dispute): Promise<void> {
    this.store.set(dispute.id, dispute);
  }

  async update(dispute: Dispute): Promise<void> {
    this.store.set(dispute.id, dispute);
  }
}
