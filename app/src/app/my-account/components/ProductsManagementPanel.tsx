'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import { requestApi } from '@/lib/apiClient'
import type { ProductPublicationFilter } from '../types'
import { getAdminProductEntityId, resolveProductVariantLabel } from '../productFormUtils'
import { withTransientRetry } from '../utils'

type AdminProductAdvancedFilters = {
    category: string;
    supplier: string;
    brand: string;
    species: string;
    tax: 'all' | 'taxed' | 'exempt';
}

type AdminProductFilterOption = { value: string; label: string; count: number }

const compareAdminLabels = (left: string, right: string) =>
    left.localeCompare(right, 'es', { sensitivity: 'base', numeric: true })

const getProductVariantMeta = (product: any) => {
    const attributes = product?.attributes || {}
    const normalizedType = String(product?.productType || product?.category || '').trim().toLowerCase()
    const normalizedLabel = String(
        resolveProductVariantLabel(String(product?.productType || product?.category || ''), attributes, product) || ''
    ).trim()
    const color = String(attributes.color || '').trim()
    const sku = String(attributes.sku || '').trim()

    const badges = Array.from(new Set(
        [
            normalizedLabel,
            ...(normalizedType === 'ropa' || normalizedType === 'accesorios' ? [color] : []),
        ]
            .map((value) => String(value || '').trim())
            .filter((value) => value && !/^(n\/?a|na)$/i.test(value))
    )).slice(0, 3)

    return {
        badges,
        sku,
    }
}

const getProductVariantGroupKey = (product: any) => {
    const rawKey = String(product?.variantGroupKey || product?.attributes?.variantGroupKey || '').trim()
    if (!rawKey || rawKey.startsWith('single:')) return ''
    return rawKey
}

const getProductVariantFamilyName = (product: any) => (
    String(product?.variantBaseName || product?.attributes?.variantBaseName || product?.name || '').trim()
)

const getProductVariantSortLabel = (product: any) => (
    resolveProductVariantLabel(String(product?.productType || product?.category || ''), product?.attributes || {}, product) || ''
).trim()

type ProductsManagementPanelProps = {
    products: any[];
    allProducts?: any[];
    summary: {
        all: number;
        published: number;
        hidden: number;
        publishable: number;
        blocked: number;
        withStock: number;
        noStock: number;
        withPrice: number;
        noPrice: number;
    };
    activeFilter: ProductPublicationFilter;
    activeQuickFilter: 'all' | 'publishable' | 'blocked' | 'with-stock' | 'no-stock' | 'no-price';
    searchQuery: string;
    advancedFilters: AdminProductAdvancedFilters;
    filterOptions: {
        categories: AdminProductFilterOption[];
        suppliers: AdminProductFilterOption[];
        brands: AdminProductFilterOption[];
        species: AdminProductFilterOption[];
    };
    hasPerishableProducts: boolean;
    onFilterChange: (filter: ProductPublicationFilter) => void;
    onQuickFilterChange: (filter: 'all' | 'publishable' | 'blocked' | 'with-stock' | 'no-stock' | 'no-price') => void;
    onSearchChange: (value: string) => void;
    onAdvancedFiltersChange: (filters: AdminProductAdvancedFilters) => void;
    onClearAdvancedFilters: () => void;
    onNewProduct: () => void;
    onEditProduct: (product: any) => void;
    onRestockProduct: (product: any) => void;
    onDuplicateVariant: (product: any) => void;
    onDeleteProduct: (id: string) => void;
    onTogglePublication: (product: any, nextPublished: boolean) => void;
    publicationPendingIds: Record<string, boolean>;
    isProductEligibleForPublication: (product: any) => boolean;
    getProductExpirationMeta: (product: any) => {
        isFood: boolean;
        expirationDate: string;
        badge: { label: string; className: string };
    };
    formatMoney: (value: any) => string;
    formatIsoDate: (value?: string | null) => string;
}

const FILTER_OPTIONS: Array<{ key: ProductPublicationFilter; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'published', label: 'Publicados' },
    { key: 'hidden', label: 'Ocultos' }
]

