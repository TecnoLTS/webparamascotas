import { getConfiguredTenantProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'
import { clearStoredSession } from '@/lib/authSession'
import { toPublicApiUrl } from '@/lib/publicApiPath'

const getCsrfCookieName = () => {
  const fromEnv = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME
  return fromEnv?.trim() || 'pm_csrf'
}

const readCookieValue = (cookieHeader: string | null | undefined, cookieName: string) => {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawName, ...rawValue] = part.split('=')
    if (rawName?.trim() !== cookieName) continue
    const value = rawValue.join('=').trim()
    return value ? decodeURIComponent(value) : null
  }
  return null
}

const buildBaseUrl = () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (backendUrl) return backendUrl.replace(/\/$/, '').replace(/\/api$/, '')

  const explicitBase = process.env.NEXT_PUBLIC_BASE_URL
  if (explicitBase) return explicitBase.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`

  return `http://localhost:${process.env.PORT ?? 3000}`
}

type ServerRequestContext = {
  forwardedHost: string | null
  forwardedProto: string | null
  cookieHeader: string | null
  csrfToken: string | null
}

const getServerRequestContext = async (): Promise<ServerRequestContext | null> => {
  if (typeof window !== 'undefined') return null
  try {
    const [{ headers }, utils] = await Promise.all([
      import('next/headers'),
      import('@/lib/headerUtils'),
    ])
    const headerList = await headers()
    const cookieHeader = utils.getHeaderValue(headerList, 'cookie')

    return {
      forwardedHost: utils.getHostFromHeaders(headerList),
      forwardedProto: utils.getProtoFromHeaders(headerList),
      cookieHeader,
      csrfToken: readCookieValue(cookieHeader, getCsrfCookieName()),
    }
  } catch {
    return null
  }
}

const resolveForwardedHost = (forwardedHost?: string | null) => {
  return resolveTenantHost(forwardedHost)
}

const resolveUrl = (path: string) => {
  if (path.startsWith('http')) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // Si estamos en el servidor (SSR), usamos la URL interna de Docker
  if (typeof window === 'undefined') {
    const internalUrl = process.env.BACKEND_URL_INTERNAL || 'http://backend-http:8080/api'
    return `${internalUrl.replace(/\/$/, '')}${normalizedPath.replace('/api', '')}`
  }

  return toPublicApiUrl(normalizedPath)
}

const authFreePaths = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/request-otp',
  '/api/auth/verify-otp',
  '/api/auth/password-reset/request',
  '/api/auth/password-reset/confirm',
  '/api/auth/verify',
  '/api/auth/session',
  '/api/contact',
])

const isPublicApiPath = (pathname: string, method?: string) => {
  const normalizedMethod = (method || 'GET').toUpperCase()

  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') {
    if (pathname === '/api/products' || pathname.startsWith('/api/products/')) return true
    if (pathname === '/api/settings/shipping') return true
    if (pathname === '/api/settings/store-status') return true
    if (pathname === '/api/settings/brand-logos') return true
    if (pathname === '/api/settings/product-categories') return true
    if (pathname === '/api/settings/product-category-references') return true
    if (pathname === '/api/health') return true
  }

  if (normalizedMethod === 'POST' && (pathname === '/api/orders/quote' || pathname === '/api/contact')) return true

  return false
}

const shouldDisableServerCache = (pathname: string) => {
  if (pathname === '/api/products' || pathname.startsWith('/api/products/')) {
    return true
  }
  if (pathname === '/api/settings/product-categories' || pathname === '/api/settings/product-category-references') {
    return true
  }
  return false
}

const getServerCachePolicy = (
  pathname: string,
  method: string,
): { cache: RequestCache; next?: { revalidate?: number | false } } | null => {
  if (typeof window !== 'undefined') return null
  if (method !== 'GET') return null
  if (!isPublicApiPath(pathname, method) || shouldDisableServerCache(pathname)) return null

  if (process.env.NODE_ENV === 'development') {
    if (pathname === '/api/products' || pathname.startsWith('/api/products/')) {
      return { cache: 'force-cache', next: { revalidate: 5 } }
    }
    return { cache: 'force-cache', next: { revalidate: 15 } }
  }

  return { cache: 'force-cache', next: { revalidate: 60 } }
}

const getPathname = (pathOrUrl: string) => {
  try {
    if (pathOrUrl.startsWith('http')) return new URL(pathOrUrl).pathname
    return new URL(pathOrUrl, 'http://local').pathname
  } catch {
    return pathOrUrl
  }
}

const normalizeHeaders = (init?: RequestInit) => {
  const headers = new Headers(init?.headers || {})
  return headers
}

const methodRequiresCsrf = (method?: string) => {
  const normalizedMethod = (method || 'GET').toUpperCase()
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)
}

