import React from 'react'
import type { Metadata, ResolvingMetadata } from 'next'
import { headers } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Default from '@/components/Product/Detail/Default'
import Footer from '@/components/Footer/Footer'
import { loadProducts } from '@/lib/products.server'
import { buildCatalogCategoryCards, getProductDetailRouteId } from '@/lib/catalog'
import {
  findCatalogProductForSeoSlug,
  getProductSeoDescription,
  getProductSeoPath,
  getProductSeoSlug,
  getProductSeoTitle,
} from '@/lib/seoUrls'
import {
  generateBreadcrumbJsonLd,
  generateProductJsonLd,
} from '@/lib/seo'
import { getCanonicalSiteUrl, toCanonicalUrl } from '@/lib/publicUrl'

type Params = {
  slug: string
}

type Props = {
  params: Promise<Params>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const { products } = await loadProducts({ fresh: true })
  const product = findCatalogProductForSeoSlug(products, slug)

  if (!product) {
    return {
      title: 'Producto no disponible',
      robots: { index: false, follow: true },
    }
  }

  const previousImages = (await parent).openGraph?.images || []
  const image = product.thumbImage?.[0] || product.images?.[0]
  const images = image ? [image, ...previousImages] : previousImages
  const title = getProductSeoTitle(product)
  const description = getProductSeoDescription(product)

  return {
    title,
    description,
    alternates: {
      canonical: toCanonicalUrl(getProductSeoPath(product)),
    },
    openGraph: {
      title,
      description,
      images,
      type: 'website',
      url: toCanonicalUrl(getProductSeoPath(product)),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  }
}

export default async function SeoProductPage({ params }: Props) {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const { slug } = await params
  const { products: productsWithSettings } = await loadProducts({ fresh: true })
  const currentProduct = findCatalogProductForSeoSlug(productsWithSettings, slug)

  if (!currentProduct) {
    notFound()
  }

  const canonicalPath = getProductSeoPath(currentProduct)
  if (slug !== getProductSeoSlug(currentProduct)) {
    permanentRedirect(canonicalPath)
  }

  const baseUrl = getCanonicalSiteUrl()
  const productId = getProductDetailRouteId(currentProduct)
  const availableCategoryIds = buildCatalogCategoryCards(productsWithSettings).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds.filter((categoryId) => categoryId.toLowerCase() !== 'todos')
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Tienda', url: `${baseUrl}/tienda` },
    { name: currentProduct.name, url: `${baseUrl}${canonicalPath}` },
  ])

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateProductJsonLd(currentProduct, {
            baseUrl,
            brandName: 'ParaMascotasEC',
          })),
        }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-white" searchProducts={productsWithSettings} availableCategoryIds={availableCategoryIds} />
      </div>
      <Default data={productsWithSettings} productId={productId} />
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
