import { normalizeProductCategory, normalizeProductType } from '@/lib/productTaxonomy'
import { versionStaticAssetPath } from '@/lib/staticAsset'
import type { ProductType } from '@/type/ProductType'

export interface PetCategoryCard {
  id: string
  label: string
  image: string
  alt: string
}

export type PetCategoryFilter = {
  category?: string
  categories?: string[]
  gender?: string
  genders?: string[]
  productType?: string
  productTypes?: string[]
}

export type ResolvedPetCategoryFilter = {
  categories: string[]
  genders: string[]
  productTypes: string[]
}

export type PetCategoryImageSpec = {
  src: string
  fileName: string
  aspect: string
  recommendedResolution: string
  minimumResolution: string
}

export type PetCategoryFeaturedImageVariant =
  | 'mobilePrimary'
  | 'mobileSecondary'
  | 'desktopPrimary'
  | 'desktopSecondary'

type PetCategoryDefinition = {
  id: string
  label: string
  alt?: string
  route: string
  filter?: PetCategoryFilter
  showInFooter?: boolean
  showInShopBrowse?: boolean
}

type PetCategoryDefinitionMap = Record<string, PetCategoryDefinition>
type PetCategoryImageMap = Record<string, PetCategoryImageSpec>
type PetCategoryFeaturedImageMap = Partial<Record<PetCategoryFeaturedImageVariant, PetCategoryImageSpec>>
type PetCategoryFeaturedImageSetMap = Record<string, PetCategoryFeaturedImageMap>

export const PET_HOME_TOP_IMAGE_GUIDE = {
  directory: '/public/images/collection/home-top',
  aspect: '4:5',
  recommendedResolution: '1200x1500',
  minimumResolution: '960x1200',
  usage: 'Carrusel superior de Categorías del home',
} as const

export const PET_HOME_FEATURED_IMAGE_GUIDES = {
  mobilePrimary: {
    directory: '/public/images/collection/home-featured',
    aspect: '16:10',
    recommendedResolution: '1176x736',
    minimumResolution: '960x600',
    usage: 'Collection2 en movil, tarjeta principal superior de Alimento',
  },
  mobileSecondary: {
    directory: '/public/images/collection/home-featured',
    aspect: '1:1',
    recommendedResolution: '588x588',
    minimumResolution: '500x500',
    usage: 'Collection2 en movil, tarjetas cuadradas secundarias de Salud y Accesorios',
  },
  desktopPrimary: {
    directory: '/public/images/collection/home-featured',
    aspect: '630:620',
    recommendedResolution: '1260x1240',
    minimumResolution: '1000x984',
    usage: 'Collection2 en desktop, tarjeta grande izquierda de Alimento',
  },
  desktopSecondary: {
    directory: '/public/images/collection/home-featured',
    aspect: '630:295',
    recommendedResolution: '1260x590',
    minimumResolution: '1000x468',
    usage: 'Collection2 en desktop, tarjetas derechas de Salud y Accesorios',
  },
} as const

export const PET_HOME_FEATURED_IMAGE_GUIDE = {
  directory: '/public/images/collection/home-featured',
  aspect: 'slot-specific',
  recommendedResolution: 'usar PET_HOME_FEATURED_IMAGE_GUIDES por variante',
  minimumResolution: 'usar PET_HOME_FEATURED_IMAGE_GUIDES por variante',
  usage: 'Bloque grande inferior del home. Cada slot usa su propia imagen para evitar recortes malos.',
} as const

const topAsset = (fileName: string): PetCategoryImageSpec => ({
  src: versionStaticAssetPath(`/images/collection/home-top/${fileName}`),
  fileName,
  aspect: PET_HOME_TOP_IMAGE_GUIDE.aspect,
  recommendedResolution: PET_HOME_TOP_IMAGE_GUIDE.recommendedResolution,
  minimumResolution: PET_HOME_TOP_IMAGE_GUIDE.minimumResolution,
})

