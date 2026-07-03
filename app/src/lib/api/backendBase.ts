const DEFAULT_INTERNAL_BACKEND_BASE_URL = 'http://backend-http:8080/api'

const normalizePath = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value
  const normalized = value.startsWith('/') ? value : `/${value}`
  return normalized.replace(/\/{2,}/g, '/')
}

export const getInternalBackendBaseUrl = () =>
  (process.env.BACKEND_URL_INTERNAL || DEFAULT_INTERNAL_BACKEND_BASE_URL).replace(/\/$/, '')

export const toInternalBackendUrl = (logicalPath: string) => {
  const normalized = normalizePath(logicalPath)
  if (/^https?:\/\//i.test(normalized)) return normalized

  const suffix = normalized.replace(/^\/api(?=\/|$)/, '') || ''
  return `${getInternalBackendBaseUrl()}${suffix}`.replace(/([^:]\/)\/+/g, '$1')
}

