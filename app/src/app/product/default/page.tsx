import { permanentRedirect, redirect } from 'next/navigation'
import { loadProducts } from '@/lib/products.server'
import { findCatalogProductForSeoSlug, getProductSeoPath } from '@/lib/seoUrls'

type SearchParams = {
  id?: string | string[]
}

type Props = {
  searchParams: Promise<SearchParams>
}

export const dynamic = 'force-dynamic'

export default async function LegacyProductDefault({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const id = typeof resolvedSearchParams?.id === 'string' ? resolvedSearchParams.id : ''

  if (!id) {
    redirect('/tienda')
  }

  const { products } = await loadProducts({ fresh: true })
  const product = findCatalogProductForSeoSlug(products, id)

  if (!product) {
    redirect('/tienda')
  }

  permanentRedirect(getProductSeoPath(product))
}
