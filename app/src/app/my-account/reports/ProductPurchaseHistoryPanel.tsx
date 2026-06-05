'use client'

import React from 'react'

import { getAdminProductEntityId } from '../productFormUtils'
import type { ProductProcurementDetail, SalesRankingRow, SalesReportView } from '../types'

type ProductPurchaseHistoryPanelProps = {
  products: any[]
  salesRows: SalesRankingRow[]
  salesOrders: Array<{
    id: string
    order_number?: string
    created_at: string
    status?: string
    user_name?: string | null
    customer_email?: string | null
    payment_method?: string | null
    delivery_method?: string | null
    net: number
    vat: number
    shipping: number
    cost?: number
    profit?: number
    margin?: number
  }>
  salesPeriodLabel: string
  salesRankingMonth: string
  salesRankingView: SalesReportView
  selectedRankingMonthLabel: string
  selectedProductId: string | null
  selectedDetail: ProductProcurementDetail | null
  detailLoading: boolean
  detailError: string | null
  selectReportMonth: (month: string) => void
  setSalesRankingView: (view: SalesReportView) => void
  onSelectProduct: (productId: string) => void
  onRetryLoadSelectedProduct: () => void
  onOpenPurchaseInvoice: (invoiceId: string) => void
  formatMoney: (value: any) => string
  formatIsoDate: (value?: string | null) => string
}

type QuickFilter = 'all' | 'with-purchases' | 'without-purchases'
type ViewMode = 'sales' | 'purchases'

type ProductPurchaseListRow = {
  id: string
  name: string
  category: string
  sku: string
  entriesCount: number
  purchasedUnits: number
  remainingUnits: number
  remainingCapital: number
  lastPurchaseAt: string | null
  hasPurchases: boolean
  ordersCount: number
  soldUnits: number
  soldNetRevenue: number
  soldProfit: number
  soldMargin: number
  hasSales: boolean
  searchText: string
}

const normalizeSearch = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeOrderReference = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/^#/, '')
    .toUpperCase()

const lotSourceLabel = (sourceType: string) => {
  switch (sourceType) {
    case 'purchase_invoice':
      return 'Factura de compra'
    case 'stock_reconciliation':
      return 'Conciliación de stock'
    default:
      return sourceType || 'Origen no enlazado'
  }
}

const resolveLotTimestamp = (value?: string | null) => {
  const ts = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(ts) ? ts : 0
}

