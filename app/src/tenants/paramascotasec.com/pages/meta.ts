import { Metadata } from 'next'
import { versionLocalImagePath } from '@/lib/staticAsset'
import { toCanonicalUrl } from '@/lib/publicUrl'

type PageMeta = {
  title: string
  description: string
  images?: string[]
}

export const pageMetadata: Record<string, PageMeta> = {
  about: {
    title: 'Conocenos',
    description:
      'Descubre nuestra historia, quienes somos y nuestra pasion por el cuidado de tus mascotas en Para Mascotas Ecuador.',
    images: ['/images/banner/27.webp'],
  },
  'coming-soon': {
    title: 'Proximamente',
    description: 'Estamos preparando algo especial para ti.',
  },
  contact: {
    title: 'Contacto',
    description: 'Escribenos y recibe soporte personalizado para tus compras.',
  },
  'customer-feedbacks': {
    title: 'Testimonios',
    description: 'Lo que opinan nuestros clientes sobre Para Mascotas EC.',
  },
  faqs: {
    title: 'Preguntas frecuentes',
    description: 'Resolvemos tus dudas sobre compras, envios y devoluciones.',
  },
  'page-not-found': {
    title: 'Pagina no encontrada',
    description: 'La pagina que buscas no existe o fue movida.',
  },
  'politica-de-privacidad': {
    title: 'Politica de privacidad',
    description: 'Conoce como protegemos tu informacion y datos personales.',
  },
  'preguntas-frecuentes': {
    title: 'Preguntas frecuentes',
    description: 'Resolvemos tus dudas sobre compras, envios y devoluciones.',
  },
  'store-list': {
    title: 'Tiendas y puntos de venta',
    description: 'Encuentra nuestras tiendas y puntos de venta en tu ciudad.',
  },
  'terminos-y-condiciones': {
    title: 'Terminos y condiciones',
    description: 'Lee los terminos y condiciones de compra de Para Mascotas EC.',
  },
}

export const buildPageMetadata = (pageKey: string, tenantName: string): Metadata => {
  const meta = pageMetadata[pageKey] ?? {
    title: 'Informacion',
    description: 'Informacion general.',
  }
  return {
    title: `${meta.title} | ${tenantName}`,
    description: meta.description,
    alternates: {
      canonical: toCanonicalUrl(`/pages/${pageKey}`),
    },
    openGraph: meta.images
      ? {
          title: `${meta.title} | ${tenantName}`,
          description: meta.description,
          url: toCanonicalUrl(`/pages/${pageKey}`),
          images: meta.images.map(versionLocalImagePath),
        }
      : {
          title: `${meta.title} | ${tenantName}`,
          description: meta.description,
          url: toCanonicalUrl(`/pages/${pageKey}`),
        },
  }
}