const getBrowserCsrfToken = () => {
  if (typeof document === 'undefined') return null
  return readCookieValue(document.cookie, getCsrfCookieName())
}

let browserCsrfRefreshPromise: Promise<string | null> | null = null

const refreshBrowserCsrfToken = async () => {
  if (typeof window === 'undefined') return null
  if (browserCsrfRefreshPromise) {
    return browserCsrfRefreshPromise
  }

  browserCsrfRefreshPromise = fetch(resolveUrl('/api/auth/session'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })
    .catch(() => null)
    .then(() => getBrowserCsrfToken())
    .finally(() => {
      browserCsrfRefreshPromise = null
    })

  return browserCsrfRefreshPromise
}

const withAuth = async (path: string, init?: RequestInit): Promise<RequestInit> => {
  const headers = normalizeHeaders(init)
  if (headers.has('Authorization')) {
    return { ...init, headers }
  }

  const pathname = getPathname(path)
  if (typeof window === 'undefined') {
    const serverContext = await getServerRequestContext()
    const forwardedHost = serverContext?.forwardedHost ?? null
    const forwardedProto = serverContext?.forwardedProto ?? null
    const cookieHeader = serverContext?.cookieHeader ?? null
    const csrfToken = methodRequiresCsrf(init?.method) ? (serverContext?.csrfToken ?? null) : null
    attachInternalProxyToken(headers)
    if (authFreePaths.has(pathname)) {
      const tenantHost = resolveForwardedHost(forwardedHost)
      const tenantProto = forwardedProto || getConfiguredTenantProto()
      if (tenantHost) {
        headers.set('x-forwarded-host', tenantHost)
        headers.set('host', tenantHost)
      }
      if (tenantProto) {
        headers.set('x-forwarded-proto', tenantProto)
      }
      if (cookieHeader) {
        headers.set('cookie', cookieHeader)
      }
      if (csrfToken && !headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', csrfToken)
      }
      return { ...init, headers }
    }
    const tenantHost = resolveForwardedHost(forwardedHost)
    const tenantProto = forwardedProto || getConfiguredTenantProto()
    if (tenantHost) {
      headers.set('x-forwarded-host', tenantHost)
      headers.set('host', tenantHost)
    }
    if (tenantProto) {
      headers.set('x-forwarded-proto', tenantProto)
    }
    if (cookieHeader) {
      headers.set('cookie', cookieHeader)
    }
    if (csrfToken && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', csrfToken)
    }
    if (isPublicApiPath(pathname, init?.method)) {
      return { ...init, headers }
    }
    return { ...init, headers }
  }

  if (authFreePaths.has(pathname)) {
    return { ...init, headers }
  }
  if (isPublicApiPath(pathname, init?.method)) {
    return { ...init, headers }
  }
  if (methodRequiresCsrf(init?.method) && !headers.has('x-csrf-token')) {
    let csrfToken = getBrowserCsrfToken()
    if (!csrfToken) {
      csrfToken = await refreshBrowserCsrfToken()
    }
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken)
    }
  }

  return { ...init, headers, credentials: init?.credentials || 'include' }
}

const shouldRedirectToLogin = (status: number, body: unknown) => {
  if (status !== 401) return false
  if (!body || typeof body !== 'object') return true
  const code = (body as any)?.error?.code
  if (!code) return true
  return ['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_REVOKED'].includes(code)
}

const isPanelRoute = (pathname: string) => {
  return pathname.startsWith('/my-account')
}

const handleAuthFailure = (status: number, body: unknown) => {
  if (typeof window === 'undefined') return
  if (!shouldRedirectToLogin(status, body)) return
  clearStoredSession()
  const current = window.location.pathname + window.location.search
  if (!isPanelRoute(window.location.pathname)) {
    return
  }
  if (!current.startsWith('/login')) {
    window.location.href = `/login?next=${encodeURIComponent(current)}`
  }
}

const shouldClearSessionOnSecurityBlock = (body: unknown) => {
  const code = getApiErrorCode(body)
  return code === 'ORDER_PRICING_FIELDS_FORBIDDEN' || code === 'ORDER_ITEM_PRICING_FIELDS_FORBIDDEN'
}

export type ApiError = {
  message: string
  code?: string
  details?: unknown
}

export type ApiEnvelope<T> = {
  ok: boolean
  data?: T
  error?: ApiError
  message?: string
  meta?: Record<string, unknown>
}

const isEnvelope = (value: unknown): value is ApiEnvelope<unknown> => {
  if (!value || typeof value !== 'object') return false
  return Object.prototype.hasOwnProperty.call(value, 'ok')
}

