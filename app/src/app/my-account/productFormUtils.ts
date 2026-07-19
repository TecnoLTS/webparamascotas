import { mapProductsToDto } from '@/lib/productMapper'
import { normalizeMeasurementLabel } from '@/lib/measurementLabel'
import {
    normalizeProductCategory,
    normalizeProductType,
    normalizeProductSpecies,
} from '@/lib/productTaxonomy'
import type { ProductFormState, ProductTaxTreatment, PurchaseInvoiceFormState } from './types'

export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024
export const PRODUCT_IMAGE_ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
const BASE_PRICE_FRACTION_DIGITS = 4

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const requiresSeparatedVariantSuffix = (label: string) =>
    /^(XXS|XS|S|M|L|XL|XXL|STANDARD)$/i.test(label.trim())

const buildFlexibleUnitPattern = (unit: string) => {
    const normalized = unit.toUpperCase()

    switch (normalized) {
        case 'KG':
        case 'KGS':
        case 'K':
            return '(?:KGS?|KG|K)'
        case 'GR':
        case 'G':
            return '(?:GR|G)'
        case 'ML':
            return '(?:MLS?|ML)'
        case 'TABS':
        case 'TAB':
            return 'TABS?'
        case 'UN':
        case 'UNI':
            return '(?:UN|UNI)'
        default:
            return escapeRegExp(normalized)
    }
}

const buildFlexibleVariantSuffixPattern = (label: string) => {
    const normalized = label
        .trim()
        .toUpperCase()
        .replace(/,/g, '.')
        .replace(/\s*-\s*/g, '-')
        .replace(/(\d)\s+(KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TABS?|DS|UN|UNI|PACK|PZA|PZ)\b/g, '$1$2')
        .replace(/\s+/g, ' ')

    const parts = normalized
        .split(/(\d+(?:\.\d+)?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TABS?|DS|UN|UNI|PACK|PZA|PZ)\b)/)
        .filter(Boolean)

    return parts
        .map((part) => {
            const measureMatch = part.match(/^(\d+(?:\.\d+)?)(KGS?|KG|K|GR|G|LB|L|ML|MG|OZ|TABS?|DS|UN|UNI|PACK|PZA|PZ)$/)
            if (measureMatch) {
                return `${escapeRegExp(measureMatch[1])}\\s*${buildFlexibleUnitPattern(measureMatch[2])}`
            }

            return escapeRegExp(part)
                .replace(/\s+/g, '\\s*')
                .replace(/\\-/g, '\\s*-\\s*')
        })
        .join('')
}

const variantLabelMatchesValue = (value: string, label: string) => {
    const trimmedValue = value.trim()
    const trimmedLabel = label.trim()
    if (!trimmedValue || !trimmedLabel) return false

    return new RegExp(`^${buildFlexibleVariantSuffixPattern(trimmedLabel)}$`, 'i').test(trimmedValue)
}

const normalizeVariantComparisonValue = (value: unknown) =>
    normalizeMeasurementLabel(String(value || '')).trim().toLowerCase()

const normalizeVariantAxisValue = (value: unknown) =>
    String(value || '').trim()

const isCareLegacySizeLabel = (value: string) =>
    /^(?:XXS|XS|S|M|L|XL|XXL|STANDARD|\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|L|ML|MG|OZ))$/i.test(value.trim())

const isContentMeasurementValue = (value: string) =>
    /^\d+(?:[.,]\d+)?\s?(?:KGS?|KG|K|GR|G|LB|LBS?|L|ML|MG|OZ)$/i.test(value.trim())

const normalizeGenericIdentity = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

const isGenericPresentationValue = (value: string) => {
    const identity = normalizeGenericIdentity(value)
    return identity === 'selecciona presentacion'
        || identity === 'crear o seleccionar presentacion'
}

const CARE_VARIANT_FIELDS = new Set(['range', 'weight', 'presentation', 'dosage', 'volume', 'packaging'])

const normalizeLegacyCareMeasurementAttributes = (attributes: Record<string, string>) => {
    delete attributes.size
    const variantAxis = normalizeVariantAxisValue(attributes.variantAxis || attributes.variantDefinitionField)
    if (variantAxis && !CARE_VARIANT_FIELDS.has(variantAxis)) {
        delete attributes.variantAxis
        delete attributes.variantDefinitionField
    }
}

const normalizeFoodMeasurementAttributes = (attributes: Record<string, string>) => {
    if (attributes.presentation && isGenericPresentationValue(attributes.presentation)) {
        delete attributes.presentation
    }

    const size = normalizeVariantSizeValue(String(attributes.size || ''))
    const weight = normalizeMeasurementLabel(String(attributes.weight || '')).trim()

    if (size && isContentMeasurementValue(size)) {
        if (!weight) {
            attributes.weight = size
        } else if (normalizeVariantComparisonValue(weight) !== normalizeVariantComparisonValue(size)) {
            attributes.weight = weight
        }
        delete attributes.size
    } else if (size) {
        delete attributes.size
    }

    const volume = normalizeMeasurementLabel(String(attributes.volume || '')).trim()
    if (volume && isContentMeasurementValue(volume)) {
        if (!String(attributes.weight || '').trim()) {
            attributes.weight = volume
        }
        delete attributes.volume
    }

    if (!attributes.presentation && attributes.packaging) {
        attributes.presentation = normalizeMeasurementLabel(String(attributes.packaging)).trim()
    }
}

const slugifyVariantValue = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

const titleCaseWords = (value: string) =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ')

