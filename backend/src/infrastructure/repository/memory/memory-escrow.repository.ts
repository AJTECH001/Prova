import type {
  IEscrowRepository,
  FindByUserIdOptions,
  PaginatedResult,
} from '../../../domain/escrow/repository/escrow.repository.js';
import type { Escrow } from '../../../domain/escrow/model/escrow.js';
import { EscrowStatus } from '../../../domain/escrow/model/escrow-status.enum.js';

export class MemoryEscrowRepository implements IEscrowRepository {
  private readonly store = new Map<string, Escrow>();

  async findById(id: string): Promise<Escrow | null> {
    return this.store.get(id) ?? null;
  }

  async findByPublicId(publicId: string): Promise<Escrow | null> {
    for (const escrow of this.store.values()) {
      if (escrow.publicId === publicId) return escrow;
    }
    return null;
  }

  async findByUserId(userId: string, options?: FindByUserIdOptions): Promise<PaginatedResult<Escrow>> {
    let items = [...this.store.values()]
      .filter((i) => i.userId === userId)
      .filter((i) => (options?.status ? i.status === options.status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.cursor) {
      const cursorIndex = items.findIndex((i) => i.publicId === options.cursor);
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1);
      }
    }

    const limit = options?.limit ?? 20;
    const page = items.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1]!.publicId : undefined;

    return { items: page, cursor: nextCursor };
  }

  async findByTxHash(txHash: string): Promise<Escrow | null> {
    for (const escrow of this.store.values()) {
      if (escrow.txHash === txHash) return escrow;
    }
    return null;
  }

  async findByOnChainId(onChainId: string): Promise<Escrow | null> {
    for (const escrow of this.store.values()) {
      if (escrow.onChainEscrowId === onChainId) return escrow;
    }
    return null;
  }

  async findPayableByCounterparty(walletAddress: string): Promise<Escrow[]> {
    return [...this.store.values()].filter(
      (e) =>
        e.counterparty?.toLowerCase() === walletAddress.toLowerCase() &&
        e.status === EscrowStatus.ON_CHAIN,
    );
  }

  async findPaidByCounterparty(walletAddress: string): Promise<Escrow[]> {
    const settledStatuses = [EscrowStatus.FUNDED, EscrowStatus.SETTLED, EscrowStatus.REDEEMED];
    return [...this.store.values()].filter(
      (e) =>
        e.counterparty?.toLowerCase() === walletAddress.toLowerCase() &&
        settledStatuses.includes(e.status),
    );
  }

  async findSettledByUserId(userId: string): Promise<Escrow[]> {
    const terminalStatuses = [EscrowStatus.SETTLED, EscrowStatus.EXPIRED, EscrowStatus.FAILED];
    return [...this.store.values()].filter(
      (e) => e.userId === userId && terminalStatuses.includes(e.status),
    );
  }

  async save(escrow: Escrow): Promise<void> {
    this.store.set(escrow.id, escrow);
  }

  async update(escrow: Escrow): Promise<void> {
    this.store.set(escrow.id, escrow);
  }

  async findAll(options?: FindByUserIdOptions): Promise<PaginatedResult<Escrow>> {
    let items = [...this.store.values()]
      .filter((i) => (options?.status ? i.status === options.status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.cursor) {
      const cursorIndex = items.findIndex((i) => i.publicId === options.cursor);
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1);
      }
    }

    const limit = options?.limit ?? 50;
    const page = items.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1]!.publicId : undefined;

    return { items: page, cursor: nextCursor };
  }

  async getGlobalStats(): Promise<{ totalVolume: number; activeEscrows: number; settledEscrows: number }> {
    let totalVolume = 0;
    let activeEscrows = 0;
    let settledEscrows = 0;

    const activeStatuses = [EscrowStatus.PENDING, EscrowStatus.ON_CHAIN, EscrowStatus.PROCESSING];
    const settledStatuses = [EscrowStatus.FUNDED, EscrowStatus.SETTLED, EscrowStatus.REDEEMED];

    for (const escrow of this.store.values()) {
      if (activeStatuses.includes(escrow.status)) activeEscrows++;
      if (settledStatuses.includes(escrow.status)) {
        settledEscrows++;
        totalVolume += Number(escrow.amount);
      }
    }

    return { totalVolume, activeEscrows, settledEscrows };
  }
}
