import { CategoryCard } from '@/config/siteConfig'
import { getCategoryAlt, getCategoryImage, getCategoryLabel, getShopBrowseCategoryIds } from '@/data/petCategoryCards'
import type { SiteId } from '@/lib/site'
import { ProductType, ProductVariantOption } from '@/type/ProductType'
import { normalizeMeasurementLabel, normalizeMeasurementLabels } from '@/lib/measurementLabel'
import { getCanonicalProductGroupId } from '@/lib/productGroupIdentity'
import { normalizeProductType } from '@/lib/productTaxonomy'
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

const looksLikeAccessorySizeValue = (value?: string | null) =>
  /^(?:XXS|XS|S|M|L|XL|XXL|STANDARD|\d+(?:[.,]\d+)?\s?CM|X?\d+)$/i.test((value ?? '').trim())

const VARIANT_AXIS_ALIASES: Record<string, string> = {
  volume: 'weight',
  dosage: 'weight',
  packaging: 'presentation',
  age: 'target',
  range: 'target',
}

const normalizeVariantAxisKey = (value?: string | null) => {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return VARIANT_AXIS_ALIASES[normalized] ?? normalized
}

const getNormalizedProductType = (product: ProductType) =>
  normalizeProductType(product.productType ?? '', product.category)

const looksLikeContentMeasurementValue = (value?: string | null) =>
  /^\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|LBS?|L|ML|MG|OZ)$/i.test((value ?? '').trim())

const getVariantAxisValue = (product: ProductType) => {
  const definitionField = normalizeVariantAxisKey(getAttributeValue(product, ['variantDefinitionField']))
  if (definitionField) return definitionField

  const legacyAxis = normalizeVariantAxisKey(getAttributeValue(product, ['variantAxis']))
  if (
    getNormalizedProductType(product) === 'Alimento'
    && legacyAxis === 'size'
    && (
      looksLikeContentMeasurementValue(getAttributeValue(product, ['size']))
      || getAttributeValue(product, ['weight']) !== ''
    )
  ) {
    return 'weight'
  }

  return legacyAxis
}

const getVariantDisplayAxisValue = (product: ProductType) =>
  getAttributeValue(product, ['displayAxis', 'publicVariantAxis', 'catalogDisplayAxis'])

const getCatalogDisplayModeValue = (product: ProductType) =>
  (
    getAttributeValue(product, ['catalogDisplayMode', 'variantDisplayMode'])
    || String((product.attributes as any)?.showAsSeparateProduct || '')
  ).trim().toLowerCase()

const isSeparateCatalogDisplayMode = (value?: string | null) =>
  ['separate', 'individual', 'standalone', 'true', '1', 'yes', 'si', 'sí'].includes((value ?? '').trim().toLowerCase())

const getAxisAttributeValue = (product: ProductType) => {
  const axis = getVariantAxisValue(product)
  if (!axis) return ''
  if (axis === 'weight') return getAttributeValue(product, ['weight', 'volume', 'dosage'])
  if (axis === 'presentation') return getAttributeValue(product, ['presentation', 'packaging'])
  if (axis === 'target') return getAttributeValue(product, ['target', 'age', 'range'])
  return getAttributeValue(product, [axis])
}

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

  const normalizedAttributes = new Map(
    Object.entries(attributes).map(([key, value]) => [normalizeVariantAxisKey(key), value])
  )
  for (const key of keys) {
    const value = normalizedAttributes.get(normalizeVariantAxisKey(key))
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
  const normalizedType = getNormalizedProductType(product)
  const explicit = (product.variantLabel ?? '').trim()
  if (normalizedType !== 'cuidado' && explicit) return explicit

  if (normalizedType === 'accesorios') {
    const color = getAttributeValue(product, ['color'])
    const size = getAttributeValue(product, ['size'])
    const axis = (getVariantAxisValue(product) || getVariantDisplayAxisValue(product)).toLowerCase()
    if (axis === 'size' && size) return size
    if (color && size) return `${color} ${size}`
    if (color) return color
  }

  const axisValue = getAxisAttributeValue(product)
  if (axisValue) return axisValue

  if (normalizedType === 'cuidado') {
    const careLabel = getAttributeValue(product, ['weight', 'volume', 'dosage', 'presentation', 'packaging', 'range'])
    if (careLabel) return careLabel

    return ''
  }

  const attributeKeys = normalizedType === 'Alimento'
    ? ['variantLabel', 'weight', 'size', 'presentation', 'packaging', 'dosage', 'volume']
    : ['variantLabel', 'size', 'weight', 'presentation', 'packaging', 'dosage', 'volume']
  const attributeLabel = getAttributeValue(product, attributeKeys)
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
  if (getNormalizedProductType(product) === 'cuidado') {
    return ''
  }

  const explicitSize = getAttributeValue(product, ['size'])
  if (explicitSize) {
    return normalizeMeasurementLabel(explicitSize)
  }

  const variantLabel = getProductVariantLabel(product)
  return looksLikeSizeValue(variantLabel) ? variantLabel : ''
}

