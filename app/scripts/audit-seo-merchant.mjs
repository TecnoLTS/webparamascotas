#!/usr/bin/env node

import dns from 'node:dns'
import net from 'node:net'

const BASE_URL = (process.env.SEO_AUDIT_BASE_URL || 'https://paramascotasec.com').replace(/\/$/, '')
const URL_LIMIT = Number(process.env.SEO_AUDIT_URL_LIMIT || 250)
const REDIRECT_LIMIT = Number(process.env.SEO_AUDIT_REDIRECT_LIMIT || 200)
const RESOLVE_IP = (process.env.SEO_AUDIT_RESOLVE_IP || '').trim()
const trimSlashes = (value = '') => String(value).replace(/^\/+|\/+$/g, '')
const normalizePathOrUrl = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '')
  return `/${trimSlashes(trimmed)}`
}
const PUBLIC_API_BASE_PATH = normalizePathOrUrl(
  process.env.SEO_AUDIT_API_BASE_PATH
    || process.env.NEXT_PUBLIC_API_BASE_PATH
    || `/${trimSlashes(process.env.NEXT_PUBLIC_TENANT_SLUG || 'paramascotasec')}/${trimSlashes(process.env.NEXT_PUBLIC_API_SERVICE_SEGMENT || 'api')}`,
)
const PRODUCTS_ENDPOINT = normalizePathOrUrl(
  process.env.SEO_AUDIT_PRODUCTS_ENDPOINT || `${PUBLIC_API_BASE_PATH}/products`,
)
const LEGACY_URL_PATTERN = /\/(?:product\/default|shop\/breadcrumb1)(?:[?#'"]|$)/i
const OLD_CSS_PATTERN = /\/_next\/static\/css\/app\/page\.css\?v=1777158824991/i
const REMOVED_ROUTE_PREFIXES = ['/product', '/shop', '/blog', '/homepages']
const TRANSACTIONAL_NOINDEX_PATHS = [
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/my-account',
  '/search-result',
]
const REMOVED_ROUTE_PATHS = new Set([
  '/contact',
  '/checkout2',
  '/order-tracking',
  '/compare',
  '/wishlist',
  '/pages/faqs',
  '/pages/store-list',
  '/pages/customer-feedbacks',
  '/pages/coming-soon',
  '/pages/page-not-found',
])
const PUBLIC_TEMPLATE_TEXT_PATTERNS = [
  { id: 'checkout_english', pattern: />\s*Checkout\s*</i },
  { id: 'google_products_title', pattern: /ParaMascotasEC\s+Google\s+Products/i },
  { id: 'ecommerce_alt', pattern: /\bEcommerce\b/i },
  { id: 'customer_service_jsonld', pattern: /customer service/i },
  { id: 'spanish_language_jsonld', pattern: /["']Spanish["']/i },
  { id: 'store_list_template', pattern: /store list|lista de tiendas/i },
  { id: 'customer_feedback_template', pattern: /customer feedback/i },
  { id: 'coming_soon_template', pattern: /coming soon/i },
  { id: 'wishlist_template', pattern: /\bwishlist\b/i },
  { id: 'compare_template', pattern: /\bcompare\b/i },
]
const LLMS_TEXT_PATTERNS = [
  { id: 'pais_without_accent', pattern: /\bPais principal\b/ },
  { id: 'espanol_without_accent', pattern: /\bespanol\b/ },
  { id: 'paginas_without_accent', pattern: /\bPaginas canonicas\b/ },
  { id: 'catalogo_without_accent', pattern: /\bCatalogo\b/ },
  { id: 'politica_without_accent', pattern: /\bPolitica\b/ },
  { id: 'terminos_without_accent', pattern: /\bTerminos\b/ },
  { id: 'guias_without_accent', pattern: /\bGuias\b/ },
  { id: 'envios_without_accent', pattern: /\bEnvios\b/ },
  { id: 'atencion_without_accent', pattern: /\bAtencion\b/ },
  { id: 'double_period', pattern: /\.\./ },
]

const getBaseHostname = () => {
  try {
    return new URL(BASE_URL).hostname
  } catch {
    return ''
  }
}

const setupForcedResolution = () => {
  if (!RESOLVE_IP) return

  const family = net.isIP(RESOLVE_IP)
  const baseHostname = getBaseHostname()
  if (!family || !baseHostname) {
    throw new Error(`SEO_AUDIT_RESOLVE_IP invalido para ${BASE_URL}: ${RESOLVE_IP}`)
  }

  const originalLookup = dns.lookup
  dns.lookup = (hostname, options, callback) => {
    if (hostname === baseHostname) {
      const lookupOptions = typeof options === 'function' ? {} : options || {}
      const lookupCallback = typeof options === 'function' ? options : callback
      if (lookupOptions.all) {
        lookupCallback(null, [{ address: RESOLVE_IP, family }])
      } else {
        lookupCallback(null, RESOLVE_IP, family)
      }
      return
    }

    if (typeof options === 'function') {
      originalLookup.call(dns, hostname, options)
      return
    }
    originalLookup.call(dns, hostname, options, callback)
  }

  if (BASE_URL.startsWith('https:') && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
}

setupForcedResolution()

const absoluteUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${BASE_URL}${value.startsWith('/') ? value : `/${value}`}`
}

const requestUrl = (value) => {
  const absolute = absoluteUrl(value)
  try {
    const target = new URL(absolute)
    const base = new URL(BASE_URL)
    target.protocol = base.protocol
    target.host = base.host
    return target.toString()
  } catch {
    return absolute
  }
}

const stripQueryAndHash = (value) => value.replace(/[?#].*$/, '')

const getInternalPathname = (href) => {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return ''
  }

  try {
    const parsed = new URL(href, BASE_URL)
    const base = new URL(BASE_URL)
    if (parsed.hostname !== base.hostname) return ''
    return parsed.pathname.replace(/\/+$/, '') || '/'
  } catch {
    return ''
  }
}

const isRemovedPublicHref = (href) => {
  const pathname = getInternalPathname(href)
  if (!pathname) return false
  if (REMOVED_ROUTE_PATHS.has(pathname)) return true
  return REMOVED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

const decodeXml = (value = '') =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

const tagValue = (xml, tag) => {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'))
  return decodeXml(match?.[1]?.trim() || '')
}

const fetchText = async (url, options = {}) => {
  const response = await fetch(absoluteUrl(url), options)
  const text = await response.text()
  return { response, text }
}

const fetchJson = async (url) => {
  const { response, text } = await fetchText(url, {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`${absoluteUrl(url)} respondió ${response.status}`)
  }
  return JSON.parse(text)
}

const readProducts = async () => {
  const payload = await fetchJson(PRODUCTS_ENDPOINT)
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.products)) return payload.data.products
  if (Array.isArray(payload?.products)) return payload.products
  return []
}

const readFeed = async () => {
  const { response, text } = await fetchText('/feeds/google-products.xml')
  if (!response.ok) {
    throw new Error(`/feeds/google-products.xml respondió ${response.status}`)
  }

  const items = Array.from(text.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => {
    const item = match[1]
    return {
      id: tagValue(item, 'g:id'),
      title: tagValue(item, 'g:title'),
      link: tagValue(item, 'g:link'),
      image: tagValue(item, 'g:image_link'),
      price: tagValue(item, 'g:price'),
      availability: tagValue(item, 'g:availability'),
      brand: tagValue(item, 'g:brand'),
      itemGroupId: tagValue(item, 'g:item_group_id'),
    }
  })

  return {
    text,
    title: tagValue(text, 'title'),
    items,
  }
}

const readSitemap = async () => {
  const { response, text } = await fetchText('/sitemap.xml')
  if (!response.ok) {
    throw new Error(`/sitemap.xml respondió ${response.status}`)
  }
  return Array.from(text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)).map((match) => decodeXml(match[1].trim()))
}

const readImageSitemap = async () => {
  const { response, text } = await fetchText('/sitemap-images.xml')
  if (!response.ok) {
    throw new Error(`/sitemap-images.xml respondió ${response.status}`)
  }

  const urlBlocks = Array.from(text.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)).map((match) => match[1])
  const imageTags = Array.from(text.matchAll(/<image:image\b[^>]*>/gi))
  const urlsetIsEmpty = /<urlset\b[^>]*>\s*<\/urlset>/i.test(text)
  const entriesMissingLoc = urlBlocks
    .map((block, index) => ({ index: index + 1, loc: tagValue(block, 'loc') }))
    .filter((entry) => !entry.loc)
    .map((entry) => entry.index)
  const entriesMissingImage = urlBlocks
    .map((block, index) => ({
      index: index + 1,
      imageCount: Array.from(block.matchAll(/<image:image\b[^>]*>/gi)).length,
    }))
    .filter((entry) => entry.imageCount === 0)
    .map((entry) => entry.index)

  const errors = [
    urlsetIsEmpty ? 'urlset_empty' : '',
    urlBlocks.length === 0 ? 'missing_url_entries' : '',
    imageTags.length === 0 ? 'missing_image_entries' : '',
    entriesMissingLoc.length ? 'url_entries_missing_loc' : '',
    entriesMissingImage.length ? 'url_entries_missing_image' : '',
  ].filter(Boolean)

  return {
    urlCount: urlBlocks.length,
    imageCount: imageTags.length,
    urlsetIsEmpty,
    entriesMissingLoc,
    entriesMissingImage,
    errors,
  }
}

const readLlmsTxt = async () => {
  const { response, text } = await fetchText('/llms.txt')
  if (!response.ok) {
    throw new Error(`/llms.txt respondió ${response.status}`)
  }
  return text
}

const findPublicTemplateText = (text = '') =>
  PUBLIC_TEMPLATE_TEXT_PATTERNS
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.id)

const findLlmsTextIssues = (text = '') =>
  LLMS_TEXT_PATTERNS
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.id)

const visibleWordCount = (html = '') => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z0-9#]+;/gi, ' ')
  .split(/\s+/)
  .filter((word) => word.length > 2)
  .length

const mapLimit = async (items, limit, worker) => {
  const results = []
  let index = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index
      index += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  })

  await Promise.all(runners)
  return results
}

const checkRedirect = async (link) => {
  try {
    let response = await fetch(requestUrl(link), { method: 'HEAD', redirect: 'manual' })
    if (response.status === 405 || response.status === 403) {
      response = await fetch(requestUrl(link), { method: 'GET', redirect: 'manual' })
    }

    return {
      link,
      status: response.status,
      location: response.headers.get('location') || '',
      redirected: response.status >= 300 && response.status < 400,
    }
  } catch (error) {
    return {
      link,
      status: 0,
      location: '',
      redirected: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const getJsonLdType = (node) => {
  const type = node?.['@type']
  return Array.isArray(type) ? type : type ? [type] : []
}

const hasJsonLdType = (node, type) => getJsonLdType(node).includes(type)

const parseJsonLdScripts = (html) =>
  Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => {
      try {
        return JSON.parse(match[1].trim())
      } catch (error) {
        return {
          __parseError: error instanceof Error ? error.message : String(error),
        }
      }
    })

const flattenJsonLdNodes = (node) => {
  const nodes = []
  const visit = (current) => {
    if (!current || typeof current !== 'object') return
    if (Array.isArray(current)) {
      current.forEach(visit)
      return
    }
    if (Array.isArray(current['@graph'])) {
      current['@graph'].forEach(visit)
    }
    nodes.push(current)
    if (Array.isArray(current.hasVariant)) {
      current.hasVariant.forEach(visit)
    }
  }
  visit(node)
  return nodes
}

const getTopLevelJsonLdNodes = (document) => {
  if (!document || typeof document !== 'object') return []
  if (Array.isArray(document)) return document
  if (Array.isArray(document['@graph'])) return document['@graph']
  return [document]
}

const normalizeOffers = (offers) => {
  if (!offers) return []
  return Array.isArray(offers) ? offers.filter(Boolean) : [offers]
}

const inspectProductStructuredData = (html, url) => {
  const documents = parseJsonLdScripts(html)
  const topLevelNodes = documents.flatMap(getTopLevelJsonLdNodes)
  const nodes = documents.flatMap(flattenJsonLdNodes)
  const productNodes = nodes.filter((node) => hasJsonLdType(node, 'Product'))
  const productGroupNodes = nodes.filter((node) => hasJsonLdType(node, 'ProductGroup'))
  const topLevelProductNodes = topLevelNodes.filter((node) => hasJsonLdType(node, 'Product'))
  const parseErrors = documents.filter((node) => node.__parseError)
  const canonicalProduct = topLevelProductNodes.find((node) => stripQueryAndHash(node.url || '') === stripQueryAndHash(url)) ||
    topLevelProductNodes[0] ||
    productNodes.find((node) => stripQueryAndHash(node.url || '') === stripQueryAndHash(url)) ||
    productNodes[0]
  const productOffers = normalizeOffers(canonicalProduct?.offers)
  const offerOwners = [...productNodes, ...productGroupNodes]
  const allOffers = offerOwners.flatMap((node) => normalizeOffers(node.offers))

  const missingProductFields = [
    !canonicalProduct ? '@type: Product' : '',
    canonicalProduct && !canonicalProduct.name ? 'name' : '',
    canonicalProduct && !canonicalProduct.description ? 'description' : '',
    canonicalProduct && (!canonicalProduct.image || (Array.isArray(canonicalProduct.image) && canonicalProduct.image.length === 0)) ? 'image' : '',
    canonicalProduct && !canonicalProduct.sku ? 'sku' : '',
    canonicalProduct && !canonicalProduct.brand ? 'brand' : '',
    canonicalProduct && productOffers.length === 0 ? 'offers' : '',
    canonicalProduct && !canonicalProduct.url ? 'url' : '',
  ].filter(Boolean)

  const missingOfferFields = [
    productOffers.length > 0 && !productOffers.some((offer) => offer.price || offer.lowPrice) ? 'offers.price/lowPrice' : '',
    productOffers.length > 0 && !productOffers.some((offer) => offer.priceCurrency) ? 'offers.priceCurrency' : '',
    productOffers.length > 0 && !productOffers.some((offer) => offer.availability) ? 'offers.availability' : '',
    productOffers.length > 0 && !productOffers.some((offer) => offer.itemCondition) ? 'offers.itemCondition' : '',
    productOffers.length > 0 && !productOffers.some((offer) => offer.url) ? 'offers.url' : '',
  ].filter(Boolean)

  const offerPolicyIssues = allOffers
    .map((offer, index) => ({
      index,
      type: offer?.['@type'] || '',
      missing: [
        !offer?.shippingDetails ? 'shippingDetails' : '',
        !offer?.hasMerchantReturnPolicy ? 'hasMerchantReturnPolicy' : '',
      ].filter(Boolean),
    }))
    .filter((entry) => entry.missing.length > 0)

  return {
    jsonLdCount: documents.length,
    parseErrorCount: parseErrors.length,
    hasTopLevelProduct: topLevelProductNodes.length > 0,
    hasProduct: productNodes.length > 0,
    hasProductGroup: productGroupNodes.length > 0,
    productCount: productNodes.length,
    productGroupCount: productGroupNodes.length,
    offerCount: allOffers.length,
    missingProductFields,
    missingOfferFields,
    offerPolicyIssues,
  }
}

const checkIndexablePage = async (url) => {
  try {
    const response = await fetch(requestUrl(url), { redirect: 'manual' })
    const text = await response.text()
    const h1Count = Array.from(text.matchAll(/<h1(?:\s|>)/gi)).length
    const canonical = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      text.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ||
      ''
    const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(text) ||
      /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(text)

    return {
      url,
      status: response.status,
      noindex,
      h1Count,
      wordCount: visibleWordCount(text),
      canonical,
      templateTextMatches: findPublicTemplateText(text),
      removedPublicLinks: Array.from(text.matchAll(/href=["']([^"']+)["']/gi))
        .map((match) => match[1])
        .filter((href) => LEGACY_URL_PATTERN.test(href) || isRemovedPublicHref(href)),
      referencesOldCss: OLD_CSS_PATTERN.test(text),
      structuredProduct: url.includes('/productos/') ? inspectProductStructuredData(text, url) : null,
      redirected: response.status >= 300 && response.status < 400,
      location: response.headers.get('location') || '',
    }
  } catch (error) {
    return {
      url,
      status: 0,
      noindex: false,
      h1Count: 0,
      wordCount: 0,
      canonical: '',
      templateTextMatches: [],
      removedPublicLinks: [],
      referencesOldCss: false,
      structuredProduct: null,
      redirected: false,
      location: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const getProductId = (product) => product.id || product.internalId || product.slug || product.name
const hasProductImage = (product) => Boolean(product.thumbImage?.[0] || product.images?.[0])
const getSku = (product) => product.attributes?.sku || product.attributes?.SKU || product.attributes?.code || product.attributes?.codigo
const textLength = (value) => String(value || '').replace(/\s+/g, ' ').trim().length
const hasSeoImageAlt = (product) => {
  if (textLength(product.attributes?.seoImageAlt) >= 20) return true
  return Array.isArray(product.imageMeta) && product.imageMeta.some((image) => textLength(image?.altText) >= 20)
}

const main = async () => {
  const [products, feed, sitemapUrls, imageSitemap, llmsTxt] = await Promise.all([
    readProducts(),
    readFeed(),
    readSitemap(),
    readImageSitemap(),
    readLlmsTxt(),
  ])
  const feedItems = feed.items

  const publicProducts = products.filter((product) => product.published !== false)
  const sitemapSet = new Set(sitemapUrls.map(stripQueryAndHash))
  const feedLinks = feedItems.map((item) => item.link).filter(Boolean)
  const feedCanonicalLinks = Array.from(new Set(feedLinks.map(stripQueryAndHash)))

  const feedRedirectChecks = await mapLimit(
    feedLinks.slice(0, REDIRECT_LIMIT),
    8,
    checkRedirect,
  )

  const sitemapChecks = await mapLimit(
    sitemapUrls.slice(0, URL_LIMIT),
    8,
    checkIndexablePage,
  )
  const transactionalChecks = await mapLimit(
    TRANSACTIONAL_NOINDEX_PATHS,
    4,
    checkIndexablePage,
  )

  const missingProductFields = publicProducts
    .map((product) => ({
      id: getProductId(product),
      name: product.name,
      missing: [
        !hasProductImage(product) ? 'image' : '',
        Number(product.price ?? 0) <= 0 ? 'price' : '',
        Number(product.quantity ?? 0) <= 0 ? 'stock' : '',
        !getSku(product) ? 'sku' : '',
        !product.brand ? 'brand' : '',
        textLength(product.description) < 50 ? 'description' : '',
        textLength(product.attributes?.seoTitle) < 20 || textLength(product.attributes?.seoTitle) > 70 ? 'seoTitle' : '',
        textLength(product.attributes?.seoDescription) < 70 || textLength(product.attributes?.seoDescription) > 160 ? 'seoDescription' : '',
        !hasSeoImageAlt(product) ? 'image_alt' : '',
      ].filter(Boolean),
    }))
    .filter((entry) => entry.missing.length > 0)
  const productStructuredChecks = sitemapChecks.filter((check) => check.structuredProduct)
  const feedItemsMissingRequiredFields = feedItems
    .map((item) => ({
      id: item.id,
      missing: [
        !item.id ? 'g:id' : '',
        !item.title ? 'g:title' : '',
        !item.link ? 'g:link' : '',
        !item.image ? 'g:image_link' : '',
        !item.price ? 'g:price' : '',
        !item.availability ? 'g:availability' : '',
        !item.brand ? 'g:brand' : '',
      ].filter(Boolean),
    }))
    .filter((item) => item.missing.length > 0)

  const report = {
    baseUrl: BASE_URL,
    productsEndpoint: PRODUCTS_ENDPOINT,
    counts: {
      productsApi: products.length,
      publicProducts: publicProducts.length,
      feedItems: feedItems.length,
      sitemapUrls: sitemapUrls.length,
      sitemapProductUrls: sitemapUrls.filter((url) => url.includes('/productos/')).length,
      imageSitemapUrls: imageSitemap.urlCount,
      imageSitemapImages: imageSitemap.imageCount,
      feedItemsWithItemGroupId: feedItems.filter((item) => item.itemGroupId).length,
    },
    feed: {
      title: feed.title,
      templateTextMatches: findPublicTemplateText(feed.text),
      uniqueLinks: new Set(feedLinks).size,
      itemsMissingRequiredFields: feedItemsMissingRequiredFields,
      canonicalLinksMissingFromSitemap: feedCanonicalLinks.filter((link) => !sitemapSet.has(link)),
      linksRedirecting: feedRedirectChecks.filter((check) => check.redirected),
      linkErrors: feedRedirectChecks.filter((check) => check.error || check.status >= 400 || check.status === 0),
    },
    sitemap: {
      checkedUrls: sitemapChecks.length,
      legacyUrls: sitemapUrls.filter((url) => LEGACY_URL_PATTERN.test(url)),
      notFoundOrError: sitemapChecks.filter((check) => check.status >= 400 || check.status === 0),
      redirects: sitemapChecks.filter((check) => check.redirected),
      noindex: sitemapChecks.filter((check) => check.noindex),
      pagesWithMultipleH1: sitemapChecks.filter((check) => check.h1Count > 1),
      missingCanonical: sitemapChecks.filter((check) => check.status === 200 && !check.canonical).map((check) => check.url),
      canonicalMismatches: sitemapChecks
        .filter((check) => check.status === 200 && check.canonical && stripQueryAndHash(check.canonical) !== stripQueryAndHash(check.url))
        .map((check) => ({ url: check.url, canonical: check.canonical })),
      pagesWithRemovedPublicLinks: sitemapChecks
        .filter((check) => check.removedPublicLinks?.length > 0)
        .map((check) => ({ url: check.url, removedPublicLinks: check.removedPublicLinks })),
      pagesReferencingOldCss: sitemapChecks
        .filter((check) => check.referencesOldCss)
        .map((check) => check.url),
      pagesWithTemplateText: sitemapChecks
        .filter((check) => check.templateTextMatches?.length > 0)
        .map((check) => ({ url: check.url, matches: check.templateTextMatches })),
      thinIndexablePages: sitemapChecks
        .filter((check) => check.status === 200 && !check.noindex && check.wordCount > 0 && check.wordCount < 60)
        .map((check) => ({ url: check.url, wordCount: check.wordCount })),
    },
    transactionalNoindex: {
      checkedUrls: transactionalChecks.length,
      notFoundOrError: transactionalChecks.filter((check) => check.status >= 400 || check.status === 0),
      missingNoindex: transactionalChecks.filter((check) => check.status === 200 && !check.noindex).map((check) => check.url),
      pagesWithTemplateText: transactionalChecks
        .filter((check) => check.templateTextMatches?.length > 0)
        .map((check) => ({ url: check.url, matches: check.templateTextMatches })),
    },
    llms: {
      issues: findLlmsTextIssues(llmsTxt),
      templateTextMatches: findPublicTemplateText(llmsTxt),
    },
    imageSitemap,
    structuredData: {
      productPagesChecked: productStructuredChecks.length,
      productPagesWithTopLevelProduct: productStructuredChecks.filter((check) => check.structuredProduct.hasTopLevelProduct).length,
      productPagesWithProductGroup: productStructuredChecks.filter((check) => check.structuredProduct.hasProductGroup).length,
      productPagesWithoutProduct: productStructuredChecks
        .filter((check) => !check.structuredProduct.hasProduct)
        .map((check) => check.url),
      productPagesWithoutTopLevelProduct: productStructuredChecks
        .filter((check) => !check.structuredProduct.hasTopLevelProduct)
        .map((check) => check.url),
      productJsonLdParseErrors: productStructuredChecks
        .filter((check) => check.structuredProduct.parseErrorCount > 0)
        .map((check) => ({ url: check.url, parseErrorCount: check.structuredProduct.parseErrorCount })),
      productPagesMissingFields: productStructuredChecks
        .filter((check) => check.structuredProduct.missingProductFields.length > 0 || check.structuredProduct.missingOfferFields.length > 0)
        .map((check) => ({
          url: check.url,
          missing: [
            ...check.structuredProduct.missingProductFields,
            ...check.structuredProduct.missingOfferFields,
          ],
        })),
      productOfferPolicyIssues: productStructuredChecks
        .filter((check) => check.structuredProduct.offerPolicyIssues.length > 0)
        .map((check) => ({
          url: check.url,
          offerPolicyIssues: check.structuredProduct.offerPolicyIssues,
        })),
    },
    products: {
      missingFieldCount: missingProductFields.length,
      missingFields: missingProductFields,
    },
  }

  const failures = [
    imageSitemap.errors.length > 0 ? 'image_sitemap_errors' : '',
    report.feed.templateTextMatches.length > 0 ? 'feed_template_text' : '',
    report.feed.itemsMissingRequiredFields.length > 0 ? 'feed_items_missing_required_fields' : '',
    report.feed.canonicalLinksMissingFromSitemap.length > 0 ? 'feed_canonical_links_missing_from_sitemap' : '',
    report.feed.linksRedirecting.length > 0 ? 'feed_links_redirecting' : '',
    report.feed.linkErrors.length > 0 ? 'feed_link_errors' : '',
    report.sitemap.notFoundOrError.length > 0 ? 'sitemap_not_found_or_errors' : '',
    report.sitemap.redirects.length > 0 ? 'sitemap_redirects' : '',
    report.sitemap.noindex.length > 0 ? 'sitemap_noindex' : '',
    report.sitemap.missingCanonical.length > 0 ? 'sitemap_missing_canonical' : '',
    report.sitemap.canonicalMismatches.length > 0 ? 'sitemap_canonical_mismatches' : '',
    report.sitemap.pagesWithRemovedPublicLinks.length > 0 ? 'sitemap_links_removed_public_routes' : '',
    report.sitemap.pagesWithTemplateText.length > 0 ? 'sitemap_template_text' : '',
    report.sitemap.thinIndexablePages.length > 0 ? 'sitemap_thin_indexable_pages' : '',
    report.transactionalNoindex.notFoundOrError.length > 0 ? 'transactional_pages_not_found_or_errors' : '',
    report.transactionalNoindex.missingNoindex.length > 0 ? 'transactional_pages_missing_noindex' : '',
    report.transactionalNoindex.pagesWithTemplateText.length > 0 ? 'transactional_template_text' : '',
    report.llms.issues.length > 0 ? 'llms_text_quality' : '',
    report.llms.templateTextMatches.length > 0 ? 'llms_template_text' : '',
    report.structuredData.productPagesWithoutProduct.length > 0 ? 'product_jsonld_missing' : '',
    report.structuredData.productJsonLdParseErrors.length > 0 ? 'product_jsonld_parse_errors' : '',
    report.structuredData.productPagesMissingFields.length > 0 ? 'product_jsonld_missing_fields' : '',
    report.structuredData.productOfferPolicyIssues.length > 0 ? 'product_offer_policy_issues' : '',
    report.products.missingFieldCount > 0 ? 'public_products_missing_required_seo_fields' : '',
  ].filter(Boolean)

  report.failures = failures

  console.log(JSON.stringify(report, null, 2))
  if (failures.length > 0) {
    console.error(`SEO audit failed: ${failures.join(', ')}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
