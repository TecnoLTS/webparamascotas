'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { PetCategoryCard } from '@/data/petCategoryCards'
import type { ProductBrandReference } from '@/lib/productReferenceData'

const BenefitsPlaceholder = () => (
    <div
        aria-hidden="true"
        className="min-h-[1380px] bg-white sm:min-h-[1240px] lg:min-h-[960px]"
        data-home-deferred-placeholder="benefits"
    />
)

const DiscoveryPlaceholder = () => (
    <div
        aria-hidden="true"
        className="min-h-[640px] bg-white sm:min-h-[820px] lg:min-h-[900px]"
        data-home-deferred-placeholder="discovery"
    />
)

const Benefit = dynamic(() => import('@/components/Pet/Benefit'), {
    ssr: false,
    loading: () => (
        <div aria-hidden="true" className="min-h-[500px] bg-white sm:min-h-[420px] lg:min-h-[240px]" />
    ),
})

const ChooseUs = dynamic(() => import('@/components/Pet/ChooseUs'), {
    ssr: false,
    loading: () => (
        <div aria-hidden="true" className="min-h-[880px] bg-white sm:min-h-[820px] lg:min-h-[720px]" />
    ),
})

const Collection2 = dynamic(() => import('@/components/Pet/Collection2'), {
    ssr: false,
    loading: () => (
        <div aria-hidden="true" className="min-h-[480px] bg-white sm:min-h-[650px] lg:min-h-[720px]" />
    ),
})

const Brand = dynamic(() => import('@/components/Pet/Brand'), {
    ssr: false,
    loading: () => (
        <div aria-hidden="true" className="min-h-[160px] bg-white sm:min-h-[170px] lg:min-h-[180px]" />
    ),
})

const useDeferredHomeSection = (rootMargin: string) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [shouldRender, setShouldRender] = useState(false)

    useEffect(() => {
        const target = containerRef.current
        if (!target || shouldRender) return

        if (!('IntersectionObserver' in window)) {
            setShouldRender(true)
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return
                setShouldRender(true)
                observer.disconnect()
            },
            { rootMargin },
        )

        observer.observe(target)
        return () => observer.disconnect()
    }, [rootMargin, shouldRender])

    return { containerRef, shouldRender }
}

export const DeferredHomeBenefits = () => {
    const { containerRef, shouldRender } = useDeferredHomeSection('1000px 0px')

    return (
        <div ref={containerRef} data-home-deferred-section="benefits">
            {shouldRender ? (
                <>
                    <Benefit props="md:py-10 py-5" />
                    <ChooseUs />
                </>
            ) : <BenefitsPlaceholder />}
        </div>
    )
}

export const DeferredHomeDiscovery = ({
    brandLogos,
    categories,
}: {
    brandLogos: ProductBrandReference[]
    categories: PetCategoryCard[]
}) => {
    const { containerRef, shouldRender } = useDeferredHomeSection('1000px 0px')

    return (
        <div ref={containerRef} data-home-deferred-section="discovery">
            {shouldRender ? (
                <>
                    <Collection2 categories={categories} />
                    <Brand brandReferences={brandLogos} />
                </>
            ) : <DiscoveryPlaceholder />}
        </div>
    )
}
