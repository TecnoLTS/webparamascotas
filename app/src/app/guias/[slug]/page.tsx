import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import MenuPet from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { SEO_GUIDE_BY_SLUG, SEO_GUIDES } from '@/data/seoGuides'
import { fetchProducts } from '@/lib/products'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import { generateBreadcrumbJsonLd } from '@/lib/seo'
import { getCanonicalSiteUrl, toCanonicalUrl } from '@/lib/publicUrl'
import type { ProductType } from '@/type/ProductType'
import { getPublicProductCategories } from '@/lib/api/settings'

type Params = {
  slug: string
}

type Props = {
  params: Promise<Params>
}

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return SEO_GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = SEO_GUIDE_BY_SLUG.get(slug)

  if (!guide) {
    return {
      title: 'Guia no disponible',
      robots: { index: false, follow: true },
    }
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: toCanonicalUrl(`/guias/${guide.slug}`),
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      url: toCanonicalUrl(`/guias/${guide.slug}`),
    },
  }
}

export default async function SeoGuidePage({ params }: Props) {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const { slug } = await params
  const guide = SEO_GUIDE_BY_SLUG.get(slug)

  if (!guide) {
    notFound()
  }

  let products: ProductType[] = []
  let publicCategories: string[] = []
  try {
    const [productsResult, categoriesResult] = await Promise.allSettled([
      fetchProducts({ fresh: true }),
      getPublicProductCategories(),
    ])
    products = productsResult.status === 'fulfilled' ? productsResult.value : []
    publicCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
  } catch (error) {
    console.error('No se pudieron cargar productos para guia SEO:', error)
  }

  const baseUrl = getCanonicalSiteUrl()
  const availableCategoryIds = buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Guias', url: `${baseUrl}/guias/${guide.slug}` },
    { name: guide.h1, url: `${baseUrl}/guias/${guide.slug}` },
  ])
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    inLanguage: 'es-EC',
    dateModified: guide.updatedAt,
    datePublished: guide.updatedAt,
    mainEntityOfPage: `${baseUrl}/guias/${guide.slug}`,
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
  }

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <header id="header" className="relative w-full style-pet">
        <MenuPet props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <main className="bg-white">
        <article className="container py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-secondary">{guide.audience} · {guide.readingTime}</p>
            <h1 className="heading3 mt-2">{guide.h1}</h1>
            <p className="mt-4 text-lg text-secondary">{guide.intro}</p>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-8">
              {guide.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="heading5">{section.heading}</h2>
                  <p className="mt-3 text-secondary">{section.body}</p>
                </section>
              ))}
            </div>
            <aside className="border-l border-line pl-0 lg:pl-8">
              <h2 className="text-title">Comprar ahora</h2>
              <div className="mt-4 flex flex-col gap-3">
                {guide.relatedLinks.map((link) => (
                  <Link key={link.href} className="hover-underline text-sm font-semibold" href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
              <p className="mt-6 text-sm text-secondary">
                Esta guia es orientativa. Para necesidades medicas, alergias o dietas especiales, consulta con un veterinario.
              </p>
            </aside>
          </div>
        </article>
      </main>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
