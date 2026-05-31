import { NextRequest } from 'next/server'
import { resolveRequestProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'

const getBackendBase = () => {
  return (process.env.BACKEND_URL_INTERNAL || 'http://paramascotasec-backend-web/api').replace(/\/$/, '')
}

const buildExpiredCookie = (name: string, options?: { domain?: string; httpOnly?: boolean }) => {
  const parts = [
    `${name}=`,
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'SameSite=Lax',
    'Secure',
  ]
  if (options?.httpOnly) parts.push('HttpOnly')
  if (options?.domain) parts.push(`Domain=${options.domain}`)
  return parts.join('; ')
}

const appendLogoutCookies = (headers: Headers) => {
  const authCookie = (process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || process.env.AUTH_COOKIE_NAME || 'pm_auth').trim() || 'pm_auth'
  const csrfCookie = (process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME || process.env.AUTH_CSRF_COOKIE_NAME || 'pm_csrf').trim() || 'pm_csrf'

  headers.append('Set-Cookie', buildExpiredCookie(authCookie, { httpOnly: true }))
  headers.append('Set-Cookie', buildExpiredCookie(csrfCookie))
  headers.append('Set-Cookie', buildExpiredCookie(authCookie, { domain: 'paramascotasec.com', httpOnly: true }))
  headers.append('Set-Cookie', buildExpiredCookie(csrfCookie, { domain: 'paramascotasec.com' }))
  headers.append('Set-Cookie', buildExpiredCookie(authCookie, { domain: '.paramascotasec.com', httpOnly: true }))
  headers.append('Set-Cookie', buildExpiredCookie(csrfCookie, { domain: '.paramascotasec.com' }))
  headers.append('Set-Cookie', buildExpiredCookie(authCookie, { domain: 'www.paramascotasec.com', httpOnly: true }))
  headers.append('Set-Cookie', buildExpiredCookie(csrfCookie, { domain: 'www.paramascotasec.com' }))
}

const buildTargetUrl = (req: NextRequest) => {
  const base = getBackendBase()
  const path = req.nextUrl.pathname.replace(/^\/api/, '')
  return `${base}${path}${req.nextUrl.search}`
}

const forwardedHeaderNames = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-csrf-token',
  'x-requested-with',
  'x-real-ip',
  'x-xsrf-token',
]

const hopByHopResponseHeaders = [
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

const buildForwardHeaders = (req: NextRequest) => {
  const headers = new Headers()
  for (const name of forwardedHeaderNames) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }

  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor)

  const tenantHost = resolveTenantHost(req.headers.get('x-forwarded-host') || req.headers.get('host'))
  const forwardedProto = resolveRequestProto(req.headers.get('x-forwarded-proto'), req.url)
  if (tenantHost) {
    headers.set('host', tenantHost)
    headers.set('x-forwarded-host', tenantHost)
  }
  headers.set('x-forwarded-proto', forwardedProto)
  attachInternalProxyToken(headers)
  return headers
}

const forward = async (req: NextRequest) => {
  const targetUrl = buildTargetUrl(req)
  const headers = buildForwardHeaders(req)

  const init: RequestInit = {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
    cache: 'no-store',
  }

  let res: Response | null = null
  try {
    res = await fetch(targetUrl, init)
  } catch {
    res = null
  }

  const resHeaders = new Headers(res?.headers)
  for (const name of hopByHopResponseHeaders) {
    resHeaders.delete(name)
  }
  resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  resHeaders.set('Pragma', 'no-cache')
  resHeaders.set('Expires', '0')

  if (req.nextUrl.pathname === '/api/auth/logout') {
    resHeaders.set('Clear-Site-Data', '"cookies", "storage"')
    appendLogoutCookies(resHeaders)
  }

  if (!res) {
    resHeaders.set('Content-Type', 'application/json; charset=utf-8')
    return new Response(
      JSON.stringify({ ok: false, error: { message: 'No se pudo conectar con el backend.' } }),
      {
        status: 502,
        headers: resHeaders,
      }
    )
  }

  const body = await res.arrayBuffer()

  return new Response(body, {
    status: res.status,
    headers: resHeaders,
  })
}

export const GET = forward
export const POST = forward
export const PUT = forward
export const PATCH = forward
export const DELETE = forward
export const OPTIONS = forward
