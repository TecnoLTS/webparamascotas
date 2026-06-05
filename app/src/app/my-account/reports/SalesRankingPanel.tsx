'use client'

import React from 'react'
import type { ProductRankingActionItem, ProductRankingDecisionRow, SalesReportView } from '../types'

type SalesRankingPanelProps = {
  currentDateLabel: string
  effectiveReportData: any
  formatMoney: (value: number | string | null | undefined) => string
  openSalesProductDetail: (item: ProductRankingDecisionRow) => void
  productRankingActionItems: ProductRankingActionItem[]
  productRankingDecisionRows: ProductRankingDecisionRow[]
  periodLabel: string
  salesRankingFinancial: {
    orders_count: number
    gross: number
    net: number
    vat: number
    shipping: number
    cost: number
    profit: number
    margin: number
  } | null
  salesRankingMonth: string
  salesRankingTotals?: { units_sold?: number; net_revenue?: number } | null
  salesRankingView: SalesReportView
  selectReportMonth: (month: string) => void
  selectedRankingMonthLabel: string
  setSalesRankingView: (view: SalesReportView) => void
  totalUnitsSold: number
  onExportRanking: () => void
  onOpenProduct: (productId?: string | null) => void
  onRestockProduct: (productId?: string | null) => void
}

type SortKey = 'priority' | 'units' | 'net' | 'profit' | 'margin' | 'contribution' | 'coverage'

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'priority', label: 'Prioridad' },
  { key: 'units', label: 'Unidades' },
  { key: 'net', label: 'Venta neta' },
  { key: 'profit', label: 'Utilidad' },
  { key: 'margin', label: 'Margen' },
  { key: 'contribution', label: 'Contribución' },
  { key: 'coverage', label: 'Cobertura' },
]

