import type { ProductType } from '@/type/ProductType'
import { normalizeProductSearch } from '@/lib/productSearch'

export const CATALOG_PRIMARY_FILTER_IDS = [
  'todas',
  'ofertas',
  'alimento',
  'ropa',
  'salud',
  'accesorios',
] as const

export type CatalogPrimaryFilterId = (typeof CATALOG_PRIMARY_FILTER_IDS)[number]

export const isCatalogPrimaryFilterId = (value: string): value is CatalogPrimaryFilterId =>
  CATALOG_PRIMARY_FILTER_IDS.includes(value as CatalogPrimaryFilterId)

export type CatalogSecondaryOption = {
  id: string
  label: string
  count: number
}

export type CatalogSecondaryConfig = {
  id: string
  label: string
  previewCount: number
  options: CatalogSecondaryOption[]
}

type KeywordRule = {
  id: string
  label: string
  keywords: string[]
}

const ALL_SECONDARY_ID = '__all__'

const APPAREL_SIZE_ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const

// Edita estas reglas si quieres cambiar como se agrupan los accesorios.
const ACCESSORY_SUBCATEGORY_RULES: KeywordRule[] = [
  { id: 'camas', label: 'Camas', keywords: ['cama', 'camas', 'colchon', 'colchoneta', 'cojin'] },
  { id: 'rascadores', label: 'Rascadores', keywords: ['rascador', 'rascadores', 'scratch'] },
  { id: 'correas', label: 'Correas', keywords: ['correa', 'correas', 'leash'] },
  { id: 'collares', label: 'Collares', keywords: ['collar', 'collares'] },
  { id: 'arneses', label: 'Arneses', keywords: ['arnes', 'arneses', 'harness'] },
  { id: 'juguetes', label: 'Juguetes', keywords: ['juguete', 'juguetes', 'pelota', 'mordedor', 'peluche', 'cuerda'] },
  { id: 'platos-comederos', label: 'Platos y comederos', keywords: ['comedero', 'comederos', 'plato', 'platos', 'bebedero', 'bebederos'] },
  { id: 'bolsas', label: 'Bolsas', keywords: ['bolsa', 'bolsas', 'higienica', 'higienicas'] },
  { id: 'transportadoras', label: 'Transportadoras', keywords: ['transportadora', 'transportadoras', 'carrier', 'kennel', 'mochila'] },
]

// Edita estas reglas si quieres cambiar como se agrupan los productos de salud.
const HEALTH_SUBCATEGORY_RULES: KeywordRule[] = [
  { id: 'antiparasitarios', label: 'Antiparasitarios', keywords: ['antiparas', 'pipeta', 'pulga', 'garrapata', 'desparasit'] },
  { id: 'medicamentos', label: 'Medicamentos', keywords: ['medic', 'farmac', 'tratamiento', 'otico', 'analges', 'antibiot'] },
  { id: 'suplementos', label: 'Suplementos', keywords: ['suplement', 'vitamina', 'probio', 'omega'] },
  { id: 'higiene', label: 'Higiene', keywords: ['shampoo', 'jabon', 'higiene', 'limpieza', 'dental', 'toallita', 'toallitas'] },
  { id: 'curacion', label: 'Curación', keywords: ['venda', 'gasa', 'curacion', 'cicatriz', 'spray'] },
]

const toSearchableValues = (product: ProductType) => [
  product.name,
  product.brand,
  product.category,
  product.productType,
  product.type,
  product.description,
  ...(product.sizes ?? []),
  ...Object.values(product.attributes ?? {}),
]

const buildBrowseText = (product: ProductType) =>
  normalizeProductSearch(
    toSearchableValues(product)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
  )

const inferRule = (text: string, rules: KeywordRule[]) =>
  rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword))) ?? null

const getUniqueSizeValues = (product: ProductType) =>
  Array.from(
    new Set(
      [
        ...(product.sizes ?? []),
        product.attributes?.size ?? '',
        product.variantLabel ?? '',
      ]
        .map((value) => String(value || '').trim().toUpperCase())
        .filter(Boolean)
    )
  )

