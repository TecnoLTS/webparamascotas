'use client'

import React from 'react'
import Image from '@/components/Common/AppImage'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import { requestApi } from '@/lib/apiClient'
import { buildProductSeoProfile } from '@/lib/productSeoProfile'
import { toPublicApiUrl } from '@/lib/publicApiPath'
import { updateProductReferenceData, type PricingCalc, type PricingMargins } from '@/lib/api/settings'
import { normalizeMeasurementLabel } from '@/lib/measurementLabel'
import {
    createProductBrandReferenceId,
    createProductSupplierReferenceId,
    findSupplierReference,
    getBrandOptionsWithCurrent,
    getReferenceOptionsWithCurrent,
    getSupplierPurchaseTaxRateLabel,
    getSupplierOptionsWithCurrent,
    PRODUCT_REFERENCE_SECTIONS,
    type ProductReferenceData,
    type ProductReferenceKey,
} from '@/lib/productReferenceData'
import {
    APPAREL_GENDER_OPTIONS,
    PET_SPECIES_OPTIONS,
    PRODUCT_TYPE_OPTIONS,
    normalizeProductCategory,
    normalizeProductType,
    normalizeProductSpecies,
    parseSerializedProductCategories,
    resolveAudienceGenderFromSpecies,
    serializeProductCategories,
} from '@/lib/productTaxonomy'
import {
    createEmptyProductSizeGuideRow,
    parseProductSizeGuideRows,
    serializeProductSizeGuideRows,
    type ProductSizeGuideRow,
} from '@/lib/productSizeGuide'
import {
    createEmptyPurchaseInvoice,
    enrichVariantAttributes,
    createImageEntry,
    getAdminProductEntityId,
    getAttributesForTypeChange,
    getVariantDefinitionFieldKey,
    getVariantDefinitionFieldLabel,
    inferDuplicateVariantFieldKey,
    isProductEligibleForPublication,
    MAX_PRODUCT_IMAGE_BYTES,
    normalizeAdminProducts,
    normalizeAttributes,
    PRODUCT_IMAGE_ACCEPTED_TYPES,
    resolveProductVariantBaseName,
    resolveProductVariantLabel,
} from '../../productFormUtils'
import { ADMIN_PRODUCTS_ENDPOINT, withTransientRetry } from '../../utils'
import type { ProductEditorMode, ProductFormState, PurchaseInvoiceFormState } from '../../types'

type ProductEditorModalProps = {
    open: boolean;
    editingProduct: any | null;
    existingProducts: any[];
    editorMode: ProductEditorMode;
    initialForm: ProductFormState;
    vatMultiplier: number;
    normalizedMargins: PricingMargins;
    normalizedCalc: PricingCalc;
    referenceData: ProductReferenceData;
    activeTab?: string;
    onClose: () => void;
    onProductsUpdated: (products: any[]) => void;
    onRefreshPurchaseInvoices: () => Promise<void>;
    onOpenReferenceCatalog: (key: ProductReferenceKey) => void;
    onReferenceDataUpdated?: (data: ProductReferenceData) => void;
    onSessionExpired?: () => void;
    showNotification: (text: string, type?: 'success' | 'error') => void;
}

type UploadImageMetadata = {
    platform: string
    brandName: string
    productName: string
    category: string
    productType: string
    size: string
    color: string
    species: string
    material: string
    variantLabel: string
}

const requiredImageSizes = {
    thumb: { width: 640, height: 800 },
    gallery: { width: 1200, height: 1500 }
}

const PURCHASE_INVOICE_MEMORY_KEY = 'paramascotasec:last-purchase-invoice'
const BASE_PRICE_FRACTION_DIGITS = 4
type StringProductReferenceKey = Exclude<ProductReferenceKey, 'brands' | 'suppliers'>
const ATTRIBUTE_REFERENCE_KEY_BY_FIELD: Partial<Record<string, StringProductReferenceKey>> = {
    size: 'sizes',
    weight: 'weights',
    presentation: 'presentations',
    dosage: 'dosages',
    material: 'materials',
    color: 'colors',
    usage: 'usages',
    activeIngredient: 'activeIngredients',
    storageLocation: 'storageLocations',
    tag: 'tags',
    flavor: 'flavors',
    age: 'ageRanges',
}
const INVENTORY_ADJUSTMENT_REASON_OPTIONS = [
    'Corrección por carga inicial',
    'Conteo físico',
    'Error administrativo',
    'Producto dañado',
    'Producto vencido',
    'Merma',
    'Otro ajuste',
] as const

const normalizeReferenceIdentity = (value?: string | null) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('es-EC')

const normalizeInlineReferenceValue = (key: ProductReferenceKey, value: string) => {
    const collapsed = String(value || '').replace(/\s+/g, ' ').trim()
    if (!collapsed) return ''

    if (key === 'sizes' || key === 'weights' || key === 'presentations' || key === 'dosages') {
        return normalizeMeasurementLabel(collapsed)
    }

    return collapsed
}

const getCategoryIdentity = (value?: string | null) =>
    normalizeProductCategory(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

const sanitizeAdditionalCategoryValues = (
    values: Array<string | null | undefined>,
    primaryCategory?: string | null,
    previousPrimaryCategory?: string | null
) => {
    const blockedCategories = new Set(
        [primaryCategory, previousPrimaryCategory]
            .map((value) => getCategoryIdentity(value))
            .filter(Boolean)
    )
    const seenCategories = new Set<string>()

    return values.reduce<string[]>((acc, value) => {
        const normalizedValue = normalizeProductCategory(value)
        const categoryIdentity = getCategoryIdentity(normalizedValue)
        if (!normalizedValue || !categoryIdentity || blockedCategories.has(categoryIdentity) || seenCategories.has(categoryIdentity)) {
            return acc
        }

        seenCategories.add(categoryIdentity)
        acc.push(normalizedValue)
        return acc
    }, [])
}

const serializeSanitizedAdditionalCategories = (
    values: Array<string | null | undefined>,
    primaryCategory?: string | null,
    previousPrimaryCategory?: string | null
) => serializeProductCategories(sanitizeAdditionalCategoryValues(values, primaryCategory, previousPrimaryCategory))

const applyDefaultSizes = (
    entries: Array<{ url: string; width?: string | number; height?: string | number; altText?: string }>,
    kind: 'thumb' | 'gallery'
) => {
    const required = requiredImageSizes[kind]
    return entries.map((entry) => ({
        ...entry,
        width: entry.width && Number(entry.width) > 0 ? String(entry.width) : String(required.width),
        height: entry.height && Number(entry.height) > 0 ? String(entry.height) : String(required.height)
    }))
}

const seoSlugify = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')

const cleanSeoPart = (value: unknown) => String(value || '').trim()

const getSeoVariantValue = (attrs: Record<string, any>) =>
    cleanSeoPart(attrs.variantLabel || attrs.range || attrs.presentation || attrs.dosage || attrs.size || attrs.weight || attrs.color || attrs.material)

const isSeoTextLengthValid = (value: string, min: number, max: number) => value.length >= min && value.length <= max

const buildSeoProductFromForm = (form: ProductFormState) => ({
    id: form.id || 'product-form',
    internalId: form.id || 'product-form',
    slug: '',
    name: cleanSeoPart(form.name),
    brand: cleanSeoPart(form.brand),
    category: cleanSeoPart(form.category),
    productType: cleanSeoPart(form.productType),
    gender: '',
    price: Number(form.price || 0),
    originPrice: Number(form.marketPrice || form.price || 0),
    quantity: Number(form.quantity || 0),
    description: cleanSeoPart(form.description),
    attributes: form.attributes || {},
    thumbImage: (form.thumbImages || []).map((image) => image.url).filter(Boolean),
    images: (form.galleryImages || []).map((image) => image.url).filter(Boolean),
} as any)

const buildSuggestedSeoTitle = (form: ProductFormState) => {
    return buildProductSeoProfile(buildSeoProductFromForm(form)).title
}

const buildSuggestedSeoDescription = (form: ProductFormState) => {
    return buildProductSeoProfile(buildSeoProductFromForm(form)).description
}

const buildSuggestedSeoAlt = (form: ProductFormState) => {
    return buildProductSeoProfile(buildSeoProductFromForm(form)).imageAlt
}

const buildSuggestedSearchTerms = (form: ProductFormState) => {
    return buildProductSeoProfile(buildSeoProductFromForm(form)).searchTerms
}

const sanitizeDecimalInput = (value: string, maxFractionDigits = 2) => {
    const cleaned = String(value ?? '')
        .replace(/[^\d.,]/g, '')
        .replace(/\s+/g, '')

    if (!cleaned) return ''

    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    const separatorIndex = Math.max(lastComma, lastDot)

    if (separatorIndex < 0) {
        const integerOnly = cleaned.replace(/[^\d]/g, '')
        return integerOnly.replace(/^0+(?=\d)/, '') || '0'
    }

    const integerPart = cleaned
        .slice(0, separatorIndex)
        .replace(/[^\d]/g, '')
        .replace(/^0+(?=\d)/, '') || '0'
    const fractionPart = cleaned
        .slice(separatorIndex + 1)
        .replace(/[^\d]/g, '')
        .slice(0, maxFractionDigits)

    return `${integerPart},${fractionPart}`
}

const normalizeDecimalForStorage = (value: string, maxFractionDigits = 2) =>
    sanitizeDecimalInput(value, maxFractionDigits).replace(/,/g, '.')

const formatDecimalForDisplay = (value: string | number | null | undefined, fractionDigits = 2) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' && value.trim() === '') return ''
    const parsed = parseLocalizedDecimal(value)
    if (!Number.isFinite(parsed)) return ''
    return parsed.toLocaleString('es-EC', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })
}

const roundDecimal = (value: number, fractionDigits = 2) => {
    const factor = 10 ** fractionDigits
    return Math.round((value + Number.EPSILON) * factor) / factor
}

const finalizeDecimalForStorage = (value: string | number | null | undefined, fractionDigits = 2) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const parsed = parseLocalizedDecimal(raw)
    if (!Number.isFinite(parsed)) return ''
    return roundDecimal(parsed, fractionDigits).toFixed(fractionDigits)
}

const parseLocalizedDecimal = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0

    const raw = String(value ?? '').trim()
    if (!raw) return 0

    const cleaned = raw.replace(/[^\d.,]/g, '').replace(/\s+/g, '')
    if (!cleaned) return 0

    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    const separatorIndex = Math.max(lastComma, lastDot)

    let normalized = ''

    if (separatorIndex < 0) {
        normalized = cleaned.replace(/[^\d]/g, '')
    } else {
        const integerPart = cleaned.slice(0, separatorIndex).replace(/[^\d]/g, '')
        const fractionPart = cleaned.slice(separatorIndex + 1).replace(/[^\d]/g, '')
        normalized = `${integerPart || '0'}.${fractionPart}`
    }

    if (!normalized) return 0

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
}

const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : ''
            if (!result) {
                reject(new Error('No se pudo leer la imagen.'))
                return
            }
            resolve(result)
        }
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
        reader.readAsDataURL(file)
    })

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = document.createElement('img')
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
        img.src = dataUrl
    })

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        readFileAsDataUrl(file)
            .then((dataUrl) => loadImageFromDataUrl(dataUrl))
            .then((img) => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight })
            })
            .catch((error) => reject(error))
    })

const resizeImage = (file: File, targetWidth: number, targetHeight: number): Promise<File> =>
    new Promise((resolve, reject) => {
        readFileAsDataUrl(file)
            .then((dataUrl) => loadImageFromDataUrl(dataUrl))
            .then((img) => {
                const canvas = document.createElement('canvas')
                canvas.width = targetWidth
                canvas.height = targetHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('No se pudo procesar la imagen.'))
                    return
                }
                // Ajusta la imagen sin deformarla: canvas fijo, fondo blanco y centrado proporcional.
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, targetWidth, targetHeight)

                const scale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight)
                const drawWidth = img.naturalWidth * scale
                const drawHeight = img.naturalHeight * scale
                const offsetX = (targetWidth - drawWidth) / 2
                const offsetY = (targetHeight - drawHeight) / 2

                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('No se pudo recortar la imagen.'))
                        return
                    }
                    const ext = file.name.split('.').pop() || 'jpg'
                    resolve(new File([blob], `recorte-${Date.now()}.${ext}`, { type: blob.type }))
                }, file.type || 'image/jpeg', 0.92)
            })
            .catch((error) => reject(error))
    })

const resolveUploadImageMetadata = (form: ProductFormState): UploadImageMetadata => {
    const attrs = (form.attributes || {}) as Record<string, any>
    const platform =
        typeof window !== 'undefined'
            ? window.location.hostname.replace(/^www\./, '').split('.')[0] || 'paramascotas'
            : 'paramascotas'

    return {
        platform,
        productName: String(form.name || ''),
        brandName: String(form.brand || ''),
        category: String(form.category || ''),
        productType: String(form.productType || ''),
        size: String(attrs.size || attrs.range || attrs.presentation || attrs.weight || attrs.dosage || ''),
        color: String(attrs.color || ''),
        species: String(attrs.species || attrs.target || ''),
        material: String(attrs.material || ''),
        variantLabel: String(attrs.variantLabel || attrs.variantBaseName || ''),
    }
}

const uploadImage = async (file: File, kind: 'thumb' | 'gallery', metadata: UploadImageMetadata) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)
    Object.entries(metadata).forEach(([key, value]) => {
        const normalized = String(value || '').trim()
        if (normalized) {
            formData.append(key, normalized)
        }
    })

    const res = await requestApi<{ url: string; width?: number; height?: number; kind: string; altText?: string }>(toPublicApiUrl('/api/uploads/images'), {
        method: 'POST',
        body: formData,
        timeoutMs: 60000,
    })
    return res.body
}

const getSuggestedBasePriceForCostPreview = (
    cost: number,
    vatMultiplier: number,
    margins: PricingMargins,
    calc: PricingCalc
) => {
    if (!Number.isFinite(cost) || cost <= 0) return 0
    const shippingBuffer = Math.max(0, Number(calc.shippingBuffer || 0))
    const effectiveCost = cost + shippingBuffer
    const margin = Math.max(0, Number(margins.targetMargin || margins.baseMargin || 0))
    const divisor = 1 - (margin / 100)
    let suggestedBase = divisor > 0 ? (effectiveCost / divisor) : effectiveCost
    const rounding = Math.max(0, Number(calc.rounding || 0))
    if (rounding > 0) {
        suggestedBase = Math.ceil(suggestedBase / rounding) * rounding
    }
    const minBase = effectiveCost * (1 + Math.max(0, Number(margins.minMargin || 0)) / 100)
    suggestedBase = Math.max(suggestedBase, minBase)
    const previewPvp = suggestedBase * Math.max(1, vatMultiplier)
    return previewPvp > 0 ? suggestedBase : 0
}

const getEffectiveVatMultiplier = (taxExempt: boolean, vatMultiplier: number) =>
    taxExempt ? 1 : Math.max(1, vatMultiplier)

const normalizeTaxRateInput = (value: string | number | null | undefined, fallback = 0) => {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'number') {
        return Number.isFinite(value) ? Math.max(0, value) : fallback
    }

    const raw = String(value).trim()
    if (!raw) return fallback
    const normalized = raw.replace(',', '.')
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) return fallback

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
}

const roundCurrency = (value: number) => {
    if (!Number.isFinite(value)) return 0
    return Math.round(value * 100) / 100
}

const normalizeRememberedPurchaseInvoice = (value: unknown): Partial<PurchaseInvoiceFormState> | null => {
    if (!value || typeof value !== 'object') return null
    const source = value as Record<string, unknown>
    const remembered = {
        invoiceNumber: String(source.invoiceNumber || '').trim(),
        supplierName: String(source.supplierName || '').trim(),
        supplierDocument: String(source.supplierDocument || '').trim(),
        purchaseTaxRate: String(source.purchaseTaxRate || '').trim(),
        issuedAt: String(source.issuedAt || '').trim(),
        notes: String(source.notes || '').trim(),
    }
    if (!remembered.invoiceNumber && !remembered.supplierName && !remembered.purchaseTaxRate && !remembered.issuedAt && !remembered.notes) {
        return null
    }
    return remembered
}

const readRememberedPurchaseInvoice = (): Partial<PurchaseInvoiceFormState> | null => {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(PURCHASE_INVOICE_MEMORY_KEY)
        if (!raw) return null
        return normalizeRememberedPurchaseInvoice(JSON.parse(raw))
    } catch {
        return null
    }
}

const persistRememberedPurchaseInvoice = (purchaseInvoice: Partial<PurchaseInvoiceFormState>) => {
    if (typeof window === 'undefined') return
    const normalized = normalizeRememberedPurchaseInvoice(purchaseInvoice)
    if (!normalized) return
    window.localStorage.setItem(PURCHASE_INVOICE_MEMORY_KEY, JSON.stringify(normalized))
}

const PRODUCT_TYPE_SKU_PREFIX: Record<string, string> = {
    Alimento: 'ALI',
    ropa: 'ROP',
    accesorios: 'ACC',
    cuidado: 'SAL',
}

const SKU_STOPWORDS = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'PARA', 'CON', 'Y', 'EN', 'POR'])

const normalizeSuggestionTokens = (value: string, maxLength = 4) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => token.slice(0, maxLength))
        .filter(Boolean)

const normalizeSkuComponent = (value: string, maxLength = 6) =>
    normalizeSuggestionTokens(value, maxLength)
        .filter((token) => !SKU_STOPWORDS.has(token))

const getSkuBrandComponent = (brand: string) => {
    const tokens = normalizeSkuComponent(brand, 6)
    if (tokens.length === 0) return ''
    if (tokens.length === 1) return tokens[0]

    const acronym = tokens.map((token) => token.slice(0, 1)).join('')
    return acronym.slice(0, 6) || tokens[0]
}

const getSkuNameComponents = (name: string) => {
    const tokens = normalizeSkuComponent(name, 6)
    if (tokens.length === 0) return []
    if (tokens.length === 1) return [tokens[0]]
    return tokens.slice(0, 2)
}

const getSkuVariantComponent = (variantLabel: string) => {
    const compact = variantLabel
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .trim()

    if (compact) return compact.slice(0, 8)
    const fallback = normalizeSkuComponent(variantLabel, 8)
    return fallback[0] || ''
}

const getSkuSimpleComponent = (value: string, maxLength = 5) => {
    const tokens = normalizeSkuComponent(value, maxLength)
    return tokens[0] || ''
}

