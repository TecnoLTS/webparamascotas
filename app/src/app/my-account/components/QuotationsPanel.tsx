'use client'

import React from 'react'
import { CheckCircle } from '@phosphor-icons/react/dist/ssr'
import LocalSaleCatalogPanel from './LocalSaleCatalogPanel'
import { DEFAULT_STORE_PAUSE_MESSAGE } from '../utils'

type QuotationsPanelProps = Record<string, any>

export default function QuotationsPanel(props: QuotationsPanelProps) {
  const {
    currentDateLabel,
    storeStatus,
    formatMoney,
    formatIsoDate,
    formatDateTimeEcuador,
    localSaleCatalog,
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
    localSaleDiscountCode,
    localSaleItemQuantityById,
    localSaleItems,
    localSaleLastQuotation,
    localSaleQuotationMissingInfo,
    localSaleQuotationPrimaryMissing,
    localSaleQuote,
    localSaleQuoteHistory,
    localSaleQuoteHistoryLoading,
    localSaleQuoteLoading,
    localSaleQuoteSendEmail,
    localSaleQuoteSendWhatsApp,
    localSaleCustomerPhoneValid,
    localSaleSearch,
    localSaleSelectedQuotationId,
    localSaleTotal,
    localSaleUnits,
    localSaleVat,
    localSaleNet,
    localSaleNotes,
    localSaleSaving,
    posFieldClass,
    posFieldFlexClass,
    posFieldLabelClass,
    posTextareaClass,
    handleAddLocalSaleProduct,
    handleClearLocalSale,
    handleCreateLocalQuotation,
    handleConvertSelectedLocalQuotation,
    handleLookupCustomerByDocument,
    handlePrintLastLocalQuotation,
    handleRemoveLocalSaleItem,
    handleUpdateLocalSaleQuantity,
    loadLocalSaleQuoteHistory,
    setLocalSaleCustomerCity,
    setLocalSaleCustomerDocumentNumber,
    setLocalSaleCustomerDocumentType,
    setLocalSaleCustomerEmail,
    setLocalSaleCustomerLookupMessage,
    setLocalSaleCustomerName,
    setLocalSaleCustomerPhone,
    setLocalSaleCustomerStreet,
    setLocalSaleDiscountCode,
    setLocalSaleNotes,
    setLocalSaleQuoteSendEmail,
    setLocalSaleQuoteSendWhatsApp,
    setLocalSaleSearch,
    setLocalSaleSelectedQuotationId,
  } = props

  const isLocalSaleQuoteSubmitDisabled = localSaleSaving || localSaleQuotationMissingInfo.length > 0

  return (
    <div className="tab text-content !flex !flex-col w-full">
      <div className="flex items-center justify-between pb-6">
        <div>
          <div className="heading5">Cotizaciones</div>
          <p className="text-secondary text-xs mt-1">
            Prepara cotizaciones, envíalas por correo y conviértelas en venta cuando el cliente confirme.
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
              <div className="heading6">Cotización comercial</div>
              <p className="text-xs text-secondary mt-1">Datos del cliente, artículos, resumen y seguimiento.</p>
            </div>
            <button
              type="button"
              onClick={handleClearLocalSale}
              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-surface"
            >
              Limpiar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className={`rounded-lg border p-2 ${localSaleItems.length > 0 ? 'border-success/30 bg-success/10' : 'border-yellow/40 bg-yellow/10'}`}>
              <div className="text-[10px] uppercase font-bold text-secondary">Productos</div>
              <div className={`text-xs font-semibold mt-1 ${localSaleItems.length > 0 ? 'text-success' : 'text-yellow'}`}>
                {localSaleItems.length > 0 ? `${localSaleUnits} uds` : 'Sin items'}
              </div>
            </div>
            <div className={`rounded-lg border p-2 ${localSaleCustomerName.trim().length >= 3 ? 'border-success/30 bg-success/10' : 'border-yellow/40 bg-yellow/10'}`}>
              <div className="text-[10px] uppercase font-bold text-secondary">Cliente</div>
              <div className={`text-xs font-semibold mt-1 ${localSaleCustomerName.trim().length >= 3 ? 'text-success' : 'text-yellow'}`}>
                {localSaleCustomerName.trim().length >= 3 ? 'Completo' : 'Pendiente'}
              </div>
            </div>
            <div className={`rounded-lg border p-2 ${localSaleQuote && localSaleTotal > 0 ? 'border-success/30 bg-success/10' : 'border-yellow/40 bg-yellow/10'}`}>
              <div className="text-[10px] uppercase font-bold text-secondary">Total</div>
              <div className={`text-xs font-semibold mt-1 ${localSaleQuote && localSaleTotal > 0 ? 'text-success' : 'text-yellow'}`}>
                {localSaleQuote && localSaleTotal > 0 ? formatMoney(localSaleTotal) : 'Sin cálculo'}
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-4">
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-[#516074]">
                Paso 1: ingresa la cédula/documento para autocompletar el cliente.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {localSaleCustomerLookupMessage && (
                <div className={`-mt-1 text-xs ${localSaleCustomerLookupMessage.toLowerCase().includes('encontrado') ? 'text-success' : 'text-secondary'}`}>
                  {localSaleCustomerLookupMessage}
                </div>
              )}

              <div className="text-[11px] font-semibold text-[#516074] pt-1">
                Paso 2: completa los datos de la cotización.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  <div className={posFieldLabelClass}>Cliente</div>
                  <input type="text" value={localSaleCustomerName} onChange={(event) => setLocalSaleCustomerName(event.target.value)} placeholder="Nombre del cliente" className={posFieldClass} />
                </label>
                <label>
                  <div className={posFieldLabelClass}>Teléfono</div>
                  <input type="text" value={localSaleCustomerPhone} onChange={(event) => setLocalSaleCustomerPhone(event.target.value)} placeholder="099..." className={posFieldClass} />
                </label>
                <label>
                  <div className={posFieldLabelClass}>Correo</div>
                  <input type="email" value={localSaleCustomerEmail} onChange={(event) => setLocalSaleCustomerEmail(event.target.value)} placeholder="cliente@correo.com" className={posFieldClass} />
                  {localSaleCustomerEmail && (
                    <div className={`mt-1 text-[11px] ${localSaleCustomerEmailValid ? 'text-success' : 'text-yellow'}`}>
                      {localSaleCustomerEmailValid ? 'Correo válido para envío' : 'Correo no válido'}
                    </div>
                  )}
                </label>
                <label>
                  <div className={posFieldLabelClass}>Ciudad</div>
                  <input type="text" value={localSaleCustomerCity} onChange={(event) => setLocalSaleCustomerCity(event.target.value)} placeholder="Ciudad (opcional)" className={posFieldClass} />
                </label>
                <label className="sm:col-span-2">
                  <div className={posFieldLabelClass}>Dirección</div>
                  <input type="text" value={localSaleCustomerStreet} onChange={(event) => setLocalSaleCustomerStreet(event.target.value)} placeholder="Dirección del cliente" className={posFieldClass} />
                </label>
                <label>
                  <div className={posFieldLabelClass}>Código descuento</div>
                  <input type="text" value={localSaleDiscountCode} onChange={(event) => setLocalSaleDiscountCode(event.target.value.toUpperCase())} placeholder="Opcional y registrado" className={posFieldClass} />
                </label>
                <label className="inline-flex items-center gap-2 text-sm self-end pb-2">
                  <input
                    type="checkbox"
                    checked={localSaleQuoteSendEmail}
                    onChange={(event) => setLocalSaleQuoteSendEmail(event.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  <span>Enviar por correo si es válido</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm self-end pb-2">
                  <input
                    type="checkbox"
                    checked={localSaleQuoteSendWhatsApp}
                    onChange={(event) => setLocalSaleQuoteSendWhatsApp(event.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  <span>Enviar por WhatsApp</span>
                </label>
                {localSaleQuoteSendWhatsApp && (
                  <div className={`sm:col-span-2 -mt-1 text-[11px] ${localSaleCustomerPhoneValid ? 'text-success' : 'text-yellow'}`}>
                    {localSaleCustomerPhoneValid
                      ? 'Se abrirá WhatsApp con el mensaje listo al generar la cotización.'
                      : 'Ingresa un teléfono válido para preparar el mensaje de WhatsApp.'}
                  </div>
                )}
                <label className="sm:col-span-2">
                  <div className={posFieldLabelClass}>Notas</div>
                  <textarea value={localSaleNotes} onChange={(event) => setLocalSaleNotes(event.target.value)} rows={2} placeholder="Observaciones de la cotización" className={posTextareaClass} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase font-bold text-secondary">Artículos cotizados</div>
                  <div className="text-xs text-secondary">{localSaleItems.length} tipo{localSaleItems.length === 1 ? '' : 's'}</div>
                </div>
                <div className="max-h-[260px] overflow-y-auto space-y-2">
                  {localSaleItems.map((item) => (
                    <div key={item.internalId} className="rounded-lg border border-line bg-surface p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold leading-tight break-words">{item.name}</div>
                          <div className="text-[11px] text-secondary mt-1">Unitario: {formatMoney(item.price)}</div>
                        </div>
                        <button type="button" onClick={() => handleRemoveLocalSaleItem(item.internalId)} className="text-red hover:underline text-xs font-semibold whitespace-nowrap">
                          Quitar
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" className="w-7 h-7 rounded border border-line text-xs" onClick={() => handleUpdateLocalSaleQuantity(item.internalId, item.quantity - 1)}>-</button>
                          <input type="number" min={0} max={item.stock} value={item.quantity} onChange={(event) => handleUpdateLocalSaleQuantity(item.internalId, Number(event.target.value || 0))} className="w-14 text-center text-xs border border-line rounded py-1" />
                          <button type="button" className="w-7 h-7 rounded border border-line text-xs" onClick={() => handleUpdateLocalSaleQuantity(item.internalId, item.quantity + 1)}>+</button>
                        </div>
                        <div className="text-sm font-bold">{formatMoney(item.price * item.quantity)}</div>
                      </div>
                    </div>
                  ))}
                  {localSaleItems.length === 0 && (
                    <div className="px-3 py-5 text-center text-sm text-secondary">Sin artículos agregados.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 rounded border border-line bg-surface">
                  <div className="text-[10px] uppercase font-bold text-secondary">Subtotal</div>
                  <div className="font-bold">{formatMoney(localSaleNet)}</div>
                </div>
                <div className="p-2 rounded border border-line bg-surface">
                  <div className="text-[10px] uppercase font-bold text-secondary">IVA</div>
                  <div className="font-bold">{formatMoney(localSaleVat)}</div>
                </div>
                <div className="p-2 rounded border border-line bg-surface">
                  <div className="text-[10px] uppercase font-bold text-secondary">Total</div>
                  <div className="font-bold">{formatMoney(localSaleTotal)}</div>
                </div>
              </div>
            </div>
          </div>

          {localSaleQuotationMissingInfo.length > 0 && (
            <div className="mb-3 p-3 rounded-lg border border-[#0ea5e9]/30 bg-[#0ea5e9]/5 text-[#0369a1] text-xs">
              <div className="font-semibold mb-1">Cotización pendiente: {localSaleQuotationPrimaryMissing}</div>
              {localSaleQuotationMissingInfo.length > 1 && (
                <details>
                  <summary className="cursor-pointer font-medium">
                    Ver {localSaleQuotationMissingInfo.length - 1} ajuste{localSaleQuotationMissingInfo.length - 1 === 1 ? '' : 's'} adicional{localSaleQuotationMissingInfo.length - 1 === 1 ? '' : 'es'}
                  </summary>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                    {localSaleQuotationMissingInfo.slice(1).map((issue, idx) => (
                      <li key={`${issue}-${idx}`}>{issue}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-secondary">Total cotizado</div>
              <div className="text-2xl font-bold">{formatMoney(localSaleTotal)}</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleCreateLocalQuotation}
                disabled={isLocalSaleQuoteSubmitDisabled}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${(isLocalSaleQuoteSubmitDisabled)
                  ? 'bg-surface text-secondary cursor-not-allowed border border-line'
                  : 'bg-black text-white hover:opacity-90'
                  }`}
              >
                {localSaleQuoteLoading ? 'Calculando...' : 'Generar cotización'}
              </button>
            </div>
          </div>

          {localSaleQuoteHistory.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-secondary">
              <div>
                Últimas {localSaleQuoteHistory.length} cotización{localSaleQuoteHistory.length === 1 ? '' : 'es'} cargada{localSaleQuoteHistory.length === 1 ? '' : 's'} para seguimiento.
              </div>
              <button
                type="button"
                onClick={() => loadLocalSaleQuoteHistory()}
                className="px-2.5 py-1 rounded-md border border-line hover:bg-surface font-semibold"
              >
                {localSaleQuoteHistoryLoading ? 'Actualizando...' : 'Actualizar cotizaciones'}
              </button>
            </div>
          )}

          {localSaleLastQuotation && (
            <div className="mt-4 p-4 rounded-xl border border-[#0ea5e9]/20 bg-[#0ea5e9]/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-secondary">Última cotización</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-[#0ea5e9]/15 text-[#0369a1]">
                      <CheckCircle size={14} weight="fill" />
                      Cotización OK
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-secondary shrink-0">
                  {formatDateTimeEcuador(localSaleLastQuotation.createdAt, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div className="mt-3 text-sm font-medium text-black">{localSaleLastQuotation.message}</div>
              {localSaleLastQuotation.emailMessage && (
                <div className={`mt-2 text-xs ${localSaleLastQuotation.emailSent ? 'text-success' : 'text-secondary'}`}>
                  {localSaleLastQuotation.emailMessage}
                </div>
              )}
              {localSaleLastQuotation.whatsappMessage && (
                <div className={`mt-2 text-xs ${localSaleLastQuotation.whatsappPrepared ? 'text-success' : 'text-secondary'}`}>
                  {localSaleLastQuotation.whatsappMessage}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                  <div className="text-[10px] uppercase font-bold text-secondary">Cotización</div>
                  <div className="font-semibold mt-1 break-all">{localSaleLastQuotation.quoteId || 'No generada'}</div>
                </div>
                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                  <div className="text-[10px] uppercase font-bold text-secondary">Cliente</div>
                  <div className="font-semibold mt-1">{localSaleLastQuotation.customerName}</div>
                </div>
                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                  <div className="text-[10px] uppercase font-bold text-secondary">Total</div>
                  <div className="font-semibold mt-1">{formatMoney(localSaleLastQuotation.total)}</div>
                </div>
                <div className="rounded-lg border border-line bg-white/80 px-3 py-2">
                  <div className="text-[10px] uppercase font-bold text-secondary">Documento</div>
                  <div className="font-semibold mt-1">{localSaleLastQuotation.documentNumber || 'No indicado'}</div>
                </div>
              </div>

              {localSaleLastQuotation.printable && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button type="button" className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-white" onClick={handlePrintLastLocalQuotation}>
                    Imprimir / Guardar PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {localSaleQuoteHistory.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-line bg-white">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-secondary">Historial de cotizaciones</div>
                  <div className="text-xs text-secondary mt-1">Listado reciente cargado. Selecciona una cotización para reimprimirla o convertirla a venta.</div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {localSaleQuoteHistory.map((quotation: any) => {
                  const isSelected = quotation.id === localSaleSelectedQuotationId
                  const statusBadge = quotation.status === 'converted'
                    ? 'bg-success/15 text-success'
                    : 'bg-[#0ea5e9]/15 text-[#0369a1]'
                  const statusLabel = quotation.status === 'converted' ? 'Convertida' : 'Cotizada'
                  return (
                    <div
                      key={quotation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setLocalSaleSelectedQuotationId(quotation.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setLocalSaleSelectedQuotationId(quotation.id)
                        }
                      }}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition-all cursor-pointer h-full ${isSelected ? 'border-black bg-surface' : 'border-line hover:bg-surface/60'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold break-all">{quotation.id}</span>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge}`}>{statusLabel}</span>
                          </div>
                          <div className="text-sm mt-1">{quotation.customer_name}</div>
                          <div className="text-xs text-secondary mt-1">
                            {quotation.item_count || quotation.items?.length || 0} tipo{(quotation.item_count || quotation.items?.length || 0) === 1 ? '' : 's'} / {quotation.units || 0} uds
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold">{formatMoney(Number(quotation.quote_snapshot?.total || 0))}</div>
                          <div className="text-[11px] text-secondary mt-1">
                            {formatDateTimeEcuador(quotation.created_at, {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <span className="px-2 py-1 rounded-md bg-black text-white text-[10px] font-bold">Seleccionada</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handlePrintLastLocalQuotation()
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-line hover:bg-white"
                          >
                            Imprimir
                          </button>
                          {quotation.status !== 'converted' && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleConvertSelectedLocalQuotation()
                              }}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-black bg-black text-white hover:opacity-90"
                            >
                              Convertir a venta
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
