'use client'

import { ArrowRight, Archive, HourglassMedium, Package, ReceiptX } from '@phosphor-icons/react/dist/ssr'

import type { Order } from '../types'

type StatusBadge = { label: string; className: string }

type CustomerDashboardTabProps = {
    pickupUserOrders: number
    canceledUserOrders: number
    totalUserOrders: number
    userOrdersLoading: boolean
    recentUserOrders: Order[]
    onOpenOrder: (order: Order) => void
    onViewAllOrders: () => void
    getStatusBadge: (status: string) => StatusBadge
    formatDateTime: (value: string, options?: Intl.DateTimeFormatOptions) => string
}

const deliveryLabel = (order: Order) => {
    const method = String(order.delivery_method || '').trim().toLowerCase()
    if (method === 'pickup') return 'Retiro en tienda'
    if (method === 'delivery') return 'Envío a domicilio'
    return 'Por confirmar'
}

const paymentLabel = (order: Order) => {
    const raw = String(order.payment_method || '').trim()
    const method = raw.toLowerCase()
    if (method === 'cash' || method === 'efectivo') return 'Efectivo'
    if (method === 'card' || method === 'tarjeta') return 'Tarjeta'
    if (method === 'transfer' || method === 'transferencia') return 'Transferencia'
    return raw || 'Por confirmar'
}

export default function CustomerDashboardTab({
    pickupUserOrders,
    canceledUserOrders,
    totalUserOrders,
    userOrdersLoading,
    recentUserOrders,
    onOpenOrder,
    onViewAllOrders,
    getStatusBadge,
    formatDateTime,
}: CustomerDashboardTabProps) {
    const metrics = [
        { label: 'Por retirar', value: pickupUserOrders, icon: HourglassMedium },
        { label: 'Cancelados', value: canceledUserOrders, icon: ReceiptX },
        { label: 'Pedidos totales', value: totalUserOrders, icon: Archive },
    ]

    return (
        <div className="customer-dashboard-tab tab !block">
            <section className="customer-summary-strip" aria-label="Resumen de pedidos">
                {metrics.map((metric) => {
                    const MetricIcon = metric.icon
                    return (
                        <article key={metric.label} className="customer-summary-item">
                            <span className="customer-summary-icon" aria-hidden="true">
                                <MetricIcon size={21} />
                            </span>
                            <span>
                                <strong className="customer-summary-value block">{metric.value}</strong>
                                <span className="customer-summary-label block">{metric.label}</span>
                            </span>
                        </article>
                    )
                })}
            </section>

            <section className="customer-content-surface mt-4 overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                        <h2 className="customer-page-title !text-xl">Pedidos recientes</h2>
                        <p className="customer-page-description">Últimos movimientos de tu cuenta.</p>
                    </div>
                    <button type="button" onClick={onViewAllOrders} className="customer-secondary-action inline-flex items-center justify-center gap-2 self-start px-3 text-sm font-bold sm:self-auto">
                        Ver historial <ArrowRight size={16} aria-hidden="true" />
                    </button>
                </header>

                {userOrdersLoading ? (
                    <div className="customer-muted px-5 py-10 text-center" aria-live="polite">Cargando pedidos...</div>
                ) : recentUserOrders.length === 0 ? (
                    <div className="customer-muted px-5 py-10 text-center">
                        <Package size={28} className="mx-auto mb-2" aria-hidden="true" />
                        Aún no tienes pedidos registrados.
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <table className="customer-data-table">
                                <thead>
                                    <tr>
                                        <th className="w-[25%]">Pedido / Fecha</th>
                                        <th className="w-[23%]">Entrega / Pago</th>
                                        <th className="w-[14%]">Productos</th>
                                        <th className="w-[12%]">Total</th>
                                        <th className="w-[14%]">Estado</th>
                                        <th className="w-[12%]"><span className="sr-only">Acción</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentUserOrders.map((order) => {
                                        const badge = getStatusBadge(order.status)
                                        const items = Number(order.items_count ?? 0)
                                        const units = Number(order.units_count ?? items)
                                        return (
                                            <tr key={order.id}>
                                                <td>
                                                    <span className="customer-order-number block truncate">{order.order_number || order.id}</span>
                                                    <span className="customer-muted mt-1 block text-xs">{formatDateTime(order.created_at)}</span>
                                                </td>
                                                <td>
                                                    <span className="block text-sm font-semibold">{deliveryLabel(order)}</span>
                                                    <span className="customer-muted mt-1 block text-xs">{paymentLabel(order)}</span>
                                                </td>
                                                <td className="text-sm">{items} {items === 1 ? 'línea' : 'líneas'} · {units} u.</td>
                                                <td><span className="customer-order-total">${Number(order.total || 0).toFixed(2)}</span></td>
                                                <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span></td>
                                                <td className="text-right">
                                                    <button type="button" onClick={() => onOpenOrder(order)} className="customer-order-detail ml-auto" aria-label={`Ver pedido ${order.order_number || order.id}`}>
                                                        Ver <ArrowRight size={15} aria-hidden="true" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-2 p-3 md:hidden">
                            {recentUserOrders.map((order) => {
                                const badge = getStatusBadge(order.status)
                                return (
                                    <button key={`mobile-${order.id}`} type="button" onClick={() => onOpenOrder(order)} className="customer-order-card block min-h-[48px] w-full p-3 text-left">
                                        <span className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                                <span className="customer-order-number block truncate text-sm">{order.order_number || order.id}</span>
                                                <span className="customer-muted mt-1 block text-xs">{formatDateTime(order.created_at)}</span>
                                            </span>
                                            <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                                        </span>
                                        <span className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                                            <span className="text-sm"><strong className="block">{deliveryLabel(order)}</strong><span className="customer-muted text-xs">{paymentLabel(order)}</span></span>
                                            <span className="customer-order-total">${Number(order.total || 0).toFixed(2)}</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
