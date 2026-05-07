import { getCategoryLabel } from '@/data/petCategoryCards'
import {
  findCatalogProductForDetail,
  getProductCurrentPrice,
  getProductDetailRouteId,
  getProductSku,
  getProductVariants,
  resolveSelectedVariant,
} from '@/lib/catalog'
import type { ProductType } from '@/type/ProductType'

export type SeoCatalogPage = {
  slug: string
  path: string
  label: string
  h1: string
  title: string
  description: string
  category?: string
  productType?: string
  gender?: 'dog' | 'cat'
  searchQuery?: string
  priority: number
  intro: string
  highlights: string[]
  faqs: Array<{ question: string; answer: string }>
}

export const slugifySeo = (value?: string | number | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeRouteToken = (value?: string | number | null) =>
  slugifySeo(decodeURIComponent(String(value ?? '')))

const uniq = <T,>(values: T[]) => Array.from(new Set(values.filter(Boolean)))

const SEO_PRODUCT_LINE_BRANDS = ['Cat Chow', 'Felix'] as const

const SEO_CATALOG_ALIASES: Record<string, string> = {
  descuento: 'ofertas',
  descuentos: 'ofertas',
  promocion: 'ofertas',
  promociones: 'ofertas',
  cuidado: 'salud',
  cuidados: 'salud',
  higiene: 'salud',
  medicina: 'salud',
  medicinas: 'salud',
  farmacia: 'salud',
  'alimento-para-perros': 'alimento-perros',
  'alimentos-para-perros': 'alimento-perros',
  'alimento-para-gatos': 'alimento-gatos',
  'alimentos-para-gatos': 'alimento-gatos',
  'comida-humeda-para-perros': 'comida-humeda-perros',
  'comida-humeda-para-gatos': 'comida-humeda-gatos',
  'snacks-para-gatos': 'snacks-gatos',
  'productos-para-perros': 'perros',
  'productos-para-gatos': 'gatos',
  'ropa-para-mascotas': 'ropa',
  'accesorios-para-mascotas': 'accesorios',
  'salud-para-mascotas': 'salud',
}

const getGenderWord = (gender?: string | null) => {
  if (gender === 'dog') return 'perros'
  if (gender === 'cat') return 'gatos'
  return 'mascotas'
}

export const SEO_CATALOG_PAGES: SeoCatalogPage[] = [
  {
    slug: 'alimento',
    path: '/tienda/alimento',
    label: 'Alimento',
    h1: 'Alimento para mascotas en Ecuador',
    title: 'Alimento para mascotas online en Ecuador',
    description: 'Compra alimento para perros y gatos en Ecuador con marcas como Dog Chow, Cat Chow, Pro-Can, Pro-Cat, NutraPro, Avant, Cani y Purina.',
    category: 'alimento',
    priority: 0.95,
    intro: 'Encuentra alimento seco, comida humeda y snacks para perros y gatos con stock publicado, precios en USD y compra online en ParaMascotasEC.',
    highlights: ['Alimento por especie, edad y presentacion', 'Marcas reconocidas para perros y gatos', 'Catalogo actualizado con disponibilidad real'],
    faqs: [
      {
        question: 'Que alimento para mascotas puedo comprar online en Ecuador?',
        answer: 'Puedes comprar alimento seco, comida humeda y snacks para perros y gatos segun edad, tamano, marca y presentacion disponible.',
      },
      {
        question: 'Como elegir alimento para mi mascota?',
        answer: 'Revisa especie, edad, tamano, etapa de vida y presentacion. Si tienes dudas, contacta a ParaMascotasEC antes de comprar.',
      },
    ],
  },
  {
    slug: 'alimento-perros',
    path: '/tienda/alimento-perros',
    label: 'Alimento para perros',
    h1: 'Alimento para perros en Ecuador',
    title: 'Alimento para perros online en Ecuador',
    description: 'Compra alimento para perros adultos y cachorros en Ecuador: Dog Chow, Pro-Can, NutraPro, Avant, Cani, Wellness y mas marcas disponibles.',
    category: 'alimento',
    gender: 'dog',
    priority: 0.94,
    intro: 'Catalogo de alimento para perros adultos y cachorros, con opciones secas y humedas para razas pequenas, medianas y grandes.',
    highlights: ['Alimento para perros adultos y cachorros', 'Opciones por raza, tamano y etapa', 'Marcas de recompra frecuente disponibles online'],
    faqs: [
      {
        question: 'Tienen alimento para cachorros?',
        answer: 'Si. El catalogo muestra opciones para cachorros cuando hay stock disponible, incluyendo alimento seco y comida humeda.',
      },
      {
        question: 'Puedo comprar comida humeda para perros?',
        answer: 'Si. Filtra o busca comida humeda para perros para encontrar presentaciones como sobres o latas disponibles.',
      },
    ],
  },
  {
    slug: 'alimento-gatos',
    path: '/tienda/alimento-gatos',
    label: 'Alimento para gatos',
    h1: 'Alimento para gatos en Ecuador',
    title: 'Alimento para gatos online en Ecuador',
    description: 'Compra alimento para gatos adultos y gatitos en Ecuador: Cat Chow, Pro-Cat, NutraPro, Purina, Felix y snacks para gatos.',
    category: 'alimento',
    gender: 'cat',
    priority: 0.94,
    intro: 'Productos de alimento para gatos adultos y gatitos, comida humeda, snacks y marcas reconocidas para compras online en Ecuador.',
    highlights: ['Alimento para gatos adultos y gatitos', 'Comida humeda y snacks para gatos', 'Opciones por sabor, marca y presentacion'],
    faqs: [
      {
        question: 'Tienen alimento para gatitos?',
        answer: 'Si. Las opciones para gatitos aparecen en esta categoria cuando estan publicadas y con stock.',
      },
      {
        question: 'Hay comida humeda para gatos?',
        answer: 'Si. Puedes encontrar comida humeda para gatos por marca y sabor, segun disponibilidad del catalogo.',
      },
    ],
  },
  {
    slug: 'comida-humeda-perros',
    path: '/tienda/comida-humeda-perros',
    label: 'Comida humeda para perros',
    h1: 'Comida humeda para perros en Ecuador',
    title: 'Comida humeda para perros online en Ecuador',
    description: 'Compra comida humeda para perros en Ecuador: sobres y presentaciones de Dog Chow, Pro-Can, Mimma Carnitas y otras marcas disponibles.',
    category: 'alimento',
    gender: 'dog',
    searchQuery: 'humeda',
    priority: 0.88,
    intro: 'Seleccion de comida humeda para perros adultos y cachorros, ideal para complementar la alimentacion diaria segun preferencia y etapa.',
    highlights: ['Sobres y porciones practicas', 'Sabores como pollo, carne, cordero y salmon', 'Opciones para adultos y cachorros'],
    faqs: [
      {
        question: 'La comida humeda reemplaza al alimento seco?',
        answer: 'Depende de la dieta de tu perro. Puede usarse como alimento principal o complemento siguiendo la recomendacion del producto y de tu veterinario.',
      },
      {
        question: 'Como encuentro sabores disponibles?',
        answer: 'Usa el buscador de esta categoria para filtrar por pollo, carne, salmon, cordero u otros sabores publicados.',
      },
    ],
  },
  {
    slug: 'comida-humeda-gatos',
    path: '/tienda/comida-humeda-gatos',
    label: 'Comida humeda para gatos',
    h1: 'Comida humeda para gatos en Ecuador',
    title: 'Comida humeda para gatos online en Ecuador',
    description: 'Compra comida humeda para gatos en Ecuador: Felix, Pro-Cat, Purina y opciones por sabor como atun, salmon, pollo o higado.',
    category: 'alimento',
    gender: 'cat',
    searchQuery: 'humeda',
    priority: 0.88,
    intro: 'Comida humeda para gatos y gatitos por marca, sabor y presentacion, con productos publicados segun stock real.',
    highlights: ['Opciones con pescado, atun, salmon, pollo e higado', 'Presentaciones practicas para gatos', 'Complemento para mejorar hidratacion y variedad'],
    faqs: [
      {
        question: 'Que sabores de comida humeda para gatos hay?',
        answer: 'El catalogo puede incluir atun, salmon, pescado blanco, pollo, pavo o higado, segun stock vigente.',
      },
      {
        question: 'Puedo combinar alimento seco y humedo?',
        answer: 'Si, muchas familias combinan ambas opciones. Mantener porciones adecuadas ayuda a cuidar peso y digestion.',
      },
    ],
  },
  {
    slug: 'snacks-gatos',
    path: '/tienda/snacks-gatos',
    label: 'Snacks para gatos',
    h1: 'Snacks para gatos en Ecuador',
    title: 'Snacks para gatos online en Ecuador',
    description: 'Compra snacks para gatos en Ecuador, incluyendo opciones NutraPro y bocaditos por sabor segun disponibilidad.',
    category: 'alimento',
    gender: 'cat',
    searchQuery: 'snack',
    priority: 0.8,
    intro: 'Snacks para gatos ideales como premio, recompensa o complemento ocasional dentro de una rutina equilibrada.',
    highlights: ['Premios por sabor y presentacion', 'Opciones para gatos adultos y gatitos', 'Compra online con marcas disponibles'],
    faqs: [
      {
        question: 'Los snacks para gatos son alimento diario?',
        answer: 'Normalmente son complementos o premios. Revisa la etiqueta y administra porciones moderadas.',
      },
      {
        question: 'Que marca de snacks para gatos tienen?',
        answer: 'El catalogo prioriza marcas publicadas con stock, como NutraPro cuando esta disponible.',
      },
    ],
  },
  {
    slug: 'ropa',
    path: '/tienda/ropa',
    label: 'Ropa',
    h1: 'Ropa para mascotas en Ecuador',
    title: 'Ropa para mascotas online en Ecuador',
    description: 'Compra ropa para perros y mascotas en Ecuador: camisetas, chalecos, hoodies, sacos y prendas por talla.',
    category: 'ropa',
    priority: 0.72,
    intro: 'Prendas para mascotas por talla, color y estilo, pensadas para paseos, abrigo y fechas especiales.',
    highlights: ['Camisetas, chalecos, hoodies y sacos', 'Opciones por talla y color', 'Productos con fotos y disponibilidad'],
    faqs: [
      {
        question: 'Como elegir la talla de ropa para mi mascota?',
        answer: 'Revisa la talla publicada y compara cuello, pecho y largo de tu mascota antes de comprar.',
      },
      {
        question: 'La ropa es para perros o gatos?',
        answer: 'La mayoria de prendas publicadas son para perros, pero revisa cada ficha para confirmar especie y talla.',
      },
    ],
  },
  {
    slug: 'accesorios',
    path: '/tienda/accesorios',
    label: 'Accesorios',
    h1: 'Accesorios para mascotas en Ecuador',
    title: 'Accesorios para mascotas online en Ecuador',
    description: 'Compra accesorios para perros y gatos en Ecuador: collares, correas, arneses, platos, juguetes, areneros y dispensadores.',
    category: 'accesorios',
    priority: 0.78,
    intro: 'Accesorios para la rutina diaria de perros y gatos: paseo, alimentacion, higiene, juego y comodidad.',
    highlights: ['Collares, arneses y correas', 'Platos, juguetes y areneros', 'Accesorios por especie, color y uso'],
    faqs: [
      {
        question: 'Que accesorios para perros venden?',
        answer: 'Puedes encontrar collares, arneses, correas, platos, dispensadores, juguetes y otros productos segun stock.',
      },
      {
        question: 'Hay accesorios para gatos?',
        answer: 'Si. El catalogo incluye productos para gatos como areneros y juguetes cuando estan disponibles.',
      },
    ],
  },
  {
    slug: 'salud',
    path: '/tienda/salud',
    label: 'Salud',
    h1: 'Productos de salud y cuidado para mascotas en Ecuador',
    title: 'Salud y cuidado para mascotas online en Ecuador',
    description: 'Productos de salud, higiene y cuidado para perros y gatos en Ecuador, publicados segun disponibilidad.',
    category: 'salud',
    priority: 0.68,
    intro: 'Productos orientados al cuidado diario, higiene y bienestar de perros y gatos.',
    highlights: ['Cuidado e higiene para mascotas', 'Productos por necesidad y especie', 'Compra online con asistencia'],
    faqs: [
      {
        question: 'Los productos de salud reemplazan una consulta veterinaria?',
        answer: 'No. Para sintomas o tratamientos, consulta siempre con un veterinario.',
      },
      {
        question: 'Como se si un producto de cuidado es adecuado?',
        answer: 'Revisa especie, indicacion y descripcion. Si tienes dudas, contacta a ParaMascotasEC.',
      },
    ],
  },
  {
    slug: 'perros',
    path: '/tienda/perros',
    label: 'Perros',
    h1: 'Productos para perros en Ecuador',
    title: 'Productos para perros online en Ecuador',
    description: 'Compra productos para perros en Ecuador: alimento, comida humeda, ropa, collares, arneses, platos, juguetes y accesorios.',
    gender: 'dog',
    priority: 0.82,
    intro: 'Catalogo para perros con productos de alimentacion, paseo, ropa, juego y accesorios para el dia a dia.',
    highlights: ['Alimento seco y comida humeda para perros', 'Ropa, collares, arneses y correas', 'Productos por talla, etapa y marca'],
    faqs: [
      {
        question: 'Que productos para perros puedo comprar?',
        answer: 'Puedes comprar alimento, ropa, collares, arneses, correas, platos, juguetes y accesorios segun disponibilidad.',
      },
      {
        question: 'Hay productos para cachorros?',
        answer: 'Si. Revisa las fichas y categorias de alimento para encontrar opciones para cachorros cuando esten en stock.',
      },
    ],
  },
  {
    slug: 'gatos',
    path: '/tienda/gatos',
    label: 'Gatos',
    h1: 'Productos para gatos en Ecuador',
    title: 'Productos para gatos online en Ecuador',
    description: 'Compra productos para gatos en Ecuador: alimento, comida humeda, snacks, areneros, juguetes y accesorios.',
    gender: 'cat',
    priority: 0.82,
    intro: 'Catalogo para gatos con alimento, comida humeda, snacks, juguetes, areneros y accesorios disponibles online.',
    highlights: ['Alimento para gatos adultos y gatitos', 'Comida humeda y snacks', 'Accesorios y juguetes para gatos'],
    faqs: [
      {
        question: 'Hay alimento para gatos adultos y gatitos?',
        answer: 'Si. La disponibilidad depende del stock publicado en el catalogo.',
      },
      {
        question: 'Tienen juguetes o areneros para gatos?',
        answer: 'Si, cuando estan publicados puedes encontrarlos dentro de productos para gatos o accesorios.',
      },
    ],
  },
  {
    slug: 'ofertas',
    path: '/tienda/ofertas',
    label: 'Ofertas',
    h1: 'Ofertas para mascotas en Ecuador',
    title: 'Ofertas para mascotas online en Ecuador',
    description: 'Ofertas y descuentos en productos para perros y gatos en Ecuador, segun promociones y stock disponible.',
    category: 'descuentos',
    priority: 0.7,
    intro: 'Productos con precio promocional o descuento vigente para perros y gatos, actualizados segun disponibilidad.',
    highlights: ['Promociones publicadas en catalogo', 'Productos para perros y gatos', 'Precios en USD y compra online'],
    faqs: [
      {
        question: 'Las ofertas cambian?',
        answer: 'Si. Las promociones dependen del stock, fechas y precios publicados en el catalogo.',
      },
      {
        question: 'Como se aplica un descuento?',
        answer: 'El precio visible en la ficha o carrito refleja las promociones disponibles para el producto.',
      },
    ],
  },
]

export const SEO_CATALOG_PAGE_BY_SLUG = new Map(SEO_CATALOG_PAGES.map((page) => [page.slug, page]))

export const getCanonicalCatalogSlug = (slug?: string | null) => {
  const normalized = slugifySeo(slug)
  return SEO_CATALOG_ALIASES[normalized] ?? normalized
}

export const isCatalogAliasSlug = (slug?: string | null) => {
  const normalized = slugifySeo(slug)
  return Boolean(normalized && getCanonicalCatalogSlug(normalized) !== normalized)
}

export const getCatalogPageBySlug = (slug?: string | null) => {
  if (!slug) return null
  return SEO_CATALOG_PAGE_BY_SLUG.get(getCanonicalCatalogSlug(slug)) ?? null
}

export const getAllCatalogPage = (): SeoCatalogPage => ({
  slug: 'tienda',
  path: '/tienda',
  label: 'Catalogo',
  h1: 'Tienda de mascotas online en Ecuador',
  title: 'Tienda de mascotas online en Ecuador',
  description: 'Compra productos para mascotas en Ecuador: alimento para perros y gatos, ropa, accesorios, salud y cuidado con stock publicado.',
  priority: 0.98,
  intro: 'Catalogo completo de ParaMascotasEC con productos para perros y gatos: alimento, ropa, accesorios, salud y cuidado.',
  highlights: ['Productos para perros y gatos', 'Alimento, accesorios, ropa y cuidado', 'Compra online con precios en USD'],
  faqs: [
    {
      question: 'Que vende ParaMascotasEC?',
      answer: 'ParaMascotasEC vende alimento, ropa, accesorios, juguetes y productos de cuidado para perros y gatos en Ecuador.',
    },
    {
      question: 'Los productos tienen stock real?',
      answer: 'El catalogo publico se genera desde los productos publicados y disponibles en la tienda.',
    },
  ],
})

export const getCatalogPagePath = (categoryId?: string | null, options?: { gender?: string | null }) => {
  const normalizedCategory = slugifySeo(categoryId || 'todos')
  const gender = options?.gender

  if (normalizedCategory === 'todos' || normalizedCategory === 'todas' || !normalizedCategory) {
    if (gender === 'dog') return '/tienda/perros'
    if (gender === 'cat') return '/tienda/gatos'
    return '/tienda'
  }

  if (normalizedCategory === 'descuentos' || normalizedCategory === 'ofertas') return '/tienda/ofertas'
  if (SEO_CATALOG_ALIASES[normalizedCategory]) {
    return getCatalogPagePath(SEO_CATALOG_ALIASES[normalizedCategory], options)
  }
  if (normalizedCategory === 'alimento' && gender === 'dog') return '/tienda/alimento-perros'
  if (normalizedCategory === 'alimento' && gender === 'cat') return '/tienda/alimento-gatos'
  if (normalizedCategory === 'perros') return '/tienda/perros'
  if (normalizedCategory === 'gatos') return '/tienda/gatos'

  const page = getCatalogPageBySlug(normalizedCategory)
  if (page) return page.path

  return `/tienda/${normalizedCategory}`
}

const parseCatalogCategoryValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }

  if (typeof value !== 'string') return []

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

