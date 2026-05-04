'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import type { SalesRankingRow } from '../types'

type SalesProductDetailModalProps = {
    open: boolean;
    product: SalesRankingRow | null;
    currentPeriod: { start?: string | null; end?: string | null };
    historicalPeriod: { start?: string | null; end?: string | null };
    formatMoney: (value: any) => string;
    onClose: () => void;
}

export default function SalesProductDetailModal({
    open,
    product,
    currentPeriod,
    historicalPeriod,
    formatMoney,
    onClose,
}: SalesProductDetailModalProps) {
    if (!open || !product) return null

    const renderMetricCard = (label: string, value: string | number, danger = false) => (
        <div className="p-3 rounded-lg border border-line bg-white">
            <div className="text-[10px] uppercase font-bold text-secondary">{label}</div>
            <div className={`text-lg font-bold ${danger ? 'text-red' : ''}`}>{value}</div>
        </div>
    )

    return (
        <div
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(event: React.MouseEvent) => event.stopPropagation()}
            >
                <div className="p-6 border-b border-line flex justify-between items-center bg-white rounded-t-2xl">
                    <div>
                        <h4 className="heading4">{product.product_name}</h4>
                        <div className="text-secondary text-sm mt-1 capitalize">
                            Categoría: {product.category || 'Sin categoría'}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-secondary hover:text-black">
                        <Icon.X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        <div className="p-5 rounded-xl border border-line bg-surface">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs uppercase font-bold text-secondary">Detalle mes seleccionado</div>
                                <div className="text-xs font-semibold text-secondary">
                                    {currentPeriod.start || '-'} → {currentPeriod.end || '-'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {renderMetricCard('Pedidos', product.month_orders_count)}
                                {renderMetricCard('Unidades', product.month_units_sold)}
                                {renderMetricCard('Venta bruta', formatMoney(product.month_gross_revenue))}
                                {renderMetricCard('Venta neta', formatMoney(product.month_net_revenue))}
                                {renderMetricCard('IVA', formatMoney(product.month_vat_amount))}
                                {renderMetricCard('Envío', formatMoney(product.month_shipping_amount))}
                                {renderMetricCard('Costo', formatMoney(product.month_cost))}
                                {renderMetricCard('Utilidad', formatMoney(product.month_profit), product.month_profit < 0)}
                                <div className="p-3 rounded-lg border border-line bg-white col-span-2">
                                    <div className="text-[10px] uppercase font-bold text-secondary">Margen bruto</div>
                                    <div className="text-lg font-bold">
                                        {Number(product.month_margin).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl border border-line bg-surface">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs uppercase font-bold text-secondary">Detalle histórico total</div>
                                <div className="text-xs font-semibold text-secondary">
                                    {historicalPeriod.start || '-'} → {historicalPeriod.end || '-'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {renderMetricCard('Pedidos', product.historical_orders_count)}
                                {renderMetricCard('Unidades', product.historical_units_sold)}
                                {renderMetricCard('Venta bruta', formatMoney(product.historical_gross_revenue))}
                                {renderMetricCard('Venta neta', formatMoney(product.historical_net_revenue))}
                                {renderMetricCard('IVA', formatMoney(product.historical_vat_amount))}
                                {renderMetricCard('Envío', formatMoney(product.historical_shipping_amount))}
                                {renderMetricCard('Costo', formatMoney(product.historical_cost))}
                                {renderMetricCard('Utilidad', formatMoney(product.historical_profit), product.historical_profit < 0)}
                                <div className="p-3 rounded-lg border border-line bg-white col-span-2">
                                    <div className="text-[10px] uppercase font-bold text-secondary">Margen bruto</div>
                                    <div className="text-lg font-bold">
                                        {Number(product.historical_margin).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-line flex justify-end bg-white rounded-b-2xl">
                    <button
                        className="px-5 py-2 rounded-lg border border-line hover:bg-surface transition-all text-sm font-semibold"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