const pluralizeSpanishColor = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return trimmed
    return /[aeiouáéíóú]$/i.test(trimmed) ? `${trimmed}s` : trimmed
}

const getColorValueAliases = (value: string) => {
    const normalized = titleCaseWords(value.trim())
    if (!normalized) return []
    if (!normalized.includes('/')) return [normalized]

    const [primary, secondary] = normalized.split('/').map((part) => part.trim()).filter(Boolean)
    if (!primary || !secondary) return [normalized]

    return [
        normalized,
        `${primary} ${secondary}`,
        `${primary} con Detalles ${secondary}`,
        `${primary} con Detalles ${pluralizeSpanishColor(secondary)}`,
        `${primary} con detalles ${secondary}`,
        `${primary} con detalles ${pluralizeSpanishColor(secondary)}`,
    ]
}

const normalizeVariantSizeValue = (value: string) => {
    const normalized = normalizeMeasurementLabel(value).trim()
    if (!normalized) return ''
    if (/^(n\/?a|na)$/i.test(normalized)) return ''
    if (/^(xxs|xs|s|m|l|xl|xxl)$/i.test(normalized)) return normalized.toUpperCase()
    if (/^(small|medium|large)$/i.test(normalized)) return titleCaseWords(normalized)
    return normalized
}

const isAccessorySizeVariantValue = (value: string) =>
    /^(?:XXS|XS|S|M|L|XL|XXL|STANDARD|\d+(?:[.,]\d+)?\s?CM|X?\d+)$/i.test(value.trim())

const normalizeCatalogDisplayMode = (value: unknown) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (['separate', 'individual', 'standalone', 'true', '1', 'yes', 'si', 'sí'].includes(normalized)) return 'separate'
    if (['grouped', 'group', 'false', '0', 'no'].includes(normalized)) return 'grouped'
    return ''
}

const stripVariantSuffixesFromName = (name: string, labels: string[]) => {
    let strippedName = name.trim()
    const suffixLabels = Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)))
        .sort((left, right) => right.length - left.length)

    for (let pass = 0; pass < 4; pass += 1) {
        const beforePass = strippedName
        suffixLabels.forEach((label) => {
            const separator = requiresSeparatedVariantSuffix(label) ? '(?:\\s+|-)' : '(?:\\s+|-)?'
            strippedName = strippedName
                .replace(new RegExp(`${separator}${buildFlexibleVariantSuffixPattern(label)}$`, 'i'), '')
                .trim()
        })
        if (strippedName === beforePass) break
    }

    return strippedName
}

const resolveAccessoryColorSizeBaseName = (fullName: string, color: string, size: string) => {
    const baseName = stripVariantSuffixesFromName(fullName, [size])
    if (!baseName) return fullName

    const baseIdentity = normalizeVariantComparisonValue(baseName)
    const colorAliases = getColorValueAliases(color)
    const hasColorInBase = colorAliases.some((alias) => baseIdentity.includes(normalizeVariantComparisonValue(alias)))
    if (hasColorInBase) return baseName

    return `${baseName} ${titleCaseWords(color)}`.trim()
}

const buildVariantGroupKey = ({
    supplier,
    type,
    species,
    baseName,
}: {
    supplier?: string;
    type?: string;
    species?: string;
    baseName?: string;
}) => {
    const parts = [
        supplier ? slugifyVariantValue(supplier) : '',
        type ? slugifyVariantValue(type) : '',
        species ? slugifyVariantValue(species) : '',
        baseName ? slugifyVariantValue(baseName) : '',
    ].filter(Boolean)

    return parts.join('-')
}

const getVariantCandidateValues = (type: string, source: Record<string, any>) => {
    const normalizedType = normalizeProductType(type, String(source.category || ''))
    const valuesByType: Record<string, string[]> = {
        Alimento: ['variantLabel', 'size', 'weight', 'presentation', 'packaging', 'dosage', 'volume'],
        ropa: ['variantLabel', 'size', 'color'],
        accesorios: ['variantLabel', 'size', 'presentation', 'color'],
        cuidado: ['weight', 'volume', 'presentation', 'dosage', 'packaging', 'range'],
    }

    const keys = valuesByType[normalizedType] ?? ['variantLabel', 'size', 'presentation', 'weight']
    return keys
        .map((key) => String(source[key] || '').trim())
        .filter((value, index) => {
            const key = keys[index]
            return !(normalizedType === 'cuidado' && key === 'variantLabel' && isCareLegacySizeLabel(value))
        })
        .filter(Boolean)
}