const toDisplayLabel = (value?: string | null) => {
  const cleaned = String(value ?? '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const getProductCategoryCandidates = (product: ProductType) =>
  uniq([
    product.category,
    ...(product.category ? [] : [product.productType]),
    ...parseCatalogCategoryValues(product.attributes?.catalogCategories),
  ].map((value) => String(value ?? '').trim()))

const getProductGender = (product: ProductType) => {
  const gender = String(product.gender ?? '').trim().toLowerCase()
  if (gender === 'dog' || gender === 'perro' || gender === 'perros') return 'dog'
  if (gender === 'cat' || gender === 'gato' || gender === 'gatos') return 'cat'
  return null
}

const splitGenderSlug = (slug: string): { baseSlug: string; gender?: 'dog' | 'cat' } => {
  if (slug.endsWith('-perros')) return { baseSlug: slug.slice(0, -'-perros'.length), gender: 'dog' }
  if (slug.endsWith('-gatos')) return { baseSlug: slug.slice(0, -'-gatos'.length), gender: 'cat' }
  return { baseSlug: slug }
}

const getMostCommonLabel = (labels: string[]) => {
  const stats = labels.reduce<Map<string, { label: string; count: number }>>((acc, label) => {
    const key = slugifySeo(label)
    if (!key) return acc
    const current = acc.get(key)
    acc.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 })
    return acc
  }, new Map())

  return Array.from(stats.values()).sort((a, b) => b.count - a.count)[0]?.label ?? ''
}

