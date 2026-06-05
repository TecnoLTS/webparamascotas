'use client'

import React from 'react'
import type {
  ReportPeriodSummary,
  SalesReportView,
  SalesRankingRow,
  TraceabilityIssue,
  TraceabilityIssueSeverity,
  TraceabilityIssueType,
  TraceabilitySummary,
} from '../types'

type TraceabilityPanelProps = {
  currentDateLabel: string
  formatMoney: (value: number | string | null | undefined) => string
  formatDateEcuador: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
  formatDateTimeEcuador: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
  getCustomerDocument: (order: { customer_document_type?: string | null; customer_document_number?: string | null }) => string
  getDeliveryMethodLabel: (method?: string | null) => string
  getPaymentMethodLabel: (method?: string | null) => string
  issues: TraceabilityIssue[]
  orders: ReportPeriodSummary['orders']
  products: SalesRankingRow[]
  categories: ReportPeriodSummary['categories']
  periodLabel: string
  salesRankingMonth: string
  salesRankingView: SalesReportView
  selectedRankingMonthLabel: string
  selectReportMonth: (month: string) => void
  setSalesRankingView: (view: SalesReportView) => void
  summary: TraceabilitySummary
  onViewOrder: (orderId: string) => void
  onOpenProduct: (productId?: string | null) => void
  onRegisterPurchase: (productId?: string | null) => void
  onOpenOrders: () => void
}

const severityLabels: Record<TraceabilityIssueSeverity | 'all', string> = {
  all: 'Todas',
  critical: 'Críticas',
  warning: 'Advertencias',
  info: 'Datos',
}

const severityTone: Record<TraceabilityIssueSeverity, string> = {
  critical: 'bg-red-50 text-red border-red/30',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-surface text-secondary border-line',
}

const typeLabels: Record<TraceabilityIssueType, string> = {
  cost_zero: 'Costo cero',
  negative_margin: 'Margen negativo',
  low_margin: 'Margen bajo',
  missing_contact: 'Sin contacto',
  missing_document: 'Sin documento',
  missing_payment: 'Sin pago',
  missing_delivery: 'Sin entrega',
  missing_order_refs: 'Sin pedidos',
  incomplete_product_data: 'Ficha incompleta',
}

const formatPercent = (value: number) =>
  Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const getRefs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

