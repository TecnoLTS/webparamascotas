import { getCategoryLabel } from '@/data/petCategoryCards'
import { getProductCurrentPrice, getProductSku } from '@/lib/catalog'
import type { ProductType } from '@/type/ProductType'

export type ProductSeoProfile = {
  title: string
  description: string
  imageAlt: string
  searchTerms: string
  merchantTitle: string
  merchantDescription: string
}

export const cleanSeoText = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const uniqueText = (values: Array<string | null | undefined>) =>
  Array.from(
    new Map(
      values
        .map((value) => cleanSeoText(value))
        .filter(Boolean)
        .map((value) => [value.toLocaleLowerCase('es'), value]),
    ).values(),
  )

const truncateAtWord = (value: string, maxLength: number) => {
  const normalized = cleanSeoText(value)
  if (normalized.length <= maxLength) return normalized
  const trimmed = normalized.slice(0, maxLength + 1)
  const lastSpace = trimmed.lastIndexOf(' ')
  return cleanSeoText((lastSpace > 40 ? trimmed.slice(0, lastSpace) : normalized.slice(0, maxLength)).replace(/[,.:-]+$/, ''))
}

const ensureMinimumLength = (value: string, minimum: number, suffix: string) => {
  const normalized = cleanSeoText(value)
  if (normalized.length >= minimum) return normalized
  return cleanSeoText(`${normalized}. ${suffix}`)
}

const isLengthBetween = (value: string, min: number, max: number) =>
  value.length >= min && value.length <= max

const productNameIncludesBrand = (product: ProductType) => {
  const brand = cleanSeoText(product.brand).toLocaleLowerCase('es')
  const name = cleanSeoText(product.name).toLocaleLowerCase('es')
  return Boolean(brand && (name === brand || name.startsWith(`${brand} `)))
}

const getAudienceWord = (product: ProductType) => {
  const species = cleanSeoText(product.attributes?.species).toLocaleLowerCase('es')
  const gender = cleanSeoText(product.gender).toLocaleLowerCase('es')
  if (species.includes('gato') || gender === 'cat') return 'gatos'
  if (species.includes('perro') || gender === 'dog') return 'perros'
  return 'mascotas'
}

const getReadableCategory = (product: ProductType) =>
  cleanSeoText(getCategoryLabel(product.category) || product.category || product.productType || 'productos para mascotas')

const buildFallbackTitle = (product: ProductType) => {
  const name = cleanSeoText(product.name) || 'Producto para mascotas'
  const brandPrefix = cleanSeoText(product.brand) && !productNameIncludesBrand(product) ? `${cleanSeoText(product.brand)} ` : ''
  const audience = getAudienceWord(product)
  const price = getProductCurrentPrice(product)
  const base = ensureMinimumLength(`${brandPrefix}${name} para ${audience}`, 20, 'Disponible en Ecuador')
  const withPrice = price > 0 ? `${base} desde USD ${price.toFixed(2)}` : base
  return truncateAtWord(withPrice.length <= 70 ? withPrice : base, 70)
}

const buildFallbackDescription = (product: ProductType) => {
  const name = cleanSeoText(product.name) || 'producto para mascotas'
  const brand = cleanSeoText(product.brand)
  const category = getReadableCategory(product).toLocaleLowerCase('es')
  const audience = getAudienceWord(product)
  const stockText = Number(product.quantity ?? 0) > 0 ? 'con stock publicado' : 'según disponibilidad'
  const sku = getProductSku(product)
  const brandText = brand && !productNameIncludesBrand(product) ? ` marca ${brand}` : ''
  const skuText = sku ? ` SKU ${sku}.` : ''
  const base = `Compra ${name}${brandText} en ParaMascotasEC. Producto de ${category} para ${audience} en Ecuador, ${stockText}.${skuText}`
  return truncateAtWord(ensureMinimumLength(base, 70, 'Compra online con información actualizada para clientes de Ecuador.'), 160)
}

const buildFallbackImageAlt = (product: ProductType) => {
  const name = cleanSeoText(product.name) || 'Producto para mascotas'
  const brand = cleanSeoText(product.brand)
  const audience = getAudienceWord(product)
  return truncateAtWord(`${name}${brand && !productNameIncludesBrand(product) ? ` ${brand}` : ''} para ${audience} en ParaMascotasEC`, 125)
}

const buildFallbackSearchTerms = (product: ProductType) =>
  uniqueText([
    product.name,
    product.brand,
    getReadableCategory(product),
    product.productType,
    product.attributes?.species,
    getAudienceWord(product),
    getProductSku(product),
    'mascotas Ecuador',
  ]).join(', ')

const buildMerchantTitle = (product: ProductType) => {
  const name = cleanSeoText(product.name) || 'Producto para mascotas'
  const brand = cleanSeoText(product.brand)
  return truncateAtWord(brand && !productNameIncludesBrand(product) ? `${brand} ${name}` : name, 150)
}

export const buildProductSeoProfile = (product: ProductType): ProductSeoProfile => {
  const customTitle = cleanSeoText(product.attributes?.seoTitle)
  const customDescription = cleanSeoText(product.attributes?.seoDescription)
  const customImageAlt = cleanSeoText(product.attributes?.seoImageAlt)
  const customSearchTerms = cleanSeoText(product.attributes?.seoSearchTerms)
  const fallbackDescription = buildFallbackDescription(product)

  return {
    title: isLengthBetween(customTitle, 20, 70) ? customTitle : buildFallbackTitle(product),
    description: isLengthBetween(customDescription, 70, 160) ? customDescription : fallbackDescription,
    imageAlt: customImageAlt.length >= 20 ? customImageAlt : buildFallbackImageAlt(product),
    searchTerms: customSearchTerms || buildFallbackSearchTerms(product),
    merchantTitle: buildMerchantTitle(product),
    merchantDescription: cleanSeoText(product.description) || fallbackDescription,
  }
}