export const buildDynamicCatalogPageFromProducts = (
  slug: string,
  products: ProductType[],
): SeoCatalogPage | null => {
  const normalizedSlug = slugifySeo(slug)
  if (!normalizedSlug || getCatalogPageBySlug(normalizedSlug)) return getCatalogPageBySlug(normalizedSlug)

  const { baseSlug, gender } = splitGenderSlug(normalizedSlug)
  const baseStaticPage = getCatalogPageBySlug(baseSlug)
  if (!baseSlug) return null

  if (baseStaticPage && gender) {
    const speciesLabel = gender === 'dog' ? 'perros' : 'gatos'
    const label = `${baseStaticPage.label} para ${speciesLabel}`

    return {
      ...baseStaticPage,
      slug: normalizedSlug,
      path: `/tienda/${normalizedSlug}`,
      label,
      h1: `${label} en Ecuador`,
      title: `${label} online en Ecuador`,
      description: `Compra ${label.toLowerCase()} en ParaMascotasEC Ecuador con productos publicados, precios en USD y disponibilidad actualizada.`,
      gender,
      priority: Math.max(baseStaticPage.priority - 0.08, 0.5),
      intro: `Seleccion de ${label.toLowerCase()} desde el catalogo publicado de ParaMascotasEC, con enlaces limpios y disponibilidad actualizada.`,
      highlights: [
        ...baseStaticPage.highlights.slice(0, 2),
        `Categoria filtrada para ${speciesLabel}`,
      ],
    }
  }

  if (baseStaticPage) return null

  const matchingProducts = products.filter((product) => {
    if (gender && getProductGender(product) !== gender) return false
    return getProductCategoryCandidates(product).some((candidate) => slugifySeo(candidate) === baseSlug)
  })

  if (matchingProducts.length === 0) return null

  const baseLabel = getMostCommonLabel(
    matchingProducts
      .flatMap(getProductCategoryCandidates)
      .filter((candidate) => slugifySeo(candidate) === baseSlug),
  ) || toDisplayLabel(baseSlug)
  const speciesLabel = gender === 'dog' ? 'perros' : gender === 'cat' ? 'gatos' : 'mascotas'
  const label = gender ? `${baseLabel} para ${speciesLabel}` : `${baseLabel} para mascotas`
  const brands = uniq(matchingProducts.map((product) => product.brand?.trim()).filter(Boolean)).slice(0, 5)
  const brandText = brands.length > 0 ? ` Marcas disponibles: ${brands.join(', ')}.` : ''
  const lowerLabel = label.toLowerCase()

  return {
    slug: normalizedSlug,
    path: `/tienda/${normalizedSlug}`,
    label,
    h1: `${label} en Ecuador`,
    title: `${label} online en Ecuador`,
    description: `Compra ${lowerLabel} en ParaMascotasEC Ecuador con productos publicados, precios en USD y disponibilidad actualizada.${brandText}`,
    category: baseLabel,
    productType: baseLabel,
    gender,
    priority: gender ? 0.64 : 0.68,
    intro: `Seleccion de ${lowerLabel} con productos activos del catalogo de ParaMascotasEC. Esta pagina se actualiza automaticamente cuando se publican nuevos productos relacionados.`,
    highlights: [
      `${matchingProducts.length} productos publicados`,
      'URLs limpias y canónicas',
      'Catalogo conectado al inventario vigente',
    ],
    faqs: [
      {
        question: `Que ${lowerLabel} puedo comprar?`,
        answer: `Puedes ver los productos publicados en esta categoria, comparar marcas, presentaciones, precios y disponibilidad antes de comprar online.`,
      },
      {
        question: 'Esta categoria se actualiza cuando agrego productos?',
        answer: 'Si. Cuando un producto publicado usa esta categoria, la pagina queda disponible para usuarios y motores de busqueda.',
      },
    ],
  }
}

