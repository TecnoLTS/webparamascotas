'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"
import type { InventoryIntelligence, InventoryRecommendedAction } from '../types'

type InventorySummary = {
    totalSkus: number;
    totalUnits: number;
    totalCost: number;
    totalMarket: number;
    out: number;
    critical: number;
    low: number;
    expiring: number;
    expired: number;
}

type PurchaseInvoicesSummary = {
    totalInvoices: number;
    totalUnits: number;
    totalAmount: number;
    suppliersCount: number;
}

type InventoryManagementPanelProps = {
    summary: InventorySummary;
    rows: any[];
    intelligence?: InventoryIntelligence | null;
    searchQuery: string;
    statusFilter: 'all' | 'available' | 'low' | 'critical' | 'out' | 'expiring' | 'expired';
    typeFilter: 'all' | 'perishable' | 'nonperishable';
    purchaseInvoicesSummary: PurchaseInvoicesSummary;
    recentPurchaseInvoices: any[];
    purchaseInvoicesLoading: boolean;
    hasPerishableProducts: boolean;
    lowStockThreshold: number;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: 'all' | 'available' | 'low' | 'critical' | 'out' | 'expiring' | 'expired') => void;
    onTypeFilterChange: (value: 'all' | 'perishable' | 'nonperishable') => void;
    onClearFilters: () => void;
    onNavigateToProducts: () => void;
    onNewProduct: () => void;
    onReloadPurchaseInvoices: () => void;
    onOpenPurchaseInvoice: (id: string) => void;
    onOpenProductBalance: (product: any) => void;
    onEditProduct: (product: any) => void;
    onRestockProduct: (product: any) => void;
    onOpenLowStockDetail: () => void;
    onOpenCriticalStockDetail: () => void;
    onOpenOutOfStockDetail: () => void;
    onOpenExpiringDetail: () => void;
    onOpenExpiredDetail: () => void;
    formatMoney: (value: number | string | null | undefined) => string;
    formatIsoDate: (value?: string | null) => string;
    formatDateEcuador: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
    formatDateTimeEcuador: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const INVENTORY_STATUS_OPTIONS: Array<{ key: InventoryManagementPanelProps['statusFilter']; label: string }> = [
    { key: 'all', label: 'Todos los estados' },
    { key: 'available', label: 'Disponible' },
    { key: 'low', label: 'Bajo stock' },
    { key: 'critical', label: 'Crítico' },
    { key: 'out', label: 'Sin stock' },
    { key: 'expiring', label: 'Por vencer' },
    { key: 'expired', label: 'Vencidos' },
]

const INVENTORY_TYPE_OPTIONS: Array<{ key: InventoryManagementPanelProps['typeFilter']; label: string }> = [
    { key: 'all', label: 'Todos los tipos' },
    { key: 'perishable', label: 'Solo perecederos' },
    { key: 'nonperishable', label: 'Solo no perecederos' },
]

const INVENTORY_ACTION_OPTIONS: Array<{ key: 'all' | InventoryRecommendedAction; label: string }> = [
    { key: 'all', label: 'Todas las acciones' },
    { key: 'restock_now', label: 'Comprar ahora' },
    { key: 'restock_soon', label: 'Reponer pronto' },
    { key: 'rotate_or_discount', label: 'Rotar/liquidar' },
    { key: 'remove_expired', label: 'Retirar vencido' },
    { key: 'reduce_or_promote', label: 'Liberar capital' },
    { key: 'fix_data', label: 'Completar datos' },
    { key: 'review_assortment', label: 'Revisar surtido' },
    { key: 'monitor', label: 'Monitorear' },
]

const getInventoryActionLabel = (action?: string) => {
    const option = INVENTORY_ACTION_OPTIONS.find((item) => item.key === action)
    return option?.label || 'Monitorear'
}

const getActionTone = (action?: string) => {
    if (action === 'restock_now' || action === 'remove_expired') return 'bg-red-100 text-red-700'
    if (action === 'restock_soon' || action === 'rotate_or_discount') return 'bg-amber-100 text-amber-800'
    if (action === 'reduce_or_promote') return 'bg-blue-100 text-blue-800'
    if (action === 'fix_data' || action === 'review_assortment') return 'bg-surface text-secondary'
    return 'bg-emerald-100 text-emerald-700'
}

