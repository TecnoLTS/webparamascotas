import { NextRequest, NextResponse } from 'next/server'

const PANEL_IP_MODE = (process.env.PANEL_IP_MODE || 'off').trim().toLowerCase()
const PANEL_IP_ALLOWLIST = (process.env.PANEL_IP_ALLOWLIST || '').trim()
const cleanSegment = (value: string, fallback: string) => (value || fallback).trim().replace(/^\/+|\/+$/g, '') || fallback
const configuredPublicApiBasePath = (
  process.env.NEXT_PUBLIC_API_BASE_PATH ||
  `/${cleanSegment(process.env.NEXT_PUBLIC_TENANT_SLUG || '', 'paramascotasec')}/${cleanSegment(process.env.NEXT_PUBLIC_API_SERVICE_SEGMENT || '', 'api')}`
)
const PUBLIC_API_BASE_PATH = (configuredPublicApiBasePath.startsWith('/') ? configuredPublicApiBasePath : `/${configuredPublicApiBasePath}`).replace(/\/$/, '')
const CSP_REPORT_URI = `${PUBLIC_API_BASE_PATH}/security/csp-report`
const PRIVATE_IPV4_RULES = ['127.0.0.1/32', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
const CANONICAL_HOST = (process.env.NEXT_PUBLIC_SITE_DOMAIN || process.env.PRIMARY_SITE_DOMAIN || 'paramascotasec.com').trim().toLowerCase()
const CANONICAL_ALIASES = new Set(
  [
    `www.${CANONICAL_HOST}`,
    ...(process.env.NEXT_PUBLIC_SITE_ALIASES || process.env.PRIMARY_SITE_ALIASES || '').split(','),
  ]
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
)
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`
const ADMIN_PANEL_TABS = new Set([
  'alerts',
  'security-settings',
  'reports',
  'sales-ranking',
  'products',
  'inventory',
  'catalogs',
  'users',
  'product-page',
  'store-status',
  'local-sales',
  'quotations',
  'admin-orders',
  'shipments',
  'billing-rides',
  'balances',
  'prices',
  'taxes',
  'margins',
  'calculations',
  'pricing-rules',
  'discount-codes',
  'expenses',
])

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

const isAccountRoute = (pathname: string) => pathname === '/my-account' || pathname.startsWith('/my-account/')

const shouldApplyPanelAllowlist = (req: NextRequest) => {
  if (!isAccountRoute(req.nextUrl.pathname)) return false

  const requestedTab = req.nextUrl.searchParams.get('tab')?.trim() || ''
  if (!requestedTab) return false

  return ADMIN_PANEL_TABS.has(requestedTab)
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
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  headers.set('Origin-Agent-Cluster', '?1')
  headers.set('X-Frontend-Channel', 'ecommerce')

  if (getForwardedProto(req) === 'https') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

const buildCanonicalHostRedirect = (req: NextRequest) => {
  const host = getForwardedHost(req)
  const proto = getForwardedProto(req)
  const isPrimaryHost = host === CANONICAL_HOST
  const isAliasHost = CANONICAL_ALIASES.has(host)

  if (!isPrimaryHost && !isAliasHost) return null
  if (isPrimaryHost && proto === 'https') return null

  return NextResponse.redirect(`${CANONICAL_ORIGIN}${req.nextUrl.pathname}${req.nextUrl.search}`, 301)
}

const buildScriptSrc = (nonce: string) => ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"].join(' ')

const buildCsp = (nonce: string) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${buildScriptSrc(nonce)}`,
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
    `script-src ${buildScriptSrc(nonce)}`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `report-uri ${CSP_REPORT_URI}`,
  ].join('; ')

export function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID()).replace(/=+$/g, '')
  const csp = buildCsp(nonce)
  const cspReportOnly = buildStrictReportOnlyCsp(nonce)

  const canonicalHostRedirect = buildCanonicalHostRedirect(req)
  if (canonicalHostRedirect) {
    applySecurityHeaders(canonicalHostRedirect.headers, req, csp, cspReportOnly, nonce)
    return canonicalHostRedirect
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  if (shouldApplyPanelAllowlist(req) && normalizeIpMode(PANEL_IP_MODE) !== 'off') {
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
