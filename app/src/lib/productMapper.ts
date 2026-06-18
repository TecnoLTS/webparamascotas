import { ProductType } from '@/type/ProductType'
import { normalizeMeasurementLabel, normalizeMeasurementLabels } from '@/lib/measurementLabel'
import { getCanonicalProductGroupId } from '@/lib/productGroupIdentity'
import { normalizeProductCategory, normalizeProductType, resolveAudienceGenderFromSpecies } from '@/lib/productTaxonomy'

// Tipamos lo mínimo necesario
type Variation = {
  color: string
  colorCode?: string | null
  colorImage?: string | null
  image?: string | null
}

// OJO: estos tipos deben ser compatibles con lo que devuelve Prisma.
// price y originPrice pueden venir como Decimal, así que los hacemos flexibles (any).
type ProductWithRelations = {
  id: string
  legacyId?: string | null
  category: string
  productType?: string | null
  name: string
  gender?: string | null
  new: boolean
  sale: boolean
  published?: boolean | null

  // Prisma usa Decimal para precios → aquí lo dejamos amplio
  price: any
  originPrice: any

  brand?: string | null
  sold: number
  quantity: number
  cost?: any
  description: string
  action?: string | null
  slug: string
  createdAt?: string | null
  updatedAt?: string | null

  // campos dinámicos
  rate?: number | null
  quantityPurchase?: number | null
  sizes?: string[] | null
  type?: string | null
  attributes?: Record<string, string> | null
  inventory?: {
    onHand?: number | string | null
    reserved?: number | string | null
    available?: number | string | null
    soldHistorical?: number | string | null
    reorderPoint?: number | string | null
    criticalPoint?: number | string | null
    overstockThreshold?: number | string | null
    stockMax?: number | string | null
    status?: string | null
    coverage?: {
      days?: number | string | null
      avgMonthlySales?: number | string | null
      windowMonths?: number | string | null
      confidence?: string | null
    } | null
    valuation?: {
      costTotal?: number | string | null
      saleTotalNet?: number | string | null
      saleTotalGross?: number | string | null
    } | null
    lot?: {
      code?: string | null
      location?: string | null
      supplier?: string | null
    } | null
    expiration?: {
      date?: string | null
      alertDays?: number | string | null
      daysToExpire?: number | string | null
      status?: 'none' | 'ok' | 'expiring' | 'expired' | string | null
    } | null
    purchaseHistory?: {
      entriesCount?: number | string | null
      purchasedUnits?: number | string | null
      remainingUnits?: number | string | null
      lastPurchaseAt?: string | null
    } | null
    salesHistory?: {
      ordersCount?: number | string | null
      soldUnits?: number | string | null
      lastSaleAt?: string | null
    } | null
    procurement?: {
      openLotsCount?: number | string | null
      remainingUnitsTotal?: number | string | null
      remainingCostTotal?: number | string | null
      weightedUnitCost?: number | string | null
      minUnitCost?: number | string | null
      maxUnitCost?: number | string | null
      weightedProfit?: number | string | null
      weightedMargin?: number | string | null
      lastPurchaseProfit?: number | string | null
      lastPurchaseMargin?: number | string | null
    } | null
    lastPurchaseInvoice?: PurchaseInvoiceSummary | null
  } | null
  expirationDate?: string | null
  expirationAlertDays?: number | string | null
  daysToExpire?: number | string | null
  expirationStatus?: 'none' | 'ok' | 'expiring' | 'expired' | null
  lastPurchaseInvoice?: PurchaseInvoiceSummary | null
  lastPurchaseInvoiceId?: string | null
  lastPurchaseInvoiceNumber?: string | null
  lastPurchaseSupplierName?: string | null
  lastPurchaseSupplierDocument?: string | null
  lastPurchaseIssuedAt?: string | null
  lastPurchaseReceivedAt?: string | null
  lastPurchaseQuantity?: number | string | null
  lastPurchaseUnitCost?: number | string | null
  lastPurchaseLineTotal?: number | string | null

  // relaciones
  images?: ({ url: string } | string)[]
  thumbImage?: ({ url: string } | string)[]
  imageMeta?: { url?: string; kind?: string; width?: number | string | null; height?: number | string | null; altText?: string | null; displayOrder?: number | string | null }[]
  variations?: Variation[]
  business?: {
    cost?: number
    margin?: number
    profit?: number
    suggestions?: {
      min_price?: number
      recommended_price?: number
      max_price?: number
      min_price_pvp?: number
      recommended_price_pvp?: number
      max_price_pvp?: number
    }
  } | null
  tax?: {
    rate?: number | string | null
    multiplier?: number | string | null
    exempt?: boolean | string | number | null
  } | null
}