export const getProductVariantPresentation = (product: ProductType) =>
  normalizeMeasurementLabel(getAttributeValue(product, ['presentation', 'packaging']))

const combineRegisteredPresentation = (
  presentation?: string | null,
  content?: string | null,
) => {
  const normalizedPresentation = normalizeMeasurementLabel(presentation ?? '')
  const normalizedContent = normalizeMeasurementLabel(content ?? '')

  if (!normalizedPresentation) return normalizedContent
  if (!normalizedContent) return normalizedPresentation

  const presentationIdentity = normalizeDisplayIdentity(normalizedPresentation)
  const contentIdentity = normalizeDisplayIdentity(normalizedContent)

  if (presentationIdentity === contentIdentity) return normalizedPresentation
  if (presentationIdentity.includes(contentIdentity)) return normalizedPresentation
  if (contentIdentity.includes(presentationIdentity)) return normalizedContent

  return `${normalizedPresentation} ${normalizedContent}`.trim()
}

const getProductPresentationDisplayValue = (
  product: ProductType,
  contentKeys: string[] = ['weight', 'volume'],
) => {
  const presentation = getAttributeValue(product, ['presentation', 'packaging'])
  const content = getAttributeValue(product, contentKeys)

  return combineRegisteredPresentation(presentation, content)
}

const inferContentDisplayLabel = (values: string[]) => {
  const normalizedValues = values.map((value) => normalizeDisplayIdentity(value)).filter(Boolean)
  if (normalizedValues.length > 0 && normalizedValues.every((value) => /\b(?:kg|gr|lb|oz)\b/i.test(value))) {
    return 'Peso'
  }

  return 'Contenido'
}

const getPresentationDisplayRows = (
  product: ProductType,
  contentKeys: string[] = ['weight', 'volume'],
): Array<{ label: string; values: string[] }> => {
  const variants = getProductVariants(product)
  const contentOnlyValues: string[] = []
  const valuesByPresentation = new Map<string, string[]>()

  variants.forEach((variant) => {
    const presentation = normalizeMeasurementLabel(getAttributeValue(variant, ['presentation', 'packaging']))
    const content = normalizeMeasurementLabel(getAttributeValue(variant, contentKeys))

    if (presentation) {
      const values = valuesByPresentation.get(presentation) ?? []
      if (content && normalizeDisplayIdentity(content) !== normalizeDisplayIdentity(presentation)) {
        values.push(content)
      }
      valuesByPresentation.set(presentation, values)
      return
    }

    if (content) {
      contentOnlyValues.push(content)
    }
  })

  if (valuesByPresentation.size > 0) {
    return Array.from(valuesByPresentation.entries()).map(([label, values]) => {
      const normalizedValues = normalizeMeasurementLabels(values)
      return normalizedValues.length > 0
        ? { label, values: normalizedValues }
        : { label: 'Formato', values: [label] }
    })
  }

  const normalizedContentValues = normalizeMeasurementLabels(contentOnlyValues)
  return normalizedContentValues.length > 0
    ? [{ label: inferContentDisplayLabel(normalizedContentValues), values: normalizedContentValues }]
    : []
}

const normalizeDisplayIdentity = (value?: string | null) =>
  normalizeMeasurementLabel(value ?? '')
    .trim()
    .toLowerCase()

const getVariationColorValues = (product: ProductType) =>
  (product.variation ?? [])
    .map((item) => item.color)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

