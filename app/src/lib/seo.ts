import { ProductType } from '@/type/ProductType'
import {
    getProductCurrentPrice,
    getProductOriginalPrice,
    getProductSku,
    getProductVariants,
} from '@/lib/catalog'
import { getVariantAxisValue, getVariantColorValue, getVariantSizeValue } from '@/lib/catalogAttributes'
import { versionLocalImagePath } from '@/lib/staticAsset'
import type { SiteConfig } from '@/config/siteConfig'
import { getCanonicalSiteUrl } from '@/lib/publicUrl'
import { getProductSeoPath } from '@/lib/seoUrls'
import { buildProductSeoProfile } from '@/lib/productSeoProfile'
import type { ProductReview, ProductReviewSummary } from '@/lib/api/productReviews'
import { getCanonicalProductGroupId } from '@/lib/productGroupIdentity'
import { getGoogleProductVariantAxes } from '@/lib/productVariantSeo'

const toAbsoluteUrl = (baseUrl: string, path?: string | null) => {
    if (!path) return undefined
    if (/^https?:\/\//i.test(path)) return path
    const normalizedBase = baseUrl.replace(/\/$/, '')
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${normalizedBase}${normalizedPath}`
}

const getMerchantReturnPolicyId = (siteUrl: string) => `${siteUrl}/#merchant-return-policy`

const buildMerchantReturnPolicy = (siteUrl: string) => ({
    '@type': 'MerchantReturnPolicy',
    '@id': getMerchantReturnPolicyId(siteUrl),
    applicableCountry: 'EC',
    returnPolicyCountry: 'EC',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 5,
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    returnMethod: 'https://schema.org/ReturnInStore',
    merchantReturnLink: `${siteUrl}/pages/terminos-y-condiciones#cambios`,
})

const buildOfferShippingDetails = () => ({
    '@type': 'OfferShippingDetails',
    shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'EC',
    },
    shippingRate: {
        '@type': 'MonetaryAmount',
        value: 5,
        currency: 'USD',
    },
    deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 2,
            unitCode: 'DAY',
        },
        transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 5,
            unitCode: 'DAY',
        },
    },
})

const getProductImages = (product: ProductType, siteUrl: string) =>
    [
        ...(product.images ?? []),
        ...(product.thumbImage ?? []),
    ].map((image) => toAbsoluteUrl(siteUrl, image)).filter(Boolean)

const getProductVariantId = (product: ProductType) =>
    product.id || product.internalId || product.slug

const getProductVariantUrl = (productUrl: string, product: ProductType) => {
    const variantId = getProductVariantId(product)
    return variantId ? `${productUrl}?variant=${encodeURIComponent(variantId)}` : productUrl
}

const buildSeller = (siteUrl: string) => ({
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'ParaMascotasEC',
    url: siteUrl,
})

const buildOfferPolicies = (siteUrl: string) => ({
    shippingDetails: buildOfferShippingDetails(),
    hasMerchantReturnPolicy: buildMerchantReturnPolicy(siteUrl),
})