const normalizeSearch = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const formatPercent = (value: number) =>
  Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const actionTone = (action?: string) => {
  if (action === 'fix_cost' || action === 'restock_now') return 'bg-red-50 text-red border-red/30'
  if (action === 'protect_margin' || action === 'restock_soon') return 'bg-amber-50 text-amber-800 border-amber-200'
  if (action === 'reduce_or_promote') return 'bg-blue-50 text-blue-800 border-blue-200'
  if (action === 'review_no_sales' || action === 'fix_data' || action === 'review_assortment') return 'bg-surface text-secondary border-line'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const severityBorder = (severity: ProductRankingActionItem['severity']) => {
  if (severity === 'critical') return 'border-red/40 bg-red-50'
  if (severity === 'warning') return 'border-amber-200 bg-amber-50'
  return 'border-line bg-surface'
}

export default function SalesRankingPanel({
  currentDateLabel,
  effectiveReportData,
  formatMoney,
  openSalesProductDetail,
  productRankingActionItems,
  productRankingDecisionRows,
  periodLabel,
  salesRankingFinancial,
  salesRankingMonth,
  salesRankingTotals,
  salesRankingView,
  selectReportMonth,
  selectedRankingMonthLabel,
  setSalesRankingView,
  totalUnitsSold,
  onExportRanking,
  onOpenProduct,
  onRestockProduct,
}: SalesRankingPanelProps) {
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [actionFilter, setActionFilter] = React.useState('all')
  const [sortKey, setSortKey] = React.useState<SortKey>('priority')

  const categoryOptions = React.useMemo(() => {
    return Array.from(new Set(productRankingDecisionRows.map((item) => item.category || 'Sin categoría'))).sort((a, b) => a.localeCompare(b, 'es'))
  }, [productRankingDecisionRows])

  const actionOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    productRankingDecisionRows.forEach((item) => map.set(item.recommended_action, item.action_label))
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [productRankingDecisionRows])

  const filteredRows = React.useMemo(() => {
    const query = normalizeSearch(search)
    return productRankingDecisionRows
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
        if (actionFilter !== 'all' && item.recommended_action !== actionFilter) return false
        if (!query) return true
        const haystack = normalizeSearch(`${item.product_name} ${item.sku} ${item.product_id} ${item.category} ${item.supplier} ${item.action_label}`)
        return haystack.includes(query)
      })
      .sort((a, b) => {
        if (sortKey === 'coverage') {
          const aCoverage = a.coverage_days === null ? Number.POSITIVE_INFINITY : Number(a.coverage_days)
          const bCoverage = b.coverage_days === null ? Number.POSITIVE_INFINITY : Number(b.coverage_days)
          return aCoverage - bCoverage
        }
        const value = (row: ProductRankingDecisionRow) => {
          if (sortKey === 'units') return Number(row.units_sold ?? 0)
          if (sortKey === 'net') return Number(row.net_revenue ?? 0)
          if (sortKey === 'profit') return Number(row.profit ?? 0)
          if (sortKey === 'margin') return Number(row.margin ?? 0)
          if (sortKey === 'contribution') return Number(row.contribution_pct ?? 0)
          return Number(row.priority_score ?? 0)
        }
        return value(b) - value(a)
      })
  }, [actionFilter, categoryFilter, productRankingDecisionRows, search, sortKey])

  const rankingSummary = React.useMemo(() => {
    const rows = productRankingDecisionRows
    const missingCost = rows.filter((row) => row.recommended_action === 'fix_cost').length
    const marginRisk = rows.filter((row) => row.recommended_action === 'protect_margin').length
    const restock = rows.filter((row) => row.recommended_action === 'restock_now' || row.recommended_action === 'restock_soon').length
    const overstock = rows.filter((row) => row.recommended_action === 'reduce_or_promote').length
    const topContribution = rows.reduce((best, row) => Number(row.contribution_pct ?? 0) > Number(best?.contribution_pct ?? -1) ? row : best, null as ProductRankingDecisionRow | null)
    return { missingCost, marginRisk, restock, overstock, topContribution }
  }, [productRankingDecisionRows])

  const activeViewLabel = salesRankingView === 'daily'
    ? 'Día'
    : salesRankingView === 'week'
      ? 'Semana'
      : salesRankingView === 'month'
        ? selectedRankingMonthLabel
        : 'Todo'

  return (
    <div className="tab text-content w-full">
      <div className="flex flex-col gap-3 pb-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="heading5">Ranking de productos vendidos</div>
          <p className="mt-1 text-xs text-secondary">
            Venta, utilidad, inventario y acción recomendada para el periodo activo.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onExportRanking}
            className="rounded-lg border border-black bg-black px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-white hover:text-black"
          >
            Exportar a Excel
          </button>
          <div className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-secondary">
            {currentDateLabel}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="heading6">Resumen y decisión comercial</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-secondary">
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">Vista: <span className="text-black">{activeViewLabel}</span></span>
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">Periodo: <span className="text-black">{periodLabel}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {salesRankingView === 'month' && (
              <label className="flex flex-col gap-1 text-[10px] uppercase font-bold text-secondary">
                Mes
                <input
                  type="month"
                  value={salesRankingMonth}
                  onChange={(event) => selectReportMonth(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-black outline-none focus:border-black"
                />
              </label>
            )}
            <div className="flex w-fit rounded-lg border border-line bg-surface p-1">
              <button type="button" onClick={() => setSalesRankingView('daily')} className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${salesRankingView === 'daily' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}>
                Día
              </button>
              <button type="button" onClick={() => setSalesRankingView('week')} className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${salesRankingView === 'week' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}>
                Semana
              </button>
              <button type="button" onClick={() => setSalesRankingView('month')} className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${salesRankingView === 'month' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}>
                Mes
              </button>
              <button type="button" onClick={() => setSalesRankingView('historical')} className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${salesRankingView === 'historical' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}>
                Todo
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[10px] font-bold uppercase text-secondary">Pedidos vendidos</div>
            <div className="text-lg font-bold">{Number((effectiveReportData?.sales as any)?.orders_count ?? salesRankingFinancial?.orders_count ?? 0).toLocaleString('es-EC')}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[10px] font-bold uppercase text-secondary">Unidades vendidas</div>
            <div className="text-lg font-bold">{Number(totalUnitsSold ?? salesRankingTotals?.units_sold ?? 0).toLocaleString('es-EC')}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[10px] font-bold uppercase text-secondary">Ventas netas</div>
            <div className="text-lg font-bold">{formatMoney(Number((effectiveReportData?.sales as any)?.net ?? salesRankingFinancial?.net ?? salesRankingTotals?.net_revenue ?? 0))}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[10px] font-bold uppercase text-secondary">Utilidad bruta</div>
            <div className={`text-lg font-bold ${(Number((effectiveReportData?.profit as any)?.gross_profit ?? salesRankingFinancial?.profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
              {formatMoney(Number((effectiveReportData?.profit as any)?.gross_profit ?? salesRankingFinancial?.profit ?? 0))}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-[10px] font-bold uppercase text-secondary">Mayor contribución</div>
            <div className="text-lg font-bold">{rankingSummary.topContribution ? `${formatPercent(rankingSummary.topContribution.contribution_pct)}%` : '0.0%'}</div>
            <div className="mt-1 truncate text-xs text-secondary">{rankingSummary.topContribution?.product_name || 'Sin ventas'}</div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-red/30 bg-red-50 p-4">
            <div className="text-[10px] font-bold uppercase text-red">Reponer ganadores</div>
            <div className="mt-1 text-2xl font-bold">{rankingSummary.restock.toLocaleString('es-EC')}</div>
          </div>
          <div className="rounded-xl border border-red/30 bg-red-50 p-4">
            <div className="text-[10px] font-bold uppercase text-red">Sin costo</div>
            <div className="mt-1 text-2xl font-bold">{rankingSummary.missingCost.toLocaleString('es-EC')}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-[10px] font-bold uppercase text-amber-800">Margen bajo</div>
            <div className="mt-1 text-2xl font-bold">{rankingSummary.marginRisk.toLocaleString('es-EC')}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-[10px] font-bold uppercase text-blue-800">Promover sobrestock</div>
            <div className="mt-1 text-2xl font-bold">{rankingSummary.overstock.toLocaleString('es-EC')}</div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="heading6">Qué hacer ahora</div>
            <div className="text-xs font-bold text-secondary">{productRankingActionItems.length.toLocaleString('es-EC')} acciones</div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {productRankingActionItems.slice(0, 8).map((item) => (
              <div key={item.id} className={`rounded-xl border p-4 ${severityBorder(item.severity)}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${actionTone(item.action)}`}>
                      {item.action_label}
                    </span>
                    <div className="mt-2 text-sm font-bold">{item.product_name}</div>
                    <div className="mt-1 text-xs text-secondary">{item.detail}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-secondary">
                      {item.sku && <span>SKU {item.sku}</span>}
                      <span>Stock {item.stock_current === null ? '-' : item.stock_current.toLocaleString('es-EC')}</span>
                      <span>Proveedor {item.supplier || '-'}</span>
                      {item.suggested_purchase_qty > 0 && <span>Compra +{item.suggested_purchase_qty.toLocaleString('es-EC')}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => onOpenProduct(item.product_id)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface">
                      Producto
                    </button>
                    {(item.action === 'restock_now' || item.action === 'restock_soon' || item.action === 'fix_cost') && (
                      <button type="button" onClick={() => onRestockProduct(item.product_id)} className="rounded-lg border border-black bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black">
                        Compra
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {productRankingActionItems.length === 0 && (
              <div className="rounded-xl border border-line bg-white p-5 text-center text-sm text-secondary xl:col-span-2">
                Sin acciones urgentes para el periodo activo.
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_200px_180px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, SKU, proveedor o acción"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-black"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-black"
          >
            <option value="all">Todas las categorías</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-black"
          >
            <option value="all">Todas las acciones</option>
            {actionOptions.map(([action, label]) => (
              <option key={action} value={action}>{label}</option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-black"
          >
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>Orden: {option.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1640px] text-left">
            <thead className="border-b border-line bg-surface text-[10px] font-bold uppercase text-secondary">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3 text-right">Prioridad</th>
                <th className="px-4 py-3 text-right">Unidades</th>
                <th className="px-4 py-3 text-right">Contribución</th>
                <th className="px-4 py-3 text-right">Venta neta</th>
                <th className="px-4 py-3 text-right">Utilidad</th>
                <th className="px-4 py-3 text-right">Utilidad/u</th>
                <th className="px-4 py-3 text-right">Margen</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Cobertura</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3 text-right">Compra sugerida</th>
                <th className="px-4 py-3 text-right">Abrir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRows.map((item, index) => (
                <tr key={`${item.product_id}-${index}`} className="hover:bg-surface/40">
                  <td className="px-4 py-3 text-right text-sm font-semibold">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    <button type="button" className="text-left hover:underline" onClick={() => openSalesProductDetail(item)}>
                      {item.product_name}
                    </button>
                    {item.sku && (
                      <div className="mt-1 text-[11px] font-medium text-secondary">SKU {item.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{item.category || 'Sin categoría'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${actionTone(item.recommended_action)}`}>
                      {item.action_label}
                    </span>
                    <div className="mt-1 max-w-[240px] text-[11px] text-secondary">{item.action_reason}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold">{Number(item.priority_score ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{Number(item.units_sold ?? 0).toLocaleString('es-EC')}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatPercent(item.contribution_pct)}%</td>
                  <td className="px-4 py-3 text-right text-sm">{formatMoney(item.net_revenue)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${(Number(item.profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
                    {formatMoney(item.profit)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${(Number(item.unit_profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
                    {formatMoney(item.unit_profit)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{formatPercent(Number(item.margin ?? 0))}%</td>
                  <td className="px-4 py-3 text-right text-sm">{item.stock_current === null ? '-' : Number(item.stock_current).toLocaleString('es-EC')}</td>
                  <td className="px-4 py-3 text-right text-sm">{item.coverage_days === null ? 'Sin ventas' : `${Number(item.coverage_days).toLocaleString('es-EC', { maximumFractionDigits: 0 })} días`}</td>
                  <td className="px-4 py-3 text-sm">{item.supplier || 'Sin proveedor'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="font-semibold">{Number(item.suggested_purchase_qty ?? 0).toLocaleString('es-EC')} uds</div>
                    <div className="text-xs text-secondary">{formatMoney(item.suggested_purchase_cost)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="text-xs font-bold underline" onClick={() => onOpenProduct(item.product_id)}>
                        Producto
                      </button>
                      {(item.recommended_action === 'restock_now' || item.recommended_action === 'restock_soon' || item.recommended_action === 'fix_cost') && (
                        <button type="button" className="text-xs font-bold underline" onClick={() => onRestockProduct(item.product_id)}>
                          Compra
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-6 text-center text-sm text-secondary">
                    No hay productos para los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
