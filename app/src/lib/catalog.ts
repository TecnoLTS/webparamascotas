import { CategoryCard } from '@/config/siteConfig'
import { getCategoryAlt, getCategoryImage, getCategoryLabel, getShopBrowseCategoryIds } from '@/data/petCategoryCards'
import type { SiteId } from '@/lib/site'
import { ProductType, ProductVariantOption } from '@/type/ProductType'
import { normalizeMeasurementLabel, normalizeMeasurementLabels } from '@/lib/measurementLabel'
import type { ProductCategoryImageReference } from '@/lib/productReferenceData'

const normalizeText = (value?: string | null) =>
  (value ?? '').trim().toLowerCase()

type CatalogCategoryReference = string | ProductCategoryImageReference

const getCategoryReferenceName = (reference: CatalogCategoryReference) =>
  typeof reference === 'string' ? reference : reference.name

const getCategoryReferenceAliases = (value: string) => {
  const normalized = normalizeText(value)
  if (normalized === 'todos' || normalized === 'todas') return ['todos', 'todas']
  if (normalized === 'descuentos' || normalized === 'ofertas') return ['descuentos', 'ofertas']
  return [normalized]
}

const isFixedCatalogCategoryAlias = (value: string) =>
  ['todos', 'todas', 'descuentos', 'ofertas'].includes(normalizeText(value))

const findCategoryReference = (
  categoryId: string,
  referenceCategories: CatalogCategoryReference[] = []
) => {
  const aliases = getCategoryReferenceAliases(categoryId)
  return referenceCategories.find((reference) => aliases.includes(normalizeText(getCategoryReferenceName(reference))))
}

const parseCatalogCategoryValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean)
    }
  } catch {
    // Legacy product data can store comma-separated category labels.
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
}

const getProductCatalogCategoryIds = (product: ProductType) =>
  [
    product.category,
    ...parseCatalogCategoryValues(product.attributes?.catalogCategories),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)

const toTitleCase = (value?: string | null) =>
  (value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const requiresSeparatedVariantSuffix = (label: string) =>
  /^(XXS|XS|S|M|L|XL|XXL|STANDARD)$/i.test(label.trim())

const buildFlexibleUnitPattern = (unit: string) => {
  const normalized = unit.toUpperCase()

  switch (normalized) {
    case 'KG':
    case 'KGS':
    case 'K':
      return '(?:KGS?|KG|K)'
    case 'GR':
    case 'G':
      return '(?:GR|G)'
    case 'ML':
      return '(?:MLS?|ML)'
    case 'TABS':
    case 'TAB':
      return 'TABS?'
    case 'UN':
    case 'UNI':
      return '(?:UN|UNI)'
    default:
      return escapeRegExp(normalized)
  }
}

const buildFlexibleVariantSuffixPattern = (label: string) => {
  const normalized = label
    .trim()
    .toUpperCase()
    .replace(/,/g, '.')
    .replace(/\s*-\s*/g, '-')
    .replace(/(\d)\s+(KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TABS?|DS|UN|UNI|PACK|PZA|PZ)\b/g, '$1$2')
    .replace(/\s+/g, ' ')

  const parts = normalized
    .split(/(\d+(?:\.\d+)?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TABS?|DS|UN|UNI|PACK|PZA|PZ)\b)/)
    .filter(Boolean)

  return parts
    .map((part) => {
      const measureMatch = part.match(/^(\d+(?:\.\d+)?)(KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TABS?|DS|UN|UNI|PACK|PZA|PZ)$/)
      if (measureMatch) {
        return `${escapeRegExp(measureMatch[1])}\\s*${buildFlexibleUnitPattern(measureMatch[2])}`
      }

      return escapeRegExp(part)
        .replace(/\s+/g, '\\s*')
        .replace(/\\-/g, '\\s*-\\s*')
    })
    .join('')
}

const looksLikeSizeValue = (value?: string | null) =>
  /^(?:XXS|XS|S|M|L|XL|XXL|STANDARD|\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TAB|TABS|DS|UN|UNI|PACK|PZA|PZ)|X?\d+)$/i.test((value ?? '').trim())

