import { GetBalanceUseCase } from '../../application/use-case/balance/get-balance.use-case.js';
import { createGetHandler } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const useCase = new GetBalanceUseCase();

const handler = createGetHandler({
  operationName: 'GetBalance',
  execute: async (_req, authPayload) => {
    const result = await useCase.execute(authPayload!.walletAddress);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
