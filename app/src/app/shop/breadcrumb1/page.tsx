import { permanentRedirect } from 'next/navigation'
import { resolveLegacyShopPath } from '@/lib/seoUrls'

type SearchParams = {
  gender?: string | string[]
  category?: string | string[]
  query?: string | string[]
}

type Props = {
  searchParams: Promise<SearchParams>
}

export const dynamic = 'force-dynamic'

export default async function LegacyShopBreadcrumb({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const gender = typeof resolvedSearchParams?.gender === 'string' ? resolvedSearchParams.gender : null
  const category = typeof resolvedSearchParams?.category === 'string' ? resolvedSearchParams.category : null
  const query = typeof resolvedSearchParams?.query === 'string' ? resolvedSearchParams.query : null

  permanentRedirect(resolveLegacyShopPath({ category, gender, query }))
}
