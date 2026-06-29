import type { ProductType } from '@/type/ProductType'
import { getProductVariants } from '@/lib/catalog'
import { normalizeMeasurementLabels } from '@/lib/measurementLabel'
import { normalizeProductSpecies, normalizeProductType } from '@/lib/productTaxonomy'

const normalizeLabel = (value?: string | null) => (value ?? '').replace(/\s+/g, ' ').trim()
const normalizeIdentity = (value?: string | null) =>
  normalizeLabel(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const SIZE_PATTERN = /^(?:XXS|XS|S|M|L|XL|XXL|STANDARD|\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TAB|TABS|DS|UN|UNI|PACK|PZA|PZ)|X?\d+)$/i
const looksLikeSizeValue = (value?: string | null) => SIZE_PATTERN.test(normalizeLabel(value))
const looksLikeContentMeasurementValue = (value?: string | null) =>
  /^\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|LBS?|L|ML|MG|OZ)$/i.test(normalizeLabel(value))
const GENERIC_VARIANT_VALUE_TOKENS = new Set([
  'contenido',
  'empaque',
  'formato',
  'opcion',
  'opciones',
  'packaging',
  'peso',
  'presentacion',
  'presentaciones',
  'tamano',
  'talla',
])
const COLOR_WORDS = new Set([
  'amarillo',
  'amarilla',
  'azul',
  'beige',
  'blanco',
  'blanca',
  'cafe',
  'celeste',
  'crema',
  'dorado',
  'dorada',
  'fucsia',
  'gris',
  'lila',
  'marron',
  'morado',
  'morada',
  'naranja',
  'negro',
  'negra',
  'plateado',
  'plateada',
  'rojo',
  'roja',
  'rosa',
  'rosado',
  'rosada',
  'turquesa',
  'verde',
])

const isGenericVariantValue = (value?: string | null) =>
  GENERIC_VARIANT_VALUE_TOKENS.has(normalizeIdentity(value))

const cleanPublicVariantValue = (value?: string | null) => {
  const normalized = normalizeLabel(value)
  return normalized && !isGenericVariantValue(normalized) ? normalized : ''
}

const looksLikeColorValue = (value?: string | null) => {
  const normalized = normalizeIdentity(value)
  if (!normalized || isGenericVariantValue(normalized) || looksLikeSizeValue(value)) return false

  return normalized
    .split(/(?:\/|\+|,|\s+y\s+|\s+con\s+|\s+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => COLOR_WORDS.has(part))
}

export type ProductVariantAxisKey = string

export type ProductVariantAxis = {
  axis: ProductVariantAxisKey
  label: string
  values: string[]
}

export const PRODUCT_VARIANT_AXIS_ORDER: ProductVariantAxisKey[] = [
  'color',
  'size',
  'presentation',
  'weight',
  'volume',
  'packaging',
  'dosage',
  'range',
  'flavor',
  'target',
  'age',
  'material',
]

const VARIANT_AXIS_ALIASES: Record<string, ProductVariantAxisKey> = {
  volume: 'weight',
  dosage: 'weight',
  packaging: 'presentation',
  age: 'target',
  range: 'target',
}

const RESERVED_VARIANT_AXIS_FIELDS = new Set([
  'sku',
  'name',
  'price',
  'quantity',
  'supplier',
  'taxrate',
  'taxexempt',
  'seotitle',
  'seodescription',
  'seoimagealt',
  'seosearchterms',
  'variantaxis',
  'variantaxislabel',
  'variantdefinitionfield',
  'variantlabel',
  'variantbasename',
  'variantgroupkey',
  'catalogdisplaymode',
  'variantdisplaymode',
])

const normalizeVariantAxisKey = (value?: string | null): ProductVariantAxisKey | '' => {
  const normalized = normalizeIdentity(value)
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const axis = VARIANT_AXIS_ALIASES[normalized] ?? normalized
  if (!axis || RESERVED_VARIANT_AXIS_FIELDS.has(axis.replace(/_/g, ''))) return ''
  return PRODUCT_VARIANT_AXIS_ORDER.includes(axis) || /^[a-z][a-z0-9_]{1,47}$/.test(axis)
    ? axis
    : ''
}

const getExplicitVariantDefinitionAxis = (variant: ProductType): ProductVariantAxisKey | '' => {
  const definitionAxis = normalizeVariantAxisKey(variant.attributes?.variantDefinitionField)
  if (definitionAxis) return definitionAxis

  const legacyAxis = normalizeVariantAxisKey(variant.attributes?.variantAxis || variant.variantAxis)
  if (
    legacyAxis === 'size'
    && normalizeProductType(variant.productType ?? '', variant.category) === 'Alimento'
    && (
      looksLikeContentMeasurementValue(variant.attributes?.size)
      || normalizeLabel(variant.attributes?.weight) !== ''
    )
  ) {
    return 'weight'
  }

  return legacyAxis
}

const uniqueLabels = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizeLabel(value))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, 'es'))