const RESERVED_COMMERCIAL_DISPLAY_ATTRIBUTE_KEYS = new Set([
  'action',
  'archived',
  'archivedat',
  'archivedlegacyid',
  'archivedname',
  'archivedproductid',
  'catalogdisplaymode',
  'description',
  'catalogdisplayaxis',
  'catalogdisplayaxislabel',
  'displayaxis',
  'displayaxislabel',
  'expirationalertdays',
  'expirationdate',
  'image',
  'images',
  'isnew',
  'issale',
  'name',
  'originprice',
  'price',
  'producttype',
  'publicvariantaxis',
  'publicvariantaxislabel',
  'quantity',
  'seodescription',
  'seoimagealt',
  'seosearchterms',
  'seotitle',
  'sku',
  'sold',
  'species',
  'supplier',
  'taxexempt',
  'taxrate',
  'variantaxis',
  'variantaxislabel',
  'variantbasename',
  'variantdefinitionfield',
  'variantdisplaymode',
  'variantgroupkey',
  'variantlabel',
])

const isDisplayableCommercialAttribute = (key: string, value: unknown) => {
  const normalizedKey = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
  if (!normalizedKey || RESERVED_COMMERCIAL_DISPLAY_ATTRIBUTE_KEYS.has(normalizedKey)) return false

  const normalizedValue = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!normalizedValue) return false

  return !['no aplica', 'n/a', 'na', 'null', 'undefined', 'false'].includes(normalizedValue.toLowerCase())
}

const getDetectedCommercialDisplayAxis = (product: ProductType) => {
  for (const variant of getProductVariants(product)) {
    const entries = Object.entries(variant.attributes ?? {})
    const entry = entries.find(([key, value]) => isDisplayableCommercialAttribute(key, value))
    if (entry) return normalizeVariantAxisKey(entry[0])
  }
  return ''
}

const hasColorAndSizeVariant = (product: ProductType) =>
  ['ropa', 'accesorios'].includes(getNormalizedProductType(product))
  && getAttributeValue(product, ['color']) !== ''
  && looksLikeAccessorySizeValue(getAttributeValue(product, ['size']))

const displayAxisFromRawAxis = (axis?: string | null) => {
  const normalizedAxis = normalizeVariantAxisKey(axis)
  if (['weight', 'presentation', 'target'].includes(normalizedAxis)) return normalizedAxis
  if (normalizedAxis === 'color') return 'color'
  if (normalizedAxis === 'size') return 'size'
  if (normalizedAxis === 'flavor') return 'flavor'
  if (normalizedAxis === 'material') return 'material'
  return /^[a-z][a-z0-9_]{1,47}$/.test(normalizedAxis) ? normalizedAxis : ''
}

const getVariantDisplayAxis = (product: ProductType) => {
  const normalizedType = getNormalizedProductType(product)
  const color = getAttributeValue(product, ['color'])
  const displayAxis = getVariantDisplayAxisValue(product)
  const explicitPublicDisplayAxis = displayAxisFromRawAxis(displayAxis)
  if (explicitPublicDisplayAxis) return explicitPublicDisplayAxis

  const rawAxis = getVariantAxisValue(product)
  const explicitVariantAxis = displayAxisFromRawAxis(rawAxis)
  if (explicitVariantAxis) return explicitVariantAxis

  if (
    normalizedType === 'accesorios'
    && color
    && !isSeparateCatalogDisplayMode(getCatalogDisplayModeValue(product))
  ) {
    return 'color'
  }

  const label = getProductVariantLabel(product)
  const labelIdentity = normalizeDisplayIdentity(label)
  if (!labelIdentity) return ''

  const matchesAny = (values: Array<string | null | undefined>) =>
    values.some((value) => normalizeDisplayIdentity(value) === labelIdentity)

  if (matchesAny([getAttributeValue(product, ['color']), ...getVariationColorValues(product)])) return 'color'
  if (matchesAny([getAttributeValue(product, ['flavor'])])) return 'flavor'
  if (matchesAny([getAttributeValue(product, ['target']), getAttributeValue(product, ['age']), getAttributeValue(product, ['range'])])) return 'target'
  if (matchesAny([getAttributeValue(product, ['material'])])) return 'material'
  if (matchesAny([
    getAttributeValue(product, ['weight']),
    getAttributeValue(product, ['volume']),
    getAttributeValue(product, ['dosage']),
    getAttributeValue(product, ['presentation']),
    getAttributeValue(product, ['packaging']),
  ])) return 'presentation'
  const sizeValue = getAttributeValue(product, ['size'])
  if (matchesAny([sizeValue])) {
    return 'size'
  }

  if (normalizedType === 'ropa') return 'size'
  if (normalizedType === 'cuidado') return 'presentation'
  return 'presentation'
}

