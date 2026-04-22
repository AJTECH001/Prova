import type { IUserRepository } from '../../../domain/auth/repository/user.repository.js';
import type { UserRole } from '../../../domain/auth/model/user.js';

const ALLOWED_ROLES: UserRole[] = ['SELLER', 'BUYER', 'LP'];

export class UpdateUserRoleUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string, role: UserRole): Promise<{ role: UserRole }> {
    if (!ALLOWED_ROLES.includes(role)) {
      throw ApplicationHttpError.badRequest(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`);
    }

    await this.userRepository.updateRole(userId, role);
    return { role };
  }
}
