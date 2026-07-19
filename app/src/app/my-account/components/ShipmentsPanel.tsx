'use client'

import React from 'react'

import type { Order, ShippingPickup, ShippingProvider } from '../types'

type ShipmentsPanelProps = {
    shippingProviders: ShippingProvider[];
    shippingPickups: ShippingPickup[];
    pickupReadyOrders: Order[];
    shippingRates: { delivery: number; pickup: number; taxRate: number };
    onViewDeliveryOrders: () => void;
    onViewOrder: (orderId: string) => void;
    formatMoney: (value: number) => string;
    formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
    formatDateTime: (value: string, options?: Intl.DateTimeFormatOptions) => string;
    getStatusBadge: (status: string) => { label: string; className: string };
}

export default React.memo(function ShipmentsPanel({
    shippingProviders,
    shippingPickups,
    pickupReadyOrders,
    shippingRates,
    onViewDeliveryOrders,
    onViewOrder,
    formatMoney,
    formatDate,
    formatDateTime,
    getStatusBadge,
}: ShipmentsPanelProps) {
    return (
        <div className="tab text-content w-full">
            <div className="heading5 pb-4">Gestión de Envíos</div>
            <p className="text-secondary mb-6">Controla costos logísticos, proveedores activos y pedidos en recojo.</p>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <div className="xl:col-span-2 p-6 bg-surface rounded-xl border border-line">
                    <div className="flex items-center justify-between mb-4">
                        <h6 className="heading6">Proveedores de Envío</h6>
                        <span className="text-xs text-secondary font-bold uppercase">{shippingProviders.length} activos</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {shippingProviders.length > 0 ? shippingProviders.map((provider) => (
                            <div key={provider.id} className="flex items-center justify-between p-3 bg-white rounded border border-line">
                                <span className="font-semibold">{provider.name}</span>
                                <span className="text-success text-xs font-bold uppercase">{provider.status}</span>
                            </div>
                        )) : (
                            <div className="p-3 text-sm text-secondary">No hay proveedores configurados.</div>
                        )}
                    </div>
                </div>
                <div className="p-6 bg-surface rounded-xl border border-line">
                    <h6 className="heading6 mb-3">Operación logística</h6>
                    <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-secondary">Domicilio</span>
                            <span className="font-semibold">{formatMoney(shippingRates.delivery)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-secondary">Retiro</span>
                            <span className="font-semibold">{formatMoney(shippingRates.pickup)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-secondary">IVA envío</span>
                            <span className="font-semibold">{shippingRates.taxRate.toFixed(1)}%</span>
                        </div>
                    </div>
                    <p className="text-xs text-secondary mb-4">
                        La configuración completa de costos, radio gratis y límites del mapa aparece debajo en esta misma pestaña.
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold hover:bg-white transition-colors text-left"
                            onClick={onViewDeliveryOrders}
                        >
                            Ver pedidos en ruta
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-6 bg-surface rounded-xl border border-line">
                <h6 className="heading6 mb-4">Próximas Recogidas</h6>
                {shippingPickups.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {shippingPickups.map((pickup, index) => {
                            const pickupDateRaw = pickup.scheduled_at || pickup.date || ''
                            const pickupProvider = pickup.provider || pickup.provider_name || 'Proveedor'
                            const pickupReference = pickup.reference || pickup.order_id || pickup.id || '-'

                            return (
                                <div key={`${pickupReference}-${index}`} className="p-4 bg-white rounded-lg border border-line flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <div className="font-semibold">{pickupProvider}</div>
                                        <div className="text-xs text-secondary mt-1">Ref: {pickupReference}</div>
                                        {pickup.notes ? <div className="text-xs text-secondary mt-1">{pickup.notes}</div> : null}
                                    </div>
                                    <div className="text-sm text-right">
                                        <div className="font-semibold">
                                            {pickupDateRaw ? formatDate(pickupDateRaw, { weekday: 'short', day: '2-digit', month: 'short' }) : 'Fecha pendiente'}
                                        </div>
                                        <div className="text-secondary">
                                            {pickupDateRaw ? formatDateTime(pickupDateRaw, { hour: '2-digit', minute: '2-digit' }) : (pickup.window || 'Hora pendiente')}
                                        </div>
                                        <div className="text-xs mt-1 uppercase font-bold text-primary">{pickup.status || 'Pendiente'}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : pickupReadyOrders.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {pickupReadyOrders.map((order) => {
                            const badge = getStatusBadge(order.status)

                            return (
                                <div key={order.id} className="p-4 bg-white rounded-lg border border-line flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <div className="font-semibold">Pedido #{order.id}</div>
                                        <div className="text-xs text-secondary mt-1">Cliente: {order.customer_name || order.user_name || 'Cliente'}</div>
                                        <div className="text-xs text-secondary mt-1">Creado: {formatDate(order.created_at)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.className}`}>{badge.label}</span>
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg border border-line text-xs font-bold hover:bg-surface"
                                            onClick={() => onViewOrder(order.id)}
                                        >
                                            Ver pedido
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-secondary text-sm">
                        No hay recogidas programadas ni pedidos listos para retiro.
                    </div>
                )}
            </div>
        </div>
    )
})
