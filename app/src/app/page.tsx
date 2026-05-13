import React from 'react'
import { fetchProducts } from '@/lib/products'
import { Metadata } from 'next'
import { getSiteConfig } from '@/lib/site'
import ParamascotasecHome from '@/tenants/paramascotasec.com/Home'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { toCanonicalUrl } from '@/lib/publicUrl'
import { getPublicBrandLogos, getPublicProductCategoryReferences } from '@/lib/api/settings'

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
    let products = [] as Awaited<ReturnType<typeof fetchProducts>>
    let brandLogos = [] as Awaited<ReturnType<typeof getPublicBrandLogos>>
    let publicCategories = [] as Awaited<ReturnType<typeof getPublicProductCategoryReferences>>
    const [productsResult, brandLogosResult, categoriesResult] = await Promise.allSettled([
        fetchProducts({ fresh: true }),
        getPublicBrandLogos(),
        getPublicProductCategoryReferences(),
    ])

    if (productsResult.status === 'fulfilled') {
        products = orderProductsFoodFirst(productsResult.value)
    } else {
        console.error('No se pudieron cargar productos en HomePet:', productsResult.reason)
    }

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

    return <ParamascotasecHome products={products} brandLogos={brandLogos} publicCategories={publicCategories} />
}
