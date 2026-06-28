import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError, type z } from 'zod';
import { ApplicationHttpError } from '../core/errors.js';
import { getLogger } from '../core/logger.js';
import { REQUEST_ID_HEADER, captureException, getRequestId } from '../core/observability.js';
import type { AuthPayload } from './auth/auth-payload.js';
import { type HttpResponse, Response } from './response.js';

export type AuthenticatedRequest = VercelRequest & { authPayload?: AuthPayload };

export type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

interface CreateHandlerConfig<TDto, TResult> {
  operationName: string;
  schema: z.ZodSchema<TDto>;
  execute: (dto: TDto, req: AuthenticatedRequest, authPayload?: AuthPayload) => Promise<TResult>;
}

interface CreateGetHandlerConfig<TResult> {
  operationName: string;
  execute: (req: AuthenticatedRequest, authPayload?: AuthPayload) => Promise<TResult>;
}

function isHttpResponse(value: unknown): value is HttpResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    'body' in value &&
    typeof (value as HttpResponse).statusCode === 'number' &&
    typeof (value as HttpResponse).body === 'string'
  );
}

export function sendResponse(res: VercelResponse, response: HttpResponse): void {
  const { statusCode, headers, body } = response;

  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }

  if (statusCode === 204) {
    res.status(204).end();
    return;
  }

  res.status(statusCode).end(body);
}

function handleError(error: unknown, operationName: string, requestId: string): HttpResponse {
  if (error instanceof ZodError) {
    return Response.fromZodError(error);
  }

  if (error instanceof ApplicationHttpError) {
    return Response.fromError(error, error.statusCode);
  }

  captureException(error, { operationName, requestId });
  return Response.internalServerError();
}

/**
 * Wraps a handler body with request correlation and structured access logging:
 * assigns/propagates an `x-request-id`, times the request, and emits a single
 * completion log line with status + duration. All API handlers funnel through here.
 */
async function withObservability(
  operationName: string,
  req: VercelRequest,
  res: VercelResponse,
  run: () => Promise<HttpResponse>,
): Promise<void> {
  const requestId = getRequestId(req);
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const path = (req.url ?? '').split('?')[0];
  const log = getLogger(operationName).child({ requestId, method: req.method, path });
  const startedAt = Date.now();

  let response: HttpResponse;
  try {
    response = await run();
  } catch (error) {
    response = handleError(error, operationName, requestId);
  }

  log.info({ status: response.statusCode, durationMs: Date.now() - startedAt }, 'request_completed');
  sendResponse(res, response);
}

export function createHandler<TDto, TResult>(config: CreateHandlerConfig<TDto, TResult>): VercelHandler {
  const { operationName, schema, execute } = config;

  return (req: VercelRequest, res: VercelResponse): Promise<void> =>
    withObservability(operationName, req, res, async () => {
      let rawBody: unknown;
      try {
        rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return Response.badRequest('Invalid JSON', 'Request body is not valid JSON');
      }

      const dto = schema.parse(rawBody);
      const authReq = req as AuthenticatedRequest;
      const result = await execute(dto, authReq, authReq.authPayload);

      return isHttpResponse(result) ? (result as HttpResponse) : Response.ok(result);
    });
}

export function createGetHandler<TResult>(config: CreateGetHandlerConfig<TResult>): VercelHandler {
  const { operationName, execute } = config;

  return (req: VercelRequest, res: VercelResponse): Promise<void> =>
    withObservability(operationName, req, res, async () => {
      const authReq = req as AuthenticatedRequest;
      const result = await execute(authReq, authReq.authPayload);

      return isHttpResponse(result) ? (result as HttpResponse) : Response.ok(result);
    });
}
