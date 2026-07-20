const uploadFolders = new Set(['products', 'brands', 'categories'])

export const isExpectedBackendPublicUrl = (candidate, fileName, configuredBase) => {
  if (!candidate || candidate !== candidate.trim() || !fileName || !configuredBase) return false

  try {
    const base = new URL(configuredBase)
    const isRootRelative = candidate.startsWith('/') && !candidate.startsWith('//')
    const isAbsoluteHttps = /^https:\/\//i.test(candidate)
    if (!isRootRelative && !isAbsoluteHttps) return false

    const url = new URL(candidate, base.origin)
    if (base.protocol !== 'https:'
      || base.username
      || base.password
      || base.search
      || base.hash
      || url.protocol !== 'https:'
      || url.origin !== base.origin
      || url.username
      || url.password
      || url.search
      || url.hash) return false

    const basePath = base.pathname.replace(/\/$/, '')
    const expectedPrefix = `${basePath}/tenants/`.replace(/^\/\//, '/')
    if (!url.pathname.startsWith(expectedPrefix)) return false

    const segments = url.pathname.slice(expectedPrefix.length).split('/')
    return segments.length === 3
      && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(segments[0])
      && uploadFolders.has(segments[1])
      && segments[2] === encodeURIComponent(fileName)
  } catch {
    return false
  }
}
