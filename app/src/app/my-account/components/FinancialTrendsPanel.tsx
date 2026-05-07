'use client'

import React from 'react'
import type { FinancialTrendPoint, FinancialTrends } from '../types'

export type FinancialTrendRangeMode = 'daily' | 'monthly'
export type FinancialTrendSummaryScope = 'selected' | 'total'

type FinancialTrendsPanelProps = {
    trends?: FinancialTrends | null
    formatMoney: (value: number | string | null | undefined) => string
    mode: FinancialTrendRangeMode
    scope: FinancialTrendSummaryScope
    selectedPeriod: string
    onModeChange: (mode: FinancialTrendRangeMode) => void
    onScopeChange: (scope: FinancialTrendSummaryScope) => void
    onSelectedPeriodChange: (period: string) => void
}

type TrendTotals = {
    orders: number
    gross: number
    net: number
    cost: number
    grossProfit: number
    incurred: number
    paid: number
    pending: number
    overdue: number
    adjustments: number
    periodProfit: number
    cashProfit: number
}

const toNumber = (value: unknown) => Number(value ?? 0) || 0
const expenseIncurred = (row: FinancialTrendPoint) => toNumber(row.period_expenses ?? row.expenses_incurred ?? row.committed_expenses)
const expensePaid = (row: FinancialTrendPoint) => toNumber(row.expenses_cash_paid ?? row.expenses_paid)
const netPeriodProfit = (row: FinancialTrendPoint) => toNumber(row.net_period_profit ?? row.net_committed_profit)

const hasActivity = (row: FinancialTrendPoint) => (
    toNumber(row.gross_sales) !== 0
    || toNumber(row.net_sales) !== 0
    || toNumber(row.product_cost) !== 0
    || toNumber(row.gross_profit) !== 0
    || expenseIncurred(row) !== 0
    || expensePaid(row) !== 0
    || toNumber(row.expenses_pending) !== 0
    || toNumber(row.expenses_overdue) !== 0
    || toNumber(row.financial_adjustments) !== 0
)

const emptyTotals = (): TrendTotals => ({
    orders: 0,
    gross: 0,
    net: 0,
    cost: 0,
    grossProfit: 0,
    incurred: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    adjustments: 0,
    periodProfit: 0,
    cashProfit: 0,
})

const summarizeRows = (rows: FinancialTrendPoint[]): TrendTotals => rows.reduce((acc, row) => {
    acc.orders += toNumber(row.orders_count)
    acc.gross += toNumber(row.gross_sales)
    acc.net += toNumber(row.net_sales)
    acc.cost += toNumber(row.product_cost)
    acc.grossProfit += toNumber(row.gross_profit)
    acc.incurred += expenseIncurred(row)
    acc.paid += expensePaid(row)
    acc.pending += toNumber(row.expenses_pending)
    acc.overdue += toNumber(row.expenses_overdue)
    acc.adjustments += toNumber(row.financial_adjustments)
    acc.periodProfit += netPeriodProfit(row)
    acc.cashProfit += toNumber(row.net_cash_profit)
    return acc
}, emptyTotals())

function Metric({ label, value, hint, tone = '' }: { label: string; value: string; hint: string; tone?: string }) {
    return (
        <div className="rounded-md border border-line bg-white px-2.5 py-2">
            <div className="text-[10px] uppercase font-bold text-secondary leading-tight">{label}</div>
            <div className={`text-base font-bold leading-tight ${tone}`}>{value}</div>
            <div className="text-[10px] text-secondary leading-tight">{hint}</div>
        </div>
    )
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
    const absoluteValue = Math.abs(value)
    const width = max > 0 && absoluteValue > 0 ? Math.max(2, Math.min(100, (absoluteValue / max) * 100)) : 0
    return <span className={`block h-1.5 rounded-full ${className}`} style={{ width: `${width}%` }} />
}

function formatPeriodLabel(period: string, mode: FinancialTrendRangeMode) {
    if (mode === 'monthly') return period
    if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return period
    const [year, month, day] = period.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(date)
}