const collectVariantValues = (
  product: ProductType,
  extractor: (variant: ProductType) => Array<string | null | undefined>
) => getProductVariants(product).flatMap((variant) => extractor(variant))

export const getVariantSizeValue = (variant: ProductType) => {
  const productType = normalizeProductType(variant.productType ?? '', variant.category)
  if (productType === 'cuidado') {
    return ''
  }

  const normalizePublicSize = (value?: string | null) => {
    const cleaned = cleanPublicVariantValue(value)
    return cleaned ? (normalizeMeasurementLabels([cleaned])[0] ?? cleaned) : ''
  }

  const explicitSize = normalizePublicSize(variant.attributes?.size)
  if (explicitSize) {
    return explicitSize
  }

  if (productType === 'Alimento') {
    const foodSize = [
      variant.attributes?.weight,
      variant.attributes?.volume,
      variant.attributes?.presentation,
      variant.attributes?.packaging,
      variant.variantPresentation,
      variant.variantLabel,
      variant.attributes?.variantLabel,
    ]
      .map(normalizePublicSize)
      .find(Boolean)

    if (foodSize) return foodSize
  }

  const variantLabel = normalizeLabel(variant.variantLabel || variant.attributes?.variantLabel)
  return looksLikeSizeValue(variantLabel) && !isGenericVariantValue(variantLabel)
    ? (normalizeMeasurementLabels([variantLabel])[0] ?? variantLabel)
    : ''
}

export const getVariantColorValue = (variant: ProductType) => {
  const explicitColor = cleanPublicVariantValue(variant.attributes?.color)
  if (explicitColor) return explicitColor

  const variationColor = uniqueLabels((variant.variation ?? []).map((item) => cleanPublicVariantValue(item.color)))[0] ?? ''
  if (variationColor) return variationColor

  const axis = normalizeIdentity(
    variant.attributes?.displayAxis
    || variant.attributes?.publicVariantAxis
    || variant.attributes?.catalogDisplayAxis
    || variant.attributes?.variantAxis
    || variant.attributes?.variantDefinitionField
  )
  const productType = normalizeProductType(variant.productType ?? '', variant.category)
  const explicitSize = cleanPublicVariantValue(variant.attributes?.size)
  const variantLabel = normalizeLabel(variant.variantLabel || variant.attributes?.variantLabel)
  if (
    axis === 'color'
    && !explicitSize
    && cleanPublicVariantValue(variantLabel)
    && !looksLikeSizeValue(variantLabel)
  ) {
    return variantLabel
  }

  if (
    ['ropa', 'accesorios'].includes(productType)
    && !explicitSize
    && looksLikeColorValue(variantLabel)
  ) {
    return variantLabel
  }

  return ''
}

export const getVariantAxisValue = (variant: ProductType, axis: ProductVariantAxisKey) => {
  if (axis === 'color') return getVariantColorValue(variant)
  if (axis === 'size') return getVariantSizeValue(variant)

  const attributes = variant.attributes ?? {}
  const value = (() => {
    switch (axis) {
      case 'presentation':
        return attributes.presentation || attributes.packaging
      case 'weight':
        return attributes.weight || attributes.volume || attributes.dosage
      case 'volume':
        return attributes.volume
      case 'packaging':
        return attributes.packaging
      case 'dosage':
        return attributes.dosage
      case 'range':
        return attributes.range
      case 'material':
        return attributes.material
      case 'flavor':
        return attributes.flavor || attributes.sabor
      case 'target':
        return attributes.target || attributes.age || attributes.edad || attributes.range
      case 'age':
        return attributes.age || attributes.edad
      default:
        return attributes[axis]
    }
  })()

  const normalized = normalizeLabel(typeof value === 'string' ? value : String(value ?? ''))
  if (!normalized) return ''

  return ['weight', 'volume', 'dosage', 'range', 'target'].includes(axis)
    ? (normalizeMeasurementLabels([normalized])[0] ?? normalized)
    : normalized
}

const getUniqueVariantAxisValues = (product: ProductType, axis: ProductVariantAxisKey) =>
  axis === 'color'
    ? uniqueLabels(collectVariantValues(product, (variant) => [getVariantAxisValue(variant, axis)]))
    : normalizeMeasurementLabels(
        collectVariantValues(product, (variant) => [getVariantAxisValue(variant, axis)])
      )

const variantAxisValuesIdentity = (values: string[]) =>
  Array.from(new Set(values.map(normalizeIdentity).filter(Boolean)))
    .sort()
    .join('|')

const hasEquivalentAxisValues = (left: ProductVariantAxis, right: ProductVariantAxis) =>
  variantAxisValuesIdentity(left.values) !== ''
  && variantAxisValuesIdentity(left.values) === variantAxisValuesIdentity(right.values)

