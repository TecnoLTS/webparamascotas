import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CatalogSeoPage from '../CatalogSeoPage'
import { fetchProducts } from '@/lib/products'
import {
  buildDynamicCatalogPageFromProducts,
  getDirectCatalogPageBySlug,
  getCatalogPageBySlug,
  type SeoCatalogPage,
} from '@/lib/seoUrls'
import { toCanonicalUrl } from '@/lib/publicUrl'
import { getPublicProductCategories } from '@/lib/api/settings'

type Params = {
  slug: string
}

type SearchParams = {
  query?: string | string[]
}

type Props = {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}

export const dynamic = 'force-dynamic'

const resolveCatalogPage = async (slug: string): Promise<SeoCatalogPage | null> => {
  const directStaticPage = getDirectCatalogPageBySlug(slug)
  if (directStaticPage) return directStaticPage

  try {
    const [productsResult, categoriesResult] = await Promise.allSettled([
      fetchProducts({ fresh: true }),
      getPublicProductCategories(),
    ])
    const products = productsResult.status === 'fulfilled' ? productsResult.value : []
    const publicCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
    return buildDynamicCatalogPageFromProducts(slug, products, publicCategories) ?? getCatalogPageBySlug(slug)
  } catch (error) {
    console.error('No se pudo resolver categoria SEO dinamica:', error)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await resolveCatalogPage(slug)

  if (!page) {
    return {
      title: 'Categoría no disponible',
      robots: { index: false, follow: true },
    }
  }

  return {
    title: page.title,
    description: page.description,
    keywords: [
      page.h1,
      'tienda de mascotas Ecuador',
      'comprar online mascotas',
      page.label,
    ],
    alternates: {
      canonical: toCanonicalUrl(page.path),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: toCanonicalUrl(page.path),
      type: 'website',
    },
  }
}

export default async function CatalogSlugPage({ params, searchParams }: Props) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const query = typeof resolvedSearchParams?.query === 'string' ? resolvedSearchParams.query : null
  const page = await resolveCatalogPage(slug)

  if (!page) {
    notFound()
  }

  return <CatalogSeoPage page={page} searchQueryOverride={query} />
}
