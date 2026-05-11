import { LogoutUseCase } from '../../../application/use-case/auth/logout.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createGetHandler } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const useCase = new LogoutUseCase(container.sessionRepo);

const handler = createGetHandler({
  operationName: 'Logout',
  execute: async (_req, authPayload) => {
    await useCase.execute(authPayload!.userId);
    return Response.noContent();
  },
});

export default withCors(withAuth(handler));