export const getDynamicCatalogPages = (products: ProductType[]) => {
  const candidateSlugs = uniq(
    products
      .flatMap(getProductCategoryCandidates)
      .map(slugifySeo)
      .filter((slug) => slug && !getCatalogPageBySlug(slug)),
  )

  const pages = candidateSlugs
    .map((slug) => buildDynamicCatalogPageFromProducts(slug, products))
    .filter((page): page is SeoCatalogPage => Boolean(page))

  const staticGenderPages = SEO_CATALOG_PAGES
    .filter((page) => page.category && !page.gender && page.slug !== 'ofertas')
    .flatMap((page) => {
      const pageProducts = products.filter((product) =>
        getProductCategoryCandidates(product).some((candidate) => slugifySeo(candidate) === slugifySeo(page.category))
      )
      const dogCount = pageProducts.filter((product) => getProductGender(product) === 'dog').length
      const catCount = pageProducts.filter((product) => getProductGender(product) === 'cat').length

      return [
        dogCount > 1 && !getCatalogPageBySlug(`${page.slug}-perros`)
          ? buildDynamicCatalogPageFromProducts(`${page.slug}-perros`, products)
          : null,
        catCount > 1 && !getCatalogPageBySlug(`${page.slug}-gatos`)
          ? buildDynamicCatalogPageFromProducts(`${page.slug}-gatos`, products)
          : null,
      ].filter((entry): entry is SeoCatalogPage => Boolean(entry))
    })

  const genderPages = pages.flatMap((page) => {
    const pageProducts = products.filter((product) =>
      getProductCategoryCandidates(product).some((candidate) => slugifySeo(candidate) === page.slug)
    )
    const dogCount = pageProducts.filter((product) => getProductGender(product) === 'dog').length
    const catCount = pageProducts.filter((product) => getProductGender(product) === 'cat').length

    return [
      dogCount > 1 ? buildDynamicCatalogPageFromProducts(`${page.slug}-perros`, products) : null,
      catCount > 1 ? buildDynamicCatalogPageFromProducts(`${page.slug}-gatos`, products) : null,
    ].filter((entry): entry is SeoCatalogPage => Boolean(entry))
  })

  const allDynamicPages = [...pages, ...staticGenderPages, ...genderPages]

  return uniq(allDynamicPages.map((page) => page.slug))
    .map((slug) => allDynamicPages.find((page) => page.slug === slug))
    .filter((page): page is SeoCatalogPage => Boolean(page))
}

