import React from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import MenuPet from '@/components/Header/Menu/MenuPet'
import ShopBreadCrumb1 from '@/components/Shop/ShopBreadCrumb1'
import Footer from '@/components/Footer/Footer'
import { fetchProducts } from '@/lib/products'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import {
  generateBreadcrumbJsonLd,
  generateFaqJsonLd,
  generateItemListJsonLd,
} from '@/lib/seo'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'
import {
  getAllCatalogPage,
  getCatalogPagePath,
  getProductSeoPath,
  type SeoCatalogPage,
} from '@/lib/seoUrls'
import { getPublicProductCategories } from '@/lib/api/settings'
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

type CatalogSeoLink = {
  label: string
  href: string
}

const CATALOG_LINKS_BY_SLUG: Record<string, CatalogSeoLink[]> = {
  tienda: [
    { label: 'Productos para perros', href: '/tienda/perros' },
    { label: 'Productos para gatos', href: '/tienda/gatos' },
    { label: 'Alimento para mascotas', href: '/tienda/alimento' },
  ],
  alimento: [
    { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
    { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
    { label: 'Guías de alimento', href: '/guias' },
  ],
  'alimento-perros': [
    { label: 'Comida húmeda para perros', href: '/tienda/comida-humeda-perros' },
    { label: 'Snacks para perros', href: '/tienda/snacks-perros' },
    { label: 'Productos para perros', href: '/tienda/perros' },
  ],
  'alimento-gatos': [
    { label: 'Comida húmeda para gatos', href: '/tienda/comida-humeda-gatos' },
    { label: 'Snacks para gatos', href: '/tienda/snacks-gatos' },
    { label: 'Guía de alimento para gatos', href: '/guias/alimento-para-gatos-adultos' },
  ],
  perros: [
    { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
    { label: 'Juguetes para perros', href: '/tienda/juguetes-perros' },
    { label: 'Accesorios para perros', href: '/tienda/accesorios-perros' },
  ],
  gatos: [
    { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
    { label: 'Comida húmeda para gatos', href: '/tienda/comida-humeda-gatos' },
    { label: 'Juguetes para gatos', href: '/tienda/juguetes-gatos' },
  ],
  'snacks-perros': [
    { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
    { label: 'Juguetes para perros', href: '/tienda/juguetes-perros' },
    { label: 'Productos para perros', href: '/tienda/perros' },
  ],
  'snacks-gatos': [
    { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
    { label: 'Comida húmeda para gatos', href: '/tienda/comida-humeda-gatos' },
    { label: 'Juguetes para gatos', href: '/tienda/juguetes-gatos' },
  ],
  'juguetes-perros': [
    { label: 'Productos para perros', href: '/tienda/perros' },
    { label: 'Accesorios para perros', href: '/tienda/accesorios-perros' },
    { label: 'Snacks para perros', href: '/tienda/snacks-perros' },
  ],
  'juguetes-gatos': [
    { label: 'Productos para gatos', href: '/tienda/gatos' },
    { label: 'Accesorios para gatos', href: '/tienda/accesorios-gatos' },
    { label: 'Snacks para gatos', href: '/tienda/snacks-gatos' },
  ],
  'productos-mascotas-quito': [
    { label: 'Tienda de mascotas Quito', href: '/tienda/tienda-mascotas-quito' },
    { label: 'Alimento para perros', href: '/tienda/alimento-perros' },
    { label: 'Alimento para gatos', href: '/tienda/alimento-gatos' },
  ],
  'tienda-mascotas-quito': [
    { label: 'Productos para mascotas Quito', href: '/tienda/productos-mascotas-quito' },
    { label: 'Productos para perros', href: '/tienda/perros' },
    { label: 'Productos para gatos', href: '/tienda/gatos' },
  ],
  accesorios: [
    { label: 'Accesorios para perros', href: '/tienda/accesorios-perros' },
    { label: 'Accesorios para gatos', href: '/tienda/accesorios-gatos' },
    { label: 'Productos para mascotas', href: '/tienda' },
  ],
  ropa: [
    { label: 'Ropa para perros', href: '/tienda/ropa-perros' },
    { label: 'Productos para perros', href: '/tienda/perros' },
    { label: 'Ofertas para mascotas', href: '/tienda/ofertas' },
  ],
  salud: [
    { label: 'Higiene para mascotas', href: '/tienda/higiene' },
    { label: 'Productos para perros', href: '/tienda/perros' },
    { label: 'Productos para gatos', href: '/tienda/gatos' },
  ],
  ofertas: [
    { label: 'Alimento para mascotas', href: '/tienda/alimento' },
    { label: 'Productos para perros', href: '/tienda/perros' },
    { label: 'Productos para gatos', href: '/tienda/gatos' },
  ],
}

const getCatalogSeoLinks = (page: SeoCatalogPage): CatalogSeoLink[] => {
  const directLinks = CATALOG_LINKS_BY_SLUG[page.slug]
  if (directLinks) return directLinks

  if (page.gender === 'dog') {
    return CATALOG_LINKS_BY_SLUG.perros
  }

  if (page.gender === 'cat') {
    return CATALOG_LINKS_BY_SLUG.gatos
  }

  return [
    { label: 'Tienda completa', href: '/tienda' },
    { label: 'Alimento para mascotas', href: '/tienda/alimento' },
    { label: 'Guías de compra', href: '/guias' },
  ]
}

const CatalogSeoGuide = ({ page, links }: { page: SeoCatalogPage; links: CatalogSeoLink[] }) => (
  <section className="bg-surface py-12 md:py-14">
    <div className="container">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-secondary">Guía de compra</p>
          <h1 className="heading4 mt-2">{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-secondary">{page.intro}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {links.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-title transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)]"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {page.highlights.slice(0, 3).map((highlight) => (
              <div key={highlight} className="rounded-lg bg-white px-4 py-4 text-sm leading-6 text-secondary">
                {highlight}
              </div>
            ))}
          </div>
        </div>

        {page.faqs.length > 0 ? (
          <div>
            <h2 className="heading5">Preguntas frecuentes</h2>
            <div className="mt-4 space-y-3">
              {page.faqs.slice(0, 3).map((faq, index) => (
                <details key={faq.question} className="rounded-lg border border-line bg-white px-4 py-3" open={index === 0}>
                  <summary className="cursor-pointer list-none text-sm font-semibold text-title">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-secondary">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  </section>
)

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
  let publicCategories: string[] = []

  const [productsResult, categoriesResult] = await Promise.allSettled([
    fetchProducts({ fresh: true }),
    getPublicProductCategories(),
  ])

  if (productsResult.status === 'fulfilled') {
    products = orderProductsFoodFirst(productsResult.value)
  } else {
    console.error('No se pudieron cargar productos para la pagina SEO de catalogo:', productsResult.reason)
  }

  if (categoriesResult.status === 'fulfilled') {
    publicCategories = categoriesResult.value
  } else {
    console.error('No se pudieron cargar categorias publicas para la tienda:', categoriesResult.reason)
  }

  const availableCategoryIds = buildCatalogCategoryCards(products, undefined, { referenceCategories: publicCategories }).map((category) => category.id)
  const footerCategoryIds = availableCategoryIds
  const effectivePage = {
    ...page,
    searchQuery: searchQueryOverride ?? page.searchQuery ?? undefined,
  }
  const seoLinks = getCatalogSeoLinks(page)
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
  const faqJsonLd = page.faqs.length > 0 ? generateFaqJsonLd(page.faqs.slice(0, 3)) : null

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
      {faqJsonLd ? (
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
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
          categoryIds={availableCategoryIds}
        />
      )}
      <CatalogSeoGuide page={page} links={seoLinks} />
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}