const buildProductOffer = ({
    product,
    productUrl,
    siteUrl,
    variantUrl = productUrl,
}: {
    product: ProductType
    productUrl: string
    siteUrl: string
    variantUrl?: string
}) => ({
    '@type': 'Offer',
    url: variantUrl,
    priceCurrency: 'USD',
    price: getProductCurrentPrice(product),
    availability: Number(product.quantity ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
    seller: buildSeller(siteUrl),
    ...buildOfferPolicies(siteUrl),
})

const buildVariantProductJsonLd = ({
    product,
    productUrl,
    siteUrl,
    brandName,
    productGroupId,
    productGroupIdentifier,
}: {
    product: ProductType
    productUrl: string
    siteUrl: string
    brandName: string
    productGroupId: string
    productGroupIdentifier: string
}) => {
    const seoProfile = buildProductSeoProfile(product)
    const sku = getProductSku(product) || product.internalId || product.id
    const variantUrl = getProductVariantUrl(productUrl, product)
    const size = getVariantSizeValue(product)
    const color = getVariantColorValue(product)
    const material = getVariantAxisValue(product, 'material')
    const pattern = product.attributes?.pattern

    return {
        '@type': 'Product',
        '@id': `${variantUrl}#product`,
        name: product.name,
        sku,
        mpn: sku,
        image: getProductImages(product, siteUrl),
        description: product.description || seoProfile.description,
        url: variantUrl,
        size: size || undefined,
        color: color || undefined,
        material: material || undefined,
        pattern: pattern || undefined,
        brand: {
            '@type': 'Brand',
            name: product.brand || brandName,
        },
        isVariantOf: {
            '@type': 'ProductGroup',
            '@id': productGroupId,
            productGroupID: productGroupIdentifier,
        },
        offers: buildProductOffer({
            product,
            productUrl,
            siteUrl,
            variantUrl,
        }),
    }
}

export function generateProductJsonLd(
    product: ProductType,
    options?: { baseUrl?: string; brandName?: string; reviews?: ProductReview[]; reviewSummary?: ProductReviewSummary }
) {
    const siteUrl = (options?.baseUrl ?? getCanonicalSiteUrl()).replace(/\/$/, '')
    const brandName = options?.brandName ?? 'ParaMascotasEC'
    const productPath = getProductSeoPath(product)
    const productUrl = `${siteUrl}${productPath}`
    const seoProfile = buildProductSeoProfile(product)
    const visibleReviews = options?.reviews ?? product.reviews ?? []
    const fallbackReviewAverage = visibleReviews.length > 0
        ? visibleReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / visibleReviews.length
        : 0
    const reviewCount = Number(options?.reviewSummary?.count ?? product.reviewSummary?.count ?? visibleReviews.length)
    const reviewAverage = Number(options?.reviewSummary?.average ?? product.reviewSummary?.average ?? fallbackReviewAverage)
    const price = getProductCurrentPrice(product)
    const originalPrice = getProductOriginalPrice(product)
    const variants = getProductVariants(product)
    const highPrice = Math.max(...variants.map((variant) => Number(variant.price ?? 0)).filter((value) => value > 0), price)
    const lowPrice = Math.min(...variants.map((variant) => Number(variant.price ?? 0)).filter((value) => value > 0), price)
    const sku = getProductSku(product) || product.internalId || product.id
    const imageList = getProductImages(product, siteUrl)
    const productGroupId = `${productUrl}#product-group`
    const productGroupIdentifier = getCanonicalProductGroupId(product)
    const variantAxes = getGoogleProductVariantAxes(variants)
    const aggregateOffer = {
        '@type': 'AggregateOffer',
        url: productUrl,
        priceCurrency: 'USD',
        lowPrice,
        highPrice,
        offerCount: variants.length,
        availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: buildSeller(siteUrl),
        ...buildOfferPolicies(siteUrl),
    }
    const additionalProperty = [
        product.gender ? { '@type': 'PropertyValue', name: 'Mascota', value: product.gender === 'cat' ? 'Gato' : product.gender === 'dog' ? 'Perro' : product.gender } : undefined,
        originalPrice > price && originalPrice > 0 ? { '@type': 'PropertyValue', name: 'Precio anterior', value: originalPrice.toFixed(2) } : undefined,
    ].filter(Boolean)
    const aggregateRating = reviewAverage > 0 && reviewCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: Number(reviewAverage.toFixed(2)),
        reviewCount,
    } : undefined
    const reviewJsonLd = visibleReviews.slice(0, 5).map((review) => ({
        '@type': 'Review',
        name: review.title || undefined,
        reviewBody: review.body,
        datePublished: review.createdAt ? String(review.createdAt).slice(0, 10) : undefined,
        author: {
            '@type': 'Person',
            name: review.authorName || 'Cliente verificado',
        },
        reviewRating: {
            '@type': 'Rating',
            ratingValue: Number(review.rating || 0),
            bestRating: 5,
            worstRating: 1,
        },
    })).filter((review) => review.reviewRating.ratingValue > 0 && review.reviewBody)
    const primaryProduct = {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        sku,
        mpn: sku,
        category: product.category,
        image: imageList,
        description: product.description || seoProfile.description,
        url: productUrl,
        brand: {
            '@type': 'Brand',
            name: product.brand || brandName,
        },
        offers: variants.length > 1
            ? aggregateOffer
            : buildProductOffer({
                product,
                productUrl,
                siteUrl,
            }),
        additionalProperty,
        aggregateRating,
        review: reviewJsonLd.length > 0 ? reviewJsonLd : undefined,
    }

    if (variants.length > 1 && variantAxes.length > 0) {
        return {
            '@context': 'https://schema.org',
            '@graph': [
                primaryProduct,
                {
                    '@type': 'ProductGroup',
                    '@id': productGroupId,
                    name: product.name,
                    productGroupID: productGroupIdentifier,
                    variesBy: variantAxes,
                    sku,
                    mpn: sku,
                    category: product.category,
                    image: imageList,
                    description: product.description || seoProfile.description,
                    url: productUrl,
                    brand: {
                        '@type': 'Brand',
                        name: product.brand || brandName,
                    },
                    offers: aggregateOffer,
                    hasVariant: variants.map((variant) => buildVariantProductJsonLd({
                        product: variant,
                        productUrl,
                        siteUrl,
                        brandName,
                        productGroupId,
                        productGroupIdentifier,
                    })),
                    additionalProperty,
                    aggregateRating,
                    review: reviewJsonLd.length > 0 ? reviewJsonLd : undefined,
                },
            ],
        }
    }

    return {
        '@context': 'https://schema.org',
        ...primaryProduct,
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
        hasMerchantReturnPolicy: buildMerchantReturnPolicy(siteUrl),
        sameAs: options?.sameAs ?? [
            'https://www.facebook.com/paramascotasec',
            'https://www.instagram.com/paramascotas_ec/',
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
        hasMerchantReturnPolicy: buildMerchantReturnPolicy(siteUrl),
        areaServed: {
            '@type': 'Country',
            name: 'Ecuador',
        },
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: site.contact.whatsappLabel,
            contactType: 'Atención al cliente',
            areaServed: 'EC',
            availableLanguage: ['es-EC', 'Español'],
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
