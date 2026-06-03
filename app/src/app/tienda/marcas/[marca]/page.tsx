import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import MenuPet from '@/components/Header/Menu/MenuPet'
import ShopBreadCrumb1 from '@/components/Shop/ShopBreadCrumb1'
import Footer from '@/components/Footer/Footer'
import { fetchProducts } from '@/lib/products'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import {
  findBrandBySlug,
  getBrandLandingCopy,
  getBrandSeoPath,
  getProductSeoPath,
  matchesBrandLanding,
} from '@/lib/seoUrls'
import {
  generateBreadcrumbJsonLd,
  generateFaqJsonLd,
  generateItemListJsonLd,
} from '@/lib/seo'
import { getCanonicalSiteUrl, toCanonicalUrl } from '@/lib/publicUrl'
import type { ProductType } from '@/type/ProductType'
import { getPublicProductCategories } from '@/lib/api/settings'

type Params = {
  marca: string
}

type Props = {
  params: Promise<Params>
}

export const dynamic = 'force-dynamic'

const loadBrandProducts = async (marca: string) => {
  const products = orderProductsFoodFirst(await fetchProducts({ fresh: true }))
  const brand = findBrandBySlug(products, marca)
  const brandProducts = brand
    ? products.filter((product) => matchesBrandLanding(product, brand))
    : []

  return { products, brand, brandProducts }
}

const toAbsoluteImage = (baseUrl: string, image?: string | null) => {
  if (!image) return null
  if (/^https?:\/\//i.test(image)) return image
  return `${baseUrl}${image.startsWith('/') ? image : `/${image}`}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca } = await params

  try {
    const { brand } = await loadBrandProducts(marca)
    if (!brand) {
      return {
        title: 'Marca no disponible',
        robots: { index: false, follow: true },
      }
    }

    const copy = getBrandLandingCopy(brand)
    return {
      title: copy.title,
      description: copy.description,
      alternates: {
        canonical: toCanonicalUrl(getBrandSeoPath(brand)),
      },
      openGraph: {
        title: copy.title,
        description: copy.description,
        url: toCanonicalUrl(getBrandSeoPath(brand)),
        type: 'website',
      },
    }
  } catch {
    return {
      title: 'Marca no disponible',
      robots: { index: false, follow: true },
    }
  }
}

export default async function BrandPage({ params }: Props) {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const { marca } = await params
  let products: ProductType[] = []
  let brandProducts: ProductType[] = []
  let brand: string | null = null
  let publicCategories: string[] = []

  try {
    const [result, categoriesResult] = await Promise.allSettled([
      loadBrandProducts(marca),
      getPublicProductCategories(),
    ])
    if (result.status === 'rejected') {
      throw result.reason
    }
    publicCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
    products = result.value.products
    brand = result.value.brand
    brandProducts = result.value.brandProducts
  } catch (error) {
    console.error('No se pudieron cargar productos para marca SEO:', error)
  }

  if (!brand || brandProducts.length === 0) {
    notFound()
  }

  const copy = getBrandLandingCopy(brand)
  const baseUrl = getCanonicalSiteUrl()
  const availableCategoryIds = buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds
  const brandPath = getBrandSeoPath(brand)
  const itemListJsonLd = generateItemListJsonLd(
    brandProducts.slice(0, 24).map((product) => ({
      name: product.name,
      url: `${baseUrl}${getProductSeoPath(product)}`,
      image: toAbsoluteImage(baseUrl, product.thumbImage?.[0] || product.images?.[0]),
    })),
  )
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Tienda', url: `${baseUrl}/tienda` },
    { name: brand, url: `${baseUrl}${brandPath}` },
  ])
  const brandFaqs = [
    {
      question: `¿Puedo comprar ${brand} online en Ecuador?`,
      answer: `Sí. ParaMascotasEC muestra productos ${brand} publicados con precio en USD, fotos, disponibilidad y compra online en Ecuador.`,
    },
    {
      question: `¿Cómo sé si un producto ${brand} es para perro o gato?`,
      answer: 'Cada ficha indica especie, categoría, presentación y disponibilidad para ayudarte a elegir antes de comprar.',
    },
  ]
  const faqJsonLd = generateFaqJsonLd(brandFaqs)

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
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header id="header" className="relative w-full style-pet">
        <MenuPet props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <section className="bg-surface py-10">
        <div className="container max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-secondary">Marca en ParaMascotasEC</p>
          <h1 className="heading3 mt-2">{copy.h1}</h1>
          <p className="mt-4 text-secondary">{copy.intro}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white px-3 py-1">{brandProducts.length} productos publicados</span>
            <span className="rounded-full bg-white px-3 py-1">Perros y gatos</span>
            <span className="rounded-full bg-white px-3 py-1">Compra online en Ecuador</span>
          </div>
        </div>
      </section>
      <ShopBreadCrumb1
        data={brandProducts}
        productPerPage={9}
        dataType={null}
        gender={null}
        category={null}
        categoryIds={availableCategoryIds}
      />
      <section className="pb-12">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
            <div className="rounded-lg border border-line bg-white p-5">
              <h2 className="heading5">{brand} en la tienda online</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
                Revisa productos {brand} publicados con precio en USD, disponibilidad y enlaces hacia categorías relacionadas para perros y gatos.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <Link className="text-[var(--blue)] hover-underline" href="/tienda/alimento-perros">Alimento para perros</Link>
                <Link className="text-[var(--blue)] hover-underline" href="/tienda/alimento-gatos">Alimento para gatos</Link>
                <Link className="text-[var(--blue)] hover-underline" href="/guias">Guías de compra</Link>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-white p-5">
              <h2 className="heading5">Preguntas sobre {brand}</h2>
              <div className="mt-4 space-y-3">
                {brandFaqs.map((faq, index) => (
                  <details key={faq.question} className="rounded-lg bg-surface px-4 py-3" open={index === 0}>
                    <summary className="cursor-pointer list-none text-sm font-semibold text-title">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-secondary">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
