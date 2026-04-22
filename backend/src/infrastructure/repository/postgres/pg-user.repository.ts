import { eq } from 'drizzle-orm';
import type { IUserRepository } from '../../../domain/auth/repository/user.repository.js';
import { User, type UserRole } from '../../../domain/auth/model/user.js';
import { users } from './schema.js';
import type { Db } from './db.js';

export class PgUserRepository implements IUserRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return row ? this.toDomain(row) : null;
  }

  async findByWalletAddress(address: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.walletAddress, address),
    });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db
      .insert(users)
      .values({
        id: user.id,
        walletAddress: user.walletAddress,
        walletProvider: user.walletProvider,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          walletAddress: user.walletAddress,
          walletProvider: user.walletProvider,
          email: user.email,
          role: user.role,
        },
      });
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.db.update(users).set({ role }).where(eq(users.id, userId));
  }

  private toDomain(row: typeof users.$inferSelect): User {
    return new User({
      id: row.id,
      walletAddress: row.walletAddress,
      walletProvider: row.walletProvider,
      email: row.email ?? undefined,
      role: (row.role as UserRole) ?? undefined,
      createdAt: row.createdAt,
    });
  }
}