export const resolveLegacyShopPath = (params: {
  category?: string | null
  gender?: string | null
  query?: string | null
}) => {
  const category = params.category?.trim() || null
  const gender = params.gender?.trim() || null
  const query = params.query?.trim() || null
  const target = getCatalogPagePath(category || 'todos', { gender })

  if (!query) return target

  const nextParams = new URLSearchParams({ query })
  return `${target}?${nextParams.toString()}`
}

export const getProductSeoSlug = (product: ProductType, requestedId?: string | null) => {
  const selectedVariant = resolveSelectedVariant(product, requestedId)
  const routeId = getProductDetailRouteId(product)
  const baseSlug = slugifySeo(product.name || selectedVariant?.name || product.slug || selectedVariant?.slug)
  const idSlug = slugifySeo(routeId)
  if (!baseSlug) return idSlug
  return baseSlug.endsWith(idSlug) || baseSlug.includes(`-${idSlug}`) ? baseSlug : `${baseSlug}-${idSlug}`
}

export const getProductSeoPath = (product: ProductType, requestedId?: string | null) =>
  `/productos/${getProductSeoSlug(product, requestedId)}`

const getProductIdentifierTokens = (product: ProductType) => {
  const variants = getProductVariants(product)
  const rawValues = [
    product.id,
    product.internalId,
    product.slug,
    getProductSeoSlug(product),
    getProductDetailRouteId(product),
    ...variants.flatMap((variant) => [
      variant.id,
      variant.internalId,
      variant.slug,
      getProductSeoSlug(product, variant.id),
    ]),
  ]

  return uniq(rawValues.map(normalizeRouteToken))
}

