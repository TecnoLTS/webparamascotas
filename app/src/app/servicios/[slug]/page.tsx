import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import MenuPet from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { SEO_SERVICE_PAGES, getSeoServicePageBySlug } from '@/data/seoServices'
import { fetchProducts } from '@/lib/products'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import { getCanonicalSiteUrl, toCanonicalUrl } from '@/lib/publicUrl'
import { generateBreadcrumbJsonLd, generateFaqJsonLd } from '@/lib/seo'
import { getPublicProductCategories } from '@/lib/api/settings'
import type { ProductType } from '@/type/ProductType'

type Params = {
  slug: string
}

type Props = {
  params: Promise<Params>
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return SEO_SERVICE_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getSeoServicePageBySlug(slug)

  if (!page) {
    return {
      title: 'Servicio no disponible',
      robots: { index: false, follow: true },
    }
  }

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: toCanonicalUrl(page.path),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: toCanonicalUrl(page.path),
      type: 'website',
    },
  }
}

export default async function SeoServicePage({ params }: Props) {
  const { slug } = await params
  const page = getSeoServicePageBySlug(slug)

  if (!page) {
    notFound()
  }

  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const baseUrl = getCanonicalSiteUrl()
  let products: ProductType[] = []
  let publicCategories: string[] = []

  const [productsResult, categoriesResult] = await Promise.allSettled([
    fetchProducts({ fresh: true }),
    getPublicProductCategories(),
  ])

  if (productsResult.status === 'fulfilled') {
    products = orderProductsFoodFirst(productsResult.value)
  } else {
    console.error('No se pudieron cargar productos para pagina de servicio SEO:', productsResult.reason)
  }

  if (categoriesResult.status === 'fulfilled') {
    publicCategories = categoriesResult.value
  } else {
    console.error('No se pudieron cargar categorias publicas para pagina de servicio SEO:', categoriesResult.reason)
  }

  const availableCategoryIds = buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds
  const serviceUrl = `${baseUrl}${page.path}`
  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${serviceUrl}#service`,
    name: page.label,
    serviceType: page.label,
    description: page.description,
    url: serviceUrl,
    provider: {
      '@id': `${baseUrl}/#organization`,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Ecuador',
    },
  }
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Servicios', url: `${baseUrl}/servicios` },
    { name: page.label, url: serviceUrl },
  ])
  const faqJsonLd = generateFaqJsonLd(page.faqs)

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header id="header" className="relative w-full style-pet">
        <MenuPet props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <main>
        <section className="bg-surface py-12">
          <div className="container max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-secondary">Servicio ParaMascotasEC</p>
            <h1 className="heading3 mt-2">{page.h1}</h1>
            <p className="mt-4 text-secondary">{page.intro}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {page.highlights.map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1">{item}</span>
              ))}
            </div>
          </div>
        </section>
        <section className="py-12">
          <div className="container grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="min-w-0">
                <h2 className="text-title">{faq.question}</h2>
                <p className="mt-2 text-sm text-secondary">{faq.answer}</p>
              </article>
            ))}
            <article className="min-w-0">
              <h2 className="text-title">Productos relacionados</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link className="hover-underline" href="/tienda/alimento">Alimento</Link>
                <Link className="hover-underline" href="/tienda/alimento-perros">Perros</Link>
                <Link className="hover-underline" href="/tienda/alimento-gatos">Gatos</Link>
                <Link className="hover-underline" href="/tienda/accesorios">Accesorios</Link>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
