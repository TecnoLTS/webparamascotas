import { NextRequest, NextResponse } from 'next/server'

const PANEL_IP_MODE = (process.env.PANEL_IP_MODE || 'off').trim().toLowerCase()
const PANEL_IP_ALLOWLIST = (process.env.PANEL_IP_ALLOWLIST || '').trim()
const CSP_REPORT_URI = '/api/security/csp-report'
const PRIVATE_IPV4_RULES = ['127.0.0.1/32', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
const CANONICAL_HOST = 'paramascotasec.com'
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`

const normalizeIpMode = (value: string) => {
  if (['private', 'private-lan', 'lan'].includes(value)) return 'private'
  if (value === 'custom') return 'custom'
  return 'off'
}

const getClientIp = (req: NextRequest) => {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  return ''
}

const ipv4ToLong = (ip: string) => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const value = Number(part)
    if (!Number.isInteger(value) || value < 0 || value > 255) return null
    result = (result << 8) + value
  }

  return result >>> 0
}

const ipInRule = (ip: string, rule: string) => {
  if (!rule.includes('/')) {
    return ip === rule
  }

  const [subnet, prefixRaw] = rule.split('/', 2)
  const ipLong = ipv4ToLong(ip)
  const subnetLong = ipv4ToLong(subnet)
  const prefix = Number(prefixRaw)
  if (ipLong === null || subnetLong === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipLong & mask) === (subnetLong & mask)
}

const getPanelIpRules = () => {
  const customRules = PANEL_IP_ALLOWLIST.split(',')
    .map((rule) => rule.trim())
    .filter(Boolean)

  const mode = normalizeIpMode(PANEL_IP_MODE)
  if (mode === 'private') {
    return Array.from(new Set([...PRIVATE_IPV4_RULES, ...customRules]))
  }
  if (mode === 'custom') {
    return customRules
  }
  return []
}

const isPanelIpAllowed = (ip: string) => {
  const rules = getPanelIpRules()
  if (rules.length === 0) return true
  if (!ip) return false
  return rules.some((rule) => ipInRule(ip, rule))
}

const shouldApplyPanelAllowlist = (pathname: string) => pathname === '/my-account' || pathname.startsWith('/my-account/')

const SEO_ROUTE_REDIRECTS: Record<string, string> = {
  '/tienda/alimento-para-perros': '/tienda/alimento-perros',
  '/tienda/alimento-para-gatos': '/tienda/alimento-gatos',
  '/tienda/comida-humeda-para-perros': '/tienda/comida-humeda-perros',
  '/tienda/comida-humeda-para-gatos': '/tienda/comida-humeda-gatos',
  '/tienda/snacks-para-perros': '/tienda/snacks-perros',
  '/tienda/juguetes-para-gatos': '/tienda/juguetes-gatos',
  '/tienda/accesorios-para-perros': '/tienda/accesorios-perros',
  '/tienda/ropa-para-perros': '/tienda/ropa-perros',
}

const buildRedirectResponse = (req: NextRequest, pathname: string, searchParams?: URLSearchParams, status = 308) => {
  const target = req.nextUrl.clone()
  target.pathname = pathname
  target.search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  return NextResponse.redirect(target, status)
}

const getForwardedHost = (req: NextRequest) =>
  (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0]?.trim().toLowerCase()

const getForwardedProto = (req: NextRequest) =>
  (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || '').split(',')[0]?.trim().toLowerCase()

const applySecurityHeaders = (
  headers: Headers,
  req: NextRequest,
  csp: string,
  cspReportOnly: string,
  nonce: string,
) => {
  headers.set('Content-Security-Policy', csp)
  headers.set('Content-Security-Policy-Report-Only', cspReportOnly)
  headers.set('x-nonce', nonce)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=()')
  headers.set('X-Frame-Options', 'SAMEORIGIN')

  if (getForwardedProto(req) === 'https') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

const buildCanonicalHostRedirect = (req: NextRequest) => {
  const host = getForwardedHost(req)
  const proto = getForwardedProto(req)
  const isPrimaryHost = host === CANONICAL_HOST
  const isWwwHost = host === `www.${CANONICAL_HOST}`

  if (!isPrimaryHost && !isWwwHost) return null
  if (isPrimaryHost && proto === 'https') return null

  return NextResponse.redirect(`${CANONICAL_ORIGIN}${req.nextUrl.pathname}${req.nextUrl.search}`, 301)
}

const redirectLegacySeoRoutes = (req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  const seoRouteRedirect = SEO_ROUTE_REDIRECTS[pathname]
  if (seoRouteRedirect) {
    return buildRedirectResponse(req, seoRouteRedirect, req.nextUrl.searchParams, 301)
  }

  return null
}

const buildCsp = (nonce: string) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `report-uri ${CSP_REPORT_URI}`,
  ].join('; ')

const buildStrictReportOnlyCsp = (nonce: string) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `report-uri ${CSP_REPORT_URI}`,
  ].join('; ')

export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID()).replace(/=+$/g, '')
  const csp = buildCsp(nonce)
  const cspReportOnly = buildStrictReportOnlyCsp(nonce)

  const canonicalHostRedirect = buildCanonicalHostRedirect(req)
  if (canonicalHostRedirect) {
    applySecurityHeaders(canonicalHostRedirect.headers, req, csp, cspReportOnly, nonce)
    return canonicalHostRedirect
  }

  const legacyRedirect = redirectLegacySeoRoutes(req)
  if (legacyRedirect) {
    applySecurityHeaders(legacyRedirect.headers, req, csp, cspReportOnly, nonce)
    return legacyRedirect
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  if (shouldApplyPanelAllowlist(req.nextUrl.pathname) && normalizeIpMode(PANEL_IP_MODE) !== 'off') {
    const clientIp = getClientIp(req)
    if (!isPanelIpAllowed(clientIp)) {
      const blockedResponse = new NextResponse('Acceso al panel restringido desde esta IP.', {
        status: 403,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
      applySecurityHeaders(blockedResponse.headers, req, csp, cspReportOnly, nonce)
      return blockedResponse
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  applySecurityHeaders(response.headers, req, csp, cspReportOnly, nonce)
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
}