const collectVariantDisplayValuesForAxis = (product: ProductType, axis: string): string[] => {
  const variants = getProductVariants(product)
  const normalizedType = getNormalizedProductType(product)

  const values = variants.map((variant) => {
    if (axis === 'color') {
      return getAttributeValue(variant, ['color']) || getVariationColorValues(variant)[0] || ''
    }

    if (axis === 'size') {
      return getProductVariantSizeValue(variant) || getAttributeValue(variant, ['size'])
    }

    if (axis === 'flavor') {
      return getAttributeValue(variant, ['flavor'])
    }

    if (axis === 'target') {
      return getAttributeValue(variant, ['target', 'age', 'range'])
    }

    if (axis === 'material') {
      return getAttributeValue(variant, ['material'])
    }

    if (axis === 'presentation') {
      const contentKeys = normalizedType === 'Alimento'
        ? ['weight', 'size', 'volume', 'dosage']
        : normalizedType === 'cuidado'
          ? ['weight', 'volume', 'dosage']
          : ['weight', 'volume', 'size']

      return getAttributeValue(variant, ['presentation', 'packaging'])
        || getProductPresentationDisplayValue(variant, contentKeys)
    }

    if (axis === 'weight') {
      return getAttributeValue(variant, ['weight', 'volume', 'dosage'])
    }

    return getAttributeValue(variant, [axis])
  })

  return normalizeMeasurementLabels(values.filter(Boolean))
}

const getProductPrimaryDisplayAxis = (product: ProductType) => {
  const variants = getProductVariants(product)
  const axes: string[] = Array.from(new Set(
    variants
      .map((variant) => getVariantDisplayAxis(variant))
      .filter((axis) => axis && collectVariantDisplayValuesForAxis(product, axis).length > 0)
  ))

  const normalizedType = getNormalizedProductType(product)
  const orderedAxes: string[] = normalizedType === 'ropa'
    ? ['size', 'color', 'material', 'presentation']
    : normalizedType === 'accesorios'
      ? ['size', 'color', 'material', 'presentation']
      : normalizedType === 'cuidado'
        ? ['presentation', 'dosage', 'range']
        : normalizedType === 'Alimento'
          ? ['presentation', 'flavor', 'target', 'age', 'size']
        : ['presentation', 'size', 'color', 'flavor', 'target', 'age', 'material', 'dosage', 'range']

  return orderedAxes.find((axis) => axes.includes(axis))
    || axes[0]
    || orderedAxes.find((axis) => collectVariantDisplayValuesForAxis(product, axis).length > 0)
    || getDetectedCommercialDisplayAxis(product)
    || ''
}

const getExplicitAxisLabel = (product: ProductType, axis: string) => {
  const attributes = product.attributes ?? {}
  const displayAxis = normalizeVariantAxisKey(attributes.displayAxis || attributes.publicVariantAxis || attributes.catalogDisplayAxis)
  if (displayAxis === axis) {
    const displayLabel = getAttributeValue(product, ['displayAxisLabel', 'publicVariantAxisLabel', 'catalogDisplayAxisLabel'])
    if (displayLabel) return displayLabel.trim()
  }

  const productAxis = normalizeVariantAxisKey(attributes.variantDefinitionField || attributes.variantAxis || product.variantAxis)
  const label = productAxis === axis ? getAttributeValue(product, ['variantAxisLabel']) : ''
  return label.trim()
}

const getDisplayLabelForAxis = (axis: string, normalizedType: string, valueCount: number, product?: ProductType) => {
  const explicitLabel = product ? getExplicitAxisLabel(product, axis) : ''
  if (explicitLabel) return explicitLabel

  const plural = valueCount !== 1
  if (axis === 'color') return plural ? 'Colores' : 'Color'
  if (axis === 'flavor') return plural ? 'Sabores' : 'Sabor'
  if (axis === 'target') return plural ? 'Etapas / rangos' : 'Etapa / rango'
  if (axis === 'material') return plural ? 'Materiales' : 'Material'
  if (axis === 'weight') return 'Contenido / dosis'
  if (['ropa', 'accesorios'].includes(normalizedType) && axis === 'size') return plural ? 'Tallas' : 'Talla'
  if (axis === 'size') return plural ? 'Tamaños' : 'Tamaño'
  if (axis === 'presentation') return plural ? 'Presentaciones' : 'Presentación'
  return axis.replace(/_/g, ' ')
}