const resolveCanonicalVariantLabelByType = (type: string, attributes: Record<string, any>) => {
    const normalizedType = normalizeProductType(type, String(attributes.category || ''))
    const size = normalizeVariantSizeValue(String(attributes.size || ''))
    const weight = normalizeMeasurementLabel(String(attributes.weight || '')).trim()
    const presentation = normalizeMeasurementLabel(String(attributes.presentation || '')).trim()
    const range = normalizeMeasurementLabel(String(attributes.range || '')).trim()
    const dosage = normalizeMeasurementLabel(String(attributes.dosage || '')).trim()
    const volume = normalizeMeasurementLabel(String(attributes.volume || '')).trim()
    const packaging = normalizeMeasurementLabel(String(attributes.packaging || '')).trim()
    const color = titleCaseWords(String(attributes.color || '').trim())
    const explicit = normalizeMeasurementLabel(String(attributes.variantLabel || '')).trim()
    const variantAxis = String(attributes.displayAxis || attributes.variantAxis || attributes.variantDefinitionField || '').trim().toLowerCase()
    const shouldPreserveDetailedExplicitLabel = Boolean(
        explicit
        && size
        && color
        && explicit.toLowerCase() !== size.toLowerCase()
        && explicit.toLowerCase() !== color.toLowerCase()
        && explicit.toLowerCase().includes(size.toLowerCase())
        && explicit.toLowerCase().includes(color.toLowerCase())
    )

    if (normalizedType === 'ropa') {
        if (variantAxis === 'size' && size) return size
        if (size && color) return `${size} ${color}`
        return shouldPreserveDetailedExplicitLabel ? explicit : (size || color || explicit)
    }

    if (normalizedType === 'accesorios') {
        if (variantAxis === 'size' && size) return size
        if (color && size) return `${color} ${size}`
        return shouldPreserveDetailedExplicitLabel ? explicit : (color || size || presentation || explicit)
    }

    if (variantAxis && (normalizedType !== 'cuidado' || CARE_VARIANT_FIELDS.has(variantAxis))) {
        const axisValue = normalizeMeasurementLabel(String(attributes[variantAxis] || '')).trim()
        if (axisValue) return axisValue
    }

    if (normalizedType === 'cuidado') {
        return weight || volume || dosage || presentation || packaging || range
    }

    if (normalizedType === 'Alimento') {
        return weight || presentation || explicit
    }

    return explicit || size || weight || presentation || color
}

const resolveDisplayAxisByType = (type: string, attributes: Record<string, any>) => {
    const normalizedType = normalizeProductType(type, String(attributes.category || ''))
    const requestedAxis = resolveRequestedDisplayAxis(normalizedType, attributes)
    if (requestedAxis) return requestedAxis

    if (normalizedType === 'ropa') {
        if (String(attributes.size || '').trim()) return 'size'
        if (String(attributes.color || '').trim()) return 'color'
    }

    if (normalizedType === 'accesorios') {
        if (String(attributes.color || '').trim()) return 'color'
        if (String(attributes.size || '').trim()) return 'size'
        if (String(attributes.presentation || attributes.packaging || '').trim()) return 'presentation'
    }

    if (normalizedType === 'cuidado') {
        if (String(attributes.weight || attributes.volume || attributes.presentation || attributes.packaging || '').trim()) return 'presentation'
        if (String(attributes.dosage || '').trim()) return 'dosage'
        if (String(attributes.range || '').trim()) return 'range'
    }

    if (normalizedType === 'Alimento') {
        if (String(attributes.weight || attributes.presentation || attributes.packaging || attributes.volume || '').trim()) return 'presentation'
    }

    return ''
}

const resolveRequestedDisplayAxis = (normalizedType: string, attributes: Record<string, any>) => {
    const rawAxis = [
        attributes.displayAxis,
        attributes.publicVariantAxis,
        attributes.catalogDisplayAxis,
        attributes.variantAxis,
        attributes.variantDefinitionField,
    ].map((value) => String(value || '').trim().toLowerCase()).find(Boolean) || ''
    const axis = rawAxis === 'weight' || rawAxis === 'volume' || rawAxis === 'packaging'
        ? 'presentation'
        : ['presentation', 'size', 'color', 'range', 'dosage'].includes(rawAxis)
            ? rawAxis
            : ''
    if (!axis) return ''
    if (normalizedType === 'cuidado' && !['presentation', 'range', 'dosage'].includes(axis)) return ''
    if (normalizedType === 'Alimento' && axis !== 'presentation') return ''

    const hasValue = (key: string) => String(attributes[key] || '').trim().length > 0
    if (axis === 'color') return hasValue('color') ? 'color' : ''
    if (axis === 'size') return !['cuidado', 'Alimento'].includes(normalizedType) && hasValue('size') ? 'size' : ''
    if (axis === 'presentation') return ['weight', 'volume', 'presentation', 'packaging'].some(hasValue) ? 'presentation' : ''
    if (axis === 'range') return hasValue('range') ? 'range' : ''
    if (axis === 'dosage') return hasValue('dosage') ? 'dosage' : ''
    return ''
}

export const getVariantDefinitionFieldLabel = (type: string) => {
    const normalizedType = normalizeProductType(type)
    if (normalizedType === 'ropa') return 'talla o color'
    if (normalizedType === 'cuidado') return 'contenido, presentación, dosis o rango recomendado'
    if (normalizedType === 'Alimento') return 'peso neto o contenido'
    if (normalizedType === 'accesorios') return 'tamaño o color'
    return 'variante'
}

export const getVariantDefinitionFieldKey = (type: string) => {
    const normalizedType = normalizeProductType(type)
    if (normalizedType === 'cuidado') return 'weight'
    if (normalizedType === 'Alimento') return 'weight'
    return 'size'
}