const featuredVariantAsset = (
  variant: PetCategoryFeaturedImageVariant,
  fileName: string
): PetCategoryImageSpec => ({
  src: versionStaticAssetPath(`/images/collection/home-featured/${fileName}`),
  fileName,
  aspect: PET_HOME_FEATURED_IMAGE_GUIDES[variant].aspect,
  recommendedResolution: PET_HOME_FEATURED_IMAGE_GUIDES[variant].recommendedResolution,
  minimumResolution: PET_HOME_FEATURED_IMAGE_GUIDES[variant].minimumResolution,
})

const toTitleCase = (value?: string) => {
  if (!value) return ''

  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const findMapValueCaseInsensitive = <T,>(map: Record<string, T>, key?: string | null) => {
  if (!key) return undefined

  const exact = map[key]
  if (exact) return exact

  const normalized = key.toLowerCase()
  const resolvedKey = Object.keys(map).find((candidate) => candidate.toLowerCase() === normalized)
  return resolvedKey ? map[resolvedKey] : undefined
}

const DEFAULT_HOME_TOP_IMAGE = versionStaticAssetPath('/images/collection/home-top/catalogo-completo-para-mascotas-4x5.webp')

const PET_CATEGORY_DEFINITIONS: PetCategoryDefinitionMap = {
  todos: {
    id: 'todos',
    label: 'Todas',
    alt: 'Catálogo completo de productos para mascotas en Ecuador',
    route: '/tienda',
    filter: {},
    showInFooter: true,
    showInShopBrowse: true,
  },
  ropa: {
    id: 'ropa',
    label: 'Ropa',
    alt: 'Ropa para mascotas en Ecuador',
    route: '/tienda/ropa',
    filter: { categories: ['ropa'], productTypes: ['ropa'] },
    showInFooter: true,
    showInShopBrowse: true,
  },
  alimento: {
    id: 'alimento',
    label: 'Alimento',
    alt: 'Alimentos para mascotas en Ecuador',
    route: '/tienda/alimento',
    filter: {
      categories: ['Alimento', 'alimento', 'alimento para perros', 'alimento para gatos'],
      productTypes: ['Alimento', 'alimento'],
    },
    showInFooter: true,
    showInShopBrowse: true,
  },
  cuidados: {
    id: 'salud',
    label: 'Salud',
    alt: 'Productos de salud para mascotas en Ecuador',
    route: '/tienda/salud',
    filter: {
      categories: ['salud', 'cuidado', 'cuidados', 'higiene', 'medicina', 'medicinas', 'farmacia'],
      productTypes: ['cuidado'],
    },
  },
  accesorios: {
    id: 'accesorios',
    label: 'Accesorios',
    alt: 'Accesorios para mascotas en Ecuador',
    route: '/tienda/accesorios',
    filter: {
      categories: ['accesorios', 'juguetes', 'camas', 'comederos', 'transportadoras', 'correas', 'collares', 'arneses', 'bolsas', 'platos'],
      productTypes: ['accesorios'],
    },
    showInFooter: true,
    showInShopBrowse: true,
  },
  descuentos: {
    id: 'descuentos',
    label: 'Ofertas',
    alt: 'Ofertas y descuentos en productos para mascotas en Ecuador',
    route: '/tienda/ofertas',
    filter: {},
  },
  cuidado: {
    id: 'salud',
    label: 'Salud',
    alt: 'Productos de salud para mascotas en Ecuador',
    route: '/tienda/salud',
    filter: {
      categories: ['salud', 'cuidado', 'cuidados', 'higiene', 'medicina', 'medicinas', 'farmacia'],
      productTypes: ['cuidado'],
    },
  },
  salud: {
    id: 'salud',
    label: 'Salud',
    alt: 'Productos de salud para mascotas en Ecuador',
    route: '/tienda/salud',
    filter: {
      categories: ['salud', 'cuidado', 'cuidados', 'higiene', 'medicina', 'medicinas', 'farmacia'],
      productTypes: ['cuidado'],
    },
    showInFooter: true,
    showInShopBrowse: true,
  },
  gatos: {
    id: 'gatos',
    label: 'Gatos',
    alt: 'Productos para gatos en Ecuador',
    route: '/tienda/gatos',
    filter: { genders: ['cat'] },
  },
  perros: {
    id: 'perros',
    label: 'Perros',
    alt: 'Productos para perros en Ecuador',
    route: '/tienda/perros',
    filter: { genders: ['dog'] },
  },
  'alimento para perros': {
    id: 'alimento para perros',
    label: 'Alimento para perros',
    alt: 'Alimento para perros en Ecuador',
    route: '/tienda/alimento-perros',
    filter: {
      categories: ['Alimento', 'alimento', 'alimento para perros', 'alimento para gatos'],
      productTypes: ['Alimento', 'alimento'],
      genders: ['dog'],
    },
  },
  'alimento para gatos': {
    id: 'alimento para gatos',
    label: 'Alimento para gatos',
    alt: 'Alimento para gatos en Ecuador',
    route: '/tienda/alimento-gatos',
    filter: {
      categories: ['Alimento', 'alimento', 'alimento para perros', 'alimento para gatos'],
      productTypes: ['Alimento', 'alimento'],
      genders: ['cat'],
    },
  },
}

export const PET_HOME_TOP_ORDER = ['todos', 'ropa', 'alimento', 'salud', 'accesorios'] as const

const topAssetTodos = topAsset('catalogo-completo-para-mascotas-4x5.webp')
const topAssetRopa = topAsset('ropa-para-mascotas-4x5.webp')
const topAssetAlimento = topAsset('alimento-para-mascotas-4x5.webp')
const topAssetSalud = topAsset('salud-para-mascotas-4x5.webp')
const topAssetAccesorios = topAsset('accesorios-para-mascotas-4x5.webp')

export const PET_HOME_TOP_IMAGES: PetCategoryImageMap = {
  todos: topAssetTodos,
  ropa: topAssetRopa,
  alimento: topAssetAlimento,
  salud: topAssetSalud,
  cuidados: topAssetSalud,
  cuidado: topAssetSalud,
  accesorios: topAssetAccesorios,
}

export const PET_HOME_FEATURED_ORDER = ['alimento', 'salud', 'accesorios'] as const

const featuredAlimento: PetCategoryFeaturedImageMap = {
  mobilePrimary: featuredVariantAsset('mobilePrimary', 'alimentos-para-mascotas-en-ecuador-mobile-principal-16x10.webp'),
  desktopPrimary: featuredVariantAsset('desktopPrimary', 'alimentos-para-mascotas-en-ecuador-desktop-principal-4x5.webp'),
}
const featuredSalud: PetCategoryFeaturedImageMap = {
  mobileSecondary: featuredVariantAsset('mobileSecondary', 'salud-para-mascotas-en-ecuador-mobile-secundario-square.webp'),
  desktopSecondary: featuredVariantAsset('desktopSecondary', 'salud-para-mascotas-en-ecuador-desktop-secundario-16x10.webp'),
}
const featuredAccesorios: PetCategoryFeaturedImageMap = {
  mobileSecondary: featuredVariantAsset('mobileSecondary', 'accesorios-para-mascotas-en-ecuador-mobile-secundario-square.webp'),
  desktopSecondary: featuredVariantAsset('desktopSecondary', 'accesorios-para-mascotas-en-ecuador-desktop-secundario-16x10.webp'),
}

export const PET_HOME_FEATURED_IMAGES: PetCategoryFeaturedImageSetMap = {
  alimento: featuredAlimento,
  salud: featuredSalud,
  cuidados: featuredSalud,
  cuidado: featuredSalud,
  accesorios: featuredAccesorios,
}

const getCategoryDefinition = (categoryId?: string) =>
  findMapValueCaseInsensitive(PET_CATEGORY_DEFINITIONS, categoryId)

const buildCard = (categoryId: string, image: string): PetCategoryCard => {
  const category = getCategoryDefinition(categoryId)
  const label = category?.label ?? toTitleCase(categoryId)

  return {
    id: category?.id ?? categoryId,
    label,
    image,
    alt: category?.alt ?? `${label} para mascotas en Ecuador`,
  }
}

export const PET_HOME_CATEGORY_CARDS: PetCategoryCard[] = PET_HOME_TOP_ORDER.map((categoryId) =>
  buildCard(categoryId, PET_HOME_TOP_IMAGES[categoryId]?.src ?? DEFAULT_HOME_TOP_IMAGE)
)

export const PET_HOME_FEATURED_CATEGORY_CARDS: PetCategoryCard[] = PET_HOME_FEATURED_ORDER.map((categoryId) =>
  buildCard(
    categoryId,
    PET_HOME_FEATURED_IMAGES[categoryId]?.desktopPrimary?.src
      ?? PET_HOME_FEATURED_IMAGES[categoryId]?.desktopSecondary?.src
      ?? PET_HOME_FEATURED_IMAGES[categoryId]?.mobilePrimary?.src
      ?? PET_HOME_FEATURED_IMAGES[categoryId]?.mobileSecondary?.src
      ?? PET_HOME_TOP_IMAGES[categoryId]?.src
      ?? DEFAULT_HOME_TOP_IMAGE
  )
)

export const PET_FOOTER_CATEGORY_IDS = Object.values(PET_CATEGORY_DEFINITIONS)
  .filter((category) => category.showInFooter)
  .map((category) => category.id)

export const PET_SHOP_BROWSE_CATEGORY_IDS: string[] = ['todos', 'alimento', 'ropa', 'accesorios', 'salud']

export const PET_CATEGORY_FILTERS = Object.values(PET_CATEGORY_DEFINITIONS).reduce<Record<string, PetCategoryFilter>>(
  (acc, category) => {
    acc[category.id.toLowerCase()] = category.filter ?? {}
    return acc
  },
  {}
)

export const PET_CATEGORY_ROUTES = Object.values(PET_CATEGORY_DEFINITIONS).reduce<Record<string, string>>(
  (acc, category) => {
    acc[category.id.toLowerCase()] = category.route
    return acc
  },
  {}
)

export const getCategoryCards = (_tenantId?: string) => PET_HOME_CATEGORY_CARDS

export const getHomeSecondaryCategoryCards = (_tenantId?: string) => PET_HOME_FEATURED_CATEGORY_CARDS

export const getCategoryLabel = (categoryId?: string, _tenantId?: string) => {
  if (!categoryId) return ''

  const category = getCategoryDefinition(categoryId)
  return category?.label ?? toTitleCase(categoryId.toLowerCase())
}

export const getCategoryAlt = (categoryId?: string, _tenantId?: string) => {
  if (!categoryId) return 'Productos para mascotas en Ecuador'

  const category = getCategoryDefinition(categoryId)
  if (category?.alt) return category.alt

  const label = category?.label ?? toTitleCase(categoryId.toLowerCase())
  return `${label} para mascotas en Ecuador`
}

export const getCategoryImage = (categoryId?: string, _tenantId?: string) => {
  if (!categoryId) return DEFAULT_HOME_TOP_IMAGE

  return (
    findMapValueCaseInsensitive(PET_HOME_TOP_IMAGES, categoryId)?.src
    ?? DEFAULT_HOME_TOP_IMAGE
  )
}

export const getHomeTopCategoryImageSpec = (categoryId: string) =>
  findMapValueCaseInsensitive(PET_HOME_TOP_IMAGES, categoryId) ?? null

export const getHomeFeaturedCategoryImageSpec = (
  categoryId: string,
  variant: PetCategoryFeaturedImageVariant = 'desktopPrimary'
) => {
  const imageSet = findMapValueCaseInsensitive(PET_HOME_FEATURED_IMAGES, categoryId)

  return imageSet?.[variant]
    ?? null
}

const uniqueNormalizedValues = (
  values: Array<string | null | undefined>,
  normalizer: (value?: string | null) => string
) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizer(value))
        .filter(Boolean)
    )
  )