export const findCatalogProductForSeoSlug = (products: ProductType[], slug: string) => {
  const token = normalizeRouteToken(slug)
  if (!token) return undefined

  const directProduct = products.find((product) => getProductIdentifierTokens(product).includes(token))
  if (directProduct) {
    return findCatalogProductForDetail(products, getProductDetailRouteId(directProduct)) ?? directProduct
  }

  const idLikeSuffix = products.find((product) =>
    getProductIdentifierTokens(product).some((identifier) => token.endsWith(`-${identifier}`))
  )

  return idLikeSuffix
    ? findCatalogProductForDetail(products, getProductDetailRouteId(idLikeSuffix)) ?? idLikeSuffix
    : undefined
}

export const getBrandSeoSlug = (brand?: string | null) => slugifySeo(brand || 'paramascotas')

export const getBrandSeoPath = (brand?: string | null) => `/tienda/marcas/${getBrandSeoSlug(brand)}`

export const findBrandBySlug = (products: ProductType[], slug: string) => {
  const token = normalizeRouteToken(slug)
  const directBrand = products
    .map((product) => product.brand)
    .filter((brand): brand is string => Boolean(brand?.trim()))
    .find((brand) => getBrandSeoSlug(brand) === token) ?? null

  if (directBrand) return directBrand

  return SEO_PRODUCT_LINE_BRANDS.find((line) =>
    getBrandSeoSlug(line) === token &&
    products.some((product) => slugifySeo(product.name).includes(getBrandSeoSlug(line)))
  ) ?? null
}

