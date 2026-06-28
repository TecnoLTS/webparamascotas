import { NextResponse } from 'next/server'
import { resolveRequestProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'
import { mapProductsToDto } from '@/lib/productMapper'
import { groupCatalogProducts } from '@/lib/catalog'
import {
  buildProductSearchIndex,
  filterProductsBySearch,
  sanitizeProductSearchQuery,
} from '@/lib/productSearch'
import { ProductType } from '@/type/ProductType'

const resolveBackendUrl = () => {
  const base = process.env.BACKEND_URL_INTERNAL || 'http://backend-http:8080/api'
  return `${base.replace(/\/$/, '')}/products`
}

const isDevelopment = process.env.NODE_ENV === 'development'
const SUGGESTIONS_TIMEOUT_MS = 8000

const toSuggestionItem = (product: ProductType): Partial<ProductType> => ({
  id: product.id,
  internalId: product.internalId,
  category: product.category,
  productType: product.productType,
  type: product.type,
  name: product.name,
  gender: product.gender,
  new: product.new,
  sale: product.sale,
  published: product.published,
  rate: product.rate,
  price: product.price,
  originPrice: product.originPrice,
  brand: product.brand,
  sold: product.sold,
  quantity: product.quantity,
  quantityPurchase: product.quantityPurchase,
  sizes: product.sizes,
  attributes: product.attributes,
  variantLabel: product.variantLabel,
  variantBaseName: product.variantBaseName,
  variantGroupKey: product.variantGroupKey,
  variantAxis: product.variantAxis,
  variantPresentation: product.variantPresentation,
  thumbImage: product.thumbImage,
  images: product.images,
  description: product.description,
  action: product.action,
  slug: product.slug,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
})

type FetchSuggestionsOptions = {
  host?: string | null
  proto?: string | null
  query?: string | null
  limit?: number
}

export async function fetchSuggestionsData(options: FetchSuggestionsOptions = {}): Promise<Array<Partial<ProductType>>> {
  const query = sanitizeProductSearchQuery(options.query ?? '')
  const rawLimit = Number(options.limit ?? 0)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 0

  const outboundHeaders = new Headers()
  const host = resolveTenantHost(options.host ?? null)
  const proto = options.proto || 'https'

  if (host) {
    outboundHeaders.set('host', host)
    outboundHeaders.set('x-forwarded-host', host)
  }

  outboundHeaders.set('x-forwarded-proto', proto)
  attachInternalProxyToken(outboundHeaders)

  const res = await fetch(resolveBackendUrl(), {
    cache: isDevelopment ? 'no-store' : 'force-cache',
    next: isDevelopment ? undefined : { revalidate: 60 },
    headers: outboundHeaders,
    signal: AbortSignal.timeout(SUGGESTIONS_TIMEOUT_MS),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    return []
  }

  const payload = body && typeof body === 'object' && 'data' in body ? (body as any).data : body
  const products = groupCatalogProducts(mapProductsToDto(Array.isArray(payload) ? payload : []))
  const baseList = query
    ? filterProductsBySearch(products, query, buildProductSearchIndex(products))
    : products
  const limitedProducts = limit > 0 ? baseList.slice(0, limit) : baseList

  return limitedProducts.map(toSuggestionItem)
}

export async function getSuggestionsResponse(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const data = await fetchSuggestionsData({
      host: req.headers.get('x-forwarded-host') || req.headers.get('host'),
      proto: resolveRequestProto(req.headers.get('x-forwarded-proto'), req.url),
      query: searchParams.get('query'),
      limit: Number(searchParams.get('limit') ?? 0),
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json([], { status: 200 })
  }
}
