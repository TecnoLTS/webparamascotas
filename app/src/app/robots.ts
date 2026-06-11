import type { MetadataRoute } from 'next'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'

const cleanSegment = (value: string, fallback: string) =>
  (value || fallback).trim().replace(/^\/+|\/+$/g, '') || fallback

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getCanonicalSiteUrl()
  const tenantSlug = cleanSegment(process.env.NEXT_PUBLIC_TENANT_SLUG || '', 'paramascotasec')
  const apiSegment = cleanSegment(process.env.NEXT_PUBLIC_API_SERVICE_SEGMENT || '', 'api')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          `/${tenantSlug}/${apiSegment}/`,
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-images.xml`],
  }
}