const getApiErrorCode = (body: unknown) => {
  if (!body || typeof body !== 'object') return null
  const code = (body as any)?.error?.code
  return typeof code === 'string' && code.trim() ? code.trim() : null
}

const shouldRetryWithFreshCsrf = (path: string, init: RequestInit | undefined, status: number, body: unknown) => {
  if (typeof window === 'undefined') return false
  if (!methodRequiresCsrf(init?.method)) return false
  if (authFreePaths.has(getPathname(path))) return false
  return status === 403 && getApiErrorCode(body) === 'CSRF_TOKEN_INVALID'
}

const retryBrowserRequestWithFreshCsrf = async (
  path: string,
  init: RequestInit | undefined,
  cache: RequestCache
) => {
  await refreshBrowserCsrfToken()
  const url = resolveUrl(path)
  const authedInit = await withAuth(path, init)
  return fetchWithTimeout(url, {
    credentials: authedInit.credentials || 'include',
    cache,
    ...authedInit,
  })
}

const readResponseBody = async (res: Response): Promise<{ body: unknown; isJson: boolean }> => {
  const contentType = res.headers.get('content-type') || ''
  const expectsJson = contentType.includes('application/json')
  const raw = await res.text()

  if (!expectsJson) {
    return { body: raw, isJson: false }
  }

  if (!raw) {
    return { body: null, isJson: true }
  }

  try {
    return { body: JSON.parse(raw), isJson: true }
  } catch {
    return { body: raw, isJson: false }
  }
}

const compactWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const extractTextFromHtml = (value: string) => {
  const withoutScripts = value.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const withoutTags = withoutStyles.replace(/<[^>]+>/g, ' ')
  return compactWhitespace(withoutTags)
}

const normalizeHttpErrorMessage = (
  status: number,
  url: string,
  body: unknown,
  envelopeMessage?: string | null
) => {
  const fallbackMessage = `Error ${status} al consultar ${url}`
  const envelopeText = String(envelopeMessage || '').trim()
  if (envelopeText) return envelopeText

  const errorCode = getApiErrorCode(body)
  if (errorCode === 'ORDER_PRICING_FIELDS_FORBIDDEN' || errorCode === 'ORDER_ITEM_PRICING_FIELDS_FORBIDDEN') {
    return 'Detectamos un intento inválido de alterar precios o montos del pedido. Por seguridad, la cuenta quedó bloqueada temporalmente.'
  }

  if (typeof body === 'object' && body !== null) {
    const rawError = (body as any).error
    const rawMessage = (body as any).message
    const objectMessage = typeof rawError === 'string'
      ? rawError.trim()
      : typeof rawMessage === 'string'
        ? rawMessage.trim()
        : ''
    if (objectMessage) return objectMessage
  }

  if (typeof body === 'string' && body.trim().length > 0) {
    const raw = body.trim()
    const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(raw)
    const text = looksLikeHtml ? extractTextFromHtml(raw) : compactWhitespace(raw)
    if (/too many requests/i.test(text) || status === 429) {
      return 'Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentarlo.'
    }
    if (/bad gateway/i.test(text)) {
      return 'Error 502: servicio temporalmente no disponible. Intenta nuevamente en unos segundos.'
    }
    if (/gateway timeout/i.test(text)) {
      return 'Error 504: el servidor tardó demasiado en responder. Intenta nuevamente.'
    }
    if (/service unavailable/i.test(text)) {
      return 'Error 503: servicio temporalmente no disponible. Intenta nuevamente.'
    }
    if (text) {
      return text.length > 240 ? fallbackMessage : text
    }
  }

  return fallbackMessage
}

const getFetchTimeoutMs = () => {
  const fromEnv = Number(process.env.API_FETCH_TIMEOUT_MS)
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv
  }
  return 15000
}

type PreparedApiResult = {
  status: number
  ok: boolean
  body: unknown
  isJson: boolean
  envelope: ApiEnvelope<unknown> | null
  url: string
}

const inFlightReadableRequests = new Map<string, Promise<PreparedApiResult>>()

const REQUEST_DEDUPE_HEADER_NAMES = [
  'accept',
  'authorization',
  'content-type',
  'cookie',
  'host',
  'x-forwarded-host',
  'x-forwarded-proto',
]

const serializeRequestHeaders = (headersInit?: HeadersInit) => {
  const headers = new Headers(headersInit || {})
  return REQUEST_DEDUPE_HEADER_NAMES
    .map((name) => {
      const value = headers.get(name)
      return value ? `${name}:${value}` : null
    })
    .filter(Boolean)
    .join('|')
}

