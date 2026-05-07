import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import CatalogSeoPage from '../CatalogSeoPage'
import { fetchProducts } from '@/lib/products'
import {
  buildDynamicCatalogPageFromProducts,
  getCatalogPageBySlug,
  isCatalogAliasSlug,
  type SeoCatalogPage,
} from '@/lib/seoUrls'
import { toCanonicalUrl } from '@/lib/publicUrl'

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
  const staticPage = getCatalogPageBySlug(slug)
  if (staticPage) return staticPage

  try {
    const products = await fetchProducts({ fresh: true })
    return buildDynamicCatalogPageFromProducts(slug, products)
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
      title: 'Categoria no disponible',
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

  if (isCatalogAliasSlug(slug)) {
    permanentRedirect(page.path)
  }

  return <CatalogSeoPage page={page} searchQueryOverride={query} />
}