export default function ProductPurchaseHistoryPanel({
  products,
  salesRows,
  salesOrders,
  salesPeriodLabel,
  salesRankingMonth,
  salesRankingView,
  selectedRankingMonthLabel,
  selectedProductId,
  selectedDetail,
  detailLoading,
  detailError,
  selectReportMonth,
  setSalesRankingView,
  onSelectProduct,
  onRetryLoadSelectedProduct,
  onOpenPurchaseInvoice,
  formatMoney,
  formatIsoDate,
}: ProductPurchaseHistoryPanelProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('sales')
  const [search, setSearch] = React.useState('')
  const [quickFilter, setQuickFilter] = React.useState<QuickFilter>('all')
  const activeViewLabel = salesRankingView === 'daily'
    ? 'Día'
    : salesRankingView === 'week'
      ? 'Semana'
      : salesRankingView === 'month'
        ? selectedRankingMonthLabel
        : 'Todo'

  const salesByProductId = React.useMemo(() => {
    return (salesRows || []).reduce((map, row) => {
      const key = String(row.product_id || '').trim()
      if (!key) return map
      map.set(key, row)
      return map
    }, new Map<string, SalesRankingRow>())
  }, [salesRows])

  const listRows = React.useMemo<ProductPurchaseListRow[]>(() => {
    return (products || [])
      .map((product): ProductPurchaseListRow | null => {
        const id = String(getAdminProductEntityId(product) || '').trim()
        if (!id) return null

        const purchaseHistory = product?.inventory?.purchaseHistory || {}
        const procurement = product?.inventory?.procurement || {}
        const lastPurchaseInvoice = product?.lastPurchaseInvoice || product?.inventory?.lastPurchaseInvoice || null
        const entriesCount = Math.max(0, toNumber(purchaseHistory?.entriesCount))
        const purchasedUnits = Math.max(0, toNumber(purchaseHistory?.purchasedUnits))
        const remainingUnits = Math.max(0, toNumber(procurement?.remainingUnitsTotal ?? purchaseHistory?.remainingUnits))
        const remainingCapital = Math.max(0, toNumber(procurement?.remainingCostTotal))
        const lastPurchaseAtRaw = String(
          purchaseHistory?.lastPurchaseAt
          || lastPurchaseInvoice?.issuedAt
          || lastPurchaseInvoice?.receivedAt
          || '',
        ).trim()
        const hasPurchases = entriesCount > 0 || purchasedUnits > 0
        const name = String(product?.name || 'Producto sin nombre')
        const category = String(product?.category || 'Sin categoría')
        const sku = String(product?.attributes?.sku || '').trim()
        const salesRow = salesByProductId.get(id)
        const ordersCount = Math.max(0, toNumber(salesRow?.orders_count))
        const soldUnits = Math.max(0, toNumber(salesRow?.units_sold))
        const soldNetRevenue = Math.max(0, toNumber(salesRow?.net_revenue))
        const soldProfit = toNumber(salesRow?.profit)
        const soldMargin = toNumber(salesRow?.margin)
        const hasSales = soldUnits > 0 || soldNetRevenue > 0

        return {
          id,
          name,
          category,
          sku,
          entriesCount,
          purchasedUnits,
          remainingUnits,
          remainingCapital,
          lastPurchaseAt: lastPurchaseAtRaw || null,
          hasPurchases,
          ordersCount,
          soldUnits,
          soldNetRevenue,
          soldProfit,
          soldMargin,
          hasSales,
          searchText: normalizeSearch(`${name} ${category} ${sku} ${id}`),
        }
      })
      .filter((row): row is ProductPurchaseListRow => Boolean(row))
  }, [products, salesByProductId])

  const sortedRows = React.useMemo(() => {
    const rows = [...listRows]
    if (viewMode === 'sales') {
      return rows.sort((a, b) => {
        if (b.soldUnits !== a.soldUnits) return b.soldUnits - a.soldUnits
        if (b.soldNetRevenue !== a.soldNetRevenue) return b.soldNetRevenue - a.soldNetRevenue
        return a.name.localeCompare(b.name, 'es')
      })
    }

    return rows.sort((a, b) => {
      const byRecent = resolveLotTimestamp(b.lastPurchaseAt) - resolveLotTimestamp(a.lastPurchaseAt)
      if (byRecent !== 0) return byRecent
      if (a.hasPurchases !== b.hasPurchases) return a.hasPurchases ? -1 : 1
      return a.name.localeCompare(b.name, 'es')
    })
  }, [listRows, viewMode])

  const filteredRows = React.useMemo(() => {
    const query = normalizeSearch(search)
    return sortedRows.filter((row) => {
      if (viewMode === 'sales') {
        if (quickFilter === 'with-purchases' && !row.hasSales) return false
        if (quickFilter === 'without-purchases' && row.hasSales) return false
      } else {
        if (quickFilter === 'with-purchases' && !row.hasPurchases) return false
        if (quickFilter === 'without-purchases' && row.hasPurchases) return false
      }
      if (!query) return true
      return row.searchText.includes(query)
    })
  }, [quickFilter, search, sortedRows, viewMode])

  const summary = React.useMemo(() => {
    return filteredRows.reduce((acc, row) => {
      acc.totalProducts += 1
      if (row.hasPurchases) acc.productsWithPurchases += 1
      if (row.hasSales) acc.productsWithSales += 1
      acc.purchasedUnits += row.purchasedUnits
      acc.remainingUnits += row.remainingUnits
      acc.remainingCapital += row.remainingCapital
      acc.soldUnits += row.soldUnits
      acc.soldNetRevenue += row.soldNetRevenue
      acc.soldProfit += row.soldProfit
      return acc
    }, {
      totalProducts: 0,
      productsWithPurchases: 0,
      productsWithSales: 0,
      purchasedUnits: 0,
      remainingUnits: 0,
      remainingCapital: 0,
      soldUnits: 0,
      soldNetRevenue: 0,
      soldProfit: 0,
    })
  }, [filteredRows])

  const selectedRow = React.useMemo(
    () => listRows.find((row) => row.id === selectedProductId) || null,
    [listRows, selectedProductId],
  )
  const selectedSalesRow = React.useMemo(
    () => (selectedProductId ? salesByProductId.get(selectedProductId) || null : null),
    [salesByProductId, selectedProductId],
  )

  const sortedLots = React.useMemo(() => {
    const lots = selectedDetail?.lots
    const rows = Array.isArray(lots) ? [...lots] : []
    return rows.sort((a, b) => {
      const dateA = resolveLotTimestamp(a.issued_at || a.received_at || a.created_at)
      const dateB = resolveLotTimestamp(b.issued_at || b.received_at || b.created_at)
      if (dateB !== dateA) return dateB - dateA
      return String(b.id || '').localeCompare(String(a.id || ''), 'es')
    })
  }, [selectedDetail])

  const formatSalesOrderDate = React.useCallback((value?: string | null) => {
    const raw = String(value || '').trim()
    if (!raw) return '-'

    const yyyyMmDd = raw.slice(0, 10)
    const fromIso = formatIsoDate(yyyyMmDd)
    if (fromIso !== '-') return fromIso

    const parsed = new Date(raw)
    if (Number.isFinite(parsed.getTime())) {
      const yyyy = parsed.getFullYear()
      const mm = String(parsed.getMonth() + 1).padStart(2, '0')
      const dd = String(parsed.getDate()).padStart(2, '0')
      return `${dd}/${mm}/${yyyy}`
    }

    return raw
  }, [formatIsoDate])

  const salesOrdersByReference = React.useMemo(() => {
    return (salesOrders || []).reduce((map, order) => {
      const id = String(order.id || '').trim()
      if (id) map.set(id, order)
      const orderNumber = String(order.order_number || '').trim()
      if (orderNumber) map.set(orderNumber, order)
      const normalizedId = normalizeOrderReference(id)
      if (normalizedId) map.set(normalizedId, order)
      const normalizedOrderNumber = normalizeOrderReference(orderNumber)
      if (normalizedOrderNumber) map.set(normalizedOrderNumber, order)
      return map
    }, new Map<string, ProductPurchaseHistoryPanelProps['salesOrders'][number]>())
  }, [salesOrders])

  const selectedProductSalesInvoices = React.useMemo(() => {
    if (!selectedSalesRow) return []

    const orderRefs = Array.isArray(selectedSalesRow.order_refs) ? selectedSalesRow.order_refs : []
    const rows = orderRefs
      .map((ref) => {
        const rawRef = String(ref || '').trim()
        return (
          salesOrdersByReference.get(rawRef)
          || salesOrdersByReference.get(normalizeOrderReference(rawRef))
          || null
        )
      })
      .filter((order): order is ProductPurchaseHistoryPanelProps['salesOrders'][number] => Boolean(order))

    if (rows.length > 0) {
      return rows
        .map((order) => ({
          ...order,
          ref: String(order.order_number || order.id || '').trim(),
        }))
        .sort((a, b) => resolveLotTimestamp(b.created_at) - resolveLotTimestamp(a.created_at))
    }

    return []
  }, [salesOrders, salesOrdersByReference, selectedSalesRow])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="heading6">Ventas vs compras por producto</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-secondary">
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">Ventas: <span className="text-black">{activeViewLabel}</span></span>
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">Periodo: <span className="text-black">{salesPeriodLabel}</span></span>
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">Compras/stock: <span className="text-black">acumulado y actual</span></span>
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
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[10px] uppercase font-bold text-secondary">Total productos</div>
          <div className="mt-1 text-xl font-bold">{summary.totalProducts.toLocaleString('es-EC')}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[10px] uppercase font-bold text-secondary">Con ventas período</div>
          <div className="mt-1 text-xl font-bold">{summary.productsWithSales.toLocaleString('es-EC')}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[10px] uppercase font-bold text-secondary">Vendidas período</div>
          <div className="mt-1 text-xl font-bold">{summary.soldUnits.toLocaleString('es-EC')}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[10px] uppercase font-bold text-secondary">Venta neta</div>
          <div className="mt-1 text-xl font-bold">{formatMoney(summary.soldNetRevenue)}</div>
        </div>
        <div className="col-span-2 rounded-xl border border-line bg-white p-3 lg:col-span-1">
          <div className="text-[10px] uppercase font-bold text-secondary">Utilidad</div>
          <div className="mt-1 text-xl font-bold">{formatMoney(summary.soldProfit)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex rounded-lg border border-line bg-surface p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${viewMode === 'sales' ? 'bg-black text-white' : 'text-secondary hover:text-black'}`}
              onClick={() => setViewMode('sales')}
            >
              Ventas
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${viewMode === 'purchases' ? 'bg-black text-white' : 'text-secondary hover:text-black'}`}
              onClick={() => setViewMode('purchases')}
            >
              Compras
            </button>
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-secondary" htmlFor="products-purchases-search">
              Buscar producto
            </label>
            <input
              id="products-purchases-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, SKU o categoría"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-black"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { key: 'all' as QuickFilter, label: 'Todos' },
              { key: 'with-purchases' as QuickFilter, label: viewMode === 'sales' ? 'Con ventas' : 'Con compras' },
              { key: 'without-purchases' as QuickFilter, label: viewMode === 'sales' ? 'Sin ventas' : 'Sin compras' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  quickFilter === option.key ? 'border-black bg-black text-white' : 'border-line bg-surface text-secondary hover:text-black'
                }`}
                onClick={() => setQuickFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`w-full rounded-xl border p-3 text-left transition ${
                  row.id === selectedProductId ? 'border-black bg-surface' : 'border-line bg-white hover:border-black'
                }`}
                onClick={() => onSelectProduct(row.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{row.name}</div>
                    <div className="text-xs text-secondary">
                      {row.category}
                      {row.sku ? ` · SKU ${row.sku}` : ''}
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    (viewMode === 'sales' ? row.hasSales : row.hasPurchases) ? 'bg-emerald-100 text-emerald-700' : 'bg-surface text-secondary'
                  }`}>
                    {viewMode === 'sales'
                      ? (row.hasSales ? 'Con ventas' : 'Sin ventas')
                      : (row.hasPurchases ? 'Con compras' : 'Sin compras')}
                  </span>
                </div>
                {viewMode === 'sales' ? (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-secondary">
                      <div>Pedidos: <span className="font-semibold text-black">{row.ordersCount.toLocaleString('es-EC')}</span></div>
                      <div>Vendidas: <span className="font-semibold text-black">{row.soldUnits.toLocaleString('es-EC')}</span></div>
                      <div>Compradas acum.: <span className="font-semibold text-black">{row.purchasedUnits.toLocaleString('es-EC')}</span></div>
                      <div>Stock lotes: <span className="font-semibold text-black">{row.remainingUnits.toLocaleString('es-EC')}</span></div>
                      <div>Venta neta: <span className="font-semibold text-black">{formatMoney(row.soldNetRevenue)}</span></div>
                      <div>Utilidad: <span className="font-semibold text-black">{formatMoney(row.soldProfit)}</span></div>
                    </div>
                    <div className="mt-1 text-[11px] text-secondary">
                      Margen: <span className={row.soldMargin < 0 ? 'text-red font-semibold' : 'text-black font-semibold'}>
                        {row.soldMargin.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-secondary">
                      <div>Compras: <span className="font-semibold text-black">{row.entriesCount.toLocaleString('es-EC')}</span></div>
                      <div>Comprado: <span className="font-semibold text-black">{row.purchasedUnits.toLocaleString('es-EC')}</span></div>
                      <div>Restante: <span className="font-semibold text-black">{row.remainingUnits.toLocaleString('es-EC')}</span></div>
                      <div>Capital: <span className="font-semibold text-black">{formatMoney(row.remainingCapital)}</span></div>
                    </div>
                    <div className="mt-1 text-[11px] text-secondary">
                      Última compra: {row.lastPurchaseAt ? formatIsoDate(row.lastPurchaseAt) : 'sin registro'}
                    </div>
                  </>
                )}
              </button>
            ))}
            {filteredRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-secondary">
                No hay productos para ese filtro.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          {!selectedProductId && (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-line bg-surface px-4 text-center text-sm text-secondary">
              Selecciona un producto para abrir su detalle de ventas o compras.
            </div>
          )}

          {viewMode === 'purchases' && selectedProductId && detailLoading && (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-line bg-surface px-4 text-center text-sm text-secondary">
              Cargando historial del producto...
            </div>
          )}

          {viewMode === 'purchases' && selectedProductId && !detailLoading && detailError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="text-sm font-semibold">{detailError}</div>
              <button
                type="button"
                className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold hover:bg-white"
                onClick={onRetryLoadSelectedProduct}
              >
                Reintentar
              </button>
            </div>
          )}

          {selectedProductId && viewMode === 'sales' && (
            <div className="space-y-4">
              <div>
                <div className="heading6">{selectedRow?.name || selectedSalesRow?.product_name || 'Producto'}</div>
                <p className="mt-1 text-xs text-secondary">
                  {selectedRow?.category || selectedSalesRow?.category || 'Sin categoría'}
                  {selectedRow?.sku ? ` · SKU ${selectedRow.sku}` : ''}
                </p>
              </div>

              {selectedSalesRow ? (
                <>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <div className="text-[10px] uppercase font-bold text-secondary">Pedidos</div>
                      <div className="mt-1 text-lg font-bold">{Number(selectedSalesRow.orders_count ?? 0).toLocaleString('es-EC')}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <div className="text-[10px] uppercase font-bold text-secondary">Unidades vendidas</div>
                      <div className="mt-1 text-lg font-bold">{Number(selectedSalesRow.units_sold ?? 0).toLocaleString('es-EC')}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <div className="text-[10px] uppercase font-bold text-secondary">Compradas acum.</div>
                      <div className="mt-1 text-lg font-bold">{Number(selectedRow?.purchasedUnits ?? 0).toLocaleString('es-EC')}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <div className="text-[10px] uppercase font-bold text-secondary">Stock lotes</div>
                      <div className="mt-1 text-lg font-bold">{Number(selectedRow?.remainingUnits ?? 0).toLocaleString('es-EC')}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <div className="text-[10px] uppercase font-bold text-secondary">Venta neta</div>
                      <div className="mt-1 text-lg font-bold">{formatMoney(selectedSalesRow.net_revenue)}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-3">
                      <div className="text-[10px] uppercase font-bold text-secondary">Utilidad</div>
                      <div className={`mt-1 text-lg font-bold ${Number(selectedSalesRow.profit ?? 0) < 0 ? 'text-red' : ''}`}>{formatMoney(selectedSalesRow.profit)}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-4">
                    <div className="mb-2 text-sm font-bold">Ventas separadas por factura ({salesPeriodLabel})</div>
                    <div className="space-y-3">
                      {selectedProductSalesInvoices.map((invoice) => (
                        <article key={`${invoice.id}-${invoice.ref}`} className="rounded-xl border border-line bg-surface p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Factura / pedido</div>
                              <div className="break-all text-sm font-bold text-black">#{invoice.ref || invoice.id}</div>
                              <div className="mt-1 text-xs text-secondary">{invoice.status || 'estado no definido'}</div>
                            </div>
                            <div className="sm:text-right">
                              <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Fecha</div>
                              <div className="text-sm font-semibold text-black">{formatSalesOrderDate(invoice.created_at)}</div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <div>
                              <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Cliente</div>
                              <div className="text-sm font-semibold">{invoice.user_name || 'Cliente sin nombre'}</div>
                              <div className="break-all text-xs text-secondary">{invoice.customer_email || 'sin correo'}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Pago / entrega</div>
                              <div className="text-sm font-semibold">{invoice.payment_method || 'sin pago'}</div>
                              <div className="text-xs text-secondary">{invoice.delivery_method || 'sin entrega'}</div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                            <div className="rounded-lg border border-line bg-white p-2">
                              <div className="text-[10px] uppercase font-bold text-secondary">Venta neta</div>
                              <div className="mt-1 text-sm font-bold">{formatMoney(invoice.net)}</div>
                            </div>
                            <div className="rounded-lg border border-line bg-white p-2">
                              <div className="text-[10px] uppercase font-bold text-secondary">Costo</div>
                              <div className="mt-1 text-sm font-bold">{formatMoney(invoice.cost ?? 0)}</div>
                            </div>
                            <div className="rounded-lg border border-line bg-white p-2">
                              <div className="text-[10px] uppercase font-bold text-secondary">Utilidad</div>
                              <div className={`mt-1 text-sm font-bold ${Number(invoice.profit ?? 0) < 0 ? 'text-red' : ''}`}>{formatMoney(invoice.profit ?? 0)}</div>
                            </div>
                            <div className="rounded-lg border border-line bg-white p-2">
                              <div className="text-[10px] uppercase font-bold text-secondary">Margen</div>
                              <div className={`mt-1 text-sm font-bold ${Number(invoice.margin ?? 0) < 0 ? 'text-red' : ''}`}>{Number(invoice.margin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
                            </div>
                            <div className="rounded-lg border border-line bg-white p-2">
                              <div className="text-[10px] uppercase font-bold text-secondary">IVA</div>
                              <div className="mt-1 text-sm font-bold">{formatMoney(invoice.vat)}</div>
                            </div>
                            <div className="rounded-lg border border-line bg-white p-2">
                              <div className="text-[10px] uppercase font-bold text-secondary">Envío</div>
                              <div className="mt-1 text-sm font-bold">{formatMoney(invoice.shipping)}</div>
                            </div>
                          </div>
                        </article>
                      ))}
                      {selectedProductSalesInvoices.length === 0 && (
                        <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-secondary">
                          No hay facturas vinculadas a este producto en el período de reporte.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-secondary">
                  Este producto no registra ventas en el período de reporte activo.
                </div>
              )}
            </div>
          )}

          {selectedProductId && viewMode === 'purchases' && !detailLoading && !detailError && selectedDetail && (
            <div className="space-y-4">
              <div>
                <div className="heading6">{selectedDetail.product_name}</div>
                <p className="mt-1 text-xs text-secondary">
                  {selectedDetail.category || 'Sin categoría'}
                  {selectedRow?.sku ? ` · SKU ${selectedRow.sku}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-xl border border-line bg-surface p-3">
                  <div className="text-[10px] uppercase font-bold text-secondary">Compras</div>
                  <div className="mt-1 text-lg font-bold">{Number(selectedDetail.entries_count ?? 0).toLocaleString('es-EC')}</div>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3">
                  <div className="text-[10px] uppercase font-bold text-secondary">Unid. compradas</div>
                  <div className="mt-1 text-lg font-bold">{Number(selectedDetail.purchased_units_total ?? 0).toLocaleString('es-EC')}</div>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3">
                  <div className="text-[10px] uppercase font-bold text-secondary">Unid. restantes</div>
                  <div className="mt-1 text-lg font-bold">{Number(selectedDetail.remaining_units_total ?? 0).toLocaleString('es-EC')}</div>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3">
                  <div className="text-[10px] uppercase font-bold text-secondary">Capital restante</div>
                  <div className="mt-1 text-lg font-bold">{formatMoney(selectedDetail.remaining_cost_total)}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-line bg-surface">
                    <tr className="text-[11px] uppercase font-bold text-secondary">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Factura / origen</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3 text-right">Comprado</th>
                      <th className="px-4 py-3 text-right">Consumido</th>
                      <th className="px-4 py-3 text-right">Restante</th>
                      <th className="px-4 py-3 text-right">Costo unitario</th>
                      <th className="px-4 py-3 text-right">Total compra</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sortedLots.map((lot) => (
                      <tr key={lot.id} className="hover:bg-surface/50">
                        <td className="px-4 py-3 text-sm">{formatIsoDate(lot.issued_at || lot.received_at || lot.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold">
                            {lot.purchase_invoice_id ? (
                              <button
                                type="button"
                                className="underline underline-offset-2"
                                onClick={() => onOpenPurchaseInvoice(lot.purchase_invoice_id!)}
                              >
                                {lot.invoice_number || 'Factura sin número'}
                              </button>
                            ) : (
                              lot.invoice_number || lotSourceLabel(lot.source_type)
                            )}
                          </div>
                          <div className="text-xs text-secondary">{lot.source_ref || lot.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{lot.supplier_name || 'Sin proveedor enlazado'}</div>
                          <div className="text-xs text-secondary">{lot.supplier_document || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{Number(lot.purchased_quantity ?? 0).toLocaleString('es-EC')}</td>
                        <td className="px-4 py-3 text-right text-sm">{Number(lot.consumed_quantity ?? 0).toLocaleString('es-EC')}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">{Number(lot.remaining_quantity ?? 0).toLocaleString('es-EC')}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatMoney(lot.unit_cost)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatMoney(lot.purchase_total)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            lot.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface text-secondary'
                          }`}>
                            {lot.status === 'open' ? 'Con remanente' : 'Consumida'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sortedLots.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-secondary">
                          Este producto todavía no tiene compras/lotes registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
