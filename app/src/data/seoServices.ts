export type SeoServicePage = {
  slug: string
  path: string
  label: string
  h1: string
  title: string
  description: string
  intro: string
  highlights: string[]
  faqs: Array<{ question: string; answer: string }>
  updatedAt: string
  priority: number
}

const slugifyService = (value?: string | number | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const SEO_SERVICE_PAGES: SeoServicePage[] = [
  {
    slug: 'envios-productos-para-mascotas-ecuador',
    path: '/servicios/envios-productos-para-mascotas-ecuador',
    label: 'Envíos para mascotas',
    h1: 'Envíos de productos para mascotas en Ecuador',
    title: 'Envíos de productos para mascotas en Ecuador',
    description: 'Compra online productos para mascotas en ParaMascotasEC y recibe asistencia para coordinar envíos en Ecuador según cobertura vigente.',
    intro: 'ParaMascotasEC permite comprar alimento, accesorios, ropa y cuidado para mascotas online, con atención para coordinar entrega según zona de cobertura.',
    highlights: ['Productos físicos para perros y gatos', 'Coordinación por WhatsApp', 'Compra online con precios en USD'],
    faqs: [
      {
        question: '¿A qué zonas llegan los envíos?',
        answer: 'La cobertura puede variar por ciudad y disponibilidad logística. Antes de cerrar la compra puedes confirmar la entrega con ParaMascotasEC.',
      },
      {
        question: '¿Puedo pedir alimento para perros o gatos a domicilio?',
        answer: 'Sí, puedes comprar productos publicados en la tienda online y coordinar la entrega cuando la zona esté cubierta.',
      },
    ],
    updatedAt: '2026-05-06',
    priority: 0.62,
  },
  {
    slug: 'compra-online-para-mascotas-ecuador',
    path: '/servicios/compra-online-para-mascotas-ecuador',
    label: 'Compra online',
    h1: 'Compra online productos para mascotas en Ecuador',
    title: 'Compra online productos para mascotas en Ecuador',
    description: 'Compra online alimento para perros, alimento para gatos, accesorios, ropa y productos de cuidado en ParaMascotasEC Ecuador.',
    intro: 'La tienda online de ParaMascotasEC publica productos para perros y gatos con fotos, precios, disponibilidad y categorías pensadas para encontrar rápido lo que necesita tu mascota.',
    highlights: ['Alimento, accesorios, ropa y cuidado', 'Catálogo con stock publicado', 'Productos por especie, marca y categoría'],
    faqs: [
      {
        question: '¿Qué puedo comprar online en ParaMascotasEC?',
        answer: 'Puedes comprar alimento para perros y gatos, comida húmeda, snacks, ropa, accesorios y productos de cuidado según stock publicado.',
      },
      {
        question: '¿Los productos futuros también tendrán página SEO?',
        answer: 'Sí. Los productos publicados generan URL limpia, metadata, canonical, datos estructurados y entrada de sitemap cuando están disponibles.',
      },
    ],
    updatedAt: '2026-05-06',
    priority: 0.66,
  },
  {
    slug: 'atencion-whatsapp-para-mascotas',
    path: '/servicios/atencion-whatsapp-para-mascotas',
    label: 'Atención por WhatsApp',
    h1: 'Atención por WhatsApp para compras de mascotas',
    title: 'Atención por WhatsApp para productos de mascotas',
    description: 'Contacta a ParaMascotasEC por WhatsApp para dudas sobre alimento, marcas, presentaciones, stock, envíos y compras online.',
    intro: 'ParaMascotasEC ofrece atención por WhatsApp para confirmar disponibilidad, resolver dudas de compra y ayudar a elegir productos publicados para perros y gatos.',
    highlights: ['Soporte de compra', 'Confirmación de stock', 'Ayuda con alimento, marcas y presentaciones'],
    faqs: [
      {
        question: '¿Puedo preguntar por una marca específica?',
        answer: 'Sí. Puedes consultar por marcas, presentaciones, precios y disponibilidad publicada antes de comprar.',
      },
      {
        question: '¿La atención por WhatsApp reemplaza una consulta veterinaria?',
        answer: 'No. Para diagnósticos, tratamientos o síntomas, consulta con un veterinario. La atención de ParaMascotasEC es de compra y disponibilidad.',
      },
    ],
    updatedAt: '2026-05-06',
    priority: 0.58,
  },
  {
    slug: 'asesoria-alimento-perros-gatos',
    path: '/servicios/asesoria-alimento-perros-gatos',
    label: 'Asesoría de alimento',
    h1: 'Asesoría para comprar alimento de perros y gatos',
    title: 'Asesoría para comprar alimento de perros y gatos',
    description: 'Recibe orientación de compra para encontrar alimento para perros y gatos por especie, edad, marca, presentación y disponibilidad.',
    intro: 'Si necesitas comparar alimento seco, comida húmeda, snacks o marcas disponibles, ParaMascotasEC puede orientarte sobre las opciones publicadas en la tienda.',
    highlights: ['Alimento por especie y etapa', 'Opciones por marca y presentación', 'Orientación de compra no veterinaria'],
    faqs: [
      {
        question: '¿Me pueden ayudar a elegir alimento?',
        answer: 'Sí. Podemos orientarte con base en especie, edad, tamaño, marca y presentaciones disponibles en el catálogo.',
      },
      {
        question: '¿Esta asesoría es médica?',
        answer: 'No. Para dietas terapéuticas, alergias, enfermedades o síntomas, debes consultar con un veterinario.',
      },
    ],
    updatedAt: '2026-05-06',
    priority: 0.6,
  },
]

const SEO_SERVICE_PAGE_BY_SLUG = new Map(SEO_SERVICE_PAGES.map((page) => [page.slug, page]))

export const getSeoServicePageBySlug = (slug?: string | null) => {
  if (!slug) return null
  return SEO_SERVICE_PAGE_BY_SLUG.get(slugifyService(slug)) ?? null
}