export const inferDuplicateVariantFieldKey = (
    type: string,
    attributes?: Record<string, any> | null,
    product?: Record<string, any> | null
) => {
    const normalizedType = normalizeProductType(type, String(product?.category || attributes?.category || ''))
    const attributeSource = attributes || {}
    const productSource = product || {}
    const resolvedVariantLabel = normalizeVariantComparisonValue(
        attributeSource.__sourceVariantLabel
        || attributeSource.variantLabel
        || productSource.variantLabel
        || productSource?.attributes?.variantLabel
    )

    if (normalizedType === 'cuidado') {
        const explicitField = String(attributeSource.__variantDefinitionField || attributeSource.variantAxis || '').trim()
        if (['range', 'weight', 'presentation', 'dosage', 'volume'].includes(explicitField)) {
            return explicitField
        }

        const rangeValue = normalizeVariantComparisonValue(attributeSource.range || productSource?.attributes?.range || productSource.range)
        const weightValue = normalizeVariantComparisonValue(attributeSource.weight || productSource?.attributes?.weight || productSource.weight)
        const presentationValue = normalizeVariantComparisonValue(attributeSource.presentation || productSource?.attributes?.presentation || productSource.presentation)
        const dosageValue = normalizeVariantComparisonValue(attributeSource.dosage || productSource?.attributes?.dosage || productSource.dosage)

        if (resolvedVariantLabel) {
            if (rangeValue && rangeValue === resolvedVariantLabel) return 'range'
            if (weightValue && weightValue === resolvedVariantLabel) return 'weight'
            if (presentationValue && presentationValue === resolvedVariantLabel) return 'presentation'
            if (dosageValue && dosageValue === resolvedVariantLabel) return 'dosage'
        }

        if (weightValue) return 'weight'
        if (dosageValue) return 'dosage'
        if (presentationValue) return 'presentation'
        if (rangeValue) return 'range'
        return 'presentation'
    }

    if (normalizedType === 'Alimento') {
        const explicitField = String(attributeSource.__variantDefinitionField || '').trim()
        if (explicitField === 'weight') {
            return 'weight'
        }
        if (explicitField === 'size') {
            const explicitSize = normalizeVariantSizeValue(String(attributeSource.size || productSource?.attributes?.size || productSource.size || ''))
            return explicitSize && !isContentMeasurementValue(explicitSize) ? 'size' : 'weight'
        }

        return 'weight'
    }

    if (normalizedType === 'ropa') {
        const explicitField = String(attributeSource.__variantDefinitionField || '').trim()
        if (explicitField === 'color' || explicitField === 'size') {
            return explicitField
        }

        const colorValue = normalizeVariantComparisonValue(attributeSource.color || productSource?.attributes?.color || productSource.color)
        const sizeValue = normalizeVariantComparisonValue(attributeSource.size || productSource?.attributes?.size || productSource.size)

        if (resolvedVariantLabel) {
            if (colorValue && colorValue === resolvedVariantLabel) return 'color'
            if (sizeValue && sizeValue === resolvedVariantLabel) return 'size'
        }

        if (colorValue && !sizeValue) return 'color'
        return 'size'
    }

    if (normalizedType === 'accesorios') {
        const explicitField = String(attributeSource.__variantDefinitionField || '').trim()
        if (explicitField === 'color' || explicitField === 'size') {
            return explicitField
        }

        const colorValue = normalizeVariantComparisonValue(attributeSource.color || productSource?.attributes?.color || productSource.color)
        const sizeValue = normalizeVariantComparisonValue(attributeSource.size || productSource?.attributes?.size || productSource.size)

        if (resolvedVariantLabel) {
            if (colorValue && colorValue === resolvedVariantLabel) return 'color'
            if (sizeValue && sizeValue === resolvedVariantLabel) return 'size'
        }

        if (colorValue && !sizeValue) return 'color'
        return 'size'
    }

    return getVariantDefinitionFieldKey(normalizedType)
}

export const resolveProductVariantLabel = (
    type: string,
    attributes?: Record<string, any> | null,
    product?: Record<string, any> | null
) => {
    const attributeSource = attributes || {}
    const productSource = product || {}
    const explicitCanonical = resolveCanonicalVariantLabelByType(type, {
        ...(productSource?.attributes || {}),
        ...productSource,
        ...attributeSource,
    })
    if (explicitCanonical) {
        return normalizeMeasurementLabel(explicitCanonical)
    }
    const candidates = [
        ...getVariantCandidateValues(type, {
            ...productSource,
            ...(productSource.attributes || {}),
        }),
        ...getVariantCandidateValues(type, attributeSource),
    ]
    const resolved = candidates.find(Boolean) || ''
    return normalizeMeasurementLabel(resolved)
}

export const resolveProductVariantBaseName = (product: any) => {
    const fullName = String(product?.name || '').trim()
    if (!fullName) return ''

    const type = normalizeProductType(String(product?.productType || ''), String(product?.category || ''))
    const attributeSource = {
        ...(product || {}),
        ...(product?.attributes || {}),
    }
    const color = titleCaseWords(String(attributeSource.color || '').trim())
    const size = normalizeVariantSizeValue(String(attributeSource.size || ''))
    if (type === 'accesorios' && color && size && isAccessorySizeVariantValue(size)) {
        return resolveAccessoryColorSizeBaseName(fullName, color, size)
    }

    const variantLabel = resolveProductVariantLabel(type, product?.attributes, product)
    const explicitCandidates = [
        String(product?.variantBaseName || '').trim(),
        String(product?.attributes?.variantBaseName || '').trim(),
    ].filter(Boolean)
    const variantCandidates = Array.from(new Set([
        variantLabel,
        ...getVariantCandidateValues(type, attributeSource),
    ].filter(Boolean)))

    for (const candidate of explicitCandidates) {
        if (fullName === candidate) {
            return candidate
        }

        const suffix = fullName.toLowerCase().startsWith(candidate.toLowerCase())
            ? fullName.slice(candidate.length).replace(/^(?:\s+|-)+/, '').trim()
            : ''
        if (suffix && variantCandidates.some((label) => variantLabelMatchesValue(suffix, label))) {
            return candidate
        }

        for (const label of variantCandidates) {
            const separator = requiresSeparatedVariantSuffix(label) ? '(?:\\s+|-)' : '(?:\\s+|-)?'
            const derived = fullName
                .replace(new RegExp(`${separator}${buildFlexibleVariantSuffixPattern(label)}$`, 'i'), '')
                .trim()
            if (derived && derived.toLowerCase() === candidate.toLowerCase()) {
                return candidate
            }
        }
    }

    if (!variantLabel) return fullName

    let strippedName = fullName
    variantCandidates.forEach((candidate) => {
        const separator = requiresSeparatedVariantSuffix(candidate) ? '(?:\\s+|-)' : '(?:\\s+|-)?'
        strippedName = strippedName
            .replace(new RegExp(`${separator}${buildFlexibleVariantSuffixPattern(candidate)}$`, 'i'), '')
            .trim()
    })

    return strippedName || fullName
}