export default function TraceabilityPanel({
  currentDateLabel,
  formatMoney,
  formatDateEcuador,
  formatDateTimeEcuador,
  getCustomerDocument,
  getDeliveryMethodLabel,
  getPaymentMethodLabel,
  issues,
  orders,
  products,
  categories,
  periodLabel,
  salesRankingMonth,
  salesRankingView,
  selectedRankingMonthLabel,
  selectReportMonth,
  setSalesRankingView,
  summary,
  onViewOrder,
  onOpenProduct,
  onRegisterPurchase,
  onOpenOrders,
}: TraceabilityPanelProps) {
  const [severityFilter, setSeverityFilter] = React.useState<TraceabilityIssueSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = React.useState<TraceabilityIssueType | 'all'>('all')
  const activeViewLabel = salesRankingView === 'daily'
    ? 'Día'
    : salesRankingView === 'week'
      ? 'Semana'
      : salesRankingView === 'month'
        ? selectedRankingMonthLabel
        : 'Todo'

  const typeOptions = React.useMemo(() => {
    return Array.from(new Set(issues.map((issue) => issue.type)))
  }, [issues])

  const filteredIssues = React.useMemo(() => {
    return issues.filter((issue) => {
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false
      if (typeFilter !== 'all' && issue.type !== typeFilter) return false
      return true
    })
  }, [issues, severityFilter, typeFilter])

  return (
    <>
      <div className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="heading6">Control de trazabilidad</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-secondary">
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">
                Vista: <span className="text-black">{activeViewLabel}</span>
              </span>
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">
                Rango: <span className="text-black">{periodLabel}</span>
              </span>
              <span className="rounded-md border border-line bg-surface px-2.5 py-1">
                Generado: <span className="text-black">{currentDateLabel}</span>
              </span>
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

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] font-bold uppercase text-secondary">Ventas auditadas</div>
            <div className="mt-1 text-2xl font-bold">{formatMoney(summary.netSales)}</div>
            <div className="mt-1 text-xs text-secondary">{summary.ordersAudited.toLocaleString('es-EC')} pedidos</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] font-bold uppercase text-secondary">Utilidad</div>
            <div className={`mt-1 text-2xl font-bold ${summary.grossProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(summary.grossProfit)}</div>
            <div className="mt-1 text-xs text-secondary">Costo {formatMoney(summary.cost)}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] font-bold uppercase text-secondary">Margen</div>
            <div className="mt-1 text-2xl font-bold">{formatPercent(summary.grossMargin)}%</div>
            <div className="mt-1 text-xs text-secondary">Bruto auditado</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] font-bold uppercase text-secondary">Cobertura datos</div>
            <div className="mt-1 text-2xl font-bold">{formatPercent(summary.coverageScore)}%</div>
            <div className="mt-1 text-xs text-secondary">{summary.productsWithOrderRefs}/{summary.productsAudited} SKU con pedido</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] font-bold uppercase text-secondary">Incidencias</div>
            <div className="mt-1 text-2xl font-bold">{summary.issuesCount.toLocaleString('es-EC')}</div>
            <div className="mt-1 text-xs text-secondary">{summary.criticalIssues} críticas / {summary.warningIssues} advertencias</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] font-bold uppercase text-secondary">Mix auditado</div>
            <div className="mt-1 text-2xl font-bold">{summary.productsAudited.toLocaleString('es-EC')}</div>
            <div className="mt-1 text-xs text-secondary">{summary.categoriesAudited.toLocaleString('es-EC')} categorías</div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="heading6">Cola de incidencias</div>
            <p className="mt-1 text-xs text-secondary">Ordenada por severidad e impacto comercial.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as TraceabilityIssueSeverity | 'all')}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-black"
            >
              {(['all', 'critical', 'warning', 'info'] as const).map((option) => (
                <option key={option} value={option}>{severityLabels[option]}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TraceabilityIssueType | 'all')}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-black"
            >
              <option value="all">Todos los tipos</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>{typeLabels[option]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredIssues.slice(0, 12).map((issue) => (
            <div key={issue.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${severityTone[issue.severity]}`}>
                      {severityLabels[issue.severity]}
                    </span>
                    <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-secondary">
                      {typeLabels[issue.type]}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold">{issue.title}</div>
                  <div className="mt-1 text-xs text-secondary">{issue.detail}</div>
                  {Number(issue.impact ?? 0) > 0 && (
                    <div className="mt-2 text-xs font-semibold">Impacto: {formatMoney(issue.impact)}</div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {issue.orderId && (
                    <button type="button" onClick={() => onViewOrder(issue.orderId!)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface">
                      Ver pedido
                    </button>
                  )}
                  {issue.productId && (
                    <button type="button" onClick={() => onOpenProduct(issue.productId)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface">
                      Producto
                    </button>
                  )}
                  {issue.productId && issue.type === 'cost_zero' && (
                    <button type="button" onClick={() => onRegisterPurchase(issue.productId)} className="rounded-lg border border-black bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black">
                      Compra
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredIssues.length === 0 && (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-secondary xl:col-span-2">
              Sin incidencias para los filtros actuales.
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="heading6">Pedidos auditados</div>
            <p className="mt-1 text-xs text-secondary">Ventas realizadas que componen el periodo activo.</p>
          </div>
          <button type="button" className="w-fit rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface" onClick={onOpenOrders}>
            Ver pedidos
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-[10px] font-bold uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Pago / entrega</th>
                <th className="px-4 py-3 text-right">Neta</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Utilidad</th>
                <th className="px-4 py-3 text-right">Margen</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-surface/40">
                  <td className="px-4 py-3 font-bold">#{order.id}</td>
                  <td className="px-4 py-3">
                    <div>{formatDateEcuador(order.created_at)}</div>
                    <div className="text-xs text-secondary">{formatDateTimeEcuador(order.created_at, { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3">{order.user_name || 'Cliente sin nombre'}</td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    <div>{order.customer_email || '-'}</div>
                    <div>{order.customer_phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">{getCustomerDocument(order)}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-semibold">{getPaymentMethodLabel(order.payment_method)}</div>
                    <div className="text-secondary">{getDeliveryMethodLabel(order.delivery_method)}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(order.net)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(order.cost ?? 0)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(order.profit ?? 0) >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(order.profit ?? 0)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(Number(order.margin ?? 0))}%</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-xs font-bold underline" onClick={() => onViewOrder(order.id)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-secondary">No hay pedidos auditados en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="heading6 mb-1">Productos auditados</div>
          <p className="mb-4 text-xs text-secondary">Productos vendidos con sus referencias de pedido y resultado bruto.</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-[10px] font-bold uppercase text-secondary">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Venta neta</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-right">Utilidad</th>
                  <th className="px-4 py-3 text-right">Margen</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product, idx) => {
                  const refs = getRefs(product.order_refs)
                  return (
                    <tr key={`${product.product_id || product.product_name}-${idx}`} className="hover:bg-surface/40">
                      <td className="px-4 py-3 font-semibold">{product.product_name}</td>
                      <td className="px-4 py-3 capitalize">{product.category || 'Sin categoría'}</td>
                      <td className="px-4 py-3 text-right">{Number(product.units_sold || 0).toLocaleString('es-EC')}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(product.net_revenue)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(product.cost)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${Number(product.profit ?? 0) >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(product.profit)}</td>
                      <td className="px-4 py-3 text-right">{formatPercent(Number(product.margin ?? 0))}%</td>
                      <td className="px-4 py-3 text-xs text-secondary">{refs.length > 0 ? refs.join(', ') : 'Sin referencia'}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className="text-xs font-bold underline" onClick={() => onOpenProduct(product.product_id)}>
                          Abrir
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-secondary">No hay productos auditados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="heading6 mb-1">Categorías</div>
          <p className="mb-4 text-xs text-secondary">Mix comercial agrupado del periodo activo.</p>
          <div className="space-y-3">
            {categories.map((category, idx) => {
              const categoryNet = Number(category.net_revenue ?? 0)
              const ratio = summary.netSales > 0 && categoryNet > 0 ? Math.max((categoryNet / summary.netSales) * 100, 4) : 0
              const refs = getRefs(category.order_refs)
              return (
                <div key={`${category.category}-${idx}`} className="rounded-lg border border-line bg-surface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold capitalize">{category.category || 'Sin categoría'}</div>
                    <div className="font-bold">{formatMoney(categoryNet)}</div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-black" style={{ width: `${ratio}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-secondary">
                    <span>{Number(category.units_sold ?? 0).toLocaleString('es-EC')} uds</span>
                    <span>{formatPercent(Number(category.margin ?? 0))}% margen</span>
                  </div>
                  <div className="mt-1 break-words text-xs text-secondary">
                    Pedidos: {refs.length > 0 ? refs.join(', ') : 'Sin referencia'}
                  </div>
                </div>
              )
            })}
            {categories.length === 0 && (
              <div className="text-sm text-secondary">No hay categorías auditadas.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
