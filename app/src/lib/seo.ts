import { ProductType } from '@/type/ProductType'
import {
    getProductCurrentPrice,
    getProductOriginalPrice,
    getProductReviewCount,
    getProductSku,
    getProductVariants,
} from '@/lib/catalog'
import { versionLocalImagePath } from '@/lib/staticAsset'
import type { SiteConfig } from '@/config/siteConfig'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'
import { getProductSeoPath } from '@/lib/seoUrls'

const toAbsoluteUrl = (baseUrl: string, path?: string | null) => {
    if (!path) return undefined
    if (/^https?:\/\//i.test(path)) return path
    const normalizedBase = baseUrl.replace(/\/$/, '')
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${normalizedBase}${normalizedPath}`
}

export function generateProductJsonLd(
    product: ProductType,
    options?: { baseUrl?: string; brandName?: string }
) {
    const siteUrl = (options?.baseUrl ?? getCanonicalSiteUrl()).replace(/\/$/, '')
    const brandName = options?.brandName ?? 'ParaMascotasEC'
    const productPath = getProductSeoPath(product)
    const productUrl = `${siteUrl}${productPath}`
    const reviewCount = getProductReviewCount(product)
    const price = getProductCurrentPrice(product)
    const originalPrice = getProductOriginalPrice(product)
    const variants = getProductVariants(product)
    const highPrice = Math.max(...variants.map((variant) => Number(variant.price ?? 0)).filter((value) => value > 0), price)
    const lowPrice = Math.min(...variants.map((variant) => Number(variant.price ?? 0)).filter((value) => value > 0), price)
    const sku = getProductSku(product) || product.internalId || product.id
    const imageList = [
        ...(product.images ?? []),
        ...(product.thumbImage ?? []),
    ].map((image) => toAbsoluteUrl(siteUrl, image)).filter(Boolean)

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        sku,
        mpn: sku,
        category: product.category,
        image: imageList,
        description: product.description,
        url: productUrl,
        brand: {
            '@type': 'Brand',
            name: product.brand || brandName,
        },
        offers: variants.length > 1 ? {
            '@type': 'AggregateOffer',
            url: productUrl,
            priceCurrency: 'USD',
            lowPrice,
            highPrice,
            offerCount: variants.length,
            availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
        } : {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: 'USD',
            price,
            availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
        },
        additionalProperty: [
            product.gender ? { '@type': 'PropertyValue', name: 'Mascota', value: product.gender === 'cat' ? 'Gato' : product.gender === 'dog' ? 'Perro' : product.gender } : undefined,
            originalPrice > price && originalPrice > 0 ? { '@type': 'PropertyValue', name: 'Precio anterior', value: originalPrice.toFixed(2) } : undefined,
        ].filter(Boolean),
        aggregateRating: product.rate > 0 && reviewCount > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: product.rate,
            reviewCount,
        } : undefined,
    }
}

export function generateOrganizationJsonLd(options?: { baseUrl?: string; name?: string; logo?: string; sameAs?: string[] }) {
    const siteUrl = (options?.baseUrl ?? getCanonicalSiteUrl()).replace(/\/$/, '')
    const name = options?.name ?? 'ParaMascotasEC'

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name,
        url: siteUrl,
        logo: options?.logo ?? `${siteUrl}${versionLocalImagePath('/images/brand/LogoVerde150.svg')}`,
        sameAs: options?.sameAs ?? [
            'https://www.facebook.com/paramascotasec',
            'https://www.instagram.com/paramascotasec',
        ],
    }
}

export function generateWebSiteJsonLd(site: SiteConfig) {
    const siteUrl = getCanonicalSiteUrl()

    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: site.name,
        alternateName: site.shortName,
        url: siteUrl,
        inLanguage: 'es-EC',
        description: site.description,
        publisher: {
            '@id': `${siteUrl}/#organization`,
        },
        potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/search-result?query={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    }
}

export function generatePetStoreJsonLd(site: SiteConfig) {
    const siteUrl = getCanonicalSiteUrl()
    const logo = toAbsoluteUrl(siteUrl, versionLocalImagePath(site.logo.src))
    const sameAs = [site.social.facebook, site.social.instagram, site.social.twitter, site.social.youtube]
        .filter((url): url is string => Boolean(url))

    return {
        '@context': 'https://schema.org',
        '@type': 'PetStore',
        '@id': `${siteUrl}/#organization`,
        name: site.name,
        alternateName: site.shortName,
        url: siteUrl,
        logo,
        image: logo,
        description: site.description,
        areaServed: {
            '@type': 'Country',
            name: 'Ecuador',
        },
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: site.contact.whatsappLabel,
            contactType: 'customer service',
            areaServed: 'EC',
            availableLanguage: ['Spanish', 'es-EC'],
        },
        sameAs,
        knowsAbout: [
            'alimento para perros',
            'alimento para gatos',
            'ropa para mascotas',
            'accesorios para mascotas',
            'salud y cuidado para mascotas',
            'tienda online para mascotas en Ecuador',
        ],
    }
}

export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }
}

export function generateItemListJsonLd(items: Array<{ name: string; url: string; image?: string | null }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: item.url,
            name: item.name,
            image: item.image,
        })),
    }
}

export function generateFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    }
}