export const enrichVariantAttributes = ({
    type,
    category,
    name,
    attributes,
}: {
    type: string;
    category?: string;
    name?: string;
    attributes?: Record<string, any> | null;
}) => {
    const normalizedType = normalizeProductType(type, String(category || ''))
    const nextAttributes: Record<string, string> = { ...(attributes || {}) }
    const explicitColor = titleCaseWords(String(nextAttributes.color || '').trim())
    if (explicitColor) {
        nextAttributes.color = explicitColor
    }

    if (nextAttributes.size) {
        nextAttributes.size = normalizeVariantSizeValue(String(nextAttributes.size))
    }
    if (nextAttributes.weight) {
        nextAttributes.weight = normalizeMeasurementLabel(String(nextAttributes.weight)).trim()
    }
    if (nextAttributes.presentation) {
        nextAttributes.presentation = normalizeMeasurementLabel(String(nextAttributes.presentation)).trim()
    }
    if (nextAttributes.range) {
        nextAttributes.range = normalizeMeasurementLabel(String(nextAttributes.range)).trim()
    }
    if (nextAttributes.dosage) {
        nextAttributes.dosage = normalizeMeasurementLabel(String(nextAttributes.dosage)).trim()
    }
    if (nextAttributes.volume) {
        nextAttributes.volume = normalizeMeasurementLabel(String(nextAttributes.volume)).trim()
    }
    if (nextAttributes.packaging) {
        nextAttributes.packaging = normalizeMeasurementLabel(String(nextAttributes.packaging)).trim()
    }

    if (normalizedType === 'cuidado') {
        normalizeLegacyCareMeasurementAttributes(nextAttributes)
    }
    if (normalizedType === 'Alimento') {
        normalizeFoodMeasurementAttributes(nextAttributes)
    }

    const resolvedVariantLabel = resolveCanonicalVariantLabelByType(normalizedType, nextAttributes)
    const resolvedDisplayAxis = resolveDisplayAxisByType(normalizedType, nextAttributes)
    const requestedCatalogDisplayMode = normalizeCatalogDisplayMode(nextAttributes.catalogDisplayMode || nextAttributes.variantDisplayMode)
    if (resolvedDisplayAxis) {
        nextAttributes.displayAxis = resolvedDisplayAxis
        if (resolvedDisplayAxis === 'size' || resolvedDisplayAxis === 'color') {
            nextAttributes.variantAxis = resolvedDisplayAxis
            nextAttributes.variantDefinitionField = resolvedDisplayAxis
        }
        if (
            normalizedType === 'accesorios'
            && resolvedDisplayAxis === 'size'
            && nextAttributes.color
            && isAccessorySizeVariantValue(String(nextAttributes.size || '').trim())
        ) {
            nextAttributes.catalogDisplayMode = requestedCatalogDisplayMode === 'separate' ? 'separate' : 'grouped'
        } else if (resolvedDisplayAxis === 'color') {
            nextAttributes.catalogDisplayMode = requestedCatalogDisplayMode || 'grouped'
        } else if (requestedCatalogDisplayMode) {
            nextAttributes.catalogDisplayMode = requestedCatalogDisplayMode
        }
    } else {
        delete nextAttributes.displayAxis
    }

    if (resolvedVariantLabel) {
        nextAttributes.variantLabel = resolvedVariantLabel
    } else if (normalizedType === 'cuidado' && isCareLegacySizeLabel(String(nextAttributes.variantLabel || ''))) {
        delete nextAttributes.variantLabel
    }

    const synthesizedProduct = {
        name: String(name || '').trim(),
        category: normalizeProductCategory(String(category || '')),
        productType: normalizedType,
        attributes: nextAttributes,
        variantLabel: nextAttributes.variantLabel,
        variantBaseName: nextAttributes.variantBaseName,
    }

    const resolvedBaseName = resolveProductVariantBaseName(synthesizedProduct)
        || String(nextAttributes.variantBaseName || '').trim()

    if (resolvedBaseName) {
        nextAttributes.variantBaseName = resolvedBaseName
    }

    if (nextAttributes.variantBaseName) {
        const groupKey = buildVariantGroupKey({
            supplier: String(nextAttributes.supplier || '').trim(),
            type: normalizedType,
            species: String(nextAttributes.species || '').trim(),
            baseName: nextAttributes.variantBaseName,
        })
        if (groupKey) {
            nextAttributes.variantGroupKey = groupKey
        }
    }

    return nextAttributes
}

export const normalizeAdminProducts = (items: any[]) => {
    try {
        return mapProductsToDto(items as any).map((product: any) => ({
            ...product,
            published: isProductEligibleForPublication(product) ? product?.published !== false : false
        }))
    } catch {
        return items
    }
}