type PurchaseInvoiceSummary = {
  id?: string | null
  invoice_number?: string | null
  invoiceNumber?: string | null
  supplier_name?: string | null
  supplierName?: string | null
  supplier_document?: string | null
  supplierDocument?: string | null
  issued_at?: string | null
  issuedAt?: string | null
  received_at?: string | null
  receivedAt?: string | null
  quantity?: number | string | null
  unit_cost?: number | string | null
  unitCost?: number | string | null
  line_total?: number | string | null
  lineTotal?: number | string | null
}

const normalizeImageUrl = (url: string) => {
  if (!url) return url
  const normalizeLocalAssetPath = (path: string) =>
    path.replace(/\.(jpe?g)(?=($|[?#]))/i, '.webp')

  if (url.startsWith('/')) return normalizeLocalAssetPath(url)
  try {
    const parsed = new URL(url)
    const path = parsed.pathname
    if (path.startsWith('/uploads/') || path.startsWith('/images/')) {
      return normalizeLocalAssetPath(path)
    }
    if (parsed.hostname.startsWith('api.')) {
      return url
    }
    return url
  } catch {
    return url
  }
}

const parseBooleanLike = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'y', 'on', 'si', 'sí'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  }
  return false
}

const CARE_VARIANT_FIELDS = new Set(['range', 'weight', 'presentation', 'dosage', 'volume', 'packaging'])
const STANDALONE_SIZE_LABEL_PATTERN = /^(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|STANDARD|\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TAB|TABS|DS|UN|UNI|PACK|PZA|PZ|CM)|X?\d+)$/i

const resolveProductSizeValues = (
  product: ProductWithRelations,
  normalizedProductType: string,
  attributes: Record<string, string>,
  variantLabel: string
) => {
  if (normalizedProductType === 'cuidado') {
    return []
  }

  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return normalizeMeasurementLabels(product.sizes)
  }

  const explicitSize = typeof attributes.size === 'string'
    ? normalizeMeasurementLabel(attributes.size).trim()
    : ''
  if (explicitSize) {
    return normalizeMeasurementLabels([explicitSize])
  }

  const normalizedLabel = normalizeMeasurementLabel(variantLabel).trim()
  return STANDALONE_SIZE_LABEL_PATTERN.test(normalizedLabel)
    ? normalizeMeasurementLabels([normalizedLabel])
    : []
}

const normalizeLegacyCareAttributes = (product: ProductWithRelations, attributes: Record<string, string>) => {
  if (normalizeProductType(product.productType ?? '', product.category) !== 'cuidado') {
    return attributes
  }

  const next = { ...attributes }
  delete next.size

  if (next.variantAxis && !CARE_VARIANT_FIELDS.has(next.variantAxis)) {
    delete next.variantAxis
    delete next.variantDefinitionField
  }

  return next
}

const resolveVariantLabelForProduct = (product: ProductWithRelations, attributes: Record<string, string>) => {
  const normalizedType = normalizeProductType(product.productType ?? '', product.category)
  const color = typeof attributes.color === 'string' ? attributes.color.trim() : ''
  const size = typeof attributes.size === 'string' ? normalizeMeasurementLabel(attributes.size).trim() : ''
  const variantAxis = typeof attributes.variantDefinitionField === 'string' && attributes.variantDefinitionField.trim()
    ? attributes.variantDefinitionField.trim().toLowerCase()
    : typeof attributes.variantAxis === 'string' && attributes.variantAxis.trim()
      ? attributes.variantAxis.trim().toLowerCase()
      : typeof attributes.displayAxis === 'string'
        ? attributes.displayAxis.trim().toLowerCase()
        : ''
  if (normalizedType === 'accesorios' && color && size) {
    if (variantAxis === 'size') {
      return normalizeMeasurementLabel(size)
    }
    return normalizeMeasurementLabel(`${color} ${size}`)
  }
  if (normalizedType === 'ropa' && size && color) {
    if (variantAxis === 'size') {
      return normalizeMeasurementLabel(size)
    }
    return normalizeMeasurementLabel(`${size} ${color}`)
  }

  if (
    variantAxis
    && (normalizedType !== 'cuidado' || CARE_VARIANT_FIELDS.has(variantAxis))
    && typeof attributes[variantAxis] === 'string'
    && attributes[variantAxis].trim()
  ) {
    return normalizeMeasurementLabel(attributes[variantAxis])
  }

  if (normalizedType === 'cuidado') {
    const careLabel = [
      attributes.weight,
      attributes.dosage,
      attributes.volume,
      attributes.presentation,
      attributes.packaging,
      attributes.range,
    ].find((value) => typeof value === 'string' && value.trim().length > 0)
    if (careLabel) return normalizeMeasurementLabel(careLabel)

    return ''
  }

  const valuesByType: Record<string, Array<string | undefined>> = {
    Alimento: [
      attributes.variantLabel,
      attributes.weight,
      attributes.size,
      attributes.presentation,
      attributes.packaging,
      attributes.dosage,
    ],
    ropa: [
      attributes.variantLabel,
      attributes.size,
      attributes.color,
    ],
    accesorios: [
      attributes.variantLabel,
      attributes.color,
      attributes.size,
      attributes.presentation,
    ],
  }

  const fallbackValues = [
    attributes.variantLabel,
    attributes.size,
    attributes.weight,
    attributes.presentation,
    attributes.packaging,
    attributes.dosage,
  ]
  const resolved = (valuesByType[normalizedType] ?? fallbackValues)
    .find((value) => typeof value === 'string' && value.trim().length > 0)

  return typeof resolved === 'string' ? normalizeMeasurementLabel(resolved) : ''
}