const variantLabelMatchesValue = (value: string, label: string) => {
  const trimmedValue = value.trim()
  const trimmedLabel = label.trim()
  if (!trimmedValue || !trimmedLabel) return false

  return new RegExp(`^${buildFlexibleVariantSuffixPattern(trimmedLabel)}$`, 'i').test(trimmedValue)
}

const isVariantBaseNameConsistent = (fullName: string, candidateBaseName: string, variantLabels: string[]) => {
  const normalizedName = fullName.trim().toLowerCase()
  const normalizedBase = candidateBaseName.trim().toLowerCase()
  if (!normalizedName || !normalizedBase) return false

  if (normalizedName === normalizedBase) return true

  if (normalizedName.startsWith(normalizedBase)) {
    const suffix = fullName
      .slice(candidateBaseName.length)
      .replace(/^(?:\s+|-)+/, '')
      .trim()
    if (suffix && variantLabels.some((label) => variantLabelMatchesValue(suffix, label))) {
      return true
    }
  }

  if (variantLabels.length === 0) return false

  return variantLabels.some((label) => {
    if (!label.trim()) return false
    const escapedLabel = buildFlexibleVariantSuffixPattern(label)
    const separator = requiresSeparatedVariantSuffix(label) ? '(?:\\s+|-)' : '(?:\\s+|-)?'
    const derived = fullName.replace(new RegExp(`${separator}${escapedLabel}$`, 'i'), '').trim().toLowerCase()

    return derived !== '' && derived === normalizedBase
  })
}

