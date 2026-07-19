import React from 'react'
import SearchResultClient from './SearchResultClient'
import { loadProducts } from '@/lib/products.server'
import { getPublicProductCategories } from '@/lib/api/settings'

type SearchParams = {
    query?: string | string[]
}

export const dynamic = 'force-dynamic'

export default async function SearchResult({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    const resolvedSearchParams = await searchParams
    const query = typeof resolvedSearchParams?.query === 'string' ? resolvedSearchParams.query : null
    const [productsResult, categoriesResult] = await Promise.allSettled([
        loadProducts({ search: query ?? undefined, pageSize: 48 }),
        getPublicProductCategories(),
    ])
    const { products, error, hasMore, nextCursor } = productsResult.status === 'fulfilled'
        ? productsResult.value
        : { products: [], error: 'No se pudieron cargar productos.', hasMore: false, nextCursor: null }
    const publicCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []

    return (
        <SearchResultClient
            products={products}
            error={error}
            initialQuery={query}
            publicCategories={publicCategories}
            initialHasMore={hasMore}
            initialNextCursor={nextCursor}
        />
    )
}
