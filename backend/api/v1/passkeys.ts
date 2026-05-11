import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract the remaining path from the query parameter
  const { path } = req.query;
  
  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'Missing passkey action (path parameter required)' });
    return;
  }

  // Clean the path (remove leading slash if present)
  const cleanPath = path.replace(/^\//, '');
  const targetUrl = `https://passkeys.zerodev.app/api/v3/31291108-1de0-4ebc-8f93-747be88c0b02/${cleanPath}`;

  const fs = await import('node:fs');
  fs.appendFileSync('proxy-debug.log', `[${new Date().toISOString()}] ${req.method} ${targetUrl} body: ${JSON.stringify(req.body)}\n`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node-Fetch',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error: any) {
    const fs = await import('node:fs');
    fs.appendFileSync('proxy-error.log', `${new Date().toISOString()} - ${error.message}\n${error.stack}\n`);
    res.status(500).json({ error: 'Failed to proxy passkey request', message: error.message });
  }
}
