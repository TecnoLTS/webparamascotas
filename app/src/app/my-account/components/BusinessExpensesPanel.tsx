'use client'

import React from 'react'
import type { BusinessExpense, BusinessExpenseRecurrence, BusinessExpenseStatus, BusinessExpenseSummary } from '../types'

type ExpenseFilters = {
    status: string
    category: string
    from: string
    to: string
}

type ExpenseFormState = {
    mode: 'one_time' | 'recurring'
    category: string
    customCategory: string
    description: string
    subtotal: string
    total: string
    taxAmount: string
    lastMoneyInput: MoneyField | null
    expenseDate: string
    dueDate: string
    status: BusinessExpenseStatus
    frequency: 'monthly' | 'weekly'
    intervalCount: string
    startDate: string
    nextDueDate: string
    paymentMethod: string
    reference: string
    notes: string
}

type MoneyField = 'subtotal' | 'taxAmount' | 'total'

type BusinessExpensesPanelProps = {
    expenses: BusinessExpense[]
    recurrences: BusinessExpenseRecurrence[]
    summary: BusinessExpenseSummary | null
    categories: string[]
    filters: ExpenseFilters
    loading: boolean
    saving: boolean
    onFiltersChange: (filters: ExpenseFilters) => void
    onRefresh: () => void
    onCreateExpense: (payload: Record<string, unknown>) => Promise<void>
    onCreateRecurrence: (payload: Record<string, unknown>) => Promise<void>
    onUpdateStatus: (expenseId: string, status: BusinessExpenseStatus) => Promise<void>
    onToggleRecurrence: (recurrenceId: string, active: boolean) => Promise<void>
    formatMoney: (value: number | string | null | undefined) => string
    formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
    formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
}

const CUSTOM_CATEGORY_VALUE = '__custom__'

const today = () => new Date().toISOString().slice(0, 10)

const createExpenseForm = (): ExpenseFormState => ({
    mode: 'one_time',
    category: 'Otros',
    customCategory: '',
    description: '',
    subtotal: '',
    total: '',
    taxAmount: '0',
    lastMoneyInput: null,
    expenseDate: today(),
    dueDate: today(),
    status: 'pending',
    frequency: 'monthly',
    intervalCount: '1',
    startDate: today(),
    nextDueDate: today(),
    paymentMethod: '',
    reference: '',
    notes: '',
})

const parseAmount = (value: string) => {
    const parsed = Number(String(value || '').replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const hasAmountInput = (value: string) => String(value ?? '').trim() !== ''

const sanitizeMoneyInput = (value: string) => {
    const raw = String(value ?? '')
    return raw.trim().startsWith('-') ? '0' : raw
}

const formatInputAmount = (value: number) => {
    const rounded = Math.max(0, Math.round(value * 100) / 100)
    return rounded.toFixed(2)
}

const statusLabel: Record<BusinessExpenseStatus, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    overdue: 'Vencido',
    cancelled: 'Anulado',
}

const statusClass: Record<BusinessExpenseStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
}

function SummaryCell({ label, value, hint, tone = '' }: { label: string; value: string; hint: string; tone?: string }) {
    return (
        <div className="rounded-md border border-line bg-white px-2.5 py-2">
            <div className="text-[10px] uppercase font-bold text-secondary leading-tight">{label}</div>
            <div className={`text-base font-bold leading-tight ${tone}`}>{value}</div>
            <div className="text-[10px] text-secondary leading-tight">{hint}</div>
        </div>
    )
}

