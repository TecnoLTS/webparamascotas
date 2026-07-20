'use client'

import { useEffect, useState } from 'react'
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
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setProducts(initialProducts)
    setLoadError(false)
    if (!initialHasMore || !initialNextCursor) return

    let cancelled = false
    const loadRemainingPages = async () => {
      const byId = new Map(flattenVariants(initialProducts).map((product) => [product.id, product]))
      const seenCursors = new Set<string>()
      let cursor: string | null = initialNextCursor

      try {
        for (let pageNumber = 0; pageNumber < 100 && cursor; pageNumber += 1) {
          if (seenCursors.has(cursor)) {
            throw new Error('La paginación del catálogo produjo un cursor repetido.')
          }
          seenCursors.add(cursor)

          const page = await listProductPage({
            ...filters,
            pageSize: 48,
            cursor,
          })
          page.products.forEach((product) => byId.set(product.id, product))
          cursor = page.hasMore ? page.nextCursor : null
        }

        if (cursor) {
          throw new Error('El catálogo excedió el máximo seguro de páginas.')
        }

        if (!cancelled) {
          setProducts(groupCatalogProducts(Array.from(byId.values())))
          setLoadError(false)
        }
      } catch {
        if (!cancelled) setLoadError(true)
      }
    }

    void loadRemainingPages()
    return () => {
      cancelled = true
    }
  }, [filters, initialHasMore, initialNextCursor, initialProducts])

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
      {loadError ? (
        <p className="container pb-10 text-center text-sm text-secondary" role="status">
          No se pudo cargar la siguiente página. Puedes intentarlo nuevamente.
        </p>
      ) : null}
    </>
  )
}
