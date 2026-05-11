import { CreateBridgeChallengeUseCase } from '../../../application/use-case/withdrawal/create-bridge-challenge.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createGetHandler } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const useCase = new CreateBridgeChallengeUseCase(container.withdrawalRepo);

const handler = createGetHandler({
  operationName: 'CreateBridgeChallenge',
  execute: async (req, authPayload) => {
    const publicId = req.query.publicId as string;
    const result = await useCase.execute(publicId, authPayload!.userId);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
