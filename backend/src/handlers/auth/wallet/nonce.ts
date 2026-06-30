import { RequestNonceDtoSchema } from '../../../application/dto/auth/request-nonce.dto.js';
import { RequestNonceUseCase } from '../../../application/use-case/auth/request-nonce.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { withRateLimit } from '../../../interface/middleware/with-rate-limit.js';
import { Response } from '../../../interface/response.js';

const useCase = new RequestNonceUseCase(container.nonceService);

const handler = createHandler({
  operationName: 'RequestNonce',
  schema: RequestNonceDtoSchema,
  execute: async (dto) => {
    const result = await useCase.execute(dto);
    return Response.ok(result);
  },
});

// Pre-auth endpoint — throttle per IP to blunt nonce-harvesting / brute force.
export default withCors(withRateLimit({ name: 'auth-nonce', limit: 20, windowMs: 60_000 })(handler));