const formatVariantDisplayValues = (axis: string, values: string[]) => {
  if (axis !== 'color') return values
  return values.map((value) => toTitleCase(value) || value)
}

const pluralizeSpanishColor = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (/[aeiouáéíóú]$/i.test(trimmed)) return `${trimmed}s`
  return trimmed
}

const getColorValueAliases = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return []

  const genderPairs: Record<string, string> = {
    amarillo: 'amarilla',
    amarilla: 'amarillo',
    blanco: 'blanca',
    blanca: 'blanco',
    morado: 'morada',
    morada: 'morado',
    negro: 'negra',
    negra: 'negro',
    rosa: 'rosado',
    rosado: 'rosa',
    rosada: 'rosa',
    rojo: 'roja',
    roja: 'rojo',
  }
  const genderAlias = genderPairs[trimmed.toLowerCase()]
  const aliases = [trimmed]
  if (genderAlias) {
    aliases.push(genderAlias, toTitleCase(genderAlias) || genderAlias)
  }

  return Array.from(new Set(aliases))
}

const getDisplayAxisValueAliases = (axis: string, value: string) => {
  const normalizedValue = value.trim()
  if (!normalizedValue) return []

  if (axis !== 'color' || !normalizedValue.includes('/')) {
    return getColorValueAliases(normalizedValue)
  }

  const [primary, secondary] = normalizedValue.split('/').map((part) => part.trim()).filter(Boolean)
  if (!primary || !secondary) return [normalizedValue]

  const aliases = [
    normalizedValue,
  ]
  const primaryAliases = getColorValueAliases(primary)
  const secondaryAliases = getColorValueAliases(secondary)
  const secondaryPluralAliases = secondaryAliases.map(pluralizeSpanishColor)

  primaryAliases.forEach((primaryAlias) => {
    secondaryAliases.forEach((secondaryAlias) => {
      aliases.push(
        `${primaryAlias} ${secondaryAlias}`,
        `${primaryAlias} con Detalles ${secondaryAlias}`,
        `${primaryAlias} con detalles ${secondaryAlias}`,
      )
    })
    secondaryPluralAliases.forEach((secondaryPluralAlias) => {
      aliases.push(
        `${primaryAlias} con Detalles ${secondaryPluralAlias}`,
        `${primaryAlias} con detalles ${secondaryPluralAlias}`,
      )
    })
  })

  return Array.from(new Set(aliases))
}

const stripSuffixesFromName = (name: string, labels: string[]) => {
  let strippedName = name.trim()

  const suffixLabels = Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)))
    .sort((left, right) => right.length - left.length)

  for (let pass = 0; pass < 4; pass += 1) {
    const beforePass = strippedName
    suffixLabels.forEach((label) => {
      const escapedLabel = buildFlexibleVariantSuffixPattern(label)
      const separator = requiresSeparatedVariantSuffix(label) ? '(?:\\s+|-)' : '(?:\\s+|-)?'
      strippedName = strippedName.replace(new RegExp(`${separator}${escapedLabel}$`, 'i'), '').trim()
    })
    if (strippedName === beforePass) break
  }

  return strippedName
}

const getDisplayAxisBaseName = (product: ProductType, normalizedName: string) => {
  const displayAxis = getVariantDisplayAxis(product)
  if (!displayAxis) return ''

  const variantField = getVariantAxisValue(product)
  const displayValue = displayAxis === 'color'
    ? getAttributeValue(product, ['color'])
    : getAttributeValue(product, [variantField || displayAxis])
  const keepColorInBase = hasColorAndSizeVariant(product)
    && displayAxis === 'size'
  const secondaryLabels = [
    keepColorInBase ? '' : getAttributeValue(product, ['color']),
    getAttributeValue(product, ['size']),
    getAttributeValue(product, ['weight']),
    getAttributeValue(product, ['presentation']),
    getAttributeValue(product, ['packaging']),
    getAttributeValue(product, ['dosage']),
    getAttributeValue(product, ['volume']),
    getAttributeValue(product, ['range']),
    getAttributeValue(product, ['flavor']),
    getAttributeValue(product, ['target']),
    getAttributeValue(product, ['age']),
    getAttributeValue(product, ['material']),
  ]
  const displayLabels = getDisplayAxisValueAliases(displayAxis, displayValue)
  const strippedName = stripSuffixesFromName(normalizedName, [...secondaryLabels, ...displayLabels])
  if (keepColorInBase) {
    const color = getAttributeValue(product, ['color'])
    const colorAliases = getDisplayAxisValueAliases('color', color)
    const strippedIdentity = normalizeDisplayIdentity(strippedName)
    const hasColorInBase = colorAliases.some((alias) =>
      strippedIdentity.includes(normalizeDisplayIdentity(alias))
    )

    if (strippedName && !hasColorInBase && color) {
      return `${strippedName} ${toTitleCase(color) || color}`.trim()
    }
    if (strippedName && hasColorInBase) {
      return strippedName
    }
  }

  return strippedName && strippedName !== normalizedName ? strippedName : ''
}