const mapVariation = (variation: Variation) => ({
  color: variation.color,
  colorCode: variation.colorCode ?? '',
  colorImage: variation.colorImage ? normalizeImageUrl(variation.colorImage) : '',
  image: variation.image ? normalizeImageUrl(variation.image) : '',
})

const mapPurchaseInvoiceSummary = (invoice?: PurchaseInvoiceSummary | null) => {
  if (!invoice) return null
  return {
    id: invoice.id ?? null,
    invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number ?? null,
    supplierName: invoice.supplierName ?? invoice.supplier_name ?? null,
    supplierDocument: invoice.supplierDocument ?? invoice.supplier_document ?? null,
    issuedAt: invoice.issuedAt ?? invoice.issued_at ?? null,
    receivedAt: invoice.receivedAt ?? invoice.received_at ?? null,
    quantity: Number(invoice.quantity ?? 0),
    unitCost: Number(invoice.unitCost ?? invoice.unit_cost ?? 0),
    lineTotal: Number(invoice.lineTotal ?? invoice.line_total ?? 0),
  }
}

const resolveLastPurchaseInvoice = (product: ProductWithRelations) => {
  const nestedInvoice = mapPurchaseInvoiceSummary(product.lastPurchaseInvoice ?? product.inventory?.lastPurchaseInvoice)
  if (nestedInvoice) return nestedInvoice

  if (!product.lastPurchaseInvoiceId && !product.lastPurchaseInvoiceNumber) return null

  return mapPurchaseInvoiceSummary({
    id: product.lastPurchaseInvoiceId ?? null,
    invoiceNumber: product.lastPurchaseInvoiceNumber ?? null,
    supplierName: product.lastPurchaseSupplierName ?? null,
    supplierDocument: product.lastPurchaseSupplierDocument ?? null,
    issuedAt: product.lastPurchaseIssuedAt ?? null,
    receivedAt: product.lastPurchaseReceivedAt ?? null,
    quantity: product.lastPurchaseQuantity ?? 0,
    unitCost: product.lastPurchaseUnitCost ?? 0,
    lineTotal: product.lastPurchaseLineTotal ?? 0,
  })
}

