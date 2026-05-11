import { RefreshTokenDtoSchema } from '../../../application/dto/auth/refresh-token.dto.js';
import { RefreshTokenUseCase } from '../../../application/use-case/auth/refresh-token.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const useCase = new RefreshTokenUseCase(container.jwtService, container.sessionRepo, container.userRepo);

const handler = createHandler({
  operationName: 'RefreshToken',
  schema: RefreshTokenDtoSchema,
  execute: async (dto) => {
    const result = await useCase.execute(dto);
    return Response.ok(result);
  },
});

export default withCors(handler);
