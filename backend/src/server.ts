import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import routerHandler from '../api/index.js';

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) { resolve(undefined); return; }
      if ((req.headers['content-type'] ?? '').includes('application/json')) {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      } else {
        resolve(raw);
      }
    });
  });
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

function adaptResponse(res: ServerResponse): any {
  let statusCode = 200;
  const r: any = res;

  r.status = (code: number) => { statusCode = code; res.statusCode = code; return r; };
  r.json   = (body: unknown) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return r;
  };
  r.send   = (body: unknown) => {
    res.statusCode = statusCode;
    if (typeof body === 'object' && body !== null) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    } else {
      res.end(body == null ? '' : String(body));
    }
    return r;
  };
  r.redirect = (statusOrUrl: string | number, url?: string) => {
    if (typeof statusOrUrl === 'string') {
      res.statusCode = 302; res.setHeader('Location', statusOrUrl);
    } else {
      res.statusCode = statusOrUrl; res.setHeader('Location', url!);
    }
    res.end();
    return r;
  };
  return r;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':      '*',
  'Access-Control-Allow-Methods':     'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':     'Content-Type, Authorization, x-coverage-signature, x-qn-signature, x-qn-nonce, x-qn-timestamp, x-encryption-mode',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age':           '86400',
};

const server = createServer(async (rawReq: IncomingMessage, rawRes: ServerResponse) => {
  // Apply CORS to every response
  for (const [k, v] of Object.entries(CORS_HEADERS)) rawRes.setHeader(k, v);

  if (rawReq.method === 'OPTIONS') {
    rawRes.statusCode = 204;
    rawRes.end();
    return;
  }

  const parsed   = new URL(rawReq.url ?? '/', `http://localhost`);
  const query: Record<string, string | string[]> = {};
  for (const [k, v] of parsed.searchParams) {
    const existing = query[k];
    query[k] = existing !== undefined
      ? (Array.isArray(existing) ? [...existing, v] : [existing, v])
      : v;
  }

  const body    = await parseBody(rawReq);
  const cookies = parseCookies(rawReq.headers.cookie);

  const req: any = rawReq;
  req.query   = query;
  req.cookies = cookies;
  req.body    = body;

  const res = adaptResponse(rawRes);

  try {
    await routerHandler(req, res);
  } catch (err) {
    console.error('[server] unhandled error', err);
    if (!rawRes.headersSent) {
      rawRes.statusCode = 500;
      rawRes.setHeader('Content-Type', 'application/json');
      rawRes.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
