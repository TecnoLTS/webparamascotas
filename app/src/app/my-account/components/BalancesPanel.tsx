'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

type SalesSummaryLike = {
    gross?: number
    net?: number
    vat?: number
    shipping?: number
}

type ProfitStatsLike = {
    cost?: number
    gross_profit?: number
    gross_margin?: number
    net_profit?: number
    net_margin?: number
    operating_expenses?: number
    period_expenses?: number
    paid_expenses?: number
    pending_expenses?: number
    overdue_expenses?: number
    committed_expenses?: number
    financial_adjustments?: number
    net_cash_profit?: number
    net_cash_margin?: number
    net_period_profit?: number
    net_period_margin?: number
    net_committed_profit?: number
    net_committed_margin?: number
    profit?: number
    margin?: number
    roi?: number
    net_roi?: number
    cash_net_roi?: number
    committed_net_roi?: number
}

type RecentOrderLike = {
    id: string
    created_at: string
    total?: number
    vat_amount?: number
    vat_subtotal?: number
    shipping?: number
}

type TraceabilityOrderLike = {
    id: string
    created_at: string
    net: number
    vat: number
    shipping: number
    gross: number
}

type TraceabilityProductLike = {
    product_id?: string
    product_name: string
    category?: string
    units_sold?: number
    net_revenue: number
    order_refs?: string[] | string
}

type BalancesPanelProps = {
    netSales: number
    salesSummary?: SalesSummaryLike | null
    profitStats?: ProfitStatsLike | null
    recentOrders: RecentOrderLike[]
    traceabilityOrders: TraceabilityOrderLike[]
    traceabilityProducts: TraceabilityProductLike[]
    formatMoney: (value: number | string | null | undefined) => string
    formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
    onOpenOrder: (orderId: string) => void
    onOpenProfitAnalysis: () => void
    onOpenMargins: () => void
    onOpenOrders: () => void
    onOpenTaxes: () => void
}

function BalanceMetricCard({
    label,
    value,
    caption,
    valueClassName = '',
}: {
    label: string
    value: string
    caption: string
    valueClassName?: string
}) {
    return (
        <div className="px-2.5 py-2 bg-white rounded-md border border-line">
            <div className="text-[10px] uppercase text-secondary font-bold leading-tight">{label}</div>
            <div className={`text-base font-bold leading-tight ${valueClassName}`}>{value}</div>
            <div className="text-[10px] text-secondary leading-tight">{caption}</div>
        </div>
    )
}

