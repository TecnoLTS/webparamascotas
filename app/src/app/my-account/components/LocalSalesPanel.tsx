'use client'

import React from 'react'
import {
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr'
import LocalSaleCatalogPanel from './LocalSaleCatalogPanel'
import { DEFAULT_STORE_PAUSE_MESSAGE } from '../utils'
import { getStatusBadge } from '../statusDisplay'

type LocalSalesPanelProps = Record<string, any>

export default function LocalSalesPanel(props: LocalSalesPanelProps) {
  const {
    currentDateLabel,
    storeStatus,
    formatMoney,
    formatIsoDate,
    formatDateTimeEcuador,
    localSaleAutoPrint,
    localSaleCashReceived,
    localSaleCatalog,
    localSaleChange,
    localSaleCustomerCity,
    localSaleCustomerDocumentNumber,
    localSaleCustomerDocumentType,
    localSaleCustomerEmail,
    localSaleCustomerEmailValid,
    localSaleCustomerLookupLoading,
    localSaleCustomerLookupMessage,
    localSaleCustomerName,
    localSaleCustomerPhone,
    localSaleCustomerStreet,
    localSaleDiscount,
    localSaleDiscountCode,
    localSaleElectronicAmount,
    localSaleGross,
    localSaleItemQuantityById,
    localSaleItems,
    localSaleLastQuotation,
    localSaleLastSubmission,
    localSaleMissingInfo,
    localSaleQuoteHistory,
    localSaleQuoteHistoryLoading,
    localSaleNet,
    localSaleNotes,
    localSalePaidAmount,
    localSalePaymentMethod,
    localSalePaymentReady,
    localSalePaymentReference,
    localSalePaymentStatusText,
    localSalePendingAmount,
    localSalePrimaryMissing,
    localSaleQuotationMissingInfo,
    localSaleQuotationPrimaryMissing,
    localSaleProfit,
    localSaleQuickChecks,
    localSaleQuote,
    localSaleQuoteSendEmail,
    localSaleQuoteLoading,
    localSaleSelectedQuotationId,
    localSaleSaving,
    localSaleSearch,
    localSaleShipping,
    localSaleTotal,
    localSaleUnits,
    localSaleVat,
    posActionLoading,
    posActiveShift,
    posCanRegisterSale,
    posCashSales,
    posCloseNotes,
    posClosingCash,
    posElectronicSales,
    posExpectedCash,
    posFieldClass,
    posFieldFlexClass,
    posFieldLabelClass,
    posLoading,
    posMovementAdjustments,
    posMovementAmount,
    posMovementCreateExpense,
    posMovementDescription,
    posMovementExpenseCategory,
    posMovementExpense,
    posMovementIncome,
    posMovementType,
    posMovements,
    posOpenNotes,
    posOpeningCash,
    posOrdersCount,
    posSalesTotal,
    posShiftHistory,
    posTextareaClass,
    handleAddLocalSaleProduct,
    handleAddPosMovement,
    handleClearLocalSale,
    handleClosePosShift,
    handleCompleteMixedWithElectronic,
    handleCreateLocalQuotation,
    handleCreateLocalSale,
    handleConvertSelectedLocalQuotation,
    handleLookupCustomerByDocument,
    handleOpenLastLocalSaleOrder,
    handleOpenPosShift,
    handlePrintLastLocalSaleInvoice,
    handlePrintLastLocalQuotation,
    handleRemoveLocalSaleItem,
    handleSetCashExact,
    handleUpdateLocalSaleQuantity,
    loadLocalSaleQuoteHistory,
    loadPosSnapshot,
    setLocalSaleAutoPrint,
    setLocalSaleCashReceived,
    setLocalSaleCustomerCity,
    setLocalSaleCustomerDocumentNumber,
    setLocalSaleCustomerDocumentType,
    setLocalSaleCustomerEmail,
    setLocalSaleCustomerLookupMessage,
    setLocalSaleCustomerName,
    setLocalSaleCustomerPhone,
    setLocalSaleCustomerStreet,
    setLocalSaleDiscountCode,
    setLocalSaleElectronicAmount,
    setLocalSaleNotes,
    setLocalSalePaymentMethod,
    setLocalSalePaymentReference,
    setLocalSaleQuoteSendEmail,
    setLocalSaleSelectedQuotationId,
    setLocalSaleSearch,
    setPosCloseNotes,
    setPosClosingCash,
    setPosMovementAmount,
    setPosMovementCreateExpense,
    setPosMovementDescription,
    setPosMovementExpenseCategory,
    setPosMovementType,
    setPosOpenNotes,
    setPosOpeningCash,
  } = props

  const isLocalSaleSubmitDisabled = localSaleSaving || localSaleMissingInfo.length > 0

  return (
                                        <div className="tab text-content !flex !flex-col w-full">
                                            <div className="flex items-center justify-between pb-6">
                                                <div>
                                                    <div className="heading5">Venta en local (POS)</div>
                                                    <p className="text-secondary text-xs mt-1">
                                                        Busca artículos, verifica existencia/costo y registra ventas directas en mostrador.
                                                    </p>
                                                </div>
                                                <div className="text-sm font-bold text-secondary bg-surface px-4 py-2 rounded-lg border border-line">
                                                    {currentDateLabel}
                                                </div>
                                            </div>
    
                                            {!storeStatus.salesEnabled && (
                                                <div className="mb-5 p-4 rounded-xl border border-red/30 bg-red/5 text-red text-sm">
                                                    {storeStatus.message || DEFAULT_STORE_PAUSE_MESSAGE}
                                                </div>
                                            )}
    
                                            <div className="grid grid-cols-1 2xl:grid-cols-12 gap-5">
                                                <LocalSaleCatalogPanel
                                                    products={localSaleCatalog}
                                                    search={localSaleSearch}
                                                    setSearch={setLocalSaleSearch}
                                                    localSaleUnits={localSaleUnits}
                                                    itemQuantityById={localSaleItemQuantityById}
                                                    onAddProduct={handleAddLocalSaleProduct}
                                                    formatMoney={formatMoney}
                                                    formatIsoDate={formatIsoDate}
                                                />
    
                                                <div className="2xl:col-span-6 border border-line rounded-2xl bg-white p-5">
                                                    <div className="flex items-start justify-between gap-3 mb-4">
                                                        <div>
                                                            <div className="heading6">Compra local</div>
                                                            <p className="text-xs text-secondary mt-1">Resumen de productos, costos y cobro final.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleClearLocalSale}
                                                            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-surface"
                                                        >
                                                            Limpiar
                                                        </button>
                                                    </div>
    
                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                                                        {localSaleQuickChecks.map((check) => (
                                                            <div key={check.key} className={`rounded-lg border p-2 ${check.ok ? 'border-success/30 bg-success/10' : 'border-yellow/40 bg-yellow/10'}`}>
                                                                <div className="text-[10px] uppercase font-bold text-secondary">{check.label}</div>
                                                                <div className={`text-xs font-semibold mt-1 ${check.ok ? 'text-success' : 'text-yellow'}`}>{check.detail}</div>
                                                            </div>
                                                        ))}
                                                    </div>
    
                                                    <div className="space-y-4 mb-4">
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div className="sm:col-span-2 text-[11px] font-semibold text-[#516074]">
                                                                    Paso 1: ingresa la cédula/documento para autocompletar el cliente.
                                                                </div>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Tipo documento</div>
                                                                    <select
                                                                        value={localSaleCustomerDocumentType}
                                                                        onChange={(event) => setLocalSaleCustomerDocumentType(event.target.value as 'cedula' | 'ruc' | 'pasaporte' | 'consumidor_final')}
                                                                        className={posFieldClass}
                                                                    >
                                                                        <option value="cedula">Cédula</option>
                                                                        <option value="ruc">RUC</option>
                                                                        <option value="pasaporte">Pasaporte</option>
                                                                        <option value="consumidor_final">Consumidor final</option>
                                                                    </select>
                                                                </label>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>
                                                                        Número de documento {localSaleCustomerDocumentType === 'consumidor_final' ? '(opcional)' : '(obligatorio)'}
                                                                    </div>
                                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={localSaleCustomerDocumentNumber}
                                                                            onChange={(event) => {
                                                                                setLocalSaleCustomerDocumentNumber(event.target.value)
                                                                                setLocalSaleCustomerLookupMessage(null)
                                                                            }}
                                                                            onBlur={() => {
                                                                                const trimmed = localSaleCustomerDocumentNumber.trim()
                                                                                if (localSaleCustomerDocumentType !== 'consumidor_final' && trimmed.length >= 6) {
                                                                                    handleLookupCustomerByDocument(trimmed)
                                                                                }
                                                                            }}
                                                                            onKeyDown={(event) => {
                                                                                if (event.key !== 'Enter') return
                                                                                event.preventDefault()
                                                                                if (localSaleCustomerDocumentNumber.trim().length >= 6) {
                                                                                    handleLookupCustomerByDocument()
                                                                                }
                                                                            }}
                                                                            placeholder={localSaleCustomerDocumentType === 'consumidor_final' ? 'No requerido' : 'Ingresa cédula/documento'}
                                                                            className={posFieldFlexClass}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleLookupCustomerByDocument()}
                                                                            disabled={localSaleCustomerLookupLoading || localSaleCustomerDocumentNumber.trim().length < 6}
                                                                            className={`px-3 py-2 rounded-lg text-xs font-semibold ${(localSaleCustomerLookupLoading || localSaleCustomerDocumentNumber.trim().length < 6)
                                                                                ? 'bg-surface text-secondary border border-line cursor-not-allowed'
                                                                                : 'bg-black text-white hover:opacity-90'
                                                                                }`}
                                                                        >
                                                                            {localSaleCustomerLookupLoading ? 'Buscando...' : 'Buscar'}
                                                                        </button>
                                                                    </div>
                                                                </label>
                                                                {localSaleCustomerLookupMessage && (
                                                                    <div className={`sm:col-span-2 -mt-1 text-xs ${localSaleCustomerLookupMessage.toLowerCase().includes('encontrado') ? 'text-success' : 'text-secondary'}`}>
                                                                        {localSaleCustomerLookupMessage}
                                                                    </div>
                                                                )}
                                                                <div className="sm:col-span-2 mt-1 text-[11px] font-semibold text-[#516074]">
                                                                    Paso 2: verifica o completa los datos del cliente.
                                                                </div>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Cliente</div>
                                                                    <input
                                                                        type="text"
                                                                        value={localSaleCustomerName}
                                                                        onChange={(event) => setLocalSaleCustomerName(event.target.value)}
                                                                        placeholder="Nombre del cliente"
                                                                        className={posFieldClass}
                                                                    />
                                                                </label>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Teléfono</div>
                                                                    <input
                                                                        type="text"
                                                                        value={localSaleCustomerPhone}
                                                                        onChange={(event) => setLocalSaleCustomerPhone(event.target.value)}
                                                                        placeholder="099..."
                                                                        className={posFieldClass}
                                                                    />
                                                                </label>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Correo</div>
                                                                    <input
                                                                        type="email"
                                                                        value={localSaleCustomerEmail}
                                                                        onChange={(event) => setLocalSaleCustomerEmail(event.target.value)}
                                                                        placeholder="cliente@correo.com"
                                                                        className={posFieldClass}
                                                                    />
                                                                    {localSaleCustomerEmail && (
                                                                        <div className={`mt-1 text-[11px] ${localSaleCustomerEmailValid ? 'text-success' : 'text-yellow'}`}>
                                                                            {localSaleCustomerEmailValid ? 'Correo válido para envío' : 'Correo no válido'}
                                                                        </div>
                                                                    )}
                                                                </label>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Ciudad</div>
                                                                    <input
                                                                        type="text"
                                                                        value={localSaleCustomerCity}
                                                                        onChange={(event) => setLocalSaleCustomerCity(event.target.value)}
                                                                        placeholder="Ciudad (opcional)"
                                                                        className={posFieldClass}
                                                                    />
                                                                </label>
                                                                <label className="sm:col-span-2">
                                                                    <div className={posFieldLabelClass}>Dirección (obligatoria)</div>
                                                                    <input
                                                                        type="text"
                                                                        value={localSaleCustomerStreet}
                                                                        onChange={(event) => setLocalSaleCustomerStreet(event.target.value)}
                                                                        placeholder="Dirección del cliente"
                                                                        className={posFieldClass}
                                                                    />
                                                                </label>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Pago</div>
                                                                    <select
                                                                        value={localSalePaymentMethod}
                                                                        onChange={(event) => {
                                                                            const method = event.target.value
                                                                            setLocalSalePaymentMethod(method)
                                                                            if (method !== 'cash' && method !== 'mixed') {
                                                                                setLocalSaleCashReceived('')
                                                                            }
                                                                            if (method !== 'mixed') {
                                                                                setLocalSaleElectronicAmount('')
                                                                            }
                                                                            if (method === 'cash') {
                                                                                setLocalSalePaymentReference('')
                                                                            }
                                                                        }}
                                                                        className={posFieldClass}
                                                                    >
                                                                        <option value="cash">Efectivo</option>
                                                                        <option value="card">Tarjeta</option>
                                                                        <option value="transfer">Transferencia</option>
                                                                        <option value="mixed">Mixto</option>
                                                                    </select>
                                                                </label>
                                                                <label>
                                                                    <div className={posFieldLabelClass}>Código descuento</div>
                                                                    <input
                                                                        type="text"
                                                                        value={localSaleDiscountCode}
                                                                        onChange={(event) => setLocalSaleDiscountCode(event.target.value.toUpperCase())}
                                                                        placeholder="Opcional y registrado"
                                                                        className={posFieldClass}
                                                                    />
                                                                </label>
                                                                {(localSalePaymentMethod === 'cash' || localSalePaymentMethod === 'mixed') && (
                                                                    <label>
                                                                        <div className={posFieldLabelClass}>Efectivo recibido</div>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            step="0.01"
                                                                            value={localSaleCashReceived}
                                                                            onChange={(event) => setLocalSaleCashReceived(event.target.value)}
                                                                            placeholder="0.00"
                                                                            className={posFieldClass}
                                                                        />
                                                                        <div className="mt-1.5 flex gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={handleSetCashExact}
                                                                                className="px-2 py-1 rounded border border-line text-[11px] font-semibold hover:bg-surface"
                                                                            >
                                                                                Exacto
                                                                            </button>
                                                                            {localSalePaymentMethod === 'mixed' && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={handleCompleteMixedWithElectronic}
                                                                                    className="px-2 py-1 rounded border border-line text-[11px] font-semibold hover:bg-surface"
                                                                                >
                                                                                    Completar mixto
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </label>
                                                                )}
                                                                {localSalePaymentMethod === 'mixed' && (
                                                                    <label>
                                                                        <div className={posFieldLabelClass}>Monto electrónico</div>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            step="0.01"
                                                                            value={localSaleElectronicAmount}
                                                                            onChange={(event) => setLocalSaleElectronicAmount(event.target.value)}
                                                                            placeholder="0.00"
                                                                            className={posFieldClass}
                                                                        />
                                                                    </label>
                                                                )}
                                                                {(localSalePaymentMethod === 'transfer' || localSalePaymentMethod === 'mixed' || localSalePaymentMethod === 'card') && (
                                                                    <label className={localSalePaymentMethod === 'card' ? '' : 'sm:col-span-2'}>
                                                                        <div className={posFieldLabelClass}>Referencia de pago</div>
                                                                        <input
                                                                            type="text"
                                                                            value={localSalePaymentReference}
                                                                            onChange={(event) => setLocalSalePaymentReference(event.target.value)}
                                                                            placeholder={localSalePaymentMethod === 'card' ? 'Voucher (opcional)' : 'Referencia obligatoria'}
                                                                            className={posFieldClass}
                                                                        />
                                                                    </label>
                                                                )}
                                                                <label className="sm:col-span-2">
                                                                    <div className={posFieldLabelClass}>Notas</div>
                                                                    <textarea
                                                                        value={localSaleNotes}
                                                                        onChange={(event) => setLocalSaleNotes(event.target.value)}
                                                                        rows={2}
                                                                        placeholder="Observaciones de la venta"
                                                                        className={posTextareaClass}
                                                                    />
                                                                </label>
                                                                <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={localSaleAutoPrint}
                                                                        onChange={(event) => setLocalSaleAutoPrint(event.target.checked)}
                                                                        className="w-4 h-4 accent-black"
                                                                    />
                                                                    <span>Imprimir comprobante interno automáticamente al registrar la venta</span>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Pagado</div>
                                                                    <div className="font-bold">{formatMoney(localSalePaidAmount)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Vuelto</div>
                                                                    <div className={`font-bold ${localSaleChange > 0 ? 'text-success' : ''}`}>{formatMoney(localSaleChange)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Pendiente</div>
                                                                    <div className={`font-bold ${localSalePendingAmount > 0 ? 'text-red' : 'text-success'}`}>{formatMoney(localSalePendingAmount)}</div>
                                                                </div>
                                                                <div className={`p-2 rounded border ${localSalePaymentReady ? 'border-success/30 bg-success/10' : 'border-yellow/30 bg-yellow/10'}`}>
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Estado pago</div>
                                                                    <div className={`font-bold ${localSalePaymentReady ? 'text-success' : 'text-yellow'}`}>
                                                                        {localSalePaymentStatusText}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-xl border border-line p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Artículos en venta</div>
                                                                    <div className="text-xs text-secondary">{localSaleItems.length} tipo{localSaleItems.length === 1 ? '' : 's'}</div>
                                                                </div>
                                                                <div className="max-h-[240px] overflow-y-auto space-y-2">
                                                                    {localSaleItems.map((item) => (
                                                                        <div key={item.internalId} className="rounded-lg border border-line bg-surface p-3">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="min-w-0">
                                                                                    <div className="text-sm font-semibold leading-tight break-words">{item.name}</div>
                                                                                    <div className="text-[11px] text-secondary mt-1">
                                                                                        Costo: {formatMoney(item.cost * item.quantity)} | Unitario: {formatMoney(item.price)}
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveLocalSaleItem(item.internalId)}
                                                                                    className="text-red hover:underline text-xs font-semibold whitespace-nowrap"
                                                                                >
                                                                                    Quitar
                                                                                </button>
                                                                            </div>
                                                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                                                <div className="inline-flex items-center gap-1">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="w-7 h-7 rounded border border-line text-xs"
                                                                                        onClick={() => handleUpdateLocalSaleQuantity(item.internalId, item.quantity - 1)}
                                                                                    >
                                                                                        -
                                                                                    </button>
                                                                                    <input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        max={item.stock}
                                                                                        value={item.quantity}
                                                                                        onChange={(event) => handleUpdateLocalSaleQuantity(item.internalId, Number(event.target.value || 0))}
                                                                                        className="w-14 text-center text-xs border border-line rounded py-1"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="w-7 h-7 rounded border border-line text-xs"
                                                                                        onClick={() => handleUpdateLocalSaleQuantity(item.internalId, item.quantity + 1)}
                                                                                    >
                                                                                        +
                                                                                    </button>
                                                                                </div>
                                                                                <div className="text-sm font-bold">
                                                                                    {formatMoney(item.price * item.quantity)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {localSaleItems.length === 0 && (
                                                                        <div className="px-3 py-5 text-center text-sm text-secondary">
                                                                            Sin artículos agregados.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Neto</div>
                                                                    <div className="font-bold">{formatMoney(localSaleNet)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">IVA</div>
                                                                    <div className="font-bold">{formatMoney(localSaleVat)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Bruto</div>
                                                                    <div className="font-bold">{formatMoney(localSaleGross)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Descuento</div>
                                                                    <div className="font-bold">{formatMoney(localSaleDiscount)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Utilidad</div>
                                                                    <div className={`font-bold ${localSaleProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(localSaleProfit)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Total</div>
                                                                    <div className="font-bold">{formatMoney(localSaleTotal)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
    
                                                    {localSaleQuote?.discount_rejections && localSaleQuote.discount_rejections.length > 0 && (
                                                        <div className="mb-3 p-3 rounded-lg border border-yellow/40 bg-yellow/10 text-yellow text-xs">
                                                            {localSaleQuote.discount_rejections.map((item, index) => (
                                                                <div key={`${item.code || 'code'}-${index}`}>
                                                                    {item.message || item.reason || 'Descuento rechazado por reglas de validación.'}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {localSaleMissingInfo.length > 0 && (
                                                        <div className="mb-3 p-3 rounded-lg border border-yellow/40 bg-yellow/10 text-yellow text-xs">
                                                            <div className="font-semibold mb-1">Pendiente principal: {localSalePrimaryMissing}</div>
                                                            {localSaleMissingInfo.length > 1 && (
                                                                <details>
                                                                    <summary className="cursor-pointer font-medium">
                                                                        Ver {localSaleMissingInfo.length - 1} pendiente{localSaleMissingInfo.length - 1 === 1 ? '' : 's'} adicional{localSaleMissingInfo.length - 1 === 1 ? '' : 'es'}
                                                                    </summary>
                                                                    <ul className="list-disc pl-4 space-y-0.5 mt-1">
                                                                        {localSaleMissingInfo.slice(1).map((issue, idx) => (
                                                                            <li key={`${issue}-${idx}`}>{issue}</li>
                                                                        ))}
                                                                    </ul>
                                                                </details>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Total a cobrar</div>
                                                            <div className="text-2xl font-bold">{formatMoney(localSaleTotal)}</div>
                                                        </div>
                                                        <div className="flex gap-2 flex-wrap justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={handleCreateLocalSale}
                                                                disabled={isLocalSaleSubmitDisabled}
                                                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${(isLocalSaleSubmitDisabled)
                                                                    ? 'bg-surface text-secondary cursor-not-allowed border border-line'
                                                                    : 'bg-black text-white hover:opacity-90'
                                                                    }`}
                                                            >
                                                                {localSaleSaving ? 'Registrando...' : (localSaleQuoteLoading ? 'Calculando...' : 'Registrar venta local')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {localSaleLastSubmission && (
                                                        <div className={`mt-4 p-4 rounded-xl border ${localSaleLastSubmission.status === 'success'
                                                            ? 'border-success/20 bg-success/5'
                                                            : 'border-red/20 bg-red/5'
                                                            }`}>
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Último resultado de venta</div>
                                                                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${localSaleLastSubmission.status === 'success'
                                                                            ? 'bg-success/15 text-success'
                                                                            : 'bg-red/10 text-red'
                                                                            }`}>
                                                                            {localSaleLastSubmission.status === 'success' ? (
                                                                                <CheckCircle size={14} weight="fill" />
                                                                            ) : (
                                                                                <WarningCircle size={14} weight="fill" />
                                                                            )}
                                                                            {localSaleLastSubmission.status === 'success' ? 'Venta OK' : 'Venta con error'}
                                                                        </div>
                                                                        {localSaleLastSubmission.orderStatus && localSaleLastSubmission.status === 'success' && (
                                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusBadge(localSaleLastSubmission.orderStatus).className}`}>
                                                                                {getStatusBadge(localSaleLastSubmission.orderStatus).label}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right text-[11px] text-secondary shrink-0">
                                                                    {formatDateTimeEcuador(localSaleLastSubmission.createdAt, {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </div>
    
                                                            <div className="mt-3 text-sm font-medium text-black">
                                                                {localSaleLastSubmission.message}
                                                            </div>
    
                                                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                                                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Pedido</div>
                                                                    <div className="font-semibold mt-1 break-all">{localSaleLastSubmission.orderId || 'No generado'}</div>
                                                                </div>
                                                                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Cliente</div>
                                                                    <div className="font-semibold mt-1">{localSaleLastSubmission.customerName}</div>
                                                                </div>
                                                                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Total</div>
                                                                    <div className="font-semibold mt-1">{formatMoney(localSaleLastSubmission.total)}</div>
                                                                </div>
                                                                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Pago</div>
                                                                    <div className="font-semibold mt-1">{localSaleLastSubmission.paymentMethod}</div>
                                                                </div>
                                                                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Productos</div>
                                                                    <div className="font-semibold mt-1">{localSaleLastSubmission.itemCount} tipo{localSaleLastSubmission.itemCount === 1 ? '' : 's'} / {localSaleLastSubmission.units} ud{localSaleLastSubmission.units === 1 ? '' : 's'}</div>
                                                                </div>
                                                                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Documento</div>
                                                                    <div className="font-semibold mt-1">{localSaleLastSubmission.documentNumber || 'Consumidor final'}</div>
                                                                </div>
                                                            </div>
    
                                                            {localSaleLastSubmission.invoiceAvailable && localSaleLastSubmission.orderId && (
                                                                <div className="mt-3 flex gap-2 flex-wrap">
                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-white"
                                                                        onClick={handleOpenLastLocalSaleOrder}
                                                                    >
                                                                        Ver pedido
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-white"
                                                                        onClick={handlePrintLastLocalSaleInvoice}
                                                                    >
                                                                        Imprimir / Guardar PDF
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
                                                <div className="xl:col-span-7 border border-line rounded-2xl bg-white p-5">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <div className="heading6">Caja del turno</div>
                                                            <p className="text-xs text-secondary mt-1">
                                                                {posCanRegisterSale
                                                                    ? `Turno activo: ${posActiveShift?.id || '-'}`
                                                                    : 'No hay turno activo. Abre caja para vender.'}
                                                            </p>
                                                            <div className="mt-2 inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-secondary">
                                                                Alcance: <span className="ml-1 text-black">turno activo</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => loadPosSnapshot()}
                                                            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-surface"
                                                            disabled={posLoading || posActionLoading}
                                                        >
                                                            {posLoading ? 'Cargando...' : 'Actualizar'}
                                                        </button>
                                                    </div>
    
                                                    {posCanRegisterSale && posActiveShift ? (
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Apertura</div>
                                                                    <div className="font-bold">{formatMoney(posActiveShift.opening_cash)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Esperado en caja</div>
                                                                    <div className="font-bold">{formatMoney(posExpectedCash)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Pedidos POS</div>
                                                                    <div className="font-bold">{posOrdersCount}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Ventas turno</div>
                                                                    <div className="font-bold">{formatMoney(posSalesTotal)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Ventas efectivo</div>
                                                                    <div className="font-bold">{formatMoney(posCashSales)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Ventas electrónicas</div>
                                                                    <div className="font-bold">{formatMoney(posElectronicSales)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Ingresos caja</div>
                                                                    <div className="font-bold">{formatMoney(posMovementIncome)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Egresos caja</div>
                                                                    <div className="font-bold">{formatMoney(posMovementExpense)}</div>
                                                                </div>
                                                                <div className="p-2 rounded border border-line bg-surface">
                                                                    <div className="text-[10px] uppercase font-bold text-secondary">Ajustes</div>
                                                                    <div className="font-bold">{formatMoney(posMovementAdjustments)}</div>
                                                                </div>
                                                            </div>
    
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <label>
                                                                    <div className="text-[10px] uppercase font-bold text-secondary mb-1">Efectivo contado al cierre</div>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        step="0.01"
                                                                        value={posClosingCash}
                                                                        onChange={(event) => setPosClosingCash(event.target.value)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:border-black outline-none"
                                                                    />
                                                                </label>
                                                                <label>
                                                                    <div className="text-[10px] uppercase font-bold text-secondary mb-1">Nota de cierre</div>
                                                                    <input
                                                                        type="text"
                                                                        value={posCloseNotes}
                                                                        onChange={(event) => setPosCloseNotes(event.target.value)}
                                                                        placeholder="Observación del turno"
                                                                        className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:border-black outline-none"
                                                                    />
                                                                </label>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handleClosePosShift}
                                                                disabled={posActionLoading || posLoading}
                                                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${(posActionLoading || posLoading)
                                                                    ? 'bg-surface text-secondary cursor-not-allowed border border-line'
                                                                    : 'bg-black text-white hover:opacity-90'
                                                                    }`}
                                                            >
                                                                {posActionLoading ? 'Procesando...' : 'Cerrar caja'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <label>
                                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">Monto inicial</div>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    value={posOpeningCash}
                                                                    onChange={(event) => setPosOpeningCash(event.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:border-black outline-none"
                                                                />
                                                            </label>
                                                            <label>
                                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">Nota de apertura</div>
                                                                <input
                                                                    type="text"
                                                                    value={posOpenNotes}
                                                                    onChange={(event) => setPosOpenNotes(event.target.value)}
                                                                    placeholder="Observación inicial"
                                                                    className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:border-black outline-none"
                                                                />
                                                            </label>
                                                            <div className="sm:col-span-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleOpenPosShift}
                                                                    disabled={posActionLoading || posLoading}
                                                                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${(posActionLoading || posLoading)
                                                                        ? 'bg-surface text-secondary cursor-not-allowed border border-line'
                                                                        : 'bg-black text-white hover:opacity-90'
                                                                        }`}
                                                                >
                                                                    {posActionLoading ? 'Procesando...' : 'Abrir caja'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
    
                                                <div className="xl:col-span-5 border border-line rounded-2xl bg-white p-5">
                                                    <div className="heading6 mb-3">Movimientos de caja</div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                                        <select
                                                            value={posMovementType}
                                                            onChange={(event) => setPosMovementType(event.target.value as any)}
                                                            className="px-3 py-2 rounded-lg border border-line text-sm bg-white focus:border-black outline-none"
                                                        >
                                                            <option value="expense">Egreso</option>
                                                            <option value="income">Ingreso</option>
                                                            <option value="withdrawal">Retiro</option>
                                                            <option value="deposit">Depósito</option>
                                                            <option value="adjustment">Ajuste (+/-)</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={posMovementAmount}
                                                            onChange={(event) => setPosMovementAmount(event.target.value)}
                                                            placeholder={posMovementType === 'adjustment' ? 'Puede ser negativo' : 'Monto'}
                                                            className="px-3 py-2 rounded-lg border border-line text-sm focus:border-black outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddPosMovement}
                                                            disabled={!posCanRegisterSale || posActionLoading || posLoading}
                                                            className={`px-3 py-2 rounded-lg text-sm font-semibold ${(posCanRegisterSale && !posActionLoading && !posLoading)
                                                                ? 'bg-black text-white hover:opacity-90'
                                                                : 'bg-surface text-secondary border border-line cursor-not-allowed'
                                                                }`}
                                                        >
                                                            Agregar
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={posMovementDescription}
                                                        onChange={(event) => setPosMovementDescription(event.target.value)}
                                                        placeholder="Descripción del movimiento"
                                                        className="w-full mb-3 px-3 py-2 rounded-lg border border-line text-sm focus:border-black outline-none"
                                                    />
                                                    {(posMovementType === 'expense' || posMovementType === 'withdrawal') && (
                                                        <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                                                            <label className="flex items-center gap-2 text-xs font-semibold text-secondary">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(posMovementCreateExpense)}
                                                                    onChange={(event) => setPosMovementCreateExpense(event.target.checked)}
                                                                />
                                                                Registrar tambien como gasto operativo pagado
                                                            </label>
                                                            {posMovementCreateExpense && (
                                                                <select
                                                                    value={posMovementExpenseCategory}
                                                                    onChange={(event) => setPosMovementExpenseCategory(event.target.value)}
                                                                    className="px-3 py-2 rounded-lg border border-line text-xs bg-white focus:border-black outline-none"
                                                                >
                                                                    <option value="Arriendo">Arriendo</option>
                                                                    <option value="Sueldos">Sueldos</option>
                                                                    <option value="Servicios básicos">Servicios básicos</option>
                                                                    <option value="Internet / telefonía">Internet / telefonía</option>
                                                                    <option value="Software / suscripciones">Software / suscripciones</option>
                                                                    <option value="Marketing">Marketing</option>
                                                                    <option value="Transporte / delivery">Transporte / delivery</option>
                                                                    <option value="Mantenimiento">Mantenimiento</option>
                                                                    <option value="Contabilidad / legal">Contabilidad / legal</option>
                                                                    <option value="Otros">Otros</option>
                                                                </select>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="overflow-auto max-h-[210px] border border-line rounded-xl">
                                                        <table className="w-full min-w-[540px]">
                                                            <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left">Fecha</th>
                                                                    <th className="px-3 py-2 text-left">Tipo</th>
                                                                    <th className="px-3 py-2 text-right">Monto</th>
                                                                    <th className="px-3 py-2 text-left">Detalle</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-line">
                                                                {posMovements.map((movement) => (
                                                                    <tr key={movement.id}>
                                                                        <td className="px-3 py-2 text-xs">{formatDateTimeEcuador(movement.created_at)}</td>
                                                                        <td className="px-3 py-2 text-xs uppercase">{movement.type}</td>
                                                                        <td className={`px-3 py-2 text-xs text-right font-semibold ${movement.type === 'expense' || movement.type === 'withdrawal' ? 'text-red' : 'text-success'}`}>
                                                                            {formatMoney(movement.amount)}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs">
                                                                            <div>{movement.description || '-'}</div>
                                                                            {movement.business_expense_id && <div className="text-[10px] text-secondary">Gasto: {movement.business_expense_id}</div>}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {posMovements.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={4} className="px-3 py-5 text-center text-xs text-secondary">
                                                                            Sin movimientos registrados en el turno.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
    
                                            <div className="border border-line rounded-2xl bg-white p-5 mb-5">
                                                <div className="heading6 mb-3">Histórico de turnos de caja</div>
                                                <div className="overflow-auto max-h-[220px] border border-line rounded-xl">
                                                    <table className="w-full min-w-[880px]">
                                                        <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Turno</th>
                                                                <th className="px-3 py-2 text-left">Estado</th>
                                                                <th className="px-3 py-2 text-left">Inicio</th>
                                                                <th className="px-3 py-2 text-left">Fin</th>
                                                                <th className="px-3 py-2 text-right">Apertura</th>
                                                                <th className="px-3 py-2 text-right">Esperado</th>
                                                                <th className="px-3 py-2 text-right">Cierre</th>
                                                                <th className="px-3 py-2 text-right">Diferencia</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-line">
                                                            {posShiftHistory.map((shift) => (
                                                                <tr key={shift.id} className="hover:bg-surface/40">
                                                                    <td className="px-3 py-2 text-xs font-semibold">{shift.id}</td>
                                                                    <td className="px-3 py-2 text-xs">
                                                                        <span className={`px-2 py-0.5 rounded-full ${shift.status === 'open' ? 'bg-success/15 text-success' : 'bg-surface text-secondary'}`}>
                                                                            {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-xs">{formatDateTimeEcuador(shift.opened_at)}</td>
                                                                    <td className="px-3 py-2 text-xs">{shift.closed_at ? formatDateTimeEcuador(shift.closed_at) : '-'}</td>
                                                                    <td className="px-3 py-2 text-xs text-right">{formatMoney(shift.opening_cash)}</td>
                                                                    <td className="px-3 py-2 text-xs text-right">{formatMoney(shift.summary?.expected_cash ?? shift.expected_cash ?? 0)}</td>
                                                                    <td className="px-3 py-2 text-xs text-right">{shift.closing_cash !== null && shift.closing_cash !== undefined ? formatMoney(shift.closing_cash) : '-'}</td>
                                                                    <td className={`px-3 py-2 text-xs text-right font-semibold ${Number(shift.summary?.difference_cash ?? shift.difference_cash ?? 0) < 0 ? 'text-red' : 'text-success'}`}>
                                                                        {shift.status === 'closed' ? formatMoney(shift.summary?.difference_cash ?? shift.difference_cash ?? 0) : '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {posShiftHistory.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={8} className="px-3 py-5 text-center text-xs text-secondary">
                                                                        Aún no hay turnos de caja registrados.
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