const compareSizeLabels = (left: string, right: string) => {
  const leftIndex = APPAREL_SIZE_ORDER.indexOf(left as (typeof APPAREL_SIZE_ORDER)[number])
  const rightIndex = APPAREL_SIZE_ORDER.indexOf(right as (typeof APPAREL_SIZE_ORDER)[number])

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  }

  return left.localeCompare(right, 'es')
}

const buildCountedOptions = (
  idsByProduct: Array<string[]>,
  labelResolver: (id: string) => string,
  sort?: (left: CatalogSecondaryOption, right: CatalogSecondaryOption) => number
) => {
  const counts = new Map<string, number>()

  idsByProduct.forEach((ids) => {
    Array.from(new Set(ids.filter(Boolean))).forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    })
  })

  const options = Array.from(counts.entries()).map(([id, count]) => ({
    id,
    label: labelResolver(id),
    count,
  }))

  return sort ? options.sort(sort) : options
}

const getBrandOptions = (products: ProductType[]) =>
  buildCountedOptions(
    products.map((product) => [String(product.brand || '').trim()]),
    (brand) => brand,
    (left, right) => right.count - left.count || left.label.localeCompare(right.label, 'es')
  )

const getApparelSizeOptions = (products: ProductType[]) =>
  buildCountedOptions(
    products.map((product) => getUniqueSizeValues(product)),
    (size) => size,
    (left, right) => compareSizeLabels(left.label, right.label)
  )

const getRuleOptions = (products: ProductType[], rules: KeywordRule[], fallbackId: string, fallbackLabel: string) =>
  buildCountedOptions(
    products.map((product) => {
      const matched = inferRule(buildBrowseText(product), rules)
      return [matched?.id ?? fallbackId]
    }),
    (id) => rules.find((rule) => rule.id === id)?.label ?? fallbackLabel,
    (left, right) => right.count - left.count || left.label.localeCompare(right.label, 'es')
  )

export const getCatalogSecondaryConfig = (
  primaryFilterId: CatalogPrimaryFilterId,
  products: ProductType[]
): CatalogSecondaryConfig | null => {
  if (primaryFilterId === 'alimento') {
    const options = getBrandOptions(products)
    return options.length > 0
      ? { id: 'brands', label: 'Marcas', previewCount: 10, options }
      : null
  }

  if (primaryFilterId === 'ropa') {
    const options = getApparelSizeOptions(products)
    return options.length > 0
      ? { id: 'sizes', label: 'Tallas', previewCount: 12, options }
      : null
  }

  if (primaryFilterId === 'accesorios') {
    const options = getRuleOptions(products, ACCESSORY_SUBCATEGORY_RULES, 'otros-accesorios', 'Otros accesorios')
    return options.length > 0
      ? { id: 'accessories', label: 'Subcategorías', previewCount: 12, options }
      : null
  }

  if (primaryFilterId === 'salud') {
    const options = getRuleOptions(products, HEALTH_SUBCATEGORY_RULES, 'otros-salud', 'Otros productos de salud')
    return options.length > 0
      ? { id: 'health', label: 'Subcategorías', previewCount: 8, options }
      : null
  }

  return null
}

export const getCatalogAllSecondaryId = () => ALL_SECONDARY_ID

export const getCatalogAllSecondaryOption = (count: number): CatalogSecondaryOption => ({
  id: ALL_SECONDARY_ID,
  label: 'Todas',
  count,
})

export const matchesCatalogSecondaryFilter = (
  product: ProductType,
  primaryFilterId: CatalogPrimaryFilterId,
  secondaryFilterId: string
) => {
  if (!secondaryFilterId || secondaryFilterId === ALL_SECONDARY_ID) {
    return true
  }

  if (primaryFilterId === 'alimento') {
    return String(product.brand || '').trim() === secondaryFilterId
  }

  if (primaryFilterId === 'ropa') {
    return getUniqueSizeValues(product).includes(secondaryFilterId)
  }

  if (primaryFilterId === 'accesorios') {
    const matched = inferRule(buildBrowseText(product), ACCESSORY_SUBCATEGORY_RULES)
    return (matched?.id ?? 'otros-accesorios') === secondaryFilterId
  }

  if (primaryFilterId === 'salud') {
    const matched = inferRule(buildBrowseText(product), HEALTH_SUBCATEGORY_RULES)
    return (matched?.id ?? 'otros-salud') === secondaryFilterId
  }

  return true
}
