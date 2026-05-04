import {
  PET_SPECIES_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from '@/lib/productTaxonomy'

export const PRODUCT_REFERENCE_KEYS = [
  'categories',
  'brands',
  'suppliers',
  'sizes',
  'materials',
  'colors',
  'usages',
  'presentations',
  'activeIngredients',
  'storageLocations',
  'tags',
  'flavors',
  'ageRanges',
] as const

export type ProductReferenceKey = (typeof PRODUCT_REFERENCE_KEYS)[number]

export type ProductSupplierReference = {
  id: string
  name: string
  document: string
  purchaseTaxRate: string
  email: string
  phone: string
  contactName: string
  address: string
  notes: string
}

export type ProductBrandReference = {
  id: string
  name: string
  logoUrl: string
}

export type ProductReferenceData = {
  categories: string[]
  brands: ProductBrandReference[]
  suppliers: ProductSupplierReference[]
  sizes: string[]
  materials: string[]
  colors: string[]
  usages: string[]
  presentations: string[]
  activeIngredients: string[]
  storageLocations: string[]
  tags: string[]
  flavors: string[]
  ageRanges: string[]
}

export type ProductReferenceSection = {
  key: ProductReferenceKey
  title: string
  sidebarTitle: string
  description: string
  itemLabel: string
  placeholder: string
  kind?: 'text' | 'brand' | 'supplier'
  menuIcon:
    | 'SealCheck'
    | 'Truck'
    | 'Ruler'
    | 'Stack'
    | 'Palette'
    | 'ArrowsClockwise'
    | 'Package'
    | 'Flask'
    | 'MapPin'
    | 'Tag'
    | 'BowlFood'
    | 'HourglassMedium'
}

export type ProductSystemReferenceGroup = {
  title: string
  description: string
  values: string[]
}

const collapseWhitespace = (value?: string | null) => (value ?? '').replace(/\s+/g, ' ').trim()
const normalizeComparable = (value?: string | null) => collapseWhitespace(value).toLocaleLowerCase('es-EC')
const normalizeDocumentComparable = (value?: string | null) =>
  collapseWhitespace(value)
    .toLocaleUpperCase('es-EC')
    .replace(/[^A-Z0-9]+/g, '')
const normalizeEmail = (value?: string | null) => collapseWhitespace(value).toLocaleLowerCase('es-EC')
const normalizeRate = (value?: string | number | null) => {
  const raw = collapseWhitespace(typeof value === 'number' ? String(value) : value)
  if (!raw) return ''

  const normalized = raw.replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return ''

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return ''
  return parsed.toFixed(2).replace(/\.00$/, '')
}
const createSlug = (value?: string | null) =>
  normalizeDocumentComparable(value)
    .toLocaleLowerCase('es-EC')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createEmptyProductSupplierReference = (): ProductSupplierReference => ({
  id: '',
  name: '',
  document: '',
  purchaseTaxRate: '',
  email: '',
  phone: '',
  contactName: '',
  address: '',
  notes: '',
})

export const createEmptyProductBrandReference = (): ProductBrandReference => ({
  id: '',
  name: '',
  logoUrl: '',
})

export const createProductBrandReferenceId = (
  name?: string | null,
  fallback = '',
) => {
  const slug = createSlug(name || fallback)
  return slug ? `brand-${slug}` : `brand-${Date.now()}`
}

export const createProductSupplierReferenceId = (
  name?: string | null,
  document?: string | null,
  fallback = '',
) => {
  const slug = createSlug(document || name || fallback)
  return slug ? `supplier-${slug}` : `supplier-${Date.now()}`
}

export const createEmptyProductReferenceData = (): ProductReferenceData => ({
  categories: [],
  brands: [],
  suppliers: [],
  sizes: [],
  materials: [],
  colors: [],
  usages: [],
  presentations: [],
  activeIngredients: [],
  storageLocations: [],
  tags: [],
  flavors: [],
  ageRanges: [],
})

export const createProductReferenceKeyRecord = <T>(factory: (key: ProductReferenceKey) => T): Record<ProductReferenceKey, T> =>
  PRODUCT_REFERENCE_KEYS.reduce((acc, key) => {
    acc[key] = factory(key)
    return acc
  }, {} as Record<ProductReferenceKey, T>)

export const PRODUCT_REFERENCE_KEY_SET = new Set<ProductReferenceKey>(PRODUCT_REFERENCE_KEYS)

export const normalizeReferenceList = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []

  const seen = new Set<string>()
  const normalized: string[] = []

  input.forEach((value) => {
    const item = collapseWhitespace(typeof value === 'string' ? value : String(value ?? ''))
    if (!item) return

    const dedupeKey = item.toLocaleLowerCase('es-EC')
    if (seen.has(dedupeKey)) return

    seen.add(dedupeKey)
    normalized.push(item)
  })

  return normalized
}

