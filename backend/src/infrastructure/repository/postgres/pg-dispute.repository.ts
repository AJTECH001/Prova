import { and, eq, lt, desc, inArray } from 'drizzle-orm';
import type {
  IDisputeRepository,
  FindDisputesByUserIdOptions,
  PaginatedResult,
} from '../../../domain/dispute/repository/dispute.repository.js';
import { Dispute } from '../../../domain/dispute/model/dispute.js';
import { DisputeStatus } from '../../../domain/dispute/model/dispute-status.enum.js';
import { disputes } from './schema.js';
import type { Db } from './db.js';

export class PgDisputeRepository implements IDisputeRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Dispute | null> {
    const row = await this.db.query.disputes.findFirst({ where: eq(disputes.id, id) });
    return row ? this.toDomain(row) : null;
  }

  async findByPublicId(publicId: string): Promise<Dispute | null> {
    const row = await this.db.query.disputes.findFirst({ where: eq(disputes.publicId, publicId) });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(
    userId: string,
    options?: FindDisputesByUserIdOptions,
  ): Promise<PaginatedResult<Dispute>> {
    const limit = options?.limit ?? 20;
    const conditions = [eq(disputes.userId, userId)];

    if (options?.status) {
      conditions.push(eq(disputes.status, options.status));
    }

    if (options?.cursor) {
      const cursorRow = await this.db.query.disputes.findFirst({
        where: eq(disputes.publicId, options.cursor),
        columns: { createdAt: true },
      });
      if (cursorRow) {
        conditions.push(lt(disputes.createdAt, cursorRow.createdAt));
      }
    }

    const rows = await this.db.query.disputes.findMany({
      where: and(...conditions),
      orderBy: [desc(disputes.createdAt)],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((r) => this.toDomain(r));
    const nextCursor = hasMore ? page[page.length - 1]!.publicId : undefined;

    return { items, cursor: nextCursor };
  }

  async findOpenByEscrowId(escrowId: string): Promise<Dispute | null> {
    const row = await this.db.query.disputes.findFirst({
      where: and(
        eq(disputes.escrowId, escrowId),
        inArray(disputes.status, [DisputeStatus.PENDING, DisputeStatus.FILED]),
      ),
      orderBy: [desc(disputes.createdAt)],
    });
    return row ? this.toDomain(row) : null;
  }

  async save(dispute: Dispute): Promise<void> {
    await this.db.insert(disputes).values(this.toRow(dispute));
  }

  async update(dispute: Dispute): Promise<void> {
    await this.db
      .update(disputes)
      .set({
        status: dispute.status,
        disputeProof: dispute.disputeProof ?? null,
        txHash: dispute.txHash ?? null,
        errorMessage: dispute.errorMessage ?? null,
        updatedAt: dispute.updatedAt,
      })
      .where(eq(disputes.id, dispute.id));
  }

  private toRow(dispute: Dispute) {
    return {
      id: dispute.id,
      publicId: dispute.publicId,
      escrowId: dispute.escrowId,
      coverageId: dispute.coverageId,
      userId: dispute.userId,
      walletId: dispute.walletId,
      status: dispute.status,
      disputeProof: dispute.disputeProof ?? null,
      txHash: dispute.txHash ?? null,
      errorMessage: dispute.errorMessage ?? null,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    };
  }

  private toDomain(row: typeof disputes.$inferSelect): Dispute {
    return new Dispute({
      id: row.id,
      publicId: row.publicId,
      escrowId: row.escrowId,
      coverageId: row.coverageId,
      userId: row.userId,
      walletId: row.walletId,
      status: row.status as DisputeStatus,
      disputeProof: row.disputeProof ?? undefined,
      txHash: row.txHash ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
