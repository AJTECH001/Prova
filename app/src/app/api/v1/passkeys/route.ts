import { type NextRequest, NextResponse } from 'next/server'

const ZERODEV_PROJECT_ID = '31291108-1de0-4ebc-8f93-747be88c0b02'
const ZERODEV_PASSKEY_BASE = `https://passkeys.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}`

async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  const cleanPath = path.replace(/^\//, '')
  const targetUrl = `${ZERODEV_PASSKEY_BASE}/${cleanPath}`

  const body = req.method === 'POST' ? await req.text() : undefined

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  const contentType = upstream.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  }

  const text = await upstream.text()
  return new NextResponse(text, { status: upstream.status })
}

export const GET = proxy
export const POST = proxy