export const normalizeProductBrandRecord = (
  input: unknown,
  fallbackId = '',
): ProductBrandReference | null => {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : typeof input === 'string'
        ? { name: input }
        : null

  if (!source) return null

  const name = collapseWhitespace(
    typeof source.name === 'string'
      ? source.name
      : typeof source.label === 'string'
        ? source.label
        : typeof source.brand === 'string'
          ? source.brand
          : '',
  )
  if (!name) return null

  const logoUrl = collapseWhitespace(
    typeof source.logoUrl === 'string'
      ? source.logoUrl
      : typeof source.logo_url === 'string'
        ? source.logo_url
        : typeof source.imageUrl === 'string'
          ? source.imageUrl
          : typeof source.image === 'string'
            ? source.image
            : typeof source.logo === 'string'
              ? source.logo
              : '',
  )
  const id = collapseWhitespace(typeof source.id === 'string' ? source.id : '')

  return {
    id: id || createProductBrandReferenceId(name, fallbackId),
    name,
    logoUrl,
  }
}

export const normalizeProductBrandRecords = (input: unknown): ProductBrandReference[] => {
  if (!Array.isArray(input)) return []

  const seenNames = new Set<string>()
  const seenIds = new Set<string>()
  const normalized: ProductBrandReference[] = []

  input.forEach((item, index) => {
    const brand = normalizeProductBrandRecord(item, String(index + 1))
    if (!brand) return

    const nameKey = normalizeComparable(brand.name)
    if (seenNames.has(nameKey)) return

    seenNames.add(nameKey)

    const baseId = brand.id || createProductBrandReferenceId(brand.name, String(index + 1))
    let nextId = baseId
    let suffix = 2
    while (seenIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`
      suffix += 1
    }
    seenIds.add(nextId)
    normalized.push({ ...brand, id: nextId })
  })

  return normalized.sort((left, right) => left.name.localeCompare(right.name, 'es-EC', { sensitivity: 'base' }))
}

export const normalizeProductSupplierRecord = (
  input: unknown,
  fallbackId = '',
): ProductSupplierReference | null => {
  const source =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : typeof input === 'string'
        ? { name: input }
        : null

  if (!source) return null

  const name = collapseWhitespace(
    typeof source.name === 'string'
      ? source.name
      : typeof source.supplierName === 'string'
        ? source.supplierName
        : typeof source.label === 'string'
          ? source.label
          : '',
  )
  if (!name) return null

  const document = collapseWhitespace(
    typeof source.document === 'string'
      ? source.document
      : typeof source.supplierDocument === 'string'
        ? source.supplierDocument
        : '',
  )
  const purchaseTaxRate = normalizeRate(
    typeof source.purchaseTaxRate === 'number' || typeof source.purchaseTaxRate === 'string'
      ? source.purchaseTaxRate
      : typeof source.purchase_tax_rate === 'number' || typeof source.purchase_tax_rate === 'string'
        ? source.purchase_tax_rate
        : '',
  )
  const email = normalizeEmail(typeof source.email === 'string' ? source.email : '')
  const phone = collapseWhitespace(typeof source.phone === 'string' ? source.phone : '')
  const contactName = collapseWhitespace(
    typeof source.contactName === 'string'
      ? source.contactName
      : typeof source.contact_name === 'string'
        ? source.contact_name
        : '',
  )
  const address = collapseWhitespace(typeof source.address === 'string' ? source.address : '')
  const notes = collapseWhitespace(typeof source.notes === 'string' ? source.notes : '')
  const id = collapseWhitespace(typeof source.id === 'string' ? source.id : '')

  return {
    id: id || createProductSupplierReferenceId(name, document, fallbackId),
    name,
    document,
    purchaseTaxRate,
    email,
    phone,
    contactName,
    address,
    notes,
  }
}

export const normalizeProductSupplierRecords = (input: unknown): ProductSupplierReference[] => {
  if (!Array.isArray(input)) return []

  const seenNames = new Set<string>()
  const seenDocuments = new Set<string>()
  const normalized: ProductSupplierReference[] = []

  input.forEach((item, index) => {
    const supplier = normalizeProductSupplierRecord(item, String(index + 1))
    if (!supplier) return

    const nameKey = normalizeComparable(supplier.name)
    const documentKey = normalizeDocumentComparable(supplier.document)

    if (nameKey && seenNames.has(nameKey)) return
    if (documentKey && seenDocuments.has(documentKey)) return

    seenNames.add(nameKey)
    if (documentKey) {
      seenDocuments.add(documentKey)
    }

    normalized.push(supplier)
  })

  return normalized.sort((left, right) => left.name.localeCompare(right.name, 'es-EC', { sensitivity: 'base' }))
}

export const normalizeProductReferenceData = (input?: Partial<Record<ProductReferenceKey, unknown>> | null): ProductReferenceData => {
  const defaults = createEmptyProductReferenceData()
  const source = input || {}

  PRODUCT_REFERENCE_KEYS.forEach((key) => {
    if (key === 'brands') {
      defaults.brands = normalizeProductBrandRecords(source.brands)
      return
    }

    if (key === 'suppliers') {
      defaults.suppliers = normalizeProductSupplierRecords(source.suppliers)
      return
    }

    defaults[key] = normalizeReferenceList(source[key]) as never
  })

  return defaults
}

export const getReferenceOptionsWithCurrent = (options: string[], currentValue?: string | null) => {
  const normalizedOptions = normalizeReferenceList(options)
  const current = collapseWhitespace(currentValue)
  if (!current) return normalizedOptions

  const compactCurrent = current.toLocaleLowerCase('es-EC').replace(/\s+/g, '')
  const existingOption = normalizedOptions.find((option) => {
    const compactOption = collapseWhitespace(option).toLocaleLowerCase('es-EC').replace(/\s+/g, '')
    return compactOption === compactCurrent
  })

  if (existingOption) return normalizedOptions

  return normalizeReferenceList([current, ...normalizedOptions])
}

export const getBrandOptionsWithCurrent = (
  brands: ProductBrandReference[],
  currentValue?: string | null,
) => getReferenceOptionsWithCurrent(brands.map((brand) => brand.name), currentValue)

export const getBrandSearchText = (brand: ProductBrandReference) =>
  [
    brand.name,
    brand.logoUrl,
    brand.logoUrl ? 'con logo' : 'sin logo',
  ]
    .filter(Boolean)
    .join(' ')

export const getSupplierSelectLabel = (supplier: ProductSupplierReference) =>
  supplier.document ? `${supplier.name} · ${supplier.document}` : supplier.name

export const getSupplierPurchaseTaxRateLabel = (
  supplier?: Pick<ProductSupplierReference, 'purchaseTaxRate'> | null,
  fallback = 'IVA compra por sistema',
) => {
  const normalizedRate = normalizeRate(supplier?.purchaseTaxRate)
  return normalizedRate !== '' ? `IVA compra ${normalizedRate}%` : fallback
}

export const getSupplierOptionsWithCurrent = (
  suppliers: ProductSupplierReference[],
  currentValue?: string | null,
) => {
  const normalizedSuppliers = normalizeProductSupplierRecords(suppliers)
  const options = normalizedSuppliers.map((supplier) => ({
    value: supplier.name,
    label: getSupplierSelectLabel(supplier),
  }))
  const current = collapseWhitespace(currentValue)

  if (!current || options.some((option) => normalizeComparable(option.value) === normalizeComparable(current))) {
    return options
  }

  return [{ value: current, label: current }, ...options]
}

export const findSupplierReference = (
  suppliers: ProductSupplierReference[],
  value?: string | null,
): ProductSupplierReference | null => {
  const needle = collapseWhitespace(value)
  if (!needle) return null

  const comparableValue = normalizeComparable(needle)
  const comparableDocument = normalizeDocumentComparable(needle)

  return (
    suppliers.find((supplier) => supplier.id === needle) ||
    suppliers.find((supplier) => normalizeComparable(supplier.name) === comparableValue) ||
    suppliers.find((supplier) => normalizeDocumentComparable(supplier.document) === comparableDocument) ||
    null
  )
}

export const getSupplierSearchText = (supplier: ProductSupplierReference) =>
  [
    supplier.name,
    supplier.document,
    supplier.purchaseTaxRate ? `iva compra ${supplier.purchaseTaxRate}` : '',
    supplier.email,
    supplier.phone,
    supplier.contactName,
    supplier.address,
    supplier.notes,
  ]
    .filter(Boolean)
    .join(' ')

export const PRODUCT_REFERENCE_SECTIONS: ProductReferenceSection[] = [
  {
    key: 'categories',
    title: 'Categorías públicas',
    sidebarTitle: 'Categorías',
    description: 'Categorías visibles en tienda, filtros, sitemap y fichas de producto.',
    itemLabel: 'categoría',
    placeholder: 'Ej: Snacks naturales',
    menuIcon: 'Tag',
  },
  {
    key: 'brands',
    title: 'Marcas',
    sidebarTitle: 'Marcas',
    description: 'Marca comercial visible en catálogo, ficha de producto y carrusel de logos.',
    itemLabel: 'marca',
    placeholder: 'Ej: Frontline',
    kind: 'brand',
    menuIcon: 'SealCheck',
  },
  {
    key: 'suppliers',
    title: 'Proveedores',
    sidebarTitle: 'Proveedores',
    description: 'Ficha completa del proveedor para compras: RUC/documento, contacto, correo y teléfono.',
    itemLabel: 'proveedor',
    placeholder: 'Ej: Agripac',
    kind: 'supplier',
    menuIcon: 'Truck',
  },
  {
    key: 'sizes',
    title: 'Tallas y tamaños',
    sidebarTitle: 'Tallas',
    description: 'Reutiliza medidas y presentaciones frecuentes como S, M, 1 Kg o 500 ml.',
    itemLabel: 'talla o tamaño',
    placeholder: 'Ej: XL',
    menuIcon: 'Ruler',
  },
  {
    key: 'materials',
    title: 'Materiales',
    sidebarTitle: 'Materiales',
    description: 'Material principal de accesorios y ropa.',
    itemLabel: 'material',
    placeholder: 'Ej: Nylon',
    menuIcon: 'Stack',
  },
  {
    key: 'colors',
    title: 'Colores',
    sidebarTitle: 'Colores',
    description: 'Colores frecuentes para ropa y accesorios.',
    itemLabel: 'color',
    placeholder: 'Ej: Azul',
    menuIcon: 'Palette',
  },
  {
    key: 'usages',
    title: 'Usos',
    sidebarTitle: 'Usos',
    description: 'Destino o uso del producto, especialmente en accesorios y salud.',
    itemLabel: 'uso',
    placeholder: 'Ej: Paseo',
    menuIcon: 'ArrowsClockwise',
  },
  {
    key: 'presentations',
    title: 'Presentaciones',
    sidebarTitle: 'Presentaciones',
    description: 'Formatos comerciales de productos de salud o medicina.',
    itemLabel: 'presentación',
    placeholder: 'Ej: Spray 120 ml',
    menuIcon: 'Package',
  },
  {
    key: 'activeIngredients',
    title: 'Ingredientes activos',
    sidebarTitle: 'Ingredientes',
    description: 'Principios activos de medicamentos y productos de salud.',
    itemLabel: 'ingrediente activo',
    placeholder: 'Ej: Fipronil',
    menuIcon: 'Flask',
  },
  {
    key: 'storageLocations',
    title: 'Ubicaciones de almacenamiento',
    sidebarTitle: 'Ubicaciones',
    description: 'Ubicaciones de bodega o percha reutilizables.',
    itemLabel: 'ubicación',
    placeholder: 'Ej: Percha A-3',
    menuIcon: 'MapPin',
  },
  {
    key: 'tags',
    title: 'Etiquetas',
    sidebarTitle: 'Etiquetas',
    description: 'Etiquetas cortas usadas para panel, ficha o clasificación interna.',
    itemLabel: 'etiqueta',
    placeholder: 'Ej: Premium',
    menuIcon: 'Tag',
  },
  {
    key: 'flavors',
    title: 'Sabores',
    sidebarTitle: 'Sabores',
    description: 'Sabores frecuentes para Alimento y snacks.',
    itemLabel: 'sabor',
    placeholder: 'Ej: Pollo',
    menuIcon: 'BowlFood',
  },
  {
    key: 'ageRanges',
    title: 'Edades',
    sidebarTitle: 'Edades',
    description: 'Rangos de edad comerciales como cachorro, adulto o senior.',
    itemLabel: 'edad',
    placeholder: 'Ej: Adulto',
    menuIcon: 'HourglassMedium',
  },
]

export const PRODUCT_SYSTEM_REFERENCE_GROUPS: ProductSystemReferenceGroup[] = [
  {
    title: 'Tipos de producto',
    description: 'Definen atributos y validaciones del editor.',
    values: PRODUCT_TYPE_OPTIONS.map((option) => option.label),
  },
  {
    title: 'Mascota o especie',
    description: 'Controla en que secciones publicas aparece el producto.',
    values: PET_SPECIES_OPTIONS.map((option) => option.label),
  },
]