export default function BusinessExpensesPanel({
    expenses,
    recurrences,
    summary,
    categories,
    filters,
    loading,
    saving,
    onFiltersChange,
    onRefresh,
    onCreateExpense,
    onCreateRecurrence,
    onUpdateStatus,
    onToggleRecurrence,
    formatMoney,
    formatDate,
    formatDateTime,
}: BusinessExpensesPanelProps) {
    const [expenseForm, setExpenseForm] = React.useState<ExpenseFormState>(createExpenseForm)
    const categoryOptions = React.useMemo(() => {
        const values = [...categories, 'Otros'].map((category) => String(category || '').trim()).filter(Boolean)
        return Array.from(new Set(values))
    }, [categories])

    const paid = Number(summary?.paid ?? 0)
    const pending = Number(summary?.pending ?? 0)
    const overdue = Number(summary?.overdue ?? 0)
    const committed = pending + overdue
    const totalObligations = paid + committed
    const selectedCategory = expenseForm.category === CUSTOM_CATEGORY_VALUE
        ? expenseForm.customCategory.trim()
        : expenseForm.category

    const handleMoneyChange = React.useCallback((field: MoneyField, rawValue: string) => {
        const value = sanitizeMoneyInput(rawValue)
        setExpenseForm((previous) => {
            if (field === 'subtotal') {
                const subtotal = parseAmount(value)
                const taxAmount = parseAmount(previous.taxAmount)
                return {
                    ...previous,
                    subtotal: value,
                    total: formatInputAmount(subtotal + taxAmount),
                    lastMoneyInput: 'subtotal',
                }
            }

            if (field === 'taxAmount') {
                const taxAmount = parseAmount(value)
                const total = parseAmount(previous.total)
                const subtotal = parseAmount(previous.subtotal)

                if (previous.lastMoneyInput === 'total' && hasAmountInput(previous.total)) {
                    return {
                        ...previous,
                        taxAmount: value,
                        subtotal: formatInputAmount(Math.max(total - taxAmount, 0)),
                        lastMoneyInput: 'taxAmount',
                    }
                }

                return {
                    ...previous,
                    taxAmount: value,
                    total: formatInputAmount(subtotal + taxAmount),
                    lastMoneyInput: 'taxAmount',
                }
            }

            const total = parseAmount(value)
            const subtotal = parseAmount(previous.subtotal)
            const taxAmount = parseAmount(previous.taxAmount)

            if (previous.lastMoneyInput === 'subtotal' && hasAmountInput(previous.subtotal)) {
                return {
                    ...previous,
                    total: value,
                    taxAmount: formatInputAmount(Math.max(total - subtotal, 0)),
                    lastMoneyInput: 'total',
                }
            }

            if (hasAmountInput(previous.taxAmount) && taxAmount > 0) {
                const normalizedTax = Math.min(taxAmount, total)
                return {
                    ...previous,
                    total: value,
                    taxAmount: formatInputAmount(normalizedTax),
                    subtotal: formatInputAmount(Math.max(total - normalizedTax, 0)),
                    lastMoneyInput: 'total',
                }
            }

            if (hasAmountInput(previous.subtotal) && subtotal > 0) {
                return {
                    ...previous,
                    total: value,
                    taxAmount: formatInputAmount(Math.max(total - subtotal, 0)),
                    lastMoneyInput: 'total',
                }
            }

            return {
                ...previous,
                total: value,
                subtotal: formatInputAmount(total),
                taxAmount: '0.00',
                lastMoneyInput: 'total',
            }
        })
    }, [])

    const submitExpense = async (event: React.FormEvent) => {
        event.preventDefault()
        const category = selectedCategory || 'Otros'
        const subtotal = parseAmount(expenseForm.subtotal)
        const total = parseAmount(expenseForm.total)
        const taxAmount = parseAmount(expenseForm.taxAmount)
        const payload = {
            category,
            description: expenseForm.description,
            total,
            tax_amount: taxAmount,
            amount: subtotal,
            payment_method: expenseForm.paymentMethod,
            reference: expenseForm.reference,
            notes: expenseForm.notes,
        }

        if (expenseForm.mode === 'recurring') {
            await onCreateRecurrence({
                ...payload,
                frequency: expenseForm.frequency,
                interval_count: Math.max(1, Math.round(parseAmount(expenseForm.intervalCount))),
                start_date: expenseForm.startDate,
                next_due_date: expenseForm.nextDueDate,
            })
        } else {
            await onCreateExpense({
                ...payload,
                expense_date: expenseForm.expenseDate,
                due_date: expenseForm.dueDate || null,
                status: expenseForm.status,
            })
        }

        setExpenseForm(createExpenseForm())
    }

    return (
        <div className="tab text-content w-full space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="heading4">Gastos del negocio</div>
                    <p className="text-secondary text-sm mt-1">Registra gastos operativos fijos y recurrentes sin mezclarlos con la caja POS diaria.</p>
                </div>
                <button type="button" className="px-3 py-2 rounded-lg border border-line bg-white text-sm font-semibold hover:bg-surface disabled:opacity-60" onClick={onRefresh} disabled={loading}>
                    {loading ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                <SummaryCell label="Pagados" value={formatMoney(paid)} hint={`${summary?.paid_count ?? 0} gastos`} tone="text-success" />
                <SummaryCell label="Pendientes" value={formatMoney(pending)} hint={`${summary?.pending_count ?? 0} por pagar`} tone="text-amber-700" />
                <SummaryCell label="Vencidos" value={formatMoney(overdue)} hint={`${summary?.overdue_count ?? 0} atrasados`} tone="text-red" />
                <SummaryCell label="Comprometidos" value={formatMoney(committed)} hint="Pendiente + vencido" />
                <SummaryCell label="Obligaciones" value={formatMoney(totalObligations)} hint="Pagado + comprometido" />
            </div>

            <form className="rounded-lg border border-line bg-white p-3 space-y-3" onSubmit={submitExpense}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold">Registrar gasto</div>
                    <div className="text-xs text-secondary">Selecciona si se guarda una vez o como recurrencia automática.</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Tipo</span>
                        <select className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white" value={expenseForm.mode} onChange={(event) => setExpenseForm({ ...expenseForm, mode: event.target.value as 'one_time' | 'recurring' })}>
                            <option value="one_time">Puntual</option>
                            <option value="recurring">Recurrente</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Categoría</span>
                        <select className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}>
                            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                            <option value={CUSTOM_CATEGORY_VALUE}>Nueva categoría</option>
                        </select>
                    </label>
                    {expenseForm.category === CUSTOM_CATEGORY_VALUE && (
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Nueva categoría</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Ej: Limpieza" value={expenseForm.customCategory} onChange={(event) => setExpenseForm({ ...expenseForm, customCategory: event.target.value })} required />
                        </label>
                    )}
                    <label className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-secondary">Descripción</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Ej: Arriendo local mayo" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} required />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Subtotal</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="0,00" inputMode="decimal" value={expenseForm.subtotal} onChange={(event) => handleMoneyChange('subtotal', event.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">IVA</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="0,00" inputMode="decimal" value={expenseForm.taxAmount} onChange={(event) => handleMoneyChange('taxAmount', event.target.value)} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Total</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="0,00" inputMode="decimal" value={expenseForm.total} onChange={(event) => handleMoneyChange('total', event.target.value)} required />
                    </label>
                    <p className="sm:col-span-3 text-[11px] text-secondary">
                        Puedes escribir subtotal, IVA o total; el sistema completa el resto.
                    </p>
                </div>

                {expenseForm.mode === 'recurring' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Frecuencia</span>
                            <select className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white" value={expenseForm.frequency} onChange={(event) => setExpenseForm({ ...expenseForm, frequency: event.target.value as 'monthly' | 'weekly' })}>
                                <option value="monthly">Mensual</option>
                                <option value="weekly">Semanal</option>
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Cada</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" inputMode="numeric" value={expenseForm.intervalCount} onChange={(event) => setExpenseForm({ ...expenseForm, intervalCount: event.target.value })} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Inicio</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" type="date" value={expenseForm.startDate} onChange={(event) => setExpenseForm({ ...expenseForm, startDate: event.target.value })} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Próximo vencimiento</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" type="date" value={expenseForm.nextDueDate} onChange={(event) => setExpenseForm({ ...expenseForm, nextDueDate: event.target.value })} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Método habitual</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Efectivo, transferencia..." value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm({ ...expenseForm, paymentMethod: event.target.value })} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Referencia</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Opcional" value={expenseForm.reference} onChange={(event) => setExpenseForm({ ...expenseForm, reference: event.target.value })} />
                        </label>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Fecha</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Vence</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" type="date" value={expenseForm.dueDate} onChange={(event) => setExpenseForm({ ...expenseForm, dueDate: event.target.value })} />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Estado</span>
                            <select className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white" value={expenseForm.status} onChange={(event) => setExpenseForm({ ...expenseForm, status: event.target.value as BusinessExpenseStatus })}>
                                <option value="pending">Pendiente</option>
                                <option value="paid">Pagado</option>
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-secondary">Método</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Efectivo, transferencia..." value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm({ ...expenseForm, paymentMethod: event.target.value })} />
                        </label>
                        <label className="space-y-1 sm:col-span-2">
                            <span className="text-[10px] uppercase font-bold text-secondary">Referencia</span>
                            <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Factura, recibo, comprobante..." value={expenseForm.reference} onChange={(event) => setExpenseForm({ ...expenseForm, reference: event.target.value })} />
                        </label>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px] gap-2">
                    <textarea className="border border-line rounded-lg px-3 py-2 w-full text-sm min-h-[58px]" placeholder="Notas" value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} />
                    <button type="submit" className="button-main w-full py-2 rounded-lg text-sm font-bold disabled:opacity-60" disabled={saving}>
                        {saving ? 'Guardando...' : expenseForm.mode === 'recurring' ? 'Crear recurrencia' : 'Registrar gasto'}
                    </button>
                </div>
            </form>

            <section className="rounded-lg border border-line bg-white">
                <div className="px-3 py-2 border-b border-line flex flex-wrap items-center gap-2">
                    <select className="border border-line rounded-lg px-3 py-2 text-sm bg-white" value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}>
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="overdue">Vencido</option>
                        <option value="cancelled">Anulado</option>
                    </select>
                    <select className="border border-line rounded-lg px-3 py-2 text-sm bg-white" value={filters.category} onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}>
                        <option value="all">Todas las categorías</option>
                        {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <input className="border border-line rounded-lg px-3 py-2 text-sm" type="date" value={filters.from} onChange={(event) => onFiltersChange({ ...filters, from: event.target.value })} />
                    <input className="border border-line rounded-lg px-3 py-2 text-sm" type="date" value={filters.to} onChange={(event) => onFiltersChange({ ...filters, to: event.target.value })} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-sm">
                        <thead className="bg-surface text-[11px] uppercase text-secondary">
                            <tr>
                                <th className="px-3 py-2 text-left">Gasto</th>
                                <th className="px-3 py-2 text-left">Fecha</th>
                                <th className="px-3 py-2 text-right">Base</th>
                                <th className="px-3 py-2 text-right">IVA</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-3 py-2 text-left">Estado</th>
                                <th className="px-3 py-2 text-left">Pago</th>
                                <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-surface/50">
                                    <td className="px-3 py-2">
                                        <div className="font-semibold">{expense.description || 'Gasto operativo'}</div>
                                        <div className="text-[11px] text-secondary">{expense.category} · {expense.type === 'recurring_instance' ? 'Recurrente' : 'Fijo / puntual'}</div>
                                        {expense.notes && <div className="text-[11px] text-secondary truncate max-w-[320px]">{expense.notes}</div>}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div>{expense.expense_date ? formatDate(expense.expense_date) : '-'}</div>
                                        <div className="text-[11px] text-secondary">Vence: {expense.due_date ? formatDate(expense.due_date) : '-'}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right">{formatMoney(expense.amount)}</td>
                                    <td className="px-3 py-2 text-right">{formatMoney(expense.tax_amount)}</td>
                                    <td className="px-3 py-2 text-right font-bold">{formatMoney(expense.total)}</td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[expense.status] || statusClass.pending}`}>
                                            {statusLabel[expense.status] || expense.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-secondary">{expense.payment_method || 'Sin método'}</div>
                                        <div className="text-[11px] text-secondary">{expense.paid_at ? formatDateTime(expense.paid_at) : (expense.reference || 'Sin referencia')}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {expense.status !== 'paid' && (
                                                <button type="button" className="px-2 py-1 rounded-md border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={saving} onClick={() => onUpdateStatus(expense.id, 'paid')}>
                                                    Pagar
                                                </button>
                                            )}
                                            {expense.status !== 'pending' && expense.status !== 'paid' && (
                                                <button type="button" className="px-2 py-1 rounded-md border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={saving} onClick={() => onUpdateStatus(expense.id, 'pending')}>
                                                    Pendiente
                                                </button>
                                            )}
                                            {expense.status !== 'cancelled' && (
                                                <button type="button" className="px-2 py-1 rounded-md border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={saving} onClick={() => onUpdateStatus(expense.id, 'cancelled')}>
                                                    Anular
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && expenses.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-secondary">No hay gastos registrados con estos filtros.</td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-secondary">Cargando gastos...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold">Recurrencias activas</div>
                    <div className="text-xs text-secondary">{recurrences.length} configuradas</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {recurrences.slice(0, 9).map((item) => (
                        <div key={item.id} className="rounded-md border border-line px-2.5 py-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm truncate">{item.description}</div>
                                    <div className="text-[11px] text-secondary">{item.category} · {item.frequency === 'monthly' ? 'Mensual' : 'Semanal'} · vence {formatDate(item.next_due_date)}</div>
                                </div>
                                <button type="button" className="text-xs font-semibold text-primary hover:underline disabled:opacity-50" disabled={saving} onClick={() => onToggleRecurrence(item.id, !item.active)}>
                                    {item.active ? 'Pausar' : 'Activar'}
                                </button>
                            </div>
                            <div className="text-sm font-bold mt-1">{formatMoney(item.total)}</div>
                        </div>
                    ))}
                    {recurrences.length === 0 && <div className="text-sm text-secondary">Sin gastos recurrentes.</div>}
                </div>
            </section>
        </div>
    )
}
