'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import type { AdminDiscountAuditRow, AdminDiscountCode, AdminDiscountType } from '@/lib/api/discounts'

type DiscountFormState = {
    code: string
    name: string
    description: string
    type: AdminDiscountType
    value: string
    minSubtotal: string
    maxDiscount: string
    maxUses: string
    startsAt: string
    endsAt: string
    isActive: boolean
}

type DiscountCodesPanelProps = {
    discountCodes: AdminDiscountCode[]
    discountAuditRows: AdminDiscountAuditRow[]
    discountCodesLoading: boolean
    discountFormSaving: boolean
    editingDiscountId: string | null
    discountForm: DiscountFormState
    onDiscountFormChange: <K extends keyof DiscountFormState>(field: K, value: DiscountFormState[K]) => void
    onDiscountFormSubmit: () => void
    onDiscountFormReset: () => void
    onDiscountEdit: (discount: AdminDiscountCode) => void
    onDiscountToggleStatus: (discount: AdminDiscountCode) => void
    onDiscountRefresh: () => void
}

const formatMoney = (value: number | null | undefined) =>
    `$${Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Sin fecha'
    const parsed = new Date(String(value).replace(' ', 'T'))
    if (Number.isNaN(parsed.getTime())) return String(value)
    return parsed.toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const summarizeUsage = (discountCodes: AdminDiscountCode[]) => {
    const total = discountCodes.length
    const active = discountCodes.filter((item) => item.is_active).length
    const exhausted = discountCodes.filter((item) => {
        const maxUses = item.max_uses ?? null
        return typeof maxUses === 'number' && maxUses > 0 && (item.used_count || 0) >= maxUses
    }).length
    return { total, active, exhausted }
}

export default function DiscountCodesPanel({
    discountCodes,
    discountAuditRows,
    discountCodesLoading,
    discountFormSaving,
    editingDiscountId,
    discountForm,
    onDiscountFormChange,
    onDiscountFormSubmit,
    onDiscountFormReset,
    onDiscountEdit,
    onDiscountToggleStatus,
    onDiscountRefresh,
}: DiscountCodesPanelProps) {
    const usage = React.useMemo(() => summarizeUsage(discountCodes), [discountCodes])

    return (
        <div className="tab text-content w-full">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between pb-5">
                <div>
                    <div className="heading5">Cupones y descuentos</div>
                    <p className="text-secondary mt-2">
                        Configura descuentos reales del checkout, controla su vigencia y revisa su uso reciente.
                    </p>
                </div>
                <button
                    type="button"
                    className="button-outline py-2 px-5 whitespace-nowrap"
                    onClick={onDiscountRefresh}
                    disabled={discountCodesLoading || discountFormSaving}
                >
                    {discountCodesLoading ? 'Actualizando...' : 'Recargar cupones'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl border border-line bg-white px-5 py-4">
                    <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Total de cupones</div>
                    <div className="heading5 mt-1">{usage.total}</div>
                </div>
                <div className="rounded-xl border border-line bg-white px-5 py-4">
                    <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Activos</div>
                    <div className="heading5 mt-1 text-success">{usage.active}</div>
                </div>
                <div className="rounded-xl border border-line bg-white px-5 py-4">
                    <div className="text-[11px] uppercase font-bold tracking-wide text-secondary">Agotados</div>
                    <div className="heading5 mt-1 text-orange-500">{usage.exhausted}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)] gap-6">
                <div className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div>
                            <div className="text-xs uppercase font-bold tracking-wide text-secondary">
                                {editingDiscountId ? 'Editar cupón' : 'Nuevo cupón'}
                            </div>
                            <div className="heading6 mt-1">
                                {editingDiscountId ? 'Actualiza condiciones, vigencia y estado.' : 'Crea un descuento listo para checkout y venta en local.'}
                            </div>
                        </div>
                        {editingDiscountId && (
                            <button
                                type="button"
                                className="text-sm underline text-secondary"
                                onClick={onDiscountFormReset}
                                disabled={discountFormSaving}
                            >
                                Nuevo cupón
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Código</label>
                            <input
                                type="text"
                                className="border border-line px-4 py-2 rounded-lg w-full uppercase"
                                value={discountForm.code}
                                onChange={(e) => onDiscountFormChange('code', e.target.value.toUpperCase())}
                                placeholder="Ej: BIENVENIDA10"
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Estado</label>
                            <select
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.isActive ? 'active' : 'inactive'}
                                onChange={(e) => onDiscountFormChange('isActive', e.target.value === 'active')}
                                disabled={discountFormSaving}
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Nombre interno</label>
                            <input
                                type="text"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.name}
                                onChange={(e) => onDiscountFormChange('name', e.target.value)}
                                placeholder="Campaña o referencia"
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Tipo</label>
                            <select
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.type}
                                onChange={(e) => onDiscountFormChange('type', e.target.value as AdminDiscountType)}
                                disabled={discountFormSaving}
                            >
                                <option value="percent">Porcentaje</option>
                                <option value="fixed">Monto fijo</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">
                                {discountForm.type === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.value}
                                onChange={(e) => onDiscountFormChange('value', e.target.value)}
                                placeholder={discountForm.type === 'percent' ? '10' : '5.00'}
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Compra mínima ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.minSubtotal}
                                onChange={(e) => onDiscountFormChange('minSubtotal', e.target.value)}
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Máximo descuento ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.maxDiscount}
                                onChange={(e) => onDiscountFormChange('maxDiscount', e.target.value)}
                                placeholder="Opcional"
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Límite de usos</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.maxUses}
                                onChange={(e) => onDiscountFormChange('maxUses', e.target.value)}
                                placeholder="Opcional"
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Inicio</label>
                            <input
                                type="datetime-local"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.startsAt}
                                onChange={(e) => onDiscountFormChange('startsAt', e.target.value)}
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Fin</label>
                            <input
                                type="datetime-local"
                                className="border border-line px-4 py-2 rounded-lg w-full"
                                value={discountForm.endsAt}
                                onChange={(e) => onDiscountFormChange('endsAt', e.target.value)}
                                disabled={discountFormSaving}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-secondary text-xs uppercase font-bold mb-2 block">Descripción</label>
                            <textarea
                                className="border border-line px-4 py-3 rounded-lg w-full min-h-[96px]"
                                value={discountForm.description}
                                onChange={(e) => onDiscountFormChange('description', e.target.value)}
                                placeholder="Describe cuándo debe usarse este cupón."
                                disabled={discountFormSaving}
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                        <button
                            type="button"
                            className="button-outline py-2 px-5"
                            onClick={onDiscountFormReset}
                            disabled={discountFormSaving}
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            className="button-main py-2 px-6"
                            onClick={onDiscountFormSubmit}
                            disabled={discountFormSaving}
                        >
                            {discountFormSaving ? 'Guardando...' : editingDiscountId ? 'Guardar cambios' : 'Crear cupón'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-line bg-white p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <div className="text-xs uppercase font-bold tracking-wide text-secondary">Cupones creados</div>
                                <div className="text-secondary text-sm mt-1">Actívalos, revísalos o ajusta condiciones sin salir del panel.</div>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface border border-line">
                                {discountCodes.length} registros
                            </span>
                        </div>
                        <div className="space-y-3">
                            {discountCodesLoading ? (
                                <div className="text-sm text-secondary py-10 text-center">Cargando cupones...</div>
                            ) : discountCodes.length === 0 ? (
                                <div className="text-sm text-secondary py-10 text-center">No hay cupones configurados todavía.</div>
                            ) : discountCodes.map((discount) => {
                                const isExhausted = typeof discount.max_uses === 'number' && discount.max_uses > 0 && (discount.used_count || 0) >= discount.max_uses
                                return (
                                    <div key={discount.id} className="rounded-xl border border-line p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="heading6 break-all">{discount.code}</div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${discount.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-secondary'}`}>
                                                        {discount.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    {isExhausted && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                            Agotado
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-secondary mt-1">
                                                    {discount.name || 'Sin nombre interno'}
                                                </div>
                                                {discount.description && (
                                                    <div className="text-sm mt-2 text-secondary">{discount.description}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    className="button-outline py-2 px-4"
                                                    onClick={() => onDiscountEdit(discount)}
                                                    disabled={discountFormSaving}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`py-2 px-4 rounded-lg border ${discount.is_active ? 'border-red text-red hover:bg-red/5' : 'border-green-600 text-green-700 hover:bg-green-50'}`}
                                                    onClick={() => onDiscountToggleStatus(discount)}
                                                    disabled={discountFormSaving}
                                                >
                                                    {discount.is_active ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                                            <div className="rounded-lg bg-surface border border-line px-3 py-2">
                                                <div className="text-[10px] uppercase font-bold tracking-wide text-secondary">Beneficio</div>
                                                <div className="font-semibold mt-1">
                                                    {discount.type === 'percent' ? `${discount.value}%` : formatMoney(discount.value)}
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-surface border border-line px-3 py-2">
                                                <div className="text-[10px] uppercase font-bold tracking-wide text-secondary">Mínimo</div>
                                                <div className="font-semibold mt-1">{formatMoney(discount.min_subtotal)}</div>
                                            </div>
                                            <div className="rounded-lg bg-surface border border-line px-3 py-2">
                                                <div className="text-[10px] uppercase font-bold tracking-wide text-secondary">Uso</div>
                                                <div className="font-semibold mt-1">
                                                    {discount.used_count || 0}{typeof discount.max_uses === 'number' ? ` / ${discount.max_uses}` : ''}
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-surface border border-line px-3 py-2">
                                                <div className="text-[10px] uppercase font-bold tracking-wide text-secondary">Vigencia</div>
                                                <div className="font-semibold mt-1">
                                                    {discount.ends_at ? formatDateTime(discount.ends_at) : 'Sin cierre'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-white p-5">
                        <div className="flex items-start gap-2 mb-4">
                            <Icon.ClockCounterClockwise size={18} className="mt-0.5" />
                            <div>
                                <div className="text-xs uppercase font-bold tracking-wide text-secondary">Auditoría reciente</div>
                                <div className="mt-1 text-xs text-secondary">Movimientos más recientes cargados; el uso de cada cupón es acumulado.</div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {discountAuditRows.length === 0 ? (
                                <div className="text-sm text-secondary">Aún no hay movimientos registrados para cupones.</div>
                            ) : discountAuditRows.map((row) => (
                                <div key={row.id} className="rounded-xl border border-line px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-semibold">
                                            {row.code || 'Sin código'} · {row.action}
                                        </div>
                                        <div className="text-xs text-secondary">{formatDateTime(row.created_at)}</div>
                                    </div>
                                    <div className="text-sm text-secondary mt-1">
                                        {row.reason || 'Sin observación adicional'}
                                    </div>
                                    {(row.order_id || row.amount) && (
                                        <div className="text-xs text-secondary mt-2">
                                            {row.order_id ? `Pedido: ${row.order_id}` : 'Pedido no asociado'}
                                            {typeof row.amount === 'number' ? ` · Monto: ${formatMoney(row.amount)}` : ''}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