export default function FinancialTrendsPanel({
    trends,
    formatMoney,
    mode,
    scope,
    selectedPeriod,
    onModeChange,
    onScopeChange,
    onSelectedPeriodChange,
}: FinancialTrendsPanelProps) {
    const rows = React.useMemo(() => {
        const source = mode === 'monthly' ? trends?.monthly : trends?.daily
        const cleanRows = Array.isArray(source) ? source : []
        return mode === 'daily' ? cleanRows.slice(-30) : cleanRows
    }, [mode, trends])

    React.useEffect(() => {
        if (rows.length === 0) {
            onSelectedPeriodChange('')
            return
        }
        if (selectedPeriod && rows.some((row) => row.period === selectedPeriod)) return
        const latestActivity = [...rows].reverse().find(hasActivity) ?? rows[rows.length - 1]
        onSelectedPeriodChange(latestActivity.period)
    }, [rows, selectedPeriod, onSelectedPeriodChange])

    const selectedRow = rows.find((row) => row.period === selectedPeriod) ?? rows.find(hasActivity) ?? rows[rows.length - 1]
    const totals = React.useMemo(() => (
        mode === 'daily' || scope === 'total' ? summarizeRows(rows) : summarizeRows(selectedRow ? [selectedRow] : [])
    ), [mode, rows, scope, selectedRow])

    const maxBarValue = Math.max(
        1,
        ...rows.flatMap((row) => [
            toNumber(row.net_sales),
            expenseIncurred(row),
            expensePaid(row),
            Math.abs(netPeriodProfit(row)),
        ]),
    )
    const contextLabel = mode === 'daily'
        ? 'Últimos 30 días'
        : (scope === 'total' ? 'Total histórico visible' : (selectedRow?.period ?? 'Sin período'))
    const periodWord = mode === 'monthly' ? 'mes' : '30 días'
    const periodExpensesLabel = mode === 'monthly' ? 'Gastos del período' : 'Gastos 30 días'

    return (
        <section className="rounded-lg border border-line bg-white p-3 space-y-3 mb-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="text-sm font-semibold">Tendencias financieras</div>
                    <div className="text-xs text-secondary">
                        Los gastos y pagos se muestran en el mes al que pertenece el gasto, no en el día en que se actualizó el estado.
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="inline-flex rounded-lg border border-line bg-surface p-1">
                        <button type="button" className={`px-3 py-1.5 rounded-md text-xs font-bold ${mode === 'daily' ? 'bg-black text-white' : 'text-secondary hover:text-black'}`} onClick={() => onModeChange('daily')}>30 días</button>
                        <button type="button" className={`px-3 py-1.5 rounded-md text-xs font-bold ${mode === 'monthly' ? 'bg-black text-white' : 'text-secondary hover:text-black'}`} onClick={() => onModeChange('monthly')}>Mes a mes</button>
                    </div>
                    {mode === 'monthly' && (
                        <div className="inline-flex rounded-lg border border-line bg-surface p-1">
                            <button type="button" className={`px-3 py-1.5 rounded-md text-xs font-bold ${scope === 'selected' ? 'bg-black text-white' : 'text-secondary hover:text-black'}`} onClick={() => onScopeChange('selected')}>Período</button>
                            <button type="button" className={`px-3 py-1.5 rounded-md text-xs font-bold ${scope === 'total' ? 'bg-black text-white' : 'text-secondary hover:text-black'}`} onClick={() => onScopeChange('total')}>Total</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-md border border-line bg-surface px-2.5 py-2 text-xs text-secondary">
                Vista actual: <span className="font-bold text-black">{contextLabel}</span>. La utilidad neta descuenta los gastos registrados del período aunque el resultado sea cero o negativo.
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-1.5">
                <Metric label="Venta neta" value={formatMoney(totals.net)} hint={`${totals.orders} ventas`} />
                <Metric label="Utilidad bruta" value={formatMoney(totals.grossProfit)} hint="Venta - costo" tone={totals.grossProfit >= 0 ? 'text-success' : 'text-red'} />
                <Metric label={periodExpensesLabel} value={`-${formatMoney(totals.incurred)}`} hint="Por fecha del gasto" tone={totals.incurred > 0 ? 'text-orange-600' : ''} />
                <Metric label="Gastos pagados" value={`-${formatMoney(totals.paid)}`} hint="Del mismo período" tone={totals.paid > 0 ? 'text-orange-600' : ''} />
                <Metric label={`Utilidad neta ${periodWord}`} value={formatMoney(totals.periodProfit)} hint="Bruta - gasto del período" tone={totals.periodProfit >= 0 ? 'text-success' : 'text-red'} />
                <Metric label="Utilidad neta pagada" value={formatMoney(totals.cashProfit)} hint="Bruta - gastos pagados" tone={totals.cashProfit >= 0 ? 'text-success' : 'text-red'} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[1180px] text-sm">
                    <thead className="bg-surface text-[10px] uppercase text-secondary">
                        <tr>
                            <th className="px-2 py-1.5 text-left">{mode === 'monthly' ? 'Mes' : 'Día'}</th>
                            <th className="px-2 py-1.5 text-right">Pedidos</th>
                            <th className="px-2 py-1.5 text-right">Venta bruta</th>
                            <th className="px-2 py-1.5 text-right">Venta neta</th>
                            <th className="px-2 py-1.5 text-right">Costo</th>
                            <th className="px-2 py-1.5 text-right">Utilidad bruta</th>
                            <th className="px-2 py-1.5 text-right">{periodExpensesLabel}</th>
                            <th className="px-2 py-1.5 text-right">Gastos pagados</th>
                            <th className="px-2 py-1.5 text-right">Pend./venc.</th>
                            <th className="px-2 py-1.5 text-right">Ajustes</th>
                            <th className="px-2 py-1.5 text-right">Utilidad neta</th>
                            <th className="px-2 py-1.5 text-right">Utilidad neta pagada</th>
                            <th className="px-2 py-1.5 text-left">Lectura</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-3 py-8 text-center text-secondary">Aún no hay datos financieros para mostrar.</td>
                            </tr>
                        ) : rows.map((row) => {
                            const selected = row.period === selectedRow?.period
                            const incurred = expenseIncurred(row)
                            const paid = expensePaid(row)
                            const pending = toNumber(row.expenses_pending) + toNumber(row.expenses_overdue)
                            const periodProfit = netPeriodProfit(row)
                            const cashProfit = toNumber(row.net_cash_profit)
                            const adjustments = toNumber(row.financial_adjustments)
                            return (
                                <tr key={`${mode}-${row.period}`} className={selected ? 'bg-surface' : 'bg-white hover:bg-surface/60'}>
                                    <td className="px-2 py-2">
                                        <button type="button" className="font-bold text-left hover:underline" onClick={() => { onSelectedPeriodChange(row.period); if (mode === 'monthly') onScopeChange('selected') }}>
                                            {formatPeriodLabel(row.period, mode)}
                                        </button>
                                        <div className="text-[10px] text-secondary">{hasActivity(row) ? 'Con actividad' : 'Sin movimiento'}</div>
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold">{toNumber(row.orders_count).toLocaleString('es-EC')}</td>
                                    <td className="px-2 py-2 text-right font-semibold">{formatMoney(row.gross_sales)}</td>
                                    <td className="px-2 py-2 text-right">
                                        <div className="font-semibold">{formatMoney(row.net_sales)}</div>
                                        <div className="mt-1 flex justify-end"><Bar value={toNumber(row.net_sales)} max={maxBarValue} className="bg-black" /></div>
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold">{formatMoney(row.product_cost)}</td>
                                    <td className={`px-2 py-2 text-right font-bold ${toNumber(row.gross_profit) >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(row.gross_profit)}</td>
                                    <td className="px-2 py-2 text-right">
                                        <div className="font-semibold">{formatMoney(incurred)}</div>
                                        <div className="mt-1 flex justify-end"><Bar value={incurred} max={maxBarValue} className="bg-orange-500" /></div>
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <div className="font-semibold">{formatMoney(paid)}</div>
                                        <div className="mt-1 flex justify-end"><Bar value={paid} max={maxBarValue} className="bg-amber-700" /></div>
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold">{formatMoney(pending)}</td>
                                    <td className="px-2 py-2 text-right font-semibold">{formatMoney(adjustments)}</td>
                                    <td className={`px-2 py-2 text-right font-bold ${periodProfit >= 0 ? 'text-success' : 'text-red'}`}>
                                        {formatMoney(periodProfit)}
                                    </td>
                                    <td className={`px-2 py-2 text-right font-bold ${cashProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(cashProfit)}</td>
                                    <td className="px-2 py-2 text-[11px] text-secondary">
                                        {paid !== incurred
                                            ? 'Hay gastos del período sin pagar o pagados parcialmente.'
                                            : 'Los gastos del período están pagados.'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
