'use client'

import { useCallback, useEffect, useState } from 'react'
import ShopBreadCrumb1 from '@/components/Shop/ShopBreadCrumb1'
import { groupCatalogProducts } from '@/lib/catalog'
import { listProductPage, type ProductPageFilters } from '@/lib/api/products'
import type { ProductType } from '@/type/ProductType'

type Props = {
  initialProducts: ProductType[]
  initialHasMore: boolean
  initialNextCursor: string | null
  filters: ProductPageFilters
  gender: string | null
  category: string | null
  searchQuery?: string | null
  categoryIds?: string[]
}

const flattenVariants = (products: ProductType[]) => products.flatMap((product) =>
  product.variantOptions?.map((option) => option.product) ?? [product]
)

export default function CursorShopCatalog({
  initialProducts,
  initialHasMore,
  initialNextCursor,
  filters,
  gender,
  category,
  searchQuery,
  categoryIds,
}: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialHasMore)
    setNextCursor(initialNextCursor)
    setLoadError(false)
  }, [initialHasMore, initialNextCursor, initialProducts])

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loading) return
    setLoading(true)
    try {
      const page = await listProductPage({
        ...filters,
        pageSize: 48,
        cursor: nextCursor,
      })
      setProducts((current) => {
        const byId = new Map(flattenVariants(current).map((product) => [product.id, product]))
        page.products.forEach((product) => byId.set(product.id, product))
        return groupCatalogProducts(Array.from(byId.values()))
      })
      setHasMore(page.hasMore)
      setNextCursor(page.nextCursor)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [filters, hasMore, loading, nextCursor])

  return (
    <>
      <ShopBreadCrumb1
        data={products}
        productPerPage={9}
        dataType={null}
        gender={gender}
        category={category}
        searchQuery={searchQuery}
        categoryIds={categoryIds}
      />
      {hasMore && nextCursor ? (
        <div className="container flex justify-center pb-10">
          <button className="button-main min-w-[220px]" disabled={loading} onClick={() => void loadMore()} type="button">
            {loading ? 'Cargando…' : 'Cargar más productos'}
          </button>
        </div>
      ) : null}
      {loadError ? (
        <p className="container pb-10 text-center text-sm text-secondary" role="status">
          No se pudo cargar la siguiente página. Puedes intentarlo nuevamente.
        </p>
      ) : null}
    </>
  )
}