export const isProductEligibleForPublication = (product: {
    price?: string | number | null;
    quantity?: string | number | null;
}) => {
    const price = Number(product?.price ?? 0)
    const quantity = Number(product?.quantity ?? 0)
    return Number.isFinite(price) && price > 0 && Number.isFinite(quantity) && quantity > 0
}

export const getAdminProductEntityId = (product: {
    internalId?: string | number | null;
    id?: string | number | null;
    legacy_id?: string | number | null;
    legacyId?: string | number | null;
}) => {
    const resolved = product?.internalId ?? product?.id ?? product?.legacyId ?? product?.legacy_id ?? ''
    return String(resolved || '').trim()
}

const normalizeBooleanLikeValue = (value: unknown, defaultValue = false) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (['1', 'true', 'yes', 'y', 'on', 'si', 'sí'].includes(normalized)) return true
        if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
    }
    return defaultValue
}

export const isTaxExemptProduct = (product?: any) => {
    const rawValue =
        product?.tax?.exempt
        ?? product?.taxExempt
        ?? product?.attributes?.taxExempt
        ?? product?.attributes?.tax_exempt

    return normalizeBooleanLikeValue(rawValue, false)
}

export const normalizeProductSaleTaxRate = (value: unknown): number | null => {
    if (value === null || value === undefined || typeof value === 'boolean') return null
    const normalized = String(value).trim().replace(',', '.')
    if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized)) return null
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return null
    return Math.min(100, Math.max(0, Math.round(parsed * 100) / 100))
}

export const resolveProductSaleTaxPolicy = (
    product: any,
    tenantVatMultiplier: number
): { treatment: ProductTaxTreatment; rate: number } => {
    const attributes = product?.attributes && typeof product.attributes === 'object'
        ? product.attributes
        : {}
    if (isTaxExemptProduct({ ...product, attributes })) {
        return { treatment: 'exempt', rate: 0 }
    }

    const projectedTreatment = String(product?.tax?.treatment ?? attributes.taxTreatment ?? attributes.tax_treatment ?? '').trim()
    const explicitRateCandidates = [
        product?.tax?.rate,
        product?.taxRate,
        attributes.taxRate,
        attributes.tax_rate,
    ]
    let explicitRate: number | null = null
    for (const candidate of explicitRateCandidates) {
        explicitRate = normalizeProductSaleTaxRate(candidate)
        if (explicitRate !== null) break
    }

    if (projectedTreatment === 'exempt') return { treatment: 'exempt', rate: 0 }
    if (projectedTreatment === 'zero-rated') return { treatment: 'zero-rated', rate: 0 }

    const tenantRate = normalizeProductSaleTaxRate((Math.max(1, tenantVatMultiplier) - 1) * 100)
    const rate = explicitRate ?? tenantRate
    if (rate === null) {
        throw new Error('La tasa tributaria canónica del tenant no está disponible.')
    }
    return rate === 0
        ? { treatment: 'zero-rated', rate: 0 }
        : { treatment: 'taxed', rate }
}

export const getEmptyAttributes = (type: string): Record<string, string> => {
    if (type === 'Alimento') {
        return {
            catalogCategories: '',
            presentation: '',
            weight: '',
            flavor: '',
            age: '',
            species: '',
            ingredients: '',
            expirationDate: '',
            expirationAlertDays: '30',
            lotCode: '',
            storageLocation: '',
            supplier: '',
            sku: '',
            tag: ''
        }
    }

    if (type === 'ropa') {
        return {
            catalogCategories: '',
            size: '',
            material: '',
            color: '',
            gender: '',
            species: '',
            lotCode: '',
            storageLocation: '',
            supplier: '',
            sku: '',
            tag: ''
        }
    }

    if (type === 'accesorios') {
        return {
            catalogCategories: '',
            material: '',
            size: '',
            color: '',
            usage: '',
            species: '',
            lotCode: '',
            storageLocation: '',
            supplier: '',
            sku: '',
            tag: ''
        }
    }

    if (type === 'cuidado') {
        return {
            catalogCategories: '',
            presentation: '',
            weight: '',
            range: '',
            dosage: '',
            volume: '',
            packaging: '',
            activeIngredient: '',
            usage: '',
            species: '',
            expirationDate: '',
            expirationAlertDays: '30',
            lotCode: '',
            storageLocation: '',
            supplier: '',
            sku: '',
            tag: ''
        }
    }

    return {}
}

export const getAttributesForTypeChange = (nextType: string, currentAttributes?: Record<string, string>) => {
    const base = getEmptyAttributes(nextType)
    const current = currentAttributes || {}

    Array.from(new Set([
        ...Object.keys(base),
        'size',
        'weight',
        'presentation',
        'packaging',
        'volume',
        'range',
        'dosage',
        'material',
        'color',
        'usage',
        'activeIngredient',
        'flavor',
        'age',
        'gender',
        'ingredients',
        'sku',
        'tag',
        'species',
        'lotCode',
        'storageLocation',
        'supplier',
        'taxExempt',
        'taxRate',
        'variantLabel',
        'variantAxis',
        'variantBaseName',
        'variantGroupKey',
    ])).forEach((key) => {
        const value = String(current[key] || '').trim()
        if (value) {
            base[key] = value
        }
    })

    if (nextType === 'Alimento' || nextType === 'cuidado') {
        ;['expirationDate', 'expirationAlertDays'].forEach((key) => {
            const value = String(current[key] || '').trim()
            if (value) {
                base[key] = value
            }
        })
    }

    if (nextType === 'cuidado') {
        ;['range', 'weight', 'dosage', 'volume', 'packaging', 'presentation', 'activeIngredient', 'usage'].forEach((key) => {
            const value = String(current[key] || '').trim()
            if (value) {
                base[key] = value
            }
        })
    }

    if (nextType === 'ropa') {
        ;['sizeGuideRows', 'sizeGuideNotes'].forEach((key) => {
            const value = String(current[key] || '').trim()
            if (value) {
                base[key] = value
            }
        })
    }

    if (nextType === 'Alimento') {
        normalizeFoodMeasurementAttributes(base)
    }

    return base
}

