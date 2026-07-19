const configuredHosts = () => {
  const primary = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'paramascotasec.com'
  const aliases = process.env.NEXT_PUBLIC_SITE_ALIASES || `www.${primary}`
  return new Set(
    [primary, ...aliases.split(',')]
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  )
}

const configuredObjectStorageBase = () => {
  const value = (process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || '').trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export const isObjectStorageUploadUrl = (src: string) => {
  try {
    const url = new URL(src)
    const objectStorageBase = configuredObjectStorageBase()
    if (!objectStorageBase || url.protocol !== 'https:' || url.origin !== objectStorageBase.origin) return false
    const basePath = objectStorageBase.pathname.replace(/\/$/, '')
    return url.pathname === basePath || url.pathname.startsWith(`${basePath}/`)
  } catch {
    return false
  }
}

export const isPublicUploadUrl = (src: string) => {
  if (src.startsWith('/uploads/')) return true
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:') return false
    if (configuredHosts().has(url.hostname.toLowerCase()) && url.pathname.startsWith('/uploads/')) return true

    return isObjectStorageUploadUrl(src)
  } catch {
    return false
  }
}
