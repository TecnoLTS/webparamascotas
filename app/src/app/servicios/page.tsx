import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import MenuPet from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { SEO_SERVICE_PAGES } from '@/data/seoServices'
import { fetchProducts } from '@/lib/products'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import { toCanonicalUrl } from '@/lib/publicUrl'
import { getPublicProductCategories } from '@/lib/api/settings'
import type { ProductType } from '@/type/ProductType'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Servicios para mascotas en Ecuador',
    description: 'Servicios de ParaMascotasEC para compra online, envios, atencion por WhatsApp y ayuda para elegir productos para perros y gatos.',
    alternates: {
      canonical: toCanonicalUrl('/servicios'),
    },
  }
}

export default async function ServiciosPage() {
  let products: ProductType[] = []
  let publicCategories: string[] = []

  const [productsResult, categoriesResult] = await Promise.allSettled([
    fetchProducts({ fresh: true }),
    getPublicProductCategories(),
  ])

  if (productsResult.status === 'fulfilled') {
    products = orderProductsFoodFirst(productsResult.value)
  } else {
    console.error('No se pudieron cargar productos para pagina de servicios:', productsResult.reason)
  }

  if (categoriesResult.status === 'fulfilled') {
    publicCategories = categoriesResult.value
  } else {
    console.error('No se pudieron cargar categorias publicas para pagina de servicios:', categoriesResult.reason)
  }

  const availableCategoryIds = buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds

  return (
    <>
      <header id="header" className="relative w-full style-pet">
        <MenuPet props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <main>
        <section className="bg-surface py-12">
          <div className="container max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-secondary">ParaMascotasEC Ecuador</p>
            <h1 className="heading3 mt-2">Servicios para compras de mascotas</h1>
            <p className="mt-4 text-secondary">
              Compra online productos para perros y gatos con paginas claras para envio, atencion y orientacion de compra.
            </p>
          </div>
        </section>
        <section className="py-12">
          <div className="container grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {SEO_SERVICE_PAGES.map((page) => (
              <article key={page.slug} className="min-w-0 rounded-lg border border-line p-5">
                <h2 className="text-title">{page.label}</h2>
                <p className="mt-3 text-sm text-secondary">{page.description}</p>
                <Link className="hover-underline mt-4 inline-block text-sm font-semibold" href={page.path}>
                  Ver servicio
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
