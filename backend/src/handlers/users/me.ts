import { GetCurrentUserUseCase } from '../../application/use-case/user/get-current-user.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const useCase = new GetCurrentUserUseCase(container.userRepo);

const handler = createGetHandler({
  operationName: 'GetCurrentUser',
  execute: async (_req, authPayload) => {
    const result = await useCase.execute(authPayload!.userId);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
