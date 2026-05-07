'use client'

import React from 'react'
import Image from '@/components/Common/AppImage'
import * as Icon from "@phosphor-icons/react/dist/ssr"
import { isDynamicOrderItemImage, normalizeOrderItemImage, parseAddress } from '../customerDataUtils'
import { normalizeStatus } from '../statusDisplay'

type OrderDetailModalProps = {
    open: boolean;
    order: any | null;
    orderContact: { name: string; email: string; phone: string };
    statusBadge: { label: string; className: string };
    canViewInvoice: boolean;
    canManageStatus: boolean;
    canCancelOrder: boolean;
    onClose: () => void;
    onViewInvoice: () => void;
    onUpdateStatus: (status: string) => void;
    formatDateTime: (value: string) => string;
    formatMoney: (value: any) => string;
    getVatSubtotal: (order: any) => number;
    getVatAmount: (order: any) => number;
    getShipping: (order: any) => number;
    getItemNetPrice: (item: any, order: any) => number;
}

export default function OrderDetailModal({
    open,
    order,
    orderContact,
    statusBadge,
    canViewInvoice,
    canManageStatus,
    canCancelOrder,
    onClose,
    onViewInvoice,
    onUpdateStatus,
    formatDateTime,
    formatMoney,
    getVatSubtotal,
    getVatAmount,
    getShipping,
    getItemNetPrice,
}: OrderDetailModalProps) {
    const [pendingStatus, setPendingStatus] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) {
            setPendingStatus(null)
        }
    }, [open])

    if (!open || !order) return null

    const shipping = getShipping(order)
    const shippingAddressRaw = parseAddress(order?.shipping_address)
    const billingAddressRaw = parseAddress(order?.billing_address)
    const shippingAddress = shippingAddressRaw && typeof shippingAddressRaw === 'object' ? shippingAddressRaw as Record<string, any> : {}
    const billingAddress = billingAddressRaw && typeof billingAddressRaw === 'object' ? billingAddressRaw as Record<string, any> : {}
    const addressValue = (source: Record<string, any>, ...keys: string[]) => {
        for (const key of keys) {
            const value = String(source?.[key] ?? '').trim()
            if (value) return value
        }
        return ''
    }
    const compactAddress = (source: Record<string, any>) => {
        const cityLine = [
            addressValue(source, 'city'),
            addressValue(source, 'state'),
            addressValue(source, 'zip'),
        ].filter(Boolean).join(', ')
        const country = addressValue(source, 'country')
        return [addressValue(source, 'street', 'address', 'line1'), cityLine, country].filter(Boolean)
    }
    const shippingLines = compactAddress(shippingAddress)
    const billingLines = compactAddress(billingAddress)
    const documentType = addressValue(billingAddress, 'documentType') || addressValue(shippingAddress, 'documentType')
    const documentNumber = addressValue(billingAddress, 'documentNumber') || addressValue(shippingAddress, 'documentNumber')
    const company = addressValue(billingAddress, 'company') || addressValue(shippingAddress, 'company')
    const orderNotes = String(order?.order_notes ?? '').trim()
    const pickupWindow = addressValue(shippingAddress, 'pickupWindow', 'window')
    const pickupProvider = addressValue(shippingAddress, 'provider', 'provider_name')
    const inferredDeliveryMethod = (() => {
        const explicit = normalizeStatus(order?.delivery_method || '')
        if (explicit) return explicit
        if (pickupWindow || pickupProvider) return 'pickup'
        if (Number(order?.shipping ?? 0) > 0) return 'delivery'
        if (Object.keys(shippingAddress).length > 0) return 'delivery'
        const normalizedStatus = normalizeStatus(order?.status || '')
        if (['pickup', 'ready_for_pickup', 'ready'].includes(normalizedStatus)) return 'pickup'
        return ''
    })()
    const deliveryMethod = inferredDeliveryMethod
    const deliveryMethodLabel = deliveryMethod === 'pickup'
        ? 'Retiro en tienda'
        : deliveryMethod === 'delivery'
            ? 'Envío a domicilio'
            : 'Método no especificado'
    const paymentMethodRaw = String(order?.payment_method || '').trim()
    const paymentMethod = paymentMethodRaw.toLowerCase()
    const paymentMethodLabel = !paymentMethod
        ? 'No especificado'
        : ['cash', 'efectivo'].includes(paymentMethod)
            ? 'Pago en efectivo'
            : ['card', 'tarjeta'].includes(paymentMethod)
                ? 'Pago con tarjeta'
                : ['transfer', 'transferencia'].includes(paymentMethod)
                    ? 'Transferencia'
                    : paymentMethodRaw
    const sameAddresses = shippingLines.join(' | ') !== '' && shippingLines.join(' | ') === billingLines.join(' | ')
    const mixedVatRates = Boolean(order?.mixed_vat_rates)
    const vatRateLabel = mixedVatRates
        ? 'IVA aplicado'
        : `IVA (${Number(order?.vat_rate ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`
    const pendingStatusLabel = pendingStatus === 'processing'
        ? 'marcar el pedido como En proceso'
        : pendingStatus === 'shipped'
            ? 'marcar el pedido como Enviado'
            : pendingStatus === 'delivered'
                ? 'marcar el pedido como Entregado'
                : pendingStatus === 'canceled'
                    ? 'cancelar el pedido'
                    : ''
    const showInvoiceButton = canViewInvoice && ['completed', 'delivered'].includes(normalizeStatus(order?.status))
    const currentStatus = normalizeStatus(order?.status)

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-line flex justify-between items-center bg-white rounded-t-2xl">
                    <div>
                        <h4 className="heading4">Pedido #{order.id}</h4>
                        <div className="text-secondary text-sm mt-1">{formatDateTime(order.created_at)}</div>
                    </div>
                    <button onClick={onClose} className="text-secondary hover:text-black">
                        <Icon.X size={24} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-surface rounded-xl p-6 border border-line">
                            <h6 className="heading6 mb-4 flex items-center gap-2">
                                <Icon.User size={20} /> Cliente
                            </h6>
                            <div className="space-y-2">
                                <div className="font-bold text-lg">{orderContact.name}</div>
                                <div className="text-secondary">{orderContact.email}</div>
                                <div className="text-secondary">{orderContact.phone !== '-' ? orderContact.phone : 'Sin teléfono'}</div>
                            </div>
                        </div>
                        <div className="bg-surface rounded-xl p-6 border border-line flex flex-col justify-between">
                            <h6 className="heading6 mb-4 flex items-center gap-2">
                                <Icon.Receipt size={20} /> Resumen
                            </h6>
                            <div className="space-y-3">
                                <div className="grid grid-cols-[1fr_120px] items-center">
                                    <span className="text-secondary">Subtotal sin IVA</span>
                                    <span className="font-bold tabular-nums text-right">{formatMoney(getVatSubtotal(order))}</span>
                                </div>
                                {Number(getVatAmount(order)) > 0 && (
                                    <div className="grid grid-cols-[1fr_120px] items-center">
                                        <span className="text-secondary">{vatRateLabel}</span>
                                        <span className="font-bold tabular-nums text-right">{formatMoney(getVatAmount(order))}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-[1fr_120px] items-center">
                                    <span className="text-secondary">Envío</span>
                                    <span className={`font-bold tabular-nums text-right ${shipping === 0 ? 'text-success' : 'text-[#111827]'}`}>
                                        {shipping === 0 ? 'Gratis' : formatMoney(shipping)}
                                    </span>
                                </div>
                                <div className="pt-3 border-t border-line grid grid-cols-[1fr_120px] items-center">
                                    <span className="text-lg font-bold">Total</span>
                                    <span className="text-xl font-bold text-primary tabular-nums text-right">{formatMoney(order?.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-6">
                        <div className="bg-white rounded-xl p-6 border border-line">
                            <h6 className="heading6 mb-4 flex items-center gap-2">
                                <Icon.Truck size={20} /> Entrega y solicitud
                            </h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-lg bg-surface border border-line px-4 py-4">
                                    <div className="text-[11px] uppercase font-bold text-secondary mb-2">Método de entrega</div>
                                    <div className="font-semibold text-black">{deliveryMethodLabel}</div>
                                    {pickupProvider && <div className="text-sm text-secondary mt-2">Proveedor: {pickupProvider}</div>}
                                    {pickupWindow && <div className="text-sm text-secondary mt-1">Ventana: {pickupWindow}</div>}
                                </div>
                                <div className="rounded-lg bg-surface border border-line px-4 py-4">
                                    <div className="text-[11px] uppercase font-bold text-secondary mb-2">Pago</div>
                                    <div className="font-semibold text-black">{paymentMethodLabel}</div>
                                    {documentType && <div className="text-sm text-secondary mt-2">Documento: {documentType}</div>}
                                    {documentNumber && <div className="text-sm text-secondary mt-1">{documentNumber}</div>}
                                    {company && <div className="text-sm text-secondary mt-1">Razón social: {company}</div>}
                                </div>
                            </div>
                            <div className="mt-4 rounded-lg bg-surface border border-line px-4 py-4">
                                <div className="text-[11px] uppercase font-bold text-secondary mb-2">Solicitud del cliente</div>
                                <div className={`text-sm ${orderNotes ? 'text-black whitespace-pre-wrap' : 'text-secondary'}`}>
                                    {orderNotes || 'Sin observaciones adicionales.'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-line">
                            <h6 className="heading6 mb-4 flex items-center gap-2">
                                <Icon.MapPinLine size={20} /> Direcciones del pedido
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-lg bg-surface border border-line px-4 py-4">
                                    <div className="text-[11px] uppercase font-bold text-secondary mb-2">Dirección de envío</div>
                                    {deliveryMethod === 'pickup' ? (
                                        <div className="text-sm text-black">El cliente eligió retiro en tienda.</div>
                                    ) : shippingLines.length > 0 ? (
                                        <div className="space-y-1 text-sm text-black">
                                            {shippingLines.map((line, index) => (
                                                <div key={`shipping-${index}`}>{line}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-secondary">Sin dirección de envío registrada.</div>
                                    )}
                                </div>
                                <div className="rounded-lg bg-surface border border-line px-4 py-4">
                                    <div className="text-[11px] uppercase font-bold text-secondary mb-2">Dirección de facturación</div>
                                    {sameAddresses ? (
                                        <div className="text-sm text-black">Usa la misma dirección de envío.</div>
                                    ) : billingLines.length > 0 ? (
                                        <div className="space-y-1 text-sm text-black">
                                            {billingLines.map((line, index) => (
                                                <div key={`billing-${index}`}>{line}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-secondary">Sin dirección de facturación registrada.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h6 className="heading6">Productos del Pedido</h6>
                            <span className="bg-line px-3 py-1 rounded-full text-xs font-bold">{order.items?.length || 0} ítems</span>
                        </div>
                        <div className="overflow-x-auto border border-line rounded-xl">
                            <table className="w-full text-left table-fixed">
                                <thead className="bg-surface border-b border-line text-xs uppercase text-secondary font-bold">
                                    <tr>
                                        <th className="px-6 py-4 w-[55%]">Producto</th>
                                        <th className="px-6 py-4 w-[12%] text-center">Cant.</th>
                                        <th className="px-6 py-4 w-[16%] text-right tabular-nums">Precio</th>
                                        <th className="px-6 py-4 w-[17%] text-right tabular-nums">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {order.items?.map((item: any) => {
                                        const unitNetPrice = Number(getItemNetPrice(item, order))
                                        const storedUnitGross = Number(item?.price ?? NaN)
                                        const unitDisplayPrice = Number.isFinite(storedUnitGross) && storedUnitGross >= 0
                                            ? storedUnitGross
                                            : unitNetPrice
                                        const imageSrc = normalizeOrderItemImage(item.product_image)
                                        return (
                                            <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-line rounded-lg overflow-hidden border border-line flex-shrink-0">
                                                            <Image
                                                                src={imageSrc}
                                                                alt={item.product_name}
                                                                width={48}
                                                                height={48}
                                                                sizes="48px"
                                                                className="w-full h-full object-cover"
                                                                unoptimized={isDynamicOrderItemImage(item.product_image)}
                                                            />
                                                        </div>
                                                        <span className="font-medium text-sm">{item.product_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                                                <td className="px-6 py-4 text-right tabular-nums">${unitDisplayPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right font-bold text-primary tabular-nums">${(unitDisplayPrice * item.quantity).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-line flex flex-col gap-4 bg-white rounded-b-2xl">
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${statusBadge.className}`}>
                            Estado: {statusBadge.label}
                        </span>
                    </div>
                    {pendingStatus && (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                            <div className="text-sm">
                                <div className="font-semibold text-amber-900">Confirmación requerida</div>
                                <div className="text-amber-800">
                                    Confirma que deseas {pendingStatusLabel}.
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${pendingStatus === 'canceled'
                                        ? 'bg-red text-white hover:bg-red/90'
                                        : 'bg-black text-white hover:bg-primary'
                                        }`}
                                    onClick={() => {
                                        onUpdateStatus(pendingStatus)
                                        setPendingStatus(null)
                                    }}
                                >
                                    Confirmar
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg border border-line hover:bg-white transition-all text-sm font-semibold"
                                    onClick={() => setPendingStatus(null)}
                                >
                                    Volver
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 md:justify-end">
                        {showInvoiceButton && (
                            <button className="px-4 py-2 rounded-lg bg-black text-white hover:bg-primary transition-all text-sm font-semibold" onClick={onViewInvoice}>
                                Imprimir factura
                            </button>
                        )}
                        {canManageStatus && (
                            <>
                                <button
                                    className="px-4 py-2 rounded-lg border border-line hover:bg-surface transition-all text-sm font-semibold"
                                    onClick={() => setPendingStatus('processing')}
                                >
                                    En proceso
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg border border-line hover:bg-surface transition-all text-sm font-semibold"
                                    onClick={() => setPendingStatus('shipped')}
                                >
                                    Enviado
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg bg-black text-white hover:bg-primary transition-all text-sm font-semibold"
                                    onClick={() => setPendingStatus('delivered')}
                                >
                                    Entregado
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg border border-red text-red hover:bg-red/10 transition-all text-sm font-semibold"
                                    onClick={() => setPendingStatus('canceled')}
                                >
                                    Cancelar
                                </button>
                            </>
                        )}
                        {!canManageStatus && canCancelOrder && ['pending', 'processing'].includes(currentStatus) && (
                            <button
                                className="px-4 py-2 rounded-lg border border-red text-red hover:bg-red/10 transition-all text-sm font-semibold"
                                onClick={() => setPendingStatus('canceled')}
                            >
                                Cancelar pedido
                            </button>
                        )}
                        <button className="px-5 py-2 rounded-lg border border-line hover:bg-surface transition-all text-sm font-semibold" onClick={onClose}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