const normalizeGender = (value?: string | null) =>
  (value ?? '').trim().toLowerCase()

const parseAdditionalCategoryValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeProductCategory(String(item || '')))
      .filter(Boolean)
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeProductCategory(String(item || '')))
        .filter(Boolean)
    }
  } catch {
    // allow legacy comma-separated strings
  }

  return trimmed
    .split(',')
    .map((item) => normalizeProductCategory(item))
    .filter(Boolean)
}

export const resolvePetCategoryFilter = (
  filter?: PetCategoryFilter,
  options?: { gender?: string | null }
): ResolvedPetCategoryFilter => ({
  categories: uniqueNormalizedValues(
    [filter?.category, ...(filter?.categories ?? [])],
    normalizeProductCategory
  ),
  productTypes: uniqueNormalizedValues(
    [filter?.productType, ...(filter?.productTypes ?? [])],
    normalizeProductType
  ),
  genders: uniqueNormalizedValues(
    [options?.gender, filter?.gender, ...(filter?.genders ?? [])],
    normalizeGender
  ),
})

export const matchesPetCategoryFilter = (
  product: ProductType,
  filter?: PetCategoryFilter,
  options?: { gender?: string | null }
) => {
  const resolvedFilter = resolvePetCategoryFilter(filter, options)
  const productType = normalizeProductType(product.productType, product.category)
  const productCategory = normalizeProductCategory(product.category)
  const additionalCategories = uniqueNormalizedValues(
    parseAdditionalCategoryValues(product.attributes?.catalogCategories),
    normalizeProductCategory
  )
  const productCategories = uniqueNormalizedValues(
    [productCategory, ...additionalCategories],
    normalizeProductCategory
  )
  const productGender = normalizeGender(product.gender)

  const matchesTaxonomy =
    resolvedFilter.categories.length === 0 && resolvedFilter.productTypes.length === 0
      ? true
      : productCategories.some((category) => resolvedFilter.categories.includes(category))
        || resolvedFilter.productTypes.includes(productType)

  const matchesGender =
    resolvedFilter.genders.length === 0 ? true : resolvedFilter.genders.includes(productGender)

  return matchesTaxonomy && matchesGender
}