export const matchesBrandLanding = (product: ProductType, brand: string) => {
  const brandSlug = getBrandSeoSlug(brand)
  return getBrandSeoSlug(product.brand) === brandSlug || slugifySeo(product.name).includes(brandSlug)
}

export const getSeoBrandNames = (products: ProductType[]) => {
  const brands = products
    .map((product) => product.brand?.trim())
    .filter((brand): brand is string => Boolean(brand))

  const productLines = SEO_PRODUCT_LINE_BRANDS.filter((line) =>
    products.some((product) => slugifySeo(product.name).includes(getBrandSeoSlug(line))),
  )

  return uniq([...brands, ...productLines])
}

export const getProductSeoTitle = (product: ProductType) => {
  const genderWord = getGenderWord(product.gender)
  const brand = product.brand && !productNameIncludesBrand(product) ? `${product.brand} ` : ''
  const price = getProductCurrentPrice(product)
  const priceSuffix = price > 0 ? ` desde USD ${price.toFixed(2)}` : ''
  return `${brand}${product.name} para ${genderWord}${priceSuffix}`
}

export const getProductSeoDescription = (product: ProductType) => {
  const brand = product.brand && !productNameIncludesBrand(product) ? ` ${product.brand}` : ''
  const sku = getProductSku(product)
  const category = getCategoryLabel(product.category) || product.category || 'mascotas'
  const stockText = Number(product.quantity ?? 0) > 0 ? 'con stock disponible' : 'segun disponibilidad'
  const skuText = sku ? ` SKU ${sku}.` : ''
  return `Compra ${product.name}${brand} en ParaMascotasEC. Producto de ${category.toLowerCase()} para ${getGenderWord(product.gender)} en Ecuador, ${stockText}.${skuText}`
}

export const getBrandLandingCopy = (brand: string) => ({
  h1: `${brand} para mascotas en Ecuador`,
  title: `${brand} para perros y gatos online en Ecuador`,
  description: `Compra productos ${brand} para perros y gatos en ParaMascotasEC Ecuador, con precios en USD y stock publicado.`,
  intro: `Catalogo de productos ${brand} disponibles en ParaMascotasEC para perros y gatos.`,
})

const productNameIncludesBrand = (product: ProductType) => {
  const brand = slugifySeo(product.brand)
  const name = slugifySeo(product.name)
  return Boolean(brand && (name === brand || name.startsWith(`${brand}-`)))
}
