import { OAuthTokenRequestSchema } from '../../../application/dto/credential/credential.dto.js';
import { OAuthTokenExchangeUseCase } from '../../../application/use-case/credential/oauth-token-exchange.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { withRateLimit } from '../../../interface/middleware/with-rate-limit.js';
import { Response } from '../../../interface/response.js';

const useCase = new OAuthTokenExchangeUseCase(container.apiCredentialRepo, container.jwtService);

const handler = createHandler({
  operationName: 'OAuthTokenExchange',
  schema: OAuthTokenRequestSchema,
  execute: async (dto) => {
    const result = await useCase.execute(dto);
    return Response.ok(result);
  },
});

export default withCors(withRateLimit({ name: 'oauth-token', limit: 30, windowMs: 60_000 })(handler));