const appendAdminImageCacheKey = (src: string, product: any) => {
    if (!src.startsWith('/uploads/')) return src

    const cacheKey = String(product?.updatedAt || product?.updated_at || product?.modifiedAt || product?.modified_at || '').trim()
    if (!cacheKey) return src

    const separator = src.includes('?') ? '&' : '?'
    return `${src}${separator}v=${encodeURIComponent(cacheKey)}`
}

const resolveAdminProductImage = (product: any) => {
    const imageSrc = (product.thumbImage && product.thumbImage.length > 0
        ? product.thumbImage[0]
        : (product.images && product.images.length > 0 ? product.images[0] : '/images/product/1.webp')) as string

    return appendAdminImageCacheKey(imageSrc || '/images/product/1.webp', product)
}

const toMovementNumber = (value: unknown) => {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const formatMovementNumber = (value: unknown) =>
    toMovementNumber(value).toLocaleString('es-EC', { maximumFractionDigits: 0 })

type ProductMovementPeriod = 'day' | 'week' | 'month' | 'all'

type ProductMovementDetail = {
    product: {
        id: string;
        name: string;
        category: string;
        sku: string;
        quantity: number;
        sold_field: number;
    };
    period: {
        key: ProductMovementPeriod;
        label: string;
        start_date: string | null;
        end_date: string | null;
        timezone: string;
    };
    sales: {
        orders_count: number;
        units_sold: number;
        gross_revenue: number;
        net_revenue: number;
        cost: number;
        profit: number;
        last_sale_at?: string | null;
        orders: Array<{
            id: string;
            created_at?: string | null;
            status: string;
            quantity: number;
            net_total: number;
            cost_total: number;
            profit: number;
            customer_name?: string | null;
            customer_email?: string | null;
        }>;
    };
    purchases: {
        entries_count: number;
        invoices_count: number;
        purchased_units: number;
        remaining_units: number;
        purchase_cost: number;
        last_purchase_at?: string | null;
        lots: Array<{
            id: string;
            purchase_invoice_id?: string | null;
            invoice_number?: string | null;
            supplier_name?: string | null;
            purchase_date?: string | null;
            purchased_quantity: number;
            remaining_quantity: number;
            unit_cost: number;
            purchase_total: number;
        }>;
    };
    inventory: {
        current_stock: number;
        purchase_entries_total: number;
        purchased_units_total: number;
        remaining_purchase_units_total: number;
        remaining_lot_units_total: number;
        open_lots_count: number;
    };
}

const MOVEMENT_PERIOD_OPTIONS: Array<{ key: ProductMovementPeriod; label: string }> = [
    { key: 'day', label: 'Día' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
    { key: 'all', label: 'Todo' },
]

export default React.memo(function ProductsManagementPanel({
    products,
    allProducts,
    summary,
    activeFilter,
    activeQuickFilter,
    searchQuery,
    advancedFilters,
    filterOptions,
    hasPerishableProducts,
    onFilterChange,
    onQuickFilterChange,
    onSearchChange,
    onAdvancedFiltersChange,
    onClearAdvancedFilters,
    onNewProduct,
    onEditProduct,
    onRestockProduct,
    onDuplicateVariant,
    onDeleteProduct,
    onTogglePublication,
    publicationPendingIds,
    isProductEligibleForPublication,
    getProductExpirationMeta,
    formatMoney,
    formatIsoDate,
}: ProductsManagementPanelProps) {
    const hasAdvancedFilters = searchQuery.trim().length > 0
        || advancedFilters.category !== 'all'
        || advancedFilters.supplier !== 'all'
        || advancedFilters.brand !== 'all'
        || advancedFilters.species !== 'all'
        || advancedFilters.tax !== 'all'

    const getCount = React.useCallback((filter: ProductPublicationFilter) => {
        if (filter === 'published') return summary.published
        if (filter === 'hidden') return summary.hidden
        return summary.all
    }, [summary])

    const quickFilters = React.useMemo(() => ([
        { key: 'all', label: 'Todos', count: summary.all },
        { key: 'publishable', label: 'Publicables', count: summary.publishable },
        { key: 'blocked', label: 'Bloqueados', count: summary.blocked },
        { key: 'with-stock', label: 'Con stock', count: summary.withStock },
        { key: 'no-stock', label: 'Sin stock', count: summary.noStock },
        { key: 'no-price', label: 'Sin precio', count: summary.noPrice },
    ]), [summary])

    const activeFilterChips = React.useMemo(() => {
        const chips: Array<{ key: keyof AdminProductAdvancedFilters | 'search'; label: string; value?: string }> = []

        if (searchQuery.trim()) {
            chips.push({ key: 'search', label: 'Búsqueda', value: searchQuery.trim() })
        }
        if (advancedFilters.category !== 'all') {
            chips.push({ key: 'category', label: 'Categoría', value: filterOptions.categories.find((item) => item.value === advancedFilters.category)?.label ?? advancedFilters.category })
        }
        if (advancedFilters.supplier !== 'all') {
            chips.push({ key: 'supplier', label: 'Proveedor', value: filterOptions.suppliers.find((item) => item.value === advancedFilters.supplier)?.label ?? advancedFilters.supplier })
        }
        if (advancedFilters.brand !== 'all') {
            chips.push({ key: 'brand', label: 'Marca', value: filterOptions.brands.find((item) => item.value === advancedFilters.brand)?.label ?? advancedFilters.brand })
        }
        if (advancedFilters.species !== 'all') {
            chips.push({ key: 'species', label: 'Mascota', value: filterOptions.species.find((item) => item.value === advancedFilters.species)?.label ?? advancedFilters.species })
        }
        if (advancedFilters.tax !== 'all') {
            chips.push({ key: 'tax', label: 'Impuesto', value: advancedFilters.tax === 'taxed' ? 'Con IVA' : 'IVA 0%' })
        }

        return chips
    }, [advancedFilters, filterOptions, searchQuery])

    const handleSelectFilterChange = (key: keyof AdminProductAdvancedFilters, value: string) => {
        onAdvancedFiltersChange({
            ...advancedFilters,
            [key]: value,
        })
    }

    const clearSingleFilter = (key: keyof AdminProductAdvancedFilters | 'search') => {
        if (key === 'search') {
            onSearchChange('')
            return
        }

        onAdvancedFiltersChange({
            ...advancedFilters,
            [key]: 'all',
        })
    }

    const sortedProducts = React.useMemo(() => {
        return [...products].sort((left, right) => {
            const familyComparison = compareAdminLabels(getProductVariantFamilyName(left), getProductVariantFamilyName(right))
            if (familyComparison !== 0) return familyComparison
            const groupComparison = compareAdminLabels(getProductVariantGroupKey(left), getProductVariantGroupKey(right))
            if (groupComparison !== 0) return groupComparison
            const variantComparison = compareAdminLabels(getProductVariantSortLabel(left), getProductVariantSortLabel(right))
            if (variantComparison !== 0) return variantComparison
            const nameComparison = compareAdminLabels(String(left?.name || ''), String(right?.name || ''))
            if (nameComparison !== 0) return nameComparison
            return compareAdminLabels(
                String(getAdminProductEntityId(left) || ''),
                String(getAdminProductEntityId(right) || '')
            )
        })
    }, [products])
    const familySummaryByGroupKey = React.useMemo(() => {
        const map = new Map<string, { name: string; variants: number; stock: number }>()

        ;(allProducts || products).forEach((product) => {
            const groupKey = getProductVariantGroupKey(product)
            if (!groupKey) return
            const current = map.get(groupKey) || {
                name: getProductVariantFamilyName(product),
                variants: 0,
                stock: 0,
            }
            current.variants += 1
            current.stock += Number(product?.quantity ?? 0)
            if (!current.name) {
                current.name = getProductVariantFamilyName(product)
            }
            map.set(groupKey, current)
        })

        return map
    }, [allProducts, products])
    const [movementProduct, setMovementProduct] = React.useState<any | null>(null)
    const [movementPeriod, setMovementPeriod] = React.useState<ProductMovementPeriod>('month')
    const [movementDetail, setMovementDetail] = React.useState<ProductMovementDetail | null>(null)
    const [movementLoading, setMovementLoading] = React.useState(false)
    const [movementError, setMovementError] = React.useState<string | null>(null)
    const movementProductId = React.useMemo(
        () => String(movementProduct ? getAdminProductEntityId(movementProduct) : '').trim(),
        [movementProduct],
    )
    const openMovementDetail = React.useCallback((product: any) => {
        setMovementProduct(product)
        setMovementPeriod('month')
        setMovementDetail(null)
        setMovementError(null)
    }, [])
    const closeMovementDetail = React.useCallback(() => {
        if (movementLoading) return
        setMovementProduct(null)
        setMovementDetail(null)
        setMovementError(null)
    }, [movementLoading])

    React.useEffect(() => {
        if (!movementProductId) return

        let active = true
        setMovementLoading(true)
        setMovementError(null)

        withTransientRetry(() => requestApi<ProductMovementDetail>(
            `/api/products/${encodeURIComponent(movementProductId)}/movement?period=${encodeURIComponent(movementPeriod)}`
        ))
            .then((res) => {
                if (!active) return
                setMovementDetail(res.body)
            })
            .catch((error) => {
                if (!active) return
                setMovementDetail(null)
                setMovementError(error instanceof Error && error.message.trim()
                    ? error.message
                    : 'No se pudo cargar el movimiento del producto.')
            })
            .finally(() => {
                if (active) setMovementLoading(false)
            })

        return () => {
            active = false
        }
    }, [movementPeriod, movementProductId])

    return (
        <div className="tab text-content w-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="heading5">Gestión de Productos</div>
                    <p className="text-sm text-secondary mt-1">
                        Mostrando {products.length} de {summary.all} productos.
                    </p>
                </div>
                <button className="button-main py-2 px-6" onClick={onNewProduct}>Nuevo Producto</button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {FILTER_OPTIONS.map((option) => {
                    const isActive = activeFilter === option.key
                    return (
                        <button
                            key={option.key}
                            type="button"
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${isActive ? 'border-black bg-black text-white shadow-sm' : 'border-line bg-white text-black hover:bg-surface'}`}
                            onClick={() => onFilterChange(option.key)}
                        >
                            <span>{option.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-surface text-secondary'}`}>
                                {getCount(option.key)}
                            </span>
                        </button>
                    )
                })}
            </div>

            <div className="mb-6 rounded-[28px] border border-line bg-white px-4 py-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] sm:px-5">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative flex-1">
                            <Icon.MagnifyingGlass size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--blue)]" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => onSearchChange(event.target.value)}
                                placeholder="Buscar por marca, producto, categoría, SKU, proveedor o mascota"
                                spellCheck={false}
                                className="h-12 w-full rounded-full border border-[rgba(0,127,155,0.18)] bg-white pl-12 pr-24 text-[15px] text-black shadow-[0_8px_20px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:text-[rgba(15,23,42,0.45)] focus:border-[var(--blue)] focus:shadow-[0_12px_28px_rgba(0,127,155,0.12)]"
                            />
                            {searchQuery.trim() ? (
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 inline-flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(0,127,155,0.14)] bg-[rgba(0,127,155,0.06)] px-3 text-[12px] font-semibold text-[var(--blue)] transition-all hover:bg-[rgba(0,127,155,0.12)] hover:text-black"
                                    onClick={() => onSearchChange('')}
                                >
                                    Limpiar
                                </button>
                            ) : (
                                <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">
                                    Buscar
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            <div className="inline-flex items-center rounded-full bg-surface px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                {products.length} producto{products.length === 1 ? '' : 's'}
                            </div>
                            {hasAdvancedFilters && (
                                <div className="inline-flex items-center rounded-full bg-surface px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                    Filtros activos
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">Categoría</span>
                            <select
                                value={advancedFilters.category}
                                onChange={(event) => handleSelectFilterChange('category', event.target.value)}
                                className="h-11 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition-all focus:border-black"
                            >
                                <option value="all">Todas</option>
                                {filterOptions.categories.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">Proveedor</span>
                            <select
                                value={advancedFilters.supplier}
                                onChange={(event) => handleSelectFilterChange('supplier', event.target.value)}
                                className="h-11 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition-all focus:border-black"
                            >
                                <option value="all">Todos</option>
                                {filterOptions.suppliers.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">Marca</span>
                            <select
                                value={advancedFilters.brand}
                                onChange={(event) => handleSelectFilterChange('brand', event.target.value)}
                                className="h-11 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition-all focus:border-black"
                            >
                                <option value="all">Todas</option>
                                {filterOptions.brands.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">Mascota</span>
                            <select
                                value={advancedFilters.species}
                                onChange={(event) => handleSelectFilterChange('species', event.target.value)}
                                className="h-11 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition-all focus:border-black"
                            >
                                <option value="all">Todas</option>
                                {filterOptions.species.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">Impuestos</span>
                            <select
                                value={advancedFilters.tax}
                                onChange={(event) => handleSelectFilterChange('tax', event.target.value as AdminProductAdvancedFilters['tax'])}
                                className="h-11 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition-all focus:border-black"
                            >
                                <option value="all">Todos</option>
                                <option value="exempt">IVA 0%</option>
                                <option value="taxed">Con IVA</option>
                            </select>
                        </label>
                    </div>

                    {activeFilterChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {activeFilterChips.map((chip) => (
                                <button
                                    key={`${chip.key}-${chip.value ?? ''}`}
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-full bg-[rgba(0,127,155,0.08)] px-3 py-2 text-[12px] font-semibold text-[var(--blue)] transition-all hover:bg-[rgba(0,127,155,0.14)] hover:text-black"
                                    onClick={() => clearSingleFilter(chip.key)}
                                >
                                    <Icon.X size={12} weight="bold" />
                                    <span>{chip.label}: {chip.value}</span>
                                </button>
                            ))}
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[12px] font-semibold text-secondary transition-all hover:border-black hover:text-black"
                                onClick={onClearAdvancedFilters}
                            >
                                <Icon.X size={12} weight="bold" />
                                Limpiar todo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {quickFilters.map((filter) => {
                    const isActive = activeQuickFilter === filter.key
                    return (
                        <button
                            key={filter.key}
                            type="button"
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${isActive ? 'border-black bg-black text-white shadow-sm' : 'border-line bg-white text-secondary hover:bg-surface hover:text-black'}`}
                            onClick={() => onQuickFilterChange(filter.key as ProductsManagementPanelProps['activeQuickFilter'])}
                        >
                            <span>{filter.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-white/20 text-white' : 'bg-surface text-secondary'}`}>
                                {filter.count}
                            </span>
                        </button>
                    )
                })}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-line">
                            <th className="pb-4 font-bold text-secondary">Imagen</th>
                            <th className="pb-4 font-bold text-secondary">Producto</th>
                            <th className="pb-4 font-bold text-secondary">Stock</th>
                            {hasPerishableProducts && (
                                <th className="pb-4 font-bold text-secondary">Vencimiento</th>
                            )}
                            <th className="pb-4 font-bold text-secondary">Publicado</th>
                            <th className="pb-4 font-bold text-secondary">Precio</th>
                            <th className="pb-4 font-bold text-secondary">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProducts.length > 0 ? sortedProducts.map((product, index) => {
                            const expirationMeta = getProductExpirationMeta(product)
                            const canPublish = isProductEligibleForPublication(product)
                            const productId = getAdminProductEntityId(product)
                            const publicationPending = Boolean(publicationPendingIds[productId])
                            const itemKey = productId || String(product?.id || product?.legacyId || product?.name || `product-${index}`)
                            const variantMeta = getProductVariantMeta(product)
                            const variantGroupKey = getProductVariantGroupKey(product)
                            const familySummary = variantGroupKey ? familySummaryByGroupKey.get(variantGroupKey) : undefined
                            const imageSrc = resolveAdminProductImage(product)

                            return (
                                <tr key={itemKey} className="border-b border-line last:border-0 hover:bg-surface duration-300">
                                    <td className="py-4">
                                        <div className="w-12 h-12 bg-line rounded-lg overflow-hidden">
                                            <img
                                                key={`${itemKey}-${imageSrc}`}
                                                src={imageSrc}
                                                alt={product.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                                onError={(event) => {
                                                    const fallback = '/images/product/1.webp'
                                                    if (event.currentTarget.src.endsWith(fallback)) return
                                                    event.currentTarget.src = fallback
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="space-y-2">
                                            <div className="font-semibold">{product.name}</div>
                                            {(variantMeta.badges.length > 0 || variantMeta.sku) && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {variantMeta.badges.map((badge) => (
                                                        <span
                                                            key={`${itemKey}-${badge}`}
                                                            className="inline-flex rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-secondary"
                                                        >
                                                            {badge}
                                                        </span>
                                                    ))}
                                                    {variantMeta.sku && (
                                                        <span className="text-[11px] text-secondary">
                                                            SKU: {variantMeta.sku}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {familySummary && familySummary.variants > 1 && (
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-secondary">
                                                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                                                        Familia: {familySummary.name || 'Sin nombre'}
                                                    </span>
                                                    <span>{familySummary.variants} variantes</span>
                                                    <span>{familySummary.stock.toLocaleString('es-EC')} unidades en la familia</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4">{product.quantity ?? 0} unidades</td>
                                    {hasPerishableProducts && (
                                        <td className="py-4">
                                            {expirationMeta.isFood ? (
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold">{formatIsoDate(expirationMeta.expirationDate)}</div>
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${expirationMeta.badge.className}`}>
                                                        {expirationMeta.badge.label}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-secondary">-</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="py-4">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={product.published !== false}
                                                disabled={publicationPending || (!canPublish && product.published === false)}
                                                className={`relative inline-flex h-11 w-24 items-center rounded-full border-2 transition-all shadow-sm ${
                                                    product.published !== false
                                                        ? 'border-emerald-700 bg-emerald-500'
                                                        : canPublish
                                                            ? 'border-slate-400 bg-slate-100'
                                                            : 'border-amber-300 bg-amber-50'
                                                } ${publicationPending || (!canPublish && product.published === false) ? 'cursor-not-allowed opacity-80' : 'hover:scale-[1.02] hover:shadow-md'}`}
                                                onClick={() => onTogglePublication(product, product.published === false)}
                                                title={!canPublish && product.published === false ? 'Necesita precio y stock para publicarse' : (product.published !== false ? 'Despublicar artículo' : 'Publicar artículo')}
                                            >
                                                <span
                                                    className={`pointer-events-none absolute inset-y-0 flex items-center text-[10px] font-bold uppercase tracking-[0.08em] ${
                                                        product.published !== false
                                                            ? 'left-3 text-emerald-100'
                                                            : canPublish
                                                                ? 'right-3 text-slate-700'
                                                                : 'right-2 text-amber-700'
                                                    }`}
                                                >
                                                    {product.published !== false ? 'Activo' : (canPublish ? 'Off' : 'Lock')}
                                                </span>
                                                <span
                                                    className={`inline-flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow transition-transform border border-black/10 ${
                                                        product.published !== false ? 'translate-x-14' : 'translate-x-1'
                                                    }`}
                                                >
                                                    {product.published !== false ? (
                                                        <Icon.Check size={16} weight="bold" className="text-emerald-600" />
                                                    ) : canPublish ? (
                                                        <Icon.X size={16} weight="bold" className="text-slate-500" />
                                                    ) : (
                                                        <Icon.Lock size={14} weight="bold" className="text-amber-600" />
                                                    )}
                                                </span>
                                            </button>
                                            <span className={`inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                publicationPending
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : product.published !== false
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : canPublish
                                                            ? 'bg-slate-200 text-slate-700'
                                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {publicationPending ? 'Guardando...' : (product.published !== false ? 'Publicado' : (canPublish ? 'Oculto' : 'Bloqueado'))}
                                            </span>
                                            {!canPublish && (
                                                <span className="text-[11px] text-amber-700 font-medium">
                                                    Requiere precio y stock
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 font-bold">${Number(product.price).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-line transition-colors"
                                                onClick={() => openMovementDetail(product)}
                                                title="Ver movimiento"
                                                aria-label="Ver ventas y compras por período"
                                            >
                                                <Icon.ChartBar size={18} />
                                                <span className="hidden xl:inline text-xs font-semibold">Movimiento</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-line transition-colors"
                                                onClick={() => onRestockProduct(product)}
                                                title="Registrar compra"
                                                aria-label="Registrar compra"
                                            >
                                                <Icon.Package size={18} />
                                                <span className="hidden xl:inline text-xs font-semibold">Compra</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-line transition-colors"
                                                onClick={() => onEditProduct(product)}
                                                title="Editar / ajustar"
                                                aria-label="Editar o ajustar inventario"
                                            >
                                                <Icon.PencilSimple size={18} />
                                                <span className="hidden xl:inline text-xs font-semibold">Editar</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-line transition-colors"
                                                onClick={() => onDuplicateVariant(product)}
                                                title="Duplicar variante"
                                                aria-label="Duplicar variante"
                                            >
                                                <Icon.Copy size={18} />
                                                <span className="hidden xl:inline text-xs font-semibold">Variante</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-line transition-colors text-red"
                                                onClick={() => onDeleteProduct(productId)}
                                                title="Retirar producto"
                                                aria-label="Retirar producto"
                                            >
                                                <Icon.Trash size={18} />
                                                <span className="hidden xl:inline text-xs font-semibold">Retirar</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={hasPerishableProducts ? 7 : 6} className="py-8 text-center text-secondary">
                                    No se encontraron productos para este filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {movementProduct && (
                <div
                    className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4"
                    onClick={closeMovementDetail}
                >
                    <div
                        className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
                            <div className="min-w-0">
                                <div className="heading5 truncate">
                                    {movementDetail?.product?.name || movementProduct?.name || 'Movimiento del producto'}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-secondary">
                                    <span>{movementDetail?.product?.category || movementProduct?.category || 'Sin categoría'}</span>
                                    {(movementDetail?.product?.sku || movementProduct?.attributes?.sku) && (
                                        <span>SKU {movementDetail?.product?.sku || movementProduct?.attributes?.sku}</span>
                                    )}
                                    {movementDetail?.period && (
                                        <span>
                                            {movementDetail.period.label}
                                            {movementDetail.period.start_date && movementDetail.period.end_date
                                                ? `: ${formatIsoDate(movementDetail.period.start_date)} - ${formatIsoDate(movementDetail.period.end_date)}`
                                                : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="rounded-full p-2 text-secondary transition-colors hover:bg-surface hover:text-black disabled:opacity-50"
                                onClick={closeMovementDetail}
                                disabled={movementLoading}
                                aria-label="Cerrar movimiento"
                            >
                                <Icon.X size={22} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5">
                            <div className="mb-5 flex flex-wrap gap-2">
                                {MOVEMENT_PERIOD_OPTIONS.map((option) => {
                                    const isActive = movementPeriod === option.key
                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                                                isActive
                                                    ? 'border-black bg-black text-white'
                                                    : 'border-line bg-white text-secondary hover:border-black hover:text-black'
                                            }`}
                                            onClick={() => setMovementPeriod(option.key)}
                                            disabled={movementLoading && isActive}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>

                            {movementError && (
                                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red">
                                    {movementError}
                                </div>
                            )}

                            {movementLoading && !movementDetail ? (
                                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-line bg-surface text-sm text-secondary">
                                    Cargando movimiento del producto...
                                </div>
                            ) : movementDetail ? (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
                                        <div className="rounded-xl border border-line bg-surface p-4">
                                            <div className="text-[10px] font-bold uppercase text-secondary">Pedidos</div>
                                            <div className="mt-1 text-xl font-bold">{formatMovementNumber(movementDetail.sales.orders_count)}</div>
                                        </div>
                                        <div className="rounded-xl border border-line bg-surface p-4">
                                            <div className="text-[10px] font-bold uppercase text-secondary">Vendido</div>
                                            <div className="mt-1 text-xl font-bold">{formatMovementNumber(movementDetail.sales.units_sold)} uds</div>
                                        </div>
                                        <div className="rounded-xl border border-line bg-surface p-4">
                                            <div className="text-[10px] font-bold uppercase text-secondary">Comprado</div>
                                            <div className="mt-1 text-xl font-bold">{formatMovementNumber(movementDetail.purchases.purchased_units)} uds</div>
                                        </div>
                                        <div className="rounded-xl border border-line bg-surface p-4">
                                            <div className="text-[10px] font-bold uppercase text-secondary">Facturas compra</div>
                                            <div className="mt-1 text-xl font-bold">{formatMovementNumber(movementDetail.purchases.invoices_count || movementDetail.purchases.entries_count)}</div>
                                        </div>
                                        <div className="rounded-xl border border-line bg-surface p-4">
                                            <div className="text-[10px] font-bold uppercase text-secondary">Venta neta</div>
                                            <div className="mt-1 text-xl font-bold">{formatMoney(movementDetail.sales.net_revenue)}</div>
                                        </div>
                                        <div className="rounded-xl border border-line bg-surface p-4">
                                            <div className="text-[10px] font-bold uppercase text-secondary">Utilidad</div>
                                            <div className={`mt-1 text-xl font-bold ${Number(movementDetail.sales.profit ?? 0) < 0 ? 'text-red' : 'text-success'}`}>
                                                {formatMoney(movementDetail.sales.profit)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        <div className="rounded-xl border border-line bg-white p-4">
                                            <div className="text-sm font-bold">Inventario actual</div>
                                            <div className="mt-3 space-y-2 text-sm">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Stock ficha</span>
                                                    <span className="font-bold">{formatMovementNumber(movementDetail.inventory.current_stock)} uds</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Comprado histórico</span>
                                                    <span className="font-bold">{formatMovementNumber(movementDetail.inventory.purchased_units_total)} uds</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Restante en lotes</span>
                                                    <span className="font-bold">{formatMovementNumber(movementDetail.inventory.remaining_lot_units_total)} uds</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Lotes abiertos</span>
                                                    <span className="font-bold">{formatMovementNumber(movementDetail.inventory.open_lots_count)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-line bg-white p-4">
                                            <div className="text-sm font-bold">Ventas del período</div>
                                            <div className="mt-3 space-y-2 text-sm">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Venta bruta</span>
                                                    <span className="font-bold">{formatMoney(movementDetail.sales.gross_revenue)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Costo</span>
                                                    <span className="font-bold">{formatMoney(movementDetail.sales.cost)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Última venta</span>
                                                    <span className="font-bold">{movementDetail.sales.last_sale_at ? formatIsoDate(String(movementDetail.sales.last_sale_at).slice(0, 10)) : '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-line bg-white p-4">
                                            <div className="text-sm font-bold">Compras del período</div>
                                            <div className="mt-3 space-y-2 text-sm">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Costo compra</span>
                                                    <span className="font-bold">{formatMoney(movementDetail.purchases.purchase_cost)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Restante de esas compras</span>
                                                    <span className="font-bold">{formatMovementNumber(movementDetail.purchases.remaining_units)} uds</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-secondary">Última compra</span>
                                                    <span className="font-bold">{movementDetail.purchases.last_purchase_at ? formatIsoDate(String(movementDetail.purchases.last_purchase_at).slice(0, 10)) : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                        <div className="rounded-xl border border-line bg-white">
                                            <div className="border-b border-line px-4 py-3 text-sm font-bold">Pedidos del período</div>
                                            <div className="max-h-[320px] overflow-y-auto">
                                                {movementDetail.sales.orders.length > 0 ? movementDetail.sales.orders.map((order) => (
                                                    <div key={order.id} className="border-b border-line px-4 py-3 last:border-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="break-all text-sm font-bold">#{order.id}</div>
                                                                <div className="text-xs text-secondary">
                                                                    {order.created_at ? formatIsoDate(String(order.created_at).slice(0, 10)) : '-'} · {order.status}
                                                                </div>
                                                                <div className="truncate text-xs text-secondary">
                                                                    {order.customer_name || order.customer_email || 'Cliente sin nombre'}
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-right text-sm">
                                                                <div className="font-bold">{formatMovementNumber(order.quantity)} uds</div>
                                                                <div className="text-xs text-secondary">{formatMoney(order.net_total)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="px-4 py-8 text-center text-sm text-secondary">Sin ventas en este período.</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-line bg-white">
                                            <div className="border-b border-line px-4 py-3 text-sm font-bold">Compras del período</div>
                                            <div className="max-h-[320px] overflow-y-auto">
                                                {movementDetail.purchases.lots.length > 0 ? movementDetail.purchases.lots.map((lot) => (
                                                    <div key={lot.id} className="border-b border-line px-4 py-3 last:border-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="break-all text-sm font-bold">{lot.invoice_number || 'Factura sin número'}</div>
                                                                <div className="text-xs text-secondary">
                                                                    {lot.purchase_date ? formatIsoDate(String(lot.purchase_date).slice(0, 10)) : '-'} · {lot.supplier_name || 'Sin proveedor'}
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-right text-sm">
                                                                <div className="font-bold">{formatMovementNumber(lot.purchased_quantity)} uds</div>
                                                                <div className="text-xs text-secondary">{formatMoney(lot.purchase_total)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="px-4 py-8 text-center text-sm text-secondary">Sin compras registradas en este período.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
})
