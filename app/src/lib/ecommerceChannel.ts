const DEFAULT_RETURN_PATH = '/my-account'

const cleanSegment = (value: string | undefined, fallback: string) =>
  (value || fallback).trim().replace(/^\/+|\/+$/g, '') || fallback

const reservedPrefixes = () => {
  const tenant = cleanSegment(process.env.NEXT_PUBLIC_TENANT_SLUG, 'paramascotasec')
  const api = cleanSegment(process.env.NEXT_PUBLIC_API_SERVICE_SEGMENT, 'api')
  const configuredApi = (process.env.NEXT_PUBLIC_API_BASE_PATH || `/${tenant}/${api}`).trim()
  const apiPrefix = configuredApi.startsWith('/') ? configuredApi : `/${configuredApi}`

  return ['/dashboard', '/api', apiPrefix.replace(/\/$/, '')]
}

export const normalizeEcommerceReturnPath = (candidate: string | null | undefined): string => {
  const value = (candidate || '').trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_RETURN_PATH
  }

  try {
    const base = new URL('https://ecommerce.invalid')
    const target = new URL(value, base)
    if (target.origin !== base.origin) {
      return DEFAULT_RETURN_PATH
    }

    const normalizedPath = target.pathname.toLowerCase().replace(/\/$/, '') || '/'
    const crossesChannel = reservedPrefixes().some((prefix) => {
      const normalizedPrefix = prefix.toLowerCase().replace(/\/$/, '')
      return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`)
    })
    if (crossesChannel) {
      return DEFAULT_RETURN_PATH
    }

    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return DEFAULT_RETURN_PATH
  }
}