const getAttributeValue = (product: ProductType, keys: string[]) => {
  const attributes = product.attributes ?? {}
  for (const key of keys) {
    const value = attributes[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return ''
}

export const getProductReviewCount = (product: ProductType) => {
  const attributeCount = Number(getAttributeValue(product, ['reviewCount', 'reviewsCount']))
  if (Number.isFinite(attributeCount) && attributeCount > 0) {
    return attributeCount
  }
  const explicit = Number(product.reviewCount ?? 0)
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 0
}

export const hasRealReviews = (product: ProductType) =>
  Number(product.rate ?? 0) > 0 && getProductReviewCount(product) > 0

export const getProductSku = (product: ProductType) =>
  getAttributeValue(product, ['sku', 'SKU', 'code', 'codigo'])

const extractProductVariantLabel = (product: ProductType) => {
  const explicit = (product.variantLabel ?? '').trim()
  if (explicit) return explicit

  const attributeLabel = getAttributeValue(product, [
    'variantLabel',
    'size',
    'weight',
    'presentation',
    'packaging',
    'dosage',
    'volume',
  ])
  if (attributeLabel) return attributeLabel

  const normalizedName = (product.name ?? '').trim()
  const sizeMatch = normalizedName.match(/(?:^|\s)(\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TAB|TABS|DS|UN|UNI|PACK|PZA|PZ))$/i)
  if (sizeMatch) {
    return sizeMatch[1].replace(/\s+/g, '')
  }

  const countMatch = normalizedName.match(/(?:^|\s)(X\d+)$/i)
  if (countMatch) {
    return countMatch[1].toUpperCase()
  }

  return ''
}

export const getProductVariantLabel = (product: ProductType) =>
  normalizeMeasurementLabel(extractProductVariantLabel(product))

const getProductVariantSizeValue = (product: ProductType) => {
  const explicitSize = getAttributeValue(product, ['size'])
  if (explicitSize) {
    return normalizeMeasurementLabel(explicitSize)
  }

  const variantLabel = getProductVariantLabel(product)
  return looksLikeSizeValue(variantLabel) ? variantLabel : ''
}

export const getProductVariantPresentation = (product: ProductType) =>
  normalizeMeasurementLabel(getAttributeValue(product, ['presentation', 'packaging']))

export const getProductVariantBaseName = (product: ProductType) => {
  const rawVariantLabel = extractProductVariantLabel(product)
  const variantLabel = normalizeMeasurementLabel(rawVariantLabel)
  const normalizedName = (product.name ?? '').trim()
  if (!rawVariantLabel && !variantLabel) return normalizedName

  const candidateLabels = Array.from(new Set([
    rawVariantLabel,
    variantLabel,
    getAttributeValue(product, ['variantLabel']),
    getAttributeValue(product, ['size']),
    getAttributeValue(product, ['weight']),
    getAttributeValue(product, ['presentation']),
    getAttributeValue(product, ['packaging']),
    getAttributeValue(product, ['dosage']),
    getAttributeValue(product, ['volume']),
    getAttributeValue(product, ['range']),
    getAttributeValue(product, ['color']),
  ].filter(Boolean)))

  const explicitCandidates = [
    (product.variantBaseName ?? '').trim(),
    getAttributeValue(product, ['variantBaseName']),
  ].filter(Boolean)

  const consistentExplicit = explicitCandidates.find((candidate) =>
    isVariantBaseNameConsistent(normalizedName, candidate, candidateLabels)
  )
  if (consistentExplicit) {
    return consistentExplicit
  }

  let strippedName = normalizedName

  candidateLabels.forEach((label) => {
    const escapedLabel = buildFlexibleVariantSuffixPattern(label)
    const separator = requiresSeparatedVariantSuffix(label) ? '(?:\\s+|-)' : '(?:\\s+|-)?'
    strippedName = strippedName.replace(new RegExp(`${separator}${escapedLabel}$`, 'i'), '').trim()
  })

  return strippedName || normalizedName
}

export const getProductVariantGroupKey = (product: ProductType) => {
  const catalogDisplayMode = (
    getAttributeValue(product, ['catalogDisplayMode', 'variantDisplayMode'])
    || String((product.attributes as any)?.showAsSeparateProduct || '')
  ).trim().toLowerCase()
  if (['separate', 'individual', 'standalone', 'true', '1', 'yes', 'si', 'sí'].includes(catalogDisplayMode)) {
    return `single:${product.id}`
  }

  const variantLabel = getProductVariantLabel(product)
  if (!variantLabel) {
    return `single:${product.id}`
  }

  const baseName = getProductVariantBaseName(product)
  const groupParts = [
    product.brand,
    product.category,
    product.gender,
    baseName,
    getAttributeValue(product, ['target']),
    getAttributeValue(product, ['flavor']),
    getAttributeValue(product, ['line']),
    getAttributeValue(product, ['species']),
  ].filter((value) => typeof value === 'string' && value.trim().length > 0)

  return slugify(groupParts.join('|')) || `group:${product.id}`
}

const parseVariantSortValue = (label: string) => {
  const normalized = label.trim().toUpperCase().replace(',', '.')
  const countMatch = normalized.match(/^X?(\d+)$/)
  if (countMatch) {
    return Number(countMatch[1])
  }

  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TAB|TABS|DS|UN|UNI|PACK|PZA|PZ)/)
  if (!amountMatch) {
    return Number.MAX_SAFE_INTEGER
  }

  const amount = Number(amountMatch[1])
  const unit = amountMatch[2]
  if (!Number.isFinite(amount)) {
    return Number.MAX_SAFE_INTEGER
  }

  switch (unit) {
    case 'KG':
    case 'KGS':
    case 'K':
      return amount * 1000
    case 'LB':
      return amount * 453.592
    case 'L':
      return amount * 1000
    case 'GR':
    case 'G':
    case 'ML':
    case 'MG':
    case 'TAB':
    case 'TABS':
    case 'DS':
    case 'UN':
    case 'UNI':
    case 'PACK':
    case 'PZA':
    case 'PZ':
      return amount
    case 'OZ':
      return amount * 28.3495
    default:
      return amount
  }
}

const compareVariants = (left: ProductType, right: ProductType) => {
  const leftLabel = getProductVariantLabel(left)
  const rightLabel = getProductVariantLabel(right)
  const leftValue = parseVariantSortValue(leftLabel)
  const rightValue = parseVariantSortValue(rightLabel)

  if (leftValue !== rightValue) {
    return leftValue - rightValue
  }

  if ((right.quantity ?? 0) !== (left.quantity ?? 0)) {
    return (right.quantity ?? 0) - (left.quantity ?? 0)
  }

  return leftLabel.localeCompare(rightLabel)
}

