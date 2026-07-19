import { fetchJson, fetchJsonEnvelope, requestApi } from '@/lib/apiClient'
import { apiEndpoints } from './endpoints'
import { ProductType } from '@/type/ProductType'
import { mapProductToDto, mapProductsToDto } from '@/lib/productMapper'

const CLIENT_PAGE_TTL_MS = 15_000
const clientPageCache = new Map<string, { expiresAt: number; page: ProductPage }>()
const clientPageRequests = new Map<string, Promise<ProductPage>>()

const invalidateClientProductsCache = () => {
  clientPageCache.clear()
  clientPageRequests.clear()
}

type ProductPageMeta = {
  pageSize?: number
  hasMore?: boolean
  nextCursor?: string | null
}

export type ProductPage = {
  products: ProductType[]
  nextCursor: string | null
  hasMore: boolean
}

export type ProductPageFilters = {
  search?: string
  category?: string
  productType?: string
  gender?: 'dog' | 'cat'
  brandSlug?: string
  variantGroup?: string
  ids?: string[]
  saleOnly?: boolean
}

export type ProductPageOptions = ProductPageFilters & {
  cache?: RequestCache
  pageSize?: number
  cursor?: string | null
}

const readPaginationMeta = (meta: Record<string, unknown>): ProductPageMeta => {
  const pagination = meta.pagination
  return pagination && typeof pagination === 'object'
    ? pagination as ProductPageMeta
    : {}
}

export const listProductPage = async (options: ProductPageOptions = {}): Promise<ProductPage> => {
  const pageSize = Math.max(1, Math.min(100, Math.trunc(options.pageSize ?? 48)))
  const cursor = options.cursor ?? null
  const endpoint = apiEndpoints.productPage({
    pageSize,
    cursor: cursor ?? undefined,
    search: options.search,
    category: options.category,
    productType: options.productType,
    gender: options.gender,
    brandSlug: options.brandSlug,
    variantGroup: options.variantGroup,
    ids: options.ids,
    saleOnly: options.saleOnly,
  })
  const cacheKey = endpoint
  const canUseClientCache = typeof window !== 'undefined' && options.cache !== 'no-store'
  const cached = canUseClientCache ? clientPageCache.get(cacheKey) : undefined
  if (cached && cached.expiresAt > Date.now()) return cached.page
  if (canUseClientCache) {
    const inFlight = clientPageRequests.get(cacheKey)
    if (inFlight) return inFlight
  }

  const load = async (): Promise<ProductPage> => {
    const result = await fetchJsonEnvelope<unknown>(
      endpoint,
      options.cache ? { cache: options.cache } : undefined,
    )
    if (!Array.isArray(result.data)) {
      throw new Error('El catálogo devolvió una página con formato inválido.')
    }

    const pagination = readPaginationMeta(result.meta)
    const nextCursor = typeof pagination.nextCursor === 'string' && pagination.nextCursor.trim()
      ? pagination.nextCursor
      : null
    const hasMore = pagination.hasMore === true
    if (hasMore && !nextCursor) {
      throw new Error('El catálogo indicó más resultados sin entregar cursor.')
    }

    return {
      products: mapProductsToDto(result.data),
      nextCursor,
      hasMore,
    }
  }

  const request = load().then((page) => {
    if (canUseClientCache) {
      clientPageCache.set(cacheKey, { page, expiresAt: Date.now() + CLIENT_PAGE_TTL_MS })
    }
    return page
  }).finally(() => {
    clientPageRequests.delete(cacheKey)
  })
  if (canUseClientCache) {
    clientPageRequests.set(cacheKey, request)
  }
  return request
}

export const listAllProducts = async (options?: { cache?: RequestCache; pageSize?: number }) => {
  const products: ProductType[] = []
  const seenCursors = new Set<string>()
  let cursor: string | null = null

  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const page = await listProductPage({
      cache: options?.cache,
      pageSize: options?.pageSize ?? 100,
      cursor,
    })
    products.push(...page.products)
    if (!page.hasMore) return products

    cursor = page.nextCursor
    if (!cursor || seenCursors.has(cursor)) {
      throw new Error('La paginación del catálogo produjo un cursor repetido.')
    }
    seenCursors.add(cursor)
  }

  throw new Error('El catálogo excedió el máximo seguro de 100 páginas.')
}

export const getProduct = async (id: string) => {
  const data = await fetchJson<any>(apiEndpoints.product(id), { cache: 'no-store' })
  return mapProductToDto(data)
}

export const createProduct = (payload: Partial<ProductType>) =>
  requestApi<ProductType>(apiEndpoints.products, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).finally(() => {
    invalidateClientProductsCache()
  })

export const updateProduct = (id: string, payload: Partial<ProductType>) =>
  requestApi<ProductType>(apiEndpoints.product(id), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).finally(() => {
    invalidateClientProductsCache()
  })

export const deleteProduct = (id: string) =>
  requestApi<{ ok: boolean }>(apiEndpoints.product(id), { method: 'DELETE' }).finally(() => {
    invalidateClientProductsCache()
  })
