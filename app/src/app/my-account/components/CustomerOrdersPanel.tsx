'use client'

import React from 'react'
import { ArrowRight, Package } from '@phosphor-icons/react/dist/ssr'

import type { Order } from '../types'

type CustomerOrdersPanelProps = {
    activeOrders: string | undefined
    orders: Order[]
    loading: boolean
    onFilterChange: (order: string) => void
    onOpenOrder: (order: Order) => void
    getStatusBadge: (status: string) => { label: string; className: string }
    formatDateTime: (value: string) => string
}

const ORDER_FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'delivery', label: 'Enviados' },
    { id: 'completed', label: 'Completados' },
    { id: 'canceled', label: 'Cancelados' },
]

const deliveryLabel = (order: Order) => {
    const method = String(order.delivery_method || '').trim().toLowerCase()
    if (method === 'pickup') return 'Retiro en tienda'
    if (method === 'delivery') return 'Envío a domicilio'
    return 'Por confirmar'
}

const paymentLabel = (order: Order) => {
    const raw = String(order.payment_method || '').trim()
    const method = raw.toLowerCase()
    if (['cash', 'efectivo'].includes(method)) return 'Efectivo'
    if (['card', 'tarjeta'].includes(method)) return 'Tarjeta'
    if (['transfer', 'transferencia'].includes(method)) return 'Transferencia'
    return raw || 'Por confirmar'
}

export default React.memo(function CustomerOrdersPanel({
    activeOrders,
    orders,
    loading,
    onFilterChange,
    onOpenOrder,
    getStatusBadge,
    formatDateTime,
}: CustomerOrdersPanelProps) {
    return (
        <section className="customer-content-surface customer-orders-panel overflow-hidden">
            <header className="flex flex-col gap-3 border-b border-line px-4 pt-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                <nav className="flex max-w-full gap-2 overflow-x-auto" aria-label="Filtrar pedidos por estado">
                    {ORDER_FILTERS.map((item) => {
                        const active = activeOrders === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`customer-filter shrink-0 px-2 sm:px-3 ${active ? 'customer-filter--active' : ''}`}
                                onClick={() => onFilterChange(item.id)}
                                aria-pressed={active}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </nav>
                <p className="customer-muted pb-3 text-sm" aria-live="polite">
                    {loading ? 'Actualizando…' : `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}`}
                </p>
            </header>

            {loading ? (
                <div className="customer-muted px-5 py-12 text-center" aria-live="polite">Cargando pedidos...</div>
            ) : orders.length === 0 ? (
                <div className="customer-muted px-5 py-12 text-center">
                    <Package size={28} className="mx-auto mb-2" aria-hidden="true" />
                    No tienes pedidos en este estado.
                </div>
            ) : (
                <>
                    <div className="hidden lg:block">
                        <table className="customer-data-table">
                            <thead>
                                <tr>
                                    <th className="w-[24%]">Pedido / Fecha</th>
                                    <th className="w-[21%]">Entrega</th>
                                    <th className="w-[14%]">Pago</th>
                                    <th className="w-[13%]">Productos</th>
                                    <th className="w-[10%]">Total</th>
                                    <th className="w-[10%]">Estado</th>
                                    <th className="w-[8%]"><span className="sr-only">Acción</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const badge = getStatusBadge(order.status)
                                    const items = Number(order.items_count ?? 0)
                                    const units = Number(order.units_count ?? items)
                                    return (
                                        <tr key={order.id}>
                                            <td>
                                                <span className="customer-order-number block truncate">{order.order_number || order.id}</span>
                                                <span className="customer-muted mt-1 block text-xs">{formatDateTime(order.created_at)}</span>
                                            </td>
                                            <td className="text-sm font-semibold">{deliveryLabel(order)}</td>
                                            <td className="customer-muted text-sm">{paymentLabel(order)}</td>
                                            <td className="text-sm">{items} {items === 1 ? 'línea' : 'líneas'} · {units} u.</td>
                                            <td><span className="customer-order-total">${Number(order.total || 0).toFixed(2)}</span></td>
                                            <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span></td>
                                            <td className="text-right">
                                                <button type="button" onClick={() => onOpenOrder(order)} className="customer-order-detail ml-auto" aria-label={`Ver detalle del pedido ${order.order_number || order.id}`}>
                                                    Ver <ArrowRight size={15} aria-hidden="true" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2 p-3 lg:hidden">
                        {orders.map((order) => {
                            const badge = getStatusBadge(order.status)
                            const items = Number(order.items_count ?? 0)
                            const units = Number(order.units_count ?? items)
                            return (
                                <button key={order.id} type="button" onClick={() => onOpenOrder(order)} className="customer-order-card block min-h-[48px] w-full p-3 text-left">
                                    <span className="flex items-start justify-between gap-3">
                                        <span className="min-w-0">
                                            <span className="customer-order-number block truncate text-sm">{order.order_number || order.id}</span>
                                            <span className="customer-muted mt-1 block text-xs">{formatDateTime(order.created_at)}</span>
                                        </span>
                                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                                    </span>
                                    <span className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                                        <span><strong className="block">{deliveryLabel(order)}</strong><span className="customer-muted text-xs">{paymentLabel(order)}</span></span>
                                        <span className="text-right"><strong className="customer-order-total block">${Number(order.total || 0).toFixed(2)}</strong><span className="customer-muted text-xs">{items} {items === 1 ? 'línea' : 'líneas'} · {units} u.</span></span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </section>
    )
})
