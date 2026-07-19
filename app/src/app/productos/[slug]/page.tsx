import React from 'react'
import type { Metadata, ResolvingMetadata } from 'next'
import { headers } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Default from '@/components/Product/Detail/Default'
import Footer from '@/components/Footer/Footer'
import { loadProductFamily } from '@/lib/products.server'
import { buildCatalogCategoryCards, getProductDetailRouteId, getProductVariants } from '@/lib/catalog'
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
import { getPublicProductCategories } from '@/lib/api/settings'
import { getProductReviews } from '@/lib/api/productReviews'

type Params = {
  slug: string
}

type SearchParams = {
  variant?: string | string[]
}

type Props = {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}

export const dynamic = 'force-dynamic'

const getVariantParam = (value?: string | string[]) => {
  const variant = Array.isArray(value) ? value[0] : value
  return typeof variant === 'string' && variant.trim() ? variant.trim() : ''
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const { products } = await loadProductFamily(slug)
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

export default async function SeoProductPage({ params, searchParams }: Props) {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const requestedVariant = getVariantParam(resolvedSearchParams.variant)
  const [productsResult, categoriesResult] = await Promise.allSettled([
    loadProductFamily(slug),
    getPublicProductCategories(),
  ])
  const { products: productsWithSettings } = productsResult.status === 'fulfilled'
    ? productsResult.value
    : { products: [] }
  const publicCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
  const currentProduct = findCatalogProductForSeoSlug(productsWithSettings, slug)

  if (!currentProduct) {
    notFound()
  }

  const canonicalPath = getProductSeoPath(currentProduct)
  if (slug !== getProductSeoSlug(currentProduct)) {
    permanentRedirect(canonicalPath)
  }

  const baseUrl = getCanonicalSiteUrl()
  const selectedVariant = requestedVariant
    ? getProductVariants(currentProduct).find((variant) =>
      variant.id === requestedVariant ||
      variant.internalId === requestedVariant ||
      variant.slug === requestedVariant
    )
    : undefined
  const productId = selectedVariant
    ? getProductDetailRouteId(selectedVariant)
    : getProductDetailRouteId(currentProduct)
  const availableCategoryIds = buildCatalogCategoryCards([], undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds
  const reviewProduct = selectedVariant ?? currentProduct
  const reviewData = await getProductReviews(reviewProduct.internalId || reviewProduct.id || reviewProduct.slug)
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Tienda', url: `${baseUrl}/tienda` },
    { name: currentProduct.name, url: `${baseUrl}${canonicalPath}` },
  ])

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateProductJsonLd(currentProduct, {
            baseUrl,
            brandName: 'ParaMascotasEC',
            reviews: reviewData.reviews,
            reviewSummary: reviewData.summary,
          })),
        }}
      />
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-white" availableCategoryIds={availableCategoryIds} />
      </div>
      <Default data={productsWithSettings} productId={productId} reviews={reviewData.reviews} reviewSummary={reviewData.summary} />
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
