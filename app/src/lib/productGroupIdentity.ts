import type { ProductType } from '@/type/ProductType'

const PRODUCT_GROUP_ID_PREFIX = 'pg'
const PRODUCT_GROUP_ID_PATTERN = /^[A-Za-z0-9]{1,50}$/
const FNV_64_OFFSET = 0xcbf29ce484222325n
const FNV_64_PRIME = 0x100000001b3n
const FNV_64_MASK = 0xffffffffffffffffn
type ProductGroupIdentityInput = Pick<Partial<ProductType>, 'attributes' | 'id' | 'internalId' | 'productGroupId' | 'slug' | 'variantGroupKey'>

const normalizeGroupSource = (value?: string | number | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const fnv1a64Base36 = (value: string) => {
  let hash = FNV_64_OFFSET
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index))
    hash = (hash * FNV_64_PRIME) & FNV_64_MASK
  }
  return hash.toString(36)
}

export const isValidProductGroupId = (value?: string | null) =>
  PRODUCT_GROUP_ID_PATTERN.test(String(value ?? ''))

export const buildCanonicalProductGroupId = (source?: string | number | null) => {
  const normalizedSource = normalizeGroupSource(source)
  if (!normalizedSource) return ''

  return `${PRODUCT_GROUP_ID_PREFIX}${fnv1a64Base36(normalizedSource)}`
}

export const getProductGroupSource = (product: ProductGroupIdentityInput) =>
  product.variantGroupKey
  || product.attributes?.variantGroupKey
  || product.internalId
  || product.id
  || product.slug

export const getCanonicalProductGroupId = (product: ProductGroupIdentityInput) => {
  if (isValidProductGroupId(product.productGroupId)) {
    return product.productGroupId as string
  }

  return buildCanonicalProductGroupId(getProductGroupSource(product))
}
