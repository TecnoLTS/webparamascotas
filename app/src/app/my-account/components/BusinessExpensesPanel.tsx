'use client'

import React from 'react'
import type { BusinessExpense, BusinessExpenseRecurrence, BusinessExpenseStatus, BusinessExpenseSummary, FinancialAdjustment, FinancialPeriod, FinancialPeriodPreview } from '../types'

type ExpenseFilters = {
    status: string
    category: string
    period: string
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

export type HistoricalSaleProductOption = {
    id: string
    name: string
    sku?: string
    stock: number
    price: number
    cost: number
    taxRate: number
}

type HistoricalSaleLine = {
    id: string
    productId: string
    quantity: string
    unitPrice: string
    unitCost: string
}

type HistoricalSaleFormState = {
    saleDate: string
    paymentMethod: string
    reference: string
    notes: string
    customerName: string
    affectInventory: boolean
    lines: HistoricalSaleLine[]
}

type ExpenseAdjustmentDraft = {
    expense: BusinessExpense
    reason: string
    confirmed: boolean
}

type BusinessExpensesPanelProps = {
    expenses: BusinessExpense[]
    recurrences: BusinessExpenseRecurrence[]
    summary: BusinessExpenseSummary | null
    financialPeriods: FinancialPeriod[]
    financialAdjustments: FinancialAdjustment[]
    currentFinancialPeriod: FinancialPeriod | null
    historicalSaleProducts: HistoricalSaleProductOption[]
    categories: string[]
    filters: ExpenseFilters
    loading: boolean
    saving: boolean
    onFiltersChange: (filters: ExpenseFilters) => void
    onRefresh: () => void
    onCreateExpense: (payload: Record<string, unknown>) => Promise<void>
    onCreateRecurrence: (payload: Record<string, unknown>) => Promise<void>
    onUpdateRecurrence: (recurrenceId: string, payload: Record<string, unknown>) => Promise<void>
    onDeleteRecurrence: (recurrenceId: string) => Promise<void>
    onUpdateStatus: (expenseId: string, status: BusinessExpenseStatus) => Promise<void>
    onToggleRecurrence: (recurrenceId: string, active: boolean) => Promise<void>
    onPreviewFinancialPeriod: (periodKey: string) => Promise<FinancialPeriodPreview>
    onCloseFinancialPeriod: (periodKey: string, notes: string) => Promise<void>
    onCreateFinancialAdjustment: (payload: Record<string, unknown>) => Promise<void>
    onCreateHistoricalSale: (payload: Record<string, unknown>) => Promise<void>
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

const createHistoricalSaleLine = (): HistoricalSaleLine => ({
    id: Math.random().toString(36).slice(2),
    productId: '',
    quantity: '1',
    unitPrice: '',
    unitCost: '',
})

const createHistoricalSaleForm = (): HistoricalSaleFormState => ({
    saleDate: today(),
    paymentMethod: 'cash',
    reference: '',
    notes: '',
    customerName: '',
    affectInventory: false,
    lines: [createHistoricalSaleLine()],
})

const parseAmount = (value: string) => {
    const raw = String(value || '').trim()
    const cleaned = raw.replace(/%/g, '')
    const hasComma = cleaned.includes(',')
    const hasDot = cleaned.includes('.')
    let normalized = cleaned
    if (hasComma && hasDot) {
        normalized = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
            ? cleaned.replace(/\./g, '').replace(',', '.')
            : cleaned.replace(/,/g, '')
    } else if (hasComma) {
        normalized = cleaned.replace(',', '.')
    } else if (hasDot) {
        const dotParts = cleaned.split('.')
        const decimalCandidate = dotParts.length === 2 ? dotParts[1] : ''
        normalized = decimalCandidate.length === 3 ? cleaned.replace(/\./g, '') : cleaned
    }
    const parsed = Number(normalized)
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

const toMoneyNumber = (value: number) => parseAmount(formatInputAmount(value))

const TAX_RATE_AMOUNT_RATIO_THRESHOLD = 0.2

const isLikelyTaxRateInput = (taxInput: string, baseAmount: number) => {
    const taxValue = parseAmount(taxInput)
    return hasAmountInput(taxInput)
        && taxValue > 0
        && taxValue <= 100
        && baseAmount > 0
        && taxValue > baseAmount * TAX_RATE_AMOUNT_RATIO_THRESHOLD
}

const calculateFromSubtotalAndTaxInput = (subtotal: number, taxInput: string) => {
    const taxValue = parseAmount(taxInput)
    const taxAmount = isLikelyTaxRateInput(taxInput, subtotal)
        ? subtotal * (taxValue / 100)
        : taxValue

    return {
        subtotal: toMoneyNumber(subtotal),
        taxAmount: toMoneyNumber(taxAmount),
        total: toMoneyNumber(subtotal + taxAmount),
    }
}

const calculateFromTotalAndTaxInput = (total: number, taxInput: string) => {
    const taxValue = parseAmount(taxInput)

    if (isLikelyTaxRateInput(taxInput, total)) {
        const subtotal = total / (1 + taxValue / 100)
        return {
            subtotal: toMoneyNumber(subtotal),
            taxAmount: toMoneyNumber(Math.max(total - subtotal, 0)),
            total: toMoneyNumber(total),
        }
    }

    const taxAmount = Math.min(taxValue, total)
    return {
        subtotal: toMoneyNumber(Math.max(total - taxAmount, 0)),
        taxAmount: toMoneyNumber(taxAmount),
        total: toMoneyNumber(total),
    }
}

const resolveExpenseMoney = (form: ExpenseFormState) => {
    const subtotal = parseAmount(form.subtotal)
    const total = parseAmount(form.total)
    const hasSubtotal = hasAmountInput(form.subtotal)
    const hasTax = hasAmountInput(form.taxAmount)
    const hasTotal = hasAmountInput(form.total)

    if (hasTotal && hasTax) {
        return calculateFromTotalAndTaxInput(total, form.taxAmount)
    }

    if (hasSubtotal && hasTax) {
        return calculateFromSubtotalAndTaxInput(subtotal, form.taxAmount)
    }

    if (hasTotal && hasSubtotal) {
        const cappedSubtotal = Math.min(subtotal, total)
        return {
            subtotal: toMoneyNumber(cappedSubtotal),
            taxAmount: toMoneyNumber(Math.max(total - cappedSubtotal, 0)),
            total: toMoneyNumber(total),
        }
    }

    if (hasTotal) {
        return {
            subtotal: toMoneyNumber(total),
            taxAmount: 0,
            total: toMoneyNumber(total),
        }
    }

    return {
        subtotal: toMoneyNumber(subtotal),
        taxAmount: 0,
        total: toMoneyNumber(subtotal),
    }
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
    financialPeriods,
    financialAdjustments,
    currentFinancialPeriod,
    historicalSaleProducts,
    categories,
    filters,
    loading,
    saving,
    onFiltersChange,
    onRefresh,
    onCreateExpense,
    onCreateRecurrence,
    onUpdateRecurrence,
    onDeleteRecurrence,
    onUpdateStatus,
    onToggleRecurrence,
    onPreviewFinancialPeriod,
    onCloseFinancialPeriod,
    onCreateFinancialAdjustment,
    onCreateHistoricalSale,
    formatMoney,
    formatDate,
    formatDateTime,
}: BusinessExpensesPanelProps) {
    const [expenseForm, setExpenseForm] = React.useState<ExpenseFormState>(createExpenseForm)
    const [historicalSaleForm, setHistoricalSaleForm] = React.useState<HistoricalSaleFormState>(createHistoricalSaleForm)
    const [showAllPeriods, setShowAllPeriods] = React.useState(false)
    const [periodPreview, setPeriodPreview] = React.useState<FinancialPeriodPreview | null>(null)
    const [periodPreviewNotes, setPeriodPreviewNotes] = React.useState('')
    const [periodPreviewLoading, setPeriodPreviewLoading] = React.useState(false)
    const [expenseAdjustmentDraft, setExpenseAdjustmentDraft] = React.useState<ExpenseAdjustmentDraft | null>(null)
    const [historicalSaleError, setHistoricalSaleError] = React.useState('')
    const [editingRecurrenceId, setEditingRecurrenceId] = React.useState<string | null>(null)
    const categoryOptions = React.useMemo(() => {
        const values = [...categories, 'Otros'].map((category) => String(category || '').trim()).filter(Boolean)
        return Array.from(new Set(values))
    }, [categories])

    const paid = Number(summary?.paid ?? 0)
    const pending = Number(summary?.pending ?? 0)
    const overdue = Number(summary?.overdue ?? 0)
    const committed = pending + overdue
    const totalObligations = paid + committed
    const currentPeriodLabel = currentFinancialPeriod?.period_key || today().slice(0, 7)
    const openPastPeriods = financialPeriods.filter((period) => period.status !== 'closed' && period.end_date < today())
    const closedPeriods = financialPeriods.filter((period) => period.status === 'closed')
    const visiblePeriods = showAllPeriods ? financialPeriods : financialPeriods.slice(0, 6)
    const selectedCategory = expenseForm.category === CUSTOM_CATEGORY_VALUE
        ? expenseForm.customCategory.trim()
        : expenseForm.category
    const productsById = React.useMemo(() => {
        const map = new Map<string, HistoricalSaleProductOption>()
        historicalSaleProducts.forEach((product) => map.set(product.id, product))
        return map
    }, [historicalSaleProducts])
    const historicalSaleTotals = React.useMemo(() => {
        return historicalSaleForm.lines.reduce((acc, line) => {
            const quantity = Math.max(0, Math.round(parseAmount(line.quantity)))
            const price = parseAmount(line.unitPrice)
            const cost = parseAmount(line.unitCost)
            const product = productsById.get(line.productId)
            const taxRate = Number(product?.taxRate ?? 0)
            const gross = quantity * price
            const net = taxRate > 0 ? gross / (1 + taxRate / 100) : gross
            acc.gross += gross
            acc.net += net
            acc.tax += Math.max(gross - net, 0)
            acc.cost += quantity * cost
            acc.units += quantity
            return acc
        }, { gross: 0, net: 0, tax: 0, cost: 0, units: 0 })
    }, [historicalSaleForm.lines, productsById])

    const handleMoneyChange = React.useCallback((field: MoneyField, rawValue: string) => {
        const value = sanitizeMoneyInput(rawValue)
        setExpenseForm((previous) => {
            if (field === 'subtotal') {
                const subtotal = parseAmount(value)
                const amounts = calculateFromSubtotalAndTaxInput(subtotal, previous.taxAmount)
                return {
                    ...previous,
                    subtotal: value,
                    total: formatInputAmount(amounts.total),
                    lastMoneyInput: 'subtotal',
                }
            }

            if (field === 'taxAmount') {
                const total = parseAmount(previous.total)
                const subtotal = parseAmount(previous.subtotal)

                if (hasAmountInput(previous.total)) {
                    const amounts = calculateFromTotalAndTaxInput(total, value)
                    return {
                        ...previous,
                        taxAmount: value,
                        subtotal: formatInputAmount(amounts.subtotal),
                        lastMoneyInput: 'taxAmount',
                    }
                }

                const amounts = calculateFromSubtotalAndTaxInput(subtotal, value)
                return {
                    ...previous,
                    taxAmount: value,
                    total: formatInputAmount(amounts.total),
                    lastMoneyInput: 'taxAmount',
                }
            }

            const total = parseAmount(value)
            const amounts = calculateFromTotalAndTaxInput(total, previous.taxAmount)
            return {
                ...previous,
                total: value,
                subtotal: formatInputAmount(amounts.subtotal),
                taxAmount: hasAmountInput(previous.taxAmount) ? previous.taxAmount : '0.00',
                lastMoneyInput: 'total',
            }
        })
    }, [])

    const resetExpenseForm = React.useCallback(() => {
        setExpenseForm(createExpenseForm())
        setEditingRecurrenceId(null)
    }, [])

    const startEditingRecurrence = React.useCallback((item: BusinessExpenseRecurrence) => {
        const knownCategory = categoryOptions.includes(item.category)
        setExpenseForm({
            mode: 'recurring',
            category: knownCategory ? item.category : CUSTOM_CATEGORY_VALUE,
            customCategory: knownCategory ? '' : item.category,
            description: item.description || '',
            subtotal: formatInputAmount(Number(item.amount || 0)),
            total: formatInputAmount(Number(item.total || 0)),
            taxAmount: formatInputAmount(Number(item.tax_amount || 0)),
            lastMoneyInput: 'total',
            expenseDate: today(),
            dueDate: today(),
            status: 'pending',
            frequency: item.frequency,
            intervalCount: String(Math.max(1, Number(item.interval_count || 1))),
            startDate: item.start_date || today(),
            nextDueDate: item.next_due_date || today(),
            paymentMethod: item.payment_method || '',
            reference: item.reference || '',
            notes: item.notes || '',
        })
        setEditingRecurrenceId(item.id)
    }, [categoryOptions])

    const deleteRecurrence = React.useCallback(async (item: BusinessExpenseRecurrence) => {
        const confirmed = window.confirm(`¿Eliminar la recurrencia "${item.description || item.category}"? Los gastos ya registrados se conservan en el historial.`)
        if (!confirmed) return
        await onDeleteRecurrence(item.id)
        if (editingRecurrenceId === item.id) {
            resetExpenseForm()
        }
    }, [editingRecurrenceId, onDeleteRecurrence, resetExpenseForm])

    const submitExpense = async (event: React.FormEvent) => {
        event.preventDefault()
        const category = selectedCategory || 'Otros'
        const amounts = resolveExpenseMoney(expenseForm)
        const payload = {
            category,
            description: expenseForm.description,
            total: amounts.total,
            tax_amount: amounts.taxAmount,
            amount: amounts.subtotal,
            payment_method: expenseForm.paymentMethod,
            reference: expenseForm.reference,
            notes: expenseForm.notes,
        }

        if (expenseForm.mode === 'recurring') {
            const recurrencePayload = {
                ...payload,
                frequency: expenseForm.frequency,
                interval_count: Math.max(1, Math.round(parseAmount(expenseForm.intervalCount))),
                start_date: expenseForm.startDate,
                next_due_date: expenseForm.nextDueDate,
            }
            if (editingRecurrenceId) {
                await onUpdateRecurrence(editingRecurrenceId, recurrencePayload)
            } else {
                await onCreateRecurrence(recurrencePayload)
            }
        } else {
            await onCreateExpense({
                ...payload,
                expense_date: expenseForm.expenseDate,
                due_date: expenseForm.dueDate || null,
                status: expenseForm.status,
            })
        }

        resetExpenseForm()
    }

    const updateHistoricalLine = (lineId: string, patch: Partial<HistoricalSaleLine>) => {
        setHistoricalSaleForm((previous) => ({
            ...previous,
            lines: previous.lines.map((line) => line.id === lineId ? { ...line, ...patch } : line),
        }))
    }

    const selectHistoricalProduct = (lineId: string, productId: string) => {
        const product = productsById.get(productId)
        updateHistoricalLine(lineId, {
            productId,
            unitPrice: product ? formatInputAmount(product.price) : '',
            unitCost: product ? formatInputAmount(product.cost) : '',
        })
    }

    const submitHistoricalSale = async (event: React.FormEvent) => {
        event.preventDefault()
        setHistoricalSaleError('')
        const items = historicalSaleForm.lines
            .map((line) => ({
                product_id: line.productId,
                quantity: Math.max(1, Math.round(parseAmount(line.quantity))),
                unit_price_gross: parseAmount(line.unitPrice),
                unit_cost: parseAmount(line.unitCost),
                tax_rate: productsById.get(line.productId)?.taxRate ?? undefined,
            }))
            .filter((item) => item.product_id && item.quantity > 0 && item.unit_price_gross >= 0)

        if (items.length === 0) {
            setHistoricalSaleError('Agrega al menos un producto válido para la venta histórica.')
            return
        }

        await onCreateHistoricalSale({
            sale_date: historicalSaleForm.saleDate,
            payment_method: historicalSaleForm.paymentMethod,
            reference: historicalSaleForm.reference,
            order_notes: historicalSaleForm.notes,
            customer_name: historicalSaleForm.customerName,
            affect_inventory: historicalSaleForm.affectInventory,
            items,
        })
        setHistoricalSaleForm(createHistoricalSaleForm())
    }

    const previewPeriod = async (period: FinancialPeriod) => {
        setPeriodPreviewLoading(true)
        try {
            const preview = await onPreviewFinancialPeriod(period.period_key)
            setPeriodPreview(preview)
            setPeriodPreviewNotes(period.notes || '')
        } finally {
            setPeriodPreviewLoading(false)
        }
    }

    const closePreviewedPeriod = async () => {
        if (!periodPreview?.period?.period_key) return
        await onCloseFinancialPeriod(periodPreview.period.period_key, periodPreviewNotes)
        setPeriodPreview(null)
        setPeriodPreviewNotes('')
    }

    const createAdjustmentForExpense = async (expense: BusinessExpense) => {
        setExpenseAdjustmentDraft({
            expense,
            reason: `Corrección del gasto ${expense.description || expense.category}`,
            confirmed: false,
        })
    }

    const confirmExpenseAdjustment = async () => {
        if (!expenseAdjustmentDraft) return
        const { expense, reason, confirmed } = expenseAdjustmentDraft
        if (!confirmed || reason.trim().length < 6) return
        const originalPeriod = expense.financial_period_key || String(expense.expense_date || '').slice(0, 7)
        await onCreateFinancialAdjustment({
            type: 'expense_reversal',
            target_type: 'business_expense',
            target_id: expense.id,
            original_period_key: originalPeriod,
            description: `Reverso gasto ${expense.description || expense.category}`,
            amount: -Math.abs(Number(expense.amount || 0)),
            tax_amount: -Math.abs(Number(expense.tax_amount || 0)),
            total: -Math.abs(Number(expense.total || 0)),
            reason: reason.trim(),
        })
        setExpenseAdjustmentDraft(null)
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
                <SummaryCell label="Por pagar" value={formatMoney(committed)} hint="Pendiente + vencido" />
                <SummaryCell label="Gasto registrado" value={formatMoney(totalObligations)} hint="Pagado + por pagar" />
            </div>

            <section className="rounded-lg border border-line bg-white p-3 space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-sm font-semibold">Cierre financiero mensual</div>
                        <div className="text-xs text-secondary">Mes actual: {currentPeriodLabel} · {currentFinancialPeriod?.status === 'closed' ? 'cerrado' : 'abierto'}</div>
                    </div>
                    <div className="text-xs text-secondary">Pendientes de cierre: <span className="font-bold text-black">{openPastPeriods.length}</span> · Cerrados visibles: {closedPeriods.length}</div>
                </div>
                <div className="overflow-x-auto rounded-md border border-line">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-surface text-[10px] uppercase text-secondary">
                            <tr>
                                <th className="px-2 py-1.5 text-left">Mes</th>
                                <th className="px-2 py-1.5 text-left">Rango</th>
                                <th className="px-2 py-1.5 text-left">Estado</th>
                                <th className="px-2 py-1.5 text-right">Utilidad neta</th>
                                <th className="px-2 py-1.5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                    {visiblePeriods.map((period) => {
                        const isClosed = period.status === 'closed'
                        const canClose = !isClosed && period.end_date < today()
                        const snapshotProfit = Number((period.snapshot as any)?.profit?.net_period_profit ?? (period.snapshot as any)?.profit?.net_committed_profit ?? (period.snapshot as any)?.profit?.net_cash_profit ?? 0)
                        return (
                            <tr key={period.period_key} className="bg-white">
                                <td className="px-2 py-1.5 font-bold">{period.period_key}</td>
                                <td className="px-2 py-1.5 text-secondary">{formatDate(period.start_date)} - {formatDate(period.end_date)}</td>
                                <td className="px-2 py-1.5">
                                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${isClosed ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {isClosed ? 'Cerrado' : 'Abierto'}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 text-right font-semibold">{isClosed ? formatMoney(snapshotProfit) : '-'}</td>
                                <td className="px-2 py-1.5 text-right">
                                    {canClose && (
                                    <button type="button" className="rounded-md border border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white disabled:opacity-50" disabled={saving || periodPreviewLoading} onClick={() => previewPeriod(period)}>
                                        Vista previa
                                    </button>
                                    )}
                                    {!canClose && !isClosed && <span className="text-[11px] text-secondary">Disponible al terminar</span>}
                                </td>
                            </tr>
                        )
                    })}
                        </tbody>
                    </table>
                </div>
                {financialPeriods.length > 6 && (
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setShowAllPeriods((value) => !value)}>
                        {showAllPeriods ? 'Mostrar menos meses' : `Mostrar todos (${financialPeriods.length})`}
                    </button>
                )}
                <div className="text-[11px] text-secondary">La lista visible está limitada para no llenar el panel; si se acumulan muchos meses, se muestra el conteo y puedes expandirlos.</div>
                {financialAdjustments.length > 0 && (
                    <div className="border-t border-line pt-2">
                        <div className="text-xs uppercase font-bold text-secondary mb-1">Ajustes recientes</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {financialAdjustments.slice(0, 6).map((adjustment) => (
                                <div key={adjustment.id} className="rounded-md border border-line px-2.5 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold truncate">{adjustment.description}</div>
                                            <div className="text-[11px] text-secondary">{adjustment.period_key} · origen {adjustment.original_period_key || '-'}</div>
                                        </div>
                                        <div className={`text-sm font-bold ${Number(adjustment.total) < 0 ? 'text-success' : 'text-red'}`}>{formatMoney(adjustment.total)}</div>
                                    </div>
                                    {adjustment.reason && <div className="text-[11px] text-secondary truncate mt-1">{adjustment.reason}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {periodPreview && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-line shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-line flex items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-bold">Vista previa de cierre {periodPreview.period.period_key}</div>
                                <div className="text-sm text-secondary">{formatDate(periodPreview.period.start_date)} - {formatDate(periodPreview.period.end_date)}</div>
                            </div>
                            <button type="button" className="text-secondary hover:text-black" onClick={() => setPeriodPreview(null)}>Cerrar</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <SummaryCell label="Ventas netas" value={formatMoney((periodPreview.snapshot as any)?.sales?.net ?? 0)} hint={`${(periodPreview.snapshot as any)?.sales?.orders_count ?? 0} pedidos`} />
                                <SummaryCell label="IVA cobrado" value={formatMoney((periodPreview.snapshot as any)?.sales?.tax ?? 0)} hint="Impuesto venta" tone="text-orange-600" />
                                <SummaryCell label="Utilidad bruta" value={formatMoney((periodPreview.snapshot as any)?.profit?.gross_profit ?? 0)} hint="Neta - costo" tone={Number((periodPreview.snapshot as any)?.profit?.gross_profit ?? 0) >= 0 ? 'text-success' : 'text-red'} />
                                <SummaryCell label="Utilidad neta" value={formatMoney((periodPreview.snapshot as any)?.profit?.net_period_profit ?? (periodPreview.snapshot as any)?.profit?.net_committed_profit ?? 0)} hint="Bruta - gastos período - ajustes" tone={Number((periodPreview.snapshot as any)?.profit?.net_period_profit ?? (periodPreview.snapshot as any)?.profit?.net_committed_profit ?? 0) >= 0 ? 'text-success' : 'text-red'} />
                                <SummaryCell label="Gastos período" value={formatMoney((periodPreview.snapshot as any)?.profit?.period_expenses ?? (periodPreview.snapshot as any)?.profit?.committed_expenses ?? 0)} hint="Por fecha del gasto" tone="text-orange-600" />
                                <SummaryCell label="Gastos pagados" value={formatMoney((periodPreview.snapshot as any)?.profit?.paid_expenses ?? 0)} hint={`${(periodPreview.snapshot as any)?.expenses?.paid_count ?? 0} pagos del período`} tone="text-orange-600" />
                                <SummaryCell label="Pendientes" value={formatMoney((periodPreview.snapshot as any)?.profit?.pending_expenses ?? 0)} hint={`${(periodPreview.snapshot as any)?.expenses?.pending_count ?? 0} por pagar`} tone="text-amber-700" />
                                <SummaryCell label="Vencidos" value={formatMoney((periodPreview.snapshot as any)?.profit?.overdue_expenses ?? 0)} hint={`${(periodPreview.snapshot as any)?.expenses?.overdue_count ?? 0} atrasados`} tone="text-red" />
                                <SummaryCell label="Utilidad neta pagada" value={formatMoney((periodPreview.snapshot as any)?.profit?.net_cash_profit ?? 0)} hint="Bruta - gastos pagados - ajustes" tone={Number((periodPreview.snapshot as any)?.profit?.net_cash_profit ?? 0) >= 0 ? 'text-success' : 'text-red'} />
                            </div>
                            <label className="block">
                                <span className="text-[10px] uppercase font-bold text-secondary">Notas del cierre</span>
                                <textarea className="mt-1 border border-line rounded-lg px-3 py-2 w-full text-sm min-h-[76px]" value={periodPreviewNotes} onChange={(event) => setPeriodPreviewNotes(event.target.value)} placeholder="Ej: Cierre revisado contra gastos del período, gastos pagados y pedidos facturados." />
                            </label>
                            <div className="rounded-lg bg-surface border border-line px-3 py-2 text-xs text-secondary">
                                Al confirmar, estos totales quedan congelados. Cualquier corrección posterior se registrará como ajuste en el mes abierto actual.
                            </div>
                        </div>
                        <div className="p-4 border-t border-line flex flex-col sm:flex-row justify-end gap-2">
                            <button type="button" className="px-4 py-2 rounded-lg border border-line font-semibold" onClick={() => setPeriodPreview(null)}>Cancelar</button>
                            <button type="button" className="button-main px-4 py-2 rounded-lg font-bold disabled:opacity-60" disabled={saving} onClick={closePreviewedPeriod}>
                                Confirmar cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {expenseAdjustmentDraft && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-line shadow-2xl w-full max-w-2xl">
                        <div className="p-4 border-b border-line flex items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-bold">Corregir gasto de mes cerrado</div>
                                <div className="text-sm text-secondary">
                                    El gasto original no se modifica. Se registrará un reverso auditable en el mes abierto actual.
                                </div>
                            </div>
                            <button type="button" className="text-secondary hover:text-black" onClick={() => setExpenseAdjustmentDraft(null)} disabled={saving}>Cerrar</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="rounded-lg border border-line bg-surface p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
                                    <div className="sm:col-span-2">
                                        <div className="text-[10px] uppercase font-bold text-secondary">Gasto original</div>
                                        <div className="font-bold">{expenseAdjustmentDraft.expense.description || expenseAdjustmentDraft.expense.category}</div>
                                        <div className="text-xs text-secondary">{expenseAdjustmentDraft.expense.category} · período {expenseAdjustmentDraft.expense.financial_period_key || String(expenseAdjustmentDraft.expense.expense_date || '').slice(0, 7)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-secondary">Fecha</div>
                                        <div className="font-semibold">{expenseAdjustmentDraft.expense.expense_date ? formatDate(expenseAdjustmentDraft.expense.expense_date) : '-'}</div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <div className="text-[10px] uppercase font-bold text-secondary">Reverso</div>
                                        <div className="font-bold text-success">-{formatMoney(expenseAdjustmentDraft.expense.total)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                                Esta acción afecta el resultado del mes abierto actual como corrección posterior. Úsala solo cuando un gasto de un mes cerrado no debe contar o necesita ser compensado.
                            </div>
                            <label className="block">
                                <span className="text-[10px] uppercase font-bold text-secondary">Motivo obligatorio</span>
                                <textarea
                                    className="mt-1 border border-line rounded-lg px-3 py-2 w-full text-sm min-h-[88px]"
                                    value={expenseAdjustmentDraft.reason}
                                    onChange={(event) => setExpenseAdjustmentDraft({ ...expenseAdjustmentDraft, reason: event.target.value })}
                                    placeholder="Ej: El gasto se registró duplicado en marzo y debe compensarse en el período abierto."
                                />
                            </label>
                            <label className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-xs text-secondary">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={expenseAdjustmentDraft.confirmed}
                                    onChange={(event) => setExpenseAdjustmentDraft({ ...expenseAdjustmentDraft, confirmed: event.target.checked })}
                                />
                                <span>Entiendo que el mes cerrado no cambiará y que se creará un ajuste financiero separado por {formatMoney(-Math.abs(Number(expenseAdjustmentDraft.expense.total || 0)))}.</span>
                            </label>
                        </div>
                        <div className="p-4 border-t border-line flex flex-col sm:flex-row justify-end gap-2">
                            <button type="button" className="px-4 py-2 rounded-lg border border-line font-semibold" onClick={() => setExpenseAdjustmentDraft(null)} disabled={saving}>Cancelar</button>
                            <button
                                type="button"
                                className="button-main px-4 py-2 rounded-lg font-bold disabled:opacity-60"
                                disabled={saving || !expenseAdjustmentDraft.confirmed || expenseAdjustmentDraft.reason.trim().length < 6}
                                onClick={confirmExpenseAdjustment}
                            >
                                {saving ? 'Registrando...' : 'Registrar reverso'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form className="rounded-lg border border-line bg-white p-3 space-y-3" onSubmit={submitExpense}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-sm font-semibold">{editingRecurrenceId ? 'Editar recurrencia' : 'Registrar gasto'}</div>
                        <div className="text-xs text-secondary">
                            {editingRecurrenceId ? 'Ajusta la plantilla que genera gastos futuros.' : 'Selecciona si se guarda una vez o como recurrencia automática.'}
                        </div>
                    </div>
                    {editingRecurrenceId && (
                        <button type="button" className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" onClick={resetExpenseForm} disabled={saving}>
                            Cancelar edición
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Tipo</span>
                        <select
                            className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white"
                            value={expenseForm.mode}
                            onChange={(event) => {
                                const mode = event.target.value as 'one_time' | 'recurring'
                                setExpenseForm({ ...expenseForm, mode })
                                if (mode === 'one_time') setEditingRecurrenceId(null)
                            }}
                        >
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
                        Puedes escribir subtotal, IVA en valor o porcentaje, o total; el sistema completa el resto.
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
                        {saving ? 'Guardando...' : editingRecurrenceId ? 'Guardar recurrencia' : expenseForm.mode === 'recurring' ? 'Crear recurrencia' : 'Registrar gasto'}
                    </button>
                </div>
            </form>

            <form className="rounded-lg border border-line bg-white p-3 space-y-3" onSubmit={submitHistoricalSale}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-sm font-semibold">Carga histórica de ventas</div>
                        <div className="text-xs text-secondary">Úsala para ventas reales de meses abiertos, como abril, sin moverlas al mes actual.</div>
                    </div>
                    <div className="text-xs text-secondary">Por defecto no modifica el stock actual.</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Fecha real</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" type="date" value={historicalSaleForm.saleDate} onChange={(event) => setHistoricalSaleForm({ ...historicalSaleForm, saleDate: event.target.value })} required />
                    </label>
                    <label className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-secondary">Pago</span>
                        <select className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white" value={historicalSaleForm.paymentMethod} onChange={(event) => setHistoricalSaleForm({ ...historicalSaleForm, paymentMethod: event.target.value })}>
                            <option value="cash">Efectivo</option>
                            <option value="transfer">Transferencia</option>
                            <option value="card">Tarjeta</option>
                            <option value="historical">Histórico</option>
                        </select>
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-secondary">Cliente</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Opcional" value={historicalSaleForm.customerName} onChange={(event) => setHistoricalSaleForm({ ...historicalSaleForm, customerName: event.target.value })} />
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-secondary">Referencia</span>
                        <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" placeholder="Factura, comprobante o nota" value={historicalSaleForm.reference} onChange={(event) => setHistoricalSaleForm({ ...historicalSaleForm, reference: event.target.value })} />
                    </label>
                </div>

                <div className="space-y-2">
                    {historicalSaleForm.lines.map((line, index) => {
                        const product = productsById.get(line.productId)
                        return (
                            <div key={line.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_80px_110px_110px_70px] gap-2 items-end">
                                <label className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-secondary">Producto {index + 1}</span>
                                    <select className="border border-line rounded-lg px-3 py-2 w-full text-sm bg-white" value={line.productId} onChange={(event) => selectHistoricalProduct(line.id, event.target.value)} required>
                                        <option value="">Selecciona producto</option>
                                        {historicalSaleProducts.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ''}</option>
                                        ))}
                                    </select>
                                    {product && <div className="text-[10px] text-secondary">Stock actual: {product.stock} · IVA: {Number(product.taxRate).toLocaleString('es-EC', { maximumFractionDigits: 2 })}%</div>}
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-secondary">Cant.</span>
                                    <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" inputMode="numeric" value={line.quantity} onChange={(event) => updateHistoricalLine(line.id, { quantity: event.target.value })} required />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-secondary">PVP unit.</span>
                                    <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" inputMode="decimal" value={line.unitPrice} onChange={(event) => updateHistoricalLine(line.id, { unitPrice: sanitizeMoneyInput(event.target.value) })} required />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-secondary">Costo unit.</span>
                                    <input className="border border-line rounded-lg px-3 py-2 w-full text-sm" inputMode="decimal" value={line.unitCost} onChange={(event) => updateHistoricalLine(line.id, { unitCost: sanitizeMoneyInput(event.target.value) })} />
                                </label>
                                <button type="button" className="px-2 py-2 rounded-lg border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={historicalSaleForm.lines.length === 1} onClick={() => setHistoricalSaleForm((previous) => ({ ...previous, lines: previous.lines.filter((item) => item.id !== line.id) }))}>
                                    Quitar
                                </button>
                            </div>
                        )
                    })}
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setHistoricalSaleForm((previous) => ({ ...previous, lines: [...previous.lines, createHistoricalSaleLine()] }))}>
                        + Agregar producto
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                    <SummaryCell label="Total venta" value={formatMoney(historicalSaleTotals.gross)} hint={`${historicalSaleTotals.units} unidades`} />
                    <SummaryCell label="Venta neta" value={formatMoney(historicalSaleTotals.net)} hint="Sin IVA estimado" />
                    <SummaryCell label="IVA" value={formatMoney(historicalSaleTotals.tax)} hint="Según producto" tone="text-orange-600" />
                    <SummaryCell label="Costo" value={formatMoney(historicalSaleTotals.cost)} hint="Costo producto" />
                    <SummaryCell label="Utilidad bruta" value={formatMoney(historicalSaleTotals.net - historicalSaleTotals.cost)} hint="Neta - costo" tone={(historicalSaleTotals.net - historicalSaleTotals.cost) >= 0 ? 'text-success' : 'text-red'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_190px] gap-2">
                    <div className="space-y-2">
                        <textarea className="border border-line rounded-lg px-3 py-2 w-full text-sm min-h-[58px]" placeholder="Notas de carga histórica" value={historicalSaleForm.notes} onChange={(event) => setHistoricalSaleForm({ ...historicalSaleForm, notes: event.target.value })} />
                        <label className="inline-flex items-center gap-2 text-xs text-secondary">
                            <input type="checkbox" checked={historicalSaleForm.affectInventory} onChange={(event) => setHistoricalSaleForm({ ...historicalSaleForm, affectInventory: event.target.checked })} />
                            Descontar stock ahora
                        </label>
                    </div>
                    <button type="submit" className="button-main w-full py-2 rounded-lg text-sm font-bold disabled:opacity-60" disabled={saving || historicalSaleProducts.length === 0}>
                        {saving ? 'Guardando...' : 'Registrar venta histórica'}
                    </button>
                </div>
                {historicalSaleError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{historicalSaleError}</div>}
                {historicalSaleProducts.length === 0 && <div className="text-[11px] text-secondary">Carga productos del panel para registrar ventas históricas.</div>}
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
                    <input
                        className="border border-line rounded-lg px-3 py-2 text-sm"
                        type="month"
                        value={filters.period}
                        onChange={(event) => onFiltersChange({ ...filters, period: event.target.value, from: '', to: '' })}
                    />
                    <input className="border border-line rounded-lg px-3 py-2 text-sm" type="date" value={filters.from} onChange={(event) => onFiltersChange({ ...filters, period: '', from: event.target.value })} />
                    <input className="border border-line rounded-lg px-3 py-2 text-sm" type="date" value={filters.to} onChange={(event) => onFiltersChange({ ...filters, period: '', to: event.target.value })} />
                    {(filters.period || filters.from || filters.to || filters.status !== 'all' || filters.category !== 'all') && (
                        <button type="button" className="px-3 py-2 rounded-lg border border-line text-xs font-bold hover:bg-surface" onClick={() => onFiltersChange({ status: 'all', category: 'all', period: '', from: '', to: '' })}>
                            Limpiar filtros
                        </button>
                    )}
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
                                                <button type="button" className="px-2 py-1 rounded-md border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={saving || expense.is_period_closed} onClick={() => onUpdateStatus(expense.id, 'paid')}>
                                                    Pagar
                                                </button>
                                            )}
                                            {expense.status !== 'pending' && expense.status !== 'paid' && !expense.is_period_closed && (
                                                <button type="button" className="px-2 py-1 rounded-md border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={saving} onClick={() => onUpdateStatus(expense.id, 'pending')}>
                                                    Pendiente
                                                </button>
                                            )}
                                            {expense.status !== 'cancelled' && !expense.is_period_closed && (
                                                <button type="button" className="px-2 py-1 rounded-md border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50" disabled={saving} onClick={() => onUpdateStatus(expense.id, 'cancelled')}>
                                                    Anular
                                                </button>
                                            )}
                                            {expense.is_period_closed && (
                                                <button type="button" className="px-2 py-1 rounded-md border border-black text-xs font-semibold hover:bg-black hover:text-white disabled:opacity-50" disabled={saving} onClick={() => createAdjustmentForExpense(expense)}>
                                                    Corregir mes cerrado
                                                </button>
                                            )}
                                        </div>
                                        {expense.is_period_closed && <div className="mt-1 text-[10px] text-secondary">No anula el original; registra un reverso en el mes abierto.</div>}
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
                    <div className="text-sm font-semibold">Recurrencias</div>
                    <div className="text-xs text-secondary">{recurrences.length} configuradas</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {recurrences.slice(0, 9).map((item) => (
                        <div key={item.id} className={`rounded-md border px-2.5 py-2 ${editingRecurrenceId === item.id ? 'border-black bg-surface' : 'border-line'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm truncate">{item.description}</div>
                                    <div className="text-[11px] text-secondary">
                                        {item.category} · {item.frequency === 'monthly' ? 'Mensual' : 'Semanal'} · vence {formatDate(item.next_due_date)}
                                        {!item.active ? ' · pausada' : ''}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                    <button type="button" className="text-xs font-semibold text-primary hover:underline disabled:opacity-50" disabled={saving} onClick={() => startEditingRecurrence(item)}>
                                        Editar
                                    </button>
                                    <button type="button" className="text-xs font-semibold text-primary hover:underline disabled:opacity-50" disabled={saving} onClick={() => onToggleRecurrence(item.id, !item.active)}>
                                        {item.active ? 'Pausar' : 'Activar'}
                                    </button>
                                    <button type="button" className="text-xs font-semibold text-red hover:underline disabled:opacity-50" disabled={saving} onClick={() => deleteRecurrence(item)}>
                                        Eliminar
                                    </button>
                                </div>
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
