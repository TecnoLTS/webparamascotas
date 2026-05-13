#!/usr/bin/env node

const BASE_URL = (process.env.SEO_AUDIT_BASE_URL || 'https://paramascotasec.com').replace(/\/$/, '')
const URL_LIMIT = Number(process.env.SEO_AUDIT_URL_LIMIT || 250)
const REDIRECT_LIMIT = Number(process.env.SEO_AUDIT_REDIRECT_LIMIT || 200)
const LEGACY_URL_PATTERN = /\/(?:product\/default|shop\/breadcrumb1)(?:[?#'"]|$)/i
const OLD_CSS_PATTERN = /\/_next\/static\/css\/app\/page\.css\?v=1777158824991/i

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
  const payload = await fetchJson('/api/products')
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

  return Array.from(text.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => {
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
}

const readSitemap = async () => {
  const { response, text } = await fetchText('/sitemap.xml')
  if (!response.ok) {
    throw new Error(`/sitemap.xml respondió ${response.status}`)
  }
  return Array.from(text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)).map((match) => decodeXml(match[1].trim()))
}

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
      canonical,
      legacyLinks: Array.from(text.matchAll(/href=["']([^"']+)["']/gi))
        .map((match) => match[1])
        .filter((href) => LEGACY_URL_PATTERN.test(href)),
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
      canonical: '',
      legacyLinks: [],
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

const main = async () => {
  const [products, feedItems, sitemapUrls] = await Promise.all([
    readProducts(),
    readFeed(),
    readSitemap(),
  ])

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
      ].filter(Boolean),
    }))
    .filter((entry) => entry.missing.length > 0)
  const productStructuredChecks = sitemapChecks.filter((check) => check.structuredProduct)

  const report = {
    baseUrl: BASE_URL,
    counts: {
      productsApi: products.length,
      publicProducts: publicProducts.length,
      feedItems: feedItems.length,
      sitemapUrls: sitemapUrls.length,
      sitemapProductUrls: sitemapUrls.filter((url) => url.includes('/productos/')).length,
      feedItemsWithItemGroupId: feedItems.filter((item) => item.itemGroupId).length,
    },
    feed: {
      uniqueLinks: new Set(feedLinks).size,
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
      pagesWithLegacyLinks: sitemapChecks
        .filter((check) => check.legacyLinks?.length > 0)
        .map((check) => ({ url: check.url, legacyLinks: check.legacyLinks })),
      pagesReferencingOldCss: sitemapChecks
        .filter((check) => check.referencesOldCss)
        .map((check) => check.url),
    },
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

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
