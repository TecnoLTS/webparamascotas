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
    label: 'Envios para mascotas',
    h1: 'Envios de productos para mascotas en Ecuador',
    title: 'Envios de productos para mascotas en Ecuador',
    description: 'Compra online productos para mascotas en ParaMascotasEC y recibe asistencia para coordinar envios en Ecuador segun cobertura vigente.',
    intro: 'ParaMascotasEC permite comprar alimento, accesorios, ropa y cuidado para mascotas online, con atencion para coordinar entrega segun zona de cobertura.',
    highlights: ['Productos fisicos para perros y gatos', 'Coordinacion por WhatsApp', 'Compra online con precios en USD'],
    faqs: [
      {
        question: 'A que zonas llegan los envios?',
        answer: 'La cobertura puede variar por ciudad y disponibilidad logistica. Antes de cerrar la compra puedes confirmar la entrega con ParaMascotasEC.',
      },
      {
        question: 'Puedo pedir alimento para perros o gatos a domicilio?',
        answer: 'Si, puedes comprar productos publicados en la tienda online y coordinar la entrega cuando la zona este cubierta.',
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
    intro: 'La tienda online de ParaMascotasEC publica productos para perros y gatos con fotos, precios, disponibilidad y categorias pensadas para encontrar rapido lo que necesita tu mascota.',
    highlights: ['Alimento, accesorios, ropa y cuidado', 'Catalogo con stock publicado', 'Productos por especie, marca y categoria'],
    faqs: [
      {
        question: 'Que puedo comprar online en ParaMascotasEC?',
        answer: 'Puedes comprar alimento para perros y gatos, comida humeda, snacks, ropa, accesorios y productos de cuidado segun stock publicado.',
      },
      {
        question: 'Los productos futuros tambien tendran pagina SEO?',
        answer: 'Si. Los productos publicados generan URL limpia, metadata, canonical, datos estructurados y entrada de sitemap cuando estan disponibles.',
      },
    ],
    updatedAt: '2026-05-06',
    priority: 0.66,
  },
  {
    slug: 'atencion-whatsapp-para-mascotas',
    path: '/servicios/atencion-whatsapp-para-mascotas',
    label: 'Atencion por WhatsApp',
    h1: 'Atencion por WhatsApp para compras de mascotas',
    title: 'Atencion por WhatsApp para productos de mascotas',
    description: 'Contacta a ParaMascotasEC por WhatsApp para dudas sobre alimento, marcas, presentaciones, stock, envios y compras online.',
    intro: 'ParaMascotasEC ofrece atencion por WhatsApp para confirmar disponibilidad, resolver dudas de compra y ayudar a elegir productos publicados para perros y gatos.',
    highlights: ['Soporte de compra', 'Confirmacion de stock', 'Ayuda con alimento, marcas y presentaciones'],
    faqs: [
      {
        question: 'Puedo preguntar por una marca especifica?',
        answer: 'Si. Puedes consultar por marcas, presentaciones, precios y disponibilidad publicada antes de comprar.',
      },
      {
        question: 'La atencion por WhatsApp reemplaza una consulta veterinaria?',
        answer: 'No. Para diagnosticos, tratamientos o sintomas, consulta con un veterinario. La atencion de ParaMascotasEC es de compra y disponibilidad.',
      },
    ],
    updatedAt: '2026-05-06',
    priority: 0.58,
  },
  {
    slug: 'asesoria-alimento-perros-gatos',
    path: '/servicios/asesoria-alimento-perros-gatos',
    label: 'Asesoria de alimento',
    h1: 'Asesoria para comprar alimento de perros y gatos',
    title: 'Asesoria para comprar alimento de perros y gatos',
    description: 'Recibe orientacion de compra para encontrar alimento para perros y gatos por especie, edad, marca, presentacion y disponibilidad.',
    intro: 'Si necesitas comparar alimento seco, comida humeda, snacks o marcas disponibles, ParaMascotasEC puede orientarte sobre las opciones publicadas en la tienda.',
    highlights: ['Alimento por especie y etapa', 'Opciones por marca y presentacion', 'Orientacion de compra no veterinaria'],
    faqs: [
      {
        question: 'Me pueden ayudar a elegir alimento?',
        answer: 'Si. Podemos orientarte con base en especie, edad, tamano, marca y presentaciones disponibles en el catalogo.',
      },
      {
        question: 'Esta asesoria es medica?',
        answer: 'No. Para dietas terapeuticas, alergias, enfermedades o sintomas, debes consultar con un veterinario.',
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
