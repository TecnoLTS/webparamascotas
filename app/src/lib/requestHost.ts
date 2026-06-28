const readConfiguredBase = () => process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL

const csvHosts = (value?: string | null) =>
  (value || '')
    .split(',')
    .map((item) => normalizeHost(item))
    .filter(Boolean)

const INTERNAL_HOST_PATTERNS = [
  /^webparamascotas$/i,
  /^app$/i,
  /-app$/i,
  /-backend-http$/i,
  /^backend-http$/i,
]

const isInternalHost = (host: string) => {
  if (!host) return false
  return INTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(host))
}

const configuredPublicHosts = () => {
  const hosts = new Set<string>()
  for (const host of [
    process.env.NEXT_PUBLIC_SITE_DOMAIN,
    process.env.PRIMARY_SITE_DOMAIN,
    ...csvHosts(process.env.NEXT_PUBLIC_SITE_ALIASES),
    ...csvHosts(process.env.PRIMARY_SITE_ALIASES),
  ]) {
    const normalized = normalizeHost(host)
    if (normalized) hosts.add(normalized)
  }

  const configuredHost = getConfiguredTenantHost()
  if (configuredHost) hosts.add(configuredHost)

  if (hosts.size === 0) {
    hosts.add('paramascotasec.com')
    hosts.add('www.paramascotasec.com')
  }

  return hosts
}

const isAllowedPublicHost = (host: string) => configuredPublicHosts().has(host)

export const getConfiguredTenantHost = () => {
  const base = readConfiguredBase()
  if (!base) return null
  try {
    return new URL(base).hostname
  } catch {
    return null
  }
}

export const getConfiguredTenantProto = () => {
  const base = readConfiguredBase()
  if (!base) return null
  try {
    return new URL(base).protocol.replace(':', '')
  } catch {
    return null
  }
}

export const normalizeHost = (host?: string | null) => {
  if (!host) return ''
  const trimmed = host.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
  if (!trimmed) return ''
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']')
    if (end !== -1) return trimmed.slice(1, end)
  }
  return trimmed.replace(/:\d+$/, '')
}

export const resolveTenantHost = (incomingHost?: string | null) => {
  const normalizedIncoming = normalizeHost(incomingHost)
  if (normalizedIncoming && !isInternalHost(normalizedIncoming) && isAllowedPublicHost(normalizedIncoming)) {
    return normalizedIncoming
  }
  return getConfiguredTenantHost() || null
}

export const resolveRequestProto = (forwardedProto?: string | null, requestUrl?: string | null) => {
  const candidate = forwardedProto?.split(',')[0]?.trim()?.toLowerCase()
  if (candidate === 'http' || candidate === 'https') {
    return candidate
  }
  if (requestUrl) {
    try {
      const url = new URL(requestUrl)
      const protocol = url.protocol.replace(':', '').toLowerCase()
      if (protocol === 'http' || protocol === 'https') {
        return protocol
      }
    } catch {}
  }
  return getConfiguredTenantProto() || 'http'
}
