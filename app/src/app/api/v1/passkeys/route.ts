import { type NextRequest, NextResponse } from 'next/server'

const ZERODEV_PASSKEY_BASE = `https://passkeys.zerodev.app/api/v3/31291108-1de0-4ebc-8f93-747be88c0b02`

async function proxy(req: NextRequest): Promise<NextResponse> {
  try {
    const path = req.nextUrl.searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    const cleanPath = path.replace(/^\//, '')
    const targetUrl = `${ZERODEV_PASSKEY_BASE}/${cleanPath}`

    const hasBody = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'
    const body = hasBody ? await req.text() : undefined

    console.log(`[passkeys proxy] ${req.method} ${targetUrl}`, body ? `body: ${body}` : '')

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    const responseText = await upstream.text()
    console.log(`[passkeys proxy] upstream ${upstream.status}:`, responseText)

    const contentType = upstream.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      try {
        return NextResponse.json(JSON.parse(responseText), { status: upstream.status })
      } catch {
        return NextResponse.json({ error: 'Upstream returned invalid JSON', body: responseText }, { status: upstream.status })
      }
    }

    return NextResponse.json({ error: responseText || 'Upstream error', status: upstream.status }, { status: upstream.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error && (err as any).cause
    console.error('[passkeys proxy] ERROR:', message, cause ? `cause: ${JSON.stringify(cause)}` : '')
    return NextResponse.json({ error: 'Proxy error', message, cause: String(cause) }, { status: 500 })
  }
}

export const GET = proxy
export const POST = proxy
