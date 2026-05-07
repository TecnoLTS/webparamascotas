import { NextResponse } from 'next/server'
import { listProducts } from '@/lib/api/products'
import { getProductCurrentPrice, getProductSku } from '@/lib/catalog'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'
import { getProductSeoPath } from '@/lib/seoUrls'
import type { ProductType } from '@/type/ProductType'

export const dynamic = 'force-dynamic'

const xmlEscape = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const cleanText = (value?: string | null) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const toAbsoluteUrl = (baseUrl: string, value?: string | null) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`
}

const getGoogleProductCategory = (product: ProductType) => {
  const productType = (product.productType || product.category || '').toLowerCase()
  const name = product.name.toLowerCase()

  if (productType.includes('alimento') || name.includes('comida') || name.includes('snack')) {
    return 'Animals & Pet Supplies > Pet Supplies > Pet Food'
  }

  if (productType.includes('ropa') || name.includes('camiseta') || name.includes('chaleco') || name.includes('hoodie')) {
    return 'Animals & Pet Supplies > Pet Supplies > Pet Clothing'
  }

  return 'Animals & Pet Supplies > Pet Supplies'
}

const getProductType = (product: ProductType) => {
  const pet = product.gender === 'cat' ? 'Gatos' : product.gender === 'dog' ? 'Perros' : 'Mascotas'
  const category = product.category || product.productType || 'Productos'
  return `Mascotas > ${pet} > ${category}`
}

const textStartsWith = (value: string, prefix: string) =>
  cleanText(value).toLowerCase().startsWith(`${cleanText(prefix).toLowerCase()} `)

const renderItem = (baseUrl: string, product: ProductType) => {
  const price = getProductCurrentPrice(product)
  const image = toAbsoluteUrl(baseUrl, product.thumbImage?.[0] || product.images?.[0])
  const sku = getProductSku(product)
  const id = product.id || product.internalId || product.slug
  const brand = cleanText(product.brand) || 'ParaMascotasEC'
  const title = cleanText(product.brand && !textStartsWith(product.name, product.brand)
    ? `${product.brand} ${product.name}`
    : product.name)
  const description = cleanText(product.description) || title

  if (!id || !title || price <= 0 || !image) {
    return ''
  }

  return [
    '<item>',
    `<g:id>${xmlEscape(id)}</g:id>`,
    `<g:title>${xmlEscape(title)}</g:title>`,
    `<g:description>${xmlEscape(description)}</g:description>`,
    `<g:link>${xmlEscape(`${baseUrl}${getProductSeoPath(product)}`)}</g:link>`,
    `<g:image_link>${xmlEscape(image)}</g:image_link>`,
    `<g:availability>${Number(product.quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>`,
    '<g:condition>new</g:condition>',
    `<g:price>${xmlEscape(`${price.toFixed(2)} USD`)}</g:price>`,
    `<g:brand>${xmlEscape(brand)}</g:brand>`,
    sku ? `<g:mpn>${xmlEscape(sku)}</g:mpn>` : '<g:identifier_exists>no</g:identifier_exists>',
    `<g:google_product_category>${xmlEscape(getGoogleProductCategory(product))}</g:google_product_category>`,
    `<g:product_type>${xmlEscape(getProductType(product))}</g:product_type>`,
    '</item>',
  ].join('\n')
}

export async function GET() {
  const baseUrl = getCanonicalSiteUrl()
  let products: ProductType[] = []

  try {
    products = await listProducts({ cache: 'no-store' })
  } catch (error) {
    console.error('No se pudo generar feed de Google Merchant:', error)
  }

  const items = products
    .filter((product) => product.published !== false && Number(product.quantity ?? 0) > 0)
    .sort((left, right) => {
      const leftFood = String(left.category || left.productType || '').toLowerCase().includes('alimento') ? 0 : 1
      const rightFood = String(right.category || right.productType || '').toLowerCase().includes('alimento') ? 0 : 1
      if (leftFood !== rightFood) return leftFood - rightFood
      return left.name.localeCompare(right.name, 'es')
    })
    .map((product) => renderItem(baseUrl, product))
    .filter(Boolean)
    .join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>ParaMascotasEC Google Products</title>',
    `<link>${xmlEscape(baseUrl)}</link>`,
    '<description>Productos publicados de ParaMascotasEC para Google Merchant Center.</description>',
    items,
    '</channel>',
    '</rss>',
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
