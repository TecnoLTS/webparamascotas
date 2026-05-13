import {
  PET_CATEGORY_FILTERS,
  PET_CATEGORY_ROUTES,
  PET_FOOTER_CATEGORY_IDS,
  PET_HOME_CATEGORY_CARDS,
  getCategoryLabel,
  getCategoryUrl,
  type PetCategoryCard,
  type PetCategoryFilter,
} from '@/data/petCategoryCards'

export type SiteId = 'paramascotasec'

export type CategoryFilter = PetCategoryFilter
export type CategoryCard = PetCategoryCard

export type CategoryLink = {
  id: string
  gender?: string
  labelOverride?: string
}

export type MenuLink = {
  label: string
  href: string
}

export type MenuSection = {
  title: string
  links: CategoryLink[]
}

export type SiteConfig = {
  id: SiteId
  name: string
  shortName: string
  domain: string
  baseUrl: string
  apiBaseUrl: string
  description: string
  logo: {
    src: string
    alt: string
    mobileSrc?: string
  }
  contact: {
    email: string
    whatsappNumber: string
    whatsappLabel: string
  }
  social: {
    facebook?: string
    instagram?: string
    twitter?: string
    youtube?: string
  }
  hero?: {
    eyebrow: string
    title: string
    subtitle: string
    primaryCta: { label: string; href: string }
    secondaryCta?: { label: string; href: string }
  }
  categories: CategoryCard[]
  categoryFilters: Record<string, CategoryFilter>
  categoryRoutes: Record<string, string>
  menu: {
    categorySections: MenuSection[]
    serviceLinks: MenuLink[]
    companyLinks: MenuLink[]
    banner: { title: string; subtitle: string; image: string }
    servicesBanner?: { title: string; subtitle: string; image: string }
    departmentLinks?: MenuLink[]
  }
  footerCategoryLinks: string[]
}

export const defaultSiteId: SiteId = 'paramascotasec'
const SHOP_DEPARTMENT_CATEGORY_IDS = ['ropa', 'alimento', 'salud', 'accesorios'] as const

// Punto principal para editar datos globales del sitio.
// Si quieres tocar logo, textos, menu, contacto o enlaces, empieza aqui.
export const siteConfig: SiteConfig = {
  id: 'paramascotasec',
  name: 'ParaMascotasEC',
  shortName: 'ParaMascotasEC',
  domain: 'paramascotasec.com',
  baseUrl: 'https://paramascotasec.com',
  apiBaseUrl: 'https://api.paramascotasec.com',
  description:
    'ParaMascotasEC es una tienda de mascotas online en Ecuador con alimento para perros y gatos, comida húmeda, snacks, ropa, juguetes, accesorios y cuidado.',
  logo: {
    src: '/images/brand/LogoVerde150.svg',
    alt: 'ParaMascotasEC',
    mobileSrc: '/images/brand/LogoVerde150.png',
  },
  contact: {
    email: 'info@paramascotasec.com',
    whatsappNumber: '593978913529',
    whatsappLabel: '+593 (097) 891-35-29',
  },
  social: {
    facebook: 'https://www.facebook.com/paramascotasec',
    instagram: 'https://www.instagram.com/paramascotasec',
  },
  categories: PET_HOME_CATEGORY_CARDS,
  categoryFilters: PET_CATEGORY_FILTERS,
  categoryRoutes: PET_CATEGORY_ROUTES,
  menu: {
    categorySections: [
      {
        title: 'Categorías',
        links: [
          { id: 'todos', labelOverride: 'Todas' },
          { id: 'ropa' },
          { id: 'alimento' },
          { id: 'salud' },
          { id: 'accesorios' },
        ],
      },
      {
        title: 'Por mascota',
        links: [
          { id: 'perros' },
          { id: 'gatos' },
        ],
      },
    ],
    serviceLinks: [
      { label: 'Envios y devoluciones', href: '/pages/faqs' },
      { label: 'Centro de ayuda', href: '/pages/contact' },
    ],
    companyLinks: [{ label: 'Quienes somos', href: '/pages/about' }],
    banner: {
      title: ' ',
      subtitle: ' ',
      image: '/images/collection/14.webp',
    },
    servicesBanner: {
      title: ' ',
      subtitle: ' ',
      image: '/images/collection/15.webp',
    },
    departmentLinks: SHOP_DEPARTMENT_CATEGORY_IDS.map((categoryId) => ({
      label: getCategoryLabel(categoryId),
      href: getCategoryUrl(categoryId),
    })),
  },
  footerCategoryLinks: PET_FOOTER_CATEGORY_IDS,
}
