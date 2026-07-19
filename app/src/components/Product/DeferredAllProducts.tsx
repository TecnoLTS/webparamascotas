'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProductType } from '@/type/ProductType'
import { listProductPage } from '@/lib/api/products'
import { groupCatalogProducts } from '@/lib/catalog'

const AllProducts = dynamic(() => import('./AllProducts'), {
    ssr: false,
    loading: () => <AllProductsPlaceholder />,
})

interface Props {
    data?: Array<ProductType>
    categoryIds?: string[]
    pageSize?: number
}

const RemoteAllProducts = ({ categoryIds, pageSize }: Omit<Props, 'data'>) => {
    const [rawProducts, setRawProducts] = useState<ProductType[]>([])
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const products = useMemo(() => groupCatalogProducts(rawProducts), [rawProducts])

    const loadPage = useCallback(async (cursor: string | null) => {
        setLoading(true)
        try {
            const page = await listProductPage({ pageSize: 48, cursor })
            setRawProducts((current) => {
                const byId = new Map(current.map((product) => [product.id, product]))
                page.products.forEach((product) => byId.set(product.id, product))
                return Array.from(byId.values())
            })
            setNextCursor(page.nextCursor)
            setHasMore(page.hasMore)
            setError(null)
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadPage(null)
    }, [loadPage])

    if (loading && rawProducts.length === 0) return <AllProductsPlaceholder />
    if (error && rawProducts.length === 0) {
        return (
            <section className="container pm-catalog md:py-10 py-5" role="status">
                <div className="rounded-2xl border border-line bg-surface px-6 py-10 text-center text-secondary">
                    No pudimos cargar el catálogo. Intenta nuevamente en unos minutos.
                </div>
            </section>
        )
    }
    return (
        <AllProducts
            data={products}
            categoryIds={categoryIds}
            pageSize={pageSize}
            hasMore={hasMore}
            loadingMore={loading}
            onLoadMore={() => nextCursor ? loadPage(nextCursor) : Promise.resolve()}
        />
    )
}

const AllProductsPlaceholder = () => (
    <section className="container pm-catalog md:py-10 py-5" aria-busy="true">
        <div className="pm-catalog__heading heading flex flex-col items-center text-center">
            <div className="heading3 pm-catalog__title">Todos los productos</div>
            <div className="heading6 pm-catalog__subtitle font-normal text-secondary mt-2">
                Explora nuestro catálogo completo
            </div>
        </div>
        <div className="pm-catalog__grid mt-8 grid lg:grid-cols-5 grid-cols-2 sm:gap-[30px] gap-[20px]">
            {Array.from({ length: 10 }).map((_, index) => (
                <div
                    key={index}
                    className="h-[260px] rounded-2xl border border-line bg-surface"
                />
            ))}
        </div>
    </section>
)

export default function DeferredAllProducts({ data, categoryIds, pageSize }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [shouldLoad, setShouldLoad] = useState(false)

    useEffect(() => {
        const target = containerRef.current
        if (!target || shouldLoad) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoad(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '700px 0px' },
        )

        observer.observe(target)

        return () => observer.disconnect()
    }, [shouldLoad])

    return (
        <div ref={containerRef}>
            {shouldLoad
                ? data
                    ? <AllProducts data={data} categoryIds={categoryIds} pageSize={pageSize} />
                    : <RemoteAllProducts categoryIds={categoryIds} pageSize={pageSize} />
                : <AllProductsPlaceholder />}
        </div>
    )
}
