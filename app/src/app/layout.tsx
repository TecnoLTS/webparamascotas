import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Instrument_Sans } from 'next/font/google'
import '@/styles/styles.scss'
import GlobalProvider from './GlobalProvider'
import ClientModals from './ClientModals'
import CountdownTimeType from '@/type/CountdownType'
import { countdownTime } from '@/store/countdownTime'
import { getSiteConfig } from '@/lib/site'
import { versionLocalImagePath } from '@/lib/staticAsset'
import { fetchSuggestionsData } from '@/lib/server/suggestions'
import { generatePetStoreJsonLd, generateWebSiteJsonLd } from '@/lib/seo'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'

const instrument = Instrument_Sans({ subsets: ['latin'], display: 'swap' })
const serverTimeLeft: CountdownTimeType = countdownTime();
const homeHeroPreloads = [
  { media: '(max-width: 479px)', src: '/images/slider/generated/slade1-mobile-xs.webp' },
  { media: '(min-width: 480px) and (max-width: 639px)', src: '/images/slider/generated/slade1-mobile.webp' },
  { media: '(min-width: 640px) and (max-width: 767px)', src: '/images/slider/generated/slade1-mobile-wide.webp' },
  { media: '(min-width: 768px) and (max-width: 1023px)', src: '/images/slider/generated/slade1-tablet.webp' },
  { media: '(min-width: 1024px) and (max-width: 1279px)', src: '/images/slider/generated/slade1-laptop.webp' },
  { media: '(min-width: 1280px) and (max-width: 1535px)', src: '/images/slider/generated/slade1-desktop-1440.webp' },
  { media: '(min-width: 1536px) and (max-width: 1919px)', src: '/images/slider/generated/slade1-desktop.webp' },
  { media: '(min-width: 1920px) and (max-width: 2559px)', src: '/images/slider/generated/slade1-fhd.webp' },
  { media: '(min-width: 2560px) and (max-width: 3839px)', src: '/images/slider/generated/slade1-qhd.webp' },
  { media: '(min-width: 3840px)', src: '/images/slider/generated/slade1-uhd.webp' },
]

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteConfig()
  const siteUrl = getCanonicalSiteUrl()
  const ogImage = versionLocalImagePath('/images/slider/bg-pet1-1.png')

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: site.name,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: site.name,
      description: site.description,
      url: siteUrl,
      siteName: site.name,
      locale: 'es_ES',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${site.name} - Ecommerce`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: site.name,
      description: site.description,
      images: [ogImage],
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined
  const forwardedHost = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
  const forwardedProto = requestHeaders.get('x-forwarded-proto')
  const site = getSiteConfig()
  const siteUrl = getCanonicalSiteUrl()
  const initialSuggestions = await fetchSuggestionsData({
    host: forwardedHost,
    proto: forwardedProto || new URL(siteUrl).protocol.replace(':', ''),
    limit: 4,
  }).catch(() => [])
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {homeHeroPreloads.map(({ media, src }) => (
          <link
            key={src}
            rel="preload"
            as="image"
            href={versionLocalImagePath(src)}
            type="image/webp"
            media={media}
            fetchPriority="high"
          />
        ))}
      </head>
      <body className={instrument.className}>
        <GlobalProvider>
          <div id="app-root">
            {children}
          </div>
          <ClientModals serverTimeLeft={serverTimeLeft} initialSuggestions={initialSuggestions} />
          <script
            nonce={nonce}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generatePetStoreJsonLd(site))
            }}
          />
          <script
            nonce={nonce}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateWebSiteJsonLd(site))
            }}
          />
        </GlobalProvider>
      </body>
    </html>
  )
}