const buildReadableRequestKey = (url: string, init: RequestInit & { next?: { revalidate?: number | false } }) => {
  const method = (init.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD'].includes(method)) return null
  if (init.signal) return null
  const nextOptions = 'next' in init ? JSON.stringify(init.next || null) : ''
  return [
    method,
    url,
    `cache:${init.cache || 'default'}`,
    `credentials:${init.credentials || 'same-origin'}`,
    `headers:${serializeRequestHeaders(init.headers)}`,
    `next:${nextOptions}`,
  ].join('|')
}

type ApiRequestInit = RequestInit & {
  timeoutMs?: number
}

const fetchWithTimeout = async (url: string, init?: ApiRequestInit): Promise<Response> => {
  const timeoutMs = Number.isFinite(init?.timeoutMs) && (init?.timeoutMs ?? 0) > 0
    ? Number(init?.timeoutMs)
    : getFetchTimeoutMs()
  const controller = new AbortController()
  let didTimeout = false
  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  const parentSignal = init?.signal
  const onParentAbort = () => controller.abort()
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort()
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true })
    }
  }

  try {
    const { timeoutMs: _timeoutMs, ...fetchInit } = init || {}
    return await fetch(url, { ...fetchInit, signal: controller.signal })
  } catch (error) {
    if (didTimeout) {
      throw new Error(`Tiempo de espera agotado (${timeoutMs}ms) al consultar ${url}`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    if (parentSignal) {
      parentSignal.removeEventListener('abort', onParentAbort)
    }
  }
}

const performReadableRequest = async (
  path: string,
  init: ApiRequestInit | undefined,
  cache: RequestCache,
  nextOptions?: { revalidate?: number | false }
): Promise<PreparedApiResult> => {
  const url = resolveUrl(path)
  const authedInit = await withAuth(path, init)
  const fetchOptions: ApiRequestInit & { next?: { revalidate?: number | false } } = {
    credentials: authedInit.credentials || 'include',
    ...authedInit,
    cache,
  }

  if (nextOptions) {
    fetchOptions.next = nextOptions
  }

  const requestKey = buildReadableRequestKey(url, fetchOptions)
  const executeRequest = async (): Promise<PreparedApiResult> => {
    let res = await fetchWithTimeout(url, fetchOptions)
    let { body, isJson } = await readResponseBody(res)

    if (!res.ok && shouldRetryWithFreshCsrf(path, init, res.status, body)) {
      res = await retryBrowserRequestWithFreshCsrf(path, init, cache)
      ;({ body, isJson } = await readResponseBody(res))
    }

    const envelope = isJson && isEnvelope(body) ? (body as ApiEnvelope<unknown>) : null
    return {
      status: res.status,
      ok: res.ok,
      body,
      isJson,
      envelope,
      url,
    }
  }

  if (!requestKey) {
    return executeRequest()
  }

  const existingRequest = inFlightReadableRequests.get(requestKey)
  if (existingRequest) {
    return existingRequest
  }

  const requestPromise = executeRequest().finally(() => {
    inFlightReadableRequests.delete(requestKey)
  })
  inFlightReadableRequests.set(requestKey, requestPromise)
  return requestPromise
}

export async function fetchJson<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase()
  const pathname = getPathname(path)
  const serverCachePolicy = getServerCachePolicy(pathname, method)
  const cache = init?.cache || serverCachePolicy?.cache || 'no-store'
  const nextOptions = serverCachePolicy?.next
  const result = await performReadableRequest(path, init, cache, nextOptions)

  if (!result.ok) {
    if (typeof window !== 'undefined' && shouldClearSessionOnSecurityBlock(result.body)) {
      clearStoredSession()
    }
    handleAuthFailure(result.status, result.body)
    const message = normalizeHttpErrorMessage(
      result.status,
      result.url,
      result.body,
      result.envelope?.error?.message
    )
    throw new Error(message)
  }

  if (result.envelope) {
    if (!result.envelope.ok) {
      throw new Error(result.envelope.error?.message || result.envelope.message || 'Error desconocido')
    }
    return result.envelope.data as T
  }

  return result.body as T
}

export async function requestApi<T>(path: string, init?: ApiRequestInit): Promise<{ ok: boolean; status: number; body: T; message?: string }> {
  const result = await performReadableRequest(path, init, 'no-store')

  if (!result.ok) {
    if (typeof window !== 'undefined' && shouldClearSessionOnSecurityBlock(result.body)) {
      clearStoredSession()
    }
    handleAuthFailure(result.status, result.body)
    const message = normalizeHttpErrorMessage(
      result.status,
      result.url,
      result.body,
      result.envelope?.error?.message
    )
    throw new Error(message)
  }

  if (result.envelope) {
    if (!result.envelope.ok) {
      throw new Error(result.envelope.error?.message || result.envelope.message || 'Error desconocido')
    }
    return { ok: true, status: result.status, body: result.envelope.data as T, message: result.envelope.message }
  }

  return { ok: true, status: result.status, body: result.body as T }
}
