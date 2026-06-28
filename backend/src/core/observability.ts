import { randomUUID } from 'node:crypto';
import { getLogger } from './logger.js';

/** Header used to correlate a request across logs, responses, and upstream callers. */
export const REQUEST_ID_HEADER = 'x-request-id';

type HeaderBag = Record<string, string | string[] | undefined>;

/**
 * Return a stable request id for correlation: reuse an inbound `x-request-id`
 * (e.g. propagated from an edge/proxy) when present, otherwise mint a new UUID.
 */
export function getRequestId(req: { headers?: HeaderBag }): string {
  const raw = req.headers?.[REQUEST_ID_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.length > 0 ? value : randomUUID();
}

export interface ErrorContext {
  requestId?: string;
  operationName?: string;
  [key: string]: unknown;
}

/**
 * Central exception-capture seam. Today it emits a structured pino error log;
 * an external error tracker (e.g. Sentry) can be wired in here behind an env
 * flag without changing any call sites.
 */
export function captureException(error: unknown, context: ErrorContext = {}): void {
  getLogger(context.operationName ?? 'error').error(
    { err: error, ...context },
    'unhandled_error',
  );
}
