import React from 'react'
import { fetchProducts } from '@/lib/products'
import { Metadata } from 'next'
import { getSiteConfig } from '@/lib/site'
import ParamascotasecHome from '@/tenants/paramascotasec.com/Home'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { toCanonicalUrl } from '@/lib/publicUrl'
import { getPublicBrandLogos } from '@/lib/api/settings'

export async function generateMetadata(): Promise<Metadata> {
    const site = getSiteConfig()

    return {
        title: `${site.name} - Tu Tienda de Mascotas en Ecuador`,
        description: site.description,
        keywords: ['mascotas', 'perros', 'gatos', 'alimento para mascotas', 'Ecuador', 'tienda de mascotas online'],
        alternates: {
            canonical: toCanonicalUrl('/'),
        },
    }
}

export const dynamic = 'force-dynamic'

export default async function HomePet() {
    let products = [] as Awaited<ReturnType<typeof fetchProducts>>
    let brandLogos = [] as Awaited<ReturnType<typeof getPublicBrandLogos>>
    const [productsResult, brandLogosResult] = await Promise.allSettled([
        fetchProducts({ fresh: true }),
        getPublicBrandLogos(),
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

    return <ParamascotasecHome products={products} brandLogos={brandLogos} />
}