export const getVisibleProductCategoryIds = (_tenantId?: string) =>
  PET_HOME_CATEGORY_CARDS.map((category) => category.id.toLowerCase()).filter(
    (categoryId) => categoryId !== 'todos'
  )

export const getShopBrowseCategoryIds = (_tenantId?: string) => PET_SHOP_BROWSE_CATEGORY_IDS

export const getCategoryFilter = (categoryId: string, _tenantId?: string) => {
  const normalized = categoryId.toLowerCase()
  return PET_CATEGORY_FILTERS[normalized] ?? { category: normalized }
}

export const getCategoryUrl = (categoryId: string, options?: { gender?: string }, _tenantId?: string) => {
  const normalized = categoryId.toLowerCase()
  if ((normalized === 'todos' || normalized === 'todas') && options?.gender === 'dog') return '/tienda/perros'
  if ((normalized === 'todos' || normalized === 'todas') && options?.gender === 'cat') return '/tienda/gatos'
  if (normalized === 'alimento' && options?.gender === 'dog') return '/tienda/alimento-perros'
  if (normalized === 'alimento' && options?.gender === 'cat') return '/tienda/alimento-gatos'

  const baseUrl =
    PET_CATEGORY_ROUTES[normalized] ?? `/tienda/${encodeURIComponent(normalized)}`

  if (options?.gender && !baseUrl.includes('gender=')) {
    const genderSlug = options.gender === 'dog' ? 'perros' : options.gender === 'cat' ? 'gatos' : options.gender
    return `${baseUrl}-${encodeURIComponent(genderSlug)}`
  }

  return baseUrl
}

export default PET_HOME_CATEGORY_CARDS
