import { GetWithdrawalByIdUseCase } from '../../application/use-case/withdrawal/get-withdrawal-by-id.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const useCase = new GetWithdrawalByIdUseCase(container.withdrawalRepo);

const handler = createGetHandler({
  operationName: 'GetWithdrawalById',
  execute: async (req, authPayload) => {
    const publicId = req.query.publicId as string;
    const result = await useCase.execute(publicId, authPayload!.userId);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
