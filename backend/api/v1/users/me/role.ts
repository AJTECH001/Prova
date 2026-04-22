import { z } from 'zod';
import { UpdateUserRoleUseCase } from '../../../../src/application/use-case/user/update-user-role.use-case.js';
import { container } from '../../../../src/infrastructure/container.js';
import { createHandler } from '../../../../src/interface/handler-factory.js';
import { withAuth } from '../../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../../src/interface/response.js';

const schema = z.object({
  role: z.enum(['SELLER', 'BUYER', 'LP']),
});

const useCase = new UpdateUserRoleUseCase(container.userRepo);

const handler = createHandler({
  operationName: 'UpdateUserRole',
  schema,
  execute: async (dto, _req, authPayload) => {
    const result = await useCase.execute(authPayload!.userId, dto.role);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