function BalancesPanel({
    netSales,
    salesSummary,
    profitStats,
    recentOrders,
    traceabilityOrders,
    traceabilityProducts,
    formatMoney,
    formatDate,
    onOpenOrder,
    onOpenProfitAnalysis,
    onOpenMargins,
    onOpenOrders,
    onOpenTaxes,
}: BalancesPanelProps) {
    const gross = Number(salesSummary?.gross ?? 0)
    const net = Number(salesSummary?.net ?? 0)
    const vat = Number(salesSummary?.vat ?? 0)
    const shipping = Number(salesSummary?.shipping ?? 0)
    const cost = Number(profitStats?.cost ?? 0)
    const grossProfit = Number(profitStats?.gross_profit ?? profitStats?.profit ?? 0)
    const grossMargin = Number(profitStats?.gross_margin ?? profitStats?.margin ?? 0)
    const periodExpenses = Number(profitStats?.period_expenses ?? profitStats?.operating_expenses ?? 0)
    const paidExpenses = Number(profitStats?.paid_expenses ?? 0)
    const pendingExpenses = Number(profitStats?.pending_expenses ?? 0)
    const overdueExpenses = Number(profitStats?.overdue_expenses ?? 0)
    const financialAdjustments = Number(profitStats?.financial_adjustments ?? 0)
    const netProfit = Number(profitStats?.net_profit ?? profitStats?.net_period_profit ?? grossProfit - periodExpenses - financialAdjustments)
    const netMargin = Number(profitStats?.net_margin ?? profitStats?.net_period_margin ?? (net > 0 ? (netProfit / net) * 100 : 0))
    const flowProfit = Number(profitStats?.net_cash_profit ?? grossProfit - paidExpenses - financialAdjustments)
    const flowMargin = Number(profitStats?.net_cash_margin ?? (net > 0 ? (flowProfit / net) * 100 : 0))
    const roi = Number(profitStats?.roi ?? 0)
    const netRoi = Number(profitStats?.net_roi ?? 0)
    const cashNetRoi = Number(profitStats?.cash_net_roi ?? 0)

    return (
        <div className="tab text-content w-full">
            <div className="text-gray-400 text-sm">Balance General (Informacion critica para decisiones)</div>
            <div className="heading2 mt-2">{formatMoney(netSales)}</div>
            <div className="text-secondary text-sm mt-1">Ventas netas (sin IVA ni envio)</div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-1.5 mt-3">
                <BalanceMetricCard label="Venta total" value={formatMoney(gross)} caption="Incluye IVA + envío" />
                <BalanceMetricCard label="IVA por pagar" value={formatMoney(vat)} caption="Impuesto cobrado" />
                <BalanceMetricCard label="Envio cobrado" value={formatMoney(shipping)} caption="Ingreso operativo" />
                <BalanceMetricCard label="Costo (COGS)" value={`-${formatMoney(cost)}`} caption="Costo real de producto" valueClassName="text-orange-600" />
                <BalanceMetricCard label="Utilidad bruta" value={formatMoney(grossProfit)} caption="Venta neta - costo producto" valueClassName={grossProfit >= 0 ? 'text-success' : 'text-red'} />
                <BalanceMetricCard label="Utilidad neta" value={formatMoney(netProfit)} caption="Bruta - gastos del período" valueClassName={netProfit >= 0 ? 'text-success' : 'text-red'} />
                <BalanceMetricCard label="Utilidad neta pagada" value={formatMoney(flowProfit)} caption="Bruta - gastos pagados" valueClassName={flowProfit >= 0 ? 'text-success' : 'text-red'} />
                <BalanceMetricCard label="Margen bruto" value={`${grossMargin.toFixed(1)}%`} caption="Utilidad bruta / ventas netas" />
                <BalanceMetricCard label="Margen neto" value={`${netMargin.toFixed(1)}%`} caption="Utilidad neta / ventas netas" />
                <BalanceMetricCard label="Margen neto pagado" value={`${flowMargin.toFixed(1)}%`} caption="Utilidad neta pagada / ventas netas" />
                <BalanceMetricCard label="ROI bruto" value={`${roi.toFixed(1)}%`} caption="Utilidad bruta / costo" />
                <BalanceMetricCard label="ROI neto" value={`${netRoi.toFixed(1)}%`} caption="Utilidad neta / costo + gastos" />
                <BalanceMetricCard label="ROI neto pagado" value={`${cashNetRoi.toFixed(1)}%`} caption="Neta pagada / costo + gastos pagados" />
                <BalanceMetricCard label="Gastos del período" value={`-${formatMoney(periodExpenses)}`} caption="Registrados por fecha" valueClassName="text-orange-600" />
                <BalanceMetricCard label="Gastos pagados" value={`-${formatMoney(paidExpenses)}`} caption="Del período" valueClassName="text-orange-600" />
                <BalanceMetricCard label="Obligaciones" value={`-${formatMoney(pendingExpenses + overdueExpenses)}`} caption="Pendientes y vencidas" valueClassName={overdueExpenses > 0 ? 'text-red' : 'text-orange-600'} />
                <BalanceMetricCard label="Ajustes cierre" value={formatMoney(financialAdjustments)} caption="Correcciones posteriores" valueClassName={financialAdjustments <= 0 ? 'text-success' : 'text-red'} />
                <BalanceMetricCard label="Venta neta" value={formatMoney(net)} caption="Base real de ingresos" />
            </div>

            <div className="mt-3 px-3 py-2 bg-surface rounded-lg border border-line">
                <div className="text-xs uppercase text-secondary font-bold mb-1.5">Acciones recomendadas</div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="px-2.5 py-1.5 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface" onClick={onOpenProfitAnalysis}>
                        Analizar rentabilidad
                    </button>
                    <button type="button" className="px-2.5 py-1.5 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface" onClick={onOpenMargins}>
                        Ajustar margenes
                    </button>
                    <button type="button" className="px-2.5 py-1.5 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface" onClick={onOpenOrders}>
                        Revisar pedidos
                    </button>
                    <button type="button" className="px-2.5 py-1.5 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface" onClick={onOpenTaxes}>
                        IVA y costos de envio
                    </button>
                </div>
            </div>

            <div className="heading6 mb-4 mt-10">Movimientos recientes (neto, IVA, envio)</div>
            <div className="flex flex-col gap-4">
                {recentOrders.slice(0, 6).map((order) => {
                    const orderNet = Number(order.vat_subtotal ?? (Number(order.total ?? 0) - Number(order.vat_amount ?? 0) - Number(order.shipping ?? 0)))
                    const orderVat = Number(order.vat_amount ?? 0)
                    const orderShipping = Number(order.shipping ?? 0)
                    return (
                        <div key={order.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-surface rounded-xl border border-line">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-success bg-opacity-10 text-success rounded-full flex items-center justify-center">
                                    <Icon.ArrowDownLeft weight="bold" />
                                </div>
                                <div>
                                    <div className="font-bold">Pedido #{order.id}</div>
                                    <div className="text-secondary text-xs">{formatDate(order.created_at)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-right text-sm md:w-[340px]">
                                <div>
                                    <div className="text-[10px] uppercase text-secondary">Neto</div>
                                    <div className="font-bold tabular-nums">{formatMoney(orderNet)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase text-secondary">IVA</div>
                                    <div className="font-bold tabular-nums">{formatMoney(orderVat)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase text-secondary">Envio</div>
                                    <div className="font-bold tabular-nums">{formatMoney(orderShipping)}</div>
                                </div>
                            </div>
                            <button type="button" className="px-3 py-1.5 rounded-lg border border-line text-xs font-bold hover:bg-white" onClick={() => onOpenOrder(order.id)}>
                                Ver pedido
                            </button>
                        </div>
                    )
                })}
                {recentOrders.length === 0 && (
                    <div className="text-center py-4 text-secondary">No hay transacciones recientes.</div>
                )}
            </div>

            <div className="mt-10 p-5 bg-surface rounded-xl border border-line">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                    <h6 className="heading6">Trazabilidad de cifras</h6>
                    <span className="text-xs text-secondary font-semibold">Fuente: pedidos completados o entregados + productos vendidos</span>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="bg-white border border-line rounded-lg p-4">
                        <div className="text-xs uppercase font-bold text-secondary mb-3">Pedidos que componen las ventas</div>
                        <div className="flex flex-col gap-2">
                            {traceabilityOrders.slice(0, 6).map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    className="text-left p-3 rounded-lg border border-line hover:bg-surface transition-colors"
                                    onClick={() => onOpenOrder(order.id)}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-bold text-sm">#{order.id}</span>
                                        <span className="text-xs text-secondary">{formatDate(order.created_at)}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-2 text-[11px]">
                                        <div>
                                            <div className="text-secondary uppercase">Neto</div>
                                            <div className="font-bold tabular-nums">{formatMoney(order.net)}</div>
                                        </div>
                                        <div>
                                            <div className="text-secondary uppercase">IVA</div>
                                            <div className="font-bold tabular-nums">{formatMoney(order.vat)}</div>
                                        </div>
                                        <div>
                                            <div className="text-secondary uppercase">Envio</div>
                                            <div className="font-bold tabular-nums">{formatMoney(order.shipping)}</div>
                                        </div>
                                        <div>
                                            <div className="text-secondary uppercase">Total</div>
                                            <div className="font-bold tabular-nums">{formatMoney(order.gross)}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {traceabilityOrders.length === 0 && (
                                <div className="text-sm text-secondary">Sin pedidos para trazabilidad.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-line rounded-lg p-4">
                        <div className="text-xs uppercase font-bold text-secondary mb-3">Productos que explican las ventas netas</div>
                        <div className="flex flex-col gap-3">
                            {traceabilityProducts.slice(0, 6).map((product, idx) => {
                                const refs = Array.isArray(product.order_refs)
                                    ? product.order_refs
                                    : String(product.order_refs || '').split(',').map((value) => value.trim()).filter(Boolean)
                                return (
                                    <div key={`${product.product_id || product.product_name}-${idx}`} className="p-3 rounded-lg border border-line">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-semibold text-sm">{product.product_name}</div>
                                            <div className="font-bold tabular-nums">{formatMoney(product.net_revenue)}</div>
                                        </div>
                                        <div className="text-xs text-secondary mt-1">
                                            Categoria: <span className="font-semibold capitalize">{product.category || 'Sin categoria'}</span> | Unidades: <span className="font-semibold">{Number(product.units_sold || 0)}</span>
                                        </div>
                                        <div className="text-xs text-secondary mt-1 break-words">
                                            Pedidos: {refs.length > 0 ? refs.join(', ') : 'Sin referencia'}
                                        </div>
                                    </div>
                                )
                            })}
                            {traceabilityProducts.length === 0 && (
                                <div className="text-sm text-secondary">Sin productos vendidos para trazabilidad.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default React.memo(BalancesPanel)
