import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import MenuPet from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { SEO_GUIDES } from '@/data/seoGuides'
import { fetchProducts } from '@/lib/products'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import {
  generateBreadcrumbJsonLd,
  generateItemListJsonLd,
} from '@/lib/seo'
import { getCanonicalSiteUrl, toCanonicalUrl } from '@/lib/publicUrl'
import { getPublicProductCategories } from '@/lib/api/settings'
import type { ProductType } from '@/type/ProductType'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Guías de compra para mascotas en Ecuador',
    description: 'Guías breves para elegir alimento, comida húmeda, snacks y productos para perros y gatos en ParaMascotasEC Ecuador.',
    alternates: {
      canonical: toCanonicalUrl('/guias'),
    },
    openGraph: {
      title: 'Guías de compra para mascotas en Ecuador',
      description: 'Consejos prácticos para comprar productos para perros y gatos en ParaMascotasEC.',
      url: toCanonicalUrl('/guias'),
      type: 'website',
    },
  }
}

export default async function GuiasPage() {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  let products: ProductType[] = []
  let publicCategories: string[] = []

  const [productsResult, categoriesResult] = await Promise.allSettled([
    fetchProducts({ fresh: true }),
    getPublicProductCategories(),
  ])

  if (productsResult.status === 'fulfilled') {
    products = orderProductsFoodFirst(productsResult.value)
  } else {
    console.error('No se pudieron cargar productos para indice de guias:', productsResult.reason)
  }

  if (categoriesResult.status === 'fulfilled') {
    publicCategories = categoriesResult.value
  } else {
    console.error('No se pudieron cargar categorias publicas para indice de guias:', categoriesResult.reason)
  }

  const baseUrl = getCanonicalSiteUrl()
  const availableCategoryIds = buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const guideItems = SEO_GUIDES.map((guide) => ({
    name: guide.title,
    url: `${baseUrl}/guias/${guide.slug}`,
  }))
  const itemListJsonLd = generateItemListJsonLd(guideItems)
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Guías de compra', url: `${baseUrl}/guias` },
  ])

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <header id="header" className="relative w-full style-pet">
        <MenuPet props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <main>
        <section className="bg-surface py-10">
          <div className="container max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-secondary">ParaMascotasEC Ecuador</p>
            <h1 className="heading3 mt-2">Guías de compra para mascotas</h1>
            <p className="mt-4 text-secondary">
              Consejos rápidos para elegir alimento, comida húmeda, snacks y productos para perros y gatos sin llenar la tienda de texto innecesario.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-title hover:text-[var(--blue)]" href="/tienda/alimento-perros">
                Alimento para perros
              </Link>
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-title hover:text-[var(--blue)]" href="/tienda/alimento-gatos">
                Alimento para gatos
              </Link>
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-title hover:text-[var(--blue)]" href="/tienda">
                Ver tienda
              </Link>
            </div>
          </div>
        </section>
        <section className="py-12">
          <div className="container grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SEO_GUIDES.map((guide) => (
              <article key={guide.slug} className="min-w-0 rounded-lg border border-line bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-normal text-secondary">{guide.audience} · {guide.readingTime}</p>
                <h2 className="mt-2 text-title">{guide.title}</h2>
                <p className="mt-3 text-sm leading-6 text-secondary">{guide.description}</p>
                <Link className="hover-underline mt-4 inline-block text-sm font-semibold text-[var(--blue)]" href={`/guias/${guide.slug}`}>
                  Leer guía
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer categoryIds={availableCategoryIds} />
    </>
  )
}