const shouldSkipDuplicateVariantAxis = (
  product: ProductType,
  axisInfo: ProductVariantAxis,
  axisCandidates: ProductVariantAxis[],
) => {
  void product

  if (
    axisInfo.axis === 'size'
    && axisCandidates.some((candidate) =>
      ['weight', 'volume'].includes(candidate.axis) && hasEquivalentAxisValues(axisInfo, candidate)
    )
  ) {
    return true
  }

  return false
}

const getConsistentExplicitVariantAxis = (variants: ProductType[]): ProductVariantAxisKey | '' => {
  const explicitAxes = Array.from(new Set(
    variants
      .map((variant) => getExplicitVariantDefinitionAxis(variant))
      .filter(Boolean)
  ))

  return explicitAxes.length === 1 ? explicitAxes[0] : ''
}

const hasMultipleVariantValues = (values: string[]) =>
  new Set(values.map(normalizeIdentity).filter(Boolean)).size > 1

const getCommonPresentationLabel = (product: ProductType) => {
  const presentations = uniqueLabels(
    collectVariantValues(product, (variant) => [
      variant.attributes?.presentation || variant.attributes?.packaging,
    ])
  )
  return presentations.length === 1 ? presentations[0] : ''
}

const normalizeVariantAxisLabel = (label: string) => {
  const identity = normalizeIdentity(label)
  if (identity === 'presentacion' || identity === 'presentaciones') return 'Presentación'
  if (identity === 'tamano') return 'Tamaño'
  return label
}

export const getVariantAxisLabel = (product: ProductType, axis: ProductVariantAxisKey) => {
  const productType = normalizeProductType(product.productType ?? '', product.category)
  const productAxis = normalizeVariantAxisKey(product.attributes?.variantDefinitionField || product.attributes?.variantAxis || product.variantAxis)
  const explicitLabel = normalizeLabel(
    productAxis === axis
      ? product.attributes?.variantAxisLabel
      : ''
  )
  if (explicitLabel) return normalizeVariantAxisLabel(explicitLabel)

  if (axis === 'color') return 'Color'
  if (axis === 'size') return ['ropa', 'accesorios'].includes(productType) ? 'Talla' : 'Tamaño'
  if (axis === 'presentation') return 'Presentación'
  if (axis === 'weight') return normalizeVariantAxisLabel(getCommonPresentationLabel(product) || 'Contenido / dosis')
  if (axis === 'volume') return normalizeVariantAxisLabel(getCommonPresentationLabel(product) || 'Contenido')
  if (axis === 'packaging') return 'Empaque'
  if (axis === 'dosage') return 'Dosis'
  if (axis === 'range') return 'Rango recomendado'
  if (axis === 'material') return 'Material'
  if (axis === 'flavor') return 'Sabor'
  if (axis === 'target') return 'Etapa / rango'
  if (axis === 'age') return 'Edad'
  return normalizeVariantAxisLabel(axis.replace(/_/g, ' '))
}

export const getProductVariantAxes = (product: ProductType): ProductVariantAxis[] => {
  const variants = getProductVariants(product)
  if (variants.length <= 1) return []

  const explicitAxis = getConsistentExplicitVariantAxis(variants)
  if (explicitAxis) {
    const explicitValues = getUniqueVariantAxisValues(product, explicitAxis)
    if (hasMultipleVariantValues(explicitValues)) {
      return [{
        axis: explicitAxis,
        label: getVariantAxisLabel(product, explicitAxis),
        values: explicitValues,
      }]
    }
  }

  const axisCandidates = PRODUCT_VARIANT_AXIS_ORDER
    .map((axis) => ({
      axis,
      label: getVariantAxisLabel(product, axis),
      values: getUniqueVariantAxisValues(product, axis),
    }))
    .filter((item) => hasMultipleVariantValues(item.values))

  return axisCandidates.filter((item) => !shouldSkipDuplicateVariantAxis(product, item, axisCandidates))
}

export const getProductSizeValues = (product: ProductType) =>
  normalizeMeasurementLabels(
    collectVariantValues(product, (variant) => [getVariantSizeValue(variant)])
  )

export const getProductColorValues = (product: ProductType) =>
  uniqueLabels([
    ...collectVariantValues(product, (variant) => [
      getVariantColorValue(variant),
      ...(variant.variation ?? []).map((item) => item.color),
    ]),
    ...(product.variation ?? []).map((item) => item.color),
  ])

export const getProductMaterialValues = (product: ProductType) =>
  uniqueLabels(
    collectVariantValues(product, (variant) => [
      variant.attributes?.material,
    ])
  )

export const getProductSpeciesValues = (product: ProductType) =>
  uniqueLabels(
    collectVariantValues(product, (variant) => [
      normalizeProductSpecies(variant.attributes?.species, variant.gender),
    ])
  )

export const matchesCatalogAttribute = (
  values: Array<string | null | undefined>,
  selectedValue?: string | null
) => {
  if (!selectedValue) return true
  return uniqueLabels(values).includes(normalizeLabel(selectedValue))
}
