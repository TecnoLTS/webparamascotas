import { NextRequest, NextResponse } from 'next/server'
import { resolveLegacyShopPath } from '@/lib/seoUrls'
import { toCanonicalUrl } from '@/lib/publicUrl'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const targetPath = resolveLegacyShopPath({
    category: request.nextUrl.searchParams.get('category'),
    gender: request.nextUrl.searchParams.get('gender'),
    query: request.nextUrl.searchParams.get('query'),
  })
  return NextResponse.redirect(toCanonicalUrl(targetPath), 301)
}
