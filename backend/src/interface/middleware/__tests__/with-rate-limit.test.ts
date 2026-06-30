import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  InMemoryRateLimitStore,
  withRateLimit,
} from '../with-rate-limit.js';

describe('InMemoryRateLimitStore', () => {
  it('allows up to the limit then blocks', () => {
    const store = new InMemoryRateLimitStore();
    const results = Array.from({ length: 4 }, () => store.hit('k', 3, 60_000));

    expect(results.map((r) => r.allowed)).to.deep.equal([true, true, true, false]);
    expect(results[0].remaining).to.equal(2);
    expect(results[2].remaining).to.equal(0);
    expect(results[3].retryAfterSeconds).to.be.greaterThan(0);
  });

  it('isolates counters per key', () => {
    const store = new InMemoryRateLimitStore();
    store.hit('a', 1, 60_000);
    expect(store.hit('a', 1, 60_000).allowed).to.equal(false);
    expect(store.hit('b', 1, 60_000).allowed).to.equal(true);
  });

  it('resets after the window elapses', () => {
    vi.useFakeTimers();
    try {
      const store = new InMemoryRateLimitStore();
      expect(store.hit('k', 1, 1_000).allowed).to.equal(true);
      expect(store.hit('k', 1, 1_000).allowed).to.equal(false);
      vi.advanceTimersByTime(1_001);
      expect(store.hit('k', 1, 1_000).allowed).to.equal(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

function mockReqRes(method = 'POST') {
  const headers: Record<string, string> = {};
  const state = { statusCode: 0, body: '' };
  const req = {
    method,
    headers: { 'x-forwarded-for': '203.0.113.5' },
    socket: {},
  } as unknown as VercelRequest;
  const res = {
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
    status: (code: number) => {
      state.statusCode = code;
      return res;
    },
    end: (body?: string) => {
      state.body = body ?? '';
      return res;
    },
  } as unknown as VercelResponse;
  return { req, res, headers, state };
}

describe('withRateLimit', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('invokes the handler while under the limit', async () => {
    const handler = vi.fn(async () => {});
    const wrapped = withRateLimit({ name: 't', limit: 2, windowMs: 60_000 })(handler);

    const { req, res } = mockReqRes();
    await wrapped(req, res);
    await wrapped(req, res);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('returns 429 with Retry-After once the limit is exceeded', async () => {
    const handler = vi.fn(async () => {});
    const wrapped = withRateLimit({ name: 't2', limit: 1, windowMs: 60_000 })(handler);

    const a = mockReqRes();
    await wrapped(a.req, a.res);
    const b = mockReqRes();
    await wrapped(b.req, b.res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(b.state.statusCode).to.equal(429);
    expect(b.headers['retry-after']).to.be.a('string');
    expect(b.headers['x-ratelimit-limit']).to.equal('1');
  });

  it('never counts CORS preflight (OPTIONS) requests', async () => {
    const handler = vi.fn(async () => {});
    const wrapped = withRateLimit({ name: 't3', limit: 1, windowMs: 60_000 })(handler);

    for (let i = 0; i < 5; i++) {
      const { req, res } = mockReqRes('OPTIONS');
      await wrapped(req, res);
    }
    expect(handler).toHaveBeenCalledTimes(5);
  });
});
