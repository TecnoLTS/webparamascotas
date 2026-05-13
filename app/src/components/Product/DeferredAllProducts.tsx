'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { ProductType } from '@/type/ProductType'

const AllProducts = dynamic(() => import('./AllProducts'), {
    ssr: false,
    loading: () => <AllProductsPlaceholder />,
})

interface Props {
    data: Array<ProductType>
    categoryIds?: string[]
    pageSize?: number
}

const AllProductsPlaceholder = () => (
    <section className="container md:py-10 py-5" aria-busy="true">
        <div className="heading flex flex-col items-center text-center">
            <div className="heading3">Todos los productos</div>
            <div className="heading6 font-normal text-secondary mt-2">
                Explora nuestro catálogo completo
            </div>
        </div>
        <div className="mt-8 grid lg:grid-cols-5 grid-cols-2 sm:gap-[30px] gap-[20px]">
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
            {shouldLoad ? <AllProducts data={data} categoryIds={categoryIds} pageSize={pageSize} /> : <AllProductsPlaceholder />}
        </div>
    )
}
