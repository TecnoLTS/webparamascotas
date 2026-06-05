interface Variation {
    color: string;
    colorCode: string;
    colorImage: string;
    image: string;
}

interface PurchaseInvoiceSummary {
    id?: string | null;
    invoiceNumber?: string | null;
    supplierName?: string | null;
    supplierDocument?: string | null;
    issuedAt?: string | null;
    receivedAt?: string | null;
    quantity?: number;
    unitCost?: number;
    lineTotal?: number;
}

export interface ProductVariantOption {
    id: string;
    internalId?: string;
    slug: string;
    name: string;
    label: string;
    presentation?: string;
    price: number;
    originPrice: number;
    quantity: number;
    sold: number;
    product: ProductType;
}

export interface ProductType {
    id: string,
    internalId?: string,
    category: string,
    productType?: string,
    cost?: number,
    tax?: {
        rate?: number,
        multiplier?: number,
        exempt?: boolean,
    },
    business?: {
        cost?: number,
        margin?: number,
        profit?: number,
        suggestions?: {
            min_price?: number,
            recommended_price?: number,
            max_price?: number,
            min_price_pvp?: number,
            recommended_price_pvp?: number,
            max_price_pvp?: number
        }
    },
    attributes?: Record<string, string>,
    inventory?: {
        onHand?: number,
        reserved?: number,
        available?: number,
        soldHistorical?: number,
        reorderPoint?: number,
        criticalPoint?: number,
        overstockThreshold?: number,
        stockMax?: number,
        status?: string,
        coverage?: {
            days?: number | null,
            avgMonthlySales?: number,
            windowMonths?: number,
            confidence?: string
        },
        valuation?: {
            costTotal?: number,
            saleTotalNet?: number,
            saleTotalGross?: number
        },
        lot?: {
            code?: string | null,
            location?: string | null,
            supplier?: string | null
        },
        expiration?: {
            date?: string | null,
            alertDays?: number,
            daysToExpire?: number | null,
            status?: 'none' | 'ok' | 'expiring' | 'expired' | string
        },
        purchaseHistory?: {
            entriesCount?: number,
            purchasedUnits?: number,
            remainingUnits?: number,
            lastPurchaseAt?: string | null
        },
        salesHistory?: {
            ordersCount?: number,
            soldUnits?: number,
            lastSaleAt?: string | null
        },
        procurement?: {
            openLotsCount?: number,
            remainingUnitsTotal?: number,
            remainingCostTotal?: number,
            weightedUnitCost?: number,
            minUnitCost?: number,
            maxUnitCost?: number,
            weightedProfit?: number,
            weightedMargin?: number,
            lastPurchaseProfit?: number,
            lastPurchaseMargin?: number
        },
        lastPurchaseInvoice?: PurchaseInvoiceSummary | null
    },
    lastPurchaseInvoice?: PurchaseInvoiceSummary | null,
    expirationDate?: string | null,
    expirationAlertDays?: number,
    daysToExpire?: number | null,
    expirationStatus?: 'none' | 'ok' | 'expiring' | 'expired',
    pageSettings?: {
        deliveryEstimate: string,
        viewerCount: number,
        freeShippingThreshold: number,
        supportHours: string,
        returnDays: number
    },
    type: string,
    name: string,
    reviewCount?: number,
    variantLabel?: string,
    variantBaseName?: string,
    variantGroupKey?: string,
    variantAxis?: string,
    variantCount?: number,
    variantPresentation?: string,
    variantOptions?: Array<ProductVariantOption>,
    priceMin?: number,
    priceMax?: number,
    originPriceMin?: number,
    originPriceMax?: number,
    gender: string,
    new: boolean,
    sale: boolean,
    published?: boolean,
    rate: number,
    price: number,
    originPrice: number,
    brand: string,
    sold: number,
    quantity: number,
    quantityPurchase: number,
    sizes: Array<string>,
    variation: Variation[],
    thumbImage: Array<string>,
    images: Array<string>,
    imageMeta?: Array<{
        url: string;
        width?: number;
        height?: number;
        kind?: string;
        altText?: string | null;
        displayOrder?: number;
    }>,
    reviewSummary?: {
        count: number;
        average: number;
    },
    reviews?: Array<{
        id: string;
        rating: number;
        title?: string | null;
        body: string;
        authorName: string;
        createdAt?: string | null;
    }>,
    description: string,
    action: string,
    slug: string,
    createdAt?: string,
    updatedAt?: string
}