const getSuggestionDateToken = (dateValue?: string) => {
    if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
        return dateValue.trim().replace(/-/g, '')
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

const buildSuggestedSku = ({
    productType,
    category,
    brand,
    name,
    variantLabel,
    color,
    species,
}: {
    productType: string;
    category: string;
    brand: string;
    name: string;
    variantLabel: string;
    color: string;
    species: string;
}) => {
    const normalizedType = normalizeProductType(productType, category)
    const typePrefix = PRODUCT_TYPE_SKU_PREFIX[normalizedType] || 'SKU'
    const parts = [typePrefix]
    const seen = new Set(parts)

    const pushUnique = (tokens: string[], limit = tokens.length) => {
        tokens.slice(0, limit).forEach((token) => {
            if (!token || seen.has(token)) return
            seen.add(token)
            parts.push(token)
        })
    }

    pushUnique([getSkuBrandComponent(brand)], 1)
    pushUnique(getSkuNameComponents(name), 2)
    pushUnique([getSkuVariantComponent(variantLabel)], 1)
    pushUnique([getSkuSimpleComponent(color, 5)], 1)
    pushUnique([getSkuSimpleComponent(species, 5)], 1)

    if (parts.length === 1) {
        parts.push(getSuggestionDateToken())
    }

    return parts.join('-').slice(0, 64)
}

const ensureUniqueSkuSuggestion = (candidate: string, existingSkus: Set<string>) => {
    const normalizedCandidate = candidate.trim().toUpperCase()
    if (!normalizedCandidate) return ''
    if (!existingSkus.has(normalizedCandidate)) return normalizedCandidate

    const base = normalizedCandidate.slice(0, 58)
    for (let index = 2; index < 1000; index += 1) {
        const suffix = String(index).padStart(2, '0')
        const nextCandidate = `${base}-${suffix}`.slice(0, 64)
        if (!existingSkus.has(nextCandidate)) {
            return nextCandidate
        }
    }

    return `${base}-${Date.now().toString().slice(-4)}`.slice(0, 64)
}

const buildSuggestedLotCode = ({
    issuedAt,
    supplierName,
    name,
    variantLabel,
    seed,
}: {
    issuedAt?: string;
    supplierName?: string;
    name: string;
    variantLabel: string;
    seed: string;
}) => {
    const parts = ['LOT', getSuggestionDateToken(issuedAt)]
    const seen = new Set(parts)

    const pushUnique = (tokens: string[], limit = tokens.length) => {
        tokens.slice(0, limit).forEach((token) => {
            if (!token || seen.has(token)) return
            seen.add(token)
            parts.push(token)
        })
    }

    pushUnique(normalizeSuggestionTokens(supplierName || '', 4), 1)
    pushUnique(normalizeSuggestionTokens(name, 4), 1)
    pushUnique(normalizeSuggestionTokens(variantLabel, 4), 1)

    if (seed) {
        parts.push(seed)
    }

    return parts.join('-').slice(0, 64)
}

export default function ProductEditorModal({
    open,
    editingProduct,
    existingProducts,
    editorMode,
    initialForm,
    vatMultiplier,
    normalizedMargins,
    normalizedCalc,
    referenceData,
    activeTab,
    onClose,
    onProductsUpdated,
    onRefreshPurchaseInvoices,
    onReferenceDataUpdated,
    onSessionExpired,
    showNotification,
}: ProductEditorModalProps) {
    const [form, setForm] = React.useState<ProductFormState>(initialForm)
    const [costWithVatInput, setCostWithVatInput] = React.useState('')
    const [costWithVatManuallySet, setCostWithVatManuallySet] = React.useState(false)
    const [activeMoneyField, setActiveMoneyField] = React.useState<'price' | 'pvp' | 'marketPrice' | 'cost' | 'costWithVat' | null>(null)
    const [markupInput, setMarkupInput] = React.useState('')
    const [markupManuallySet, setMarkupManuallySet] = React.useState(false)
    const [formSessionKey, setFormSessionKey] = React.useState('product-editor-form')
    const [imageUploading, setImageUploading] = React.useState<Record<string, boolean>>({})
    const [saving, setSaving] = React.useState(false)
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
    const [restockUnitsInput, setRestockUnitsInput] = React.useState('0')
    const [inventoryAdjustmentReason, setInventoryAdjustmentReason] = React.useState('')
    const [referenceDrafts, setReferenceDrafts] = React.useState<Partial<Record<ProductReferenceKey, string>>>({})
    const [referenceSavingKey, setReferenceSavingKey] = React.useState<ProductReferenceKey | null>(null)
    const [quickSupplierDraft, setQuickSupplierDraft] = React.useState({ name: '', document: '' })
    const galleryMultiInputRef = React.useRef<HTMLInputElement | null>(null)
    const formRef = React.useRef<HTMLFormElement | null>(null)
    const skuManuallyEditedRef = React.useRef(false)
    const lotManuallyEditedRef = React.useRef(false)
    const lotSuggestionSeedRef = React.useRef('001')
    const deferredForm = React.useDeferredValue(form)
    const deferredEditingProduct = React.useDeferredValue(editingProduct)
    const systemVatRate = React.useMemo(
        () => roundCurrency(Math.max(0, (Math.max(1, vatMultiplier) - 1) * 100)),
        [vatMultiplier]
    )
    const isDuplicateVariantMode = editorMode === 'duplicate-variant'
    const isRestockMode = editorMode === 'restock'
    const effectiveVatMultiplier = React.useMemo(
        () => getEffectiveVatMultiplier(Boolean(form.taxExempt), vatMultiplier),
        [form.taxExempt, vatMultiplier]
    )
    const persistedVatMultiplier = React.useMemo(
        () => getEffectiveVatMultiplier(Boolean(initialForm.taxExempt), vatMultiplier),
        [initialForm.taxExempt, vatMultiplier]
    )

    React.useEffect(() => {
        if (!open) return
        const rememberedPurchaseInvoice = editorMode === 'create'
            ? readRememberedPurchaseInvoice()
            : null
        const nextForm = rememberedPurchaseInvoice
            ? {
                ...initialForm,
                purchaseInvoice: {
                    ...initialForm.purchaseInvoice,
                    ...rememberedPurchaseInvoice,
                },
            }
            : initialForm
        if (!String(nextForm.purchaseInvoice?.purchaseTaxRate || '').trim()) {
            nextForm.purchaseInvoice = {
                ...nextForm.purchaseInvoice,
                purchaseTaxRate: systemVatRate.toFixed(2),
            }
        }
        setForm(nextForm)
        setImageUploading({})
        setSaving(false)
        setFormErrors({})
        setRestockUnitsInput('0')
        setInventoryAdjustmentReason('')
        setReferenceDrafts({})
        setReferenceSavingKey(null)
        setQuickSupplierDraft({ name: '', document: '' })
        setActiveMoneyField(null)
        setCostWithVatInput('')
        setCostWithVatManuallySet(false)
        setMarkupManuallySet(false)
        setFormSessionKey(`product-editor-form-${editorMode}-${Date.now()}`)
        skuManuallyEditedRef.current = Boolean(editingProduct && editorMode !== 'duplicate-variant' && String(initialForm.attributes?.sku || '').trim())
        lotManuallyEditedRef.current = Boolean(editingProduct && editorMode !== 'duplicate-variant' && String(initialForm.attributes?.lotCode || '').trim())
        lotSuggestionSeedRef.current = String(Math.floor(Math.random() * 900) + 100)
    }, [open, initialForm, editingProduct, editorMode, systemVatRate])

    const duplicateVariantBaseName = React.useMemo(() => {
        const attributeBaseName = String(form.attributes?.variantBaseName || '').trim()
        if (attributeBaseName) return attributeBaseName

        const sourceBaseName = String(initialForm.attributes?.variantBaseName || '').trim()
        if (sourceBaseName) return sourceBaseName

        return resolveProductVariantBaseName(editingProduct || initialForm)
    }, [editingProduct, form.attributes?.variantBaseName, initialForm])
    const duplicateVariantFieldKey = React.useMemo(
        () => (isDuplicateVariantMode
            ? inferDuplicateVariantFieldKey(form.productType, {
                ...(initialForm.attributes || {}),
                ...(form.attributes || {}),
            }, editingProduct || undefined)
            : getVariantDefinitionFieldKey(form.productType)),
        [editingProduct, form.attributes, form.productType, initialForm.attributes, isDuplicateVariantMode]
    )
    const duplicateVariantFieldLabel = React.useMemo(() => {
        if (duplicateVariantFieldKey === 'color') return 'color'
        if (duplicateVariantFieldKey === 'presentation') return 'presentación'
        if (duplicateVariantFieldKey === 'weight') return 'peso'
        if (duplicateVariantFieldKey === 'range') return 'rango o peso'
        if (duplicateVariantFieldKey === 'dosage') return 'dosis'

        const normalizedType = normalizeProductType(form.productType, form.category)
        if (normalizedType === 'ropa') return 'talla'
        return 'tamaño'
    }, [duplicateVariantFieldKey, form.category, form.productType])
    const duplicateVariantFieldOptions = React.useMemo(() => {
        return [
            { key: 'size', label: 'Talla o tamaño' },
            { key: 'color', label: 'Color' },
            { key: 'presentation', label: 'Presentación' },
            { key: 'weight', label: 'Peso/contenido' },
            { key: 'dosage', label: 'Dosis' },
            { key: 'range', label: 'Rango recomendado' },
        ]
    }, [])
    const duplicateVariantFieldOptionsLabel = React.useMemo(
        () => duplicateVariantFieldOptions.map((option) => option.label.toLowerCase()).join(' o '),
        [duplicateVariantFieldOptions]
    )
    const duplicateVariantInputValue = React.useMemo(() => {
        const attributes = form.attributes || {}

        if (duplicateVariantFieldKey === 'presentation') {
            return String(attributes.presentation || attributes.variantLabel || '').trim()
        }

        if (duplicateVariantFieldKey === 'color') {
            return String(attributes.color || attributes.variantLabel || '').trim()
        }

        if (duplicateVariantFieldKey === 'weight') {
            return String(attributes.weight || attributes.variantLabel || '').trim()
        }

        if (duplicateVariantFieldKey === 'range') {
            return String(attributes.range || attributes.variantLabel || '').trim()
        }

        if (duplicateVariantFieldKey === 'dosage') {
            return String(attributes.dosage || attributes.variantLabel || '').trim()
        }

        const normalizedType = normalizeProductType(form.productType, form.category)
        if (normalizedType === 'Alimento') {
            return String(attributes.variantLabel || attributes.size || attributes.weight || '').trim()
        }

        return String(attributes.size || attributes.variantLabel || '').trim()
    }, [duplicateVariantFieldKey, form.attributes, form.category, form.productType])
    const duplicateVariantLabel = React.useMemo(
        () => normalizeMeasurementLabel(duplicateVariantInputValue),
        [duplicateVariantInputValue]
    )
    const selectedAdditionalCategories = React.useMemo(
        () => sanitizeAdditionalCategoryValues(
            parseSerializedProductCategories(form.attributes?.catalogCategories),
            form.category
        ),
        [form.attributes?.catalogCategories, form.category]
    )
    const sizeGuideRows = React.useMemo(() => parseProductSizeGuideRows(form.attributes?.sizeGuideRows), [form.attributes?.sizeGuideRows])
    const brandOptions = React.useMemo(() => getBrandOptionsWithCurrent(referenceData.brands, form.brand), [form.brand, referenceData.brands])
    const supplierOptions = React.useMemo(
        () => getSupplierOptionsWithCurrent(referenceData.suppliers, form.purchaseInvoice?.supplierName || form.attributes?.supplier),
        [form.attributes?.supplier, form.purchaseInvoice?.supplierName, referenceData.suppliers]
    )
    const sizeOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.sizes, form.attributes?.size), [form.attributes?.size, referenceData.sizes])
    const weightOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.weights, form.attributes?.weight), [form.attributes?.weight, referenceData.weights])
    const materialOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.materials, form.attributes?.material), [form.attributes?.material, referenceData.materials])
    const colorOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.colors, form.attributes?.color), [form.attributes?.color, referenceData.colors])
    const usageOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.usages, form.attributes?.usage), [form.attributes?.usage, referenceData.usages])
    const presentationOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.presentations, form.attributes?.presentation), [form.attributes?.presentation, referenceData.presentations])
    const dosageOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.dosages, form.attributes?.dosage), [form.attributes?.dosage, referenceData.dosages])
    const activeIngredientOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.activeIngredients, form.attributes?.activeIngredient), [form.attributes?.activeIngredient, referenceData.activeIngredients])
    const storageLocationOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.storageLocations, form.attributes?.storageLocation), [form.attributes?.storageLocation, referenceData.storageLocations])
    const tagOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.tags, form.attributes?.tag), [form.attributes?.tag, referenceData.tags])
    const flavorOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.flavors, form.attributes?.flavor), [form.attributes?.flavor, referenceData.flavors])
    const ageRangeOptions = React.useMemo(() => getReferenceOptionsWithCurrent(referenceData.ageRanges, form.attributes?.age), [form.attributes?.age, referenceData.ageRanges])
    const categoryOptions = React.useMemo(
        () => getReferenceOptionsWithCurrent(referenceData.categories, form.category),
        [form.category, referenceData.categories]
    )
    const duplicateVariantOptions = React.useMemo(() => {
        if (duplicateVariantFieldKey === 'presentation') return presentationOptions
        if (duplicateVariantFieldKey === 'color') return colorOptions
        if (duplicateVariantFieldKey === 'weight') return weightOptions
        if (duplicateVariantFieldKey === 'dosage') return dosageOptions
        if (duplicateVariantFieldKey === 'range') return []
        return sizeOptions
    }, [colorOptions, dosageOptions, duplicateVariantFieldKey, presentationOptions, sizeOptions, weightOptions])
    const duplicateVariantReferenceItems = React.useMemo(() => {
        if (duplicateVariantFieldKey === 'presentation') {
            return [{ key: 'presentations' as ProductReferenceKey, options: presentationOptions }]
        }

        if (duplicateVariantFieldKey === 'color') {
            return [{ key: 'colors' as ProductReferenceKey, options: colorOptions }]
        }

        if (duplicateVariantFieldKey === 'weight') {
            return [{ key: 'weights' as ProductReferenceKey, options: weightOptions }]
        }

        if (duplicateVariantFieldKey === 'dosage') {
            return [{ key: 'dosages' as ProductReferenceKey, options: dosageOptions }]
        }

        if (duplicateVariantFieldKey === 'range') {
            return []
        }

        return [{ key: 'sizes' as ProductReferenceKey, options: sizeOptions }]
    }, [colorOptions, dosageOptions, duplicateVariantFieldKey, presentationOptions, sizeOptions, weightOptions])
    const duplicateVariantEmptyLabel = React.useMemo(() => {
        if (duplicateVariantFieldKey === 'presentation') return 'No hay presentaciones registradas'
        if (duplicateVariantFieldKey === 'color') return 'No hay colores registrados'
        if (duplicateVariantFieldKey === 'weight') return 'Escribe el peso de la nueva variante'
        if (duplicateVariantFieldKey === 'range') return 'Escribe el rango o peso de la nueva variante'
        if (duplicateVariantFieldKey === 'dosage') return 'Escribe la dosis de la nueva variante'
        return 'No hay tallas o tamaños registrados'
    }, [duplicateVariantFieldKey])
    const duplicateVariantReferenceEmptyText = React.useMemo(() => {
        if (duplicateVariantFieldKey === 'presentation') return 'Crea aquí la presentación que falte antes de guardar.'
        if (duplicateVariantFieldKey === 'color') return 'Crea aquí el color que falte antes de guardar.'
        if (duplicateVariantFieldKey === 'weight') return 'El peso se escribe manualmente para esta variante.'
        if (duplicateVariantFieldKey === 'range') return 'El rango o peso recomendado se escribe manualmente para esta variante.'
        if (duplicateVariantFieldKey === 'dosage') return 'La dosis se escribe manualmente para esta variante.'
        if (normalizeProductType(form.productType, form.category) === 'ropa') return 'Crea aquí la talla que falte antes de guardar.'
        return 'Crea aquí la talla o tamaño que falte antes de guardar.'
    }, [duplicateVariantFieldKey, form.category, form.productType])
    const primaryCategory = React.useMemo(
        () => normalizeProductCategory(form.category),
        [form.category]
    )
    const selectedPurchaseSupplier = React.useMemo(
        () => findSupplierReference(referenceData.suppliers, form.purchaseInvoice?.supplierName),
        [form.purchaseInvoice?.supplierName, referenceData.suppliers]
    )
    const selectedPreferredSupplier = React.useMemo(
        () => findSupplierReference(referenceData.suppliers, form.attributes?.supplier),
        [form.attributes?.supplier, referenceData.suppliers]
    )
    const purchaseTaxRateInputRaw = String(form.purchaseInvoice?.purchaseTaxRate || '').trim()
    const purchaseTaxRateValue = React.useMemo(() => {
        if (purchaseTaxRateInputRaw !== '') {
            return normalizeTaxRateInput(purchaseTaxRateInputRaw, systemVatRate)
        }
        if (selectedPurchaseSupplier?.purchaseTaxRate) {
            return normalizeTaxRateInput(selectedPurchaseSupplier.purchaseTaxRate, systemVatRate)
        }
        if (selectedPreferredSupplier?.purchaseTaxRate) {
            return normalizeTaxRateInput(selectedPreferredSupplier.purchaseTaxRate, systemVatRate)
        }
        return systemVatRate
    }, [
        purchaseTaxRateInputRaw,
        selectedPreferredSupplier?.purchaseTaxRate,
        selectedPurchaseSupplier?.purchaseTaxRate,
        systemVatRate,
    ])
    const purchaseVatMultiplier = React.useMemo(
        () => 1 + (Math.max(0, purchaseTaxRateValue) / 100),
        [purchaseTaxRateValue]
    )
    const reservedSkuSet = React.useMemo(() => {
        const currentEntityId = getAdminProductEntityId(editingProduct || {})
        const shouldExcludeCurrent = editorMode === 'edit' || editorMode === 'restock'

        return new Set(
            (existingProducts || [])
                .filter((product) => {
                    const isArchived = String(product?.attributes?.archived || '').trim().toLowerCase() === 'true'
                    if (isArchived) return false
                    if (!shouldExcludeCurrent) return true
                    return getAdminProductEntityId(product) !== currentEntityId
                })
                .map((product) => String(product?.attributes?.sku || '').trim().toUpperCase())
                .filter(Boolean)
        )
    }, [editingProduct, editorMode, existingProducts])
    const currentVariantLabel = React.useMemo(
        () => resolveProductVariantLabel(form.productType, form.attributes),
        [form.attributes, form.productType]
    )
    const suggestedSku = React.useMemo(
        () => ensureUniqueSkuSuggestion(buildSuggestedSku({
            productType: form.productType,
            category: form.category,
            brand: String(form.brand || '').trim(),
            name: String(form.name || '').trim(),
            variantLabel: currentVariantLabel,
            color: String(form.attributes?.color || '').trim(),
            species: String(form.attributes?.species || '').trim(),
        }), reservedSkuSet),
        [currentVariantLabel, form.attributes?.color, form.attributes?.species, form.brand, form.category, form.name, form.productType, reservedSkuSet]
    )
    const suggestedLotCode = React.useMemo(
        () => buildSuggestedLotCode({
            issuedAt: String(form.purchaseInvoice?.issuedAt || '').trim(),
            supplierName: String(form.purchaseInvoice?.supplierName || form.attributes?.supplier || '').trim(),
            name: String(form.name || '').trim(),
            variantLabel: currentVariantLabel,
            seed: lotSuggestionSeedRef.current,
        }),
        [currentVariantLabel, form.attributes?.supplier, form.name, form.purchaseInvoice?.issuedAt, form.purchaseInvoice?.supplierName]
    )
    const referenceSectionTitleByKey = React.useMemo(
        () => PRODUCT_REFERENCE_SECTIONS.reduce<Record<ProductReferenceKey, string>>((acc, section) => {
            acc[section.key] = section.title
            return acc
        }, {} as Record<ProductReferenceKey, string>),
        []
    )

    const closeModal = React.useCallback(() => {
        if (saving || Object.values(imageUploading).some(Boolean)) return
        onClose()
    }, [imageUploading, onClose, saving])

    const persistReferenceData = React.useCallback(async (nextData: ProductReferenceData) => {
        const res = await updateProductReferenceData(nextData)
        onReferenceDataUpdated?.(res.body)
        return res.body
    }, [onReferenceDataUpdated])

    const createInlineReferenceValue = React.useCallback(async (
        key: ProductReferenceKey,
        rawValue: string,
        applyValue: (value: string) => void
    ) => {
        if (key === 'suppliers') return
        const normalizedValue = normalizeInlineReferenceValue(key, rawValue)
        if (!normalizedValue) {
            showNotification('Escribe un valor para crearlo.', 'error')
            return
        }

        setReferenceSavingKey(key)
        try {
            if (key === 'brands') {
                const existingBrand = referenceData.brands.find((brand) => normalizeReferenceIdentity(brand.name) === normalizeReferenceIdentity(normalizedValue))
                if (existingBrand) {
                    applyValue(existingBrand.name)
                    setReferenceDrafts((prev) => ({ ...prev, [key]: '' }))
                    showNotification('La marca ya existía y fue seleccionada.')
                    return
                }

                const nextData: ProductReferenceData = {
                    ...referenceData,
                    brands: [
                        ...referenceData.brands,
                        {
                            id: createProductBrandReferenceId(normalizedValue, String(referenceData.brands.length + 1)),
                            name: normalizedValue,
                            logoUrl: '',
                        },
                    ],
                }
                await persistReferenceData(nextData)
                applyValue(normalizedValue)
                setReferenceDrafts((prev) => ({ ...prev, [key]: '' }))
                showNotification(`Marca "${normalizedValue}" creada.`)
                return
            }

            const currentValues = Array.isArray(referenceData[key]) ? (referenceData[key] as string[]) : []
            const existingValue = currentValues.find((value) => normalizeReferenceIdentity(value) === normalizeReferenceIdentity(normalizedValue))
            if (existingValue) {
                applyValue(existingValue)
                setReferenceDrafts((prev) => ({ ...prev, [key]: '' }))
                showNotification('El valor ya existía y fue seleccionado.')
                return
            }

            const nextData: ProductReferenceData = {
                ...referenceData,
                [key]: [...currentValues, normalizedValue],
            }
            await persistReferenceData(nextData)
            applyValue(normalizedValue)
            setReferenceDrafts((prev) => ({ ...prev, [key]: '' }))
            showNotification(`"${normalizedValue}" creado en catálogos operativos.`)
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'No se pudo crear el valor operativo.'
            showNotification(message, 'error')
        } finally {
            setReferenceSavingKey(null)
        }
    }, [persistReferenceData, referenceData, showNotification])

    const createInlineSupplier = React.useCallback(async (applyValue: (value: string) => void) => {
        const supplierName = String(quickSupplierDraft.name || '').replace(/\s+/g, ' ').trim()
        const supplierDocument = String(quickSupplierDraft.document || '').replace(/\s+/g, ' ').trim()
        if (!supplierName) {
            showNotification('Escribe el nombre del proveedor.', 'error')
            return
        }
        if (!supplierDocument) {
            showNotification('El proveedor necesita RUC o documento.', 'error')
            return
        }

        setReferenceSavingKey('suppliers')
        try {
            const existingSupplier = referenceData.suppliers.find((supplier) =>
                normalizeReferenceIdentity(supplier.name) === normalizeReferenceIdentity(supplierName)
                || normalizeReferenceIdentity(supplier.document) === normalizeReferenceIdentity(supplierDocument)
            )
            if (existingSupplier) {
                applyValue(existingSupplier.name)
                setQuickSupplierDraft({ name: '', document: '' })
                showNotification('El proveedor ya existía y fue seleccionado.')
                return
            }

            const nextSupplier = {
                id: createProductSupplierReferenceId(supplierName, supplierDocument, String(referenceData.suppliers.length + 1)),
                name: supplierName,
                document: supplierDocument,
                purchaseTaxRate: String(form.purchaseInvoice?.purchaseTaxRate || systemVatRate.toFixed(2)),
                email: '',
                phone: '',
                contactName: '',
                address: '',
                notes: '',
            }
            const nextData: ProductReferenceData = {
                ...referenceData,
                suppliers: [...referenceData.suppliers, nextSupplier],
            }
            await persistReferenceData(nextData)
            applyValue(nextSupplier.name)
            setQuickSupplierDraft({ name: '', document: '' })
            showNotification(`Proveedor "${nextSupplier.name}" creado.`)
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'No se pudo crear el proveedor.'
            showNotification(message, 'error')
        } finally {
            setReferenceSavingKey(null)
        }
    }, [form.purchaseInvoice?.purchaseTaxRate, persistReferenceData, quickSupplierDraft.document, quickSupplierDraft.name, referenceData, showNotification, systemVatRate])

    const ensureProductCatalogLinks = React.useCallback(async (
        primaryCategory: string,
        attributes: Record<string, string>
    ) => {
        let nextData: ProductReferenceData = referenceData
        let changed = false
        const nextAttributes: Record<string, string> = { ...attributes }

        const addReferenceValue = (key: StringProductReferenceKey, rawValue?: string | null) => {
            const normalizedValue = key === 'categories'
                ? normalizeProductCategory(rawValue)
                : normalizeInlineReferenceValue(key, String(rawValue || ''))
            if (!normalizedValue) return ''

            const currentValues = Array.isArray(nextData[key]) ? (nextData[key] as string[]) : []
            const existingValue = currentValues.find((value) => normalizeReferenceIdentity(value) === normalizeReferenceIdentity(normalizedValue))
            if (existingValue) return existingValue

            nextData = {
                ...nextData,
                [key]: [...currentValues, normalizedValue].sort((left, right) => left.localeCompare(right, 'es-EC', { sensitivity: 'base' })),
            }
            changed = true
            return normalizedValue
        }

        const linkedCategory = addReferenceValue('categories', primaryCategory) || primaryCategory
        const linkedAdditionalCategories = parseSerializedProductCategories(nextAttributes.catalogCategories)
            .map((categoryValue) => addReferenceValue('categories', categoryValue))
            .filter(Boolean)
        const serializedAdditionalCategories = serializeSanitizedAdditionalCategories(linkedAdditionalCategories, linkedCategory)
        if (serializedAdditionalCategories) {
            nextAttributes.catalogCategories = serializedAdditionalCategories
        } else {
            delete nextAttributes.catalogCategories
        }

        Object.entries(ATTRIBUTE_REFERENCE_KEY_BY_FIELD).forEach(([field, key]) => {
            if (!key) return
            const linkedValue = addReferenceValue(key, nextAttributes[field])
            if (linkedValue) {
                nextAttributes[field] = linkedValue
            }
        })

        if (changed) {
            await persistReferenceData(nextData)
        }

        return {
            category: linkedCategory,
            attributes: nextAttributes,
            changed,
        }
    }, [persistReferenceData, referenceData])

    const renderCreateReferenceInline = React.useCallback((
        key: ProductReferenceKey,
        label: string,
        applyValue: (value: string) => void,
        placeholder?: string
    ) => {
        if (key === 'suppliers') {
            return (
                <div className="mt-3 rounded-xl border border-dashed border-line bg-white p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_auto] gap-2">
                        <input
                            type="text"
                            className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                            value={quickSupplierDraft.name}
                            onChange={(event) => setQuickSupplierDraft((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Nuevo proveedor"
                            disabled={saving || referenceSavingKey === 'suppliers'}
                        />
                        <input
                            type="text"
                            className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                            value={quickSupplierDraft.document}
                            onChange={(event) => setQuickSupplierDraft((prev) => ({ ...prev, document: event.target.value }))}
                            placeholder="RUC/documento"
                            disabled={saving || referenceSavingKey === 'suppliers'}
                        />
                        <button
                            type="button"
                            className="rounded-lg border border-black px-3 py-2 text-sm font-semibold hover:bg-black hover:text-white disabled:opacity-50"
                            onClick={() => createInlineSupplier(applyValue)}
                            disabled={saving || referenceSavingKey === 'suppliers'}
                        >
                            {referenceSavingKey === 'suppliers' ? 'Creando...' : 'Crear'}
                        </button>
                    </div>
                </div>
            )
        }

        const draftValue = String(referenceDrafts[key] || '')
        return (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                    type="text"
                    className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                    value={draftValue}
                    onChange={(event) => setReferenceDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={placeholder || `Crear ${label}`}
                    disabled={saving || referenceSavingKey === key}
                />
                <button
                    type="button"
                    className="rounded-lg border border-black px-3 py-2 text-sm font-semibold hover:bg-black hover:text-white disabled:opacity-50"
                    onClick={() => createInlineReferenceValue(key, draftValue, applyValue)}
                    disabled={saving || referenceSavingKey === key}
                >
                    {referenceSavingKey === key ? 'Creando...' : 'Crear'}
                </button>
            </div>
        )
    }, [createInlineReferenceValue, createInlineSupplier, quickSupplierDraft.document, quickSupplierDraft.name, referenceDrafts, referenceSavingKey, saving])

    const renderCreatableReferenceSelect = React.useCallback(({
        key,
        value,
        options,
        onChange,
        placeholder,
        createLabel,
        className,
        disabled,
        hideCreateAction,
        forceCreateInline,
        createPlaceholder,
    }: {
        key: ProductReferenceKey;
        value: string;
        options: string[];
        onChange: (value: string) => void;
        placeholder: string;
        createLabel: string;
        className?: string;
        disabled?: boolean;
        hideCreateAction?: boolean;
        forceCreateInline?: boolean;
        createPlaceholder?: string;
    }) => {
        const createDraftIsOpen = !hideCreateAction && (forceCreateInline || options.length === 0 || Object.prototype.hasOwnProperty.call(referenceDrafts, key))

        return (
            <div>
                <select
                    className={className || 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled || saving || referenceSavingKey === key}
                >
                    <option value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={`${key}-option-${option}`} value={option}>{option}</option>
                    ))}
                </select>
                {!hideCreateAction && (
                    createDraftIsOpen ? (
                        renderCreateReferenceInline(key, createLabel, onChange, createPlaceholder)
                    ) : (
                        <button
                            type="button"
                            className="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                            onClick={() => setReferenceDrafts((prev) => ({ ...prev, [key]: '' }))}
                            disabled={disabled || saving || referenceSavingKey === key}
                        >
                            + Crear {createLabel}
                        </button>
                    )
                )}
            </div>
        )
    }, [referenceDrafts, referenceSavingKey, renderCreateReferenceInline, saving])

    const renderReferenceCatalogHints = React.useCallback((
        items: Array<{ key: ProductReferenceKey; options: Array<unknown> }>,
        emptyText?: string
    ) => {
        const uniqueItems = items.filter((item, index, array) => array.findIndex((candidate) => candidate.key === item.key) === index)
        if (uniqueItems.length === 0) return null

        const hasMissingOptions = uniqueItems.some((item) => item.options.length === 0)

        return (
            <p className="mt-2 text-xs text-secondary">
                {hasMissingOptions
                    ? (emptyText || 'Puedes crear aquí los valores que falten antes de guardar.')
                    : `Valores disponibles: ${uniqueItems.map((item) => referenceSectionTitleByKey[item.key] || item.key).join(', ')}.`}
            </p>
        )
    }, [referenceSectionTitleByKey])

    React.useEffect(() => {
        if (!open) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !saving) {
                closeModal()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [closeModal, open, saving])

    React.useEffect(() => {
        if (!isDuplicateVariantMode || !open) return
        const nextName = [duplicateVariantBaseName, duplicateVariantLabel].filter(Boolean).join(' ').trim()

        setForm((prev) => {
            const previousAttributes = prev.attributes || {}
            const nextAttributes = {
                ...previousAttributes,
                variantBaseName: duplicateVariantBaseName,
                variantLabel: duplicateVariantLabel,
            }
            const sameName = String(prev.name || '').trim() === nextName
            const sameBase = String(previousAttributes.variantBaseName || '').trim() === duplicateVariantBaseName
            const sameLabel = String(previousAttributes.variantLabel || '').trim() === duplicateVariantLabel

            if (sameName && sameBase && sameLabel) {
                return prev
            }

            return {
                ...prev,
                name: nextName,
                attributes: nextAttributes,
            }
        })
    }, [duplicateVariantBaseName, duplicateVariantLabel, isDuplicateVariantMode, open])

    const clearErrors = React.useCallback((...fields: string[]) => {
        setFormErrors((prev) => {
            if (fields.length === 0) return {}
            const next = { ...prev }
            fields.forEach((field) => delete next[field])
            return next
        })
    }, [])

    const setAttribute = React.useCallback((key: string, value: string) => {
        const trimmedValue = value.trim()
        if (key === 'sku') {
            skuManuallyEditedRef.current = trimmedValue !== '' && trimmedValue !== suggestedSku
        }
        if (key === 'lotCode') {
            lotManuallyEditedRef.current = trimmedValue !== '' && trimmedValue !== suggestedLotCode
        }
        setForm((prev) => ({
            ...prev,
            attributes: {
                ...(prev.attributes || {}),
                [key]: value
            }
        }))
        if (['sku', 'tag', 'species', 'expirationDate', 'expirationAlertDays'].includes(key)) {
            clearErrors(key)
        }
    }, [clearErrors, suggestedLotCode, suggestedSku])

    const setSpeciesAttribute = React.useCallback((value: string) => {
        setAttribute('species', normalizeProductSpecies(value))
    }, [setAttribute])

    React.useEffect(() => {
        if (!open) return
        let autoFilledSku = false

        setForm((prev) => {
            const previousAttributes = prev.attributes || {}
            const nextAttributes = { ...previousAttributes }
            let changed = false

            const currentSku = String(previousAttributes.sku || '').trim()
            if (suggestedSku && !skuManuallyEditedRef.current) {
                if (currentSku !== suggestedSku) {
                    nextAttributes.sku = suggestedSku
                    changed = true
                    autoFilledSku = true
                }
            }

            const currentLotCode = String(previousAttributes.lotCode || '').trim()
            if (suggestedLotCode && !lotManuallyEditedRef.current) {
                if (currentLotCode !== suggestedLotCode) {
                    nextAttributes.lotCode = suggestedLotCode
                    changed = true
                }
            }

            if (!changed) return prev

            return {
                ...prev,
                attributes: nextAttributes,
            }
        })

        if (autoFilledSku) {
            clearErrors('sku')
        }
    }, [clearErrors, open, suggestedLotCode, suggestedSku])

    const setPurchaseInvoiceSupplier = React.useCallback((value: string) => {
        const matchedSupplier = findSupplierReference(referenceData.suppliers, value)
        const supplierName = matchedSupplier?.name || value
        setForm((prev) => ({
            ...prev,
            purchaseInvoice: {
                ...prev.purchaseInvoice,
                supplierName,
                supplierDocument: matchedSupplier?.document || '',
                purchaseTaxRate: matchedSupplier?.purchaseTaxRate || prev.purchaseInvoice.purchaseTaxRate,
            },
            attributes: {
                ...(prev.attributes || {}),
                supplier: supplierName || String(prev.attributes?.supplier || '').trim(),
            },
        }))
        setCostWithVatManuallySet(false)
        clearErrors('purchaseInvoiceSupplierName', 'purchaseInvoiceSupplierDocument')
    }, [clearErrors, referenceData.suppliers])

    const handleProductTypeChange = React.useCallback((value: string) => {
        setForm((prev) => {
            const normalizedType = normalizeProductType(value, prev.category)
            const nextAttributes = getAttributesForTypeChange(normalizedType, prev.attributes)
            const preservedAdditionalCategories = sanitizeAdditionalCategoryValues(
                parseSerializedProductCategories(prev.attributes?.catalogCategories),
                prev.category
            )

            nextAttributes.catalogCategories = serializeProductCategories(preservedAdditionalCategories)

            if (normalizedType !== 'ropa') {
                delete nextAttributes.sizeGuideRows
                delete nextAttributes.sizeGuideNotes
            }

            return {
                ...prev,
                productType: normalizedType,
                category: prev.category,
                attributes: nextAttributes
            }
        })
        clearErrors('productType', 'sku', 'tag', 'species', 'expirationDate', 'expirationAlertDays')
    }, [clearErrors])

    const handlePrimaryCategoryChange = React.useCallback((value: string) => {
        setForm((prev) => {
            const previousCategory = prev.category
            const nextCategory = normalizeProductCategory(value)
            const nextAdditionalCategories = sanitizeAdditionalCategoryValues(
                parseSerializedProductCategories(prev.attributes?.catalogCategories),
                nextCategory,
                previousCategory
            )

            return {
                ...prev,
                category: nextCategory,
                attributes: {
                    ...(prev.attributes || {}),
                    catalogCategories: serializeProductCategories(nextAdditionalCategories),
                },
            }
        })
        clearErrors('category')
    }, [clearErrors])

    const setPreferredSupplier = React.useCallback((value: string) => {
        const matchedSupplier = findSupplierReference(referenceData.suppliers, value)
        const supplierName = matchedSupplier?.name || value
        setForm((prev) => ({
            ...prev,
            attributes: {
                ...(prev.attributes || {}),
                supplier: supplierName,
            },
            purchaseInvoice: !prev.purchaseInvoice?.supplierName && supplierName
                ? {
                    ...prev.purchaseInvoice,
                    supplierName,
                    supplierDocument: matchedSupplier?.document || '',
                    purchaseTaxRate: matchedSupplier?.purchaseTaxRate || prev.purchaseInvoice.purchaseTaxRate,
                }
                : prev.purchaseInvoice,
        }))
        setCostWithVatManuallySet(false)
    }, [referenceData.suppliers])

    React.useEffect(() => {
        const supplierName = String(form.purchaseInvoice?.supplierName || '').trim()
        if (!supplierName) return
        const matchedSupplier = findSupplierReference(referenceData.suppliers, supplierName)
        if (!matchedSupplier) return

        if (
            matchedSupplier.name === supplierName &&
            String(form.purchaseInvoice?.supplierDocument || '').trim() === matchedSupplier.document
        ) {
            return
        }

        setForm((prev) => ({
            ...prev,
            purchaseInvoice: {
                ...prev.purchaseInvoice,
                supplierName: matchedSupplier.name,
                supplierDocument: matchedSupplier.document,
                purchaseTaxRate: String(prev.purchaseInvoice?.purchaseTaxRate || '').trim() || matchedSupplier.purchaseTaxRate || prev.purchaseInvoice.purchaseTaxRate,
            },
        }))
    }, [form.purchaseInvoice?.supplierDocument, form.purchaseInvoice?.supplierName, referenceData.suppliers])

    const toggleAdditionalCategory = React.useCallback((value: string) => {
        const normalizedValue = normalizeProductCategory(value)
        if (!normalizedValue || getCategoryIdentity(normalizedValue) === getCategoryIdentity(form.category)) return

        const currentValues = sanitizeAdditionalCategoryValues(
            parseSerializedProductCategories(form.attributes?.catalogCategories),
            form.category
        )
        const normalizedValueIdentity = getCategoryIdentity(normalizedValue)
        const hasCurrentValue = currentValues.some((item) => getCategoryIdentity(item) === normalizedValueIdentity)
        const nextValues = hasCurrentValue
            ? currentValues.filter((item) => getCategoryIdentity(item) !== normalizedValueIdentity)
            : [...currentValues, normalizedValue]

        setAttribute('catalogCategories', serializeProductCategories(nextValues))
    }, [form.attributes?.catalogCategories, form.category, setAttribute])

    const persistSizeGuideRows = React.useCallback((rows: ProductSizeGuideRow[]) => {
        const serializedRows = serializeProductSizeGuideRows(rows)
        setAttribute('sizeGuideRows', serializedRows === '[]' ? '' : serializedRows)
    }, [setAttribute])

    const addSizeGuideRow = React.useCallback(() => {
        persistSizeGuideRows([...sizeGuideRows, createEmptyProductSizeGuideRow()])
    }, [persistSizeGuideRows, sizeGuideRows])

    const updateSizeGuideRow = React.useCallback((index: number, key: keyof ProductSizeGuideRow, value: string) => {
        const nextRows = sizeGuideRows.slice()
        nextRows[index] = {
            ...(nextRows[index] || createEmptyProductSizeGuideRow()),
            [key]: value
        }
        persistSizeGuideRows(nextRows)
    }, [persistSizeGuideRows, sizeGuideRows])

    const removeSizeGuideRow = React.useCallback((index: number) => {
        const nextRows = sizeGuideRows.slice()
        nextRows.splice(index, 1)
        persistSizeGuideRows(nextRows)
    }, [persistSizeGuideRows, sizeGuideRows])

    const getInputClass = React.useCallback((field: string, baseClass: string) => {
        const borderClass = formErrors[field] ? 'border-red focus:border-red' : 'border-line focus:border-black'
        return `${baseClass} ${borderClass}`
    }, [formErrors])

    const addImageEntry = React.useCallback((kind: 'thumb' | 'gallery') => {
        const key = kind === 'thumb' ? 'thumbImages' : 'galleryImages'
        setForm((prev: any) => ({
            ...prev,
            [key]: [...(prev[key] || []), createImageEntry()]
        }))
    }, [])

    const setImageEntry = React.useCallback((kind: 'thumb' | 'gallery', index: number, entry: { url: string; width: string; height: string; altText?: string }) => {
        const key = kind === 'thumb' ? 'thumbImages' : 'galleryImages'
        setForm((prev: any) => {
            const next = [...(prev[key] || [])]
            next[index] = entry
            return { ...prev, [key]: next }
        })
    }, [])

    const removeImageEntry = React.useCallback((kind: 'thumb' | 'gallery', index: number) => {
        const key = kind === 'thumb' ? 'thumbImages' : 'galleryImages'
        setForm((prev: any) => {
            const next = [...(prev[key] || [])]
            next.splice(index, 1)
            if (next.length === 0) next.push(createImageEntry())
            return { ...prev, [key]: next }
        })
    }, [])

    const moveImageEntry = React.useCallback((kind: 'thumb' | 'gallery', index: number, direction: -1 | 1) => {
        const key = kind === 'thumb' ? 'thumbImages' : 'galleryImages'
        setForm((prev: any) => {
            const next = [...(prev[key] || [])]
            const targetIndex = index + direction
            if (index < 0 || targetIndex < 0 || index >= next.length || targetIndex >= next.length) {
                return prev
            }

            const current = next[index]
            next[index] = next[targetIndex]
            next[targetIndex] = current
            return { ...prev, [key]: next }
        })
    }, [])

    const setImageAltText = React.useCallback((kind: 'thumb' | 'gallery', index: number, altText: string) => {
        const key = kind === 'thumb' ? 'thumbImages' : 'galleryImages'
        setForm((prev: any) => {
            const next = [...(prev[key] || [])]
            next[index] = {
                ...(next[index] || createImageEntry()),
                altText,
            }
            return { ...prev, [key]: next }
        })
    }, [])

    const processImageUpload = React.useCallback(async (file: File, kind: 'thumb' | 'gallery') => {
        if (!PRODUCT_IMAGE_ACCEPTED_TYPES.has(file.type)) {
            throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.')
        }
        if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
            throw new Error('La imagen excede 8MB. Reduce el tamaño e intenta nuevamente.')
        }

        const { width, height } = await getImageDimensions(file)
        const required = requiredImageSizes[kind]
        let fileToUpload = file
        if (width !== required.width || height !== required.height) {
            showNotification(`Ajustamos la imagen automáticamente a ${required.width}x${required.height}px.`)
            fileToUpload = await resizeImage(file, required.width, required.height)
        }

        const uploaded = await withTransientRetry(() => uploadImage(fileToUpload, kind, resolveUploadImageMetadata(form)))
        return {
            url: uploaded.url,
            width: String((uploaded as any).width || required.width),
            height: String((uploaded as any).height || required.height),
            altText: String((uploaded as any).altText || form.attributes?.seoImageAlt || buildSuggestedSeoAlt(form))
        }
    }, [form, showNotification])

    const appendImageEntries = React.useCallback((kind: 'thumb' | 'gallery', entries: Array<{ url: string; width: string; height: string; altText?: string }>) => {
        if (entries.length === 0) return
        const key = kind === 'thumb' ? 'thumbImages' : 'galleryImages'
        setForm((prev: any) => {
            const current = [...(prev[key] || [])]
            const next = [...current]
            let entryCursor = 0

            for (let idx = 0; idx < next.length && entryCursor < entries.length; idx += 1) {
                if (!next[idx]?.url) {
                    next[idx] = entries[entryCursor]
                    entryCursor += 1
                }
            }

            while (entryCursor < entries.length) {
                next.push(entries[entryCursor])
                entryCursor += 1
            }

            return { ...prev, [key]: next }
        })
    }, [])

    const handleImageFileChange = React.useCallback(async (kind: 'thumb' | 'gallery', index: number, file?: File | null) => {
        if (!file) return
        const key = `${kind}-${index}`
        setImageUploading((prev) => ({ ...prev, [key]: true }))
        try {
            const uploadedEntry = await processImageUpload(file, kind)
            setImageEntry(kind, index, uploadedEntry)
            clearErrors(kind === 'thumb' ? 'thumbImages' : 'galleryImages')
            showNotification('Imagen subida correctamente.')
        } catch (error) {
            const message = String((error as any)?.message || '').trim()
            showNotification(message || 'No se pudo subir la imagen.', 'error')
        } finally {
            setImageUploading((prev) => ({ ...prev, [key]: false }))
        }
    }, [clearErrors, processImageUpload, setImageEntry, showNotification])

    const handleGalleryFilesChange = React.useCallback(async (files?: FileList | null) => {
        const selectedFiles = Array.from(files || [])
        if (selectedFiles.length === 0) return

        const batchKey = 'gallery-batch'
        setImageUploading((prev) => ({ ...prev, [batchKey]: true }))

        const uploadedEntries: Array<{ url: string; width: string; height: string; altText?: string }> = []
        const failures: string[] = []

        for (const file of selectedFiles) {
            try {
                const uploadedEntry = await processImageUpload(file, 'gallery')
                uploadedEntries.push(uploadedEntry)
            } catch (error) {
                const message = String((error as any)?.message || '').trim() || 'No se pudo subir la imagen.'
                failures.push(`${file.name}: ${message}`)
            }
        }

        try {
            if (uploadedEntries.length > 0) {
                appendImageEntries('gallery', uploadedEntries)
                clearErrors('galleryImages')
                showNotification(
                    uploadedEntries.length === 1
                        ? 'Imagen grande subida correctamente.'
                        : `${uploadedEntries.length} imágenes grandes subidas correctamente.`
                )
            }
            if (failures.length > 0) {
                const extraFailures = failures.length > 1 ? ` (+${failures.length - 1} más)` : ''
                showNotification(`${failures[0]}${extraFailures}`, 'error')
            }
        } finally {
            setImageUploading((prev) => ({ ...prev, [batchKey]: false }))
            if (galleryMultiInputRef.current) {
                galleryMultiInputRef.current.value = ''
            }
        }
    }, [appendImageEntries, clearErrors, processImageUpload, showNotification])

    const handleBasePriceChange = React.useCallback((value: string) => {
        const nextValue = normalizeDecimalForStorage(value, BASE_PRICE_FRACTION_DIGITS)
        if (!nextValue) {
            setMarkupManuallySet(false)
            setForm((prev) => ({
                ...prev,
                price: '',
                pvp: '',
            }))
            return
        }
        const baseValue = parseLocalizedDecimal(nextValue)
        const pvpValue = effectiveVatMultiplier > 0 ? (baseValue * effectiveVatMultiplier) : baseValue
        setMarkupManuallySet(false)
        setForm((prev) => ({
            ...prev,
            price: nextValue,
            pvp: Number.isFinite(pvpValue) ? pvpValue.toFixed(2) : ''
        }))
    }, [effectiveVatMultiplier])

    const handlePvpPriceChange = React.useCallback((value: string) => {
        const nextValue = normalizeDecimalForStorage(value)
        if (!nextValue) {
            setMarkupManuallySet(false)
            setForm((prev) => ({
                ...prev,
                pvp: '',
                price: '',
            }))
            return
        }
        const pvpValue = parseLocalizedDecimal(nextValue)
        const baseValue = effectiveVatMultiplier > 0 ? (pvpValue / effectiveVatMultiplier) : pvpValue
        setMarkupManuallySet(false)
        setForm((prev) => ({
            ...prev,
            pvp: nextValue,
            price: Number.isFinite(baseValue) ? baseValue.toFixed(BASE_PRICE_FRACTION_DIGITS) : ''
        }))
    }, [effectiveVatMultiplier])

    const handleMarketPriceChange = React.useCallback((value: string) => {
        const nextValue = normalizeDecimalForStorage(value)
        setForm((prev) => ({
            ...prev,
            marketPrice: nextValue,
        }))
    }, [])

    const handleCostChange = React.useCallback((value: string) => {
        const nextValue = normalizeDecimalForStorage(value)
        setMarkupManuallySet(false)
        setCostWithVatManuallySet(false)
        if (!nextValue) {
            setCostWithVatInput('')
            setForm((prev) => ({ ...prev, cost: '' }))
            clearErrors('cost')
            return
        }
        setForm((prev) => ({ ...prev, cost: nextValue }))
        clearErrors('cost')
    }, [clearErrors])

    const handleCostWithVatChange = React.useCallback((value: string) => {
        const nextValue = normalizeDecimalForStorage(value)
        setCostWithVatInput(nextValue)
        setCostWithVatManuallySet(true)
        if (!nextValue) {
            setMarkupManuallySet(false)
            setForm((prev) => ({ ...prev, cost: '' }))
            clearErrors('cost')
            return
        }
        const grossCost = parseLocalizedDecimal(nextValue)
        const baseCost = purchaseVatMultiplier > 0 ? (grossCost / purchaseVatMultiplier) : grossCost
        setMarkupManuallySet(false)
        setForm((prev) => ({
            ...prev,
            cost: Number.isFinite(baseCost) ? roundCurrency(baseCost).toFixed(2) : ''
        }))
        clearErrors('cost')
    }, [clearErrors, purchaseVatMultiplier])

    const handleMarkupChange = React.useCallback((value: string) => {
        const nextValue = normalizeDecimalForStorage(value)
        setMarkupInput(nextValue)
        setMarkupManuallySet(true)
        if (!nextValue) return
        const markupValue = parseLocalizedDecimal(nextValue)
        const currentCost = parseLocalizedDecimal(form.cost)
        const normalizedMarkup = Number.isFinite(markupValue) ? Math.max(0, markupValue) : 0

        if (!Number.isFinite(currentCost) || currentCost < 0) {
            setForm((prev) => ({
                ...prev,
                price: '',
                pvp: '',
            }))
            return
        }

        const baseValue = currentCost * (1 + (normalizedMarkup / 100))
        const pvpValue = effectiveVatMultiplier > 0 ? (baseValue * effectiveVatMultiplier) : baseValue
        setForm((prev) => ({
            ...prev,
            price: Number.isFinite(baseValue) ? baseValue.toFixed(BASE_PRICE_FRACTION_DIGITS) : '',
            pvp: Number.isFinite(pvpValue) ? pvpValue.toFixed(2) : '',
        }))
    }, [effectiveVatMultiplier, form.cost])

    const handleMoneyFieldBlur = React.useCallback((field: 'price' | 'pvp' | 'marketPrice' | 'cost' | 'costWithVat') => {
        setActiveMoneyField((current) => (current === field ? null : current))

        if (field === 'costWithVat') {
            const finalizedGrossCost = finalizeDecimalForStorage(costWithVatInput)
            setCostWithVatInput(finalizedGrossCost)
            if (!finalizedGrossCost) return

            const grossCost = parseLocalizedDecimal(finalizedGrossCost)
            const baseCost = purchaseVatMultiplier > 0 ? (grossCost / purchaseVatMultiplier) : grossCost
            setForm((prev) => ({
                ...prev,
                cost: Number.isFinite(baseCost) ? roundCurrency(baseCost).toFixed(2) : '',
            }))
            return
        }

        setForm((prev) => {
            const currentValue = prev[field]
            const fractionDigits = field === 'price' ? BASE_PRICE_FRACTION_DIGITS : 2
            const finalizedValue = finalizeDecimalForStorage(currentValue, fractionDigits)
            if (currentValue === finalizedValue) {
                return prev
            }

            return {
                ...prev,
                [field]: finalizedValue,
            }
        })
    }, [costWithVatInput, purchaseVatMultiplier])

    const handleTaxExemptChange = React.useCallback((value: string) => {
        const nextTaxExempt = value === 'exempt'
        setForm((prev) => {
            const previousMultiplier = getEffectiveVatMultiplier(Boolean(prev.taxExempt), vatMultiplier)
            const nextMultiplier = getEffectiveVatMultiplier(nextTaxExempt, vatMultiplier)
            const currentPvp = Number(prev.pvp || 0)
            const currentBase = Number(prev.price || 0)
            const resolvedBase = Number.isFinite(currentBase) && currentBase >= 0
                ? currentBase
                : (previousMultiplier > 0 ? (currentPvp / previousMultiplier) : currentPvp)
            const nextPvp = nextMultiplier > 0 ? (resolvedBase * nextMultiplier) : resolvedBase

            return {
                ...prev,
                taxExempt: nextTaxExempt,
                price: Number.isFinite(resolvedBase) ? resolvedBase.toFixed(BASE_PRICE_FRACTION_DIGITS) : '',
                pvp: Number.isFinite(nextPvp) ? nextPvp.toFixed(2) : '',
            }
        })
    }, [vatMultiplier])

    const productBasePrice = parseLocalizedDecimal(deferredForm.price)
    const productCost = parseLocalizedDecimal(deferredForm.cost)
    const hasBasePriceInput = String(deferredForm.price || '').trim() !== ''
    const hasCostInput = String(deferredForm.cost || '').trim() !== ''
    const productCostWithVat = roundCurrency(productCost * purchaseVatMultiplier)
    const productPvpPrice = parseLocalizedDecimal(deferredForm.pvp) || (productBasePrice * effectiveVatMultiplier)
    const productMarketPrice = parseLocalizedDecimal(deferredForm.marketPrice)
    const hasMarketPriceInput = String(deferredForm.marketPrice || '').trim() !== ''
    const productOfferAmount = hasMarketPriceInput && productMarketPrice > productPvpPrice
        ? roundCurrency(productMarketPrice - productPvpPrice)
        : 0
    const productOfferPercent = hasMarketPriceInput && productMarketPrice > productPvpPrice && productMarketPrice > 0
        ? Math.floor(100 - ((productPvpPrice / productMarketPrice) * 100))
        : 0
    const productPvpPriceLabel = productPvpPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productMarketPriceLabel = productMarketPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productOfferAmountLabel = productOfferAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productWouldSellAtLoss = Number.isFinite(productCost)
        && productCost > 0
        && Number.isFinite(productBasePrice)
        && productBasePrice < productCost
    const productGrossProfit = productBasePrice - productCost
    const productGrossMargin = productBasePrice > 0 ? (productGrossProfit / productBasePrice) * 100 : 0
    const productMarkup = productCost > 0 ? (productGrossProfit / productCost) * 100 : 0
    const productVatAmount = Math.max(productPvpPrice - productBasePrice, 0)
    const productProfitLabel = productGrossProfit.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productGrossMarginLabel = productGrossMargin.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productMarkupLabel = productMarkup.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productVatAmountLabel = productVatAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const productMarkupInputValue = hasBasePriceInput && hasCostInput && productCost > 0 && Number.isFinite(productMarkup)
        ? String(Number(productMarkup.toFixed(2)))
        : ''
    const productCostWithVatInputValue = hasCostInput && Number.isFinite(productCostWithVat) ? productCostWithVat.toFixed(2) : ''

    React.useEffect(() => {
        if (!costWithVatManuallySet) {
            setCostWithVatInput(productCostWithVatInputValue)
        }
    }, [costWithVatManuallySet, productCostWithVatInputValue])

    const displayedBasePrice = activeMoneyField === 'price' ? form.price : formatDecimalForDisplay(form.price)
    const displayedPvpPrice = activeMoneyField === 'pvp' ? form.pvp : formatDecimalForDisplay(form.pvp)
    const displayedMarketPrice = activeMoneyField === 'marketPrice' ? form.marketPrice : formatDecimalForDisplay(form.marketPrice)
    const displayedCost = activeMoneyField === 'cost' ? form.cost : formatDecimalForDisplay(form.cost)
    const displayedCostWithVat = activeMoneyField === 'costWithVat' ? costWithVatInput : formatDecimalForDisplay(costWithVatInput)

    React.useEffect(() => {
        if (!markupManuallySet) {
            setMarkupInput(productMarkupInputValue)
        }
    }, [markupManuallySet, productMarkupInputValue])

    const persistedProductPvpPrice = Number(deferredEditingProduct?.price ?? 0)
    const persistedProductBasePrice = persistedVatMultiplier > 0 ? (persistedProductPvpPrice / persistedVatMultiplier) : persistedProductPvpPrice
    const persistedProductCost = Number(deferredEditingProduct?.business?.cost ?? deferredEditingProduct?.cost ?? 0)
    const persistedProductQuantity = Number(deferredEditingProduct?.quantity ?? 0)
    const restockUnits = isRestockMode ? Math.max(0, Math.trunc(Number(restockUnitsInput || 0))) : 0
    const requestedProductQuantity = isRestockMode && deferredEditingProduct
        ? persistedProductQuantity + restockUnits
        : Number(deferredForm.quantity || 0)
    const stockEntryDelta = deferredEditingProduct
        ? Math.max(0, requestedProductQuantity - persistedProductQuantity)
        : Math.max(0, requestedProductQuantity)
    const inventoryAdjustmentDelta = deferredEditingProduct && !isRestockMode && !isDuplicateVariantMode
        ? requestedProductQuantity - persistedProductQuantity
        : 0
    const requiresInventoryAdjustmentReason = inventoryAdjustmentDelta !== 0
    const requiresPurchaseInvoice = stockEntryDelta > 0 && (!deferredEditingProduct || isRestockMode)
    const purchaseInvoiceTitle = deferredEditingProduct
        ? `Factura para ingreso de ${stockEntryDelta} unidad${stockEntryDelta === 1 ? '' : 'es'}`
        : `Factura para stock inicial de ${stockEntryDelta} unidad${stockEntryDelta === 1 ? '' : 'es'}`
    const purchaseInvoicePanelTitle = requiresPurchaseInvoice
        ? purchaseInvoiceTitle
        : requiresInventoryAdjustmentReason
            ? 'Ajuste de inventario sin factura'
            : 'Sin ingreso de stock nuevo'
    const purchaseInvoicePanelSupport = requiresPurchaseInvoice
        ? 'Obligatoria para registrar una compra o stock inicial.'
        : requiresInventoryAdjustmentReason
            ? 'Se registra como corrección manual, no como compra.'
            : 'Solo se exige para compras o stock inicial.'
    const hasProductCostPreview = hasCostInput && Number.isFinite(productCost) && productCost > 0
    const suggestedBasePricePreview = hasProductCostPreview
        ? getSuggestedBasePriceForCostPreview(productCost, effectiveVatMultiplier, normalizedMargins, normalizedCalc)
        : 0
    const suggestedPvpPricePreview = suggestedBasePricePreview * effectiveVatMultiplier
    const costChangedForAutoPricing = Boolean(deferredEditingProduct)
        && Number.isFinite(productCost)
        && Math.abs(productCost - persistedProductCost) > 0.00001
    const automaticAppliedBasePrice = costChangedForAutoPricing
        ? Math.max(suggestedBasePricePreview, persistedProductBasePrice, Number.isFinite(productBasePrice) ? productBasePrice : 0)
        : (Number.isFinite(productBasePrice) ? productBasePrice : 0)
    const automaticAppliedPvpPrice = automaticAppliedBasePrice * effectiveVatMultiplier
    const automaticPriceWillIncrease = costChangedForAutoPricing
        && automaticAppliedBasePrice > (Number.isFinite(productBasePrice) ? productBasePrice : 0) + 0.00001
    const suggestedBasePriceLabel = suggestedBasePricePreview.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const suggestedPvpPriceLabel = suggestedPvpPricePreview.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const automaticAppliedBasePriceLabel = automaticAppliedBasePrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const automaticAppliedPvpPriceLabel = automaticAppliedPvpPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const isUploadingProductImages = Object.values(imageUploading).some(Boolean)
    const productFormErrorEntries = Object.entries(formErrors)
    const duplicateVariantFieldError = formErrors[duplicateVariantFieldKey]
    const duplicateVariantBaseError = formErrors.variantBaseName
    const publicationEligible = isProductEligibleForPublication({
        price: form.price,
        quantity: String(requestedProductQuantity),
    })
    const modalTitle = isDuplicateVariantMode
        ? 'Duplicar Variante'
        : isRestockMode
            ? 'Registrar Compra'
            : (editingProduct ? 'Editar Producto' : 'Nuevo Producto')
    const modalSubtitle = isDuplicateVariantMode
        ? 'Crea una nueva variante sin romper la familia visible del producto en tienda.'
        : isRestockMode
            ? 'Registra una compra asociada al producto y aumenta el stock con respaldo de factura.'
            : (editingProduct
                ? 'Actualiza catálogo, precio e información pública; si cambias stock se registra como ajuste.'
                : 'Carga el producto con clasificación, precio, stock, medios e información operativa.')
    const modeChipLabel = isDuplicateVariantMode ? 'Variante' : (isRestockMode ? 'Compra' : (editingProduct ? 'Edición' : 'Alta'))
    const modeChipClass = isDuplicateVariantMode
        ? 'bg-blue-100 text-blue-800'
        : isRestockMode
            ? 'bg-emerald-100 text-emerald-800'
            : editingProduct
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-800'
    const productTypeLabel = PRODUCT_TYPE_OPTIONS.find((option) => option.value === form.productType)?.label || 'Sin definir'
    const summaryThumbCount = (form.thumbImages || []).filter((img: any) => img.url && img.url.trim()).length
    const summaryGalleryCount = (form.galleryImages || []).filter((img: any) => img.url && img.url.trim()).length
    const suggestedSeoTitle = buildSuggestedSeoTitle(form)
    const suggestedSeoDescription = buildSuggestedSeoDescription(form)
    const suggestedSeoAlt = buildSuggestedSeoAlt(form)
    const suggestedSearchTerms = buildSuggestedSearchTerms(form)
    const seoSlugPreview = seoSlugify([
        form.name,
        form.attributes?.variantLabel || form.attributes?.range || form.attributes?.weight || form.attributes?.presentation || form.attributes?.dosage || form.attributes?.size,
        form.attributes?.sku,
    ].map(cleanSeoPart).filter(Boolean).join(' ')) || 'producto'
    const seoCanonicalPreview = `https://paramascotasec.com/productos/${seoSlugPreview}`
    const seoTitleValue = cleanSeoPart(form.attributes?.seoTitle) || suggestedSeoTitle
    const seoDescriptionValue = cleanSeoPart(form.attributes?.seoDescription) || suggestedSeoDescription
    const seoAltValue = cleanSeoPart(form.attributes?.seoImageAlt) || suggestedSeoAlt
    const seoSearchTermsValue = cleanSeoPart(form.attributes?.seoSearchTerms) || suggestedSearchTerms
    const seoChecks = [
        { label: 'Marca', complete: cleanSeoPart(form.brand).length > 0 },
        { label: 'SKU', complete: cleanSeoPart(form.attributes?.sku).length > 0 },
        { label: 'Especie', complete: cleanSeoPart(form.attributes?.species).length > 0 },
        { label: 'Categoría', complete: cleanSeoPart(form.category).length > 0 },
        { label: 'Descripción útil', complete: cleanSeoPart(form.description).length >= 50 },
        { label: 'Miniatura', complete: summaryThumbCount > 0 },
        { label: 'Imagen de ficha', complete: summaryGalleryCount > 0 },
        { label: 'Precio válido', complete: Number(form.price || 0) > 0 },
        { label: 'Título SEO', complete: isSeoTextLengthValid(seoTitleValue, 20, 70) },
        { label: 'Meta descripción', complete: isSeoTextLengthValid(seoDescriptionValue, 70, 160) },
        { label: 'Alt base', complete: seoAltValue.length >= 20 },
    ]
    const seoScore = Math.round((seoChecks.filter((item) => item.complete).length / seoChecks.length) * 100)
    const summaryStockLabel = `${requestedProductQuantity.toLocaleString('es-EC')} uds`
    const summaryTaxLabel = form.taxExempt
        ? 'Exento de IVA'
        : `Grava IVA (${((effectiveVatMultiplier - 1) * 100).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`
    const summaryPurchaseTaxLabel = `Compra ${purchaseTaxRateValue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    const summaryPublicationLabel = form.published && publicationEligible ? 'Publicado' : (publicationEligible ? 'Oculto' : 'Bloqueado')
    const summaryPublicationClass = form.published && publicationEligible
        ? 'text-emerald-700'
        : publicationEligible
            ? 'text-slate-700'
            : 'text-amber-700'
    const hasPositivePrice = Number.isFinite(productBasePrice) && productBasePrice > 0
    const hasPositiveCost = Number.isFinite(productCost) && productCost > 0
    const hasPositiveStock = Number.isFinite(requestedProductQuantity) && requestedProductQuantity > 0
    const hasSku = String(form.attributes?.sku || '').trim().length > 0
    const hasDescription = String(form.description || '').trim().length >= 10
    const checklistItems = React.useMemo(() => {
        if (isDuplicateVariantMode) {
            return [
                {
                    label: 'Familia',
                    value: duplicateVariantBaseName || 'Pendiente',
                    complete: duplicateVariantBaseName.length >= 3,
                },
                {
                    label: 'Variante nueva',
                    value: duplicateVariantLabel || 'Pendiente',
                    complete: !!duplicateVariantLabel,
                },
                {
                    label: 'SKU',
                    value: String(form.attributes?.sku || '').trim() || 'Pendiente',
                    complete: hasSku,
                },
                {
                    label: 'Precio base',
                    value: hasPositivePrice ? `$${parseLocalizedDecimal(form.price).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Pendiente',
                    complete: hasPositivePrice && !productWouldSellAtLoss,
                },
                {
                    label: 'Stock',
                    value: summaryStockLabel,
                    complete: hasPositiveStock,
                },
            ]
        }

        if (isRestockMode) {
            return [
                {
                    label: 'Ingreso',
                    value: stockEntryDelta > 0 ? `+${stockEntryDelta.toLocaleString('es-EC')} uds` : 'Pendiente',
                    complete: stockEntryDelta > 0,
                },
                {
                    label: 'Factura',
                    value: String(form.purchaseInvoice?.invoiceNumber || '').trim() || 'Pendiente',
                    complete: !!String(form.purchaseInvoice?.invoiceNumber || '').trim(),
                },
                {
                    label: 'Proveedor',
                    value: String(form.purchaseInvoice?.supplierName || '').trim() || 'Pendiente',
                    complete: !!String(form.purchaseInvoice?.supplierName || '').trim() && !!selectedPurchaseSupplier?.document,
                },
                {
                    label: 'Fecha',
                    value: String(form.purchaseInvoice?.issuedAt || '').trim() || 'Pendiente',
                    complete: /^\d{4}-\d{2}-\d{2}$/.test(String(form.purchaseInvoice?.issuedAt || '').trim()),
                },
                {
                    label: 'Stock final',
                    value: summaryStockLabel,
                    complete: hasPositiveStock,
                },
            ]
        }

        return [
            {
                label: 'Precio base',
                value: hasPositivePrice ? `$${parseLocalizedDecimal(form.price).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Pendiente',
                complete: hasPositivePrice,
            },
            {
                label: 'Costo',
                value: Number.isFinite(productCost) && productCost >= 0 ? `$${parseLocalizedDecimal(form.cost).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Pendiente',
                complete: hasPositiveCost,
            },
            {
                label: 'Stock',
                value: summaryStockLabel,
                complete: hasPositiveStock,
            },
            {
                label: 'IVA',
                value: summaryTaxLabel,
                complete: true,
            },
            {
                label: 'IVA compra',
                value: summaryPurchaseTaxLabel,
                complete: true,
            },
            {
                label: 'SKU',
                value: String(form.attributes?.sku || '').trim() || 'Pendiente',
                complete: hasSku,
            },
            {
                label: 'Descripción',
                value: hasDescription ? 'Lista para ficha' : 'Mínimo 10 caracteres',
                complete: hasDescription,
            },
            {
                label: 'Miniaturas',
                value: `${summaryThumbCount} cargada${summaryThumbCount === 1 ? '' : 's'}`,
                complete: summaryThumbCount > 0,
            },
            {
                label: 'Galería',
                value: `${summaryGalleryCount} cargada${summaryGalleryCount === 1 ? '' : 's'}`,
                complete: summaryGalleryCount > 0,
            },
        ]
    }, [
        duplicateVariantBaseName,
        duplicateVariantFieldLabel,
        duplicateVariantLabel,
        form.attributes?.sku,
        form.cost,
        form.price,
        form.purchaseInvoice?.invoiceNumber,
        form.purchaseInvoice?.issuedAt,
        form.purchaseInvoice?.supplierName,
        form.description,
        hasDescription,
        hasPositiveCost,
        hasPositivePrice,
        hasPositiveStock,
        hasSku,
        isDuplicateVariantMode,
        isRestockMode,
        productWouldSellAtLoss,
        productCost,
        purchaseTaxRateValue,
        selectedPurchaseSupplier?.document,
        stockEntryDelta,
        summaryPurchaseTaxLabel,
        summaryTaxLabel,
        summaryGalleryCount,
        summaryStockLabel,
        summaryThumbCount,
    ])
    const publicationSupportText = publicationEligible
        ? (form.published
            ? 'Cumple precio y stock, y ya está visible en la tienda.'
            : 'Cumple precio y stock, pero sigue oculto en la web pública.')
        : 'Para publicar necesita al menos precio base mayor a 0 y stock disponible.'

    const applySeoSuggestions = React.useCallback(() => {
        setForm((prev) => {
            const nextAttributes = { ...(prev.attributes || {}) }
            const generatedSeoTitle = buildSuggestedSeoTitle(prev)
            const generatedSeoDescription = buildSuggestedSeoDescription(prev)
            const generatedSeoAlt = buildSuggestedSeoAlt(prev)
            const generatedSearchTerms = buildSuggestedSearchTerms(prev)
            nextAttributes.seoTitle = generatedSeoTitle || nextAttributes.seoTitle || ''
            nextAttributes.seoDescription = generatedSeoDescription || nextAttributes.seoDescription || ''
            nextAttributes.seoImageAlt = generatedSeoAlt || nextAttributes.seoImageAlt || ''
            nextAttributes.seoSearchTerms = generatedSearchTerms || nextAttributes.seoSearchTerms || ''
            const nextSeoAlt = String(nextAttributes.seoImageAlt || '').trim()
            const applyAlt = (images: any[]) => (images || []).map((image) => ({
                ...image,
                altText: String(image?.altText || '').trim() || nextSeoAlt,
            }))
            return {
                ...prev,
                attributes: nextAttributes,
                thumbImages: applyAlt(prev.thumbImages),
                galleryImages: applyAlt(prev.galleryImages),
            }
        })
    }, [])

    React.useEffect(() => {
        if (!publicationEligible && form.published) {
            setForm((prev) => ({ ...prev, published: false }))
        }
    }, [form.published, publicationEligible])

    const handleRestockUnitsChange = React.useCallback((value: string) => {
        const cleanedValue = value === '' ? '' : String(Math.max(0, Math.trunc(Number(value || 0))))
        setRestockUnitsInput(cleanedValue)
        if (!editingProduct) return
        const units = cleanedValue === '' ? 0 : Math.max(0, Math.trunc(Number(cleanedValue)))
        setForm((prev) => ({
            ...prev,
            quantity: String(persistedProductQuantity + units),
        }))
        clearErrors('quantity')
    }, [clearErrors, editingProduct, persistedProductQuantity])

    const setDuplicateVariantField = React.useCallback((fieldKey: string) => {
        setForm((prev) => {
            const nextAttributes: Record<string, string> = {
                ...(prev.attributes || {}),
                __variantDefinitionField: fieldKey,
                variantAxis: fieldKey,
            }

            nextAttributes.variantLabel = String(nextAttributes[fieldKey] || '').trim()

            return {
                ...prev,
                attributes: nextAttributes,
            }
        })
        clearErrors('size', 'color', 'presentation', 'weight', 'range', 'dosage', 'name')
    }, [clearErrors])

    const applyDuplicateVariantDefinition = React.useCallback((value: string) => {
        setForm((prev) => {
            const normalizedType = normalizeProductType(prev.productType, prev.category)
            const nextAttributes: Record<string, string> = {
                ...(prev.attributes || {}),
                variantLabel: value,
                __variantDefinitionField: duplicateVariantFieldKey,
                variantAxis: duplicateVariantFieldKey,
            }

            if (duplicateVariantFieldKey === 'presentation') {
                nextAttributes.presentation = value
            } else if (duplicateVariantFieldKey === 'color') {
                nextAttributes.color = value
            } else if (duplicateVariantFieldKey === 'weight') {
                nextAttributes.weight = value
            } else if (duplicateVariantFieldKey === 'range') {
                nextAttributes.range = value
                if (normalizedType === 'cuidado') {
                    nextAttributes.size = ''
                    nextAttributes.weight = ''
                }
            } else if (duplicateVariantFieldKey === 'dosage') {
                nextAttributes.dosage = value
            } else {
                nextAttributes.size = value
                if (normalizedType === 'Alimento') {
                    nextAttributes.weight = ''
                }
            }

            return {
                ...prev,
                attributes: nextAttributes,
            }
        })
        clearErrors(duplicateVariantFieldKey, 'name')
    }, [clearErrors, duplicateVariantFieldKey])

    const renderDuplicateVariantSelector = React.useCallback(() => (
        <div className="md:col-span-2">
            {duplicateVariantFieldOptions.length > 1 && (
                <div className="mb-4">
                    <label className="text-secondary text-xs uppercase font-bold mb-2 block">Dato que cambia en la variante</label>
                    <select
                        className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white"
                        value={duplicateVariantFieldKey}
                        onChange={e => setDuplicateVariantField(e.target.value)}
                        disabled={saving}
                    >
                        {duplicateVariantFieldOptions.map((option) => (
                            <option key={`duplicate-variant-field-${option.key}`} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                    <p className="text-secondary text-xs mt-2">Elige si esta variante cambia por {duplicateVariantFieldOptionsLabel}. El resto de atributos puede mantenerse.</p>
                </div>
            )}
            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Nuevo valor de variante</label>
            {duplicateVariantFieldKey === 'range' ? (
                <input
                    type="text"
                    className={getInputClass(duplicateVariantFieldKey, 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all')}
                    value={duplicateVariantInputValue}
                    onChange={e => applyDuplicateVariantDefinition(e.target.value)}
                    placeholder="Ej: 10 a 20 kg"
                    disabled={saving}
                />
            ) : renderCreatableReferenceSelect({
                key: duplicateVariantFieldKey === 'presentation'
                    ? 'presentations'
                    : duplicateVariantFieldKey === 'color'
                        ? 'colors'
                        : duplicateVariantFieldKey === 'weight'
                            ? 'weights'
                            : duplicateVariantFieldKey === 'dosage'
                                ? 'dosages'
                                : 'sizes',
                value: duplicateVariantInputValue,
                options: duplicateVariantOptions,
                onChange: applyDuplicateVariantDefinition,
                placeholder: duplicateVariantOptions.length > 0 ? `Selecciona ${duplicateVariantFieldLabel}` : duplicateVariantEmptyLabel,
                createLabel: duplicateVariantFieldLabel,
                className: getInputClass(duplicateVariantFieldKey, 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                disabled: saving,
                forceCreateInline: duplicateVariantFieldKey === 'weight',
                createPlaceholder: duplicateVariantFieldKey === 'weight' ? 'Ej: 2 kg' : undefined,
            })}
            {duplicateVariantFieldError && <p className="text-xs text-red mt-1">{duplicateVariantFieldError}</p>}
        </div>
    ), [
        applyDuplicateVariantDefinition,
        duplicateVariantFieldError,
        duplicateVariantFieldKey,
        duplicateVariantFieldLabel,
        duplicateVariantFieldOptions,
        duplicateVariantFieldOptionsLabel,
        duplicateVariantEmptyLabel,
        duplicateVariantInputValue,
        duplicateVariantOptions,
        getInputClass,
        renderCreatableReferenceSelect,
        saving,
        setDuplicateVariantField,
    ])

    const renderUnifiedProductAttributes = () => {
        const normalizedProductType = normalizeProductType(form.productType, form.category)
        const showSizeAttribute = normalizedProductType !== 'Alimento'
        const referenceHintItems = [
            { key: 'presentations' as ProductReferenceKey, options: presentationOptions },
            { key: 'weights' as ProductReferenceKey, options: weightOptions },
            ...(showSizeAttribute ? [{ key: 'sizes' as ProductReferenceKey, options: sizeOptions }] : []),
            { key: 'colors' as ProductReferenceKey, options: colorOptions },
            { key: 'materials' as ProductReferenceKey, options: materialOptions },
            { key: 'usages' as ProductReferenceKey, options: usageOptions },
            { key: 'flavors' as ProductReferenceKey, options: flavorOptions },
            { key: 'ageRanges' as ProductReferenceKey, options: ageRangeOptions },
            { key: 'dosages' as ProductReferenceKey, options: dosageOptions },
            { key: 'activeIngredients' as ProductReferenceKey, options: activeIngredientOptions },
            { key: 'tags' as ProductReferenceKey, options: tagOptions },
        ]

        return (
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <div>
                <div className="text-sm font-semibold">Atributos y etiquetas del producto</div>
                <p className="text-secondary text-xs mt-1">
                    Todos los productos usan los mismos catálogos operativos. Selecciona solo lo que aplique: presentación, contenido, talla, color, material, uso, sabor, edad, dosis, ingrediente, especie y etiqueta.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isDuplicateVariantMode ? (
                    renderDuplicateVariantSelector()
                ) : (
                    <>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Presentación</label>
                            {renderCreatableReferenceSelect({
                                key: 'presentations',
                                value: form.attributes?.presentation || '',
                                options: presentationOptions,
                                onChange: (value) => { setAttribute('presentation', value); clearErrors('presentation') },
                                placeholder: presentationOptions.length > 0 ? 'Selecciona presentación' : 'Crear o seleccionar presentación',
                                createLabel: 'presentación',
                                className: getInputClass('presentation', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                disabled: saving,
                            })}
                            <p className="text-secondary text-xs mt-2">Ej: Bolsa, pipeta, frasco, tableta, spray.</p>
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Peso neto / contenido</label>
                            {renderCreatableReferenceSelect({
                                key: 'weights',
                                value: form.attributes?.weight || '',
                                options: weightOptions,
                                onChange: (value) => { setAttribute('weight', value); clearErrors('weight') },
                                placeholder: weightOptions.length > 0 ? 'Selecciona peso o contenido' : 'Crear o seleccionar peso',
                                createLabel: 'peso o contenido',
                                className: getInputClass('weight', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                disabled: saving,
                                forceCreateInline: true,
                                createPlaceholder: 'Ej: 2 kg',
                            })}
                            {formErrors.weight && <p className="text-xs text-red mt-1">{formErrors.weight}</p>}
                            <p className="text-secondary text-xs mt-2">Usa aquí kg, gr, ml, unidades u otra medida registrada.</p>
                        </div>
                        {showSizeAttribute && (
                            <div>
                                <label className="text-secondary text-xs uppercase font-bold mb-2 block">Talla o tamaño</label>
                                {renderCreatableReferenceSelect({
                                    key: 'sizes',
                                    value: form.attributes?.size || '',
                                    options: sizeOptions,
                                    onChange: (value) => { setAttribute('size', value); clearErrors('size') },
                                    placeholder: sizeOptions.length > 0 ? 'Selecciona talla o tamaño' : 'Crear o seleccionar talla o tamaño',
                                    createLabel: 'talla o tamaño',
                                    className: getInputClass('size', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                    disabled: saving,
                                })}
                                {formErrors.size && <p className="text-xs text-red mt-1">{formErrors.size}</p>}
                            </div>
                        )}
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Color</label>
                            {renderCreatableReferenceSelect({
                                key: 'colors',
                                value: form.attributes?.color || '',
                                options: colorOptions,
                                onChange: (value) => setAttribute('color', value),
                                placeholder: colorOptions.length > 0 ? 'Selecciona color' : 'Crear o seleccionar color',
                                createLabel: 'color',
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Material</label>
                            {renderCreatableReferenceSelect({
                                key: 'materials',
                                value: form.attributes?.material || '',
                                options: materialOptions,
                                onChange: (value) => setAttribute('material', value),
                                placeholder: materialOptions.length > 0 ? 'Selecciona material' : 'Crear o seleccionar material',
                                createLabel: 'material',
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Uso</label>
                            {renderCreatableReferenceSelect({
                                key: 'usages',
                                value: form.attributes?.usage || '',
                                options: usageOptions,
                                onChange: (value) => setAttribute('usage', value),
                                placeholder: usageOptions.length > 0 ? 'Selecciona uso' : 'Crear o seleccionar uso',
                                createLabel: 'uso',
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Sabor</label>
                            {renderCreatableReferenceSelect({
                                key: 'flavors',
                                value: form.attributes?.flavor || '',
                                options: flavorOptions,
                                onChange: (value) => setAttribute('flavor', value),
                                placeholder: flavorOptions.length > 0 ? 'Selecciona sabor' : 'Crear o seleccionar sabor',
                                createLabel: 'sabor',
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Edad / etapa</label>
                            {renderCreatableReferenceSelect({
                                key: 'ageRanges',
                                value: form.attributes?.age || '',
                                options: ageRangeOptions,
                                onChange: (value) => setAttribute('age', value),
                                placeholder: ageRangeOptions.length > 0 ? 'Selecciona edad o etapa' : 'Crear o seleccionar edad',
                                createLabel: 'edad',
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Rango recomendado</label>
                            <input
                                className={getInputClass('range', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')}
                                placeholder="Ej: perros 10 a 20 kg"
                                value={form.attributes?.range || ''}
                                onChange={e => { setAttribute('range', e.target.value); clearErrors('range') }}
                                disabled={saving}
                            />
                            {formErrors.range && <p className="text-xs text-red mt-1">{formErrors.range}</p>}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Dosis o concentración</label>
                            {renderCreatableReferenceSelect({
                                key: 'dosages',
                                value: form.attributes?.dosage || '',
                                options: dosageOptions,
                                onChange: (value) => { setAttribute('dosage', value); clearErrors('dosage') },
                                placeholder: dosageOptions.length > 0 ? 'Selecciona dosis o concentración' : 'Crear o seleccionar dosis',
                                createLabel: 'dosis o concentración',
                                className: getInputClass('dosage', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Ingrediente activo</label>
                            {renderCreatableReferenceSelect({
                                key: 'activeIngredients',
                                value: form.attributes?.activeIngredient || '',
                                options: activeIngredientOptions,
                                onChange: (value) => setAttribute('activeIngredient', value),
                                placeholder: activeIngredientOptions.length > 0 ? 'Selecciona ingrediente' : 'Crear o seleccionar ingrediente',
                                createLabel: 'ingrediente',
                                disabled: saving,
                            })}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Estilo / género de prenda</label>
                            <select className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white" value={form.attributes?.gender || ''} onChange={e => setAttribute('gender', e.target.value)} disabled={saving}>
                                <option value="">Selecciona si aplica</option>
                                {APPAREL_GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Mascota / especie</label>
                            <select className={getInputClass('species', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')} value={form.attributes?.species || ''} onChange={e => setSpeciesAttribute(e.target.value)} disabled={saving}>
                                <option value="">Selecciona mascota</option>
                                {PET_SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            {formErrors.species && <p className="text-xs text-red mt-1">{formErrors.species}</p>}
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Etiqueta comercial</label>
                            {renderCreatableReferenceSelect({
                                key: 'tags',
                                value: form.attributes?.tag || '',
                                options: tagOptions,
                                onChange: (value) => setAttribute('tag', value),
                                placeholder: tagOptions.length > 0 ? 'Sin etiqueta' : 'Crear o seleccionar etiqueta',
                                createLabel: 'etiqueta',
                                disabled: saving,
                            })}
                            <p className="text-secondary text-xs mt-2">Opcional. Úsala para destacar Premium, Nuevo u otra señal comercial.</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Ingredientes / composición</label>
                            <textarea
                                className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all min-h-[88px] bg-white"
                                placeholder="Ingredientes, composición o detalles técnicos si aplica."
                                value={form.attributes?.ingredients || ''}
                                onChange={e => setAttribute('ingredients', e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </>
                )}
                <div className="md:col-span-2">
                    {isDuplicateVariantMode
                        ? renderReferenceCatalogHints(duplicateVariantReferenceItems, duplicateVariantReferenceEmptyText)
                        : renderReferenceCatalogHints(referenceHintItems, 'Crea aquí los valores que falten en los selectores. Quedarán guardados en Catálogos operativos.')}
                </div>
            </div>
        </div>
        )
    }

    const handleSave = React.useCallback(async (event: React.FormEvent) => {
        event.preventDefault()
        if (saving) return
        try {
            if (Object.values(imageUploading).some(Boolean)) {
                showNotification('Espera a que terminen de subir las imágenes.', 'error')
                return
            }

            const nextErrors: Record<string, string> = {}
            const name = String(form.name || '').trim()
            const brand = String(form.brand || '').trim()
            const productType = normalizeProductType(form.productType, form.category)
            let category = normalizeProductCategory(form.category)
            const pendingCategory = normalizeProductCategory(String(referenceDrafts.categories || ''))
            if (!category && pendingCategory) {
                category = pendingCategory
            }
            const description = String(form.description || '').trim()
            const basePrice = parseLocalizedDecimal(form.price)
            const pvpPrice = parseLocalizedDecimal(form.pvp)
            const marketPrice = parseLocalizedDecimal(form.marketPrice)
            const currentCost = parseLocalizedDecimal(form.cost)
            const previousQuantity = Number(editingProduct?.quantity ?? 0)
            const quantity = isRestockMode && editingProduct
                ? previousQuantity + Math.max(0, Math.trunc(Number(restockUnitsInput || 0)))
                : Number(form.quantity)
            const stockIncrease = editingProduct ? Math.max(0, quantity - previousQuantity) : Math.max(0, quantity)
            const stockDelta = editingProduct && !isRestockMode && !isDuplicateVariantMode
                ? quantity - previousQuantity
                : 0
            const adjustmentReason = inventoryAdjustmentReason.trim()
            const saveRequiresPurchaseInvoice = stockIncrease > 0 && (!editingProduct || isRestockMode)

            if (!isDuplicateVariantMode && name.length < 3) nextErrors.name = 'El nombre debe tener al menos 3 caracteres.'
            if (!brand) nextErrors.brand = 'La marca es obligatoria.'
            if (!productType) nextErrors.productType = 'Selecciona el tipo de producto.'
            if (!category) nextErrors.category = 'Selecciona o crea la categoría visible del producto.'
            if (!Number.isFinite(basePrice) || basePrice < 0) nextErrors.price = 'El precio base debe ser un número válido mayor o igual a 0.'
            if (String(form.marketPrice || '').trim() !== '' && (!Number.isFinite(marketPrice) || marketPrice < 0)) {
                nextErrors.marketPrice = 'El precio mercado debe ser un número válido mayor o igual a 0.'
            }
            if (String(form.marketPrice || '').trim() !== '' && Number.isFinite(marketPrice) && Number.isFinite(pvpPrice) && marketPrice <= pvpPrice) {
                nextErrors.marketPrice = 'El precio mercado debe ser mayor al PVP actual para generar una oferta.'
            }
            if (!Number.isFinite(currentCost) || currentCost < 0) nextErrors.cost = 'El costo debe ser un número válido mayor o igual a 0.'
            if (Number.isFinite(basePrice) && Number.isFinite(currentCost) && currentCost > 0 && basePrice < currentCost) {
                nextErrors.price = 'El precio base no puede ser menor al costo del producto.'
            }
            if (saveRequiresPurchaseInvoice && (!Number.isFinite(currentCost) || currentCost <= 0)) {
                nextErrors.cost = 'El costo de compra es obligatorio para ingresar stock.'
            }
            if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) nextErrors.quantity = 'El stock debe ser un número entero mayor o igual a 0.'
            if (description.length < 10) nextErrors.description = 'La descripción debe tener al menos 10 caracteres.'
            if (isRestockMode && stockIncrease <= 0) nextErrors.quantity = 'Debes indicar al menos 1 unidad a ingresar en la compra.'
            if (stockDelta !== 0 && !adjustmentReason) {
                nextErrors.inventoryAdjustmentReason = 'Indica el motivo del ajuste de inventario.'
            }

            const attributesForSave = normalizeAttributes(productType, form.attributes)
            const appliedReferenceDraftKeys = new Set<ProductReferenceKey>()
            const appliedDraftAttributes: Record<string, string> = {}
            const applyPendingReferenceDraft = (field: string, referenceKey: ProductReferenceKey) => {
                if (String(attributesForSave[field] || '').trim()) return
                const draftValue = normalizeInlineReferenceValue(referenceKey, String(referenceDrafts[referenceKey] || ''))
                if (!draftValue) return
                attributesForSave[field] = draftValue
                appliedDraftAttributes[field] = draftValue
                appliedReferenceDraftKeys.add(referenceKey)
            }
            applyPendingReferenceDraft('size', 'sizes')
            applyPendingReferenceDraft('weight', 'weights')
            applyPendingReferenceDraft('presentation', 'presentations')
            applyPendingReferenceDraft('dosage', 'dosages')
            applyPendingReferenceDraft('material', 'materials')
            applyPendingReferenceDraft('color', 'colors')
            applyPendingReferenceDraft('usage', 'usages')
            applyPendingReferenceDraft('activeIngredient', 'activeIngredients')
            applyPendingReferenceDraft('storageLocation', 'storageLocations')
            applyPendingReferenceDraft('tag', 'tags')
            applyPendingReferenceDraft('flavor', 'flavors')
            applyPendingReferenceDraft('age', 'ageRanges')

            const hasAppliedCategoryDraft = !normalizeProductCategory(form.category) && category !== ''
            if (hasAppliedCategoryDraft) {
                appliedReferenceDraftKeys.add('categories')
            }
            const commitAppliedReferenceDrafts = () => {
                if (!hasAppliedCategoryDraft && Object.keys(appliedDraftAttributes).length === 0) return
                setForm((prev) => ({
                    ...prev,
                    category: hasAppliedCategoryDraft ? category : prev.category,
                    attributes: {
                        ...(prev.attributes || {}),
                        ...appliedDraftAttributes,
                    },
                }))
                if (appliedReferenceDraftKeys.size > 0) {
                    setReferenceDrafts((prev) => {
                        const next = { ...prev }
                        appliedReferenceDraftKeys.forEach((key) => {
                            delete next[key]
                        })
                        return next
                    })
                }
            }

            const draftVariantName = isDuplicateVariantMode ? duplicateVariantBaseName : name
            let normalizedAttributes = enrichVariantAttributes({
                type: productType,
                category,
                name: draftVariantName,
                attributes: attributesForSave,
            })
            let nextVariantLabel = resolveProductVariantLabel(productType, normalizedAttributes)
            const resolvedProductName = isDuplicateVariantMode
                ? duplicateVariantBaseName
                : name
            if (resolvedProductName && resolvedProductName !== draftVariantName) {
                normalizedAttributes = enrichVariantAttributes({
                    type: productType,
                    category,
                    name: resolvedProductName,
                    attributes: normalizedAttributes,
                })
                nextVariantLabel = resolveProductVariantLabel(productType, normalizedAttributes)
            }
            normalizedAttributes.taxExempt = form.taxExempt ? 'true' : 'false'
            const sanitizedAdditionalCategories = serializeSanitizedAdditionalCategories(
                parseSerializedProductCategories(normalizedAttributes.catalogCategories),
                category
            )
            if (sanitizedAdditionalCategories) {
                normalizedAttributes.catalogCategories = sanitizedAdditionalCategories
            } else {
                delete normalizedAttributes.catalogCategories
            }
            const normalizedSpecies = normalizeProductSpecies(normalizedAttributes.species, editingProduct?.gender ?? '')
            const duplicateSourceVariantLabel = String(form.attributes?.__sourceVariantLabel || '').trim()
            const variantDefinitionField = isDuplicateVariantMode ? duplicateVariantFieldKey : getVariantDefinitionFieldKey(productType)
            const variantDefinitionFieldLabel = isDuplicateVariantMode ? duplicateVariantFieldLabel : getVariantDefinitionFieldLabel(productType)
            const duplicateSourceVariantFieldValue = normalizeMeasurementLabel(String(initialForm.attributes?.[variantDefinitionField] || '').trim()).toLowerCase()
            const nextVariantFieldValue = normalizeMeasurementLabel(String(normalizedAttributes[variantDefinitionField] || '').trim()).toLowerCase()
            if (normalizedSpecies) {
                normalizedAttributes.species = normalizedSpecies
            }
            if (productType !== 'ropa') {
                delete normalizedAttributes.sizeGuideRows
                delete normalizedAttributes.sizeGuideNotes
            }
            if (productType === 'ropa' && !String(normalizedAttributes.size || '').trim()) {
                nextErrors.size = 'La talla es obligatoria para productos de ropa.'
            }
            if (!isDuplicateVariantMode && productType === 'cuidado' && !nextVariantLabel) {
                nextErrors.weight = 'Selecciona o crea el peso/contenido, la presentación, la dosis o el rango recomendado del producto.'
            }
            if (isDuplicateVariantMode) {
                if (duplicateVariantBaseName.length < 3) {
                    nextErrors.variantBaseName = 'La familia del producto debe tener al menos 3 caracteres.'
                }
                normalizedAttributes.variantBaseName = duplicateVariantBaseName
                if (!nextVariantLabel) {
                    nextErrors[variantDefinitionField] = `Debes definir la ${variantDefinitionFieldLabel} de la nueva variante.`
                } else {
                    normalizedAttributes.variantLabel = nextVariantLabel
                    normalizedAttributes.variantAxis = duplicateVariantFieldKey
                    if (duplicateSourceVariantFieldValue && duplicateSourceVariantFieldValue === nextVariantFieldValue) {
                        nextErrors[variantDefinitionField] = `La nueva variante debe usar un valor de ${variantDefinitionFieldLabel} distinto al original.`
                    } else if (
                        duplicateVariantFieldKey === String(initialForm.attributes?.__variantDefinitionField || '').trim()
                        && duplicateSourceVariantLabel
                        && duplicateSourceVariantLabel.toLowerCase() === nextVariantLabel.toLowerCase()
                    ) {
                        nextErrors[variantDefinitionField] = `La nueva variante debe usar un valor distinto a ${duplicateSourceVariantLabel}.`
                    }
                }
            }
            delete normalizedAttributes.__sourceVariantLabel
            if (productType) {
                if (!normalizedAttributes.sku) nextErrors.sku = 'El SKU es obligatorio.'
                else if (reservedSkuSet.has(String(normalizedAttributes.sku).trim().toUpperCase())) nextErrors.sku = 'Ya existe un producto con ese SKU.'
                if (!normalizedAttributes.species) nextErrors.species = 'La especie/mascota es obligatoria.'
            }

            const expirationDateRaw = String(normalizedAttributes.expirationDate || '').trim()
            const alertDaysRaw = String(normalizedAttributes.expirationAlertDays || '').trim()
            const isPerishableProduct = productType === 'Alimento'
            const isCareProduct = productType === 'cuidado'
            const requiresExpirationDate = isPerishableProduct && quantity > 0
            if (isPerishableProduct || isCareProduct) {
                if (requiresExpirationDate && !expirationDateRaw) {
                    nextErrors.expirationDate = 'La fecha de vencimiento es obligatoria para Alimento.'
                }
                if (expirationDateRaw) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDateRaw)) {
                        nextErrors.expirationDate = 'Fecha de vencimiento inválida. Usa formato YYYY-MM-DD.'
                    } else {
                        normalizedAttributes.expirationDate = expirationDateRaw
                    }
                    if (alertDaysRaw === '') {
                        normalizedAttributes.expirationAlertDays = '30'
                    } else if (!/^\d+$/.test(alertDaysRaw)) {
                        nextErrors.expirationAlertDays = 'Los días de alerta de vencimiento deben ser un número entero.'
                    } else {
                        normalizedAttributes.expirationAlertDays = String(Math.min(3650, Math.max(0, Number(alertDaysRaw))))
                    }
                } else if (requiresExpirationDate && alertDaysRaw !== '') {
                    nextErrors.expirationDate = 'Si defines días de alerta, también debes definir fecha de vencimiento.'
                } else {
                    delete normalizedAttributes.expirationDate
                    delete normalizedAttributes.expiryDate
                    delete normalizedAttributes.expirationAlertDays
                    delete normalizedAttributes.expiryAlertDays
                }
            } else {
                delete normalizedAttributes.expirationDate
                delete normalizedAttributes.expiryDate
                delete normalizedAttributes.expirationAlertDays
                delete normalizedAttributes.expiryAlertDays
            }

            const purchaseInvoice = {
                invoiceNumber: String(form.purchaseInvoice?.invoiceNumber || '').trim(),
                supplierName: String(form.purchaseInvoice?.supplierName || '').trim(),
                supplierDocument: selectedPurchaseSupplier?.document || String(form.purchaseInvoice?.supplierDocument || '').trim(),
                purchaseTaxRate: purchaseTaxRateValue.toFixed(2),
                issuedAt: String(form.purchaseInvoice?.issuedAt || '').trim(),
                notes: String(form.purchaseInvoice?.notes || '').trim(),
                metadata: selectedPurchaseSupplier ? {
                    supplierId: selectedPurchaseSupplier.id,
                    supplierEmail: selectedPurchaseSupplier.email || null,
                    supplierPhone: selectedPurchaseSupplier.phone || null,
                    supplierContactName: selectedPurchaseSupplier.contactName || null,
                    supplierAddress: selectedPurchaseSupplier.address || null,
                    purchase_tax_rate: purchaseTaxRateValue.toFixed(2),
                    purchase_tax_exempt: purchaseTaxRateValue <= 0,
                } : undefined,
            }
            if (purchaseTaxRateValue < 0 || purchaseTaxRateValue > 100) {
                nextErrors.purchaseInvoicePurchaseTaxRate = 'El IVA de compra debe estar entre 0% y 100%.'
            }
            if (saveRequiresPurchaseInvoice) {
                if (!purchaseInvoice.invoiceNumber) nextErrors.purchaseInvoiceNumber = 'El número de factura de compra es obligatorio para ingresar stock.'
                if (!purchaseInvoice.supplierName) nextErrors.purchaseInvoiceSupplierName = 'El proveedor es obligatorio para ingresar stock.'
                if (purchaseInvoice.supplierName && !purchaseInvoice.supplierDocument) {
                    nextErrors.purchaseInvoiceSupplierDocument = 'El proveedor seleccionado debe tener RUC o documento.'
                }
                if (!purchaseInvoice.issuedAt || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseInvoice.issuedAt)) {
                    nextErrors.purchaseInvoiceIssuedAt = 'La fecha de la factura de compra es obligatoria y debe usar formato YYYY-MM-DD.'
                }
                if (!normalizedAttributes.supplier && purchaseInvoice.supplierName) {
                    normalizedAttributes.supplier = purchaseInvoice.supplierName
                }
            }
            if (String(form.purchaseInvoice?.purchaseTaxRate || '').trim() || selectedPurchaseSupplier?.purchaseTaxRate || selectedPreferredSupplier?.purchaseTaxRate) {
                normalizedAttributes.purchaseTaxRate = purchaseTaxRateValue.toFixed(2)
            } else {
                delete normalizedAttributes.purchaseTaxRate
            }
            const cleanedSeoTitle = cleanSeoPart(normalizedAttributes.seoTitle)
            const cleanedSeoDescription = cleanSeoPart(normalizedAttributes.seoDescription)
            normalizedAttributes.seoTitle = isSeoTextLengthValid(cleanedSeoTitle, 20, 70) ? cleanedSeoTitle : suggestedSeoTitle
            normalizedAttributes.seoDescription = isSeoTextLengthValid(cleanedSeoDescription, 70, 160) ? cleanedSeoDescription : suggestedSeoDescription
            normalizedAttributes.seoImageAlt = cleanSeoPart(normalizedAttributes.seoImageAlt) || suggestedSeoAlt
            normalizedAttributes.seoSearchTerms = cleanSeoPart(normalizedAttributes.seoSearchTerms) || suggestedSearchTerms

            const thumbEntries = applyDefaultSizes((form.thumbImages || []).filter((img: any) => img.url && img.url.trim()), 'thumb')
            const galleryEntries = applyDefaultSizes((form.galleryImages || []).filter((img: any) => img.url && img.url.trim()), 'gallery')
            if (thumbEntries.length === 0) nextErrors.thumbImages = 'Agrega al menos una miniatura para el listado.'
            if (galleryEntries.length === 0) nextErrors.galleryImages = 'Agrega al menos una imagen grande para la ficha del producto.'

            const validateSizes = (entries: any[], label: string) => {
                for (const entry of entries) {
                    if (!entry.width || !entry.height) return `Completa el ancho y alto de ${label}.`
                    if (Number(entry.width) <= 0 || Number(entry.height) <= 0) return `El tamaño de ${label} debe ser mayor a 0.`
                }
                return ''
            }
            const thumbSizeError = validateSizes(thumbEntries, 'las miniaturas')
            const gallerySizeError = validateSizes(galleryEntries, 'las imágenes grandes')
            if (thumbSizeError) nextErrors.thumbImages = thumbSizeError
            if (gallerySizeError) nextErrors.galleryImages = gallerySizeError

            if (Object.keys(nextErrors).length > 0) {
                commitAppliedReferenceDrafts()
                setFormErrors(nextErrors)
                showNotification(Object.values(nextErrors)[0], 'error')
                return
            }

            setFormErrors({})
            commitAppliedReferenceDrafts()
            setSaving(true)

            const linkedCatalogs = await ensureProductCatalogLinks(category, normalizedAttributes)
            category = linkedCatalogs.category
            normalizedAttributes = linkedCatalogs.attributes

            const inventoryAction = isRestockMode
                ? 'restock'
                : editingProduct
                    ? (stockDelta !== 0 ? 'adjustment' : undefined)
                    : (stockIncrease > 0 ? 'initial_stock' : undefined)

            const data = {
                name: resolvedProductName,
                price: basePrice,
                originPrice: String(form.marketPrice || '').trim() !== ''
                    ? roundCurrency(effectiveVatMultiplier > 0 ? (marketPrice / effectiveVatMultiplier) : marketPrice)
                    : basePrice,
                sale: String(form.marketPrice || '').trim() !== '' && marketPrice > pvpPrice,
                cost: currentCost,
                quantity,
                category,
                productType,
                gender: resolveAudienceGenderFromSpecies(normalizedSpecies, editingProduct?.gender ?? ''),
                published: publicationEligible ? !!form.published : false,
                attributes: normalizedAttributes,
                brand,
                description,
                inventoryAction,
                inventoryAdjustmentReason: stockDelta !== 0 ? adjustmentReason : undefined,
                purchaseInvoice: saveRequiresPurchaseInvoice ? purchaseInvoice : undefined,
                images: galleryEntries.map((img: any) => ({
                    url: img.url.trim(),
                    width: Number(img.width),
                    height: Number(img.height),
                    kind: 'gallery',
                    altText: cleanSeoPart(img.altText) || normalizedAttributes.seoImageAlt
                })),
                thumbImages: thumbEntries.map((img: any) => ({
                    url: img.url.trim(),
                    width: Number(img.width),
                    height: Number(img.height),
                    kind: 'thumb',
                    altText: cleanSeoPart(img.altText) || normalizedAttributes.seoImageAlt
                }))
            }

            if (editingProduct) {
                await withTransientRetry(() => requestApi(`/api/products/${form.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }))
                showNotification(isRestockMode ? 'Compra registrada correctamente' : 'Producto actualizado correctamente')
            } else {
                await withTransientRetry(() => requestApi('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }))
                showNotification('Producto creado correctamente')
            }

            const res = await withTransientRetry(() => requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT))
            onProductsUpdated(normalizeAdminProducts(res.body))
            if (activeTab === 'inventory' || saveRequiresPurchaseInvoice) {
                await onRefreshPurchaseInvoices()
            }
            if (saveRequiresPurchaseInvoice) {
                persistRememberedPurchaseInvoice(purchaseInvoice)
            }
            onClose()
        } catch (error) {
            const message = String((error as any)?.message || '').trim()
            if (message.includes('401')) {
                onSessionExpired?.()
            }
            if (message.toLowerCase().includes('sku')) {
                setFormErrors((prev) => ({ ...prev, sku: message || 'Ya existe un producto con ese SKU.' }))
            }
            if (message.toLowerCase().includes('precio base no puede ser menor al costo')) {
                setFormErrors((prev) => ({ ...prev, price: message || 'El precio base no puede ser menor al costo del producto.' }))
            }
            showNotification(message || 'Error al guardar producto', 'error')
        } finally {
            setSaving(false)
        }
    }, [activeTab, editingProduct, ensureProductCatalogLinks, form, imageUploading, inventoryAdjustmentReason, isDuplicateVariantMode, isRestockMode, onClose, onProductsUpdated, onRefreshPurchaseInvoices, onSessionExpired, publicationEligible, referenceDrafts, restockUnitsInput, saving, showNotification, suggestedSearchTerms, suggestedSeoAlt, suggestedSeoDescription, suggestedSeoTitle])

    if (!open) return null

    const normalizedFormProductType = normalizeProductType(form.productType, form.category)
    const showLegacyTypeAttributeBlocks = false
    const hasAccessoryColor = normalizedFormProductType === 'accesorios' && Boolean(String(form.attributes?.color || '').trim())

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-2 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[92vh] flex flex-col shadow-2xl" onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b border-line flex justify-between items-start gap-4 bg-white rounded-t-2xl sticky top-0 z-10">
                    <div className="min-w-0">
                        <h3 className="heading4">{modalTitle}</h3>
                        <p className="text-sm text-secondary mt-1">{modalSubtitle}</p>
                    </div>
                    <button onClick={closeModal} className="text-secondary hover:text-black" disabled={saving}>
                        <Icon.X size={24} />
                    </button>
                </div>
                <div className="px-4 sm:px-6 py-3 border-b border-line bg-white sticky top-[88px] sm:top-[96px] z-[9]">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${modeChipClass}`}>
                            {modeChipLabel}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-surface px-3 py-1 font-semibold text-black">
                            Tipo: {productTypeLabel}
                        </span>
                        {isDuplicateVariantMode && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">
                                Variante nueva: {duplicateVariantLabel || 'define el valor'}
                            </span>
                        )}
                        {isRestockMode && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                                Stock final: {summaryStockLabel}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    <form
                        key={formSessionKey}
                        id="product-form"
                        ref={formRef}
                        onSubmit={handleSave}
                        autoComplete="off"
                        className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 xl:items-start"
                    >
                        <div className="space-y-6 min-w-0">
                        {productFormErrorEntries.length > 0 && (
                            <div className="p-4 rounded-xl border border-red/30 bg-red/5">
                                <div className="text-sm font-bold text-red mb-2">Revisa los siguientes campos:</div>
                                <div className="space-y-1">
                                    {productFormErrorEntries.slice(0, 6).map(([field, message]) => (
                                        <p key={field} className="text-xs text-red">{message}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isDuplicateVariantMode && (
                            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                                <div className="text-sm font-bold text-blue-900 mb-1">Modo variante</div>
                                <p className="text-xs text-blue-900/80">
                                    Esta copia mantiene bloqueados los datos que definen la familia del producto. Aquí debes registrar el dato que diferencia la variante,
                                    por ejemplo talla, color o presentación, para que en la tienda se vea un solo producto y la ficha publique sus variantes correctamente.
                                </p>
                            </div>
                        )}
                        {isDuplicateVariantMode && (
                            <div>
                                <label className="text-secondary text-sm font-bold uppercase mb-2 block">Familia del producto</label>
                                <div className={getInputClass('variantBaseName', 'border rounded-lg px-4 py-3 w-full bg-surface text-black')}>
                                    {duplicateVariantBaseName || 'Sin familia base definida'}
                                </div>
                                {duplicateVariantBaseError && <p className="text-xs text-red mt-1">{duplicateVariantBaseError}</p>}
                                <p className="text-secondary text-xs mt-2">Se toma del producto original y queda bloqueado para no romper la agrupación de variantes en la tienda.</p>
                            </div>
                        )}
                        {!isRestockMode && (
                            <div className="rounded-xl border border-line bg-surface p-5">
                                <div className="text-sm font-semibold mb-3">Visualización de variantes en tienda</div>
                                {hasAccessoryColor && (
                                    <p className="text-xs text-secondary mb-3">
                                        Puedes agrupar colores del mismo producto. En la ficha, las tallas o medidas se filtrarán según el color seleccionado para no mostrar combinaciones inexistentes.
                                    </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                            String(form.attributes?.catalogDisplayMode || 'grouped') !== 'separate'
                                                ? 'border-black bg-white'
                                                : 'border-line bg-white hover:border-black'
                                        }`}
                                        onClick={() => setAttribute('catalogDisplayMode', 'grouped')}
                                        disabled={saving}
                                    >
                                        <div className="text-sm font-bold">Agrupada</div>
                                        <div className="text-xs text-secondary mt-1">Una sola tarjeta pública con selector de talla, color o presentación.</div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                            String(form.attributes?.catalogDisplayMode || 'grouped') === 'separate'
                                                ? 'border-black bg-white'
                                                : 'border-line bg-white hover:border-black'
                                        }`}
                                        onClick={() => setAttribute('catalogDisplayMode', 'separate')}
                                        disabled={saving}
                                    >
                                        <div className="text-sm font-bold">Separada</div>
                                        <div className="text-xs text-secondary mt-1">Esta variante aparece como producto propio en listados y búsqueda.</div>
                                    </button>
                                </div>
                            </div>
                        )}
                        {isRestockMode && editingProduct && (
                            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                                <div className="text-sm font-bold text-emerald-900 mb-1">Modo compra / reposición</div>
                                <p className="text-xs text-emerald-900/80">
                                    Usa este flujo para registrar una compra de un producto existente. El stock aumenta por las unidades ingresadas y la factura queda guardada como respaldo. Las ventas y pedidos descuentan stock automáticamente.
                                </p>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                                        <div className="text-[10px] uppercase font-bold text-secondary">Stock actual</div>
                                        <div className="text-lg font-bold">{persistedProductQuantity.toLocaleString('es-EC')} uds</div>
                                    </div>
                                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                                        <div className="text-[10px] uppercase font-bold text-secondary">Ingreso</div>
                                        <div className="text-lg font-bold text-emerald-700">+{stockEntryDelta.toLocaleString('es-EC')} uds</div>
                                    </div>
                                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                                        <div className="text-[10px] uppercase font-bold text-secondary">Stock resultante</div>
                                        <div className="text-lg font-bold">{requestedProductQuantity.toLocaleString('es-EC')} uds</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-6">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <div className="text-sm font-semibold">Identidad, precio y stock</div>
                                    <p className="text-xs text-secondary mt-1">Define lo comercial primero. Aquí controlas nombre, marca, costo, precio y existencias.</p>
                                </div>
                                <div className="text-xs text-secondary">
                                    {isRestockMode ? 'La compra actualiza el stock y puede ajustar el costo unitario.' : 'El margen se recalcula en tiempo real mientras editas.'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-secondary text-sm font-bold uppercase mb-2 block">Nombre del Producto</label>
                                    <input type="text" name={`${formSessionKey}-name`} autoComplete="off" className={getInputClass('name', 'border rounded-lg px-4 py-3 w-full outline-none transition-all')} value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); clearErrors('name') }} required placeholder="Ej: Camiseta Deportiva" disabled={saving || isDuplicateVariantMode || isRestockMode} />
                                    {formErrors.name && <p className="text-xs text-red mt-1">{formErrors.name}</p>}
                                    {isDuplicateVariantMode && <p className="text-secondary text-xs mt-2">El nombre se genera automáticamente con la familia y el valor de variante para mantener la agrupación.</p>}
                                    {isRestockMode && <p className="text-secondary text-xs mt-2">Queda bloqueado en reposición para evitar cambios accidentales.</p>}
                                </div>
                                <div>
                                    <label className="text-secondary text-sm font-bold uppercase mb-2 block">Marca</label>
                                    {renderCreatableReferenceSelect({
                                        key: 'brands',
                                        value: form.brand || '',
                                        options: brandOptions,
                                        onChange: (value) => { setForm({ ...form, brand: value }); clearErrors('brand') },
                                        placeholder: brandOptions.length > 0 ? 'Selecciona marca' : 'No hay marcas registradas',
                                        createLabel: 'marca',
                                        className: getInputClass('brand', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                        disabled: saving || isDuplicateVariantMode || isRestockMode,
                                    })}
                                    {formErrors.brand && <p className="text-xs text-red mt-1">{formErrors.brand}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Precio base (sin IVA)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">$</span>
                                            <input type="text" name={`${formSessionKey}-price-net`} autoComplete="off" inputMode="decimal" className={getInputClass('price', 'border rounded-lg pl-8 pr-4 py-3 w-full outline-none transition-all')} value={displayedBasePrice} onFocus={() => setActiveMoneyField('price')} onBlur={() => handleMoneyFieldBlur('price')} onChange={e => { handleBasePriceChange(e.target.value); clearErrors('price') }} required disabled={saving} placeholder="0,00" />
                                        </div>
                                        {formErrors.price && <p className="text-xs text-red mt-1">{formErrors.price}</p>}
                                        {productWouldSellAtLoss && !formErrors.price && (
                                            <p className="text-xs text-red mt-2">El precio base no puede quedar por debajo del costo.</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">{form.taxExempt ? 'Precio final de venta' : 'Precio PVP (con IVA)'}</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">$</span>
                                            <input
                                                type="text"
                                                name={`${formSessionKey}-price-gross`}
                                                autoComplete="off"
                                                inputMode="decimal"
                                                className="border border-line rounded-lg pl-8 pr-4 py-3 w-full focus:border-black outline-none transition-all"
                                                value={displayedPvpPrice}
                                                onFocus={() => setActiveMoneyField('pvp')}
                                                onBlur={() => handleMoneyFieldBlur('pvp')}
                                                onChange={e => handlePvpPriceChange(e.target.value)}
                                                disabled={saving}
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <p className="text-secondary text-xs mt-2">
                                            {form.taxExempt
                                                ? `Producto exento: precio final actual $${productPvpPriceLabel}.`
                                                : `PVP estimado actual: $${productPvpPriceLabel}`}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Precio mercado</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">$</span>
                                            <input
                                                type="text"
                                                name={`${formSessionKey}-price-market`}
                                                autoComplete="off"
                                                inputMode="decimal"
                                                className={getInputClass('marketPrice', 'border rounded-lg pl-8 pr-4 py-3 w-full outline-none transition-all')}
                                                value={displayedMarketPrice}
                                                onFocus={() => setActiveMoneyField('marketPrice')}
                                                onBlur={() => handleMoneyFieldBlur('marketPrice')}
                                                onChange={e => { handleMarketPriceChange(e.target.value); clearErrors('marketPrice') }}
                                                disabled={saving}
                                                placeholder="Opcional"
                                            />
                                        </div>
                                        {formErrors.marketPrice && <p className="text-xs text-red mt-1">{formErrors.marketPrice}</p>}
                                        <p className="text-secondary text-xs mt-2">
                                            {hasMarketPriceInput
                                                ? `Mercado actual: $${productMarketPriceLabel}. Descuento visible: $${productOfferAmountLabel} (${productOfferPercent}%).`
                                                : 'Si defines un precio mayor al PVP, el producto saldrá con etiqueta de oferta en la tienda.'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Costo sin IVA</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">$</span>
                                            <input type="text" name={`${formSessionKey}-cost-net`} autoComplete="off" inputMode="decimal" className={getInputClass('cost', 'border rounded-lg pl-8 pr-4 py-3 w-full outline-none transition-all')} value={displayedCost} onFocus={() => setActiveMoneyField('cost')} onBlur={() => handleMoneyFieldBlur('cost')} placeholder={editingProduct ? 'Costo base unitario' : 'Ej: 5,50'} onChange={e => handleCostChange(e.target.value)} required disabled={saving} />
                                        </div>
                                        {formErrors.cost && <p className="text-xs text-red mt-1">{formErrors.cost}</p>}
                                        <p className="text-secondary text-xs mt-2">{isRestockMode ? 'Costo unitario base usado para margen, utilidad y stock.' : (editingProduct ? 'Costo real sin IVA. Este valor es la base para margen y utilidad.' : 'Ingresa el costo base sin IVA para calcular el precio correctamente.')}</p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Costo + IVA compra</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">$</span>
                                            <input
                                                type="text"
                                                name={`${formSessionKey}-cost-gross`}
                                                autoComplete="off"
                                                inputMode="decimal"
                                                className="border border-line rounded-lg pl-8 pr-4 py-3 w-full outline-none transition-all focus:border-black"
                                                value={displayedCostWithVat}
                                                onFocus={() => setActiveMoneyField('costWithVat')}
                                                onBlur={() => handleMoneyFieldBlur('costWithVat')}
                                                placeholder={editingProduct ? 'Costo final con IVA' : 'Ej: 6,33'}
                                                onChange={e => handleCostWithVatChange(e.target.value)}
                                                disabled={saving}
                                            />
                                        </div>
                                        <p className="text-secondary text-xs mt-2">
                                            Valor referencial con IVA de compra incluido. Si escribes aquí, el sistema recalcula automáticamente el costo base.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">IVA de compra (%)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name={`${formSessionKey}-purchase-tax-rate`}
                                                autoComplete="off"
                                                inputMode="decimal"
                                                className={getInputClass('purchaseInvoicePurchaseTaxRate', 'border rounded-lg px-4 py-3 w-full outline-none transition-all')}
                                                value={form.purchaseInvoice.purchaseTaxRate || ''}
                                                placeholder={systemVatRate.toFixed(2)}
                                                onChange={e => {
                                                    setCostWithVatManuallySet(false)
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        purchaseInvoice: {
                                                            ...prev.purchaseInvoice,
                                                            purchaseTaxRate: e.target.value,
                                                        },
                                                    }))
                                                    clearErrors('purchaseInvoicePurchaseTaxRate')
                                                }}
                                                disabled={saving}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">%</span>
                                        </div>
                                        {formErrors.purchaseInvoicePurchaseTaxRate && <p className="text-xs text-red mt-1">{formErrors.purchaseInvoicePurchaseTaxRate}</p>}
                                        <p className="text-secondary text-xs mt-2">
                                            Afecta solo el costo con IVA y la factura de compra. Si no lo defines, se usa el IVA del proveedor o el IVA del sistema.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Markup (%)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name={`${formSessionKey}-markup`}
                                                autoComplete="off"
                                                inputMode="decimal"
                                                className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all focus:border-black"
                                                value={markupInput}
                                                placeholder={parseLocalizedDecimal(form.cost) > 0 ? 'Ej: 35' : 'Primero define costo'}
                                                onChange={e => handleMarkupChange(e.target.value)}
                                                disabled={saving || parseLocalizedDecimal(form.cost) <= 0}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">%</span>
                                        </div>
                                        <p className="text-secondary text-xs mt-2">
                                            Recalcula el precio base y el PVP usando el costo actual.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">IVA de venta</label>
                                        <select
                                            className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black"
                                            value={form.taxExempt ? 'exempt' : 'taxed'}
                                            onChange={e => handleTaxExemptChange(e.target.value)}
                                            disabled={saving}
                                        >
                                            <option value="taxed">Grava IVA</option>
                                            <option value="exempt">Exento de IVA</option>
                                        </select>
                                        <p className="text-secondary text-xs mt-2">
                                            {form.taxExempt
                                                ? 'La venta de este producto es exenta. El IVA de compra se configura por separado.'
                                                : 'Se aplica el IVA configurado del sistema sobre el precio base para calcular el PVP de venta.'}
                                        </p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">{isRestockMode ? 'Unidades a ingresar' : 'Stock Disponible'}</label>
                                        <input
                                            type="number"
                                            name={`${formSessionKey}-quantity`}
                                            autoComplete="off"
                                            step="1"
                                            min="0"
                                            className={getInputClass('quantity', 'border rounded-lg px-4 py-3 w-full outline-none transition-all')}
                                            value={isRestockMode ? restockUnitsInput : form.quantity}
                                            placeholder={isRestockMode ? 'Ej: 24' : (editingProduct ? 'Stock disponible' : 'Ej: 12')}
                                            onChange={e => {
                                                if (isRestockMode) {
                                                    handleRestockUnitsChange(e.target.value)
                                                } else {
                                                    setForm((prev) => ({ ...prev, quantity: e.target.value }))
                                                    clearErrors('quantity')
                                                }
                                            }}
                                            required
                                            disabled={saving}
                                        />
                                        {formErrors.quantity && <p className="text-xs text-red mt-1">{formErrors.quantity}</p>}
                                        <p className="text-secondary text-xs mt-2">
                                            {isRestockMode
                                                ? `Stock actual: ${persistedProductQuantity.toLocaleString('es-EC')} uds. Resultado: ${requestedProductQuantity.toLocaleString('es-EC')} uds.`
                                                : (editingProduct ? 'Existencia actual del producto.' : 'Referencia editable. Cambia este ejemplo antes de guardar si necesitas otro stock inicial.')}
                                        </p>
                                        {editingProduct && !isRestockMode && !isDuplicateVariantMode && inventoryAdjustmentDelta !== 0 && (
                                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                                                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                                                        <div className="text-[10px] uppercase font-bold text-secondary">Stock actual</div>
                                                        <div className="text-lg font-bold">{persistedProductQuantity.toLocaleString('es-EC')} uds</div>
                                                    </div>
                                                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                                                        <div className="text-[10px] uppercase font-bold text-secondary">Ajuste</div>
                                                        <div className={`text-lg font-bold ${inventoryAdjustmentDelta > 0 ? 'text-emerald-700' : 'text-red'}`}>
                                                            {inventoryAdjustmentDelta > 0 ? '+' : ''}{inventoryAdjustmentDelta.toLocaleString('es-EC')} uds
                                                        </div>
                                                    </div>
                                                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                                                        <div className="text-[10px] uppercase font-bold text-secondary">Stock final</div>
                                                        <div className="text-lg font-bold">{requestedProductQuantity.toLocaleString('es-EC')} uds</div>
                                                    </div>
                                                </div>
                                                <label className="text-secondary text-xs uppercase font-bold mb-2 block">Motivo del ajuste</label>
                                                <input
                                                    list={`${formSessionKey}-adjustment-reasons`}
                                                    className={getInputClass('inventoryAdjustmentReason', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')}
                                                    value={inventoryAdjustmentReason}
                                                    onChange={(event) => {
                                                        setInventoryAdjustmentReason(event.target.value)
                                                        clearErrors('inventoryAdjustmentReason')
                                                    }}
                                                    placeholder="Ej: Conteo físico"
                                                    disabled={saving}
                                                />
                                                <datalist id={`${formSessionKey}-adjustment-reasons`}>
                                                    {INVENTORY_ADJUSTMENT_REASON_OPTIONS.map((reason) => (
                                                        <option key={reason} value={reason} />
                                                    ))}
                                                </datalist>
                                                {formErrors.inventoryAdjustmentReason && <p className="text-xs text-red mt-1">{formErrors.inventoryAdjustmentReason}</p>}
                                            </div>
                                        )}
                                    </div>
                                    {hasProductCostPreview && (
                                        <div className="md:col-span-2 rounded-xl border border-line bg-surface px-4 py-3 space-y-2">
                                            <div className="text-[10px] uppercase font-bold text-secondary">Vista previa por costo</div>
                                            <p className="text-xs text-secondary">Sugerido por costo: <span className="font-semibold text-black">${suggestedBasePriceLabel}</span> base / <span className="font-semibold text-black">${suggestedPvpPriceLabel}</span> {form.taxExempt ? 'final' : 'PVP'}</p>
                                            {costChangedForAutoPricing && (
                                                <p className={`text-xs ${automaticPriceWillIncrease ? 'text-orange-600' : 'text-green-700'}`}>Precio aplicado al guardar: <span className="font-semibold">${automaticAppliedBasePriceLabel}</span> base / <span className="font-semibold">${automaticAppliedPvpPriceLabel}</span> {form.taxExempt ? 'final' : 'PVP'}</p>
                                            )}
                                            {costChangedForAutoPricing && automaticPriceWillIncrease && <p className="text-[11px] text-orange-700">El backend subirá el precio al guardar para no quedar por debajo del piso calculado por costo.</p>}
                                            {costChangedForAutoPricing && !automaticPriceWillIncrease && <p className="text-[11px] text-green-700">Tu precio actual ya está por encima del piso automático. El backend no lo bajará.</p>}
                                            {!editingProduct && <p className="text-[11px] text-secondary">En productos nuevos esto se muestra como referencia; si quieres usarlo, copia ese precio antes de guardar.</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-2xl border border-line bg-surface p-4">
                                    <div className="text-xs uppercase font-bold text-secondary mb-3">Resultado financiero</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-white border border-line px-4 py-3">
                                            <div className="text-[10px] uppercase font-bold text-secondary">Utilidad bruta</div>
                                            <div className={`text-lg font-bold ${productGrossProfit < 0 ? 'text-red' : 'text-success'}`}>${productProfitLabel}</div>
                                            <div className="text-xs text-secondary">Base sin IVA</div>
                                        </div>
                                        <div className="rounded-xl bg-white border border-line px-4 py-3">
                                            <div className="text-[10px] uppercase font-bold text-secondary">Margen bruto</div>
                                            <div className="text-lg font-bold">{productGrossMarginLabel}%</div>
                                            <div className="text-xs text-secondary">Utilidad / precio base</div>
                                        </div>
                                        <div className="rounded-xl bg-white border border-line px-4 py-3">
                                            <div className="text-[10px] uppercase font-bold text-secondary">Markup</div>
                                            <div className="text-lg font-bold">{productMarkupLabel}%</div>
                                            <div className="text-xs text-secondary">Utilidad / costo</div>
                                        </div>
                                        <div className="rounded-xl bg-white border border-line px-4 py-3">
                                            <div className="text-[10px] uppercase font-bold text-secondary">IVA estimado</div>
                                            <div className="text-lg font-bold">${productVatAmountLabel}</div>
                                            <div className="text-xs text-secondary">{form.taxExempt ? 'Producto exento, sin recargo de IVA.' : 'Diferencia entre PVP y base'}</div>
                                        </div>
                                        <div className="rounded-xl bg-white border border-line px-4 py-3">
                                            <div className="text-[10px] uppercase font-bold text-secondary">Monto oferta</div>
                                            <div className={`text-lg font-bold ${productOfferAmount > 0 ? 'text-success' : 'text-secondary'}`}>${productOfferAmountLabel}</div>
                                            <div className="text-xs text-secondary">Precio mercado menos PVP</div>
                                        </div>
                                        <div className="rounded-xl bg-white border border-line px-4 py-3">
                                            <div className="text-[10px] uppercase font-bold text-secondary">% oferta</div>
                                            <div className={`text-lg font-bold ${productOfferPercent > 0 ? 'text-success' : 'text-secondary'}`}>{productOfferPercent.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%</div>
                                            <div className="text-xs text-secondary">Descuento visible en marketplace</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl border border-line bg-surface">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-4">
                                <div>
                                    <div className="text-xs uppercase font-bold text-secondary">Factura de compra</div>
                                <div className="text-sm font-semibold">{purchaseInvoicePanelTitle}</div>
                                </div>
                                <span className={`text-xs font-semibold ${requiresPurchaseInvoice ? 'text-orange-700' : requiresInventoryAdjustmentReason ? 'text-amber-700' : 'text-secondary'}`}>{purchaseInvoicePanelSupport}</span>
                            </div>
                            {requiresPurchaseInvoice ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-secondary text-xs uppercase font-bold mb-2 block">Número de factura</label><input className={getInputClass('purchaseInvoiceNumber', 'border rounded-lg px-4 py-3 w-full outline-none transition-all')} value={form.purchaseInvoice.invoiceNumber} onChange={e => { setForm({ ...form, purchaseInvoice: { ...form.purchaseInvoice, invoiceNumber: e.target.value } }); clearErrors('purchaseInvoiceNumber') }} disabled={saving} />{formErrors.purchaseInvoiceNumber && <p className="text-xs text-red mt-1">{formErrors.purchaseInvoiceNumber}</p>}</div>
                                    <div>
                                        <label className="text-secondary text-xs uppercase font-bold mb-2 block">Proveedor</label>
                                        <select
                                            className={getInputClass('purchaseInvoiceSupplierName', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')}
                                            value={form.purchaseInvoice.supplierName || ''}
                                            onChange={e => setPurchaseInvoiceSupplier(e.target.value)}
                                            disabled={saving || referenceSavingKey === 'suppliers'}
                                        >
                                            <option value="">{supplierOptions.length > 0 ? 'Selecciona proveedor' : 'No hay proveedores registrados'}</option>
                                            {supplierOptions.map((option) => (
                                                <option key={`purchase-supplier-option-${option.value}`} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        {formErrors.purchaseInvoiceSupplierName && <p className="text-xs text-red mt-1">{formErrors.purchaseInvoiceSupplierName}</p>}
                                        {formErrors.purchaseInvoiceSupplierDocument && <p className="text-xs text-red mt-1">{formErrors.purchaseInvoiceSupplierDocument}</p>}
                                        {renderCreateReferenceInline('suppliers', 'proveedor', setPurchaseInvoiceSupplier)}
                                    </div>
                                    <div><label className="text-secondary text-xs uppercase font-bold mb-2 block">Fecha de factura</label><input type="date" className={getInputClass('purchaseInvoiceIssuedAt', 'border rounded-lg px-4 py-3 w-full outline-none transition-all')} value={form.purchaseInvoice.issuedAt} onChange={e => { setForm({ ...form, purchaseInvoice: { ...form.purchaseInvoice, issuedAt: e.target.value } }); clearErrors('purchaseInvoiceIssuedAt') }} disabled={saving} />{formErrors.purchaseInvoiceIssuedAt && <p className="text-xs text-red mt-1">{formErrors.purchaseInvoiceIssuedAt}</p>}</div>
                                    <div>
                                        <label className="text-secondary text-xs uppercase font-bold mb-2 block">IVA compra (%)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name={`${formSessionKey}-purchase-invoice-tax-rate`}
                                                autoComplete="off"
                                                inputMode="decimal"
                                                className={getInputClass('purchaseInvoicePurchaseTaxRate', 'border rounded-lg px-4 py-3 w-full outline-none transition-all')}
                                                value={form.purchaseInvoice.purchaseTaxRate || ''}
                                                placeholder={systemVatRate.toFixed(2)}
                                                onChange={e => {
                                                    setCostWithVatManuallySet(false)
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        purchaseInvoice: {
                                                            ...prev.purchaseInvoice,
                                                            purchaseTaxRate: e.target.value,
                                                        },
                                                    }))
                                                    clearErrors('purchaseInvoicePurchaseTaxRate')
                                                }}
                                                disabled={saving}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">%</span>
                                        </div>
                                        {formErrors.purchaseInvoicePurchaseTaxRate && <p className="text-xs text-red mt-1">{formErrors.purchaseInvoicePurchaseTaxRate}</p>}
                                        <p className="text-secondary text-xs mt-2">
                                            Se usa para el costo de compra y el total de la factura. Si no lo defines, se toma del proveedor o del IVA del sistema.
                                        </p>
                                    </div>
                                    <div className="md:col-span-2 rounded-xl border border-line bg-white p-4">
                                        <div className="text-[11px] uppercase font-bold text-secondary mb-3">Proveedor seleccionado</div>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                                            <div>
                                                <div className="text-secondary text-[11px] uppercase font-bold mb-1">RUC o documento</div>
                                                <div className="font-semibold break-words">
                                                    {selectedPurchaseSupplier?.document || form.purchaseInvoice.supplierDocument || 'Crea el proveedor con RUC o documento.'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-secondary text-[11px] uppercase font-bold mb-1">Contacto</div>
                                                <div className="font-semibold break-words">{selectedPurchaseSupplier?.contactName || 'No registrado'}</div>
                                            </div>
                                            <div>
                                                <div className="text-secondary text-[11px] uppercase font-bold mb-1">Correo</div>
                                                <div className="font-semibold break-words">{selectedPurchaseSupplier?.email || 'No registrado'}</div>
                                            </div>
                                            <div>
                                                <div className="text-secondary text-[11px] uppercase font-bold mb-1">Teléfono</div>
                                                <div className="font-semibold break-words">{selectedPurchaseSupplier?.phone || 'No registrado'}</div>
                                            </div>
                                            <div>
                                                <div className="text-secondary text-[11px] uppercase font-bold mb-1">IVA compra</div>
                                                <div className="font-semibold break-words">
                                                    {getSupplierPurchaseTaxRateLabel(selectedPurchaseSupplier, `IVA compra ${purchaseTaxRateValue.toFixed(2)}%`)}
                                                </div>
                                            </div>
                                        </div>
                                        {selectedPurchaseSupplier?.address && (
                                            <div className="mt-3 text-xs text-secondary break-words">
                                                Dirección: {selectedPurchaseSupplier.address}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-2"><label className="text-secondary text-xs uppercase font-bold mb-2 block">Notas de compra</label><textarea className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all min-h-[96px]" value={form.purchaseInvoice.notes} onChange={e => setForm({ ...form, purchaseInvoice: { ...form.purchaseInvoice, notes: e.target.value } })} disabled={saving} /></div>
                                </div>
                            ) : (
                                <p className="text-sm text-secondary">Puedes editar precio, costo o contenido del producto sin capturar factura, siempre que no aumentes el stock disponible.</p>
                            )}
                        </div>

                        {!isDuplicateVariantMode && (
                            <div className="rounded-xl border border-line bg-surface p-5 space-y-5">
                                <div className="text-sm font-semibold">Clasificación y visibilidad</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Tipo de producto</label>
                                        <select required className={getInputClass('productType', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')} value={form.productType} onChange={(e) => handleProductTypeChange(e.target.value)} disabled={saving || isRestockMode}>
                                            <option value="">Selecciona tipo</option>
                                            {PRODUCT_TYPE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        {formErrors.productType && <p className="text-xs text-red mt-1">{formErrors.productType}</p>}
                                        <p className="text-secondary text-xs mt-2">El tipo define los campos específicos y la categoría principal visible en tienda.</p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Categoría principal visible</label>
                                        {renderCreatableReferenceSelect({
                                            key: 'categories',
                                            value: form.category,
                                            options: categoryOptions,
                                            onChange: handlePrimaryCategoryChange,
                                            placeholder: 'Selecciona categoría',
                                            createLabel: 'categoría',
                                            className: 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black disabled:bg-surface disabled:text-secondary',
                                            disabled: saving || !form.productType || isRestockMode,
                                            hideCreateAction: true,
                                        })}
                                        {formErrors.category && <p className="text-xs text-red mt-1">{formErrors.category}</p>}
                                        <p className="text-secondary text-xs mt-2">
                                            {primaryCategory
                                                ? `Visible como ${primaryCategory}. Puedes crear más categorías aquí mismo.`
                                                : 'Elige primero el tipo de producto y luego la categoría visible.'}
                                        </p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="text-secondary text-xs uppercase font-bold mb-2">Categorías adicionales</div>
                                        <div className="flex flex-wrap gap-2">
                                            {categoryOptions
                                                .filter((category) => getCategoryIdentity(category) !== getCategoryIdentity(primaryCategory))
                                                .map((category) => {
                                                    const isSelected = selectedAdditionalCategories.some(
                                                        (selectedCategory) => getCategoryIdentity(selectedCategory) === getCategoryIdentity(category)
                                                    )
                                                    return (
                                                        <button
                                                            key={`additional-category-${category}`}
                                                            type="button"
                                                            className={`px-3 py-2 rounded-full border text-sm font-semibold transition-all ${
                                                                isSelected
                                                                    ? 'bg-black text-white border-black'
                                                                    : 'bg-white border-line hover:border-black'
                                                            }`}
                                                            onClick={() => toggleAdditionalCategory(category)}
                                                            disabled={saving || !form.productType || isRestockMode}
                                                        >
                                                            {category}
                                                        </button>
                                                    )
                                                })}
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3">
                                            <select
                                                className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black disabled:bg-surface disabled:text-secondary"
                                                value=""
                                                onChange={(event) => {
                                                    if (event.target.value) {
                                                        toggleAdditionalCategory(event.target.value)
                                                    }
                                                }}
                                                disabled={saving || !form.productType || isRestockMode}
                                            >
                                                <option value="">Seleccionar categoría adicional</option>
                                                {categoryOptions
                                                    .filter((category) => getCategoryIdentity(category) !== getCategoryIdentity(primaryCategory))
                                                    .map((category) => (
                                                        <option key={`additional-category-select-${category}`} value={category}>{category}</option>
                                                    ))}
                                            </select>
                                            <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm text-secondary">
                                                {selectedAdditionalCategories.length > 0
                                                    ? `${selectedAdditionalCategories.length} adicional${selectedAdditionalCategories.length === 1 ? '' : 'es'} seleccionada${selectedAdditionalCategories.length === 1 ? '' : 's'}`
                                                    : 'Sin categorías adicionales'}
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            {renderCreateReferenceInline('categories', 'categoría', (value) => {
                                                if (!form.category) {
                                                    handlePrimaryCategoryChange(value)
                                                    return
                                                }
                                                toggleAdditionalCategory(value)
                                            })}
                                        </div>
                                        <p className="text-secondary text-xs mt-2">La categoría principal define dónde se muestra primero. Las adicionales solo se usan cuando el producto debe aparecer en más secciones.</p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Publicado en tienda web</label>
                                        <select className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black disabled:bg-surface disabled:text-secondary" value={form.published ? 'yes' : 'no'} onChange={e => setForm({ ...form, published: e.target.value === 'yes' })} disabled={saving || !publicationEligible || isRestockMode}>
                                            <option value="yes">Sí, mostrar en el sitio</option><option value="no">No, ocultar del sitio</option>
                                        </select>
                                        <p className="text-secondary text-xs mt-2">
                                            {publicationEligible
                                                ? 'Si está en no, el producto seguirá en el panel pero no aparecerá en la web pública.'
                                                : 'Solo se puede publicar cuando el producto tiene precio y existencia mayor a 0.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isDuplicateVariantMode && !isRestockMode && (
                            <div className="p-5 rounded-xl border border-line bg-surface">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                                    <div>
                                        <div className="text-xs uppercase font-bold text-secondary">SEO y búsqueda</div>
                                        <div className="text-sm text-secondary mt-1">Score de publicación: <span className={`font-bold ${seoScore >= 85 ? 'text-emerald-700' : seoScore >= 65 ? 'text-amber-700' : 'text-red'}`}>{seoScore}%</span></div>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-black px-4 py-2 text-sm font-semibold bg-white hover:bg-black hover:text-white disabled:opacity-50"
                                        onClick={applySeoSuggestions}
                                        disabled={saving}
                                    >
                                        <Icon.MagicWand size={16} />
                                        Generar SEO
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Slug y canonical</label>
                                        <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm break-all">{seoCanonicalPreview}</div>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Título SEO</label>
                                        <input
                                            type="text"
                                            className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black"
                                            value={String(form.attributes?.seoTitle || '')}
                                            placeholder={suggestedSeoTitle}
                                            onChange={(e) => setAttribute('seoTitle', e.target.value)}
                                            disabled={saving}
                                            maxLength={80}
                                        />
                                        <p className="text-xs text-secondary mt-1">{seoTitleValue.length}/70</p>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Descripción SEO</label>
                                        <textarea
                                            className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black"
                                            rows={3}
                                            value={String(form.attributes?.seoDescription || '')}
                                            placeholder={suggestedSeoDescription}
                                            onChange={(e) => setAttribute('seoDescription', e.target.value)}
                                            disabled={saving}
                                            maxLength={170}
                                        />
                                        <p className="text-xs text-secondary mt-1">{seoDescriptionValue.length}/160</p>
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Alt base de imágenes</label>
                                        <input
                                            type="text"
                                            className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black"
                                            value={String(form.attributes?.seoImageAlt || '')}
                                            placeholder={suggestedSeoAlt}
                                            onChange={(e) => setAttribute('seoImageAlt', e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-secondary text-sm font-bold uppercase mb-2 block">Palabras de búsqueda</label>
                                        <input
                                            type="text"
                                            className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black"
                                            value={String(form.attributes?.seoSearchTerms || '')}
                                            placeholder={suggestedSearchTerms}
                                            onChange={(e) => setAttribute('seoSearchTerms', e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {seoChecks.map((item) => (
                                        <span
                                            key={item.label}
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${item.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-amber-700 border border-amber-200'}`}
                                        >
                                            {item.complete ? 'OK' : 'Pendiente'} · {item.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isDuplicateVariantMode && !isRestockMode && (
                        <div className="p-5 rounded-xl border border-line bg-surface">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-xs uppercase font-bold text-secondary">Imágenes del producto</div>
                                <span className="text-xs text-secondary">Usa miniaturas para listado y fotos grandes para la ficha.</span>
                            </div>
                            {(formErrors.thumbImages || formErrors.galleryImages) && (
                                <div className="mb-4 space-y-1">
                                    {formErrors.thumbImages && <p className="text-xs text-red">{formErrors.thumbImages}</p>}
                                    {formErrors.galleryImages && <p className="text-xs text-red">{formErrors.galleryImages}</p>}
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <div className="text-sm font-semibold mb-3">Miniaturas (listado)</div>
                                    <div className="space-y-3">
                                            {(form.thumbImages || []).map((img: any, idx: number) => {
                                                const key = `thumb-${idx}`
                                                const totalImages = (form.thumbImages || []).length
                                                return (
                                                    <div key={key} className="p-3 rounded-xl border border-line bg-white">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                            <div className="w-16 h-16 rounded-lg bg-surface border border-line overflow-hidden flex items-center justify-center">
                                                                {img.url ? <Image src={img.url} alt={String(img.altText || seoAltValue || `Miniatura ${idx + 1}`)} width={64} height={64} unoptimized className="w-full h-full object-cover" /> : <span className="text-[10px] text-secondary">Sin imagen</span>}
                                                            </div>
                                                            <div className="flex sm:flex-col items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    className="h-8 w-8 rounded-full border border-line bg-white text-secondary flex items-center justify-center transition-colors hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-line disabled:hover:text-secondary"
                                                                    onClick={() => moveImageEntry('thumb', idx, -1)}
                                                                    disabled={saving || idx === 0}
                                                                    aria-label={`Subir miniatura ${idx + 1}`}
                                                                    title="Subir"
                                                                >
                                                                    <Icon.CaretUp size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="h-8 w-8 rounded-full border border-line bg-white text-secondary flex items-center justify-center transition-colors hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-line disabled:hover:text-secondary"
                                                                    onClick={() => moveImageEntry('thumb', idx, 1)}
                                                                    disabled={saving || idx >= totalImages - 1}
                                                                    aria-label={`Bajar miniatura ${idx + 1}`}
                                                                    title="Bajar"
                                                                >
                                                                    <Icon.CaretDown size={16} />
                                                                </button>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                                    <span className="text-[11px] font-semibold uppercase text-secondary">Posición {idx + 1}</span>
                                                                    {idx === 0 && (
                                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Principal</span>
                                                                    )}
                                                                </div>
                                                                <input type="file" accept="image/jpeg,image/png,image/webp" className="border border-line rounded-lg px-3 py-2 w-full text-sm" onChange={(e) => handleImageFileChange('thumb', idx, e.target.files?.[0])} disabled={saving} />
                                                                <input
                                                                    type="text"
                                                                className="mt-2 border border-line rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-black"
                                                                value={String(img.altText || '')}
                                                                placeholder={seoAltValue || 'Alt de miniatura'}
                                                                onChange={(e) => setImageAltText('thumb', idx, e.target.value)}
                                                                disabled={saving}
                                                            />
                                                            <div className="text-xs text-secondary mt-1">
                                                                {img.width && img.height ? `${img.width}x${img.height}px` : `${requiredImageSizes.thumb.width}x${requiredImageSizes.thumb.height}px`}
                                                                {imageUploading[key] && <span className="ml-2 text-primary font-semibold">Subiendo...</span>}
                                                            </div>
                                                        </div>
                                                        <button type="button" className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50" onClick={() => removeImageEntry('thumb', idx)} disabled={saving}>Quitar</button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <button type="button" className="mt-3 text-sm text-primary font-semibold disabled:opacity-50" onClick={() => addImageEntry('thumb')} disabled={saving}>+ Agregar miniatura</button>
                                    <div className="text-xs text-secondary mt-2">Miniatura para listados y tarjetas. Proporcion fija recomendada: 4:5 en 640x800. El sistema la centra sin deformarla y esa relacion se mantiene bien en movil y escritorio.</div>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold mb-3">Imágenes grandes (ficha)</div>
                                    <input
                                        ref={galleryMultiInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleGalleryFilesChange(e.target.files)}
                                        disabled={saving}
                                    />
                                    <div className="space-y-3">
                                            {(form.galleryImages || []).map((img: any, idx: number) => {
                                                const key = `gallery-${idx}`
                                                const totalImages = (form.galleryImages || []).length
                                                return (
                                                    <div key={key} className="p-3 rounded-xl border border-line bg-white">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                            <div className="w-16 h-16 rounded-lg bg-surface border border-line overflow-hidden flex items-center justify-center">
                                                                {img.url ? <Image src={img.url} alt={String(img.altText || seoAltValue || `Imagen ficha ${idx + 1}`)} width={64} height={64} unoptimized className="w-full h-full object-cover" /> : <span className="text-[10px] text-secondary">Sin imagen</span>}
                                                            </div>
                                                            <div className="flex sm:flex-col items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    className="h-8 w-8 rounded-full border border-line bg-white text-secondary flex items-center justify-center transition-colors hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-line disabled:hover:text-secondary"
                                                                    onClick={() => moveImageEntry('gallery', idx, -1)}
                                                                    disabled={saving || idx === 0}
                                                                    aria-label={`Subir imagen grande ${idx + 1}`}
                                                                    title="Subir"
                                                                >
                                                                    <Icon.CaretUp size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="h-8 w-8 rounded-full border border-line bg-white text-secondary flex items-center justify-center transition-colors hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-line disabled:hover:text-secondary"
                                                                    onClick={() => moveImageEntry('gallery', idx, 1)}
                                                                    disabled={saving || idx >= totalImages - 1}
                                                                    aria-label={`Bajar imagen grande ${idx + 1}`}
                                                                    title="Bajar"
                                                                >
                                                                    <Icon.CaretDown size={16} />
                                                                </button>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                                    <span className="text-[11px] font-semibold uppercase text-secondary">Posición {idx + 1}</span>
                                                                    {idx === 0 && (
                                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Principal</span>
                                                                    )}
                                                                </div>
                                                                <input type="file" accept="image/jpeg,image/png,image/webp" className="border border-line rounded-lg px-3 py-2 w-full text-sm" onChange={(e) => handleImageFileChange('gallery', idx, e.target.files?.[0])} disabled={saving} />
                                                                <input
                                                                    type="text"
                                                                className="mt-2 border border-line rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-black"
                                                                value={String(img.altText || '')}
                                                                placeholder={seoAltValue || 'Alt de imagen de ficha'}
                                                                onChange={(e) => setImageAltText('gallery', idx, e.target.value)}
                                                                disabled={saving}
                                                            />
                                                            <div className="text-xs text-secondary mt-1">
                                                                {img.width && img.height ? `${img.width}x${img.height}px` : `${requiredImageSizes.gallery.width}x${requiredImageSizes.gallery.height}px`}
                                                                {imageUploading[key] && <span className="ml-2 text-primary font-semibold">Subiendo...</span>}
                                                            </div>
                                                        </div>
                                                        <button type="button" className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50" onClick={() => removeImageEntry('gallery', idx)} disabled={saving}>Quitar</button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            className="text-sm text-primary font-semibold disabled:opacity-50"
                                            onClick={() => galleryMultiInputRef.current?.click()}
                                            disabled={saving}
                                        >
                                            + Cargar varias imágenes grandes
                                        </button>
                                        <button
                                            type="button"
                                            className="text-sm text-secondary font-semibold disabled:opacity-50"
                                            onClick={() => addImageEntry('gallery')}
                                            disabled={saving}
                                        >
                                            + Agregar un espacio manual
                                        </button>
                                        {imageUploading['gallery-batch'] && (
                                            <span className="text-xs text-primary font-semibold">Subiendo lote...</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-secondary mt-2">Imagen principal para la ficha del producto. Proporcion fija recomendada: 4:5 en 1200x1500. Mantiene detalle alto sin cargar de mas las renderizaciones.</div>
                                </div>
                            </div>
                        </div>
                        )}

                        {form.productType && renderUnifiedProductAttributes()}

                        {showLegacyTypeAttributeBlocks && form.productType === 'Alimento' && (
                            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                                <div className="text-sm font-semibold">Atributos de alimento</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isDuplicateVariantMode ? (
                                    <>
                                        {renderDuplicateVariantSelector()}
                                    </>
                                ) : (
                                    <>
                                    {renderCreatableReferenceSelect({
                                        key: 'sizes',
                                        value: form.attributes?.size || '',
                                        options: sizeOptions,
                                        onChange: (value) => { setAttribute('size', value); clearErrors('size') },
                                        placeholder: sizeOptions.length > 0 ? 'Tamaño' : 'No hay tallas o tamaños registrados',
                                        createLabel: 'talla o tamaño',
                                        className: getInputClass('size', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                        disabled: saving,
                                    })}
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Peso / contenido</label>
                                            {renderCreatableReferenceSelect({
                                                key: 'weights',
                                                value: form.attributes?.weight || '',
                                                options: weightOptions,
                                                onChange: (value) => { setAttribute('weight', value); clearErrors('weight') },
                                                placeholder: weightOptions.length > 0 ? 'Selecciona peso o contenido' : 'Crear o seleccionar peso',
                                                createLabel: 'peso o contenido',
                                                className: getInputClass('weight', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                                disabled: saving,
                                                forceCreateInline: true,
                                                createPlaceholder: 'Ej: 2 kg',
                                            })}
                                            <p className="text-secondary text-xs mt-2">Si no aparece el peso exacto, créalo aquí y quedará disponible en Atributos de producto.</p>
                                        </div>
                                        {renderCreatableReferenceSelect({
                                            key: 'flavors',
                                            value: form.attributes?.flavor || '',
                                            options: flavorOptions,
                                            onChange: (value) => setAttribute('flavor', value),
                                            placeholder: flavorOptions.length > 0 ? 'Sabor' : 'No hay sabores registrados',
                                            createLabel: 'sabor',
                                            disabled: saving,
                                        })}
                                        {renderCreatableReferenceSelect({
                                            key: 'ageRanges',
                                            value: form.attributes?.age || '',
                                            options: ageRangeOptions,
                                            onChange: (value) => setAttribute('age', value),
                                            placeholder: ageRangeOptions.length > 0 ? 'Edad' : 'No hay rangos de edad registrados',
                                            createLabel: 'edad',
                                            disabled: saving,
                                        })}
                                        <div>
                                            <select className={getInputClass('species', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')} value={form.attributes?.species || ''} onChange={e => setSpeciesAttribute(e.target.value)} disabled={saving}>
                                                <option value="">Mascota</option>
                                                {PET_SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                            {formErrors.species && <p className="text-xs text-red mt-1">{formErrors.species}</p>}
                                        </div>
                                        <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder="Ingredientes" value={form.attributes?.ingredients || ''} onChange={e => setAttribute('ingredients', e.target.value)} />
                                    </>
                                )}
                                <div className="md:col-span-2">
                                    {isDuplicateVariantMode
                                        ? renderReferenceCatalogHints(duplicateVariantReferenceItems, duplicateVariantReferenceEmptyText)
                                        : renderReferenceCatalogHints([
                                            { key: 'sizes', options: sizeOptions },
                                            { key: 'weights', options: weightOptions },
                                            { key: 'flavors', options: flavorOptions },
                                            { key: 'ageRanges', options: ageRangeOptions },
                                        ])}
                                </div>
                            </div>
                            </div>
                        )}
                        {showLegacyTypeAttributeBlocks && form.productType === 'ropa' && (
                            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                                <div className="text-sm font-semibold">Atributos de ropa</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isDuplicateVariantMode ? (
                                    renderDuplicateVariantSelector()
                                ) : (
                                    <>
                                        {renderCreatableReferenceSelect({
                                            key: 'sizes',
                                            value: form.attributes?.size || '',
                                            options: sizeOptions,
                                            onChange: (value) => { setAttribute('size', value); clearErrors('size') },
                                            placeholder: sizeOptions.length > 0 ? 'Talla' : 'No hay tallas registradas',
                                            createLabel: 'talla',
                                            className: getInputClass('size', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                            disabled: saving,
                                        })}
                                        {renderCreatableReferenceSelect({
                                            key: 'materials',
                                            value: form.attributes?.material || '',
                                            options: materialOptions,
                                            onChange: (value) => setAttribute('material', value),
                                            placeholder: materialOptions.length > 0 ? 'Material' : 'No hay materiales registrados',
                                            createLabel: 'material',
                                            disabled: saving,
                                        })}
                                        {renderCreatableReferenceSelect({
                                            key: 'colors',
                                            value: form.attributes?.color || '',
                                            options: colorOptions,
                                            onChange: (value) => setAttribute('color', value),
                                            placeholder: colorOptions.length > 0 ? 'Color' : 'No hay colores registrados',
                                            createLabel: 'color',
                                            disabled: saving,
                                        })}
                                        <select className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white" value={form.attributes?.gender || ''} onChange={e => setAttribute('gender', e.target.value)} disabled={saving}>
                                            <option value="">Género de la prenda</option>
                                            {APPAREL_GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                        <div>
                                            <select className={getInputClass('species', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')} value={form.attributes?.species || ''} onChange={e => setSpeciesAttribute(e.target.value)} disabled={saving}>
                                                <option value="">Mascota</option>
                                                {PET_SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                            {formErrors.species && <p className="text-xs text-red mt-1">{formErrors.species}</p>}
                                            <p className="text-secondary text-xs mt-2">Este campo controla en qué secciones públicas aparece la prenda: Perros, Gatos o ambas.</p>
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2">
                                    {isDuplicateVariantMode
                                        ? renderReferenceCatalogHints(duplicateVariantReferenceItems, duplicateVariantReferenceEmptyText)
                                        : renderReferenceCatalogHints([
                                            { key: 'sizes', options: sizeOptions },
                                            { key: 'materials', options: materialOptions },
                                            { key: 'colors', options: colorOptions },
                                        ])}
                                </div>
                            </div>
                            </div>
                        )}
                        {showLegacyTypeAttributeBlocks && form.productType === 'accesorios' && (
                            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                                <div className="text-sm font-semibold">Atributos de accesorios</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isDuplicateVariantMode ? (
                                    renderDuplicateVariantSelector()
                                ) : (
                                    <>
                                        {renderCreatableReferenceSelect({
                                            key: 'sizes',
                                            value: form.attributes?.size || '',
                                            options: sizeOptions,
                                            onChange: (value) => { setAttribute('size', value); clearErrors('size') },
                                            placeholder: sizeOptions.length > 0 ? 'Tamaño' : 'No hay tallas o tamaños registrados',
                                            createLabel: 'talla o tamaño',
                                            className: getInputClass('size', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                            disabled: saving,
                                        })}
                                        {renderCreatableReferenceSelect({
                                            key: 'materials',
                                            value: form.attributes?.material || '',
                                            options: materialOptions,
                                            onChange: (value) => setAttribute('material', value),
                                            placeholder: materialOptions.length > 0 ? 'Material' : 'No hay materiales registrados',
                                            createLabel: 'material',
                                            disabled: saving,
                                        })}
                                        {renderCreatableReferenceSelect({
                                            key: 'colors',
                                            value: form.attributes?.color || '',
                                            options: colorOptions,
                                            onChange: (value) => setAttribute('color', value),
                                            placeholder: colorOptions.length > 0 ? 'Color' : 'No hay colores registrados',
                                            createLabel: 'color',
                                            disabled: saving,
                                        })}
                                        {renderCreatableReferenceSelect({
                                            key: 'usages',
                                            value: form.attributes?.usage || '',
                                            options: usageOptions,
                                            onChange: (value) => setAttribute('usage', value),
                                            placeholder: usageOptions.length > 0 ? 'Uso' : 'No hay usos registrados',
                                            createLabel: 'uso',
                                            disabled: saving,
                                        })}
                                        <div>
                                            <select className={getInputClass('species', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')} value={form.attributes?.species || ''} onChange={e => setSpeciesAttribute(e.target.value)} disabled={saving}>
                                                <option value="">Mascota</option>
                                                {PET_SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                            {formErrors.species && <p className="text-xs text-red mt-1">{formErrors.species}</p>}
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2">
                                    {isDuplicateVariantMode
                                        ? renderReferenceCatalogHints(duplicateVariantReferenceItems, duplicateVariantReferenceEmptyText)
                                        : renderReferenceCatalogHints([
                                            { key: 'sizes', options: sizeOptions },
                                            { key: 'materials', options: materialOptions },
                                            { key: 'colors', options: colorOptions },
                                            { key: 'usages', options: usageOptions },
                                        ])}
                                </div>
                            </div>
                            </div>
                        )}
                        {showLegacyTypeAttributeBlocks && form.productType === 'cuidado' && (
                            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                                <div>
                                    <div className="text-sm font-semibold">Presentación y medidas</div>
                                    <p className="text-secondary text-xs mt-1">
                                        Usa peso/contenido para productos como arena, shampoo o suplementos. Usa rango recomendado solo cuando el producto aplica por peso de la mascota.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isDuplicateVariantMode ? (
                                    renderDuplicateVariantSelector()
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Presentación</label>
                                            {renderCreatableReferenceSelect({
                                                key: 'presentations',
                                                value: form.attributes?.presentation || '',
                                                options: presentationOptions,
                                                onChange: (value) => { setAttribute('presentation', value); clearErrors('presentation') },
                                                placeholder: presentationOptions.length > 0 ? 'Selecciona presentación' : 'Crear o seleccionar presentación',
                                                createLabel: 'presentación',
                                                className: getInputClass('presentation', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                                disabled: saving,
                                            })}
                                            <p className="text-secondary text-xs mt-2">Ej: Bolsa, pipeta, frasco, tableta, spray.</p>
                                        </div>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Peso neto / contenido</label>
                                            {renderCreatableReferenceSelect({
                                                key: 'weights',
                                                value: form.attributes?.weight || '',
                                                options: weightOptions,
                                                onChange: (value) => { setAttribute('weight', value); clearErrors('weight') },
                                                placeholder: weightOptions.length > 0 ? 'Selecciona peso o contenido' : 'Crear o seleccionar peso',
                                                createLabel: 'peso o contenido',
                                                className: getInputClass('weight', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white'),
                                                disabled: saving,
                                                forceCreateInline: true,
                                                createPlaceholder: 'Ej: 2 kg',
                                            })}
                                            {formErrors.weight && <p className="text-xs text-red mt-1">{formErrors.weight}</p>}
                                            <p className="text-secondary text-xs mt-2">Este es el dato que verá el cliente como presentación del producto. Si falta 2 kg u otra medida, créala aquí y quedará seleccionada.</p>
                                        </div>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Rango recomendado</label>
                                            <input
                                                className={getInputClass('range', 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')}
                                                placeholder="Ej: perros 10 a 20 kg"
                                                value={form.attributes?.range || ''}
                                                onChange={e => { setAttribute('range', e.target.value); clearErrors('range') }}
                                                disabled={saving}
                                            />
                                            <p className="text-secondary text-xs mt-2">Úsalo para antiparasitarios, medicina o dosis por peso de mascota.</p>
                                        </div>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Dosis o concentración</label>
                                            {renderCreatableReferenceSelect({
                                                key: 'dosages',
                                                value: form.attributes?.dosage || '',
                                                options: dosageOptions,
                                                onChange: (value) => { setAttribute('dosage', value); clearErrors('dosage') },
                                                placeholder: dosageOptions.length > 0 ? 'Selecciona dosis o concentración' : 'Crear o seleccionar dosis',
                                                createLabel: 'dosis o concentración',
                                                className: 'border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white focus:border-black',
                                                disabled: saving,
                                            })}
                                        </div>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Ingrediente activo</label>
                                            {renderCreatableReferenceSelect({
                                                key: 'activeIngredients',
                                                value: form.attributes?.activeIngredient || '',
                                                options: activeIngredientOptions,
                                                onChange: (value) => setAttribute('activeIngredient', value),
                                                placeholder: activeIngredientOptions.length > 0 ? 'Selecciona ingrediente' : 'Crear o seleccionar ingrediente',
                                                createLabel: 'ingrediente',
                                                disabled: saving,
                                            })}
                                        </div>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Uso</label>
                                            {renderCreatableReferenceSelect({
                                                key: 'usages',
                                                value: form.attributes?.usage || '',
                                                options: usageOptions,
                                                onChange: (value) => setAttribute('usage', value),
                                                placeholder: usageOptions.length > 0 ? 'Selecciona uso' : 'Crear o seleccionar uso',
                                                createLabel: 'uso',
                                                disabled: saving,
                                            })}
                                        </div>
                                        <div>
                                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Mascota</label>
                                            <select className={getInputClass('species', 'border rounded-lg px-4 py-3 w-full outline-none transition-all bg-white')} value={form.attributes?.species || ''} onChange={e => setSpeciesAttribute(e.target.value)} disabled={saving}>
                                                <option value="">Selecciona mascota</option>
                                                {PET_SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                            {formErrors.species && <p className="text-xs text-red mt-1">{formErrors.species}</p>}
                                            <p className="text-secondary text-xs mt-2">Úsalo para que el medicamento o cuidado aparezca en la especie correcta.</p>
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2">
                                    {isDuplicateVariantMode
                                        ? renderReferenceCatalogHints(duplicateVariantReferenceItems, duplicateVariantReferenceEmptyText)
                                        : renderReferenceCatalogHints([
                                            { key: 'presentations', options: presentationOptions },
                                            { key: 'weights', options: weightOptions },
                                            { key: 'dosages', options: dosageOptions },
                                            { key: 'activeIngredients', options: activeIngredientOptions },
                                            { key: 'usages', options: usageOptions },
                                        ], 'Crea aquí solo los valores que falten en los selectores de esta sección.')}
                                </div>
                            </div>
                            </div>
                        )}

                        {form.productType === 'ropa' && !isDuplicateVariantMode && (
                            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold">Guía de tallas</div>
                                        <p className="text-secondary text-xs mt-1">
                                            Se abre desde el enlace <span className="font-semibold text-black">“Guía de tallas”</span> junto al selector de talla en la ficha del producto y en la vista rápida.
                                            Usa medidas reales de la mascota para que el cliente pueda elegir mejor.
                                        </p>
                                    </div>
                                    <button type="button" className="text-sm text-primary font-semibold disabled:opacity-50" onClick={addSizeGuideRow} disabled={saving}>+ Agregar talla</button>
                                </div>

                                {sizeGuideRows.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-line bg-white px-4 py-5 text-sm text-secondary">
                                        Aún no agregas tallas. Usa “Agregar talla” para cargar cuello, pecho, largo y peso recomendado.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sizeGuideRows.map((row, index) => (
                                            <div key={`size-guide-row-${index}`} className="rounded-xl border border-line bg-white p-4">
                                                <p className="text-secondary text-xs mb-3">
                                                    Esta fila se mostrará como una opción de talla y sus medidas dentro del modal público de guía de tallas.
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                    <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder="Talla" value={row.size} onChange={e => updateSizeGuideRow(index, 'size', e.target.value)} disabled={saving} />
                                                    <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder="Cuello. Ej: 24-28 cm" value={row.neck} onChange={e => updateSizeGuideRow(index, 'neck', e.target.value)} disabled={saving} />
                                                    <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder="Pecho. Ej: 38-44 cm" value={row.chest} onChange={e => updateSizeGuideRow(index, 'chest', e.target.value)} disabled={saving} />
                                                    <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder="Largo. Ej: 30-34 cm" value={row.length} onChange={e => updateSizeGuideRow(index, 'length', e.target.value)} disabled={saving} />
                                                    <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder="Peso. Ej: 5-7 kg" value={row.weight} onChange={e => updateSizeGuideRow(index, 'weight', e.target.value)} disabled={saving} />
                                                </div>
                                                <div className="mt-3 flex justify-end">
                                                    <button type="button" className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50" onClick={() => removeSizeGuideRow(index)} disabled={saving}>Quitar talla</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="text-secondary text-xs uppercase font-bold mb-2 block">Nota adicional</label>
                                    <textarea className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all min-h-[88px]" placeholder="Ej: Si tu mascota está entre dos tallas, elige la mayor." value={form.attributes?.sizeGuideNotes || ''} onChange={e => setAttribute('sizeGuideNotes', e.target.value)} disabled={saving} />
                                    <p className="text-secondary text-xs mt-2">
                                        Esta nota aparece arriba de la tabla dentro del modal público de guía de tallas.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
                            <div className="text-sm font-semibold">Datos operativos</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-secondary text-xs uppercase font-bold mb-2 block">SKU</label>
                                <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder={suggestedSku || 'Ej: CAM-DEP-XL-AZUL'} value={form.attributes?.sku || ''} onChange={e => setAttribute('sku', e.target.value)} disabled={saving} />
                                {formErrors.sku && <p className="text-xs text-red mt-1">{formErrors.sku}</p>}
                                <p className="text-secondary text-xs mt-2">
                                    Sugerido automáticamente sin repetir otros SKU. Si lo cambias, se guardará tu valor siempre que no esté repetido.
                                </p>
                            </div>
                            {(form.productType === 'Alimento' || form.productType === 'cuidado') && (
                                <>
                                    <div>
                                        <label className="text-secondary text-xs uppercase font-bold mb-2 block">Fecha de vencimiento</label>
                                        <input type="date" className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" value={form.attributes?.expirationDate || ''} onChange={e => setAttribute('expirationDate', e.target.value)} disabled={saving} />
                                        {formErrors.expirationDate && <p className="text-xs text-red mt-1">{formErrors.expirationDate}</p>}
                                    </div>
                                    <div>
                                        <label className="text-secondary text-xs uppercase font-bold mb-2 block">Alerta de vencimiento (días)</label>
                                        <input type="number" className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" value={form.attributes?.expirationAlertDays || '30'} onChange={e => setAttribute('expirationAlertDays', e.target.value)} disabled={saving} />
                                        {formErrors.expirationAlertDays && <p className="text-xs text-red mt-1">{formErrors.expirationAlertDays}</p>}
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="text-secondary text-xs uppercase font-bold mb-2 block">Lote</label>
                                <input className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all" placeholder={suggestedLotCode || 'Ej: L-2026-03-001'} value={form.attributes?.lotCode || ''} onChange={e => setAttribute('lotCode', e.target.value)} disabled={saving} />
                                <p className="text-secondary text-xs mt-2">
                                    Se propone automáticamente con fecha y referencia del producto. Si lo cambias, se usará el lote que escribas.
                                </p>
                            </div>
                            <div>
                                <label className="text-secondary text-xs uppercase font-bold mb-2 block">Ubicación de almacenamiento</label>
                                {renderCreatableReferenceSelect({
                                    key: 'storageLocations',
                                    value: form.attributes?.storageLocation || '',
                                    options: storageLocationOptions,
                                    onChange: (value) => setAttribute('storageLocation', value),
                                    placeholder: storageLocationOptions.length > 0 ? 'Selecciona ubicación' : 'No hay ubicaciones registradas',
                                    createLabel: 'ubicación',
                                    disabled: saving,
                                })}
                            </div>
                            {!requiresPurchaseInvoice && (
                                <div>
                                    <label className="text-secondary text-xs uppercase font-bold mb-2 block">Proveedor habitual</label>
                                    <select className="border border-line rounded-lg px-4 py-3 w-full outline-none transition-all bg-white" value={form.attributes?.supplier || ''} onChange={e => setPreferredSupplier(e.target.value)} disabled={saving}>
                                        <option value="">{supplierOptions.length > 0 ? 'Selecciona proveedor' : 'No hay proveedores registrados'}</option>
                                        {supplierOptions.map((option) => (
                                            <option key={`supplier-option-${option.value}`} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-secondary text-xs mt-2">Opcional. Sirve como proveedor por defecto para próximas compras e ingresos de stock.</p>
                                    {selectedPreferredSupplier && (
                                        <p className="text-secondary text-xs mt-2 break-words">
                                            {selectedPreferredSupplier.document ? `RUC: ${selectedPreferredSupplier.document}` : 'Proveedor sin RUC registrado.'}
                                            {` · ${getSupplierPurchaseTaxRateLabel(selectedPreferredSupplier, `IVA compra ${systemVatRate.toFixed(2)}%`)}`}
                                            {(selectedPreferredSupplier.email || selectedPreferredSupplier.phone) ? ` · ${selectedPreferredSupplier.email || 'Sin correo'} · ${selectedPreferredSupplier.phone || 'Sin teléfono'}` : ''}
                                        </p>
                                    )}
                                    {renderCreateReferenceInline('suppliers', 'proveedor', setPreferredSupplier)}
                                </div>
                            )}
                            <div className="md:col-span-2">
                                {renderReferenceCatalogHints([
                                    { key: 'storageLocations', options: storageLocationOptions },
                                    { key: 'suppliers', options: supplierOptions },
                                ], 'Crea aquí las opciones operativas que falten antes de guardar.')}
                            </div>
                        </div>
                        </div>

                        {!isDuplicateVariantMode && (
                            <div>
                                <label className="text-secondary text-sm font-bold uppercase mb-2 block">Descripción del producto</label>
                                <textarea className={getInputClass('description', 'border rounded-lg px-4 py-3 w-full outline-none transition-all min-h-[140px]')} value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); clearErrors('description') }} disabled={saving} placeholder="Describe beneficios, uso, material, ingredientes o cualquier dato clave que deba verse en la ficha pública." />
                                {formErrors.description && <p className="text-xs text-red mt-1">{formErrors.description}</p>}
                                <p className="text-secondary text-xs mt-2">
                                    Se muestra debajo del precio en la ficha del producto y también en la pestaña <span className="font-semibold text-black">Descripción</span>.
                                    Usa aquí la explicación comercial que debe leer el cliente antes de comprar.
                                </p>
                            </div>
                        )}
                        </div>

                        <aside className="hidden xl:block xl:sticky xl:top-4 space-y-4">
                            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                                <div className="text-sm font-semibold">Checklist útil</div>
                                <div className="mt-4 space-y-2">
                                    {checklistItems.map((item) => (
                                        <div key={`checklist-${item.label}`} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                                            <div className="min-w-0">
                                                <div className="text-[11px] uppercase font-bold text-secondary">{item.label}</div>
                                                <div className="text-sm font-semibold break-words">{item.value}</div>
                                            </div>
                                            <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold ${item.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {item.complete ? 'OK' : 'Pendiente'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!isDuplicateVariantMode && (
                                <div className="rounded-2xl border border-line bg-surface p-5">
                                    <div className="text-sm font-semibold">Estado web</div>
                                    <div className={`mt-4 text-base font-bold ${summaryPublicationClass}`}>{summaryPublicationLabel}</div>
                                    <p className="text-xs text-secondary mt-2">{publicationSupportText}</p>
                                    {!isRestockMode && (
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-line bg-white px-4 py-3">
                                                <div className="text-[10px] uppercase font-bold text-secondary">Miniaturas</div>
                                                <div className="text-lg font-bold">{summaryThumbCount}</div>
                                            </div>
                                            <div className="rounded-xl border border-line bg-white px-4 py-3">
                                                <div className="text-[10px] uppercase font-bold text-secondary">Galería</div>
                                                <div className="text-lg font-bold">{summaryGalleryCount}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isDuplicateVariantMode && (
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                                    <div className="text-sm font-semibold text-blue-900">Regla de variante</div>
                                    <p className="text-xs text-blue-900/80 mt-2">En este modo solo debes cambiar el dato que diferencia la variante, por ejemplo talla, color o presentación. La familia queda fija para que el producto siga agrupado en tienda.</p>
                                </div>
                            )}
                        </aside>
                    </form>
                </div>

                <div className="p-4 sm:p-6 border-t border-line flex flex-col sm:flex-row gap-3 justify-end bg-white rounded-b-2xl">
                    <button type="button" className="px-6 sm:px-8 py-3 rounded-full border border-line hover:bg-surface transition-all font-bold disabled:opacity-60" onClick={closeModal} disabled={saving}>Cancelar</button>
                    <button type="button" className="button-main px-6 sm:px-8 py-3 rounded-full bg-black text-white hover:bg-primary transition-all font-bold disabled:opacity-60 disabled:cursor-not-allowed" disabled={saving || isUploadingProductImages} onClick={() => { if (formRef.current?.requestSubmit) { formRef.current.requestSubmit(); return } if (formRef.current) { formRef.current.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) } }}>
                        {saving ? 'Guardando...' : (isUploadingProductImages ? 'Esperando imágenes...' : (isRestockMode ? 'Registrar compra' : 'Guardar cambios'))}
                    </button>
                </div>
            </div>
        </div>
    )
}
