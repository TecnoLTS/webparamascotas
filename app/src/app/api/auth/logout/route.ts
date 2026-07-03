import { NextRequest } from 'next/server'
import { getInternalBackendBaseUrl } from '@/lib/api/backendBase'
import { resolveRequestProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'
import { getConfiguredCookieDomains } from '@/lib/cookieDomains'

export const dynamic = 'force-dynamic'

const getBackendBase = () => getInternalBackendBaseUrl()

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
  'x-auth-surface',
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
  const authCookies = [authCookie, `${authCookie}_ecommerce`, `${authCookie}_dashboard`]

  // Host-only cookies.
  for (const cookie of authCookies) {
    headers.append('Set-Cookie', buildExpiredCookie(cookie, { httpOnly: true }))
  }
  headers.append('Set-Cookie', buildExpiredCookie(csrfCookie))

  for (const domain of getConfiguredCookieDomains()) {
    for (const cookie of authCookies) {
      headers.append('Set-Cookie', buildExpiredCookie(cookie, { domain, httpOnly: true }))
    }
    headers.append('Set-Cookie', buildExpiredCookie(csrfCookie, { domain }))
  }
}

export const POST = async (req: NextRequest) => {
  const base = getBackendBase()
  const targetUrl = `${base}/auth/logout${req.nextUrl.search}`

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
  headers.set('x-auth-surface', 'ecommerce')
  attachInternalProxyToken(headers)

  const init: RequestInit = {
    method: 'POST',
    headers,
    body: await req.arrayBuffer(),
    cache: 'no-store',
  }

  let backendRes: Response | null = null
  try {
    backendRes = await fetch(targetUrl, init)
  } catch {
    backendRes = null
  }

  const resHeaders = new Headers(backendRes?.headers)
  for (const name of hopByHopResponseHeaders) {
    resHeaders.delete(name)
  }
  resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  resHeaders.set('Pragma', 'no-cache')
  resHeaders.set('Expires', '0')
  // Hard logout: clear client-side storage and cookies for this origin.
  resHeaders.set('Clear-Site-Data', '"cookies", "storage"')
  appendLogoutCookies(resHeaders)

  if (!backendRes) {
    resHeaders.set('Content-Type', 'application/json; charset=utf-8')
    return new Response(
      JSON.stringify({ ok: false, error: { message: 'No se pudo conectar con el backend.' } }),
      { status: 502, headers: resHeaders }
    )
  }

  return new Response(await backendRes.arrayBuffer(), { status: backendRes.status, headers: resHeaders })
}