export const normalizeAttributes = (type: string, attrs: any) => {
    const normalizedType = normalizeProductType(type)
    const base = getEmptyAttributes(type)
    const merged = { ...base, ...(attrs || {}) }
    const cleaned: Record<string, string> = {}

    Object.keys(merged).forEach((key) => {
        if (key.startsWith('__')) return
        const value = (merged as any)[key]
        if (key === 'catalogCategories') {
            if (Array.isArray(value) && value.length > 0) {
                cleaned[key] = JSON.stringify(value)
            } else if (typeof value === 'string' && value.trim() !== '') {
                cleaned[key] = value.trim()
            }
            return
        }

        if (value !== undefined && value !== null && String(value).trim() !== '') {
            cleaned[key] = String(value).trim()
        }
    })

    if (normalizedType === 'cuidado') {
        normalizeLegacyCareMeasurementAttributes(cleaned)
        if (isCareLegacySizeLabel(String(cleaned.variantLabel || ''))) {
            delete cleaned.variantLabel
        }
    }
    if (normalizedType === 'Alimento') {
        normalizeFoodMeasurementAttributes(cleaned)
    }

    return cleaned
}

export const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10)

export const createEmptyPurchaseInvoice = (supplierName = '', purchaseTaxRate = ''): PurchaseInvoiceFormState => ({
    invoiceNumber: '',
    supplierName: supplierName.trim(),
    supplierDocument: '',
    purchaseTaxRate: purchaseTaxRate.trim(),
    issuedAt: getTodayDateInputValue(),
    notes: ''
})

const createPurchaseInvoiceFromSourceProduct = (product: any, purchaseTaxRate = ''): PurchaseInvoiceFormState => {
    const lastPurchaseInvoice = product?.lastPurchaseInvoice || product?.inventory?.lastPurchaseInvoice || null
    const procurementLots = Array.isArray(product?.inventory?.procurementDetail?.lots)
        ? product.inventory.procurementDetail.lots
        : []
    const lastInvoicedLot = procurementLots.find((lot: any) => String(lot?.invoice_number || lot?.invoiceNumber || '').trim())
    const invoiceNumber = String(
        lastPurchaseInvoice?.invoiceNumber
        || lastPurchaseInvoice?.invoice_number
        || lastInvoicedLot?.invoiceNumber
        || lastInvoicedLot?.invoice_number
        || product?.lastPurchaseInvoiceNumber
        || product?.attributes?.purchaseInvoiceNumber
        || product?.attributes?.purchase_invoice_number
        || ''
    ).trim()
    const supplierName = String(
        lastPurchaseInvoice?.supplierName
        || lastPurchaseInvoice?.supplier_name
        || lastInvoicedLot?.supplierName
        || lastInvoicedLot?.supplier_name
        || product?.lastPurchaseSupplierName
        || product?.attributes?.supplier
        || product?.supplier
        || ''
    ).trim()
    const supplierDocument = String(
        lastPurchaseInvoice?.supplierDocument
        || lastPurchaseInvoice?.supplier_document
        || lastInvoicedLot?.supplierDocument
        || lastInvoicedLot?.supplier_document
        || product?.lastPurchaseSupplierDocument
        || ''
    ).trim()
    const issuedAt = String(
        lastPurchaseInvoice?.issuedAt
        || lastPurchaseInvoice?.issued_at
        || lastInvoicedLot?.issuedAt
        || lastInvoicedLot?.issued_at
        || product?.lastPurchaseIssuedAt
        || product?.attributes?.purchaseInvoiceDate
        || product?.attributes?.purchase_invoice_date
        || ''
    ).trim()
    const notes = String(
        lastPurchaseInvoice?.notes
        || lastPurchaseInvoice?.purchaseInvoiceNotes
        || product?.attributes?.purchaseInvoiceNotes
        || product?.attributes?.purchase_invoice_notes
        || ''
    ).trim()

    return {
        ...createEmptyPurchaseInvoice(supplierName, purchaseTaxRate),
        invoiceNumber,
        supplierName,
        supplierDocument,
        issuedAt: issuedAt || getTodayDateInputValue(),
        notes,
    }
}

export const createImageEntry = () => ({ url: '', width: '', height: '', altText: '' })

const requiredImageSizes = {
    thumb: { width: 640, height: 800 },
    gallery: { width: 1200, height: 1500 }
}

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

export const createEmptyProductForm = (): ProductFormState => ({
    id: '',
    name: '',
    price: '',
    pvp: '',
    marketPrice: '',
    cost: '',
    taxExempt: false,
    taxTreatment: 'taxed',
    taxRate: '',
    quantity: '',
    category: '',
    brand: 'Generico',
    description: '',
    productType: '',
    published: false,
    attributes: {},
    purchaseInvoice: createEmptyPurchaseInvoice(),
    thumbImages: [createImageEntry()],
    galleryImages: [createImageEntry()]
})

