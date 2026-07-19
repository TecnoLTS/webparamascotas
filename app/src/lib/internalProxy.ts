export const getInternalProxyToken = () =>
  (process.env.STOREFRONT_BACKEND_PROXY_TOKEN || '').trim()

export const attachInternalProxyToken = (headers: Headers) => {
  const token = getInternalProxyToken()
  if (token) {
    headers.set('x-internal-proxy-token', token)
  } else {
    headers.delete('x-internal-proxy-token')
  }
}
