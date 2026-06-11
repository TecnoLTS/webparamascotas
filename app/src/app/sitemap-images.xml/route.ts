import { NextResponse } from 'next/server'
import { fetchProducts } from '@/lib/products'
import { getPublicProductCategoryReferences } from '@/lib/api/settings'
import { getCatalogPagePath, getProductSeoPath } from '@/lib/seoUrls'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'
import { getProductImageAlt } from '@/lib/productImageAlt'
import type { ProductType } from '@/type/ProductType'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE_PATH = '/images/collection/home-top/catalogo-completo-para-mascotas-4x5.webp'

const xmlEscape = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const toAbsoluteUrl = (baseUrl: string, value?: string | null) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`
}

const uniqueStrings = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))

const getProductImages = (product: ProductType) =>
  uniqueStrings([
    ...(product.thumbImage ?? []),
    ...(product.images ?? []),
    ...(product.imageMeta?.map((item) => item.url) ?? []),
    ...(product.variantOptions?.flatMap((variant) => [
      ...(variant.product.thumbImage ?? []),
      ...(variant.product.images ?? []),
      ...(variant.product.imageMeta?.map((item) => item.url) ?? []),
    ]) ?? []),
  ])

const renderImage = (loc: string, title: string, caption: string) => [
  '<image:image>',
  `<image:loc>${xmlEscape(loc)}</image:loc>`,
  `<image:title>${xmlEscape(title)}</image:title>`,
  `<image:caption>${xmlEscape(caption)}</image:caption>`,
  '</image:image>',
].join('\n')

const renderUrl = (pageUrl: string, images: string[]) => {
  if (images.length === 0) return ''

  return [
    '<url>',
    `<loc>${xmlEscape(pageUrl)}</loc>`,
    ...images,
    '</url>',
  ].join('\n')
}

const renderProductUrl = (baseUrl: string, product: ProductType) => {
  const images = getProductImages(product)
  if (images.length === 0) return ''
  const pageUrl = `${baseUrl}${getProductSeoPath(product)}`
  const caption = product.description || product.name
  return renderUrl(
    pageUrl,
    images.slice(0, 20).map((image, index) => renderImage(
      toAbsoluteUrl(baseUrl, image),
      getProductImageAlt(product, image, `imagen ${index + 1}`),
      caption,
    )),
  )
}

const renderCategoryUrl = (baseUrl: string, categoryName: string, images: string[]) => {
  if (images.length === 0) return ''
  const pageUrl = `${baseUrl}${getCatalogPagePath(categoryName)}`
  return renderUrl(
    pageUrl,
    images.map((image) => renderImage(
      toAbsoluteUrl(baseUrl, image),
      `${categoryName} para mascotas en ParaMascotasEC`,
      `Productos de ${categoryName} para mascotas en Ecuador`,
    )),
  )
}

const renderFallbackUrl = (baseUrl: string) => renderUrl(
  `${baseUrl}/tienda`,
  [
    renderImage(
      `${baseUrl}${FALLBACK_IMAGE_PATH}`,
      'Catálogo de productos para mascotas en ParaMascotasEC',
      'Alimento, accesorios, salud y cuidado para perros y gatos en Ecuador',
    ),
  ],
)

const logRejectedResult = (label: string, result: PromiseSettledResult<unknown>) => {
  if (result.status === 'rejected') {
    console.error(`No se pudo cargar ${label} para sitemap de imagenes`, result.reason)
  }
}

export async function GET() {
  const baseUrl = getCanonicalSiteUrl()
  const [productsResult, categoryReferencesResult] = await Promise.allSettled([
    fetchProducts({ fresh: true }),
    getPublicProductCategoryReferences(),
  ])

  logRejectedResult('productos', productsResult)
  logRejectedResult('categorias', categoryReferencesResult)

  const products = productsResult.status === 'fulfilled'
    ? productsResult.value.filter((product) => product.published !== false)
    : []
  const productUrls = products.map((product) => renderProductUrl(baseUrl, product)).filter(Boolean)

  const categoryUrls = categoryReferencesResult.status === 'fulfilled'
    ? categoryReferencesResult.value.flatMap((category) => {
      const images = uniqueStrings([
        category.topImageUrl,
        category.featuredImages?.mobilePrimary,
        category.featuredImages?.mobileSecondary,
        category.featuredImages?.desktopPrimary,
        category.featuredImages?.desktopSecondary,
      ])
      if (images.length === 0) return []
      return [renderCategoryUrl(baseUrl, category.name, images)]
    })
    : []

  const sitemapUrls = [...productUrls, ...categoryUrls].filter(Boolean)
  if (sitemapUrls.length === 0) {
    console.error('Sitemap de imagenes sin entradas dinamicas; usando fallback publico.')
    sitemapUrls.push(renderFallbackUrl(baseUrl))
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...sitemapUrls,
    '</urlset>',
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