export const createProductFormFromProduct = (product: any, vatMultiplier: number): ProductFormState => {
    const pvpPrice = Number(product?.price ?? 0)
    const marketPrice = Number(product?.originPrice ?? 0)
    const productType = normalizeProductType(String(product?.productType || ''), String(product?.category || ''))
    const attributes = enrichVariantAttributes({
        type: productType,
        category: String(product?.category || ''),
        name: String(product?.name || ''),
        attributes: normalizeAttributes(productType, product?.attributes),
    })
    const saleTaxPolicy = resolveProductSaleTaxPolicy({ ...product, attributes }, vatMultiplier)
    const taxExempt = saleTaxPolicy.treatment === 'exempt'
    const effectiveVatMultiplier = saleTaxPolicy.treatment === 'taxed'
        ? 1 + (saleTaxPolicy.rate / 100)
        : 1
    const basePrice = effectiveVatMultiplier > 0 ? pvpPrice / effectiveVatMultiplier : pvpPrice
    const imageMeta = Array.isArray(product?.imageMeta) ? product.imageMeta : []
    const thumbMeta = imageMeta.filter((img: any) => (img.kind || 'gallery') === 'thumb')
    const galleryMeta = imageMeta.filter((img: any) => (img.kind || 'gallery') === 'gallery')

    const thumbImages = thumbMeta.length > 0
        ? thumbMeta.map((img: any) => ({
            url: img.url || '',
            width: img.width ? String(img.width) : '',
            height: img.height ? String(img.height) : '',
            altText: typeof img.altText === 'string' ? img.altText : ''
        }))
        : (Array.isArray(product?.thumbImage) ? product.thumbImage : []).map((url: string) => ({
            url,
            width: '',
            height: '',
            altText: ''
        }))

    const galleryImages = galleryMeta.length > 0
        ? galleryMeta.map((img: any) => ({
            url: img.url || '',
            width: img.width ? String(img.width) : '',
            height: img.height ? String(img.height) : '',
            altText: typeof img.altText === 'string' ? img.altText : ''
        }))
        : (Array.isArray(product?.images) ? product.images : []).map((url: string) => ({
            url,
            width: '',
            height: '',
            altText: ''
        }))

    const filledThumbs = applyDefaultSizes(thumbImages, 'thumb')
    const filledGallery = applyDefaultSizes(galleryImages, 'gallery')
    const defaultSupplierName = String(attributes?.supplier || '').trim()
    if (!attributes.species) {
        const resolvedSpecies = normalizeProductSpecies(product?.gender ?? '')
        if (resolvedSpecies) {
            attributes.species = resolvedSpecies
        }
    }

    return {
        id: getAdminProductEntityId(product),
        name: String(product?.name || ''),
        price: Number.isFinite(basePrice) ? basePrice.toFixed(BASE_PRICE_FRACTION_DIGITS) : String(product?.price || ''),
        pvp: Number.isFinite(pvpPrice) ? pvpPrice.toFixed(2) : String(product?.price || ''),
        marketPrice: Number.isFinite(marketPrice) && marketPrice > pvpPrice ? marketPrice.toFixed(2) : '',
        cost: String(product?.business?.cost ?? product?.cost ?? 0),
        taxExempt,
        taxTreatment: saleTaxPolicy.treatment,
        taxRate: String(saleTaxPolicy.rate),
        quantity: String(product?.quantity ?? ''),
        category: normalizeProductCategory(product?.category || ''),
        brand: String(product?.brand || 'Generico'),
        description: String(product?.description || ''),
        productType,
        published: isProductEligibleForPublication(product) ? product?.published !== false : false,
        attributes,
        purchaseInvoice: createEmptyPurchaseInvoice(defaultSupplierName, String(attributes?.purchaseTaxRate || '').trim()),
        thumbImages: filledThumbs.length > 0 ? filledThumbs : [createImageEntry()],
        galleryImages: filledGallery.length > 0 ? filledGallery : [createImageEntry()]
    }
}

export const createDuplicateVariantFormFromProduct = (product: any, vatMultiplier: number): ProductFormState => {
    const duplicatedForm = createProductFormFromProduct(product, vatMultiplier)
    const duplicatedAttributes = { ...(duplicatedForm.attributes || {}) }
    const productType = normalizeProductType(String(product?.productType || ''), String(product?.category || ''))
    const sourceVariantLabel = resolveProductVariantLabel(productType, product?.attributes, product)
    const sourceVariantFieldKey = inferDuplicateVariantFieldKey(productType, product?.attributes, product)
    const purchaseTaxRate = String(duplicatedForm.attributes?.purchaseTaxRate || '').trim()

    duplicatedAttributes.sku = ''
    duplicatedAttributes.lotCode = ''
    duplicatedAttributes.expirationDate = ''
    duplicatedAttributes.variantLabel = ''
    duplicatedAttributes.variantAxis = sourceVariantFieldKey
    duplicatedAttributes.variantBaseName = resolveProductVariantBaseName(product)
    duplicatedAttributes.__sourceVariantLabel = sourceVariantLabel
    duplicatedAttributes.__variantDefinitionField = sourceVariantFieldKey
    delete duplicatedAttributes.variantGroupKey

    return {
        ...duplicatedForm,
        id: '',
        quantity: '',
        published: false,
        attributes: duplicatedAttributes,
        purchaseInvoice: createPurchaseInvoiceFromSourceProduct(product, purchaseTaxRate),
    }
}