const compareVariantsByDisplayOrder = (left: ProductType, right: ProductType) => {
  const leftPrice = Number(left.price ?? 0)
  const rightPrice = Number(right.price ?? 0)
  const leftHasStock = Number(left.quantity ?? 0) > 0
  const rightHasStock = Number(right.quantity ?? 0) > 0
  const leftHasPrice = leftPrice > 0
  const rightHasPrice = rightPrice > 0

  if (leftHasStock !== rightHasStock) {
    return leftHasStock ? -1 : 1
  }

  if (leftHasPrice !== rightHasPrice) {
    return leftHasPrice ? -1 : 1
  }

  if (leftPrice !== rightPrice) {
    return leftPrice - rightPrice
  }

  return compareVariants(left, right)
}

const toTimestamp = (value?: string | null) => {
  const parsed = Date.parse(value ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

const pickRepresentativeVariant = (variants: ProductType[]) => {
  const inStock = variants.filter((variant) => Number(variant.quantity ?? 0) > 0)
  const pool = inStock.length > 0 ? inStock : variants
  return pool.slice().sort(compareVariants)[0] ?? variants[0]
}

const isVariantActuallyOnSale = (variant: ProductType) => {
  const currentPrice = Number(variant.price ?? 0)
  const originalPrice = Number(variant.originPrice ?? 0)
  return Boolean(variant.sale) && originalPrice > 0 && originalPrice > currentPrice
}

const pickLowestPricedVariant = (variants: ProductType[]) => {
  const inStockPricedVariants = variants.filter((variant) => Number(variant.quantity ?? 0) > 0 && Number(variant.price ?? 0) > 0)
  const pricedVariants = variants.filter((variant) => Number(variant.price ?? 0) > 0)
  const inStockVariants = variants.filter((variant) => Number(variant.quantity ?? 0) > 0)
  const pool = inStockPricedVariants.length > 0
    ? inStockPricedVariants
    : pricedVariants.length > 0
      ? pricedVariants
      : inStockVariants.length > 0
        ? inStockVariants
        : variants
  return pool
    .slice()
    .sort(compareVariantsByDisplayOrder)[0]
}

const pickPricingReferenceVariant = (product: ProductType) => {
  const variants = getProductVariants(product)
  return pickLowestPricedVariant(variants) ?? product
}

const toVariantOption = (product: ProductType): ProductVariantOption => ({
  id: product.id,
  internalId: product.internalId,
  slug: product.slug,
  name: product.name,
  label: getProductVariantLabel(product) || product.name,
  presentation: getProductVariantPresentation(product),
  price: Number(product.price ?? 0),
  originPrice: Number(product.originPrice ?? 0),
  quantity: Number(product.quantity ?? 0),
  sold: Number(product.sold ?? 0),
  product,
})

export const getProductVariants = (product: ProductType): ProductType[] => {
  if (Array.isArray(product.variantOptions) && product.variantOptions.length > 0) {
    return product.variantOptions.map((option) => option.product).slice().sort(compareVariantsByDisplayOrder)
  }
  return [product]
}

export const getProductVariantDisplayValues = (product: ProductType): string[] => {
  const variants = getProductVariants(product)
  const variantLabels = normalizeMeasurementLabels(
    variants.map((variant) => getProductVariantLabel(variant)).filter(Boolean),
  )

  if (variantLabels.length > 0) {
    return variantLabels
  }

  const presentationLabels = normalizeMeasurementLabels(
    variants.map((variant) => getProductVariantPresentation(variant)).filter(Boolean),
  )

  if (presentationLabels.length > 0) {
    return presentationLabels
  }

  return normalizeMeasurementLabels(product.sizes ?? [])
}

export const getProductCurrentPrice = (product: ProductType) =>
  Number(pickPricingReferenceVariant(product)?.price ?? product.priceMin ?? product.price ?? 0)

export const getProductOriginalPrice = (product: ProductType) =>
  Number(pickPricingReferenceVariant(product)?.originPrice ?? product.originPrice ?? 0)

export const isProductOnSale = (product: ProductType) => {
  return isVariantActuallyOnSale(pickPricingReferenceVariant(product))
}

export const getProductDiscountPercent = (product: ProductType) => {
  const pricingVariant = pickPricingReferenceVariant(product)
  const currentPrice = Number(pricingVariant?.price ?? 0)
  const originalPrice = Number(pricingVariant?.originPrice ?? 0)

  if (originalPrice <= 0 || originalPrice <= currentPrice) {
    return 0
  }

  return Math.floor(100 - ((currentPrice / originalPrice) * 100))
}

export const getProductDetailRouteId = (product: ProductType) => {
  const selectedVariant = resolveSelectedVariant(product)
  return selectedVariant?.id || selectedVariant?.internalId || selectedVariant?.slug || product.id
}

export const resolveSelectedVariant = (product: ProductType, idOrSlug?: string | null) => {
  const variants = getProductVariants(product)
  const requestedValue = (idOrSlug ?? '').trim()
  const matchesFamilyIdentifier = requestedValue !== '' && (
    product.id === requestedValue ||
    product.internalId === requestedValue ||
    product.slug === requestedValue
  )

  if (requestedValue && !matchesFamilyIdentifier) {
    const selected = variants.find((variant) =>
      variant.id === requestedValue ||
      variant.internalId === requestedValue ||
      variant.slug === requestedValue
    )
    if (selected) return selected
  }
  return pickLowestPricedVariant(variants) ?? pickRepresentativeVariant(variants)
}

export const groupCatalogProducts = (products: ProductType[]): ProductType[] => {
  const normalizedProducts = products.map((product) => {
    const variantLabel = getProductVariantLabel(product)
    const variantBaseName = getProductVariantBaseName(product)
    const variantGroupKey = getProductVariantGroupKey(product)
    const reviewCount = getProductReviewCount(product)
    const variantSizeValue = getProductVariantSizeValue(product)
    const uniqueSizes = normalizeMeasurementLabels(variantSizeValue ? [variantSizeValue] : [])

    return {
      ...product,
      reviewCount,
      sizes: uniqueSizes,
      variantLabel,
      variantBaseName,
      variantGroupKey,
      variantAxis: variantSizeValue ? 'size' : (product.variantAxis ?? ''),
      variantPresentation: getProductVariantPresentation(product),
    }
  })

  const groupedMap = new Map<string, ProductType[]>()
  normalizedProducts.forEach((product) => {
    const groupKey = getProductVariantGroupKey(product)
    const existing = groupedMap.get(groupKey) ?? []
    existing.push(product)
    groupedMap.set(groupKey, existing)
  })

  return Array.from(groupedMap.values()).map((variants) => {
    const sortedVariants = variants.slice().sort(compareVariants)
    const representative = pickRepresentativeVariant(sortedVariants)
    const pricingReference = pickLowestPricedVariant(sortedVariants) ?? representative
    const sizes = normalizeMeasurementLabels(sortedVariants.map((variant) => getProductVariantSizeValue(variant)))
    const priceValues = sortedVariants.map((variant) => Number(variant.price ?? 0)).filter((value) => value > 0)
    const originValues = sortedVariants.map((variant) => Number(variant.originPrice ?? 0)).filter((value) => value > 0)
    const totalQuantity = sortedVariants.reduce((sum, variant) => sum + Number(variant.quantity ?? 0), 0)
    const totalSold = sortedVariants.reduce((sum, variant) => sum + Number(variant.sold ?? 0), 0)
    const reviewCount = sortedVariants.reduce((max, variant) => Math.max(max, getProductReviewCount(variant)), 0)
    const hasMultipleVariants = sortedVariants.length > 1
    const latestCreatedAt = sortedVariants.reduce<string | undefined>((latest, variant) => {
      return toTimestamp(variant.createdAt) > toTimestamp(latest) ? variant.createdAt : latest
    }, representative.createdAt)
    const latestUpdatedAt = sortedVariants.reduce<string | undefined>((latest, variant) => {
      return toTimestamp(variant.updatedAt) > toTimestamp(latest) ? variant.updatedAt : latest
    }, representative.updatedAt)

    return {
      ...representative,
      name: hasMultipleVariants ? getProductVariantBaseName(representative) : representative.name,
      quantity: totalQuantity,
      sold: totalSold,
      sizes: sizes.length > 0 ? sizes : representative.sizes,
      reviewCount,
      variantCount: sortedVariants.length,
      variantOptions: sortedVariants.map(toVariantOption),
      variantLabel: getProductVariantLabel(representative),
      variantBaseName: getProductVariantBaseName(representative),
      variantGroupKey: getProductVariantGroupKey(representative),
      priceMin: priceValues.length > 0 ? Math.min(...priceValues) : Number(representative.price ?? 0),
      priceMax: priceValues.length > 0 ? Math.max(...priceValues) : Number(representative.price ?? 0),
      originPriceMin: originValues.length > 0 ? Math.min(...originValues) : Number(representative.originPrice ?? 0),
      originPriceMax: originValues.length > 0 ? Math.max(...originValues) : Number(representative.originPrice ?? 0),
      price: priceValues.length > 0 ? Math.min(...priceValues) : Number(representative.price ?? 0),
      originPrice: Number(pricingReference?.originPrice ?? representative.originPrice ?? 0),
      createdAt: latestCreatedAt,
      updatedAt: latestUpdatedAt,
      new: sortedVariants.some((variant) => variant.new),
      sale: isVariantActuallyOnSale(pricingReference),
    }
  })
}

export const findCatalogProduct = (products: ProductType[], idOrSlug: string) =>
  products.find((product) =>
    product.id === idOrSlug ||
    product.internalId === idOrSlug ||
    product.slug === idOrSlug ||
    getProductVariants(product).some((variant) =>
      variant.id === idOrSlug ||
      variant.internalId === idOrSlug ||
      variant.slug === idOrSlug
    )
  )

export const findCatalogProductForDetail = (products: ProductType[], idOrSlug: string) => {
  const product = findCatalogProduct(products, idOrSlug)
  if (!product) return undefined

  const matchedVariant = getProductVariants(product).find((variant) =>
    variant.id === idOrSlug ||
    variant.internalId === idOrSlug ||
    variant.slug === idOrSlug
  )

  if (!matchedVariant) return product

  return {
    ...product,
    name: matchedVariant.name || product.name,
    description: matchedVariant.description || product.description,
    slug: matchedVariant.slug || product.slug,
    thumbImage: matchedVariant.thumbImage?.length ? matchedVariant.thumbImage : product.thumbImage,
    images: matchedVariant.images?.length ? matchedVariant.images : product.images,
    imageMeta: matchedVariant.imageMeta?.length ? matchedVariant.imageMeta : product.imageMeta,
  }
}

const resolveCategoryImage = (
  categoryId: string,
  _siteId?: SiteId,
  referenceCategories: CatalogCategoryReference[] = []
) => {
  const normalized = normalizeText(categoryId)
  const reference = findCategoryReference(categoryId, referenceCategories)
  if (reference && typeof reference !== 'string' && reference.topImageUrl) return reference.topImageUrl

  const configuredImage = getCategoryImage(normalized)

  if (configuredImage && configuredImage !== '/images/collection/home-top/catalogo-completo-para-mascotas-4x5.webp') return configuredImage
  if (normalized.includes('perro')) return getCategoryImage('perros')
  if (normalized.includes('gato')) return getCategoryImage('gatos')
  if (
    normalized.includes('salud') ||
    normalized.includes('cuidado') ||
    normalized.includes('higiene') ||
    normalized.includes('medicina') ||
    normalized.includes('farmacia')
  ) return getCategoryImage('salud')
  if (normalized.includes('accesorio')) return getCategoryImage('accesorios')
  if (normalized.includes('ropa')) return getCategoryImage('ropa')
  if (normalized.includes('comedero')) return getCategoryImage('comederos')
  if (normalized.includes('cama')) return getCategoryImage('camas')
  return '/images/collection/home-top/catalogo-completo-para-mascotas-4x5.webp'
}

const resolveCategoryFeaturedImages = (
  categoryId: string,
  referenceCategories: CatalogCategoryReference[] = []
) => {
  const reference = findCategoryReference(categoryId, referenceCategories)
  return reference && typeof reference !== 'string' ? reference.featuredImages : undefined
}

const resolveCategoryLabel = (categoryId: string, _siteId?: SiteId) => {
  const label = getCategoryLabel(categoryId)
  return label || toTitleCase(categoryId)
}

const sortCatalogCategoryIds = (categoryIds: string[], _siteId?: SiteId) => {
  const configuredOrder = getShopBrowseCategoryIds()
    .map((categoryId) => normalizeText(categoryId))
    .filter((categoryId) => categoryId !== 'todos' && categoryId !== 'descuentos')

  const orderIndex = new Map(configuredOrder.map((categoryId, index) => [categoryId, index]))

  return categoryIds.slice().sort((left, right) => {
    const leftIndex = orderIndex.get(left)
    const rightIndex = orderIndex.get(right)

    if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    if (leftIndex !== undefined) return -1
    if (rightIndex !== undefined) return 1

    return left.localeCompare(right)
  })
}

export const getCatalogCategoryIds = (
  products: ProductType[],
  siteId?: SiteId,
  referenceCategories: CatalogCategoryReference[] = []
) => {
  const panelCategoryIds = referenceCategories
    .map((category) => normalizeText(getCategoryReferenceName(category)))
    .filter((categoryId) => categoryId && !isFixedCatalogCategoryAlias(categoryId))
  if (panelCategoryIds.length > 0) {
    return sortCatalogCategoryIds(Array.from(new Set(panelCategoryIds)), siteId)
  }

  const hasDogProducts = products.some((product) => normalizeText(product.gender) === 'dog')
  const hasCatProducts = products.some((product) => normalizeText(product.gender) === 'cat')

  const catalogCategories = [
    ...products.flatMap(getProductCatalogCategoryIds),
    ...referenceCategories
      .map((category) => normalizeText(getCategoryReferenceName(category)))
      .filter((categoryId) => !isFixedCatalogCategoryAlias(categoryId)),
  ].filter(Boolean)

  const filteredCategories = catalogCategories.filter((categoryId) => {
    if (hasDogProducts && categoryId === 'alimento para perros') return false
    if (hasCatProducts && categoryId === 'alimento para gatos') return false
    return true
  })

  return sortCatalogCategoryIds(
    Array.from(new Set([
      ...filteredCategories,
      ...(hasDogProducts ? ['perros'] : []),
      ...(hasCatProducts ? ['gatos'] : []),
    ])),
    siteId
  )
}

export const buildCatalogCategoryCards = (
  products: ProductType[],
  siteId?: SiteId,
  options: { referenceCategories?: CatalogCategoryReference[] } = {}
): CategoryCard[] => {
  const cards: CategoryCard[] = []

  const categoryIds = [
    'todos',
    ...(products.some(isProductOnSale) ? ['descuentos'] : []),
    ...getCatalogCategoryIds(products, siteId, options.referenceCategories ?? []),
  ]

  Array.from(new Set(categoryIds)).forEach((categoryId) => {
    cards.push({
      id: categoryId,
      label: resolveCategoryLabel(categoryId, siteId),
      image: resolveCategoryImage(categoryId, siteId, options.referenceCategories ?? []),
      alt: getCategoryAlt(categoryId, siteId),
      featuredImages: resolveCategoryFeaturedImages(categoryId, options.referenceCategories ?? []),
    })
  })

  return cards
}

export interface CatalogBrandStat {
  brand: string
  productCount: number
  inStockCount: number
  soldCount: number
}

const compareCatalogBrandStats = (left: CatalogBrandStat, right: CatalogBrandStat) => {
  if (right.soldCount !== left.soldCount) {
    return right.soldCount - left.soldCount
  }

  if (right.productCount !== left.productCount) {
    return right.productCount - left.productCount
  }

  if (right.inStockCount !== left.inStockCount) {
    return right.inStockCount - left.inStockCount
  }

  return left.brand.localeCompare(right.brand)
}

export const getCatalogBrandStats = (products: ProductType[]): CatalogBrandStat[] => {
  const statsByBrand = new Map<string, CatalogBrandStat>()

  products.forEach((product) => {
    const brand = (product.brand ?? '').trim()
    if (!brand) return

    const current = statsByBrand.get(brand) ?? {
      brand,
      productCount: 0,
      inStockCount: 0,
      soldCount: 0,
    }

    current.productCount += 1
    current.inStockCount += Number(product.quantity ?? 0) > 0 ? 1 : 0
    current.soldCount += Math.max(0, Number(product.sold ?? 0))

    statsByBrand.set(brand, current)
  })

  return Array.from(statsByBrand.values()).sort(compareCatalogBrandStats)
}

export const getCatalogBrands = (products: ProductType[]) =>
  getCatalogBrandStats(products).map((item) => item.brand)
