import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLogger } from '../../core/logger.js';
import type { VercelHandler } from '../handler-factory.js';
import { sendResponse } from '../handler-factory.js';
import { Response } from '../response.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Pluggable rate-limit backend. The default is in-memory (per process); swap in a
 * shared implementation (e.g. Redis/Upstash) for multi-instance or serverless
 * deployments where each instance must share counters.
 */
export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): RateLimitResult | Promise<RateLimitResult>;
}

/**
 * Fixed-window counter held in process memory.
 *
 * Caveat: counters are per-instance, so on horizontally-scaled or serverless
 * deployments the effective limit is `limit × instances`. It still raises the bar
 * against bursts against a single warm instance; production should provide a shared
 * `RateLimitStore`.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    let window = this.windows.get(key);

    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, window);
    }

    window.count += 1;

    // Opportunistic cleanup to bound memory under many distinct keys.
    if (this.windows.size > 10_000) {
      for (const [k, w] of this.windows) {
        if (now >= w.resetAt) this.windows.delete(k);
      }
    }

    return {
      allowed: window.count <= limit,
      remaining: Math.max(0, limit - window.count),
      retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000),
    };
  }
}

const defaultStore = new InMemoryRateLimitStore();

/** Best-effort client IP, honoring the proxy chain Vercel/edge sets. */
function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(xff) ? xff[0] : xff;
  if (forwarded) return forwarded.split(',')[0]!.trim();

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp;

  return (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress ?? 'unknown';
}

export interface RateLimitOptions {
  /** Stable bucket name, also used as the key namespace (e.g. "auth-nonce"). */
  name: string;
  /** Max requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  store?: RateLimitStore;
  /** Override the rate-limit key (defaults to client IP). */
  keyFn?: (req: VercelRequest) => string;
}

/**
 * Rate-limit middleware. Wrap a handler to cap requests per client per window.
 * Emits `X-RateLimit-*` headers and a 429 with `Retry-After` when exceeded.
 * Preflight (OPTIONS) requests are never counted.
 */
export function withRateLimit(options: RateLimitOptions): (handler: VercelHandler) => VercelHandler {
  const { name, limit, windowMs, store = defaultStore, keyFn } = options;

  return (handler: VercelHandler): VercelHandler =>
    async (req: VercelRequest, res: VercelResponse): Promise<void> => {
      if (req.method === 'OPTIONS') return handler(req, res);

      const key = `${name}:${keyFn ? keyFn(req) : clientIp(req)}`;
      const result = await store.hit(key, limit, windowMs);

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));

      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        getLogger('rate-limit').warn({ name, limit, windowMs }, 'rate_limit_exceeded');
        sendResponse(
          res,
          Response.tooManyRequests(
            result.retryAfterSeconds,
            `Rate limit exceeded for ${name}. Retry in ${result.retryAfterSeconds}s.`,
          ),
        );
        return;
      }

      return handler(req, res);
    };
}
