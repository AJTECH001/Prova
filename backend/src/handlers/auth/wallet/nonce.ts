import { RequestNonceDtoSchema } from '../../../application/dto/auth/request-nonce.dto.js';
import { RequestNonceUseCase } from '../../../application/use-case/auth/request-nonce.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
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

export default withCors(handler);