export const mapProductToDto = (product: ProductWithRelations): ProductType => {
  const attributes = product.attributes ?? {}
  const normalizedProductType = normalizeProductType(product.productType ?? '', product.category)
  let normalizedAttributes = { ...attributes }
  ;['variantLabel', 'size', 'weight', 'range', 'presentation', 'packaging', 'dosage', 'volume'].forEach((key) => {
    const value = normalizedAttributes[key]
    if (typeof value === 'string') {
      normalizedAttributes[key] = normalizeMeasurementLabel(value)
    }
  })
  normalizedAttributes = normalizeLegacyCareAttributes(product, normalizedAttributes)
  const images =
    product.images?.map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean).map(normalizeImageUrl) ?? []
  const thumbImages =
    product.thumbImage?.map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean).map(normalizeImageUrl) ?? []
  const thumbFromMeta =
    product.imageMeta?.filter((item) => item?.kind === 'thumb' && item.url).map((item) => normalizeImageUrl(item.url as string)) ?? []
  const galleryFromMeta =
    product.imageMeta?.filter((item) => item?.kind === 'gallery' && item.url).map((item) => normalizeImageUrl(item.url as string)) ?? []
  const resolvedImageMeta =
    product.imageMeta
      ?.filter((item) => item?.url)
      .map((item) => ({
        url: normalizeImageUrl(item.url as string),
        kind: item.kind ?? 'gallery',
        width: item.width === null || item.width === undefined ? undefined : Number(item.width),
        height: item.height === null || item.height === undefined ? undefined : Number(item.height),
        altText: typeof item.altText === 'string' && item.altText.trim() ? item.altText.trim() : null,
        displayOrder: item.displayOrder === null || item.displayOrder === undefined ? undefined : Number(item.displayOrder),
      })) ?? []
  const resolvedThumbs = thumbImages.length > 0 ? thumbImages : (thumbFromMeta.length > 0 ? thumbFromMeta : images)
  const galleryWithoutThumbs = images.filter((image) => !resolvedThumbs.includes(image))
  const resolvedGallery = galleryFromMeta.length > 0
    ? galleryFromMeta
    : (galleryWithoutThumbs.length > 0 ? galleryWithoutThumbs : images)
  const variations = product.variations?.map(mapVariation) ?? []
  const lastPurchaseInvoice = resolveLastPurchaseInvoice(product)
  const variantLabel = resolveVariantLabelForProduct(product, normalizedAttributes)
  const variantGroupKey = typeof normalizedAttributes.variantGroupKey === 'string' ? normalizedAttributes.variantGroupKey : ''
  const productGroupId = getCanonicalProductGroupId({
    id: product.legacyId ?? product.id,
    internalId: product.id,
    slug: product.slug,
    attributes: normalizedAttributes,
    variantGroupKey,
  })
  const resolvedSizes = resolveProductSizeValues(product, normalizedProductType, normalizedAttributes, variantLabel)
  const reviewCountRaw = normalizedAttributes.reviewCount ?? normalizedAttributes.reviewsCount ?? 0
  const resolvedGender = resolveAudienceGenderFromSpecies(
    typeof normalizedAttributes.species === 'string' ? normalizedAttributes.species : '',
    product.gender ?? ''
  )

  return {
    id: product.legacyId ?? product.id,
    internalId: product.id,
    category: normalizeProductCategory(product.category),
    productType: normalizedProductType || product.productType || '',
    type: product.type ?? '',
    name: product.name,
    gender: resolvedGender,
    new: product.new,
    sale: product.sale,
    published: product.published ?? false,
    rate: Number(product.rate ?? 0),

    // Aquí normalizamos a number, venga de Decimal, string o lo que sea
    price: Number(product.price),
    originPrice: Number(product.originPrice),

    brand: product.brand ?? '',
    sold: product.sold,
    quantity: product.quantity,
    cost: Number(product.cost ?? product.business?.cost ?? 0),
    tax: product.tax ? {
      rate: Number(product.tax.rate ?? 0),
      multiplier: Number(product.tax.multiplier ?? 1),
      exempt: parseBooleanLike(product.tax.exempt),
    } : undefined,
    business: product.business ?? undefined,
    quantityPurchase: Number(product.quantityPurchase ?? 1),
    sizes: resolvedSizes,
    attributes: normalizedAttributes,
    reviewCount: Number(reviewCountRaw ?? 0),
    variantLabel: typeof variantLabel === 'string' ? normalizeMeasurementLabel(variantLabel) : '',
    variantBaseName: typeof normalizedAttributes.variantBaseName === 'string' ? normalizedAttributes.variantBaseName : '',
    variantGroupKey,
    productGroupId,
    variantAxis: typeof normalizedAttributes.variantDefinitionField === 'string' && normalizedAttributes.variantDefinitionField
      ? normalizedAttributes.variantDefinitionField
      : (typeof normalizedAttributes.variantAxis === 'string' ? normalizedAttributes.variantAxis : ''),
    variantPresentation: typeof normalizedAttributes.presentation === 'string' ? normalizeMeasurementLabel(normalizedAttributes.presentation) : '',
    inventory: product.inventory ? {
      onHand: Number(product.inventory.onHand ?? product.quantity ?? 0),
      reserved: Number(product.inventory.reserved ?? 0),
      available: Number(product.inventory.available ?? product.quantity ?? 0),
      soldHistorical: Number(product.inventory.soldHistorical ?? product.sold ?? 0),
      reorderPoint: Number(product.inventory.reorderPoint ?? 0),
      criticalPoint: Number(product.inventory.criticalPoint ?? 0),
      overstockThreshold: Number(product.inventory.overstockThreshold ?? 0),
      stockMax: Number(product.inventory.stockMax ?? 0),
      status: product.inventory.status ?? undefined,
      coverage: product.inventory.coverage ? {
        days: product.inventory.coverage.days === null || product.inventory.coverage.days === undefined
          ? null
          : Number(product.inventory.coverage.days),
        avgMonthlySales: Number(product.inventory.coverage.avgMonthlySales ?? 0),
        windowMonths: Number(product.inventory.coverage.windowMonths ?? 0),
        confidence: product.inventory.coverage.confidence ?? undefined,
      } : undefined,
      valuation: product.inventory.valuation ? {
        costTotal: Number(product.inventory.valuation.costTotal ?? 0),
        saleTotalNet: Number(product.inventory.valuation.saleTotalNet ?? 0),
        saleTotalGross: Number(product.inventory.valuation.saleTotalGross ?? 0),
      } : undefined,
      lot: product.inventory.lot ? {
        code: product.inventory.lot.code ?? null,
        location: product.inventory.lot.location ?? null,
        supplier: product.inventory.lot.supplier ?? null,
      } : undefined,
      expiration: product.inventory.expiration ? {
        date: product.inventory.expiration.date ?? null,
        alertDays: Number(product.inventory.expiration.alertDays ?? 30),
        daysToExpire: product.inventory.expiration.daysToExpire === null || product.inventory.expiration.daysToExpire === undefined
          ? null
          : Number(product.inventory.expiration.daysToExpire),
        status: product.inventory.expiration.status ?? undefined,
      } : undefined,
      purchaseHistory: product.inventory.purchaseHistory ? {
        entriesCount: Number(product.inventory.purchaseHistory.entriesCount ?? 0),
        purchasedUnits: Number(product.inventory.purchaseHistory.purchasedUnits ?? 0),
        remainingUnits: Number(product.inventory.purchaseHistory.remainingUnits ?? 0),
        lastPurchaseAt: product.inventory.purchaseHistory.lastPurchaseAt ?? null,
      } : undefined,
      salesHistory: product.inventory.salesHistory ? {
        ordersCount: Number(product.inventory.salesHistory.ordersCount ?? 0),
        soldUnits: Number(product.inventory.salesHistory.soldUnits ?? product.inventory.soldHistorical ?? product.sold ?? 0),
        lastSaleAt: product.inventory.salesHistory.lastSaleAt ?? null,
      } : undefined,
      procurement: product.inventory.procurement ? {
        openLotsCount: Number(product.inventory.procurement.openLotsCount ?? 0),
        remainingUnitsTotal: Number(product.inventory.procurement.remainingUnitsTotal ?? 0),
        remainingCostTotal: Number(product.inventory.procurement.remainingCostTotal ?? 0),
        weightedUnitCost: Number(product.inventory.procurement.weightedUnitCost ?? 0),
        minUnitCost: Number(product.inventory.procurement.minUnitCost ?? 0),
        maxUnitCost: Number(product.inventory.procurement.maxUnitCost ?? 0),
        weightedProfit: Number(product.inventory.procurement.weightedProfit ?? 0),
        weightedMargin: Number(product.inventory.procurement.weightedMargin ?? 0),
        lastPurchaseProfit: Number(product.inventory.procurement.lastPurchaseProfit ?? 0),
        lastPurchaseMargin: Number(product.inventory.procurement.lastPurchaseMargin ?? 0),
      } : undefined,
      lastPurchaseInvoice,
    } : undefined,
    lastPurchaseInvoice,
    expirationDate: product.expirationDate ?? null,
    expirationAlertDays: Number(product.expirationAlertDays ?? 30),
    daysToExpire: product.daysToExpire === null || product.daysToExpire === undefined
      ? null
      : Number(product.daysToExpire),
    expirationStatus: (product.expirationStatus ?? 'none') as ProductType['expirationStatus'],
    variation: variations,
    thumbImage: resolvedThumbs,
    images: resolvedGallery,
    imageMeta: resolvedImageMeta,
    description: product.description,
    action: product.action ?? '',
    slug: product.slug,
    createdAt: product.createdAt ?? undefined,
    updatedAt: product.updatedAt ?? undefined,
  }
}

export const mapProductsToDto = (products: ProductWithRelations[] | unknown): ProductType[] =>
  Array.isArray(products) ? products.map(mapProductToDto) : []
