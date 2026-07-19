'use client'

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNavOne from '@/components/Header/TopNav/TopNavOne'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { ProductType } from '@/type/ProductType'
import Product from '@/components/Product/Product'
import HandlePagination from '@/components/Other/HandlePagination'
import { buildProductSearchIndex, filterProductsBySearch, sanitizeProductSearchQuery } from '@/lib/productSearch'
import { buildCatalogCategoryCards, sortCatalogProductsByFamily } from '@/lib/catalog'
import { groupCatalogProducts } from '@/lib/catalog'
import { listProductPage } from '@/lib/api/products'

type Props = {
  products: ProductType[]
  error: string | null
  initialQuery: string | null
  publicCategories: string[]
  initialHasMore: boolean
  initialNextCursor: string | null
}

const SearchResultClient = ({
  products: initialProducts,
  error,
  initialQuery,
  publicCategories,
  initialHasMore,
  initialNextCursor,
}: Props) => {
  const [products, setProducts] = useState(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState<string>(initialQuery ?? '')
  const [currentPage, setCurrentPage] = useState(0)
  const productsPerPage = 8
  const router = useRouter()
  const deferredSearchKeyword = useDeferredValue(searchKeyword)

  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialHasMore)
    setNextCursor(initialNextCursor)
  }, [initialHasMore, initialNextCursor, initialProducts])

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await listProductPage({
        pageSize: 48,
        cursor: nextCursor,
        search: initialQuery ?? undefined,
      })
      setProducts((current) => {
        const byId = new Map(current.flatMap((product) => {
          const variants = product.variantOptions?.map((option) => option.product) ?? [product]
          return variants.map((variant) => [variant.id, variant] as const)
        }))
        page.products.forEach((product) => byId.set(product.id, product))
        return groupCatalogProducts(Array.from(byId.values()))
      })
      setHasMore(page.hasMore)
      setNextCursor(page.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, initialQuery, loadingMore, nextCursor])

  const query = sanitizeProductSearchQuery(initialQuery ?? '')
  const activeQuery = sanitizeProductSearchQuery(deferredSearchKeyword)
  const productSearchIndex = useMemo(() => buildProductSearchIndex(products), [products])
  const availableCategoryIds = useMemo(
    () => buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id),
    [products, publicCategories]
  )
  const footerCategoryIds = useMemo(
    () => availableCategoryIds,
    [availableCategoryIds]
  )

  const filteredData = useMemo(() => {
    return sortCatalogProductsByFamily(filterProductsBySearch(products, activeQuery, productSearchIndex))
  }, [activeQuery, productSearchIndex, products])

  const pageCount = Math.ceil(filteredData.length / productsPerPage)
  const offset = currentPage * productsPerPage
  const currentProducts = filteredData.slice(offset, offset + productsPerPage)

  useEffect(() => {
    setCurrentPage(0)
  }, [activeQuery])

  useEffect(() => {
    setSearchKeyword(query)
  }, [query])

  const handlePageChange = (selected: number) => {
    setCurrentPage(selected)
  }

  const handleSearch = (value: string) => {
    const nextQuery = sanitizeProductSearchQuery(value)
    setSearchKeyword(nextQuery)

    if (!nextQuery) {
      router.push('/search-result')
      return
    }

    router.push(`/search-result?query=${encodeURIComponent(nextQuery)}`)
  }

  return (
    <>
      <TopNavOne props="style-one bg-black" slogan="Nuevos clientes ahorran 10% con el codigo GET10" />
      <div id="header" className='relative w-full'>
        <MenuOne props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </div>
      <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
        <div className="container">
          <div className="heading flex flex-col items-center">
            <div className="heading4 text-center">
              {activeQuery
                ? `${filteredData.length} resultados para "${activeQuery}"`
                : `${filteredData.length} productos disponibles`}
            </div>
            <div className="input-block lg:w-1/2 sm:w-3/5 w-full md:h-[52px] h-[44px] sm:mt-8 mt-5">
              <div className='w-full h-full relative'>
                <input
                  type="text"
                  placeholder='Buscar por marca, producto, categoría o SKU'
                  className='caption1 w-full h-full pl-4 md:pr-[150px] pr-32 rounded-xl border border-line'
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                />
                <button
                  className='button-main absolute top-1 bottom-1 right-1 flex items-center justify-center'
                  onClick={() => handleSearch(searchKeyword)}
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
          <div className="list-product-block relative md:pt-10 pt-6">
            <div className="heading6">
              {activeQuery ? `Búsqueda de productos: ${activeQuery}` : 'Búsqueda de productos'}
            </div>
            {error && <div className="py-6 text-secondary">No se pudieron cargar productos.</div>}
            {!error && (
              <>
                <div className="list-product hide-product-sold grid lg:grid-cols-4 sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-5">
                  {currentProducts.length === 0 ? (
                    <div className="no-data-product">No hay productos que coincidan con tu búsqueda.</div>
                  ) : (
                    currentProducts.map((item) => (
                      <Product key={item.id} data={item} type='grid' />
                    ))
                  )}
                </div>

                {pageCount > 1 && (
                  <div className="list-pagination flex items-center justify-center md:mt-10 mt-7">
                    <HandlePagination pageCount={pageCount} onPageChange={handlePageChange} />
                  </div>
                )}
                {hasMore && nextCursor ? (
                  <div className="mt-7 flex justify-center">
                    <button className="button-main" disabled={loadingMore} onClick={() => void loadMore()} type="button">
                      {loadingMore ? 'Cargando…' : 'Cargar más resultados'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}

export default SearchResultClient
