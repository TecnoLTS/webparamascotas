import type { Metadata } from 'next'
import CatalogSeoPage from './CatalogSeoPage'
import { getAllCatalogPage } from '@/lib/seoUrls'
import { toCanonicalUrl } from '@/lib/publicUrl'

export const dynamic = 'force-dynamic'

type SearchParams = {
  query?: string | string[]
}

type Props = {
  searchParams?: Promise<SearchParams>
}

export async function generateMetadata(): Promise<Metadata> {
  const page = getAllCatalogPage()

  return {
    title: page.title,
    description: page.description,
    keywords: ['tienda de mascotas Ecuador', 'para mascotas', 'alimento para perros', 'alimento para gatos', 'accesorios para mascotas'],
    alternates: {
      canonical: toCanonicalUrl('/tienda'),
    },
  }
}

export default async function TiendaPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const query = typeof resolvedSearchParams?.query === 'string' ? resolvedSearchParams.query : null

  return <CatalogSeoPage page={getAllCatalogPage()} searchQueryOverride={query} />
}