const escapeCsvCell = (value: unknown) => {
    const text = String(value ?? '')
    if (/[",\n\r;]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }
    return text
}

const downloadCsv = (filename: string, rows: unknown[][]) => {
    if (typeof window === 'undefined') return
    const content = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function renderSummaryCardButton({
    label,
    count,
    caption,
    isActive,
    activeClass,
    hoverClass,
    icon,
    onClick,
    onDetail,
}: {
    label: string;
    count: string | number;
    caption: string;
    isActive: boolean;
    activeClass: string;
    hoverClass: string;
    icon: React.ReactNode;
    onClick: () => void;
    onDetail?: () => void;
}) {
    return (
        <div
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative group ${isActive ? activeClass : `border-line bg-white ${hoverClass}`}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0" onClick={onClick}>
                    <div className="text-[10px] uppercase font-bold text-secondary mb-1">{label}</div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-secondary mt-1">{caption}</div>
                </div>
                <div className="shrink-0 ml-2 mt-1">
                    {icon}
                </div>
            </div>
            {onDetail && (
                <button
                    type="button"
                    className="mt-2 w-full text-xs font-semibold text-secondary hover:text-black transition-all rounded-lg border border-line px-2 py-1.5 hover:bg-surface/50"
                    onClick={(e) => { e.stopPropagation(); onDetail() }}
                >
                    <Icon.ArrowSquareOut size={14} className="inline-block -mt-0.5 mr-1" />
                    Ver detalle
                </button>
            )}
        </div>
    )
}

function InventoryCategoryOverview({ rows }: { rows: any[] }) {
    const categoryMap = React.useMemo(() => {
        const map = new Map<string, { skus: number; units: number; cost: number; low: number; expiring: number }>()
        for (const row of rows) {
            const cat = row.category || 'Sin categoría'
            const entry = map.get(cat) || { skus: 0, units: 0, cost: 0, low: 0, expiring: 0 }
            entry.skus += 1
            entry.units += row.stock ?? 0
            entry.cost += row.inventoryCost ?? 0
            if (row.stockStatus === 'low' || row.stockStatus === 'critical') entry.low += 1
            if (row.stockStatus === 'expiring') entry.expiring += 1
            map.set(cat, entry)
        }
        return Array.from(map.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.cost - a.cost)
    }, [rows])

    if (categoryMap.length === 0) return null

    const maxCost = categoryMap[0]?.cost || 1

    return (
        <div className="p-5 rounded-2xl border border-line bg-white">
            <div className="heading6 mb-4">Panorama por categoría</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-line">
                        <tr className="text-[11px] uppercase font-bold text-secondary">
                            <th className="pb-2 pr-4">Categoría</th>
                            <th className="pb-2 pr-4 text-right">SKUs</th>
                            <th className="pb-2 pr-4 text-right">Unidades</th>
                            <th className="pb-2 pr-4 text-right">Capital</th>
                            <th className="pb-2 pr-4 text-center" title="Bajo stock / Crítico">⚠️</th>
                            <th className="pb-2 pr-4 text-center" title="Por vencer">📅</th>
                            <th className="pb-2 w-full hidden md:block" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {categoryMap.slice(0, 8).map((cat) => (
                            <tr key={cat.name} className="text-sm hover:bg-surface/40">
                                <td className="py-2.5 pr-4 font-medium break-words max-w-[180px]">{cat.name}</td>
                                <td className="py-2.5 pr-4 text-right text-secondary">{cat.skus}</td>
                                <td className="py-2.5 pr-4 text-right text-secondary">{cat.units.toLocaleString('es-EC')}</td>
                                <td className="py-2.5 pr-4 text-right font-semibold">{(cat.cost).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2.5 pr-4 text-center">
                                    {cat.low > 0 ? <span className="text-amber-700 font-bold text-xs">{cat.low}</span> : <span className="text-secondary text-xs">—</span>}
                                </td>
                                <td className="py-2.5 pr-4 text-center">
                                    {cat.expiring > 0 ? <span className="text-amber-700 font-bold text-xs">{cat.expiring}</span> : <span className="text-secondary text-xs">—</span>}
                                </td>
                                <td className="py-2.5 hidden md:table-cell">
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
                                        <div className="h-full rounded-full bg-black/20" style={{ width: `${Math.max(2, (cat.cost / maxCost) * 100)}%` }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function RestockSuggestionsPanel({ rows, formatMoney, onRestockProduct }: {
    rows: any[];
    formatMoney: (value: any) => string;
    onRestockProduct: (product: any) => void;
}) {
    const needsRestock = React.useMemo(() =>
        rows.filter((r: any) => r.stockStatus === 'critical' || r.stockStatus === 'low' || r.stockStatus === 'out')
            .sort((a: any, b: any) => {
                const order: Record<string, number> = { out: 0, critical: 1, low: 2 }
                return (order[a.stockStatus] ?? 99) - (order[b.stockStatus] ?? 99)
            })
            .slice(0, 5),
        [rows]
    )

    if (needsRestock.length === 0) return null

    return (
        <div className="p-5 rounded-2xl border border-line bg-white">
            <div className="heading6 mb-1">Alertas de reabastecimiento</div>
            <p className="text-sm text-secondary mb-4">Productos prioritarios para reposición urgente</p>
            <div className="space-y-2">
                {needsRestock.map((row: any) => {
                    const suggestedQty = row.stockStatus === 'out'
                        ? Math.max(row.reorderPoint * 2, 10)
                        : Math.max(row.reorderPoint - row.stock + Math.ceil(row.reorderPoint * 0.5), 1)
                    return (
                        <div key={row.internalId} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-surface/40 transition-all">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{row.name}</div>
                                <div className="text-xs text-secondary">
                                    Stock: <span className={`font-semibold ${row.stock <= 0 ? 'text-red' : 'text-amber-700'}`}>{row.stock.toLocaleString('es-EC')}</span>
                                    {' · '}Reorder: {row.reorderPoint.toLocaleString('es-EC')}
                                    {' · '}Sugerido: <span className="text-emerald-700 font-semibold">+{suggestedQty} uds</span>
                                </div>
                            </div>
                            <div className="text-xs text-right shrink-0">
                                <div className="font-semibold">{formatMoney(suggestedQty * row.weightedUnitCost)}</div>
                                <button
                                    type="button"
                                    className="mt-1 px-2.5 py-1 rounded-lg border border-black bg-black text-white text-[10px] font-semibold hover:bg-primary transition-all"
                                    onClick={() => onRestockProduct(row.source)}
                                >
                                    Comprar
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function InventoryIntelligenceSummary({
    intelligence,
    formatMoney,
    onExportPurchasePlan,
    onRestockProduct,
    productById,
}: {
    intelligence?: InventoryIntelligence | null;
    formatMoney: (value: any) => string;
    onExportPurchasePlan: () => void;
    onRestockProduct: (product: any) => void;
    productById: Map<string, any>;
}) {
    if (!intelligence) {
        return null
    }

    const topActions = (intelligence.actions || []).slice(0, 6)
    const topPurchaseGroups = (intelligence.purchasePlan || []).slice(0, 4)

    return (
        <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl border border-line bg-white">
                    <div className="text-[10px] uppercase font-bold text-secondary">Compra sugerida</div>
                    <div className="text-2xl font-bold mt-1">{formatMoney(intelligence.summary.suggested_purchase_cost)}</div>
                    <div className="text-xs text-secondary mt-1">{intelligence.summary.suggested_purchase_units.toLocaleString('es-EC')} uds / {intelligence.summary.purchase_recommended_skus.toLocaleString('es-EC')} SKU</div>
                </div>
                <div className="p-4 rounded-xl border border-line bg-white">
                    <div className="text-[10px] uppercase font-bold text-secondary">Riesgo operativo</div>
                    <div className="text-2xl font-bold mt-1">{intelligence.summary.risk_skus.toLocaleString('es-EC')}</div>
                    <div className="text-xs text-secondary mt-1">quiebres, bajos, vencidos o por vencer</div>
                </div>
                <div className="p-4 rounded-xl border border-line bg-white">
                    <div className="text-[10px] uppercase font-bold text-secondary">Capital inmovilizado</div>
                    <div className="text-2xl font-bold mt-1">{formatMoney(intelligence.summary.inventory_cost)}</div>
                    <div className="text-xs text-secondary mt-1">margen promedio {Number(intelligence.summary.avg_margin ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 1 })}%</div>
                </div>
                <div className="p-4 rounded-xl border border-line bg-white">
                    <div className="text-[10px] uppercase font-bold text-secondary">Sobrestock</div>
                    <div className="text-2xl font-bold mt-1">{formatMoney(intelligence.summary.overstock_capital)}</div>
                    <div className="text-xs text-secondary mt-1">{Number(intelligence.health.overstock ?? 0).toLocaleString('es-EC')} SKU sobre máximo</div>
                </div>
                <div className="p-4 rounded-xl border border-line bg-white">
                    <div className="text-[10px] uppercase font-bold text-secondary">Datos por corregir</div>
                    <div className="text-2xl font-bold mt-1">{Number(intelligence.health.data_quality_issues ?? 0).toLocaleString('es-EC')}</div>
                    <div className="text-xs text-secondary mt-1">SKU, costo, precio, proveedor o lote</div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-4">
                <div className="p-5 rounded-2xl border border-line bg-white">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                            <div className="heading6">Qué hacer ahora</div>
                            <p className="text-sm text-secondary mt-1">Prioridad balanceada por ventas, cobertura, margen, capital y vencimientos.</p>
                        </div>
                        <div className="text-xs text-secondary">
                            Ventana {intelligence.parameters.window_days}d · objetivo {intelligence.parameters.target_days}d
                        </div>
                    </div>
                    <div className="space-y-2">
                        {topActions.map((action) => {
                            const sourceProduct = productById.get(action.product_id)
                            return (
                                <div key={action.id} className="flex flex-col gap-3 rounded-xl border border-line p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${action.severity === 'critical' ? 'bg-red-100 text-red-700' : action.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-surface text-secondary'}`}>
                                                {action.priority_score}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getActionTone(action.action)}`}>
                                                {action.title}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-semibold break-words">{action.name}</div>
                                        <div className="text-xs text-secondary">{action.detail}</div>
                                    </div>
                                    <div className="shrink-0 text-left md:text-right">
                                        {action.suggested_purchase_qty > 0 && (
                                            <div className="text-xs text-secondary mb-2">
                                                +{action.suggested_purchase_qty.toLocaleString('es-EC')} uds · {formatMoney(action.suggested_purchase_cost)}
                                            </div>
                                        )}
                                        {sourceProduct && action.suggested_purchase_qty > 0 && (
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg border border-black bg-black text-white text-xs font-semibold hover:bg-primary transition-all"
                                                onClick={() => onRestockProduct(sourceProduct)}
                                            >
                                                Registrar compra
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {topActions.length === 0 && (
                            <div className="rounded-xl border border-line bg-surface p-4 text-sm text-secondary">
                                No hay acciones urgentes con la información actual.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-line bg-white">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <div className="heading6">Plan de compra</div>
                            <p className="text-sm text-secondary mt-1">Agrupado por proveedor para comprar sin revisar SKU por SKU.</p>
                        </div>
                        <button
                            type="button"
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface transition-all"
                            onClick={onExportPurchasePlan}
                            disabled={(intelligence.purchasePlan || []).length === 0}
                        >
                            Exportar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {topPurchaseGroups.map((group) => (
                            <div key={group.supplier} className="rounded-xl border border-line bg-surface p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-sm break-words">{group.supplier}</div>
                                        <div className="text-xs text-secondary">{group.items_count} SKU · {group.units.toLocaleString('es-EC')} uds</div>
                                    </div>
                                    <div className="text-sm font-bold">{formatMoney(group.estimated_cost)}</div>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-secondary">
                                    {group.items.slice(0, 3).map((item) => (
                                        <div key={item.product_id} className="flex justify-between gap-2">
                                            <span className="truncate">{item.name}</span>
                                            <span className="font-semibold text-black">+{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {topPurchaseGroups.length === 0 && (
                            <div className="rounded-xl border border-line bg-surface p-4 text-sm text-secondary">
                                No hay compras sugeridas; revisa rotación o datos faltantes antes de reponer.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default React.memo(function InventoryManagementPanel({
    summary,
    rows,
    intelligence,
    searchQuery,
    statusFilter,
    typeFilter,
    purchaseInvoicesSummary,
    recentPurchaseInvoices,
    purchaseInvoicesLoading,
    hasPerishableProducts,
    lowStockThreshold,
    onSearchChange,
    onStatusFilterChange,
    onTypeFilterChange,
    onClearFilters,
    onNavigateToProducts,
    onNewProduct,
    onReloadPurchaseInvoices,
    onOpenPurchaseInvoice,
    onOpenProductBalance,
    onEditProduct,
    onRestockProduct,
    onOpenLowStockDetail,
    onOpenCriticalStockDetail,
    onOpenOutOfStockDetail,
    onOpenExpiringDetail,
    onOpenExpiredDetail,
    formatMoney,
    formatIsoDate,
    formatDateEcuador,
    formatDateTimeEcuador,
}: InventoryManagementPanelProps) {
    const [actionFilter, setActionFilter] = React.useState<'all' | InventoryRecommendedAction>('all')
    const [categoryFilter, setCategoryFilter] = React.useState('all')
    const [supplierFilter, setSupplierFilter] = React.useState('all')

    const intelligenceByProductId = React.useMemo(() => {
        return new Map((intelligence?.rows || []).map((row) => [String(row.product_id), row]))
    }, [intelligence])

    const productById = React.useMemo(() => {
        const map = new Map<string, any>()
        rows.forEach((row) => {
            const source = row.source || row
            const ids = [row.internalId, source?.internalId, source?.id, source?.legacyId, row.legacyId]
                .map((value) => String(value || '').trim())
                .filter(Boolean)
            ids.forEach((id) => map.set(id, source))
        })
        return map
    }, [rows])

    const categoryOptions = React.useMemo(() => {
        return Array.from(new Set(rows.map((row) => String(row.category || 'Sin categoría').trim() || 'Sin categoría')))
            .sort((left, right) => left.localeCompare(right, 'es'))
    }, [rows])

    const supplierOptions = React.useMemo(() => {
        return Array.from(new Set(rows.map((row) => String(row.supplier || 'Proveedor por definir').trim() || 'Proveedor por definir')))
            .sort((left, right) => left.localeCompare(right, 'es'))
    }, [rows])

    const displayRows = React.useMemo(() => {
        return rows.filter((row) => {
            const intel = intelligenceByProductId.get(String(row.internalId || row.source?.id || ''))
                || intelligenceByProductId.get(String(row.source?.id || ''))
                || intelligenceByProductId.get(String(row.legacyId || ''))
            const action = intel?.recommended_action || 'monitor'
            const category = String(row.category || 'Sin categoría').trim() || 'Sin categoría'
            const supplier = String(row.supplier || 'Proveedor por definir').trim() || 'Proveedor por definir'

            if (actionFilter !== 'all' && action !== actionFilter) return false
            if (categoryFilter !== 'all' && category !== categoryFilter) return false
            if (supplierFilter !== 'all' && supplier !== supplierFilter) return false
            return true
        })
    }, [actionFilter, categoryFilter, intelligenceByProductId, rows, supplierFilter])

    const exportPurchasePlan = React.useCallback(() => {
        const plan = intelligence?.purchasePlan || []
        const rowsForCsv: unknown[][] = [[
            'Proveedor',
            'Producto',
            'SKU',
            'Unidades sugeridas',
            'Costo unitario',
            'Costo estimado',
            'Prioridad',
        ]]

        plan.forEach((group) => {
            group.items.forEach((item) => {
                rowsForCsv.push([
                    group.supplier,
                    item.name,
                    item.sku || '',
                    item.quantity,
                    item.unit_cost,
                    item.estimated_cost,
                    item.priority_score,
                ])
            })
        })

        downloadCsv(`plan-compra-inventario-${new Date().toISOString().slice(0, 10)}.csv`, rowsForCsv)
    }, [intelligence])

    return (
        <div className="tab text-content w-full">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
                <div>
                    <div className="heading5">Gestion de Inventario</div>
                    <p className="text-secondary text-sm mt-1">
                        Controla stock, perecibles, vencimientos y valor inmovilizado del catalogo.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-secondary">
                        <span className="rounded-md border border-line bg-surface px-2.5 py-1">Alcance: <span className="text-black">inventario actual</span></span>
                        <span className="rounded-md border border-line bg-surface px-2.5 py-1">Rotación: <span className="text-black">últimos {intelligence?.parameters?.window_days ?? 30} días</span></span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-lg border border-line text-sm font-semibold hover:bg-surface transition-all"
                        onClick={onNavigateToProducts}
                    >
                        Ver catalogo
                    </button>
                    <button type="button" className="button-main py-2 px-6" onClick={onNewProduct}>
                        Nuevo Producto
                    </button>
                </div>
            </div>

            <InventoryIntelligenceSummary
                intelligence={intelligence}
                formatMoney={formatMoney}
                onExportPurchasePlan={exportPurchasePlan}
                onRestockProduct={onRestockProduct}
                productById={productById}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
                {renderSummaryCardButton({
                    label: 'SKUs en inventario',
                    count: summary.totalSkus,
                    caption: `${summary.totalUnits.toLocaleString('es-EC')} unidades`,
                    isActive: statusFilter === 'all',
                    activeClass: 'border-black bg-surface',
                    hoverClass: 'hover:border-black',
                    icon: <Icon.Package size={20} className="text-secondary" />,
                    onClick: () => onStatusFilterChange('all'),
                })}
                {renderSummaryCardButton({
                    label: 'Sin stock',
                    count: summary.out,
                    caption: 'Reposición inmediata',
                    isActive: statusFilter === 'out',
                    activeClass: 'border-red-500 bg-red-50',
                    hoverClass: 'hover:border-red-500',
                    icon: <Icon.WarningCircle size={20} className="text-red" />,
                    onClick: () => onStatusFilterChange('out'),
                    onDetail: onOpenOutOfStockDetail,
                })}
                {renderSummaryCardButton({
                    label: 'Crítico',
                    count: summary.critical,
                    caption: `Stock por debajo del punto crítico`,
                    isActive: statusFilter === 'critical',
                    activeClass: 'border-red-400 bg-red-50',
                    hoverClass: 'hover:border-red-400',
                    icon: <Icon.WarningCircle size={20} className="text-red" />,
                    onClick: () => onStatusFilterChange('critical'),
                    onDetail: onOpenCriticalStockDetail,
                })}
                {renderSummaryCardButton({
                    label: 'Bajo stock',
                    count: summary.low,
                    caption: `Umbral operativo: ${lowStockThreshold} uds o menos`,
                    isActive: statusFilter === 'low',
                    activeClass: 'border-amber-500 bg-amber-50',
                    hoverClass: 'hover:border-amber-500',
                    icon: <Icon.TrendDown size={20} className="text-amber-700" />,
                    onClick: () => onStatusFilterChange('low'),
                    onDetail: onOpenLowStockDetail,
                })}
                {renderSummaryCardButton({
                    label: 'Por vencer',
                    count: summary.expiring,
                    caption: 'Solo productos perecederos',
                    isActive: statusFilter === 'expiring',
                    activeClass: 'border-amber-500 bg-amber-50',
                    hoverClass: 'hover:border-amber-500',
                    icon: <Icon.Clock size={20} className="text-amber-700" />,
                    onClick: () => onStatusFilterChange('expiring'),
                    onDetail: onOpenExpiringDetail,
                })}
                {renderSummaryCardButton({
                    label: 'Vencidos',
                    count: summary.expired,
                    caption: 'Bloqueados para venta',
                    isActive: statusFilter === 'expired',
                    activeClass: 'border-red-500 bg-red-50',
                    hoverClass: 'hover:border-red-500',
                    icon: <Icon.Prohibit size={20} className="text-red" />,
                    onClick: () => onStatusFilterChange('expired'),
                    onDetail: onOpenExpiredDetail,
                })}
                {renderSummaryCardButton({
                    label: 'Capital al costo',
                    count: formatMoney(summary.totalCost),
                    caption: 'Suma del costo de compra de todo el stock',
                    isActive: statusFilter === 'all',
                    activeClass: 'border-black bg-surface',
                    hoverClass: 'hover:border-black',
                    icon: <Icon.Coin size={20} className="text-secondary" />,
                    onClick: () => onStatusFilterChange('all'),
                })}
                {renderSummaryCardButton({
                    label: 'Valor de venta',
                    count: formatMoney(summary.totalMarket),
                    caption: 'Precio de venta total si se liquida todo el stock',
                    isActive: statusFilter === 'all',
                    activeClass: 'border-black bg-surface',
                    hoverClass: 'hover:border-black',
                    icon: <Icon.ShoppingCart size={20} className="text-secondary" />,
                    onClick: () => onStatusFilterChange('all'),
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
                <div className="xl:col-span-2 p-5 rounded-2xl border border-line bg-white" role="region" aria-label="Últimas facturas de compra">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <div className="heading6">Ultimas facturas de compra</div>
                            <p className="text-sm text-secondary mt-1">
                                Trazabilidad reciente de ingresos de inventario y costos de compra. No es un total histórico.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold hover:bg-surface transition-all"
                            onClick={onReloadPurchaseInvoices}
                            disabled={purchaseInvoicesLoading}
                        >
                            {purchaseInvoicesLoading ? 'Actualizando...' : 'Actualizar facturas'}
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full min-w-[760px] text-left">
                            <thead className="bg-surface border-b border-line">
                                <tr className="text-[11px] uppercase font-bold text-secondary">
                                    <th className="px-3 py-3">Factura</th>
                                    <th className="px-3 py-3">Proveedor</th>
                                    <th className="px-3 py-3">Fecha</th>
                                    <th className="px-3 py-3 text-right">Productos</th>
                                    <th className="px-3 py-3 text-right">Unidades</th>
                                    <th className="px-3 py-3 text-right">Total</th>
                                    <th className="px-3 py-3">Accion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {recentPurchaseInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-surface/40">
                                        <td className="px-3 py-3">
                                            <div className="text-sm font-semibold">{invoice.invoice_number || '-'}</div>
                                            <div className="text-xs text-secondary">{invoice.notes || 'Sin observaciones'}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="text-sm">{invoice.supplier_name || '-'}</div>
                                            <div className="text-xs text-secondary">{invoice.supplier_document || 'Sin documento'}</div>
                                        </td>
                                        <td className="px-3 py-3 text-sm">
                                            <div>{formatIsoDate(invoice.issued_at)}</div>
                                            <div className="text-xs text-secondary">{formatDateTimeEcuador(invoice.created_at, { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="px-3 py-3 text-right text-sm">{Number(invoice.products_count ?? 0).toLocaleString('es-EC')}</td>
                                        <td className="px-3 py-3 text-right text-sm">{Number(invoice.units_total ?? 0).toLocaleString('es-EC')}</td>
                                        <td className="px-3 py-3 text-right text-sm font-semibold">{formatMoney(invoice.total)}</td>
                                        <td className="px-3 py-3">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface transition-all"
                                                onClick={() => onOpenPurchaseInvoice(invoice.id)}
                                            >
                                                Ver detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!purchaseInvoicesLoading && recentPurchaseInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-secondary">
                                            Aun no hay facturas de compra registradas para este tenant.
                                        </td>
                                    </tr>
                                )}
                                {purchaseInvoicesLoading && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-secondary">
                                            Cargando facturas de compra...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-line bg-white">
                    <div className="heading6 mb-4">Resumen de compras</div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-surface border border-line">
                            <div className="text-[10px] uppercase font-bold text-secondary">Facturas recientes</div>
                            <div className="text-2xl font-bold mt-1">{purchaseInvoicesSummary.totalInvoices.toLocaleString('es-EC')}</div>
                            <div className="text-xs text-secondary mt-1">Cargadas en este panel</div>
                        </div>
                        <div className="p-4 rounded-xl bg-surface border border-line">
                            <div className="text-[10px] uppercase font-bold text-secondary">Unidades compradas</div>
                            <div className="text-2xl font-bold mt-1">{purchaseInvoicesSummary.totalUnits.toLocaleString('es-EC')}</div>
                            <div className="text-xs text-secondary mt-1">Suma de las facturas listadas</div>
                        </div>
                        <div className="p-4 rounded-xl bg-surface border border-line">
                            <div className="text-[10px] uppercase font-bold text-secondary">Monto comprado</div>
                            <div className="text-2xl font-bold mt-1">{formatMoney(purchaseInvoicesSummary.totalAmount)}</div>
                            <div className="text-xs text-secondary mt-1">
                                {purchaseInvoicesSummary.suppliersCount.toLocaleString('es-EC')} proveedor(es) registrados
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
                <div className="xl:col-span-2">
                    <InventoryCategoryOverview rows={displayRows} />
                </div>
                <div>
                    <RestockSuggestionsPanel
                        rows={displayRows}
                        formatMoney={formatMoney}
                        onRestockProduct={onRestockProduct}
                    />
                </div>
            </div>

            <div className="p-4 rounded-2xl border border-line bg-white mb-4">
                <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
                    <div className="relative flex-1">
                        <Icon.MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                        <input
                            type="text"
                            className="w-full rounded-full border border-line bg-white pl-12 pr-4 py-4 text-sm outline-none transition-all focus:border-black"
                            placeholder="Buscar por marca, producto, categoria, SKU, lote o proveedor"
                            value={searchQuery}
                            onChange={(event) => onSearchChange(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 xl:w-auto">
                        <select
                            className="min-w-[220px] rounded-full border border-line bg-white px-4 py-4 text-sm outline-none transition-all focus:border-black"
                            value={statusFilter}
                            onChange={(event) => onStatusFilterChange(event.target.value as InventoryManagementPanelProps['statusFilter'])}
                        >
                            {INVENTORY_STATUS_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className="min-w-[220px] rounded-full border border-line bg-white px-4 py-4 text-sm outline-none transition-all focus:border-black"
                            value={typeFilter}
                            onChange={(event) => onTypeFilterChange(event.target.value as InventoryManagementPanelProps['typeFilter'])}
                        >
                            {INVENTORY_TYPE_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className="min-w-[220px] rounded-full border border-line bg-white px-4 py-4 text-sm outline-none transition-all focus:border-black"
                            value={actionFilter}
                            onChange={(event) => setActionFilter(event.target.value as 'all' | InventoryRecommendedAction)}
                        >
                            {INVENTORY_ACTION_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className="min-w-[220px] rounded-full border border-line bg-white px-4 py-4 text-sm outline-none transition-all focus:border-black"
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                        >
                            <option value="all">Todas las categorías</option>
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        <select
                            className="min-w-[220px] rounded-full border border-line bg-white px-4 py-4 text-sm outline-none transition-all focus:border-black"
                            value={supplierFilter}
                            onChange={(event) => setSupplierFilter(event.target.value)}
                        >
                            <option value="all">Todos los proveedores</option>
                            {supplierOptions.map((supplier) => (
                                <option key={supplier} value={supplier}>
                                    {supplier}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="rounded-full border border-line px-5 py-4 text-sm font-semibold hover:bg-surface transition-all"
                            onClick={() => {
                                setActionFilter('all')
                                setCategoryFilter('all')
                                setSupplierFilter('all')
                                onClearFilters()
                            }}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="text-sm text-secondary">
                        {displayRows.length.toLocaleString('es-EC')} productos encontrados
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-secondary">
                        <span className="rounded-full bg-surface px-3 py-1"><strong className="text-black">Registrar compra:</strong> repone stock con factura</span>
                        <span className="rounded-full bg-surface px-3 py-1"><strong className="text-black">Balance:</strong> abre el detalle por compra/lote</span>
                        <span className="rounded-full bg-surface px-3 py-1"><strong className="text-black">Costo unitario:</strong> valor de compra por unidad</span>
                        <span className="rounded-full bg-surface px-3 py-1"><strong className="text-black">PVP:</strong> precio de venta por unidad</span>
                        <span className="rounded-full bg-surface px-3 py-1"><strong className="text-black">Capital al costo:</strong> costo unitario x stock actual</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full min-w-[1320px] text-left">
                    <thead className="border-b border-line bg-surface">
                        <tr className="text-[11px] uppercase font-bold text-secondary">
                            <th className="px-4 py-3 min-w-[280px]">Producto</th>
                            <th className="px-4 py-3 min-w-[180px]">Inventario</th>
                            <th className="px-4 py-3 min-w-[190px]">Decisión</th>
                            {hasPerishableProducts && (
                                <th className="px-4 py-3 min-w-[170px]">Vencimiento</th>
                            )}
                            <th className="px-4 py-3 min-w-[170px]">Trazabilidad</th>
                            <th className="px-4 py-3 min-w-[260px]">Ultima compra</th>
                            <th className="px-4 py-3 min-w-[180px]">Precios</th>
                            <th className="px-4 py-3 min-w-[120px]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {displayRows.map((row) => {
                            const intel = intelligenceByProductId.get(String(row.internalId || row.source?.id || ''))
                                || intelligenceByProductId.get(String(row.source?.id || ''))
                                || intelligenceByProductId.get(String(row.legacyId || ''))
                            const stockBadge = row.stockStatus === 'expired'
                                ? { label: 'Vencido', className: 'bg-red-100 text-red-700' }
                                : row.stockStatus === 'expiring'
                                    ? { label: 'Por vencer', className: 'bg-amber-100 text-amber-700' }
                                    : row.stockStatus === 'out'
                                        ? { label: 'Sin stock', className: 'bg-red-100 text-red-700' }
                                        : row.stockStatus === 'critical'
                                            ? { label: 'Crítico', className: 'bg-red-100 text-red-700' }
                                            : row.stockStatus === 'low'
                                                ? { label: 'Bajo stock', className: 'bg-amber-100 text-amber-700' }
                                                : { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700' }

                            return (
                                <tr key={row.internalId} className="align-top hover:bg-surface/40">
                                    <td className="px-4 py-4">
                                        <div className="max-w-[320px] space-y-1">
                                            <div className="text-sm font-semibold break-words">{row.name}</div>
                                            <div className="text-xs text-secondary">{row.category}</div>
                                            <div className="text-xs text-secondary break-all">
                                                SKU: <span className="font-medium text-black">{row.sku || '-'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-2">
                                            <div className={`text-lg font-bold ${row.stock <= 0 ? 'text-red' : 'text-black'}`}>
                                                {row.stock.toLocaleString('es-EC')} uds
                                            </div>
                                            <div className="text-xs text-secondary">
                                                {row.isPerishable ? 'Perecedero (Alimento)' : 'No perecedero'}
                                            </div>
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${stockBadge.className}`}>
                                                {stockBadge.label}
                                            </span>
                                            {(row.stockStatus === 'low' || row.stockStatus === 'critical') && (
                                                <div className="text-xs text-secondary pt-1">
                                                    Reorder: {row.reorderPoint} · Crítico: {row.criticalPoint}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${getActionTone(intel?.recommended_action)}`}>
                                                    {getInventoryActionLabel(intel?.recommended_action)}
                                                </span>
                                                {intel && (
                                                    <span className="inline-flex px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-bold">
                                                        {Number(intel.priority_score ?? 0)}
                                                    </span>
                                                )}
                                            </div>
                                            {intel?.suggested_purchase_qty ? (
                                                <div className="text-xs text-secondary">
                                                    Comprar <span className="font-semibold text-black">+{Number(intel.suggested_purchase_qty).toLocaleString('es-EC')} uds</span>
                                                    {' · '}{formatMoney(intel.suggested_purchase_cost)}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-secondary">
                                                    {intel?.coverage_days != null
                                                        ? `Cobertura ${Number(intel.coverage_days).toLocaleString('es-EC')} días`
                                                        : 'Sin ventas recientes para cobertura'}
                                                </div>
                                            )}
                                            {intel?.quality_issues && intel.quality_issues.length > 0 && (
                                                <div className="text-[11px] text-amber-700">
                                                    {intel.quality_issues.length} dato(s) por revisar
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    {hasPerishableProducts && (
                                        <td className="px-4 py-4">
                                            {row.isPerishable ? (
                                                <div className="space-y-2">
                                                    <div className="text-sm font-semibold">{formatIsoDate(row.expirationMeta.expirationDate)}</div>
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${row.expirationMeta.badge.className}`}>
                                                        {row.expirationMeta.badge.label}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-secondary">No perecedero</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-4 py-4">
                                        <div className="space-y-1 text-sm">
                                            <div>Lote: <span className="font-medium">{row.lotCode || '-'}</span></div>
                                            <div className="break-words">Ubicacion: <span className="font-medium">{row.storageLocation || '-'}</span></div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium break-words">{row.supplier || '-'}</div>
                                            <div className="text-xs text-secondary">
                                                Entradas: {Number(row.purchaseEntriesCount ?? 0).toLocaleString('es-EC')} • Comprado: {Number(row.purchasedUnits ?? 0).toLocaleString('es-EC')}
                                            </div>
                                            {row.lastPurchaseInvoiceNumber ? (
                                                <div className="space-y-1 pt-1">
                                                    {row.lastPurchaseInvoiceId ? (
                                                        <button
                                                            type="button"
                                                            className="text-sm font-semibold text-left underline underline-offset-2 break-all"
                                                            onClick={() => onOpenPurchaseInvoice(row.lastPurchaseInvoiceId)}
                                                        >
                                                            {row.lastPurchaseInvoiceNumber}
                                                        </button>
                                                    ) : (
                                                        <div className="text-sm font-semibold break-all">{row.lastPurchaseInvoiceNumber}</div>
                                                    )}
                                                    <div className="text-xs text-secondary">
                                                        {row.lastPurchaseIssuedAt
                                                            ? formatIsoDate(row.lastPurchaseIssuedAt)
                                                            : formatDateEcuador(row.lastPurchaseReceivedAt)} • {formatMoney(row.lastPurchaseUnitCost)} x {Number(row.lastPurchaseQuantity ?? 0).toLocaleString('es-EC')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-secondary pt-1">Sin factura enlazada</div>
                                            )}
                                            {row.openLotsCount > 1 && (
                                                <div className="text-xs text-amber-700 pt-1">
                                                    Mezcla activa de {row.openLotsCount} compras/lotes.
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-1 text-sm">
                                            <div>Costo ponderado stock: <span className="font-semibold">{formatMoney(row.weightedUnitCost)}</span></div>
                                            <div>PVP unitario: <span className="font-semibold">{formatMoney(row.unitPrice)}</span></div>
                                            <div>Margen stock actual: <span className={`font-semibold ${row.weightedMargin < 0 ? 'text-red' : 'text-black'}`}>{Number(row.weightedMargin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span></div>
                                            {row.lastPurchaseUnitCost > 0 && (
                                                <div>Margen última compra: <span className={`font-semibold ${row.lastPurchaseMargin < 0 ? 'text-red' : 'text-black'}`}>{Number(row.lastPurchaseMargin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span></div>
                                            )}
                                            <div>Capital al costo: <span className="font-semibold">{formatMoney(row.inventoryCost)}</span></div>
                                            {row.coverageDays != null && (
                                                <div>Cobertura: <span className={`font-semibold ${row.coverageDays < 15 ? 'text-red' : 'text-black'}`}>{row.coverageDays.toLocaleString('es-EC')} días</span></div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface transition-all"
                                                onClick={() => onOpenProductBalance(row.source)}
                                            >
                                                Balance
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg border border-black bg-black text-white text-xs font-semibold hover:bg-primary transition-all"
                                                onClick={() => onRestockProduct(row.source)}
                                            >
                                                Registrar compra
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface transition-all"
                                                onClick={() => onEditProduct(row.source)}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface transition-all"
                                                onClick={() => onEditProduct(row.source)}
                                            >
                                                Ajustar stock
                                            </button>
                                            {row.lastPurchaseInvoiceId && (
                                                <button
                                                    type="button"
                                                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface transition-all"
                                                    onClick={() => onOpenPurchaseInvoice(row.lastPurchaseInvoiceId)}
                                                >
                                                    Factura
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {displayRows.length === 0 && (
                            <tr>
                                <td colSpan={hasPerishableProducts ? 8 : 7} className="px-3 py-8 text-center text-sm text-secondary">
                                    No hay productos para los filtros actuales.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
})
