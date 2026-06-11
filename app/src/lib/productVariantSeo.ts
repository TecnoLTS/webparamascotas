import type { ProductType } from '@/type/ProductType'
import { getProductVariants } from '@/lib/catalog'
import { getVariantAxisValue, getVariantColorValue, getVariantSizeValue } from '@/lib/catalogAttributes'

const normalizeIdentity = (value?: string | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const hasDistinctPublicValues = (values: Array<string | null | undefined>) =>
  new Set(values.map(normalizeIdentity).filter(Boolean)).size > 1

export const GOOGLE_SCHEMA_VARIANT_AXES = {
  size: 'https://schema.org/size',
  color: 'https://schema.org/color',
  material: 'https://schema.org/material',
  pattern: 'https://schema.org/pattern',
} as const

export type GoogleSchemaVariantAxis = keyof typeof GOOGLE_SCHEMA_VARIANT_AXES

export const getGoogleProductVariantAxes = (productOrVariants: ProductType | ProductType[]) => {
  const variants = Array.isArray(productOrVariants)
    ? productOrVariants
    : getProductVariants(productOrVariants)

  if (variants.length <= 1) return []

  const axes = [
    hasDistinctPublicValues(variants.map(getVariantSizeValue)) ? GOOGLE_SCHEMA_VARIANT_AXES.size : '',
    hasDistinctPublicValues(variants.map(getVariantColorValue)) ? GOOGLE_SCHEMA_VARIANT_AXES.color : '',
    hasDistinctPublicValues(variants.map((variant) => getVariantAxisValue(variant, 'material'))) ? GOOGLE_SCHEMA_VARIANT_AXES.material : '',
    hasDistinctPublicValues(variants.map((variant) => variant.attributes?.pattern)) ? GOOGLE_SCHEMA_VARIANT_AXES.pattern : '',
  ].filter(Boolean)

  return Array.from(new Set(axes))
}

export const hasGoogleProductVariantAxes = (productOrVariants: ProductType | ProductType[]) =>
  getGoogleProductVariantAxes(productOrVariants).length > 0
