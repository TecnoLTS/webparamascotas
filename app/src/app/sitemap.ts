import type { MetadataRoute } from 'next'
import { fetchProducts } from '@/lib/products'
import {
  getProductSeoPath,
  getBrandSeoPath,
  getSeoBrandNames,
  getDynamicCatalogPages,
  SEO_CATALOG_PAGES,
} from '@/lib/seoUrls'
import { getCanonicalSiteUrl, toCanonicalUrl } from '@/lib/publicUrl'
import { SEO_GUIDES } from '@/data/seoGuides'
import { SEO_SERVICE_PAGES } from '@/data/seoServices'
import type { ProductType } from '@/type/ProductType'
import { getPublicProductCategories } from '@/lib/api/settings'

export const dynamic = 'force-dynamic'

const getValidDate = (value?: string | null) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const getProductLastModified = (product: ProductType) => {
  const variantDates = product.variantOptions
    ?.flatMap((variant) => [variant.product.updatedAt, variant.product.createdAt])
    .map(getValidDate)
    .filter((date): date is Date => Boolean(date)) ?? []

  const productDates = [product.updatedAt, product.createdAt]
    .map(getValidDate)
    .filter((date): date is Date => Boolean(date))

  const latestTime = [...productDates, ...variantDates]
    .reduce((latest, date) => Math.max(latest, date.getTime()), 0)

  return latestTime > 0 ? new Date(latestTime) : new Date()
}

const isIndexableProduct = (product: ProductType) =>
  product.published !== false && Boolean(product.slug || product.id)

const uniqueSitemapEntries = (entries: MetadataRoute.Sitemap) => {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalSiteUrl()
  const generatedAt = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/tienda',
    '/servicios',
    '/guias',
    '/pages/about',
    '/pages/contact',
    '/pages/preguntas-frecuentes',
    '/pages/politica-de-privacidad',
    '/pages/terminos-y-condiciones',
  ].map((path) => ({
    url: toCanonicalUrl(path),
    lastModified: generatedAt,
    changeFrequency: path === '' || path === '/tienda' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/tienda' ? 0.98 : 0.5,
  }))

  const catalogRoutes: MetadataRoute.Sitemap = SEO_CATALOG_PAGES.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: generatedAt,
    changeFrequency: 'daily',
    priority: page.priority,
  }))

  const guideRoutes: MetadataRoute.Sitemap = SEO_GUIDES.map((guide) => ({
    url: `${baseUrl}/guias/${guide.slug}`,
    lastModified: new Date(guide.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.64,
  }))

  const serviceRoutes: MetadataRoute.Sitemap = SEO_SERVICE_PAGES.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(page.updatedAt),
    changeFrequency: 'monthly',
    priority: page.priority,
  }))

  try {
    const [productsResult, categoriesResult] = await Promise.allSettled([
      fetchProducts({ fresh: true }),
      getPublicProductCategories(),
    ])
    const products = (productsResult.status === 'fulfilled' ? productsResult.value : []).filter(isIndexableProduct)
    const publicCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}${getProductSeoPath(product)}`,
      lastModified: getProductLastModified(product),
      changeFrequency: 'weekly',
      priority: String(product.category || '').toLowerCase().includes('alimento') ? 0.82 : 0.72,
    }))

    const brandRoutes: MetadataRoute.Sitemap = getSeoBrandNames(products).map((brand) => ({
      url: `${baseUrl}${getBrandSeoPath(brand)}`,
      lastModified: generatedAt,
      changeFrequency: 'weekly',
      priority: 0.74,
    }))

    const dynamicCatalogRoutes: MetadataRoute.Sitemap = getDynamicCatalogPages(products, publicCategories).map((page) => ({
      url: `${baseUrl}${page.path}`,
      lastModified: generatedAt,
      changeFrequency: 'daily',
      priority: page.priority,
    }))

    return uniqueSitemapEntries([
      ...staticRoutes,
      ...catalogRoutes,
      ...dynamicCatalogRoutes,
      ...brandRoutes,
      ...guideRoutes,
      ...serviceRoutes,
      ...productRoutes,
    ])
  } catch (err) {
    console.error('No se pudo generar sitemap dinamico', err)
    return uniqueSitemapEntries([...staticRoutes, ...catalogRoutes, ...guideRoutes, ...serviceRoutes])
  }
}