export const getProductVariantBaseName = (product: ProductType) => {
  const rawVariantLabel = extractProductVariantLabel(product)
  const variantLabel = normalizeMeasurementLabel(rawVariantLabel)
  const normalizedName = (product.name ?? '').trim()
  if (!rawVariantLabel && !variantLabel) return normalizedName

  const displayAxisBaseName = getDisplayAxisBaseName(product, normalizedName)
  if (displayAxisBaseName) {
    return displayAxisBaseName
  }

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
    getAttributeValue(product, ['flavor']),
    getAttributeValue(product, ['target']),
    getAttributeValue(product, ['age']),
    getAttributeValue(product, ['material']),
    getAttributeValue(product, ['line']),
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

  const strippedName = stripSuffixesFromName(normalizedName, candidateLabels)

  return strippedName || normalizedName
}

export const getProductVariantGroupKey = (product: ProductType) => {
  if (isSeparateCatalogDisplayMode(getCatalogDisplayModeValue(product))) {
    return `single:${product.id}`
  }

  const explicitGroupKey = (product.variantGroupKey || getAttributeValue(product, ['variantGroupKey'])).trim()
  if (explicitGroupKey && !explicitGroupKey.startsWith('single:')) {
    return explicitGroupKey
  }

  const variantLabel = getProductVariantLabel(product)
  if (!variantLabel) {
    return `single:${product.id}`
  }

  const baseName = getProductVariantBaseName(product)
  const variantField = getVariantAxisValue(product)
  const familyAttributeKeys = ['target', 'flavor', 'line'].filter((key) => key !== variantField)
  const groupParts = [
    product.brand,
    product.category,
    product.gender,
    baseName,
    ...familyAttributeKeys.map((key) => getAttributeValue(product, [key])),
    getAttributeValue(product, ['species']),
  ].filter((value) => typeof value === 'string' && value.trim().length > 0)

  return slugify(groupParts.join('|')) || `group:${product.id}`
}

const getProductFamilyNameForSort = (product: ProductType) => {
  const registeredFamilyName = (
    getAttributeValue(product, ['variantBaseName'])
    || product.variantBaseName
    || getProductVariantBaseName(product)
    || product.name
    || ''
  ).trim()

  if (!registeredFamilyName) {
    return registeredFamilyName
  }

  const displayAxis = getVariantDisplayAxis(product)
  const color = getAttributeValue(product, ['color'])
  const shouldStripColorForFamilySort =
    color
    && ['ropa', 'accesorios'].includes(getNormalizedProductType(product))
    && (displayAxis === 'color' || hasColorAndSizeVariant(product))
  if (!shouldStripColorForFamilySort) {
    return registeredFamilyName
  }

  const candidateColorLabels = [
    color,
    ...getDisplayAxisValueAliases('color', color),
    getAttributeValue(product, ['variantLabel']),
    product.variantLabel ?? '',
  ]

  return stripSuffixesFromName(registeredFamilyName, candidateColorLabels) || registeredFamilyName
}

const getProductFamilySortKey = (product: ProductType) => {
  const familyName = getProductFamilyNameForSort(product)
  const variantField = getVariantAxisValue(product)
  const familyParts = [
    product.brand,
    product.category,
    product.productType,
    familyName,
    getAttributeValue(product, variantField === 'target' ? ['species'] : ['species', 'target']),
    getAttributeValue(product, variantField === 'flavor' ? ['line'] : ['flavor', 'line']),
  ].filter((value) => typeof value === 'string' && value.trim().length > 0)

  return slugify(familyParts.join('|')) || `family:${product.id}`
}

