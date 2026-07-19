import { timingSafeEqual } from 'node:crypto'

const DASHBOARD_SURFACE = 'dashboard'
const DEFAULT_SURFACE = 'ecommerce'
const DEFAULT_DASHBOARD_CSRF_COOKIE = 'pm_csrf_dashboard'

const dashboardCsrfCookieName = () => {
  const configured = String(process.env.DASHBOARD_AUTH_CSRF_COOKIE_NAME || DEFAULT_DASHBOARD_CSRF_COOKIE).trim()
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}_dashboard$/.test(configured) ? configured : null
}

const singleHeaderValue = (value) => {
  const normalized = String(value || '').trim()
  return normalized && !normalized.includes(',') ? normalized : null
}

const normalizeAuthority = (value) => {
  const authority = singleHeaderValue(value)?.toLowerCase()
  if (!authority || !/^[a-z0-9.-]+(?::\d{1,5})?$/.test(authority)) return null

  try {
    const parsed = new URL(`https://${authority}`)
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null
    const port = parsed.port ? Number(parsed.port) : null
    if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) return null
    return parsed.host.toLowerCase()
  } catch {
    return null
  }
}

const readUniqueCookie = (cookieHeader, cookieName) => {
  const matches = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=')
      if (separator < 1) return null
      return [part.slice(0, separator).trim(), part.slice(separator + 1)]
    })
    .filter((entry) => entry?.[0] === cookieName)

  if (matches.length !== 1 || !matches[0][1]) return null
  try {
    const value = decodeURIComponent(matches[0][1])
    return value || null
  } catch {
    return null
  }
}

const secretsMatch = (left, right) => {
  const leftBytes = Buffer.from(left, 'utf8')
  const rightBytes = Buffer.from(right, 'utf8')
  return leftBytes.length === rightBytes.length
    && leftBytes.length > 0
    && timingSafeEqual(leftBytes, rightBytes)
}

const denyUpload = (reason) => ({ ok: false, status: 403, reason })

export const resolveUploadAuthSurface = (incomingSurface) =>
  incomingSurface === DASHBOARD_SURFACE ? DASHBOARD_SURFACE : DEFAULT_SURFACE

export const forwardUploadAuthenticationHeaders = (incomingHeaders, outgoingHeaders = new Headers()) => {
  for (const name of ['authorization', 'cookie', 'x-csrf-token', 'x-xsrf-token']) {
    const value = incomingHeaders.get(name)
    if (value) outgoingHeaders.set(name, value)
  }
  outgoingHeaders.set('x-auth-surface', resolveUploadAuthSurface(incomingHeaders.get('x-auth-surface')))
  return outgoingHeaders
}

export const validateDashboardUploadSecurity = (incomingHeaders) => {
  if (incomingHeaders.get('x-auth-surface') !== DASHBOARD_SURFACE) {
    return denyUpload('invalid-surface')
  }

  const host = normalizeAuthority(incomingHeaders.get('host'))
  const forwardedHost = normalizeAuthority(incomingHeaders.get('x-forwarded-host'))
  const forwardedProto = singleHeaderValue(incomingHeaders.get('x-forwarded-proto'))?.toLowerCase()
  if (!host || host !== forwardedHost || forwardedProto !== 'https') {
    return denyUpload('invalid-public-target')
  }

  const rawOrigin = singleHeaderValue(incomingHeaders.get('origin'))
  if (!rawOrigin) return denyUpload('missing-origin')

  let trustedOrigin
  try {
    const parsedOrigin = new URL(rawOrigin)
    if (
      parsedOrigin.protocol !== 'https:'
      || parsedOrigin.username
      || parsedOrigin.password
      || parsedOrigin.pathname !== '/'
      || parsedOrigin.search
      || parsedOrigin.hash
      || rawOrigin !== parsedOrigin.origin
    ) {
      return denyUpload('invalid-origin')
    }
    trustedOrigin = new URL(`https://${host}`).origin
    if (parsedOrigin.origin !== trustedOrigin) {
      return denyUpload('foreign-origin')
    }
  } catch {
    return denyUpload('invalid-origin')
  }

  const csrfCookieName = dashboardCsrfCookieName()
  if (!csrfCookieName) return denyUpload('invalid-csrf-config')
  const csrfCookie = readUniqueCookie(incomingHeaders.get('cookie'), csrfCookieName)
  const csrfHeader = singleHeaderValue(incomingHeaders.get('x-csrf-token'))
  if (!csrfCookie || !csrfHeader || !secretsMatch(csrfCookie, csrfHeader)) {
    return denyUpload('invalid-csrf')
  }

  return { ok: true, origin: trustedOrigin }
}
