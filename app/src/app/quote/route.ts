import { NextResponse } from 'next/server'
import { resolveRequestProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'

const resolveBackendUrl = () => {
  const base = process.env.BACKEND_URL_INTERNAL || 'http://paramascotasec-backend-web/api'
  return `${base.replace(/\/$/, '')}/orders/quote`
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const host = resolveTenantHost(req.headers.get('x-forwarded-host') || req.headers.get('host'))
  const proto = resolveRequestProto(req.headers.get('x-forwarded-proto'), req.url)
  const outboundHeaders = new Headers({
    'Content-Type': 'application/json',
  })
  if (host) {
    outboundHeaders.set('host', host)
    outboundHeaders.set('x-forwarded-host', host)
  }
  outboundHeaders.set('x-forwarded-proto', proto)
  attachInternalProxyToken(outboundHeaders)

  const url = resolveBackendUrl()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: outboundHeaders,
      body: JSON.stringify(payload),
    })
  } catch {
    return NextResponse.json({ ok: false, error: { message: 'No se pudo conectar con el backend.' } }, { status: 502 })
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    return NextResponse.json(body || { error: 'Failed to get quote' }, { status: res.status })
  }

  const data = body && typeof body === 'object' && 'data' in body ? (body as any).data : body
  return NextResponse.json(data ?? {})
}
