import { unstable_cache } from 'next/cache'
import { getProduct, listProductPage, type ProductPageFilters } from '@/lib/api/products'
import { getProductPageSettings } from '@/lib/api/settings'
import { groupCatalogProducts } from '@/lib/catalog'
import { orderProductsFoodFirst } from '@/lib/shopProductOrdering'
import { ProductType } from '@/type/ProductType'

export type ProductsLoadResult = {
  products: ProductType[]
  error: string | null
  nextCursor: string | null
  hasMore: boolean
  pageSettings?: ProductPageSettings
}

type ProductPageSettings = {
  deliveryEstimate: string
  viewerCount: number
  freeShippingThreshold: number
  supportHours: string
  returnDays: number
}

type LoadProductsOptions = ProductPageFilters & {
  fresh?: boolean
  pageSize?: number
  cursor?: string | null
}

const defaultProductPageSettings: ProductPageSettings = {
  deliveryEstimate: '14 de enero - 18 de enero',
  viewerCount: 38,
  freeShippingThreshold: 75,
  supportHours: '8:30 AM a 10:00 PM',
  returnDays: 100,
}

const getCachedProductPageSettings = unstable_cache(
  async () => getProductPageSettings().catch(() => defaultProductPageSettings),
  ['catalog-product-page-settings'],
  { revalidate: 300, tags: ['catalog-product-page-settings'] },
)

const attachSettings = (products: ProductType[], settings: ProductPageSettings) =>
  orderProductsFoodFirst(groupCatalogProducts(products))
    .map((product) => ({ ...product, pageSettings: settings }))

/** Loads exactly one bounded public cursor page. */
export const loadProducts = async (options: LoadProductsOptions = {}): Promise<ProductsLoadResult> => {
  try {
    const [page, settings] = await Promise.all([
      listProductPage({
        cache: options.fresh ? 'no-store' : undefined,
        pageSize: options.pageSize ?? 48,
        cursor: options.cursor,
        search: options.search,
        category: options.category,
        productType: options.productType,
        gender: options.gender,
        brandSlug: options.brandSlug,
        variantGroup: options.variantGroup,
        ids: options.ids,
        saleOnly: options.saleOnly,
      }),
      getCachedProductPageSettings(),
    ])
    return {
      products: attachSettings(page.products, settings),
      error: null,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      pageSettings: settings,
    }
  } catch (err: unknown) {
    return {
      products: [],
      error: err instanceof Error ? err.message : 'Error al cargar productos',
      nextCursor: null,
      hasMore: false,
    }
  }
}

/** Resolves one SEO route and only its explicit variant family. */
export const loadProductFamily = async (routeIdOrSlug: string): Promise<ProductsLoadResult> => {
  try {
    const [product, settings] = await Promise.all([
      getProduct(routeIdOrSlug),
      getCachedProductPageSettings(),
    ])
    const variantGroup = String(product.variantGroupKey ?? product.attributes?.variantGroupKey ?? '').trim()
    const familyPage = variantGroup && !variantGroup.startsWith('single:')
      ? await listProductPage({ pageSize: 100, variantGroup, cache: 'no-store' })
      : { products: [product], nextCursor: null, hasMore: false }

    return {
      products: attachSettings(familyPage.products, settings),
      error: null,
      nextCursor: familyPage.nextCursor,
      hasMore: familyPage.hasMore,
      pageSettings: settings,
    }
  } catch (err: unknown) {
    return {
      products: [],
      error: err instanceof Error ? err.message : 'Producto no encontrado',
      nextCursor: null,
      hasMore: false,
    }
  }
}
