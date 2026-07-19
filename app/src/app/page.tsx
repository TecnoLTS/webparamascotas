import React from 'react'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import { getSiteConfig } from '@/lib/site'
import ParamascotasecHome from '@/tenants/paramascotasec.com/Home'
import { toCanonicalUrl } from '@/lib/publicUrl'
import { getPublicBrandLogos, getPublicProductCategoryReferences } from '@/lib/api/settings'
import HomeHeroPreloads from '@/components/Slider/HomeHeroPreloads'
import { generatePetStoreJsonLd, generateWebSiteJsonLd } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
    const site = getSiteConfig()

    return {
        title: {
            absolute: 'ParaMascotasEC: tienda de mascotas online en Ecuador',
        },
        description: 'ParaMascotasEC es una tienda online para mascotas en Ecuador: alimento para perros y gatos, comida humeda, snacks, accesorios, ropa y cuidado.',
        keywords: [
            'ParaMascotasEC',
            'para mascotas ec',
            'para mascotas Ecuador',
            'tienda de mascotas Ecuador',
            'productos para mascotas Ecuador',
            'alimento para perros Ecuador',
            'alimento para gatos Ecuador',
            'comida humeda para perros',
            'comida humeda para gatos',
            'accesorios para mascotas',
        ],
        alternates: {
            canonical: toCanonicalUrl('/'),
        },
    }
}

export const dynamic = 'force-dynamic'

export default async function HomePet() {
    const requestHeaders = await headers()
    const nonce = requestHeaders.get('x-nonce') || undefined
    const site = getSiteConfig()
    let brandLogos = [] as Awaited<ReturnType<typeof getPublicBrandLogos>>
    let publicCategories = [] as Awaited<ReturnType<typeof getPublicProductCategoryReferences>>
    const [brandLogosResult, categoriesResult] = await Promise.allSettled([
        getPublicBrandLogos(),
        getPublicProductCategoryReferences(),
    ])

    if (brandLogosResult.status === 'fulfilled') {
        brandLogos = brandLogosResult.value
    } else {
        console.error('No se pudieron cargar logos de marcas en HomePet:', brandLogosResult.reason)
    }

    if (categoriesResult.status === 'fulfilled') {
        publicCategories = categoriesResult.value
    } else {
        console.error('No se pudieron cargar categorias publicas en HomePet:', categoriesResult.reason)
    }

    return (
        <>
            <HomeHeroPreloads />
            <ParamascotasecHome brandLogos={brandLogos} publicCategories={publicCategories} />
            <script
                nonce={nonce}
                suppressHydrationWarning
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generatePetStoreJsonLd(site)),
                }}
            />
            <script
                nonce={nonce}
                suppressHydrationWarning
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generateWebSiteJsonLd(site)),
                }}
            />
        </>
    )
}