export const sortCatalogProductsByFamily = (products: ProductType[]) => {
  const firstIndexByFamily = new Map<string, number>()
  const decorated = products.map((product, index) => {
    const familyKey = getProductFamilySortKey(product)
    if (!firstIndexByFamily.has(familyKey)) {
      firstIndexByFamily.set(familyKey, index)
    }

    return { product, index, familyKey }
  })

  return decorated
    .sort((left, right) => {
      const leftFamilyIndex = firstIndexByFamily.get(left.familyKey) ?? left.index
      const rightFamilyIndex = firstIndexByFamily.get(right.familyKey) ?? right.index

      return leftFamilyIndex - rightFamilyIndex || left.index - right.index
    })
    .map(({ product }) => product)
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
  const displayAxis = getProductPrimaryDisplayAxis(product)
  const axisValues = displayAxis ? collectVariantDisplayValuesForAxis(product, displayAxis) : []

  if (axisValues.length > 0) {
    return axisValues
  }

  const variants = getProductVariants(product)
  const presentationLabels = normalizeMeasurementLabels(
    variants.map((variant) => getProductVariantPresentation(variant)).filter(Boolean),
  )

  if (presentationLabels.length > 0) {
    return presentationLabels
  }

  return normalizeMeasurementLabels(product.sizes ?? [])
}

export const getProductVariantDisplayInfo = (product: ProductType): { label: string; values: string[] } => {
  const displayAxis = getProductPrimaryDisplayAxis(product)
  const values = displayAxis
    ? collectVariantDisplayValuesForAxis(product, displayAxis)
    : getProductVariantDisplayValues(product)
  if (values.length === 0) {
    return { label: 'Opciones', values }
  }

  const normalizedType = getNormalizedProductType(product)
  const hasExplicitAxis = getProductVariants(product).some((variant) => getVariantAxisValue(variant) === displayAxis)
  if (displayAxis === 'presentation' && !hasExplicitAxis) {
    const presentationRows = getPresentationDisplayRows(
      product,
      normalizedType === 'Alimento'
        ? ['weight', 'size', 'volume', 'dosage']
        : normalizedType === 'cuidado'
          ? ['weight', 'volume', 'dosage']
          : ['weight', 'volume', 'size'],
    )

    if (presentationRows.length === 1) {
      return presentationRows[0]
    }

    if (presentationRows.length > 1) {
      return {
        label: 'Formato',
        values: presentationRows.flatMap((row) =>
          row.values.map((value) => `${row.label} ${value}`.trim())
        ),
      }
    }
  }

  return {
    label: getDisplayLabelForAxis(displayAxis, normalizedType, values.length, product),
    values: formatVariantDisplayValues(displayAxis, values),
  }
}

export const getProductVariantDisplayRows = (product: ProductType): Array<{ label: string; values: string[] }> => {
  const variants = getProductVariants(product)
  const normalizedType = getNormalizedProductType(product)
  const hasExplicitAxis = variants.some((variant) => getVariantAxisValue(variant))

  if (hasExplicitAxis) {
    const info = getProductVariantDisplayInfo(product)
    if (info.values.length > 0) {
      return [info]
    }
  }

  if (normalizedType === 'cuidado') {
    const collectAttributeValues = (keys: string[]) =>
      normalizeMeasurementLabels(
        variants.map((variant) => getAttributeValue(variant, keys)).filter(Boolean),
      )

    const rows = [
      { label: 'Contenido / dosis', values: collectAttributeValues(['weight', 'volume', 'dosage']) },
      { label: 'Presentacion', values: collectAttributeValues(['presentation', 'packaging']) },
      { label: 'Etapa / rango recomendado', values: collectAttributeValues(['target', 'age', 'range']) },
    ].filter((row) => row.values.length > 0)

    if (rows.length > 0) {
      return rows
    }
  }

  const info = getProductVariantDisplayInfo(product)
  return info.values.length > 0 ? [info] : []
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
    const productGroupId = getCanonicalProductGroupId({
      ...product,
      variantGroupKey,
    })
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
      productGroupId,
      variantAxis: getVariantAxisValue(product) || product.variantAxis || (variantSizeValue ? 'size' : ''),
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
    const representativeVariantGroupKey = getProductVariantGroupKey(representative)

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
      variantGroupKey: representativeVariantGroupKey,
      productGroupId: getCanonicalProductGroupId({
        ...representative,
        variantGroupKey: representativeVariantGroupKey,
      }),
      variantAxis: getVariantAxisValue(representative) || representative.variantAxis,
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
