import React from 'react'
import { headers } from 'next/headers'
import MenuPet from '@/components/Header/Menu/MenuPet'
import ShopBreadCrumb1 from '@/components/Shop/ShopBreadCrumb1'
import Footer from '@/components/Footer/Footer'
import { fetchProducts } from '@/lib/products'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import {
  generateBreadcrumbJsonLd,
  generateItemListJsonLd,
} from '@/lib/seo'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'
import {
  getAllCatalogPage,
  getCatalogPagePath,
  getProductSeoPath,
  type SeoCatalogPage,
} from '@/lib/seoUrls'
import {
  getCategoryFilter,
  matchesPetCategoryFilter,
} from '@/data/petCategoryCards'
import {
  buildProductSearchIndex,
  matchesProductSearch,
  sanitizeProductSearchQuery,
} from '@/lib/productSearch'
import type { ProductType } from '@/type/ProductType'

const getSeoProductsForPage = (products: ProductType[], page: SeoCatalogPage) => {
  const baseCategoryFilter = page.category ? getCategoryFilter(page.category) : undefined
  const categoryFilter = page.productType
    ? {
      ...(baseCategoryFilter ?? {}),
      productType: page.productType,
      productTypes: [
        ...((baseCategoryFilter as { productTypes?: string[] } | undefined)?.productTypes ?? []),
        page.productType,
      ],
    }
    : baseCategoryFilter
  const sanitizedQuery = sanitizeProductSearchQuery(page.searchQuery ?? '')
  const searchIndex = buildProductSearchIndex(products)

  return products.filter((product) => {
    if (!matchesPetCategoryFilter(product, categoryFilter, { gender: page.gender })) {
      return false
    }

    if (!sanitizedQuery) return true
    return matchesProductSearch(searchIndex.get(product.id) ?? '', sanitizedQuery)
  })
}

const toAbsoluteImage = (baseUrl: string, image?: string | null) => {
  if (!image) return null
  if (/^https?:\/\//i.test(image)) return image
  return `${baseUrl}${image.startsWith('/') ? image : `/${image}`}`
}

type Props = {
  page?: SeoCatalogPage
  searchQueryOverride?: string | null
}

export default async function CatalogSeoPage({ page = getAllCatalogPage(), searchQueryOverride = null }: Props) {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const baseUrl = getCanonicalSiteUrl()
  let products: ProductType[] = []

  try {
    products = orderProductsFoodFirst(await fetchProducts({ fresh: true }))
  } catch (error) {
    console.error('No se pudieron cargar productos para la pagina SEO de catalogo:', error)
  }

  const availableCategoryIds = buildCatalogCategoryCards(products).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds.filter((categoryId) => categoryId.toLowerCase() !== 'todos')
  const effectivePage = {
    ...page,
    searchQuery: searchQueryOverride ?? page.searchQuery ?? undefined,
  }
  const seoProducts = getSeoProductsForPage(products, effectivePage)
  const currentPath = page.path ?? (page.slug === 'tienda' ? '/tienda' : getCatalogPagePath(page.slug))
  const itemListJsonLd = generateItemListJsonLd(
    seoProducts.slice(0, 24).map((product) => ({
      name: product.name,
      url: `${baseUrl}${getProductSeoPath(product)}`,
      image: toAbsoluteImage(baseUrl, product.thumbImage?.[0] || product.images?.[0]),
    })),
  )
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Inicio', url: baseUrl },
    { name: 'Tienda', url: `${baseUrl}/tienda` },
    { name: page.label, url: `${baseUrl}${currentPath}` },
  ])

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <header id="header" className="relative w-full style-pet">
        <MenuPet props="bg-transparent" searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      {!products.length ? (
        <div className="container py-10 text-center">No hay productos disponibles.</div>
      ) : (
        <ShopBreadCrumb1
          data={products}
          productPerPage={9}
          dataType={null}
          gender={effectivePage.gender ?? null}
          category={effectivePage.category ?? null}
          searchQuery={effectivePage.searchQuery ?? null}
        />
      )}
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
