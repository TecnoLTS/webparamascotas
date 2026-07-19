import type { Metadata } from 'next'
import '@/styles/styles.scss'
import '@/styles/tailwind.css'
import GlobalProvider from './GlobalProvider'
import ClientModals from './ClientModals'
import CountdownTimeType from '@/type/CountdownType'
import { countdownTime } from '@/store/countdownTime'
import { getSiteConfig } from '@/lib/site'
import { versionLocalImagePath } from '@/lib/staticAsset'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'

const serverTimeLeft: CountdownTimeType = countdownTime();

export const dynamic = 'force-dynamic'
// CSP usa un nonce distinto por respuesta, por lo que el shell debe seguir
// siendo dinamico. No fuerces `no-store` en toda la jerarquia: los clientes
// server-side aplican cache solo a GET publicos allowlisted y mantienen auth y
// mutaciones en `no-store`.

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
          alt: `${site.name} - tienda online para mascotas en Ecuador`,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head />
      <body>
        <GlobalProvider>
          <div id="app-root">
            {children}
          </div>
          <ClientModals serverTimeLeft={serverTimeLeft} />
        </GlobalProvider>
      </body>
    </html>
  )
}
