import { NextRequest, NextResponse } from 'next/server'
import { loadProducts } from '@/lib/products.server'
import { findCatalogProductForSeoSlug, getProductSeoPath } from '@/lib/seoUrls'
import { toCanonicalUrl } from '@/lib/publicUrl'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim()

  if (!id) {
    return new NextResponse('Producto legacy no especificado.', {
      status: 410,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const { products } = await loadProducts({ fresh: true })
  const product = findCatalogProductForSeoSlug(products, id)

  if (!product) {
    return new NextResponse('Producto legacy no disponible.', {
      status: 410,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  return NextResponse.redirect(toCanonicalUrl(getProductSeoPath(product)), 301)
}
