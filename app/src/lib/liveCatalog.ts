import { findCatalogProduct, getProductVariantLabel, getProductVariants, groupCatalogProducts, resolveSelectedVariant } from '@/lib/catalog'
import { listProductPage } from '@/lib/api/products'
import { ProductType } from '@/type/ProductType'

export interface LiveCatalogSnapshot {
  rawProducts: ProductType[]
  groupedProducts: ProductType[]
}

const inFlightSnapshots = new Map<string, Promise<LiveCatalogSnapshot>>()

export const getLiveProductAvailableStock = (product?: ProductType | null) => {
  if (!product) return 0
  const inventoryAvailable = Number(product.inventory?.available ?? NaN)
  if (Number.isFinite(inventoryAvailable)) {
    return Math.max(0, inventoryAvailable)
  }
  const quantity = Number(product.quantity ?? NaN)
  if (Number.isFinite(quantity)) {
    return Math.max(0, quantity)
  }
  return 0
}

export const buildLiveAvailabilityMap = (products: ProductType[]) => {
  const availabilityMap = new Map<string, number>()
  products.forEach((product) => {
    const availableStock = getLiveProductAvailableStock(product)
    const identifiers = [product.id, product.internalId, product.slug].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    )

    identifiers.forEach((identifier) => {
      availabilityMap.set(identifier, availableStock)
    })
  })
  return availabilityMap
}

export const fetchLiveCatalogSnapshot = async (
  requestedProducts: Array<ProductType | string>,
): Promise<LiveCatalogSnapshot> => {
  const ids = Array.from(new Set(requestedProducts.flatMap((entry) => {
    if (typeof entry === 'string') return [entry]
    const variants = getProductVariants(entry)
    return variants
      .map((variant) => variant.internalId || variant.id || variant.slug)
      .filter((value): value is string => Boolean(value))
  })))
  if (ids.length > 100) {
    throw new Error('La validación de stock admite como máximo 100 productos por operación.')
  }
  if (ids.length === 0) {
    return { rawProducts: [], groupedProducts: [] }
  }
  const cacheKey = ids.slice().sort().join('|')
  const inFlight = inFlightSnapshots.get(cacheKey)
  if (inFlight) return inFlight

  const request = listProductPage({
    cache: 'no-store',
    pageSize: ids.length,
    ids,
  })
    .then((rawProducts) => {
      const snapshot = {
        rawProducts: rawProducts.products,
        groupedProducts: groupCatalogProducts(rawProducts.products),
      }
      return snapshot
    })
    .finally(() => {
      inFlightSnapshots.delete(cacheKey)
    })
  inFlightSnapshots.set(cacheKey, request)
  return request
}

export const invalidateLiveCatalogSnapshot = () => {
  inFlightSnapshots.clear()
}

export const findLiveCatalogProduct = (products: ProductType[], requestedId?: string | number | null) => {
  const normalizedId = typeof requestedId === 'string' ? requestedId : String(requestedId ?? '')
  if (!normalizedId) {
    return products[0] ?? null
  }
  return findCatalogProduct(products, normalizedId) ?? null
}

export const resolveLiveSelectedVariant = (
  productFamily: ProductType,
  options?: {
    requestedId?: string | number | null
    preferredVariantId?: string | number | null
    preferredVariantLabel?: string | null
    strictPreferredMatch?: boolean
  },
) => {
  const variants = getProductVariants(productFamily)
  const requestedId = typeof options?.requestedId === 'string' ? options?.requestedId : String(options?.requestedId ?? '')
  const preferredVariantId = typeof options?.preferredVariantId === 'string' ? options?.preferredVariantId : String(options?.preferredVariantId ?? '')
  const preferredLabel = (options?.preferredVariantLabel ?? '').trim()
  const strictPreferredMatch = options?.strictPreferredMatch === true
  const matchesFamilyIdentifier = requestedId !== '' && (
    productFamily.id === requestedId ||
    productFamily.internalId === requestedId ||
    productFamily.slug === requestedId
  )
  const candidateIds = [
    preferredVariantId,
    ...(requestedId && !matchesFamilyIdentifier ? [requestedId] : []),
  ].filter(Boolean)

  for (const candidateId of candidateIds) {
    const byId = variants.find((variant) =>
      variant.id === candidateId ||
      variant.internalId === candidateId ||
      variant.slug === candidateId,
    )
    if (byId) {
      return byId
    }
  }

  if (preferredLabel) {
    const byLabel = variants.find((variant) => getProductVariantLabel(variant) === preferredLabel)
    if (byLabel) {
      return byLabel
    }
  }

  if (strictPreferredMatch && (preferredVariantId || preferredLabel)) {
    return null
  }

  return resolveSelectedVariant(productFamily, requestedId || preferredVariantId || undefined)
}
