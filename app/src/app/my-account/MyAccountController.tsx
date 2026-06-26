'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { toPublicApiUrl } from '@/lib/publicApiPath'
import {
    Archive,
    ArrowDownLeft,
    ArrowRight,
    CaretDown,
    CheckCircle,
    CurrencyDollar,
    HandCoins,
    HourglassMedium,
    Info,
    Lightbulb,
    Package,
    Plus,
    Receipt,
    ReceiptX,
    SignOut,
    ShoppingBag,
    Tag,
    Target,
    Trash,
    TrendDown,
    TrendUp,
    Warning,
    WarningCircle,
    WarningDiamond,
    X,
} from "@phosphor-icons/react/dist/ssr";

const Icon = {
    Archive,
    ArrowDownLeft,
    ArrowRight,
    CaretDown,
    CheckCircle,
    CurrencyDollar,
    HandCoins,
    HourglassMedium,
    Info,
    Lightbulb,
    Package,
    Plus,
    Receipt,
    ReceiptX,
    SignOut,
    ShoppingBag,
    Tag,
    Target,
    Trash,
    TrendDown,
    TrendUp,
    Warning,
    WarningCircle,
    WarningDiamond,
    X,
} as const

const PASSIVE_REFRESH_VISIBLE_INTERVAL_MS = 120000
const PASSIVE_REFRESH_FOCUS_INTERVAL_MS = 60000
const PASSIVE_REFRESH_RECENT_INTERACTION_BLOCK_MS = 15000
const PASSIVE_REFRESH_SAFE_TABS = new Set([
    'dashboard',
    'reports',
    'sales-ranking',
    'alerts',
    'admin-orders',
    'shipments',
    'balances',
    'billing-rides',
    'inventory',
])

import { useRouter, useSearchParams } from 'next/navigation'
import { fetchJson, requestApi } from '@/lib/apiClient'
import { clearStoredSession, setStoredSessionUser } from '@/lib/authSession'
import { createDiscount, listDiscountAudit, listDiscounts, updateDiscount, updateDiscountStatus } from '@/lib/api/discounts'
import type { AdminDiscountAuditRow, AdminDiscountCode, AdminDiscountPayload, AdminDiscountType } from '@/lib/api/discounts'
import { getPricingCalc, getPricingMargins, getPricingRules, getProductPageSettings, getProductReferenceData, getSessionSettings, getStoreStatus, updatePricingCalc, updatePricingMargins, updatePricingRules, updateProductPageSettings, updateProductReferenceData, updateSessionSettings, updateStoreStatus } from '@/lib/api/settings'
import type { PricingCalc, PricingMargins, PricingRules, ProductPageSettings, SessionSettings, StoreStatusSettings } from '@/lib/api/settings'
import { unlockAdminUser } from '@/lib/api/users'
import { createEmptyProductReferenceData, type ProductReferenceData } from '@/lib/productReferenceData'
import {
    createEmptyProductForm,
    createDuplicateVariantFormFromProduct,
    createProductFormFromProduct,
    getAdminProductEntityId,
    getVariantDefinitionFieldLabel,
    isProductEligibleForPublication,
    isTaxExemptProduct,
    normalizeAdminProducts,
    resolveProductVariantLabel,
} from './productFormUtils'
import { buildProductSearchIndex, buildProductSearchText, filterProductsBySearch, getProductSearchScore, matchesProductSearch, normalizeProductSearch, sanitizeProductSearchQuery } from '@/lib/productSearch'
import {
    ADMIN_PRODUCTS_ENDPOINT,
    DEFAULT_STORE_PAUSE_MESSAGE,
    formatMonthKeyLabel,
    getCurrentMonthKey,
    getEcuadorDateKey,
    getEcuadorLastSevenDaysRange,
    getEcuadorTodayKey,
    RETRYABLE_PANEL_ERROR_PATTERN,
    withTransientRetry,
} from './utils'
import {
    createEmptySavedAddressEntry,
    formatAddress,
    formatAddressLines,
    getAdminUserResolvedAddress,
    getItemNetPrice,
    getOrderContact,
    getOrderItemsGrossSubtotal,
    getOrderItemsNetSubtotal,
    isDynamicOrderItemImage,
    getOrderShipping,
    getOrderVatAmount,
    getOrderVatSubtotal,
    normalizeSavedAddresses,
    normalizeOrderItemImage,
    normalizeAddressCandidate,
    parseAddress,
    parseJsonValue,
    type SavedAddressEntry,
} from './customerDataUtils'
import {
    formatDateEcuador,
    formatDateTimeEcuador,
    formatMoney,
    getLocalSalePaymentMethodLabel,
} from './formatting'
import AccountSidebar from './components/AccountSidebar'
import AccountPanelHeader from './components/AccountPanelHeader'
import AdminAccountShellStyles from './components/AdminAccountShellStyles'
import AdminShippingSettingsPanel from './components/AdminShippingSettingsPanel'
import BillingRidesPanel from './components/BillingRidesPanel'
import CustomerAddressPanel from './components/CustomerAddressPanel'
import CustomerSettingsPanel from './components/CustomerSettingsPanel'
import InventoryExpandedDetail from './components/InventoryExpandedDetail'
import { BusinessControlMetric, ReportCompactMetric } from './components/MetricCards'
import NotificationOverlay from './components/NotificationOverlay'
import TaxesPanel from './components/TaxesPanel'
import { useAdminSidebarNavigation } from './hooks/useAdminSidebarNavigation'
import { useAuthBootstrap } from './hooks/useAuthBootstrap'
import { useAdminDataLoader } from './hooks/useAdminDataLoader'
import { useCustomerAccountData } from './hooks/useCustomerAccountData'
import { useLocalSaleQuote } from './hooks/useLocalSaleQuote'
import { usePosShift } from './hooks/usePosShift'
import SalesRankingPanel from './reports/SalesRankingPanel'
import ProductPurchaseHistoryPanel from './reports/ProductPurchaseHistoryPanel'
import TraceabilityPanel from './reports/TraceabilityPanel'
import { useReportData } from './reports/useReportData'
import {
    ADMIN_TABS_WITH_ORDERS,
    ADMIN_TABS_WITH_PRICING_SETTINGS,
    ADMIN_TABS_WITH_PRODUCTS,
    ADMIN_TABS_WITH_REFERENCE_DATA,
    ADMIN_TABS_WITH_SHIPPING_SETTINGS,
    ADMIN_TABS_WITH_STATS,
    ADMIN_TABS_WITH_USERS,
    ADMIN_TABS_WITH_VAT_SETTINGS,
} from './adminDataScopes'
import { REPORT_SECTION_META } from './reportSections'
import { buildReportExport, downloadReportExport, type ReportFinancialSummary } from './reportExport'
import type { FinancialTrendRangeMode, FinancialTrendSummaryScope } from './components/FinancialTrendsPanel'
import {
    buildInventoryManagementRows,
    buildLocalSaleCatalog,
    buildProductPublicationSummary,
    INVENTORY_LOW_STOCK_THRESHOLD,
    type LocalSaleCatalogItem,
} from './adminProductDerivations'
import {
    buildInventoryProductBreakdown,
    buildProductRankingActionItems,
    buildProductRankingDecisionRows,
    buildProductBreakdownMeta,
    buildSalesProductBreakdown,
    buildSalesRankingRows,
    buildSalesTrendPreview,
    buildTraceabilityIssues,
    buildTraceabilitySummary,
    filterStrategicAlerts,
    summarizeInventoryRows,
    summarizePurchaseInvoices,
    summarizeStrategicAlerts,
} from './reportingUtils'
import {
    alertSeverityLabels,
    enrichAdminUsers,
    formatIsoDate,
    getProductExpirationMeta,
    getStatusBadge,
    getUserRoleBadge,
    normalizeStatus,
} from './statusDisplay'
import type {
    AddressData,
    AdminLocalQuotation,
    AdminReportSection,
    AdminUserSummary,
    BillingRidePdf,
    BusinessExpense,
    BusinessExpenseRecurrence,
    BusinessExpenseStatus,
    BusinessExpenseSummary,
    DashboardStats,
    DeepDiveView,
    FinancialAdjustment,
    FinancialPeriod,
    FinancialPeriodPreview,
    FinancialTrendPoint,
    InventoryIntelligence,
    LocalSaleLineItem,
    LocalSaleQuotationResult,
    LocalSaleQuote,
    LocalSaleSubmissionResult,
    Order,
    PosMovement,
    PosShift,
    ProductEditorMode,
    ProductDetailMetric,
    ProductRankingActionItem,
    ProductRankingDecisionRow,
    ProductFormState,
    ProductProcurementDetail,
    ProductPublicationFilter,
    PurchaseInvoiceDetail,
    PurchaseInvoiceSummary,
    ReportPeriodSummary,
    SalesReportView,
    SalesRankingRow,
    ShippingPickup,
    ShippingProvider,
} from './types'

type ReportSalesOrder = ReportPeriodSummary['orders'][number]

const resolveSalesRankingSourceView = (view: SalesReportView): 'month' | 'historical' | 'range' => {
    if (view === 'month') return 'month'
    if (view === 'historical') return 'historical'
    return 'range'
}

const getSalesReportViewLabel = (view: SalesReportView, monthLabel: string) => {
    if (view === 'daily') return 'Día'
    if (view === 'week') return 'Semana'
    if (view === 'month') return monthLabel
    return 'Todo'
}

const getStableKeyPart = (value: unknown) => String(value ?? '').trim().toLowerCase()

const uniqueReportRowsByKey = <T,>(items: T[], getKey: (item: T) => string): T[] => {
    const seen = new Set<string>()
    const result: T[] = []
    for (const item of Array.isArray(items) ? items : []) {
        const key = getKey(item)
        if (!key) {
            result.push(item)
            continue
        }
        if (seen.has(key)) continue
        seen.add(key)
        result.push(item)
    }
    return result
}

const getReportSalesOrderKey = (order: ReportSalesOrder): string => {
    const id = getStableKeyPart(order.id)
    if (id) return id
    return [
        order.created_at,
        order.user_name,
        order.customer_email,
        order.gross,
        order.items_summary,
    ].map(getStableKeyPart).join('|')
}

const getPurchaseInvoiceSummaryKey = (invoice: PurchaseInvoiceSummary): string => {
    const id = getStableKeyPart(invoice.id)
    if (id) return id
    return [
        invoice.invoice_number,
        invoice.supplier_document,
        invoice.supplier_name,
        invoice.issued_at,
        invoice.total,
    ].map(getStableKeyPart).join('|')
}

const dedupeReportSalesOrders = (orders: ReportSalesOrder[]) =>
    uniqueReportRowsByKey(orders, getReportSalesOrderKey)

const dedupePurchaseInvoiceSummaries = (invoices: PurchaseInvoiceSummary[]) =>
    uniqueReportRowsByKey(invoices, getPurchaseInvoiceSummaryKey)

const escapeHtml = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

const normalizeWhatsAppPhone = (value: string): string | null => {
    const digits = String(value || '').replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('593') && digits.length >= 11 && digits.length <= 13) return digits
    if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}`
    if (digits.length === 9) return `593${digits}`
    if (digits.length >= 10 && digits.length <= 15) return digits
    return null
}

const buildQuotationWhatsAppMessage = ({
    quotation,
    formatMoney,
}: {
    quotation: AdminLocalQuotation
    formatMoney: (value: number) => string
}) => {
    const total = Number(quotation.quote_snapshot?.total || 0)
    return [
        `Hola ${String(quotation.customer_name || 'cliente').trim()},`,
        '',
        `Te compartimos tu cotización ${quotation.id} de ParaMascotas.`,
        `Total: ${formatMoney(total)}`,
        quotation.valid_until ? `Válida hasta: ${String(quotation.valid_until).slice(0, 10)}` : null,
        '',
        'Si deseas confirmarla, te ayudamos a convertirla en venta.',
    ].filter(Boolean).join('\n')
}

const buildLocalQuotationHtml = ({
    quotation,
    formatMoney,
    formatDateTimeEcuador,
}: {
    quotation: AdminLocalQuotation
    formatMoney: (value: number) => string
    formatDateTimeEcuador: (value: string, options?: Intl.DateTimeFormatOptions) => string
}) => {
    const snapshot = quotation.quote_snapshot || {}
    const items: Array<{
        product_id: string
        product_name?: string
        quantity: number
        price: number
        total: number
    }> = Array.isArray(snapshot.items) ? snapshot.items : []
    const address = quotation.customer_address || {}
    const formatQuotationDate = (value?: string | null, options?: Intl.DateTimeFormatOptions, fallback = 'No definida') => {
        const raw = String(value || '').trim()
        if (!raw) return fallback
        try {
            return formatDateTimeEcuador(raw, options)
        } catch {
            return raw
        }
    }
    const quoteItemsHtml = items.map((item) => `
        <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                <div style="font-weight:700;color:#0f172a;font-size:14px;line-height:1.35;">${escapeHtml(item.product_name || 'Producto')}</div>
            </td>
            <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:center;vertical-align:top;">${Number(item.quantity || 0)}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;">${escapeHtml(formatMoney(Number(item.price || 0)))}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-weight:700;">${escapeHtml(formatMoney(Number(item.total || 0)))}</td>
        </tr>
    `).join('')

    const quoteItemsTableHtml = quoteItemsHtml || `
        <tr>
            <td colspan="4" style="padding:18px 14px;text-align:center;color:#64748b;">Sin artículos en esta cotización.</td>
        </tr>
    `

    const notesHtml = quotation.notes?.trim()
        ? `<div style="margin-top:18px;padding:16px 18px;border:1px solid #dbe3ee;border-radius:14px;background:#f8fbff;">
                <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:#64748b;letter-spacing:0.04em;margin-bottom:8px;">Observaciones</div>
                <div style="font-size:13px;color:#0f172a;white-space:pre-wrap;line-height:1.55;">${escapeHtml(quotation.notes.trim())}</div>
           </div>`
        : ''

    return `<!doctype html>
        <html lang="es">
        <head>
            <meta charset="utf-8" />
            <title>Cotización ${escapeHtml(quotation.id)}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px 34px; background: #ffffff; font-size: 13px; line-height: 1.45; }
                .sheet { max-width: 920px; margin: 0 auto; }
                .header-table, .info-table, .items-table, .totals-table { width:100%; border-collapse:collapse; }
                .brand-name { font-size: 22px; font-weight: 800; color: #0b8ca8; line-height: 1; margin: 0 0 4px 0; }
                .brand-subtitle { color:#64748b; font-size:13px; }
                .quote-code { font-size:24px; font-weight:800; color:#0f172a; line-height:1.2; margin-bottom:6px; }
                .muted { color:#64748b; font-size:12px; line-height:1.5; }
                .section-card { border:1px solid #dbe3ee; border-radius:14px; padding:16px 18px; background:#fff; }
                .section-title { font-size:11px; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:0.04em; margin-bottom:8px; }
                .customer-name { font-size:18px; font-weight:700; color:#1e293b; margin:0 0 6px 0; }
                .items-wrap { border:1px solid #dbe3ee; border-radius:14px; padding:14px 16px 16px 16px; }
                .items-table th { text-align:left; font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.04em; padding:10px 14px; border-bottom:1px solid #cbd5e1; }
                .summary-box { width:310px; margin-left:auto; margin-top:18px; }
                .totals-table td { padding:8px 0; border-bottom:1px solid #e2e8f0; font-size:14px; }
                .totals-table td:last-child { text-align:right; font-weight:700; }
                .totals-table .grand td { font-size:20px; font-weight:800; color:#0f172a; padding-top:12px; }
                .footer { margin-top:24px; font-size:12px; color:#64748b; }
            </style>
        </head>
        <body>
            <div class="sheet">
                <table class="header-table" style="margin-bottom:24px;">
                    <tr>
                        <td style="width:55%; vertical-align:top;">
                            <div class="brand-name">ParaMascotas</div>
                            <div class="brand-subtitle">Cotización comercial de productos</div>
                        </td>
                        <td style="width:45%; text-align:right; vertical-align:top;">
                            <div class="quote-code">${escapeHtml(quotation.id)}</div>
                            <div class="muted">Emitida: ${escapeHtml(formatQuotationDate(quotation.created_at, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</div>
                            <div class="muted">Válida hasta: ${escapeHtml(formatQuotationDate(quotation.valid_until, { day: '2-digit', month: '2-digit', year: 'numeric' }))}</div>
                        </td>
                    </tr>
                </table>
                <table class="info-table" style="margin-bottom:20px;">
                    <tr>
                        <td style="width:52%; vertical-align:top; padding-right:8px;">
                            <div class="section-card">
                                <div class="section-title">Cliente</div>
                                <div class="customer-name">${escapeHtml(quotation.customer_name)}</div>
                                <div class="muted">Documento: ${escapeHtml(quotation.customer_document_number || 'No indicado')}</div>
                                <div class="muted">Teléfono: ${escapeHtml(quotation.customer_phone || 'No indicado')}</div>
                                <div class="muted">Correo: ${escapeHtml(quotation.customer_email || 'No indicado')}</div>
                            </div>
                        </td>
                        <td style="width:48%; vertical-align:top; padding-left:8px;">
                            <div class="section-card">
                                <div class="section-title">Entrega y condiciones</div>
                                <div class="muted">Modalidad: Retiro en tienda</div>
                                <div class="muted">Dirección: ${escapeHtml(address.street || 'No indicada')}</div>
                                <div class="muted">Ciudad: ${escapeHtml(address.city || 'No indicada')}</div>
                                <div class="muted">Descuento: ${escapeHtml(quotation.discount_code || 'Sin código')}</div>
                            </div>
                        </td>
                    </tr>
                </table>
                <div class="items-wrap">
                    <div class="section-title" style="margin-bottom:10px;">Detalle cotizado</div>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width:52%;">Producto</th>
                                <th style="width:12%; text-align:center;">Cant.</th>
                                <th style="width:18%; text-align:right;">PVP</th>
                                <th style="width:18%; text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${quoteItemsTableHtml}</tbody>
                    </table>
                </div>
                <div class="summary-box">
                    <table class="totals-table">
                        <tr><td>Subtotal</td><td>${escapeHtml(formatMoney(Number(snapshot.vat_subtotal || 0)))}</td></tr>
                        <tr><td>IVA</td><td>${escapeHtml(formatMoney(Number(snapshot.vat_amount || 0)))}</td></tr>
                        <tr class="grand"><td>Total</td><td>${escapeHtml(formatMoney(Number(snapshot.total || 0)))}</td></tr>
                    </table>
                </div>
                ${notesHtml}
                <div class="footer">
                    Esta cotización es informativa y no descuenta inventario ni genera pedido hasta confirmar la venta.
                </div>
            </div>
        </body>
        </html>`
}

const buildLocalSaleQuotationResult = (quotation: AdminLocalQuotation): LocalSaleQuotationResult => ({
    status: 'success',
    quoteId: quotation.id,
    message: quotation.email_delivery?.requested && quotation.email_delivery?.sent
        ? `Cotización generada correctamente con código ${quotation.id} y enviada al correo del cliente.`
        : `Cotización generada correctamente con código ${quotation.id}.`,
    customerName: quotation.customer_name,
    documentNumber: quotation.customer_document_number || null,
    total: Number(quotation.quote_snapshot?.total ?? 0),
    itemCount: Number(quotation.item_count ?? quotation.items.length ?? 0),
    units: Number(quotation.units ?? quotation.items.reduce((acc, item) => acc + Number(item.quantity || 0), 0)),
    createdAt: quotation.created_at,
    printable: true,
    emailSent: Boolean(quotation.email_delivery?.sent),
    emailMessage: quotation.email_delivery?.message || null,
    whatsappPrepared: false,
    whatsappMessage: null,
})

const toFinancialNumber = (value: unknown): number => {
    const number = Number(value ?? 0)
    return Number.isFinite(number) ? number : 0
}

const percentOf = (value: number, base: number): number => (base > 0 ? (value / base) * 100 : 0)

const trendPeriodExpenses = (row: FinancialTrendPoint): number => (
    toFinancialNumber(row.period_expenses ?? row.expenses_incurred ?? row.committed_expenses)
)

const trendPaidExpenses = (row: FinancialTrendPoint): number => (
    toFinancialNumber(row.expenses_cash_paid ?? row.expenses_paid)
)

const trendNetPeriodProfit = (row: FinancialTrendPoint): number => (
    toFinancialNumber(row.net_period_profit ?? row.net_committed_profit ?? (
        toFinancialNumber(row.gross_profit) - trendPeriodExpenses(row) - toFinancialNumber(row.financial_adjustments)
    ))
)

const trendNetCashProfit = (row: FinancialTrendPoint): number => (
    toFinancialNumber(row.net_cash_profit ?? (
        toFinancialNumber(row.gross_profit) - trendPaidExpenses(row) - toFinancialNumber(row.financial_adjustments)
    ))
)

const hasFinancialTrendActivity = (row: FinancialTrendPoint): boolean => (
    toFinancialNumber(row.gross_sales) !== 0
    || toFinancialNumber(row.net_sales) !== 0
    || toFinancialNumber(row.product_cost) !== 0
    || trendPeriodExpenses(row) !== 0
    || trendPaidExpenses(row) !== 0
    || toFinancialNumber(row.expenses_pending) !== 0
    || toFinancialNumber(row.expenses_overdue) !== 0
    || toFinancialNumber(row.financial_adjustments) !== 0
)

const summarizeReportFinancialRows = (
    rows: FinancialTrendPoint[],
    fallbackSalesSummary: any,
    fallbackProfitStats: any,
    scopeLabel: string,
): ReportFinancialSummary => {
    const sourceRows = Array.isArray(rows) ? rows : []

    if (sourceRows.length === 0) {
        const gross = toFinancialNumber(fallbackSalesSummary?.gross)
        const net = toFinancialNumber(fallbackSalesSummary?.net)
        const vat = toFinancialNumber(fallbackSalesSummary?.vat)
        const shipping = toFinancialNumber(fallbackSalesSummary?.shipping)
        const cost = toFinancialNumber(fallbackProfitStats?.cost)
        const grossProfit = toFinancialNumber(fallbackProfitStats?.gross_profit ?? fallbackProfitStats?.profit)
        const periodExpenses = toFinancialNumber(fallbackProfitStats?.period_expenses ?? fallbackProfitStats?.operating_expenses)
        const paidExpenses = toFinancialNumber(fallbackProfitStats?.paid_expenses)
        const pendingExpenses = toFinancialNumber(fallbackProfitStats?.pending_expenses)
        const overdueExpenses = toFinancialNumber(fallbackProfitStats?.overdue_expenses)
        const financialAdjustments = toFinancialNumber(fallbackProfitStats?.financial_adjustments)
        const netProfit = toFinancialNumber(fallbackProfitStats?.net_profit ?? fallbackProfitStats?.net_period_profit ?? (grossProfit - periodExpenses - financialAdjustments))
        const flowProfit = toFinancialNumber(fallbackProfitStats?.net_cash_profit ?? (grossProfit - paidExpenses - financialAdjustments))
        return {
            scopeLabel,
            ordersCount: toFinancialNumber(fallbackSalesSummary?.orders_count),
            gross,
            net,
            vat,
            shipping,
            cost,
            grossProfit,
            periodExpenses,
            paidExpenses,
            pendingExpenses,
            overdueExpenses,
            financialAdjustments,
            netProfit,
            flowProfit,
            grossMargin: toFinancialNumber(fallbackProfitStats?.gross_margin ?? fallbackProfitStats?.margin ?? percentOf(grossProfit, net)),
            netMargin: toFinancialNumber(fallbackProfitStats?.net_margin ?? fallbackProfitStats?.net_period_margin ?? percentOf(netProfit, net)),
            flowMargin: toFinancialNumber(fallbackProfitStats?.net_cash_margin ?? percentOf(flowProfit, net)),
            roi: toFinancialNumber(fallbackProfitStats?.roi ?? percentOf(grossProfit, cost)),
            netRoi: toFinancialNumber(fallbackProfitStats?.net_roi ?? percentOf(netProfit, cost + periodExpenses + Math.abs(financialAdjustments))),
            flowRoi: toFinancialNumber(fallbackProfitStats?.cash_net_roi ?? percentOf(flowProfit, cost + paidExpenses + Math.abs(financialAdjustments))),
            averageOrderNet: toFinancialNumber(fallbackSalesSummary?.average_order_net),
        }
    }

    const totals = sourceRows.reduce((acc, row) => {
        acc.ordersCount += toFinancialNumber(row.orders_count)
        acc.gross += toFinancialNumber(row.gross_sales)
        acc.net += toFinancialNumber(row.net_sales)
        acc.vat += toFinancialNumber(row.tax_collected)
        acc.shipping += toFinancialNumber(row.shipping_collected)
        acc.cost += toFinancialNumber(row.product_cost)
        acc.grossProfit += toFinancialNumber(row.gross_profit)
        acc.periodExpenses += trendPeriodExpenses(row)
        acc.paidExpenses += trendPaidExpenses(row)
        acc.pendingExpenses += toFinancialNumber(row.expenses_pending)
        acc.overdueExpenses += toFinancialNumber(row.expenses_overdue)
        acc.financialAdjustments += toFinancialNumber(row.financial_adjustments)
        acc.netProfit += trendNetPeriodProfit(row)
        acc.flowProfit += trendNetCashProfit(row)
        return acc
    }, {
        ordersCount: 0,
        gross: 0,
        net: 0,
        vat: 0,
        shipping: 0,
        cost: 0,
        grossProfit: 0,
        periodExpenses: 0,
        paidExpenses: 0,
        pendingExpenses: 0,
        overdueExpenses: 0,
        financialAdjustments: 0,
        netProfit: 0,
        flowProfit: 0,
    })

    return {
        ...totals,
        scopeLabel,
        grossMargin: percentOf(totals.grossProfit, totals.net),
        netMargin: percentOf(totals.netProfit, totals.net),
        flowMargin: percentOf(totals.flowProfit, totals.net),
        roi: percentOf(totals.grossProfit, totals.cost),
        netRoi: percentOf(totals.netProfit, totals.cost + totals.periodExpenses + Math.abs(totals.financialAdjustments)),
        flowRoi: percentOf(totals.flowProfit, totals.cost + totals.paidExpenses + Math.abs(totals.financialAdjustments)),
        averageOrderNet: totals.ordersCount > 0 ? totals.net / totals.ordersCount : 0,
    }
}

const summarizeReportPeriod = (
    report: ReportPeriodSummary | null | undefined,
    scopeLabel: string,
): ReportFinancialSummary | null => {
    if (!report) return null
    const sales = report.sales ?? {}
    const profit = report.profit ?? {}
    const gross = toFinancialNumber(sales.total)
    const net = toFinancialNumber(sales.net)
    const cost = toFinancialNumber(profit.cost)
    const grossProfit = toFinancialNumber(profit.gross_profit)
    const periodExpenses = toFinancialNumber(profit.period_expenses)
    const paidExpenses = toFinancialNumber(profit.paid_expenses)
    const financialAdjustments = toFinancialNumber(profit.financial_adjustments)
    const netProfit = toFinancialNumber(profit.net_period_profit ?? profit.net_committed_profit ?? (grossProfit - periodExpenses - financialAdjustments))
    const flowProfit = toFinancialNumber(profit.net_cash_profit ?? (grossProfit - paidExpenses - financialAdjustments))

    return {
        scopeLabel,
        ordersCount: toFinancialNumber(sales.orders_count),
        gross,
        net,
        vat: toFinancialNumber(sales.tax),
        shipping: toFinancialNumber(sales.shipping),
        cost,
        grossProfit,
        periodExpenses,
        paidExpenses,
        pendingExpenses: toFinancialNumber(profit.pending_expenses),
        overdueExpenses: toFinancialNumber(profit.overdue_expenses),
        financialAdjustments,
        netProfit,
        flowProfit,
        grossMargin: toFinancialNumber(profit.gross_margin ?? percentOf(grossProfit, net)),
        netMargin: toFinancialNumber(profit.net_period_margin ?? profit.net_committed_margin ?? percentOf(netProfit, net)),
        flowMargin: toFinancialNumber(profit.net_cash_margin ?? percentOf(flowProfit, net)),
        roi: percentOf(grossProfit, cost),
        netRoi: percentOf(netProfit, cost + periodExpenses + Math.abs(financialAdjustments)),
        flowRoi: percentOf(flowProfit, cost + paidExpenses + Math.abs(financialAdjustments)),
        averageOrderNet: toFinancialNumber(sales.orders_count) > 0 ? net / toFinancialNumber(sales.orders_count) : 0,
    }
}

const emptyFinancialSummary = (scopeLabel: string): ReportFinancialSummary => ({
    scopeLabel,
    ordersCount: 0,
    gross: 0,
    net: 0,
    vat: 0,
    shipping: 0,
    cost: 0,
    grossProfit: 0,
    periodExpenses: 0,
    paidExpenses: 0,
    pendingExpenses: 0,
    overdueExpenses: 0,
    financialAdjustments: 0,
    netProfit: 0,
    flowProfit: 0,
    grossMargin: 0,
    netMargin: 0,
    flowMargin: 0,
    roi: 0,
    netRoi: 0,
    flowRoi: 0,
    averageOrderNet: 0,
})

const summarizeDashboardTrendRows = (
    rows: Array<{ total?: number; gross?: number; cost?: number }>,
    fullSummary: ReportFinancialSummary,
    scopeLabel: string,
): ReportFinancialSummary | null => {
    const sourceRows = Array.isArray(rows) ? rows : []
    if (sourceRows.length === 0) return null

    const gross = sourceRows.reduce((sum, row) => sum + toFinancialNumber(row.gross), 0)
    const net = sourceRows.reduce((sum, row) => sum + toFinancialNumber(row.total), 0)
    const cost = sourceRows.reduce((sum, row) => sum + toFinancialNumber(row.cost), 0)
    if (gross === 0 && net === 0 && cost === 0) return emptyFinancialSummary(scopeLabel)

    const grossProfit = gross - cost
    const ratio = fullSummary.gross > 0 ? Math.min(1, Math.max(0, gross / fullSummary.gross)) : 0
    const netDiv = net > 0 ? net : (gross || 1)
    const estimatedPeriodExpenses = fullSummary.periodExpenses * ratio
    const estimatedPaidExpenses = fullSummary.paidExpenses * ratio
    const estimatedFinancialAdjustments = fullSummary.financialAdjustments * ratio
    const ordersCount = Math.max(Math.round(fullSummary.ordersCount * ratio), 0)
    const netProfit = grossProfit - estimatedPeriodExpenses - estimatedFinancialAdjustments
    const flowProfit = grossProfit - estimatedPaidExpenses - estimatedFinancialAdjustments

    return {
        scopeLabel,
        ordersCount,
        gross,
        net,
        vat: fullSummary.vat * ratio,
        shipping: fullSummary.shipping * ratio,
        cost,
        grossProfit,
        periodExpenses: estimatedPeriodExpenses,
        paidExpenses: estimatedPaidExpenses,
        pendingExpenses: fullSummary.pendingExpenses * ratio,
        overdueExpenses: fullSummary.overdueExpenses * ratio,
        financialAdjustments: estimatedFinancialAdjustments,
        netProfit,
        flowProfit,
        grossMargin: (grossProfit / netDiv) * 100,
        netMargin: (netProfit / netDiv) * 100,
        flowMargin: (flowProfit / netDiv) * 100,
        roi: cost > 0 ? (grossProfit / cost) * 100 : 0,
        netRoi: (cost + estimatedPeriodExpenses + Math.abs(estimatedFinancialAdjustments)) > 0
            ? (netProfit / (cost + estimatedPeriodExpenses + Math.abs(estimatedFinancialAdjustments))) * 100
            : 0,
        flowRoi: (cost + estimatedPaidExpenses + Math.abs(estimatedFinancialAdjustments)) > 0
            ? (flowProfit / (cost + estimatedPaidExpenses + Math.abs(estimatedFinancialAdjustments))) * 100
            : 0,
        averageOrderNet: ordersCount > 0 ? net / ordersCount : 0,
    }
}

const UsersManagementPanel = dynamic(() => import('./components/UsersManagementPanel'), {
    ssr: false,
})
const PanelModals = dynamic(() => import('./components/PanelModals'), {
    ssr: false,
})
const PricingSettingsPanel = dynamic(() => import('./components/PricingSettingsPanel'), {
    ssr: false,
})
const StoreStatusPanel = dynamic(() => import('./components/StoreStatusPanel'), {
    ssr: false,
})
const BalancesPanel = dynamic(() => import('./components/BalancesPanel'), {
    ssr: false,
})
const CustomerOrdersPanel = dynamic(() => import('./components/CustomerOrdersPanel'), {
    ssr: false,
})
const ProductPageSettingsPanel = dynamic(() => import('./components/ProductPageSettingsPanel'), {
    ssr: false,
})
const ProductReferenceDataPanel = dynamic(() => import('./components/ProductReferenceDataPanel'), {
    ssr: false,
})
const AdminAlertsTab = dynamic(() => import('./components/AdminAlertsTab'), {
    ssr: false,
})
const CustomerDashboardTab = dynamic(() => import('./components/CustomerDashboardTab'), {
    ssr: false,
})
const AdminOrdersPanel = dynamic(() => import('./components/AdminOrdersPanel'), {
    ssr: false,
})
const ShipmentsPanel = dynamic(() => import('./components/ShipmentsPanel'), {
    ssr: false,
})
const InventoryManagementPanel = dynamic(() => import('./components/InventoryManagementPanel'), {
    ssr: false,
})
const LowStockDetailModal = dynamic(() => import('./components/LowStockDetailModal'), {
    ssr: false,
})
const DiscountCodesPanel = dynamic(() => import('./components/DiscountCodesPanel'), {
    ssr: false,
})
const BusinessExpensesPanel = dynamic(() => import('./components/BusinessExpensesPanel'), {
    ssr: false,
})
const FinancialTrendsPanel = dynamic(() => import('./components/FinancialTrendsPanel'), {
    ssr: false,
})
const LocalSalesPanel = dynamic(() => import('./components/LocalSalesPanel'), {
    ssr: false,
})
const QuotationsPanel = dynamic(() => import('./components/QuotationsPanel'), {
    ssr: false,
})
const ProductsManagementPanel = dynamic(() => import('./components/ProductsManagementPanel'), {
    ssr: false,
})

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

type BusinessExpenseFilters = {
    status: string
    category: string
    period: string
    from: string
    to: string
}

const createDefaultBusinessExpenseFilters = (): BusinessExpenseFilters => ({
    status: 'all',
    category: 'all',
    period: '',
    from: '',
    to: '',
})

const createEmptyDiscountForm = (): DiscountFormState => ({
    code: '',
    name: '',
    description: '',
    type: 'percent',
    value: '',
    minSubtotal: '0',
    maxDiscount: '',
    maxUses: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
})

const formatDashboardTrendLabel = (
    point: { day?: string; date?: string },
    options: Intl.DateTimeFormatOptions,
) => {
    const rawDate = String(point.date || point.day || '').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        return formatDateEcuador(rawDate, options)
    }
    return String(point.day || '-')
}

const getReportDeliveryMethodLabel = (method?: string | null) => {
    const normalized = String(method || '').trim().toLowerCase()
    if (normalized === 'pickup') return 'Retiro en tienda'
    if (normalized === 'delivery') return 'Envío a domicilio'
    return normalized ? String(method) : 'Por definir'
}

const getReportPaymentMethodLabel = (method?: string | null) => {
    const raw = String(method || '').trim()
    if (!raw) return 'Por definir'
    const label = getLocalSalePaymentMethodLabel(raw)
    return label === 'Otro' ? raw : label
}

const getReportCustomerDocument = (order: {
    customer_document_type?: string | null
    customer_document_number?: string | null
}) => {
    const type = String(order.customer_document_type || '').trim()
    const number = String(order.customer_document_number || '').trim()
    return [type, number].filter(Boolean).join(' ') || '-'
}

const mapDiscountToForm = (discount?: AdminDiscountCode | null): DiscountFormState => {
    if (!discount) return createEmptyDiscountForm()
    const toDateTimeInput = (value?: string | null) => {
        if (!value) return ''
        const normalized = String(value).replace(' ', 'T')
        return normalized.slice(0, 16)
    }
    return {
        code: String(discount.code || ''),
        name: String(discount.name || ''),
        description: String(discount.description || ''),
        type: discount.type === 'fixed' ? 'fixed' : 'percent',
        value: String(discount.value ?? ''),
        minSubtotal: String(discount.min_subtotal ?? 0),
        maxDiscount: discount.max_discount === null || discount.max_discount === undefined ? '' : String(discount.max_discount),
        maxUses: discount.max_uses === null || discount.max_uses === undefined ? '' : String(discount.max_uses),
        startsAt: toDateTimeInput(discount.starts_at),
        endsAt: toDateTimeInput(discount.ends_at),
        isActive: Boolean(discount.is_active),
    }
}

const parseDiscountNumber = (value: unknown, fallback = 0, min = 0, max?: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    const clamped = Math.max(min, parsed)
    if (typeof max === 'number') return Math.min(clamped, max)
    return clamped
}

const buildDiscountPayload = (input: DiscountFormState): AdminDiscountPayload => {
    const code = input.code.trim().toUpperCase()
    const name = input.name.trim()
    const description = input.description.trim()
    const startsAt = input.startsAt ? input.startsAt : null
    const endsAt = input.endsAt ? input.endsAt : null
    return {
        code,
        type: input.type,
        value: parseDiscountNumber(input.value, 0, 0.01),
        name: name || null,
        description: description || null,
        min_subtotal: parseDiscountNumber(input.minSubtotal, 0, 0),
        max_discount: input.maxDiscount === '' ? null : parseDiscountNumber(input.maxDiscount, 0, 0),
        max_uses: input.maxUses === '' ? null : Math.max(1, Math.round(parseDiscountNumber(input.maxUses, 1, 1))),
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: Boolean(input.isActive),
    }
}

const MyAccount = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<string | undefined>('dashboard')
    const [activeAddress, setActiveAddress] = useState<'shipping' | 'billing' | null>('shipping')
    const [activeOrders, setActiveOrders] = useState<string | undefined>('all')
    const [authBootstrapping, setAuthBootstrapping] = useState(true)
    const [user, setUser] = useState<{ id: string, name: string, email: string, role?: 'customer' | 'admin' } | null>(null)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    // Address management
    const [savedAddresses, setSavedAddresses] = useState<SavedAddressEntry[]>([
        createEmptySavedAddressEntry('Dirección principal')
    ])
    const [currentAddrIndex, setCurrentAddrIndex] = useState(0)
    const [addressSaving, setAddressSaving] = useState(false)
    const [addressLoading, setAddressLoading] = useState(false)
    const [profileSaving, setProfileSaving] = useState(false)
    const [profileLoading, setProfileLoading] = useState(false)
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        gender: '',
        birth: '',
        documentType: '',
        documentNumber: '',
        businessName: ''
    })
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    // Admin Data State
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
    const [inventoryIntelligenceState, setInventoryIntelligence] = useState<InventoryIntelligence | null>(null)
    const [trendRange, setTrendRange] = useState<'day' | 'week' | 'month' | 'all'>('week')
    const [trendMetric, setTrendMetric] = useState<'gross' | 'profit'>('gross')
    const [salesRankingView, setSalesRankingView] = useState<SalesReportView>('month')
    const [salesRankingMonth, setSalesRankingMonth] = useState<string>(getCurrentMonthKey())
    const [salesRankingDate, setSalesRankingDate] = useState<string>(getEcuadorTodayKey)
    const [financialTrendMode, setFinancialTrendMode] = useState<FinancialTrendRangeMode>('monthly')
    const [financialTrendScope, setFinancialTrendScope] = useState<FinancialTrendSummaryScope>('selected')
    const [selectedFinancialPeriod, setSelectedFinancialPeriod] = useState('')
    const [salesOrderSearch, setSalesOrderSearch] = useState('')
    const [salesOrderStatusFilter, setSalesOrderStatusFilter] = useState<'all' | 'completed' | 'delivered'>('all')
    const [adminReportSection, setAdminReportSection] = useState<AdminReportSection>('general')
    const [selectedDeepDive, setSelectedDeepDive] = useState<DeepDiveView | null>(null)
    const [selectedProductMetric, setSelectedProductMetric] = useState<ProductDetailMetric>('net')
    const [adminDataLoading, setAdminDataLoading] = useState(false)
    const [adminDataError, setAdminDataError] = useState<string | null>(null)
    const [adminReloadNonce, setAdminReloadNonce] = useState(0)
    const [passiveRefreshNonce, setPassiveRefreshNonce] = useState(0)
    const [adminOrdersList, setAdminOrdersList] = useState<Order[]>([])
    const [billingRidePdfs, setBillingRidePdfs] = useState<BillingRidePdf[]>([])
    const [billingRideLoading, setBillingRideLoading] = useState(false)
    const [billingRideReissueAccessKey, setBillingRideReissueAccessKey] = useState<string | null>(null)
    const [businessExpenses, setBusinessExpenses] = useState<BusinessExpense[]>([])
    const [businessExpenseRecurrences, setBusinessExpenseRecurrences] = useState<BusinessExpenseRecurrence[]>([])
    const [businessExpenseSummary, setBusinessExpenseSummary] = useState<BusinessExpenseSummary | null>(null)
    const [businessExpenseCategories, setBusinessExpenseCategories] = useState<string[]>([])
    const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([])
    const [financialAdjustments, setFinancialAdjustments] = useState<FinancialAdjustment[]>([])
    const [currentFinancialPeriod, setCurrentFinancialPeriod] = useState<FinancialPeriod | null>(null)
    const [businessExpenseFilters, setBusinessExpenseFilters] = useState<BusinessExpenseFilters>(createDefaultBusinessExpenseFilters)
    const [businessExpensesLoading, setBusinessExpensesLoading] = useState(false)
    const [businessExpenseSaving, setBusinessExpenseSaving] = useState(false)
    const [adminProductsList, setAdminProductsList] = useState<any[]>([])
    const [adminProductsSearch, setAdminProductsSearch] = useState('')
    const [pricingAnalysisSearch, setPricingAnalysisSearch] = useState('')
    const [adminProductsQuickFilter, setAdminProductsQuickFilter] = useState<'all' | 'publishable' | 'blocked' | 'with-stock' | 'no-stock' | 'no-price'>('all')
    const [adminProductsCategoryFilter, setAdminProductsCategoryFilter] = useState('all')
    const [adminProductsSupplierFilter, setAdminProductsSupplierFilter] = useState('all')
    const [adminProductsBrandFilter, setAdminProductsBrandFilter] = useState('all')
    const [adminProductsSpeciesFilter, setAdminProductsSpeciesFilter] = useState('all')
    const [adminProductsTaxFilter, setAdminProductsTaxFilter] = useState<'all' | 'taxed' | 'exempt'>('all')
    const [productPublicationPendingIds, setProductPublicationPendingIds] = useState<Record<string, boolean>>({})
    const [adminUsersList, setAdminUsersList] = useState<AdminUserSummary[]>([])
    const [adminUsersSearch, setAdminUsersSearch] = useState('')
    const [adminUsersRoleFilter, setAdminUsersRoleFilter] = useState<'all' | 'clients' | 'admins'>('all')
    const [inventorySearch, setInventorySearch] = useState('')
    const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'available' | 'low' | 'critical' | 'out' | 'expiring' | 'expired'>('all')
    const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'all' | 'perishable' | 'nonperishable'>('all')
    const [inventoryDetailModal, setInventoryDetailModal] = useState<'low' | 'critical' | 'out' | 'expiring' | 'expired' | null>(null)
    const [inventoryExpandedSection, setInventoryExpandedSection] = useState<'out' | 'critical' | 'low' | 'expiring' | 'expired' | null>(null)
    const [alertsSeverityFilter, setAlertsSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
    const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([])
    const [shippingPickups, setShippingPickups] = useState<ShippingPickup[]>([])
    const [recentPurchaseInvoices, setRecentPurchaseInvoices] = useState<PurchaseInvoiceSummary[]>([])
    const [purchaseInvoicesLoading, setPurchaseInvoicesLoading] = useState(false)
    const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState<PurchaseInvoiceDetail | null>(null)
    const [purchaseInvoiceDetailLoading, setPurchaseInvoiceDetailLoading] = useState(false)
    const [isPurchaseInvoiceModalOpen, setIsPurchaseInvoiceModalOpen] = useState(false)
    const [selectedProductProcurementDetail, setSelectedProductProcurementDetail] = useState<ProductProcurementDetail | null>(null)
    const [productProcurementDetailLoading, setProductProcurementDetailLoading] = useState(false)
    const [isProductProcurementModalOpen, setIsProductProcurementModalOpen] = useState(false)
    const [selectedProductPurchaseReportId, setSelectedProductPurchaseReportId] = useState<string | null>(null)
    const [selectedProductPurchaseReportDetail, setSelectedProductPurchaseReportDetail] = useState<ProductProcurementDetail | null>(null)
    const [productPurchaseReportDetailLoading, setProductPurchaseReportDetailLoading] = useState(false)
    const [productPurchaseReportDetailError, setProductPurchaseReportDetailError] = useState<string | null>(null)
    const [productPurchaseReportDetailCache, setProductPurchaseReportDetailCache] = useState<Record<string, ProductProcurementDetail>>({})
    const [vatRate, setVatRate] = useState<number>(0)
    const [vatCreditCurrentRate, setVatCreditCurrentRate] = useState<number>(60)
    const [vatCreditCarryforwardRate, setVatCreditCarryforwardRate] = useState<number>(40)
    const [vatLoading, setVatLoading] = useState(false)
    const [vatSaving, setVatSaving] = useState(false)
    const [shippingRates, setShippingRates] = useState<{
        delivery: number
        pickup: number
        taxRate: number
        storeAddress: string
        storeLatitude: number
        storeLongitude: number
        freeShippingRadiusKm: number
        shippingKmFlatRateLimit: number
        shippingPerKmRate: number
        mapMinSearchChars: number
        mapLookupCooldownSeconds: number
        mapSessionLookupLimit: number
    }>({
        delivery: 0,
        pickup: 0,
        taxRate: 0,
        storeAddress: 'Av. de la Prensa y Juan Paz y Miño, 170104 Quito',
        storeLatitude: -0.148306,
        storeLongitude: -78.490870,

        freeShippingRadiusKm: 5,
        shippingKmFlatRateLimit: 7,
        shippingPerKmRate: 1,
        mapMinSearchChars: 6,
        mapLookupCooldownSeconds: 3,
        mapSessionLookupLimit: 12,
    })
    const [shippingLoading, setShippingLoading] = useState(false)
    const [shippingSaving, setShippingSaving] = useState(false)
    const [marginSettings, setMarginSettings] = useState<PricingMargins>({ baseMargin: 30, minMargin: 15, targetMargin: 35, promoBuffer: 5 })
    const [calcSettings, setCalcSettings] = useState<PricingCalc>({ rounding: 0.05, strategy: 'cost_plus', includeVatInPvp: true, shippingBuffer: 0 })
    const [pricingRules, setPricingRules] = useState<PricingRules>({ bulkThreshold: 10, bulkDiscount: 5, clearanceThreshold: 25, clearanceDiscount: 15 })
    const [discountCodes, setDiscountCodes] = useState<AdminDiscountCode[]>([])
    const [discountAuditRows, setDiscountAuditRows] = useState<AdminDiscountAuditRow[]>([])
    const [discountCodesLoading, setDiscountCodesLoading] = useState(false)
    const [discountFormSaving, setDiscountFormSaving] = useState(false)
    const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null)
    const [discountForm, setDiscountForm] = useState<DiscountFormState>(createEmptyDiscountForm())
    const [productPageSettings, setProductPageSettings] = useState<ProductPageSettings>({
        deliveryEstimate: '14 de enero - 18 de enero',
        viewerCount: 38,
        freeShippingThreshold: 75,
        supportHours: '8:30 AM a 10:00 PM',
        returnDays: 100
    })
    const [productReferenceData, setProductReferenceData] = useState<ProductReferenceData>(createEmptyProductReferenceData())
    const [productReferenceDataLoading, setProductReferenceDataLoading] = useState(false)
    const [productReferenceDataSaving, setProductReferenceDataSaving] = useState(false)
    const [storeStatus, setStoreStatus] = useState<StoreStatusSettings>({
        salesEnabled: true,
        message: DEFAULT_STORE_PAUSE_MESSAGE,
        updatedAt: null,
        updatedBy: null
    })
    const [storeStatusLoading, setStoreStatusLoading] = useState(false)
    const [storeStatusSaving, setStoreStatusSaving] = useState(false)
    const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
        customerSessionHours: 6,
        adminSessionHours: 12,
        minCustomerSessionHours: 6,
        minAdminSessionHours: 12,
        maxSessionHours: 168,
    })
    const [sessionSettingsLoading, setSessionSettingsLoading] = useState(false)
    const [sessionSettingsSaving, setSessionSettingsSaving] = useState(false)
    const [localSaleSearch, setLocalSaleSearch] = useState('')
    const [localSaleDiscountCode, setLocalSaleDiscountCode] = useState('')
    const [localSalePaymentMethod, setLocalSalePaymentMethod] = useState('cash')
    const [localSaleCustomerName, setLocalSaleCustomerName] = useState('')
    const [localSaleCustomerPhone, setLocalSaleCustomerPhone] = useState('')
    const [localSaleCustomerEmail, setLocalSaleCustomerEmail] = useState('')
    const [localSaleQuoteSendEmail, setLocalSaleQuoteSendEmail] = useState(true)
    const [localSaleQuoteSendWhatsApp, setLocalSaleQuoteSendWhatsApp] = useState(false)
    const [localSaleCustomerStreet, setLocalSaleCustomerStreet] = useState('')
    const [localSaleCustomerCity, setLocalSaleCustomerCity] = useState('')
    const [localSaleCustomerDocumentType, setLocalSaleCustomerDocumentType] = useState<'cedula' | 'ruc' | 'pasaporte' | 'consumidor_final'>('cedula')
    const [localSaleCustomerDocumentNumber, setLocalSaleCustomerDocumentNumber] = useState('')
    const [localSaleNotes, setLocalSaleNotes] = useState('')
    const [localSaleItems, setLocalSaleItems] = useState<LocalSaleLineItem[]>([])
    const [localSaleQuote, setLocalSaleQuote] = useState<LocalSaleQuote | null>(null)
    const [localSaleQuoteLoading, setLocalSaleQuoteLoading] = useState(false)
    const [localSaleSaving, setLocalSaleSaving] = useState(false)
    const [localSaleError, setLocalSaleError] = useState<string | null>(null)
    const [localSalePaymentReference, setLocalSalePaymentReference] = useState('')
    const [localSaleCashReceived, setLocalSaleCashReceived] = useState('')
    const [localSaleElectronicAmount, setLocalSaleElectronicAmount] = useState('')
    const [localSaleAutoPrint, setLocalSaleAutoPrint] = useState(true)
    const [localSaleLastOrderId, setLocalSaleLastOrderId] = useState<string | null>(null)
    const [localSaleLastSubmission, setLocalSaleLastSubmission] = useState<LocalSaleSubmissionResult | null>(null)
    const [localSaleLastQuotation, setLocalSaleLastQuotation] = useState<LocalSaleQuotationResult | null>(null)
    const [localSaleLastQuotationHtml, setLocalSaleLastQuotationHtml] = useState<string | null>(null)
    const [localSaleQuoteHistory, setLocalSaleQuoteHistory] = useState<AdminLocalQuotation[]>([])
    const [localSaleQuoteHistoryLoading, setLocalSaleQuoteHistoryLoading] = useState(false)
    const [localSaleSelectedQuotationId, setLocalSaleSelectedQuotationId] = useState<string | null>(null)
    const [localSaleCustomerLookupLoading, setLocalSaleCustomerLookupLoading] = useState(false)
    const [localSaleCustomerLookupMessage, setLocalSaleCustomerLookupMessage] = useState<string | null>(null)
    // Modal & Form State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<any | null>(null)
    const [productEditorMode, setProductEditorMode] = useState<ProductEditorMode>('create')
    const [productEditorInitialForm, setProductEditorInitialForm] = useState<ProductFormState>(createEmptyProductForm())
    const [productPublicationFilter, setProductPublicationFilter] = useState<ProductPublicationFilter>('all')

    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
    const [selectedSalesProduct, setSelectedSalesProduct] = useState<SalesRankingRow | null>(null)
    const [isSalesProductModalOpen, setIsSalesProductModalOpen] = useState(false)
    const [userOrders, setUserOrders] = useState<Order[]>([])
    const [userOrdersLoading, setUserOrdersLoading] = useState(false)
    const [, startPanelNavigationTransition] = React.useTransition()
    const deferredAdminUsersSearch = React.useDeferredValue(adminUsersSearch)
    const deferredInventorySearch = React.useDeferredValue(inventorySearch)
    const deferredLocalSaleSearch = React.useDeferredValue(localSaleSearch)
    const deferredPricingAnalysisSearch = React.useDeferredValue(pricingAnalysisSearch)

    const {
        adminMenuExpanded,
        focusedReferenceCatalogKey,
        navigateToPanelTab,
        openReferenceCatalog,
        navigateToReferenceCatalog,
        toggleAdminMenuGroup,
        openAdminReportSection,
    } = useAdminSidebarNavigation({
        userRole: user?.role,
        activeTab,
        searchParams,
        startPanelNavigationTransition,
        setActiveTab,
        setSelectedDeepDive,
        setAdminReportSection,
    })

    // Handlers
    const handleNewProduct = React.useCallback(() => {
        setEditingProduct(null)
        setProductEditorMode('create')
        setProductEditorInitialForm(createEmptyProductForm())
        setIsProductModalOpen(true)
    }, [])

    const handleEditProduct = React.useCallback((product: any) => {
        const rate = Number(dashboardStats?.tax?.rate ?? vatRate ?? 0)
        const multiplier = 1 + rate / 100
        setEditingProduct(product)
        setProductEditorMode('edit')
        setProductEditorInitialForm(createProductFormFromProduct(product, multiplier))
        setIsProductModalOpen(true)
    }, [dashboardStats?.tax?.rate, vatRate])

    const handleRestockProduct = React.useCallback((product: any) => {
        const rate = Number(dashboardStats?.tax?.rate ?? vatRate ?? 0)
        const multiplier = 1 + rate / 100
        setEditingProduct(product)
        setProductEditorMode('restock')
        setProductEditorInitialForm(createProductFormFromProduct(product, multiplier))
        setIsProductModalOpen(true)
    }, [dashboardStats?.tax?.rate, vatRate])

    const handleOpenDetailModal = React.useCallback((type: 'low' | 'critical' | 'out' | 'expiring' | 'expired') => {
        setInventoryDetailModal(type)
        setInventoryStatusFilter(type === 'critical' ? 'critical' : type === 'out' ? 'out' : type === 'expiring' ? 'expiring' : type === 'expired' ? 'expired' : 'low')
    }, [])

    const handleCloseDetailModal = React.useCallback(() => {
        setInventoryDetailModal(null)
    }, [])

    const handleViewDetailInTable = React.useCallback(() => {
        setInventoryDetailModal(null)
    }, [])

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('¿Retirar este producto del catálogo activo? Se ocultará de la tienda y conservará su historial.')) return;

        try {
            await requestApi(`/api/products/${id}`, {
                method: 'DELETE',
            });
            showNotification('Producto retirado correctamente');
            const res = await requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT);
            setAdminProductsList(normalizeAdminProducts(res.body));
            invalidateAdminPanelData();
        } catch (error) {
            console.error(error);
            showNotification('Error al eliminar producto', 'error');
        }
    }

    const handleOptimizePrice = async (product: any) => {
        if (!product.business?.suggestions?.recommended_price) return;

        const newPrice = product.business.suggestions.recommended_price;
        const productId = getAdminProductEntityId(product)
        if (!confirm(`¿Aplicar precio sugerido de $${newPrice}?`)) return;
        if (!productId) {
            showNotification('No se pudo resolver el identificador del producto.', 'error')
            return
        }

        try {
            await requestApi(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ price: newPrice })
            });
            showNotification(`Precio optimizado a $${newPrice}`);
            const res = await requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT);
            setAdminProductsList(normalizeAdminProducts(res.body));
            invalidateAdminPanelData();
        } catch (error) {
            console.error(error);
            showNotification('Error al optimizar precio', 'error');
        }
    }

    const handleViewOrder = async (orderId: string) => {
        try {
            const res = await requestApi<any>(`/api/orders/${orderId}`);
            setSelectedOrder(res.body);
            setIsOrderModalOpen(true);
        } catch (error) {
            console.error(error);
            showNotification('Error al cargar pedido', 'error');
        }
    }

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            await requestApi(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            showNotification(
                newStatus === 'canceled'
                    ? 'Pedido cancelado correctamente'
                    : newStatus === 'delivered'
                        ? 'Pedido entregado correctamente'
                        : 'Pedido actualizado correctamente'
            );
            setIsOrderModalOpen(false);
            if (user?.role === 'admin') {
                const res = await requestApi<Order[]>('/api/orders');
                setAdminOrdersList(res.body);
                invalidateAdminPanelData();
            } else {
                const res = await requestApi<Order[]>('/api/orders/my-orders');
                setUserOrders(res.body);
            }
        } catch (error: any) {
            console.error(error);
            if (error?.message && (error.message.includes('Error 401') || error.message.includes('No autorizado'))) {
                handleLogout();
                return;
            }
            showNotification('Error al actualizar el pedido', 'error');
        }
    }

    const showNotification = React.useCallback((text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 5000)
    }, [])

    const invalidateAdminPanelData = React.useCallback(() => {
        setAdminReloadNonce((prev) => prev + 1)
    }, [])

    const loadBillingRidePdfs = React.useCallback(async () => {
        setBillingRideLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<BillingRidePdf[]>('/api/admin/billing/rides?limit=150'))
            setBillingRidePdfs(Array.isArray(res.body) ? res.body : [])
        } catch (error) {
            console.error(error)
            showNotification('No se pudieron cargar los PDF RIDE del facturador.', 'error')
        } finally {
            setBillingRideLoading(false)
        }
    }, [showNotification])

    const openBillingRidePdf = React.useCallback((accessKey: string) => {
        const normalized = String(accessKey || '').replace(/\D/g, '')
        if (!normalized) {
            showNotification('La factura no tiene clave de acceso válida.', 'error')
            return
        }
        const openedWindow = window.open(toPublicApiUrl(`/api/admin/billing/rides/${encodeURIComponent(normalized)}/pdf`), '_blank')
        if (!openedWindow) {
            showNotification('Tu navegador bloqueó la apertura del PDF.', 'error')
        }
    }, [showNotification])

    const cancelAndReissueBillingRide = React.useCallback(async (ride: BillingRidePdf) => {
        const normalized = String(ride.access_key || '').replace(/\D/g, '')
        if (!normalized) {
            showNotification('La factura no tiene clave de acceso válida.', 'error')
            return
        }

        const sequential = [ride.establishment_code, ride.emission_point, ride.sequential].filter(Boolean).join('-') || normalized
        const reason = window.prompt(
            `Se anulará localmente la factura ${sequential} y se emitirá una nueva con los mismos datos de la venta. No se creará otra venta ni se recalcularán montos.\n\nMotivo de la reemisión:`,
            'Factura atascada en procesamiento SRI; anulada localmente y reemitida desde panel administrativo.'
        )
        if (reason === null) return

        const cleanReason = reason.trim()
        if (cleanReason.length < 12) {
            showNotification('Ingresa un motivo claro para anular y reemitir la factura.', 'error')
            return
        }

        const confirmation = window.prompt(
            `Esta acción puede generar un nuevo comprobante SRI para ${sequential}. Escribe REEMITIR para confirmar:`,
            ''
        )
        if (confirmation === null) return
        if (confirmation.trim() !== 'REEMITIR') {
            showNotification('Reemisión cancelada: confirmación inválida.', 'error')
            return
        }

        setBillingRideReissueAccessKey(normalized)
        try {
            await requestApi(`/api/admin/billing/rides/${encodeURIComponent(normalized)}/cancel-and-reissue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: cleanReason,
                    confirm_reissue: 'REEMITIR',
                    ambiente: ride.ambiente || undefined,
                }),
            })
            showNotification('Factura anulada localmente y reemitida. Revisa el nuevo registro generado.')
            await loadBillingRidePdfs()
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(error instanceof Error ? error.message : 'No se pudo anular y reemitir la factura.', 'error')
        } finally {
            setBillingRideReissueAccessKey(null)
        }
    }, [invalidateAdminPanelData, loadBillingRidePdfs, showNotification])

    const loadBusinessExpenses = React.useCallback(async (options?: { silent?: boolean }) => {
        if (!user || user.role !== 'admin') return
        const silent = options?.silent === true
        if (!silent) setBusinessExpensesLoading(true)
        try {
            const params = new URLSearchParams()
            if (businessExpenseFilters.status && businessExpenseFilters.status !== 'all') params.set('status', businessExpenseFilters.status)
            if (businessExpenseFilters.category && businessExpenseFilters.category !== 'all') params.set('category', businessExpenseFilters.category)
            if (businessExpenseFilters.period && /^\d{4}-(0[1-9]|1[0-2])$/.test(businessExpenseFilters.period)) params.set('period', businessExpenseFilters.period)
            if (businessExpenseFilters.from) params.set('from', businessExpenseFilters.from)
            if (businessExpenseFilters.to) params.set('to', businessExpenseFilters.to)
            const query = params.toString()
            const res = await withTransientRetry(() => requestApi<{
                expenses?: BusinessExpense[]
                summary?: BusinessExpenseSummary
                categories?: string[]
            }>(`/api/admin/expenses${query ? `?${query}` : ''}`))
            setBusinessExpenses(Array.isArray(res.body.expenses) ? res.body.expenses : [])
            setBusinessExpenseSummary(res.body.summary ?? null)
            setBusinessExpenseCategories(Array.isArray(res.body.categories) ? res.body.categories : [])
        } catch (error) {
            console.error(error)
            if (!silent) {
                showNotification('No se pudieron cargar los gastos del negocio.', 'error')
            }
        } finally {
            if (!silent) setBusinessExpensesLoading(false)
        }
    }, [businessExpenseFilters, showNotification, user])

    const loadBusinessExpenseRecurrences = React.useCallback(async (options?: { silent?: boolean }) => {
        if (!user || user.role !== 'admin') return
        const silent = options?.silent === true
        if (!silent) setBusinessExpensesLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<{
                recurrences?: BusinessExpenseRecurrence[]
                summary?: BusinessExpenseSummary
                categories?: string[]
            }>('/api/admin/expenses/recurrences'))
            setBusinessExpenseRecurrences(Array.isArray(res.body.recurrences) ? res.body.recurrences : [])
            if (res.body.summary) setBusinessExpenseSummary(res.body.summary)
            if (Array.isArray(res.body.categories)) setBusinessExpenseCategories(res.body.categories)
        } catch (error) {
            console.error(error)
            if (!silent) {
                showNotification('No se pudieron cargar los gastos recurrentes.', 'error')
            }
        } finally {
            if (!silent) setBusinessExpensesLoading(false)
        }
    }, [showNotification, user])

    const loadFinancialPeriods = React.useCallback(async (options?: { silent?: boolean }) => {
        if (!user || user.role !== 'admin') return
        const silent = options?.silent === true
        if (!silent) setBusinessExpensesLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<{
                current_period?: FinancialPeriod
                periods?: FinancialPeriod[]
                adjustments?: FinancialAdjustment[]
            }>('/api/admin/financial-periods'))
            setCurrentFinancialPeriod(res.body.current_period ?? null)
            setFinancialPeriods(Array.isArray(res.body.periods) ? res.body.periods : [])
            setFinancialAdjustments(Array.isArray(res.body.adjustments) ? res.body.adjustments : [])
        } catch (error) {
            console.error(error)
            if (!silent) {
                showNotification('No se pudieron cargar los cierres financieros.', 'error')
            }
        } finally {
            if (!silent) setBusinessExpensesLoading(false)
        }
    }, [showNotification, user])

    const reloadBusinessExpensesPanel = React.useCallback(async (silent = false) => {
        await Promise.all([
            loadBusinessExpenses({ silent }),
            loadBusinessExpenseRecurrences({ silent }),
            loadFinancialPeriods({ silent }),
        ])
    }, [loadBusinessExpenseRecurrences, loadBusinessExpenses, loadFinancialPeriods])

    const createBusinessExpense = React.useCallback(async (payload: Record<string, unknown>) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi('/api/admin/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            showNotification('Gasto registrado correctamente.')
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo registrar el gasto.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const createBusinessExpenseRecurrence = React.useCallback(async (payload: Record<string, unknown>) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi('/api/admin/expenses/recurrences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            showNotification('Gasto recurrente creado correctamente.')
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo crear el gasto recurrente.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const updateBusinessExpenseRecurrence = React.useCallback(async (recurrenceId: string, payload: Record<string, unknown>) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi(`/api/admin/expenses/recurrences/${encodeURIComponent(recurrenceId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            showNotification('Gasto recurrente actualizado correctamente.')
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo actualizar el gasto recurrente.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const deleteBusinessExpenseRecurrence = React.useCallback(async (recurrenceId: string) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi(`/api/admin/expenses/recurrences/${encodeURIComponent(recurrenceId)}`, {
                method: 'DELETE',
            })
            showNotification('Recurrencia eliminada. Los gastos ya registrados se conservaron.')
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo eliminar la recurrencia.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const updateBusinessExpenseStatus = React.useCallback(async (expenseId: string, status: BusinessExpenseStatus) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi(`/api/admin/expenses/${encodeURIComponent(expenseId)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            showNotification(status === 'paid' ? 'Gasto marcado como pagado.' : 'Estado del gasto actualizado.')
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo actualizar el gasto.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const toggleBusinessExpenseRecurrence = React.useCallback(async (recurrenceId: string, active: boolean) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi(`/api/admin/expenses/recurrences/${encodeURIComponent(recurrenceId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active }),
            })
            showNotification(active ? 'Recurrencia activada.' : 'Recurrencia pausada.')
            await reloadBusinessExpensesPanel(true)
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo actualizar la recurrencia.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [reloadBusinessExpensesPanel, showNotification])

    const closeFinancialPeriod = React.useCallback(async (periodKey: string, notes: string) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi(`/api/admin/financial-periods/${encodeURIComponent(periodKey)}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes }),
            })
            showNotification(`Período ${periodKey} cerrado correctamente.`)
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo cerrar el período financiero.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const previewFinancialPeriod = React.useCallback(async (periodKey: string) => {
        const res = await requestApi<FinancialPeriodPreview>(`/api/admin/financial-periods/${encodeURIComponent(periodKey)}/preview`)
        return res.body
    }, [])

    const createFinancialAdjustment = React.useCallback(async (payload: Record<string, unknown>) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi('/api/admin/financial-adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            showNotification('Ajuste financiero registrado correctamente.')
            await reloadBusinessExpensesPanel(true)
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo registrar el ajuste financiero.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, showNotification])

    const createHistoricalSale = React.useCallback(async (payload: Record<string, unknown>) => {
        setBusinessExpenseSaving(true)
        try {
            await requestApi('/api/admin/historical-sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            showNotification('Venta histórica registrada correctamente.')
            await Promise.allSettled([
                reloadBusinessExpensesPanel(true),
                requestApi<Order[]>('/api/orders').then((res) => setAdminOrdersList(res.body)),
                requestApi<DashboardStats>(`/api/admin/dashboard/stats${/^\d{4}-(0[1-9]|1[0-2])$/.test(salesRankingMonth) ? `?period=${encodeURIComponent(salesRankingMonth)}&include_report=0` : '?include_report=0'}`).then((res) => setDashboardStats(res.body)),
            ])
            invalidateAdminPanelData()
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo registrar la venta histórica.'), 'error')
            throw error
        } finally {
            setBusinessExpenseSaving(false)
        }
    }, [invalidateAdminPanelData, reloadBusinessExpensesPanel, salesRankingMonth, showNotification])

    const printOrderInvoiceById = async (orderId: string) => {
        let printWindow: Window | null = null

        try {
            const res = await fetch(toPublicApiUrl(`/api/orders/${orderId}/invoice`), {
                credentials: 'include'
            })
            if (!res.ok) {
                throw new Error('No se pudo preparar el comprobante interno para impresión.')
            }

            const invoiceHtml = await res.text()
            printWindow = window.open('', '_blank', 'width=1024,height=768')
            if (!printWindow) {
                showNotification('Tu navegador bloqueó la ventana de impresión.', 'error')
                return false
            }

            const printDocumentHtml = invoiceHtml.includes('</body>')
                ? invoiceHtml.replace(
                    '</body>',
                    `<script>
                        window.addEventListener('load', function () {
                            setTimeout(function () {
                                window.focus();
                                window.print();
                            }, 250);
                        });
                        window.addEventListener('afterprint', function () {
                            setTimeout(function () {
                                window.close();
                            }, 150);
                        });
                    </script></body>`
                )
                : `${invoiceHtml}<script>
                    window.addEventListener('load', function () {
                        setTimeout(function () {
                            window.focus();
                            window.print();
                        }, 250);
                    });
                    window.addEventListener('afterprint', function () {
                        setTimeout(function () {
                            window.close();
                        }, 150);
                    });
                </script>`

            printWindow.document.open()
            printWindow.document.write(printDocumentHtml)
            printWindow.document.close()
            window.setTimeout(() => {
                try {
                    printWindow?.focus()
                } catch (error) {
                    console.error(error)
                }
            }, 100)

            return true
        } catch (error) {
            console.error(error)
            if (printWindow && !printWindow.closed) {
                printWindow.close()
            }
            showNotification('No se pudo abrir el panel de impresión.', 'error')
            return false
        }
    }
    const printHtmlDocument = React.useCallback((html: string) => {
        const printWindow = window.open('', '_blank', 'width=1024,height=768')
        if (!printWindow) {
            showNotification('Tu navegador bloqueó la ventana de impresión.', 'error')
            return false
        }

        const printableHtml = html.includes('</body>')
            ? html.replace(
                '</body>',
                `<script>
                    window.addEventListener('load', function () {
                        setTimeout(function () {
                            window.focus();
                            window.print();
                        }, 250);
                    });
                    window.addEventListener('afterprint', function () {
                        setTimeout(function () {
                            window.close();
                        }, 150);
                    });
                </script></body>`
            )
            : `${html}<script>
                window.addEventListener('load', function () {
                    setTimeout(function () {
                        window.focus();
                        window.print();
                    }, 250);
                });
                window.addEventListener('afterprint', function () {
                    setTimeout(function () {
                        window.close();
                    }, 150);
                });
            </script>`

        printWindow.document.open()
        printWindow.document.write(printableHtml)
        printWindow.document.close()
        return true
    }, [showNotification])
    const handleGenerateInvoice = async () => {
        if (!selectedOrder?.id) return
        await printOrderInvoiceById(String(selectedOrder.id))
    }
    const handleSaveAddresses = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setAddressSaving(true)
            const normalizedAddresses = normalizeSavedAddresses(savedAddresses)
            const invalidShippingAddress = normalizedAddresses.find((entry) =>
                entry.shipping.latitude === null
                || entry.shipping.latitude === undefined
                || entry.shipping.longitude === null
                || entry.shipping.longitude === undefined
                || !String(entry.shipping.street || '').trim()
                || !String(entry.shipping.city || '').trim()
            )
            if (invalidShippingAddress) {
                showNotification('Cada dirección de envío debe seleccionarse en el mapa para poder guardarse como principal o alternativa.', 'error')
                setAddressSaving(false)
                return
            }
            const res = await requestApi<{ addresses: SavedAddressEntry[] }>('/api/user/addresses', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ addresses: normalizedAddresses })
            });
            const persistedAddresses = normalizeSavedAddresses(res.body.addresses)
            if (persistedAddresses.length > 0) {
                setSavedAddresses(persistedAddresses)
                setCurrentAddrIndex(0)
            }
            showNotification('Direcciones guardadas correctamente');
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar direcciones', 'error');
        } finally {
            setAddressSaving(false)
        }
    }

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        const wantsPasswordChange = Boolean(
            passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword
        )

        if (wantsPasswordChange) {
            if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
                showNotification('Para cambiar la contraseña completa los 3 campos.', 'error')
                return
            }
            if (passwordForm.newPassword.length < 8) {
                showNotification('La nueva contraseña debe tener al menos 8 caracteres.', 'error')
                return
            }
            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                showNotification('La confirmación de contraseña no coincide.', 'error')
                return
            }
            if (passwordForm.currentPassword === passwordForm.newPassword) {
                showNotification('La nueva contraseña debe ser diferente a la actual.', 'error')
                return
            }
        }

        let profileUpdated = false
        try {
            setProfileSaving(true)
            const name = `${profile.firstName} ${profile.lastName}`.trim()
            const res = await requestApi<{ name?: string; profile?: typeof profile }>('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, profile })
            });
            profileUpdated = true

            if (res.body.profile) {
                setProfile({
                    firstName: res.body.profile.firstName || '',
                    lastName: res.body.profile.lastName || '',
                    phone: res.body.profile.phone || '',
                    gender: res.body.profile.gender || '',
                    birth: res.body.profile.birth || '',
                    documentType: res.body.profile.documentType || '',
                    documentNumber: res.body.profile.documentNumber || '',
                    businessName: res.body.profile.businessName || ''
                })
            }

            if (res.body.name && user) {
                const updatedUser = { ...user, name: res.body.name }
                setUser(updatedUser)
                setStoredSessionUser(updatedUser)
            }

            if (wantsPasswordChange) {
                await requestApi('/api/user/password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currentPassword: passwordForm.currentPassword,
                        newPassword: passwordForm.newPassword
                    })
                })
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                })
                showNotification('Perfil y contraseña actualizados. Debes iniciar sesión nuevamente.')
                handleLogout()
                return
            }

            showNotification('Información personal guardada correctamente.')
        } catch (error) {
            console.error(error);
            if (profileUpdated && wantsPasswordChange) {
                showNotification('El perfil se guardó, pero no se pudo actualizar la contraseña.', 'error')
                return
            }
            showNotification('Error al guardar información personal', 'error')
        } finally {
            setProfileSaving(false)
        }
    }

    const reloadAdminUsers = React.useCallback(async () => {
        if (user?.role !== 'admin') return

        const res = await requestApi<AdminUserSummary[]>('/api/users')

        setAdminUsersList(Array.isArray(res.body) ? res.body : [])
    }, [user])

    const handleUnlockUser = React.useCallback(async (adminUser: AdminUserSummary) => {
        if (!adminUser?.id) return

        try {
            await unlockAdminUser(adminUser.id)
            await reloadAdminUsers()
            showNotification(`Acceso restablecido para ${adminUser.name || adminUser.email || 'el usuario'}.`)
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'No se pudo desbloquear el usuario.'
            showNotification(message, 'error')
        }
    }, [reloadAdminUsers, showNotification])

    const loadDiscountData = React.useCallback(async (options?: { silent?: boolean }) => {
        if (!user || user.role !== 'admin') return
        const silent = options?.silent === true
        setDiscountCodesLoading(true)
        try {
            const [discountsRes, auditRes] = await Promise.all([
                listDiscounts(),
                listDiscountAudit(20),
            ])
            setDiscountCodes(Array.isArray(discountsRes.body) ? discountsRes.body : [])
            setDiscountAuditRows(Array.isArray(auditRes.body) ? auditRes.body : [])
        } catch (error) {
            console.error(error)
            if (!silent) {
                showNotification('No se pudieron cargar los cupones.', 'error')
            }
        } finally {
            setDiscountCodesLoading(false)
        }
    }, [showNotification, user])

    const handleDiscountEdit = React.useCallback((discount: AdminDiscountCode) => {
        setEditingDiscountId(discount.id)
        setDiscountForm(mapDiscountToForm(discount))
    }, [mapDiscountToForm])

    const handleDiscountFormReset = React.useCallback(() => {
        setEditingDiscountId(null)
        setDiscountForm(createEmptyDiscountForm())
    }, [])

    const handleDiscountFormChange = React.useCallback(<K extends keyof DiscountFormState>(field: K, value: DiscountFormState[K]) => {
        setDiscountForm((current) => ({ ...current, [field]: value }))
    }, [])

    const handleDiscountFormSubmit = React.useCallback(async () => {
        const normalizedCode = discountForm.code.trim().toUpperCase()
        if (!normalizedCode) {
            showNotification('El código del cupón es obligatorio.', 'error')
            return
        }
        if (Number(discountForm.value || 0) <= 0) {
            showNotification('El valor del descuento debe ser mayor a cero.', 'error')
            return
        }

        setDiscountFormSaving(true)
        try {
            const payload = buildDiscountPayload({ ...discountForm, code: normalizedCode })
            if (editingDiscountId) {
                await updateDiscount(editingDiscountId, payload)
                showNotification('Cupón actualizado correctamente.')
            } else {
                await createDiscount(payload)
                showNotification('Cupón creado correctamente.')
            }
            handleDiscountFormReset()
            await loadDiscountData({ silent: true })
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'No se pudo guardar el cupón.'
            showNotification(message, 'error')
        } finally {
            setDiscountFormSaving(false)
        }
    }, [buildDiscountPayload, discountForm, editingDiscountId, handleDiscountFormReset, loadDiscountData, showNotification])

    const handleDiscountToggleStatus = React.useCallback(async (discount: AdminDiscountCode) => {
        setDiscountFormSaving(true)
        try {
            await updateDiscountStatus(discount.id, !discount.is_active)
            showNotification(!discount.is_active ? 'Cupón activado.' : 'Cupón desactivado.')
            await loadDiscountData({ silent: true })
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'No se pudo actualizar el estado del cupón.'
            showNotification(message, 'error')
        } finally {
            setDiscountFormSaving(false)
        }
    }, [loadDiscountData, showNotification])

    const handleDuplicateVariant = React.useCallback(async (product: any) => {
        const rate = Number(dashboardStats?.tax?.rate ?? vatRate ?? 0)
        const multiplier = 1 + rate / 100
        const productType = String(product?.productType || product?.category || '')
        const sourceVariantLabel = resolveProductVariantLabel(productType, product?.attributes, product)
        if (!sourceVariantLabel) {
            showNotification(
                `Antes de duplicar, edita el producto base y define su ${getVariantDefinitionFieldLabel(productType)} para que la familia se agrupe correctamente en la tienda.`,
                'error'
            )
            return
        }
        let sourceProduct = product
        const productId = getAdminProductEntityId(product)
        if (productId) {
            try {
                const res = await withTransientRetry(() => requestApi<any>(`/api/products/${encodeURIComponent(productId)}?scope=admin&procurement_detail=1`))
                const normalizedDetail = normalizeAdminProducts([res.body])[0]
                if (normalizedDetail) {
                    const procurementDetail = res.body?.inventory?.procurementDetail
                    sourceProduct = {
                        ...normalizedDetail,
                        inventory: {
                            ...(normalizedDetail.inventory || {}),
                            ...(procurementDetail ? { procurementDetail } : {}),
                        },
                    }
                }
            } catch {
                showNotification('No se pudo cargar el detalle de compra de la base; usaré los datos visibles de la lista.', 'error')
            }
        }
        setEditingProduct(null)
        setProductEditorMode('duplicate-variant')
        setProductEditorInitialForm(createDuplicateVariantFormFromProduct(sourceProduct, multiplier))
        setIsProductModalOpen(true)
        showNotification(`Se creó una copia de la variante. Define una nueva ${getVariantDefinitionFieldLabel(productType)} antes de guardar.`)
    }, [dashboardStats?.tax?.rate, showNotification, vatRate])

    const handleToggleProductPublication = React.useCallback(async (product: any, nextPublished: boolean) => {
        const productId = getAdminProductEntityId(product)
        if (!productId) return

        if (nextPublished && !isProductEligibleForPublication(product)) {
            showNotification('Solo puedes publicar artículos con precio y existencia mayor a 0.', 'error')
            return
        }

        setProductPublicationPendingIds((prev) => ({ ...prev, [productId]: true }))
        try {
            await requestApi(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ published: nextPublished })
            })

            setAdminProductsList((prev) => prev.map((item: any) => {
                const itemId = getAdminProductEntityId(item)
                if (itemId !== productId) return item
                return {
                    ...item,
                    published: nextPublished
                }
            }))
            showNotification(nextPublished ? 'Artículo publicado.' : 'Artículo ocultado del sitio.')
            invalidateAdminPanelData()
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : 'No se pudo actualizar la publicación del artículo.'
            showNotification(message, 'error')
        } finally {
            setProductPublicationPendingIds((prev) => {
                const next = { ...prev }
                delete next[productId]
                return next
            })
        }
    }, [showNotification])

    const loadVatRate = async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true
        if (!user || user.role !== 'admin') return
        setVatLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<{ rate: number; credit_current_rate?: number; credit_carryforward_rate?: number }>('/api/admin/settings/tax'))
            setVatRate(Number(res.body.rate ?? 0))
            setVatCreditCurrentRate(Number(res.body.credit_current_rate ?? 60))
            setVatCreditCarryforwardRate(Number(res.body.credit_carryforward_rate ?? 40))
        } catch (error) {
            console.error(error)
            if (error instanceof Error && error.message.includes('401')) {
                handleLogout()
                return
            }
            if (!silent) {
                showNotification('No se pudo cargar el IVA.', 'error')
            }
        } finally {
            setVatLoading(false)
        }
    }

    const loadShippingRates = async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true
        if (!user || user.role !== 'admin') return
        setShippingLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<{
                delivery: number
                pickup: number
                tax_rate: number
                store_address?: string
                store_latitude?: number
                store_longitude?: number
                free_shipping_radius_km?: number
                shipping_km_flat_rate_limit?: number
                shipping_per_km_rate?: number
                map_min_search_chars?: number
                map_lookup_cooldown_seconds?: number
                map_session_lookup_limit?: number
            }>('/api/admin/settings/shipping'))
            setShippingRates({
                delivery: Number(res.body.delivery ?? 0),
                pickup: Number(res.body.pickup ?? 0),
                taxRate: Number(res.body.tax_rate ?? 0),
                storeAddress: String(res.body.store_address ?? 'Av. de la Prensa y Juan Paz y Miño, 170104 Quito'),
                storeLatitude: Number(res.body.store_latitude ?? -0.148306),
                storeLongitude: Number(res.body.store_longitude ?? -78.490870),
                freeShippingRadiusKm: Number(res.body.free_shipping_radius_km ?? 5),
                shippingKmFlatRateLimit: Number(res.body.shipping_km_flat_rate_limit ?? 7),
                shippingPerKmRate: Number(res.body.shipping_per_km_rate ?? 1),
                mapMinSearchChars: Number(res.body.map_min_search_chars ?? 6),
                mapLookupCooldownSeconds: Number(res.body.map_lookup_cooldown_seconds ?? 3),
                mapSessionLookupLimit: Number(res.body.map_session_lookup_limit ?? 12),
            })
        } catch (error) {
            console.error(error)
            if (error instanceof Error && error.message.includes('401')) {
                handleLogout()
                return
            }
            if (!silent) {
                showNotification('No se pudieron cargar los costos de envío.', 'error')
            }
        } finally {
            setShippingLoading(false)
        }
    }

    const loadPublicShippingConfig = React.useCallback(async () => {
        try {
            const data = await fetchJson<{
                delivery: number
                pickup: number
                tax_rate?: number
                store_address?: string
                store_latitude?: number
                store_longitude?: number
                free_shipping_radius_km?: number
                shipping_km_flat_rate_limit?: number
                shipping_per_km_rate?: number
                map_min_search_chars?: number
                map_lookup_cooldown_seconds?: number
                map_session_lookup_limit?: number
            }>('/api/settings/shipping')
            setShippingRates((prev) => ({
                ...prev,
                delivery: Number(data.delivery ?? prev.delivery),
                pickup: Number(data.pickup ?? prev.pickup),
                taxRate: Number(data.tax_rate ?? prev.taxRate),
                storeAddress: String(data.store_address ?? prev.storeAddress),
                storeLatitude: Number(data.store_latitude ?? prev.storeLatitude),
                storeLongitude: Number(data.store_longitude ?? prev.storeLongitude),
                freeShippingRadiusKm: Number(data.free_shipping_radius_km ?? prev.freeShippingRadiusKm),
                shippingKmFlatRateLimit: Number(data.shipping_km_flat_rate_limit ?? prev.shippingKmFlatRateLimit),
                shippingPerKmRate: Number(data.shipping_per_km_rate ?? prev.shippingPerKmRate),
                mapMinSearchChars: Number(data.map_min_search_chars ?? prev.mapMinSearchChars),
                mapLookupCooldownSeconds: Number(data.map_lookup_cooldown_seconds ?? prev.mapLookupCooldownSeconds),
                mapSessionLookupLimit: Number(data.map_session_lookup_limit ?? prev.mapSessionLookupLimit),
            }))
        } catch (error) {
            console.error(error)
        }
    }, [])

    const normalizePurchaseInvoiceSummary = (input: any): PurchaseInvoiceSummary => ({
        id: String(input?.id || ''),
        invoice_number: String(input?.invoice_number || ''),
        supplier_name: String(input?.supplier_name || ''),
        supplier_document: input?.supplier_document ? String(input.supplier_document) : null,
        issued_at: String(input?.issued_at || ''),
        subtotal: Number(input?.subtotal ?? 0),
        tax_total: Number(input?.tax_total ?? 0),
        total: Number(input?.total ?? 0),
        notes: input?.notes ? String(input.notes) : null,
        created_at: String(input?.created_at || ''),
        items_count: Number(input?.items_count ?? 0),
        units_total: Number(input?.units_total ?? 0),
        products_count: Number(input?.products_count ?? 0)
    })

    const normalizePurchaseInvoiceDetail = (input: any): PurchaseInvoiceDetail => ({
        id: String(input?.id || ''),
        invoice_number: String(input?.invoice_number || ''),
        supplier_name: String(input?.supplier_name || ''),
        supplier_document: input?.supplier_document ? String(input.supplier_document) : null,
        issued_at: String(input?.issued_at || ''),
        subtotal: Number(input?.subtotal ?? 0),
        tax_total: Number(input?.tax_total ?? 0),
        total: Number(input?.total ?? 0),
        notes: input?.notes ? String(input.notes) : null,
        metadata: (() => {
            const parsed = parseJsonValue(input?.metadata)
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : null
        })(),
        created_at: input?.created_at ? String(input.created_at) : null,
        updated_at: input?.updated_at ? String(input.updated_at) : null,
        items: Array.isArray(input?.items) ? input.items.map((item: any) => ({
            id: String(item?.id || ''),
            product_id: String(item?.product_id || ''),
            product_name_snapshot: item?.product_name_snapshot ? String(item.product_name_snapshot) : null,
            quantity: Number(item?.quantity ?? 0),
            unit_cost: Number(item?.unit_cost ?? 0),
            line_total: Number(item?.line_total ?? 0),
            created_at: item?.created_at ? String(item.created_at) : null,
            category: item?.category ? String(item.category) : null,
            brand: item?.brand ? String(item.brand) : null,
            metadata: (() => {
                const parsed = parseJsonValue(item?.metadata)
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : null
            })()
        })) : []
    })

    const normalizeProductProcurementDetail = (input: any): ProductProcurementDetail => {
        const rawDetail = input?.inventory?.procurementDetail ?? input ?? {}
        const lots = Array.isArray(rawDetail?.lots) ? rawDetail.lots : []

        return {
            product_id: String(rawDetail?.product_id || input?.id || ''),
            legacy_id: rawDetail?.legacy_id ? String(rawDetail.legacy_id) : null,
            product_name: String(rawDetail?.product_name || input?.name || ''),
            category: String(rawDetail?.category || input?.category || ''),
            price_gross: Number(rawDetail?.price_gross ?? input?.price ?? 0),
            price_net: Number(rawDetail?.price_net ?? 0),
            entries_count: Number(rawDetail?.entries_count ?? 0),
            open_lots_count: Number(rawDetail?.open_lots_count ?? 0),
            purchased_units_total: Number(rawDetail?.purchased_units_total ?? 0),
            consumed_units_total: Number(rawDetail?.consumed_units_total ?? 0),
            remaining_units_total: Number(rawDetail?.remaining_units_total ?? 0),
            remaining_cost_total: Number(rawDetail?.remaining_cost_total ?? 0),
            weighted_unit_cost: Number(rawDetail?.weighted_unit_cost ?? 0),
            weighted_margin: Number(rawDetail?.weighted_margin ?? 0),
            weighted_profit: Number(rawDetail?.weighted_profit ?? 0),
            min_unit_cost: Number(rawDetail?.min_unit_cost ?? 0),
            max_unit_cost: Number(rawDetail?.max_unit_cost ?? 0),
            has_unlinked_stock: Boolean(rawDetail?.has_unlinked_stock),
            lots: lots.map((lot: any) => ({
                id: String(lot?.id || ''),
                source_type: String(lot?.source_type || ''),
                source_ref: lot?.source_ref ? String(lot.source_ref) : null,
                purchase_invoice_id: lot?.purchase_invoice_id ? String(lot.purchase_invoice_id) : null,
                purchase_invoice_item_id: lot?.purchase_invoice_item_id ? String(lot.purchase_invoice_item_id) : null,
                invoice_number: lot?.invoice_number ? String(lot.invoice_number) : null,
                supplier_name: lot?.supplier_name ? String(lot.supplier_name) : null,
                supplier_document: lot?.supplier_document ? String(lot.supplier_document) : null,
                issued_at: lot?.issued_at ? String(lot.issued_at) : null,
                received_at: lot?.received_at ? String(lot.received_at) : null,
                created_at: lot?.created_at ? String(lot.created_at) : null,
                purchased_quantity: Number(lot?.purchased_quantity ?? 0),
                consumed_quantity: Number(lot?.consumed_quantity ?? 0),
                remaining_quantity: Number(lot?.remaining_quantity ?? 0),
                unit_cost: Number(lot?.unit_cost ?? 0),
                purchase_total: Number(lot?.purchase_total ?? 0),
                remaining_cost_total: Number(lot?.remaining_cost_total ?? 0),
                estimated_remaining_net_revenue: Number(lot?.estimated_remaining_net_revenue ?? 0),
                estimated_remaining_gross_revenue: Number(lot?.estimated_remaining_gross_revenue ?? 0),
                estimated_remaining_profit: Number(lot?.estimated_remaining_profit ?? 0),
                estimated_remaining_margin: Number(lot?.estimated_remaining_margin ?? 0),
                status: lot?.status === 'consumed' ? 'consumed' : 'open',
            })),
        }
    }

    const loadRecentPurchaseInvoices = async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true
        if (!user || user.role !== 'admin') return
        setPurchaseInvoicesLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<any[]>('/api/admin/purchase-invoices?limit=200'))
            const rows = Array.isArray(res.body) ? res.body.map(normalizePurchaseInvoiceSummary) : []
            setRecentPurchaseInvoices(dedupePurchaseInvoiceSummaries(rows))
        } catch (error) {
            console.error(error)
            if (error instanceof Error && error.message.includes('401')) {
                handleLogout()
                return
            }
            if (!silent) {
                showNotification('No se pudieron cargar las facturas de compra.', 'error')
            }
        } finally {
            setPurchaseInvoicesLoading(false)
        }
    }

    const handleOpenPurchaseInvoice = async (invoiceId: string) => {
        const normalizedId = String(invoiceId || '').trim()
        if (!normalizedId) {
            showNotification('La factura de compra no tiene un identificador válido.', 'error')
            return
        }
        setIsPurchaseInvoiceModalOpen(true)
        setPurchaseInvoiceDetailLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<any>(`/api/admin/purchase-invoices/${encodeURIComponent(normalizedId)}`))
            setSelectedPurchaseInvoice(normalizePurchaseInvoiceDetail(res.body))
        } catch (error) {
            console.error(error)
            setIsPurchaseInvoiceModalOpen(false)
            setSelectedPurchaseInvoice(null)
            if (error instanceof Error && error.message.includes('401')) {
                handleLogout()
                return
            }
            showNotification(String((error as any)?.message || 'No se pudo abrir la factura de compra.'), 'error')
        } finally {
            setPurchaseInvoiceDetailLoading(false)
        }
    }

    const closePurchaseInvoiceModal = () => {
        if (purchaseInvoiceDetailLoading) return
        setIsPurchaseInvoiceModalOpen(false)
        setSelectedPurchaseInvoice(null)
    }

    const fetchProductProcurementDetail = React.useCallback(async (productId: string) => {
        const normalizedProductId = String(productId || '').trim()
        if (!normalizedProductId) return null
        const res = await withTransientRetry(() => requestApi<any>(`/api/products/${encodeURIComponent(normalizedProductId)}?scope=admin&procurement_detail=1`))
        return normalizeProductProcurementDetail(res.body)
    }, [])

    const handleOpenProductBalance = async (product: any) => {
        const productId = String(getAdminProductEntityId(product) || '').trim()
        if (!productId) {
            showNotification('El producto no tiene un identificador válido para consultar su balance.', 'error')
            return
        }
        setIsProductProcurementModalOpen(true)
        setProductProcurementDetailLoading(true)
        try {
            const detail = await fetchProductProcurementDetail(productId)
            setSelectedProductProcurementDetail(detail)
        } catch (error) {
            console.error(error)
            setIsProductProcurementModalOpen(false)
            setSelectedProductProcurementDetail(null)
            if (error instanceof Error && error.message.includes('401')) {
                handleLogout()
                return
            }
            showNotification(String((error as any)?.message || 'No se pudo abrir el balance del producto.'), 'error')
        } finally {
            setProductProcurementDetailLoading(false)
        }
    }

    const loadProductPurchaseReportDetail = async (productId: string, options?: { force?: boolean }) => {
        const normalizedProductId = String(productId || '').trim()
        if (!normalizedProductId) return
        const force = options?.force === true
        const cached = productPurchaseReportDetailCache[normalizedProductId]

        setSelectedProductPurchaseReportId(normalizedProductId)
        setProductPurchaseReportDetailError(null)

        if (cached && !force) {
            setSelectedProductPurchaseReportDetail(cached)
            setProductPurchaseReportDetailLoading(false)
            return
        }

        setSelectedProductPurchaseReportDetail(null)
        setProductPurchaseReportDetailLoading(true)
        try {
            const detail = await fetchProductProcurementDetail(normalizedProductId)
            if (!detail) throw new Error('No se pudo normalizar el detalle del producto.')
            setProductPurchaseReportDetailCache((prev) => ({ ...prev, [normalizedProductId]: detail }))
            setSelectedProductPurchaseReportDetail(detail)
        } catch (error) {
            console.error(error)
            setSelectedProductPurchaseReportDetail(null)
            if (error instanceof Error && error.message.includes('401')) {
                handleLogout()
                return
            }
            setProductPurchaseReportDetailError(String((error as any)?.message || 'No se pudo cargar el historial de compras del producto.'))
        } finally {
            setProductPurchaseReportDetailLoading(false)
        }
    }

    const handleSelectProductPurchaseReport = (productId: string) => {
        void loadProductPurchaseReportDetail(productId)
    }

    const handleRetryProductPurchaseReportDetail = () => {
        if (!selectedProductPurchaseReportId) return
        void loadProductPurchaseReportDetail(selectedProductPurchaseReportId, { force: true })
    }

    const closeProductProcurementModal = () => {
        if (productProcurementDetailLoading) return
        setIsProductProcurementModalOpen(false)
        setSelectedProductProcurementDetail(null)
    }

    const loadPricingSettings = async () => {
        if (!user || user.role !== 'admin') return
        try {
            const [margins, calcs, rules] = await Promise.all([
                getPricingMargins(),
                getPricingCalc(),
                getPricingRules()
            ])
            setMarginSettings(normalizeMarginSettings(margins))
            setCalcSettings(normalizeCalcSettings(calcs))
            setPricingRules(normalizePricingRules(rules))
        } catch (error) {
            console.error(error)
            setMarginSettings(normalizeMarginSettings({ baseMargin: 30, minMargin: 15, targetMargin: 35, promoBuffer: 5 }))
            setCalcSettings(normalizeCalcSettings({ rounding: 0.05, strategy: 'cost_plus', includeVatInPvp: true, shippingBuffer: 0 }))
            setPricingRules(normalizePricingRules({ bulkThreshold: 10, bulkDiscount: 5, clearanceThreshold: 25, clearanceDiscount: 15 }))
        }
    }

    const loadProductReferenceData = async (options?: { silent?: boolean }) => {
        const silent = options?.silent === true
        if (!user || user.role !== 'admin') return
        setProductReferenceDataLoading(true)
        try {
            const data = await getProductReferenceData()
            setProductReferenceData(data)
        } catch (error) {
            console.error(error)
            setProductReferenceData(createEmptyProductReferenceData())
            if (!silent) {
                showNotification('No se pudieron cargar los catalogos operativos.', 'error')
            }
        } finally {
            setProductReferenceDataLoading(false)
        }
    }

    const normalizeStoreStatus = (input?: Partial<StoreStatusSettings> | null): StoreStatusSettings => {
        const salesEnabled = input?.salesEnabled !== false
        const rawMessage = String(input?.message ?? '').trim()
        return {
            salesEnabled,
            message: rawMessage || DEFAULT_STORE_PAUSE_MESSAGE,
            updatedAt: input?.updatedAt || null,
            updatedBy: input?.updatedBy || null
        }
    }

    const normalizeSessionSettings = (input?: Partial<SessionSettings> | null): SessionSettings => {
        const minCustomer = Math.max(6, Math.round(Number(input?.minCustomerSessionHours ?? 6)))
        const minAdmin = Math.max(12, Math.round(Number(input?.minAdminSessionHours ?? 12)))
        const maxHours = Math.max(minAdmin, Math.round(Number(input?.maxSessionHours ?? 168)))
        const normalizeHours = (value: unknown, fallback: number, minimum: number) => {
            const parsed = Math.round(Number(value))
            if (!Number.isFinite(parsed)) return fallback
            return Math.max(minimum, Math.min(maxHours, parsed))
        }
        const customerSessionHours = normalizeHours(input?.customerSessionHours, minCustomer, minCustomer)
        const adminSessionHours = normalizeHours(input?.adminSessionHours, minAdmin, minAdmin)

        return {
            customerSessionHours,
            adminSessionHours,
            customerSessionTtlSeconds: customerSessionHours * 3600,
            adminSessionTtlSeconds: adminSessionHours * 3600,
            minCustomerSessionHours: minCustomer,
            minAdminSessionHours: minAdmin,
            maxSessionHours: maxHours,
        }
    }

    const loadStoreStatus = async () => {
        if (!user || user.role !== 'admin') return
        setStoreStatusLoading(true)
        try {
            const status = await getStoreStatus()
            setStoreStatus(normalizeStoreStatus(status))
        } catch (error) {
            console.error(error)
            setStoreStatus(normalizeStoreStatus(null))
            showNotification('No se pudo cargar el estado de ventas.', 'error')
        } finally {
            setStoreStatusLoading(false)
        }
    }

    const loadSessionSettings = async () => {
        if (!user || user.role !== 'admin') return
        setSessionSettingsLoading(true)
        try {
            const settings = await getSessionSettings()
            setSessionSettings(normalizeSessionSettings(settings))
        } catch (error) {
            console.error(error)
            setSessionSettings(normalizeSessionSettings(null))
            showNotification('No se pudo cargar la configuración de sesión.', 'error')
        } finally {
            setSessionSettingsLoading(false)
        }
    }

    const loadProductPageSettings = async () => {
        try {
            const settings = await getProductPageSettings()
            setProductPageSettings(settings)
        } catch (err) {
            console.error(err)
            setProductPageSettings({
                deliveryEstimate: '14 de enero - 18 de enero',
                viewerCount: 38,
                freeShippingThreshold: 75,
                supportHours: '8:30 AM a 10:00 PM',
                returnDays: 100
            })
        }
    }

    const handleSaveSessionSettings = async () => {
        if (!user || user.role !== 'admin') return
        const payload = normalizeSessionSettings(sessionSettings)
        setSessionSettingsSaving(true)
        try {
            const res = await updateSessionSettings({
                customerSessionHours: payload.customerSessionHours,
                adminSessionHours: payload.adminSessionHours,
            })
            setSessionSettings(normalizeSessionSettings(res.body))
            showNotification('Duración de sesiones actualizada.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudo guardar la duración de sesiones.', 'error')
        } finally {
            setSessionSettingsSaving(false)
        }
    }

    const handleSaveStoreStatus = async (nextSalesEnabled?: boolean) => {
        if (!user || user.role !== 'admin') return
        const payload = normalizeStoreStatus({
            ...storeStatus,
            salesEnabled: typeof nextSalesEnabled === 'boolean' ? nextSalesEnabled : storeStatus.salesEnabled
        })
        setStoreStatusSaving(true)
        try {
            const res = await updateStoreStatus({
                salesEnabled: payload.salesEnabled,
                message: payload.message
            })
            const normalized = normalizeStoreStatus(res.body)
            setStoreStatus(normalized)
            showNotification(
                normalized.salesEnabled
                    ? 'Ventas en línea activadas.'
                    : 'Ventas en línea apagadas. La tienda quedó en mantenimiento.'
            )
        } catch (error) {
            console.error(error)
            showNotification('No se pudo actualizar el estado de ventas.', 'error')
        } finally {
            setStoreStatusSaving(false)
        }
    }

    const handleSaveVat = async () => {
        setVatSaving(true)
        try {
            const res = await requestApi<{ rate: number; credit_current_rate?: number; credit_carryforward_rate?: number }>('/api/admin/settings/tax', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rate: vatRate,
                    credit_current_rate: vatCreditCurrentRate,
                    credit_carryforward_rate: vatCreditCarryforwardRate,
                })
            })
            setVatRate(Number(res.body.rate ?? 0))
            setVatCreditCurrentRate(Number(res.body.credit_current_rate ?? vatCreditCurrentRate))
            setVatCreditCarryforwardRate(Number(res.body.credit_carryforward_rate ?? vatCreditCarryforwardRate))
            showNotification('Configuración tributaria actualizada correctamente.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudo guardar la configuración tributaria.', 'error')
        } finally {
            setVatSaving(false)
        }
    }

    const handleSaveShipping = async () => {
        setShippingSaving(true)
        try {
            const res = await requestApi<{
                delivery: number
                pickup: number
                tax_rate: number
                store_address?: string
                store_latitude?: number
                store_longitude?: number
                free_shipping_radius_km?: number
                shipping_km_flat_rate_limit?: number
                shipping_per_km_rate?: number
                map_min_search_chars?: number
                map_lookup_cooldown_seconds?: number
                map_session_lookup_limit?: number
            }>('/api/admin/settings/shipping', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    delivery: shippingRates.delivery,
                    pickup: shippingRates.pickup,
                    tax_rate: shippingRates.taxRate,
                    store_address: shippingRates.storeAddress,
                    store_latitude: shippingRates.storeLatitude,
                    store_longitude: shippingRates.storeLongitude,
                    free_shipping_radius_km: shippingRates.freeShippingRadiusKm,
                    shipping_km_flat_rate_limit: shippingRates.shippingKmFlatRateLimit,
                    shipping_per_km_rate: shippingRates.shippingPerKmRate,
                    map_min_search_chars: shippingRates.mapMinSearchChars,
                    map_lookup_cooldown_seconds: shippingRates.mapLookupCooldownSeconds,
                    map_session_lookup_limit: shippingRates.mapSessionLookupLimit,
                })
            })
            setShippingRates({
                delivery: Number(res.body.delivery ?? 0),
                pickup: Number(res.body.pickup ?? 0),
                taxRate: Number(res.body.tax_rate ?? 0),
                storeAddress: String(res.body.store_address ?? shippingRates.storeAddress),
                storeLatitude: Number(res.body.store_latitude ?? shippingRates.storeLatitude),
                storeLongitude: Number(res.body.store_longitude ?? shippingRates.storeLongitude),
                freeShippingRadiusKm: Number(res.body.free_shipping_radius_km ?? shippingRates.freeShippingRadiusKm),
                shippingKmFlatRateLimit: Number(res.body.shipping_km_flat_rate_limit ?? shippingRates.shippingKmFlatRateLimit),
                shippingPerKmRate: Number(res.body.shipping_per_km_rate ?? shippingRates.shippingPerKmRate),
                mapMinSearchChars: Number(res.body.map_min_search_chars ?? shippingRates.mapMinSearchChars),
                mapLookupCooldownSeconds: Number(res.body.map_lookup_cooldown_seconds ?? shippingRates.mapLookupCooldownSeconds),
                mapSessionLookupLimit: Number(res.body.map_session_lookup_limit ?? shippingRates.mapSessionLookupLimit),
            })
            showNotification('Costos de envío actualizados.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudieron guardar los costos de envío.', 'error')
        } finally {
            setShippingSaving(false)
        }
    }

    const parseMoney = React.useCallback((value: any) => {
        if (typeof value === 'string') {
            const normalized = value.replace(/\./g, '').replace(',', '.')
            const parsed = Number(normalized)
            return Number.isFinite(parsed) ? parsed : 0
        }
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
    }, [])
    const parseDecimalInput = React.useCallback((value: string) => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
    }, [])

    const {
        posActiveShift,
        posShiftHistory,
        posMovements,
        posLoading,
        setPosLoading,
        posActionLoading,
        posOpeningCash,
        setPosOpeningCash,
        posOpenNotes,
        setPosOpenNotes,
        posClosingCash,
        setPosClosingCash,
        posCloseNotes,
        setPosCloseNotes,
        posMovementType,
        setPosMovementType,
        posMovementAmount,
        setPosMovementAmount,
        posMovementDescription,
        setPosMovementDescription,
        posMovementCreateExpense,
        setPosMovementCreateExpense,
        posMovementExpenseCategory,
        setPosMovementExpenseCategory,
        syncPosState,
        loadPosSnapshot,
        handleOpenPosShift,
        handleClosePosShift,
        handleAddPosMovement,
    } = usePosShift({
        showNotification,
        parseDecimalInput,
    })

    const toNumber = (value: any, fallback = 0, min = 0, max?: number) => {
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) return fallback
        const clamped = Math.max(min, parsed)
        if (typeof max === 'number') return Math.min(clamped, max)
        return clamped
    }

    const normalizeMarginSettings = (input: typeof marginSettings) => {
        let minMargin = toNumber(input.minMargin, 15)
        let baseMargin = toNumber(input.baseMargin, 30)
        let targetMargin = toNumber(input.targetMargin, 35)
        const promoBuffer = toNumber(input.promoBuffer, 5)
        if (baseMargin < minMargin) baseMargin = minMargin
        if (targetMargin < baseMargin) targetMargin = baseMargin
        return { baseMargin, minMargin, targetMargin, promoBuffer }
    }

    const normalizeCalcSettings = (input: typeof calcSettings) => {
        const allowed = new Set<PricingCalc['strategy']>(['cost_plus', 'target_margin', 'competitive'])
        const strategy: PricingCalc['strategy'] = allowed.has(input.strategy) ? input.strategy : 'cost_plus'
        return {
            rounding: toNumber(input.rounding, 0.05),
            strategy,
            includeVatInPvp: Boolean(input.includeVatInPvp),
            shippingBuffer: toNumber(input.shippingBuffer, 0)
        }
    }
    const normalizePricingRules = (input: typeof pricingRules) => ({
        bulkThreshold: Math.round(toNumber(input.bulkThreshold, 10, 1)),
        bulkDiscount: toNumber(input.bulkDiscount, 5, 0, 90),
        clearanceThreshold: Math.round(toNumber(input.clearanceThreshold, 25, 1)),
        clearanceDiscount: toNumber(input.clearanceDiscount, 15, 0, 90)
    })

    const normalizedMarginSettings = React.useMemo(
        () => normalizeMarginSettings(marginSettings),
        [marginSettings],
    )
    const normalizedCalcSettings = React.useMemo(
        () => normalizeCalcSettings(calcSettings),
        [calcSettings],
    )
    const normalizedPricingRules = React.useMemo(
        () => normalizePricingRules(pricingRules),
        [pricingRules],
    )

    const handleSavePricingMargins = React.useCallback(async () => {
        setMarginSettings(normalizedMarginSettings)
        try {
            const res = await updatePricingMargins(normalizedMarginSettings)
            setMarginSettings(normalizeMarginSettings(res.body))
            showNotification('Márgenes guardados correctamente.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudieron guardar los márgenes.', 'error')
        }
    }, [normalizedMarginSettings, showNotification])

    const handleSavePricingCalculations = React.useCallback(async () => {
        setCalcSettings(normalizedCalcSettings)
        try {
            const res = await updatePricingCalc(normalizedCalcSettings)
            setCalcSettings(normalizeCalcSettings(res.body))
            showNotification('Cálculos guardados correctamente.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudieron guardar los cálculos.', 'error')
        }
    }, [normalizedCalcSettings, showNotification])

    const handleSavePricingRules = React.useCallback(async () => {
        setPricingRules(normalizedPricingRules)
        try {
            const res = await updatePricingRules(normalizedPricingRules)
            setPricingRules(normalizePricingRules(res.body))
            showNotification('Reglas de precio guardadas correctamente.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudieron guardar las reglas.', 'error')
        }
    }, [normalizedPricingRules, showNotification])

    const roundPriceIncrement = (value: number, increment: number) => {
        if (!Number.isFinite(value)) return 0
        if (increment <= 0) return value
        return Math.round(value / increment) * increment
    }

    const strategicAlerts = dashboardStats?.strategicAlerts ?? []
    const strategicAlertSummary = React.useMemo(() => {
        return summarizeStrategicAlerts(strategicAlerts)
    }, [strategicAlerts])
    const filteredStrategicAlerts = React.useMemo(() => {
        return filterStrategicAlerts(strategicAlerts, alertsSeverityFilter)
    }, [alertsSeverityFilter, strategicAlerts])
    const pendingOperationalOrders = React.useMemo(() => {
        const ordersByStatus = dashboardStats?.businessMetrics?.ordersByStatus || []
        return ordersByStatus.reduce((acc, row) => {
            const status = normalizeStatus(row?.status)
            if (['pending', 'processing', 'in_process', 'in-process'].includes(status)) {
                return acc + Number(row?.count ?? 0)
            }
            return acc
        }, 0)
    }, [dashboardStats?.businessMetrics?.ordersByStatus])
    const processingOperationalOrders = React.useMemo(() => {
        const ordersByStatus = dashboardStats?.businessMetrics?.ordersByStatus || []
        return ordersByStatus.reduce((acc, row) => {
            const status = normalizeStatus(row?.status)
            if (['processing', 'in_process', 'in-process'].includes(status)) {
                return acc + Number(row?.count ?? 0)
            }
            return acc
        }, 0)
    }, [dashboardStats?.businessMetrics?.ordersByStatus])
    const purePendingOperationalOrders = React.useMemo(() => {
        const ordersByStatus = dashboardStats?.businessMetrics?.ordersByStatus || []
        return ordersByStatus.reduce((acc, row) => {
            const status = normalizeStatus(row?.status)
            if (status === 'pending') {
                return acc + Number(row?.count ?? 0)
            }
            return acc
        }, 0)
    }, [dashboardStats?.businessMetrics?.ordersByStatus])

    const handleStrategicAlertAction = (alert: { type: 'critical' | 'warning' | 'info'; message: string; action: string }) => {
        const text = `${alert.action} ${alert.message}`.toLowerCase()

        if (text.includes('invent') || text.includes('stock') || text.includes('riesgo') || text.includes('venc') || text.includes('caduc')) {
            navigateToPanelTab('inventory')
            return
        }

        if (text.includes('ticket') || text.includes('promedio')) {
            startPanelNavigationTransition(() => {
                setAdminReportSection('general')
                setActiveTab('reports')
                setSelectedDeepDive('aov')
            })
            return
        }

        if (text.includes('margen') || text.includes('utilidad') || text.includes('rentab')) {
            startPanelNavigationTransition(() => {
                setAdminReportSection('balance')
                setActiveTab('reports')
                setSelectedDeepDive('profit')
            })
            return
        }

        if (text.includes('pedido') || text.includes('env') || text.includes('log')) {
            startPanelNavigationTransition(() => {
                setActiveOrders('delivery')
                setActiveTab('admin-orders')
                setSelectedDeepDive(null)
            })
            return
        }

        if (text.includes('precio') || text.includes('promoc') || text.includes('campa')) {
            navigateToPanelTab('prices')
            return
        }

        startPanelNavigationTransition(() => {
            setAdminReportSection('sales')
            setActiveTab('reports')
            setSelectedDeepDive('sales')
        })
    }
    const openPendingOrdersShortcut = React.useCallback(() => {
        startPanelNavigationTransition(() => {
            setActiveOrders('pending')
            setActiveTab('admin-orders')
            setSelectedDeepDive(null)
        })
    }, [])

    React.useEffect(() => {
        if (user?.role !== 'admin') return
        if (activeTab === 'reports') return
        if (selectedDeepDive) {
            setSelectedDeepDive(null)
        }
    }, [activeTab, selectedDeepDive, user?.role])

    React.useEffect(() => {
        if (activeTab !== 'reports' || adminReportSection !== 'products-purchases') return
        const availableIds = new Set(
            (adminProductsList || [])
                .map((product: any) => String(getAdminProductEntityId(product) || '').trim())
                .filter(Boolean)
        )

        if (!selectedProductPurchaseReportId) return
        if (!availableIds.has(selectedProductPurchaseReportId)) {
            setSelectedProductPurchaseReportId(null)
            setSelectedProductPurchaseReportDetail(null)
            setProductPurchaseReportDetailError(null)
            return
        }

        const cached = productPurchaseReportDetailCache[selectedProductPurchaseReportId]
        if (cached && selectedProductPurchaseReportDetail?.product_id !== cached.product_id) {
            setSelectedProductPurchaseReportDetail(cached)
        }
    }, [
        activeTab,
        adminProductsList,
        adminReportSection,
        productPurchaseReportDetailCache,
        selectedProductPurchaseReportDetail?.product_id,
        selectedProductPurchaseReportId,
    ])

    React.useEffect(() => {
        if (!user || user.role !== 'admin') return
        if (activeTab !== 'discount-codes') return
        loadDiscountData({ silent: true })
    }, [activeTab, adminReloadNonce, loadDiscountData, user])

    React.useEffect(() => {
        if (!user || user.role !== 'admin') return
        if (activeTab !== 'billing-rides') return
        loadBillingRidePdfs()
    }, [activeTab, adminReloadNonce, passiveRefreshNonce, loadBillingRidePdfs, user])

    React.useEffect(() => {
        if (!user || user.role !== 'admin') return
        if (activeTab !== 'expenses') return
        reloadBusinessExpensesPanel(true)
    }, [activeTab, adminReloadNonce, businessExpenseFilters, reloadBusinessExpensesPanel, user])

    React.useEffect(() => {
        if (!isPurchaseInvoiceModalOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !purchaseInvoiceDetailLoading) {
                closePurchaseInvoiceModal()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isPurchaseInvoiceModalOpen, purchaseInvoiceDetailLoading])

    const handleLogout = React.useCallback(async () => {
        // Clear in-memory state immediately so the panel can't be re-opened via SPA navigation.
        setAuthBootstrapping(true)
        setUser(null)
        setActiveTab(undefined)
        setAdminDataError(null)
        setDashboardStats(null)
        setInventoryIntelligence(null)
        setAdminOrdersList([])
        setAdminProductsList([])
        setAdminUsersList([])
        clearStoredSession()

        try {
            await requestApi('/api/auth/logout', { method: 'POST' })
        } catch {
            // Even if the backend is unreachable, we still treat the user as logged out locally.
        }

        router.replace('/login')
        router.refresh()
    }, [router])

    const handleActiveAddress = (order: 'shipping' | 'billing') => {
        setActiveAddress((prevOrder: string | null) => prevOrder === order ? null : order)
    }

    const handleActiveOrders = (order: string) => {
        setActiveOrders(order)
    }

    useAdminDataLoader({
        activeTab,
        salesRankingMonth,
        salesRankingDate,
        salesRankingView,
        user,
        adminReloadNonce,
        passiveRefreshNonce,
        handleLogout,
        setAdminDataLoading,
        setAdminDataError,
        setDashboardStats,
        setInventoryIntelligence,
        setAdminProductsList,
        setAdminUsersList,
        setAdminOrdersList,
        setShippingProviders,
        setShippingPickups,
        setPosLoading,
        loadVatRate,
        loadShippingRates,
        loadPricingSettings,
        loadProductReferenceData,
        loadRecentPurchaseInvoices,
        loadStoreStatus,
        loadSessionSettings,
        loadProductPageSettings,
        loadPosSnapshot,
        normalizeAdminProducts,
    })

    const { reportDataRef } = useReportData({
        activeTab,
        user,
        salesRankingView,
        salesRankingMonth,
        salesRankingDate,
        adminReloadNonce,
        setDashboardStats,
    })
    const rankingCacheRef = React.useRef<Record<string, SalesRankingRow[]>>({})

    const lastPassiveRefreshAtRef = React.useRef(0)
    const lastPanelInteractionAtRef = React.useRef(0)

    React.useEffect(() => {
        const markInteraction = () => {
            lastPanelInteractionAtRef.current = Date.now()
        }

        document.addEventListener('pointerdown', markInteraction, true)
        document.addEventListener('keydown', markInteraction, true)
        document.addEventListener('input', markInteraction, true)

        return () => {
            document.removeEventListener('pointerdown', markInteraction, true)
            document.removeEventListener('keydown', markInteraction, true)
            document.removeEventListener('input', markInteraction, true)
        }
    }, [])

    const isPassiveRefreshAllowed = React.useCallback(() => {
        if (!user || user.role !== 'admin') return false
        if (!activeTab || !PASSIVE_REFRESH_SAFE_TABS.has(activeTab)) return false
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false

        const activeElement = typeof document !== 'undefined' ? document.activeElement : null
        if (activeElement instanceof HTMLElement) {
            const tagName = activeElement.tagName.toLowerCase()
            if (['input', 'textarea', 'select'].includes(tagName) || activeElement.isContentEditable) {
                return false
            }
        }

        if (
            isProductModalOpen ||
            isPurchaseInvoiceModalOpen ||
            isProductProcurementModalOpen ||
            isSalesProductModalOpen ||
            isOrderModalOpen
        ) {
            return false
        }

        if (
            adminDataLoading ||
            billingRideLoading ||
            businessExpensesLoading ||
            businessExpenseSaving ||
            posLoading ||
            Boolean(posActionLoading) ||
            purchaseInvoicesLoading ||
            purchaseInvoiceDetailLoading ||
            productProcurementDetailLoading ||
            vatLoading ||
            vatSaving ||
            shippingLoading ||
            shippingSaving ||
            discountCodesLoading ||
            discountFormSaving ||
            productReferenceDataLoading ||
            productReferenceDataSaving ||
            storeStatusLoading ||
            storeStatusSaving ||
            localSaleQuoteLoading ||
            localSaleSaving ||
            localSaleQuoteHistoryLoading ||
            localSaleCustomerLookupLoading ||
            addressSaving ||
            addressLoading ||
            profileSaving ||
            profileLoading ||
            userOrdersLoading
        ) {
            return false
        }

        if (Date.now() - lastPanelInteractionAtRef.current < PASSIVE_REFRESH_RECENT_INTERACTION_BLOCK_MS) {
            return false
        }

        return true
    }, [
        activeTab,
        addressLoading,
        addressSaving,
        adminDataLoading,
        billingRideLoading,
        businessExpenseSaving,
        businessExpensesLoading,
        discountCodesLoading,
        discountFormSaving,
        isOrderModalOpen,
        isProductModalOpen,
        isProductProcurementModalOpen,
        isPurchaseInvoiceModalOpen,
        isSalesProductModalOpen,
        localSaleCustomerLookupLoading,
        localSaleQuoteHistoryLoading,
        localSaleQuoteLoading,
        localSaleSaving,
        posActionLoading,
        posLoading,
        productProcurementDetailLoading,
        productReferenceDataLoading,
        productReferenceDataSaving,
        profileLoading,
        profileSaving,
        purchaseInvoiceDetailLoading,
        purchaseInvoicesLoading,
        shippingLoading,
        shippingSaving,
        storeStatusLoading,
        storeStatusSaving,
        user,
        userOrdersLoading,
        vatLoading,
        vatSaving,
    ])

    const requestPassiveRefresh = React.useCallback((minimumIntervalMs: number) => {
        if (!isPassiveRefreshAllowed()) return
        const now = Date.now()
        if (now - lastPassiveRefreshAtRef.current < minimumIntervalMs) return
        lastPassiveRefreshAtRef.current = now
        setPassiveRefreshNonce((prev) => prev + 1)
    }, [isPassiveRefreshAllowed])

    React.useEffect(() => {
        if (!user || user.role !== 'admin') return

        const refreshOnFocus = () => {
            requestPassiveRefresh(PASSIVE_REFRESH_FOCUS_INTERVAL_MS)
        }

        const intervalId = window.setInterval(() => {
            requestPassiveRefresh(PASSIVE_REFRESH_VISIBLE_INTERVAL_MS)
        }, PASSIVE_REFRESH_VISIBLE_INTERVAL_MS)

        window.addEventListener('focus', refreshOnFocus)
        document.addEventListener('visibilitychange', refreshOnFocus)

        return () => {
            window.clearInterval(intervalId)
            window.removeEventListener('focus', refreshOnFocus)
            document.removeEventListener('visibilitychange', refreshOnFocus)
        }
    }, [requestPassiveRefresh, user?.role])

    useAuthBootstrap({
        router,
        setAuthBootstrapping,
        setUser,
        setAdminReportSection,
        setActiveTab,
    })

    useCustomerAccountData({
        user,
        setUserOrders,
        setUserOrdersLoading,
        setProfile,
        setProfileLoading,
        setSavedAddresses,
        setCurrentAddrIndex,
        setAddressLoading,
        showNotification,
        handleLogout,
    })

    useLocalSaleQuote({
        activeTab,
        user,
        localSaleItems,
        localSaleDiscountCode,
        setLocalSaleQuote,
        setLocalSaleError,
        setLocalSaleQuoteLoading,
    })

    const loadLocalSaleQuoteHistory = React.useCallback(async (silent = false) => {
        if (!user || user.role !== 'admin') return
        if (!silent) {
            setLocalSaleQuoteHistoryLoading(true)
        }
        try {
            const result = await requestApi<AdminLocalQuotation[]>('/api/admin/quotes?limit=12')
            const rows = Array.isArray(result.body) ? result.body : []
            setLocalSaleQuoteHistory(rows)
        } catch (error) {
            console.error(error)
            if (!silent) {
                showNotification(String((error as any)?.message || 'No se pudo cargar el historial de cotizaciones.'), 'error')
            }
        } finally {
            if (!silent) {
                setLocalSaleQuoteHistoryLoading(false)
            }
        }
    }, [showNotification, user])

    React.useEffect(() => {
        if (!user || user.role !== 'admin') return
        if (activeTab !== 'local-sales' && activeTab !== 'quotations') return
        loadLocalSaleQuoteHistory(true)
    }, [activeTab, loadLocalSaleQuoteHistory, user])

    React.useEffect(() => {
        if (localSaleLastQuotation || localSaleQuoteHistory.length === 0) return
        setLocalSaleLastQuotation(buildLocalSaleQuotationResult(localSaleQuoteHistory[0]))
    }, [buildLocalSaleQuotationResult, localSaleLastQuotation, localSaleQuoteHistory])

    React.useEffect(() => {
        if (localSaleSelectedQuotationId || localSaleQuoteHistory.length === 0) return
        setLocalSaleSelectedQuotationId(localSaleQuoteHistory[0].id)
    }, [localSaleQuoteHistory, localSaleSelectedQuotationId])

    React.useEffect(() => {
        if (!user) return
        if (user.role === 'admin') return
        loadPublicShippingConfig()
    }, [loadPublicShippingConfig, user])

    const currentAddress = savedAddresses[currentAddrIndex] || createEmptySavedAddressEntry('Dirección principal')
    const currentDateLabel = formatDateEcuador(new Date(), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
    const vatDisplayRate = Number(dashboardStats?.tax?.rate ?? vatRate ?? 0)
    const vatDisplayMultiplier = Number(dashboardStats?.tax?.multiplier ?? (1 + vatDisplayRate / 100))
    const vatRateLabel = vatDisplayRate.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const vatMultiplierLabel = vatDisplayMultiplier.toLocaleString('es-EC', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    const vatExampleTotal = (100 * vatDisplayMultiplier).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const vatRateValue = Number(dashboardStats?.tax?.rate ?? vatRate ?? 0)
    const vatMultiplier = 1 + vatRateValue / 100
    const vatCreditCurrentDisplayRate = Number(dashboardStats?.tax?.credit_current_rate ?? vatCreditCurrentRate ?? 60)
    const vatCreditCarryforwardDisplayRate = Number(dashboardStats?.tax?.credit_carryforward_rate ?? vatCreditCarryforwardRate ?? 40)
    const productSalesRanking = dashboardStats?.businessMetrics?.productSalesRanking
    React.useEffect(() => {
        rankingCacheRef.current = {}
    }, [productSalesRanking])
    const periodReport = dashboardStats?.businessMetrics?.report
    const effectiveReportData = periodReport ?? reportDataRef.current
    const selectedRankingMonth = productSalesRanking?.selectedMonth || salesRankingMonth
    const selectedRankingMonthLabel = formatMonthKeyLabel(selectedRankingMonth)
    const activeSalesReportViewLabel = getSalesReportViewLabel(salesRankingView, selectedRankingMonthLabel)
    const reportPeriodMatchesActiveView = React.useCallback((report: { period?: { period_key?: string; start_date?: string; end_date?: string } } | null | undefined) => {
        const period = report?.period
        if (!period) return false
        if (salesRankingView === 'month') return period.period_key === selectedRankingMonth
        if (salesRankingView === 'week') {
            const week = getEcuadorLastSevenDaysRange()
            return String(period.period_key || '').startsWith('week:')
                && period.start_date === week.start
                && period.end_date === week.end
        }
        if (salesRankingView === 'daily') return period.start_date === salesRankingDate && period.end_date === salesRankingDate
        return period.start_date === '2000-01-01'
    }, [salesRankingDate, salesRankingView, selectedRankingMonth])
    const activePeriodReport = React.useMemo(() => {
        const refReport = reportDataRef.current
        if (reportPeriodMatchesActiveView(refReport)) return refReport
        if (reportPeriodMatchesActiveView(effectiveReportData)) return effectiveReportData
        return null
    }, [effectiveReportData, reportPeriodMatchesActiveView])
    const salesRankingRows = React.useMemo<SalesRankingRow[]>(() => {
        const resolvedView = resolveSalesRankingSourceView(salesRankingView)
        const cacheKey = `${selectedRankingMonth}:${resolvedView}`
        const cached = rankingCacheRef.current[cacheKey]
        if (cached) return cached
        const rows = buildSalesRankingRows(productSalesRanking, resolvedView)
        rankingCacheRef.current[cacheKey] = rows
        return rows
    }, [productSalesRanking, salesRankingView, selectedRankingMonth])
    const reportSalesRankingRows = React.useMemo<SalesRankingRow[]>(() => {
        const resolvedView = resolveSalesRankingSourceView(salesRankingView)
        const reportProducts = activePeriodReport?.products ?? []
        const reportPeriodKey = activePeriodReport?.period?.period_key

        const canUseReportProducts = Boolean(activePeriodReport?.period)
            && (resolvedView !== 'month' || reportPeriodKey === selectedRankingMonth)
        if (canUseReportProducts) {
            return reportProducts.map((item) => ({
                product_id: item.product_id || '',
                product_name: item.product_name || '',
                category: item.category || 'Sin categoría',
                orders_count: Number(item.orders_count ?? 0),
                units_sold: Number(item.units_sold ?? 0),
                gross_revenue: Number(item.gross_revenue ?? 0),
                net_revenue: Number(item.net_revenue ?? 0),
                vat_amount: Number(item.vat_amount ?? 0),
                shipping_amount: Number(item.shipping_amount ?? 0),
                cost: Number(item.cost ?? 0),
                profit: Number(item.profit ?? 0),
                margin: Number(item.margin ?? 0),
                order_refs: Array.isArray(item.order_refs) ? item.order_refs : [],
                month_orders_count: resolvedView === 'month' ? Number(item.orders_count ?? 0) : 0,
                month_units_sold: resolvedView === 'month' ? Number(item.units_sold ?? 0) : 0,
                month_gross_revenue: resolvedView === 'month' ? Number(item.gross_revenue ?? 0) : 0,
                month_net_revenue: resolvedView === 'month' ? Number(item.net_revenue ?? 0) : 0,
                month_vat_amount: resolvedView === 'month' ? Number(item.vat_amount ?? 0) : 0,
                month_shipping_amount: resolvedView === 'month' ? Number(item.shipping_amount ?? 0) : 0,
                month_cost: resolvedView === 'month' ? Number(item.cost ?? 0) : 0,
                month_profit: resolvedView === 'month' ? Number(item.profit ?? 0) : 0,
                month_margin: resolvedView === 'month' ? Number(item.margin ?? 0) : 0,
                range_orders_count: resolvedView === 'range' ? Number(item.orders_count ?? 0) : 0,
                range_units_sold: resolvedView === 'range' ? Number(item.units_sold ?? 0) : 0,
                range_gross_revenue: resolvedView === 'range' ? Number(item.gross_revenue ?? 0) : 0,
                range_net_revenue: resolvedView === 'range' ? Number(item.net_revenue ?? 0) : 0,
                range_vat_amount: resolvedView === 'range' ? Number(item.vat_amount ?? 0) : 0,
                range_shipping_amount: resolvedView === 'range' ? Number(item.shipping_amount ?? 0) : 0,
                range_cost: resolvedView === 'range' ? Number(item.cost ?? 0) : 0,
                range_profit: resolvedView === 'range' ? Number(item.profit ?? 0) : 0,
                range_margin: resolvedView === 'range' ? Number(item.margin ?? 0) : 0,
                historical_orders_count: resolvedView === 'historical' ? Number(item.orders_count ?? 0) : 0,
                historical_units_sold: resolvedView === 'historical' ? Number(item.units_sold ?? 0) : 0,
                historical_gross_revenue: resolvedView === 'historical' ? Number(item.gross_revenue ?? 0) : 0,
                historical_net_revenue: resolvedView === 'historical' ? Number(item.net_revenue ?? 0) : 0,
                historical_vat_amount: resolvedView === 'historical' ? Number(item.vat_amount ?? 0) : 0,
                historical_shipping_amount: resolvedView === 'historical' ? Number(item.shipping_amount ?? 0) : 0,
                historical_cost: resolvedView === 'historical' ? Number(item.cost ?? 0) : 0,
                historical_profit: resolvedView === 'historical' ? Number(item.profit ?? 0) : 0,
                historical_margin: resolvedView === 'historical' ? Number(item.margin ?? 0) : 0,
            }))
        }

        if (salesRankingView === 'daily' || salesRankingView === 'week') return []
        return buildSalesRankingRows(productSalesRanking, resolvedView)
    }, [activePeriodReport, productSalesRanking, salesRankingView, selectedRankingMonth])
    const reportSalesUnitsSold = React.useMemo(
        () => reportSalesRankingRows.reduce((acc, item) => acc + Number(item.units_sold ?? 0), 0),
        [reportSalesRankingRows]
    )
    const reportWeekUnitCount = React.useMemo(() => {
        if (trendRange !== 'week') return Math.round(reportSalesUnitsSold)
        const orders = activePeriodReport?.orders
        if (!orders || orders.length === 0) return Math.round(reportSalesUnitsSold)
        const week = getEcuadorLastSevenDaysRange()
        const weekUnits = orders.reduce((sum, order) => {
            if (!order.created_at) return sum
            const orderDateStr = getEcuadorDateKey(order.created_at)
            return orderDateStr >= week.start && orderDateStr <= week.end ? sum + (Number(order.units_count) || 0) : sum
        }, 0)
        return Math.round(weekUnits)
    }, [activePeriodReport, trendRange, reportSalesUnitsSold])
    const reportSalesCategories = React.useMemo(() => {
        const reportCategories = activePeriodReport?.categories ?? []
        const reportPeriodKey = activePeriodReport?.period?.period_key
        const canUseReportCategories = resolveSalesRankingSourceView(salesRankingView) !== 'month' || reportPeriodKey === selectedRankingMonth
        if (canUseReportCategories && reportCategories.length > 0) {
            return reportCategories
                .map((item) => ({ category: item.category, total: Number(item.net_revenue ?? 0) }))
                .sort((a, b) => b.total - a.total)
        }
        const totals = new Map<string, number>()
        reportSalesRankingRows.forEach((item) => {
            const category = String(item.category || 'Sin categoría')
            totals.set(category, (totals.get(category) ?? 0) + Number(item.net_revenue ?? 0))
        })
        return Array.from(totals.entries())
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)
    }, [activePeriodReport, reportSalesRankingRows, salesRankingView, selectedRankingMonth])
    const reportSalesCategoriesTotal = React.useMemo(
        () => reportSalesCategories.reduce((acc, item) => acc + Number(item.total ?? 0), 0),
        [reportSalesCategories]
    )
    const reportTraceabilityCategories = React.useMemo<ReportPeriodSummary['categories']>(() => {
        const reportCategories = activePeriodReport?.categories ?? []
        const reportPeriodKey = activePeriodReport?.period?.period_key
        const canUseReportCategories = resolveSalesRankingSourceView(salesRankingView) !== 'month' || reportPeriodKey === selectedRankingMonth
        if (canUseReportCategories && reportCategories.length > 0) {
            return reportCategories.map((item) => ({
                category: item.category || 'Sin categoría',
                orders_count: Number((item as any).orders_count ?? 0),
                units_sold: Number((item as any).units_sold ?? 0),
                gross_revenue: Number((item as any).gross_revenue ?? 0),
                net_revenue: Number(item.net_revenue ?? 0),
                vat_amount: Number((item as any).vat_amount ?? 0),
                shipping_amount: Number((item as any).shipping_amount ?? 0),
                cost: Number((item as any).cost ?? 0),
                profit: Number((item as any).profit ?? 0),
                margin: Number((item as any).margin ?? 0),
                order_refs: Array.isArray((item as any).order_refs) ? (item as any).order_refs : [],
            }))
        }

        const grouped = new Map<string, ReportPeriodSummary['categories'][number]>()
        reportSalesRankingRows.forEach((product) => {
            const category = product.category || 'Sin categoría'
            const existing = grouped.get(category) || {
                category,
                orders_count: 0,
                units_sold: 0,
                gross_revenue: 0,
                net_revenue: 0,
                vat_amount: 0,
                shipping_amount: 0,
                cost: 0,
                profit: 0,
                margin: 0,
                order_refs: [],
            }
            existing.units_sold += Number(product.units_sold ?? 0)
            existing.gross_revenue += Number(product.gross_revenue ?? 0)
            existing.net_revenue += Number(product.net_revenue ?? 0)
            existing.vat_amount += Number(product.vat_amount ?? 0)
            existing.shipping_amount += Number(product.shipping_amount ?? 0)
            existing.cost += Number(product.cost ?? 0)
            existing.profit += Number(product.profit ?? 0)
            const orderRefs = Array.from(new Set([
                ...existing.order_refs,
                ...(Array.isArray(product.order_refs) ? product.order_refs : []),
            ]))
            existing.order_refs = orderRefs
            existing.orders_count = orderRefs.length > 0
                ? orderRefs.length
                : existing.orders_count + Number(product.orders_count ?? 0)
            existing.margin = existing.net_revenue > 0 ? (existing.profit / existing.net_revenue) * 100 : 0
            grouped.set(category, existing)
        })
        return Array.from(grouped.values()).sort((a, b) => Number(b.net_revenue ?? 0) - Number(a.net_revenue ?? 0))
    }, [activePeriodReport, reportSalesRankingRows, salesRankingView, selectedRankingMonth])
    const reportSalesOrders = React.useMemo(() => {
        return dedupeReportSalesOrders(activePeriodReport?.orders ?? [])
    }, [activePeriodReport])
    const traceabilityReportSource = React.useMemo(() => {
        const salesData = (activePeriodReport?.sales ?? {}) as Record<string, unknown>
        const profitData = (activePeriodReport?.profit ?? {}) as Record<string, unknown>
        const productRows = reportSalesRankingRows.map((product) => ({
            product_id: product.product_id,
            product_name: product.product_name,
            category: product.category,
            orders_count: Number(product.orders_count ?? 0),
            units_sold: Number(product.units_sold ?? 0),
            gross_revenue: Number(product.gross_revenue ?? 0),
            net_revenue: Number(product.net_revenue ?? 0),
            vat_amount: Number(product.vat_amount ?? 0),
            shipping_amount: Number(product.shipping_amount ?? 0),
            cost: Number(product.cost ?? 0),
            profit: Number(product.profit ?? 0),
            margin: Number(product.margin ?? 0),
            order_refs: Array.isArray(product.order_refs) ? product.order_refs : [],
        }))
        return {
            orders: reportSalesOrders,
            products: productRows,
            categories: reportTraceabilityCategories,
            sales: {
            orders_count: reportSalesOrders.length,
                total: Number(salesData.total ?? salesData.gross ?? reportSalesOrders.reduce((acc, order) => acc + Number(order.gross ?? 0), 0)),
                net: Number(salesData.net ?? reportSalesOrders.reduce((acc, order) => acc + Number(order.net ?? 0), 0)),
                tax: Number(salesData.tax ?? salesData.vat ?? reportSalesOrders.reduce((acc, order) => acc + Number(order.vat ?? 0), 0)),
                shipping: Number(salesData.shipping ?? reportSalesOrders.reduce((acc, order) => acc + Number(order.shipping ?? 0), 0)),
            },
            profit: {
                cost: Number(profitData.cost ?? productRows.reduce((acc, product) => acc + Number(product.cost ?? 0), 0)),
                gross_profit: Number(profitData.gross_profit ?? profitData.profit ?? productRows.reduce((acc, product) => acc + Number(product.profit ?? 0), 0)),
                gross_margin: Number(profitData.gross_margin ?? profitData.margin ?? 0),
                period_expenses: Number(profitData.period_expenses ?? 0),
                paid_expenses: Number(profitData.paid_expenses ?? 0),
                pending_expenses: Number(profitData.pending_expenses ?? 0),
                overdue_expenses: Number(profitData.overdue_expenses ?? 0),
                committed_expenses: Number(profitData.committed_expenses ?? 0),
                financial_adjustments: Number(profitData.financial_adjustments ?? 0),
                net_cash_profit: Number(profitData.net_cash_profit ?? 0),
                net_cash_margin: Number(profitData.net_cash_margin ?? 0),
                net_period_profit: Number(profitData.net_period_profit ?? 0),
                net_period_margin: Number(profitData.net_period_margin ?? 0),
            },
        }
    }, [activePeriodReport, reportSalesOrders, reportSalesRankingRows, reportTraceabilityCategories])
    const traceabilityIssues = React.useMemo(
        () => buildTraceabilityIssues(traceabilityReportSource),
        [traceabilityReportSource]
    )
    const traceabilitySummary = React.useMemo(
        () => buildTraceabilitySummary(traceabilityReportSource),
        [traceabilityReportSource]
    )
    const reportSalesOrderSearchCache = React.useMemo(() => {
        const statusMap = new Map<string, string>()
        const searchTextMap = new Map<string, string>()
        for (const order of reportSalesOrders) {
            const id = String(order.id)
            statusMap.set(id, normalizeStatus(order.status))
            searchTextMap.set(id, normalizeProductSearch([
                order.id,
                order.user_name || '',
                order.customer_email || '',
                order.customer_phone || '',
                getReportCustomerDocument(order),
                getReportDeliveryMethodLabel(order.delivery_method),
                getReportPaymentMethodLabel(order.payment_method),
                order.discount_code || '',
                order.items_summary || '',
                order.status,
                formatDateEcuador(order.created_at),
                formatDateTimeEcuador(order.created_at, { hour: '2-digit', minute: '2-digit' }),
                formatMoney(order.gross),
                formatMoney(order.net),
                formatMoney(order.vat),
                formatMoney(order.shipping),
                formatMoney(order.discount_total ?? 0),
                formatMoney(order.cost ?? 0),
                formatMoney(order.profit ?? 0),
            ].join(' ')))
        }
        return { statusMap, searchTextMap }
    }, [reportSalesOrders])
    const filteredReportSalesOrders = React.useMemo(() => {
        const query = normalizeProductSearch(salesOrderSearch)
        return reportSalesOrders.filter((order) => {
            const id = String(order.id)
            const status = reportSalesOrderSearchCache.statusMap.get(id) ?? ''
            if (salesOrderStatusFilter !== 'all' && status !== salesOrderStatusFilter) return false
            if (!query) return true
            const searchText = reportSalesOrderSearchCache.searchTextMap.get(id) ?? ''
            return matchesProductSearch(searchText, query)
        })
    }, [reportSalesOrders, salesOrderSearch, salesOrderStatusFilter, reportSalesOrderSearchCache])
    const reportSalesPeriodLabel = (() => {
        const reportPeriod = activePeriodReport?.period
        if (salesRankingView === 'historical') {
            if (reportPeriod) return `${reportPeriod.start_date} → ${reportPeriod.end_date}`
            if (productSalesRanking?.historicalPeriod) {
                return `${productSalesRanking.historicalPeriod.start || '-'} → ${productSalesRanking.historicalPeriod.end || '-'}`
            }
        }
        if (salesRankingView === 'week') {
            if (reportPeriod) return `${reportPeriod.start_date} → ${reportPeriod.end_date}`
            return '-'
        }
        if (salesRankingView === 'daily') {
            if (reportPeriod) return `${reportPeriod.start_date} → ${reportPeriod.end_date}`
            return '-'
        }
        if (reportPeriod && reportPeriod.period_key === selectedRankingMonth) {
            return `${reportPeriod.start_date} → ${reportPeriod.end_date}`
        }
        if (productSalesRanking?.period) {
            return `${productSalesRanking.period.start || '-'} → ${productSalesRanking.period.end || '-'}`
        }
        return '-'
    })()
    const selectedProcurementSalesProduct = React.useMemo(() => {
        if (!selectedProductProcurementDetail) return null
        return reportSalesRankingRows.find((item) => item.product_id === selectedProductProcurementDetail.product_id)
            || salesRankingRows.find((item) => item.product_id === selectedProductProcurementDetail.product_id)
            || null
    }, [reportSalesRankingRows, salesRankingRows, selectedProductProcurementDetail])
    const monthlySalesRankingTotals = productSalesRanking?.monthlyTotals
    const historicalSalesRankingTotals = productSalesRanking?.historicalTotals
    const reportOrdersData = activePeriodReport?.orders
    const totalUnitsSold = reportOrdersData ? reportOrdersData.reduce((sum, order) => sum + (Number(order.units_count) || 0), 0) : 0
    const totalCost = reportOrdersData ? reportOrdersData.reduce((sum, order) => sum + (Number(order.cost) || 0), 0) : 0
    const totalProfit = reportOrdersData ? reportOrdersData.reduce((sum, order) => sum + (Number(order.profit) || 0), 0) : 0
    const fallbackTotals = { units_sold: totalUnitsSold, net_revenue: Number((activePeriodReport?.sales as any)?.net ?? 0), cost: totalCost, profit: totalProfit }
    const salesRankingTotals = activePeriodReport?.period
        ? fallbackTotals
        : salesRankingView === 'month'
            ? monthlySalesRankingTotals
            : salesRankingView === 'historical'
                ? (historicalSalesRankingTotals || fallbackTotals)
                : fallbackTotals
    const salesRankingUnitsSold = activePeriodReport?.period
        ? totalUnitsSold
        : Number(salesRankingTotals?.units_sold ?? 0)
    const monthlySalesFinancial = productSalesRanking?.monthlyFinancial
    const historicalSalesFinancial = productSalesRanking?.historicalFinancial
    const reportSalesData = activePeriodReport?.sales
    const rawFinancial = reportSalesData || (salesRankingView === 'month'
        ? monthlySalesFinancial
        : salesRankingView === 'historical'
            ? historicalSalesFinancial
            : null)
    const salesRankingFinancial: {orders_count:number;gross:number;net:number;vat:number;shipping:number;cost:number;profit:number;margin:number} | null = rawFinancial ? {
        orders_count: (rawFinancial as any).orders_count ?? (rawFinancial as any).total ?? 0,
        gross: (rawFinancial as any).gross ?? (rawFinancial as any).total ?? 0,
        net: (rawFinancial as any).net ?? (rawFinancial as any).net_revenue ?? 0,
        vat: (rawFinancial as any).vat ?? (rawFinancial as any).tax ?? 0,
        shipping: (rawFinancial as any).shipping ?? 0,
        cost: (rawFinancial as any).cost ?? 0,
        profit: (rawFinancial as any).profit ?? 0,
        margin: (rawFinancial as any).margin ?? 0,
    } : null
    const activeReportMeta = REPORT_SECTION_META[adminReportSection]
    const productsPurchaseSectionSummary = React.useMemo(() => {
        const soldProductIds = new Set(
            (reportSalesRankingRows || [])
                .filter((row) => Number(row.units_sold ?? 0) > 0 || Number(row.net_revenue ?? 0) > 0)
                .map((row) => String(row.product_id || '').trim())
                .filter(Boolean)
        )

        return (adminProductsList || []).reduce((acc, product: any) => {
            const productId = String(getAdminProductEntityId(product) || '').trim()
            const purchaseHistory = product?.inventory?.purchaseHistory || {}
            const procurement = product?.inventory?.procurement || {}
            const entriesCount = Math.max(0, Number(purchaseHistory?.entriesCount ?? 0))
            const purchasedUnits = Math.max(0, Number(purchaseHistory?.purchasedUnits ?? 0))
            const remainingUnits = Math.max(0, Number(procurement?.remainingUnitsTotal ?? purchaseHistory?.remainingUnits ?? 0))
            const remainingCapital = Math.max(0, Number(procurement?.remainingCostTotal ?? 0))
            acc.totalProducts += 1
            if (entriesCount > 0 || purchasedUnits > 0) acc.productsWithPurchases += 1
            if (productId && soldProductIds.has(productId)) acc.productsWithSales += 1
            acc.purchasedUnits += purchasedUnits
            acc.remainingUnits += remainingUnits
            acc.remainingCapital += remainingCapital
            return acc
        }, {
            totalProducts: 0,
            productsWithPurchases: 0,
            productsWithSales: 0,
            purchasedUnits: 0,
            remainingUnits: 0,
            remainingCapital: 0,
        })
    }, [adminProductsList, reportSalesRankingRows])
    const rawSalesSummary = dashboardStats?.businessMetrics?.salesSummary
    const salesSummary: {orders_count:number;gross:number;net:number;vat:number;shipping:number;cost:number;profit:number;margin:number} | null = rawSalesSummary ? {
        orders_count: (rawSalesSummary as any).orders_count ?? 0,
        gross: (rawSalesSummary as any).gross ?? (rawSalesSummary as any).total ?? 0,
        net: (rawSalesSummary as any).net ?? 0,
        vat: (rawSalesSummary as any).vat ?? (rawSalesSummary as any).tax ?? 0,
        shipping: (rawSalesSummary as any).shipping ?? 0,
        cost: (rawSalesSummary as any).cost ?? 0,
        profit: (rawSalesSummary as any).profit ?? 0,
        margin: (rawSalesSummary as any).margin ?? 0,
    } : null
    const rawProfitStats = dashboardStats?.businessMetrics?.profitStats
    const profitStats: {cost:number;gross_profit:number;gross_margin:number;net_cash_profit:number;net_cash_margin:number;net_period_profit:number;net_period_margin:number} | null = rawProfitStats ? {
        cost: (rawProfitStats as any).cost ?? 0,
        gross_profit: (rawProfitStats as any).gross_profit ?? 0,
        gross_margin: (rawProfitStats as any).gross_margin ?? 0,
        net_cash_profit: (rawProfitStats as any).net_cash_profit ?? 0,
        net_cash_margin: (rawProfitStats as any).net_cash_margin ?? 0,
        net_period_profit: (rawProfitStats as any).net_period_profit ?? 0,
        net_period_margin: (rawProfitStats as any).net_period_margin ?? 0,
    } : null
    const financialTrends = dashboardStats?.businessMetrics?.financialTrends
    const financialTrendRows = React.useMemo<FinancialTrendPoint[]>(() => {
        const source = financialTrendMode === 'monthly' ? financialTrends?.monthly : financialTrends?.daily
        const rows = Array.isArray(source) ? source : []
        return financialTrendMode === 'daily' ? rows.slice(-30) : rows
    }, [financialTrendMode, financialTrends])
    React.useEffect(() => {
        if (financialTrendRows.length === 0) {
            if (selectedFinancialPeriod) setSelectedFinancialPeriod('')
            return
        }
        if (selectedFinancialPeriod && financialTrendRows.some((row) => row.period === selectedFinancialPeriod)) return
        const latestActivity = [...financialTrendRows].reverse().find(hasFinancialTrendActivity) ?? financialTrendRows[financialTrendRows.length - 1]
        setSelectedFinancialPeriod(latestActivity.period)
    }, [financialTrendRows, selectedFinancialPeriod])
    React.useEffect(() => {
        if (
            activeTab === 'reports'
            && financialTrendMode === 'monthly'
            && financialTrendScope === 'selected'
            && /^\d{4}-\d{2}$/.test(selectedFinancialPeriod)
            && selectedFinancialPeriod !== salesRankingMonth
        ) {
            setSalesRankingMonth(selectedFinancialPeriod)
            setSalesRankingView('month')
            setTrendRange('month')
        }
    }, [activeTab, financialTrendMode, financialTrendScope, salesRankingMonth, selectedFinancialPeriod])
    React.useEffect(() => {
        if (salesRankingView === 'daily') {
            setSalesRankingDate(getEcuadorTodayKey())
        } else if (salesRankingDate) {
            setSalesRankingDate('')
        }
    }, [salesRankingDate, salesRankingView])

    const selectReportMonth = React.useCallback((month?: string) => {
        const nextMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))
            ? String(month)
            : getCurrentMonthKey()
        setSalesRankingMonth(nextMonth)
        setSelectedFinancialPeriod(nextMonth)
        setFinancialTrendMode('monthly')
        setFinancialTrendScope('selected')
        setSalesRankingView('month')
        setTrendRange('month')
    }, [])
    const selectSalesReportView = React.useCallback((view: SalesReportView) => {
        setSalesRankingView(view)
        if (view === 'daily') {
            setTrendRange('day')
            return
        }
        if (view === 'week') {
            setTrendRange('week')
            return
        }
        if (view === 'historical') {
            setTrendRange('all')
            setFinancialTrendMode('monthly')
            setFinancialTrendScope('total')
            return
        }

        setTrendRange('month')
        setFinancialTrendMode('monthly')
        setFinancialTrendScope('selected')
        setSelectedFinancialPeriod(salesRankingMonth || getCurrentMonthKey())
    }, [salesRankingMonth])
    const selectedFinancialTrendRow = financialTrendRows.find((row) => row.period === selectedFinancialPeriod)
        ?? financialTrendRows.find(hasFinancialTrendActivity)
        ?? financialTrendRows[financialTrendRows.length - 1]
    const reportFinancialScopeLabel = financialTrendMode === 'daily'
        ? 'Últimos 30 días'
        : (financialTrendScope === 'total'
            ? 'Total histórico visible'
            : (selectedFinancialTrendRow?.period ? `Período ${selectedFinancialTrendRow.period}` : 'Período seleccionado'))
    const reportFinancialRows = financialTrendMode === 'daily' || financialTrendScope === 'total'
        ? financialTrendRows
        : (selectedFinancialTrendRow ? [selectedFinancialTrendRow] : [])
    const reportFinancialSummary = React.useMemo(() => {
        if (
            financialTrendMode === 'monthly'
            && financialTrendScope === 'selected'
            && effectiveReportData?.period?.period_key === selectedFinancialTrendRow?.period
        ) {
            const canonical = summarizeReportPeriod(effectiveReportData as ReportPeriodSummary, reportFinancialScopeLabel)
            if (canonical) return canonical
        }
        return summarizeReportFinancialRows(reportFinancialRows, salesSummary, profitStats, reportFinancialScopeLabel)
    }, [financialTrendMode, financialTrendScope, effectiveReportData, profitStats, reportFinancialRows, reportFinancialScopeLabel, salesSummary, selectedFinancialTrendRow?.period])
    const reportGeneralScopeLabel = React.useMemo(() => {
        if (trendRange === 'day') {
            const dayLabel = formatDateEcuador(getEcuadorTodayKey(), { day: '2-digit', month: 'short' })
            return `Día actual (${dayLabel})`
        }
        if (trendRange === 'week') {
            const week = getEcuadorLastSevenDaysRange()
            const startLabel = formatDateEcuador(week.start, { day: '2-digit', month: 'short' })
            const endLabel = formatDateEcuador(week.end, { day: '2-digit', month: 'short' })
            return `Últimos 7 días (${startLabel} - ${endLabel})`
        }
        if (trendRange === 'all') return 'Todo el historial visible'
        return `Mes seleccionado (${formatMonthKeyLabel(selectedRankingMonth)})`
    }, [selectedRankingMonth, trendRange])
    const activeReportFinancialSummary = React.useMemo(
        () => summarizeReportPeriod(activePeriodReport as ReportPeriodSummary | null, reportGeneralScopeLabel),
        [activePeriodReport, reportGeneralScopeLabel]
    )
    const dayFinancialSummary = React.useMemo((): ReportFinancialSummary | null => {
        const perf = dashboardStats?.monthlyPerformance ?? []
        const todayKey = getEcuadorTodayKey()
        const todayRow = [...perf].reverse().find((row) => String(row.date || row.day || '').slice(0, 10) === todayKey)
        return summarizeDashboardTrendRows(todayRow ? [todayRow] : [], reportFinancialSummary, 'Día actual')
    }, [dashboardStats?.monthlyPerformance, reportFinancialSummary])
    const weekFinancialSummary = React.useMemo((): ReportFinancialSummary | null => {
        const perf = dashboardStats?.monthlyPerformance ?? []
        const week = getEcuadorLastSevenDaysRange()
        const weekDays = perf.filter((row) => {
            const dateKey = String(row.date || row.day || '').slice(0, 10)
            return dateKey >= week.start && dateKey <= week.end
        })
        return summarizeDashboardTrendRows(weekDays, reportFinancialSummary, 'Últimos 7 días')
    }, [dashboardStats?.monthlyPerformance, reportFinancialSummary])
    const monthFinancialSummary = React.useMemo((): ReportFinancialSummary | null => {
        const trend = dashboardStats?.salesTrend30Days ?? []
        const firstDayStr = `${selectedRankingMonth}-01`
        const [year, month] = selectedRankingMonth.split('-').map((part) => Number(part))
        const nextMonthStart = Number.isFinite(year) && Number.isFinite(month)
            ? new Date(Date.UTC(year, month, 1, 12, 0, 0)).toISOString().slice(0, 10)
            : ''
        const monthDays = trend.filter((row) => {
            const day = row.day || ''
            return day >= firstDayStr && (!nextMonthStart || day < nextMonthStart)
        })
        return summarizeDashboardTrendRows(monthDays, reportFinancialSummary, 'Mes seleccionado')
    }, [dashboardStats?.salesTrend30Days, reportFinancialSummary, selectedRankingMonth])
    const dashboardGeneralFinancialSummary = (
        trendRange === 'day'
            ? dayFinancialSummary
            : trendRange === 'week'
                ? weekFinancialSummary
                : trendRange === 'month'
                    ? monthFinancialSummary
                    : null
    )
    const generalFinancialSummary = activeReportFinancialSummary
        ?? dashboardGeneralFinancialSummary
        ?? emptyFinancialSummary(reportGeneralScopeLabel)
    const inventoryIntelligence = inventoryIntelligenceState ?? dashboardStats?.businessMetrics?.inventoryIntelligence ?? null
    const productRankingDecisionRows = React.useMemo<ProductRankingDecisionRow[]>(() => {
        const sourceRows = activePeriodReport?.period ? reportSalesRankingRows : salesRankingRows
        return buildProductRankingDecisionRows(sourceRows, inventoryIntelligence)
    }, [activePeriodReport?.period, inventoryIntelligence, reportSalesRankingRows, salesRankingRows])
    const productRankingActionItems = React.useMemo<ProductRankingActionItem[]>(
        () => buildProductRankingActionItems(productRankingDecisionRows, inventoryIntelligence),
        [inventoryIntelligence, productRankingDecisionRows]
    )
    const adminProductByReportId = React.useMemo(() => {
        const map = new Map<string, any>()
        for (const product of adminProductsList || []) {
            const keys = [
                getAdminProductEntityId(product),
                product?.id,
                product?.internalId,
                product?.legacyId,
                product?.legacy_id,
            ].map((value) => String(value ?? '').trim()).filter(Boolean)
            keys.forEach((key) => map.set(key, product))
        }
        return map
    }, [adminProductsList])
    const openAdminProductByReportId = React.useCallback((productId?: string | null) => {
        const key = String(productId || '').trim()
        const product = key ? adminProductByReportId.get(key) : null
        if (!product) {
            showNotification('No se encontró la ficha del producto en el catálogo admin.', 'error')
            return
        }
        handleEditProduct(product)
    }, [adminProductByReportId, handleEditProduct, showNotification])
    const restockAdminProductByReportId = React.useCallback((productId?: string | null) => {
        const key = String(productId || '').trim()
        const product = key ? adminProductByReportId.get(key) : null
        if (!product) {
            showNotification('No se encontró la ficha del producto para registrar compra.', 'error')
            return
        }
        handleRestockProduct(product)
    }, [adminProductByReportId, handleRestockProduct, showNotification])
    const inventoryValue = dashboardStats?.businessMetrics?.inventoryValue
    const reportPurchaseInvoicesSummary = React.useMemo(() => {
        const periodPurchases = (effectiveReportData as ReportPeriodSummary | null | undefined)?.purchase_invoices
        if (periodPurchases) {
            return {
                invoicesCount: toFinancialNumber(periodPurchases.invoices_count),
                subtotal: toFinancialNumber(periodPurchases.subtotal),
                taxTotal: toFinancialNumber(periodPurchases.tax_total),
                total: toFinancialNumber(periodPurchases.total),
                unitsTotal: toFinancialNumber(periodPurchases.units_total),
                productsCount: toFinancialNumber(periodPurchases.products_count),
                suppliersCount: toFinancialNumber(periodPurchases.suppliers_count),
                sourceLabel: reportFinancialScopeLabel,
            }
        }

        const fallback = recentPurchaseInvoices.reduce((acc, invoice) => {
            acc.invoicesCount += 1
            acc.subtotal += toFinancialNumber(invoice.subtotal)
            acc.taxTotal += toFinancialNumber(invoice.tax_total)
            acc.total += toFinancialNumber(invoice.total)
            acc.unitsTotal += toFinancialNumber(invoice.units_total)
            acc.productsCount += toFinancialNumber(invoice.products_count)
            if (invoice.supplier_name) {
                acc.suppliers.add(String(invoice.supplier_name).trim().toUpperCase())
            }
            return acc
        }, {
            invoicesCount: 0,
            subtotal: 0,
            taxTotal: 0,
            total: 0,
            unitsTotal: 0,
            productsCount: 0,
            suppliers: new Set<string>(),
        })

        return {
            invoicesCount: fallback.invoicesCount,
            subtotal: fallback.subtotal,
            taxTotal: fallback.taxTotal,
            total: fallback.total,
            unitsTotal: fallback.unitsTotal,
            productsCount: fallback.productsCount,
            suppliersCount: fallback.suppliers.size,
            sourceLabel: 'Ultimas facturas cargadas',
        }
    }, [effectiveReportData, recentPurchaseInvoices, reportFinancialScopeLabel])
    const businessControlSummary = React.useMemo(() => {
        const inventoryCost = toFinancialNumber(inventoryValue?.cost_value)
        const inventoryMarket = toFinancialNumber(inventoryValue?.market_value)
        const inventoryPotentialProfit = inventoryMarket - inventoryCost
        const vatCollected = reportFinancialSummary.vat
        const purchaseVatCredit = reportPurchaseInvoicesSummary.taxTotal
        const currentCreditRate = Math.max(0, Math.min(100, vatCreditCurrentDisplayRate))
        const carryforwardCreditRate = Math.max(0, Math.min(100, vatCreditCarryforwardDisplayRate))
        const currentUsableVatCredit = purchaseVatCredit * (currentCreditRate / 100)
        const deferredVatCredit = purchaseVatCredit * (carryforwardCreditRate / 100)
        const estimatedVatPayable = Math.max(vatCollected - currentUsableVatCredit, 0)
        const estimatedVatCreditBalance = Math.max(currentUsableVatCredit - vatCollected, 0) + deferredVatCredit
        const controlledCapitalMass = inventoryCost + reportFinancialSummary.cost + Math.max(reportFinancialSummary.pendingExpenses, 0)
        const reinvestableCash = Math.max(reportFinancialSummary.flowProfit - estimatedVatPayable - Math.max(reportFinancialSummary.overdueExpenses, 0), 0)
        const breakEvenGap = reportFinancialSummary.netProfit < 0 ? Math.abs(reportFinancialSummary.netProfit) : 0

        return {
            scopeLabel: reportFinancialSummary.scopeLabel,
            purchaseSourceLabel: reportPurchaseInvoicesSummary.sourceLabel,
            vatCollected,
            purchaseVatCredit,
            currentCreditRate,
            carryforwardCreditRate,
            currentUsableVatCredit,
            deferredVatCredit,
            estimatedVatPayable,
            estimatedVatCreditBalance,
            inventoryCost,
            inventoryMarket,
            inventoryPotentialProfit,
            controlledCapitalMass,
            recoveredCapital: reportFinancialSummary.cost,
            netProfit: reportFinancialSummary.netProfit,
            flowProfit: reportFinancialSummary.flowProfit,
            reinvestableCash,
            breakEvenGap,
            pendingExpenses: reportFinancialSummary.pendingExpenses,
            overdueExpenses: reportFinancialSummary.overdueExpenses,
            purchaseInvoicesCount: reportPurchaseInvoicesSummary.invoicesCount,
            purchaseInvoicesTotal: reportPurchaseInvoicesSummary.total,
            purchaseUnitsTotal: reportPurchaseInvoicesSummary.unitsTotal,
            purchaseSuppliersCount: reportPurchaseInvoicesSummary.suppliersCount,
        }
    }, [inventoryValue, reportFinancialSummary, reportPurchaseInvoicesSummary, vatCreditCarryforwardDisplayRate, vatCreditCurrentDisplayRate])
    const inventoryDeepDive = dashboardStats?.businessMetrics?.inventoryDeepDive
    const inventoryHealth = inventoryDeepDive?.health
    const getProductTaxRate = React.useCallback((product: any) => {
        const explicitRate = Number(product?.tax?.rate)
        if (Number.isFinite(explicitRate)) {
            return Math.max(explicitRate, 0)
        }
        return isTaxExemptProduct(product) ? 0 : vatDisplayRate
    }, [vatDisplayRate])
    const getProductTaxMultiplier = React.useCallback((product: any) => {
        const explicitMultiplier = Number(product?.tax?.multiplier)
        if (Number.isFinite(explicitMultiplier) && explicitMultiplier > 0) {
            return explicitMultiplier
        }
        return 1 + (getProductTaxRate(product) / 100)
    }, [getProductTaxRate])
    const getProductBasePrice = React.useCallback((product: any) => {
        const price = Number(product?.price ?? 0)
        const multiplier = getProductTaxMultiplier(product)
        return multiplier > 0 ? (price / multiplier) : price
    }, [getProductTaxMultiplier])
    const getProductVatPart = React.useCallback((product: any) => {
        const price = Number(product?.price ?? 0)
        const basePrice = getProductBasePrice(product)
        return Math.max(price - basePrice, 0)
    }, [getProductBasePrice])
    const traceabilityOrders = reportSalesOrders
    const traceabilityProducts = reportSalesRankingRows
    const traceabilityCategories = reportTraceabilityCategories
    const salesCategories = dashboardStats?.salesByCategory ?? []
    const salesCategoriesTotal = React.useMemo(
        () => salesCategories.reduce((acc, item) => acc + Number(item.total ?? 0), 0),
        [salesCategories]
    )
    const salesTrendRows = dashboardStats?.salesTrend30Days ?? []
    const reportsViewActive = activeTab === 'reports' || activeTab === 'sales-ranking'
    const inventoryViewActive = activeTab === 'inventory'
    const { rows: salesTrendPreview, max: salesTrendPreviewMax } = React.useMemo(
        () => (reportsViewActive ? buildSalesTrendPreview(salesTrendRows) : { rows: [], max: 0 }),
        [reportsViewActive, salesTrendRows]
    )
    const highValueInventoryItems = inventoryDeepDive?.highValueItems ?? []
    const riskInventoryItems = inventoryDeepDive?.riskItems ?? []
    const expiringInventoryItems = inventoryDeepDive?.expiringItems ?? []
    const expiredInventoryItems = inventoryDeepDive?.expiredItems ?? []
    const reportBalanceNet = generalFinancialSummary.net
    const reportBalanceGross = generalFinancialSummary.gross
    const reportBalanceVat = generalFinancialSummary.vat
    const reportBalanceShipping = generalFinancialSummary.shipping
    const reportBalanceCost = generalFinancialSummary.cost
    const reportBalanceGrossProfit = generalFinancialSummary.grossProfit
    const reportBalanceGrossMargin = generalFinancialSummary.grossMargin
    const reportBalancePeriodExpenses = generalFinancialSummary.periodExpenses
    const reportBalancePaidExpenses = generalFinancialSummary.paidExpenses
    const reportBalancePendingExpenses = generalFinancialSummary.pendingExpenses
    const reportBalanceOverdueExpenses = generalFinancialSummary.overdueExpenses
    const reportBalanceNetProfit = generalFinancialSummary.netProfit
    const reportBalanceNetMargin = generalFinancialSummary.netMargin
    const reportBalanceFlowProfit = generalFinancialSummary.flowProfit
    const reportBalanceFlowMargin = generalFinancialSummary.flowMargin
    const reportBalanceRoi = generalFinancialSummary.roi
    const reportBalanceNetRoi = generalFinancialSummary.netRoi
    const reportBalanceFlowRoi = generalFinancialSummary.flowRoi
    const balanceSummary = reportFinancialSummary ?? generalFinancialSummary
    const balanceNet = balanceSummary.net
    const balanceGross = balanceSummary.gross
    const balanceVat = balanceSummary.vat
    const balanceShipping = balanceSummary.shipping
    const balanceCost = balanceSummary.cost
    const balanceGrossProfit = balanceSummary.grossProfit
    const balanceGrossMargin = balanceSummary.grossMargin
    const balancePeriodExpenses = balanceSummary.periodExpenses
    const balancePaidExpenses = balanceSummary.paidExpenses
    const balancePendingExpenses = balanceSummary.pendingExpenses
    const balanceOverdueExpenses = balanceSummary.overdueExpenses
    const balanceNetProfit = balanceSummary.netProfit
    const balanceNetMargin = balanceSummary.netMargin
    const balanceFlowProfit = balanceSummary.flowProfit
    const balanceFlowMargin = balanceSummary.flowMargin
    const balanceRoi = balanceSummary.roi
    const balanceNetRoi = balanceSummary.netRoi
    const balanceFlowRoi = balanceSummary.flowRoi
    const balanceOrdersCount = balanceSummary.ordersCount
    const balanceAverageOrderNet = balanceSummary.averageOrderNet || Number(dashboardStats?.businessMetrics?.averageOrderValue ?? 0)
    const reportOrdersCount = generalFinancialSummary.ordersCount
    const reportAverageOrderNet = generalFinancialSummary.averageOrderNet || Number(dashboardStats?.businessMetrics?.averageOrderValue ?? 0)
    const productWeightedMargin = Number(dashboardStats?.productAnalysis?.weightedMargin ?? dashboardStats?.productAnalysis?.averageMargin ?? 0)
    const productMarginSampleCount = Number(dashboardStats?.productAnalysis?.pricedCostedProducts ?? 0)
    const productMissingCostCount = Number(dashboardStats?.productAnalysis?.missingCostCount ?? 0)
    const businessControlAlerts = React.useMemo(() => {
        const alerts: Array<{ title: string; detail: string; tone: string }> = []
        if (businessControlSummary.overdueExpenses > 0) {
            alerts.push({
                title: 'Gastos vencidos',
                detail: `${formatMoney(businessControlSummary.overdueExpenses)} vencidos afectan caja y utilidad real.`,
                tone: 'border-red/30 bg-red/5 text-red',
            })
        }
        if (businessControlSummary.breakEvenGap > 0) {
            alerts.push({
                title: 'Perdida del periodo',
                detail: `Faltan ${formatMoney(businessControlSummary.breakEvenGap)} para cubrir costos y gastos.`,
                tone: 'border-red/30 bg-red/5 text-red',
            })
        }
        if (productMissingCostCount > 0) {
            alerts.push({
                title: 'Costos incompletos',
                detail: `${productMissingCostCount.toLocaleString('es-EC')} producto${productMissingCostCount === 1 ? '' : 's'} sin costo confiable distorsionan utilidad e impuestos.`,
                tone: 'border-[#F59E0B]/40 bg-[#FFF7E8] text-[#92400E]',
            })
        }
        const stockRiskCount = Number(inventoryHealth?.out_of_stock ?? 0) + Number(inventoryHealth?.low_stock ?? 0)
        if (stockRiskCount > 0) {
            alerts.push({
                title: 'Riesgo de reposicion',
                detail: `${stockRiskCount.toLocaleString('es-EC')} SKU con agotado o bajo stock requieren decision de reinversion.`,
                tone: 'border-[#F59E0B]/40 bg-[#FFF7E8] text-[#92400E]',
            })
        }
        if (businessControlSummary.estimatedVatPayable > 0) {
            alerts.push({
                title: 'IVA por provisionar',
                detail: `${formatMoney(businessControlSummary.estimatedVatPayable)} estimado despues de credito por compras.`,
                tone: 'border-orange-300 bg-orange-50 text-orange-700',
            })
        }
        return alerts.slice(0, 4)
    }, [businessControlSummary, formatMoney, inventoryHealth, productMissingCostCount])
    const openSalesProductDetail = (item: SalesRankingRow) => {
        setSelectedSalesProduct(item)
        setIsSalesProductModalOpen(true)
    }
    const productsNeededForLocalSales = activeTab === 'local-sales' || activeTab === 'quotations' || activeTab === 'expenses'
    const productsNeededForInventory = activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'alerts' || activeTab === 'sales-ranking'
    const productsNeededForProductsPanel = activeTab === 'products'
    const productsNeededForBreakdowns = Boolean(selectedDeepDive === 'product-breakdown')
    const inventoryRowsNeeded = productsNeededForInventory || productsNeededForLocalSales || productsNeededForBreakdowns
    const localSaleCatalog = React.useMemo(() => {
        if (!productsNeededForLocalSales) {
            return [] as ReturnType<typeof buildLocalSaleCatalog>
        }

        return buildLocalSaleCatalog(adminProductsList || [], deferredLocalSaleSearch, parseMoney)
    }, [adminProductsList, deferredLocalSaleSearch, parseMoney, productsNeededForLocalSales])
    const historicalSaleProducts = React.useMemo(() => {
        if (activeTab !== 'expenses') return []
        return (adminProductsList || [])
            .map((product: any) => {
                const id = getAdminProductEntityId(product)
                if (!id) return null
                const sku = String(product.attributes?.sku || '').trim()
                return {
                    id,
                    name: String(product.name || 'Producto sin nombre'),
                    sku,
                    stock: Math.max(0, Number(product.quantity ?? 0)),
                    price: parseMoney(product.price) * getProductTaxMultiplier(product),
                    cost: parseMoney(product.business?.cost ?? product.cost),
                    taxRate: getProductTaxRate(product),
                }
            })
            .filter((product): product is {
                id: string
                name: string
                sku: string
                stock: number
                price: number
                cost: number
                taxRate: number
            } => product !== null)
            .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'es'))
    }, [activeTab, adminProductsList, getProductTaxMultiplier, getProductTaxRate, parseMoney])
    const localSaleItemQuantityById = React.useMemo(() => {
        return new Map(localSaleItems.map((item) => [item.internalId, item.quantity]))
    }, [localSaleItems])
    const inventoryManagementRows = React.useMemo(() => {
        if (!inventoryRowsNeeded) {
            return [] as ReturnType<typeof buildInventoryManagementRows>
        }

        return buildInventoryManagementRows(adminProductsList || [], parseMoney)
    }, [adminProductsList, inventoryRowsNeeded, parseMoney])
    const handleExportCurrentReport = React.useCallback(() => {
        try {
            const { filename, content } = buildReportExport({
                section: adminReportSection,
                reportTitle: activeReportMeta.title,
                generatedAt: new Date(),
                currentDateLabel,
                selectedRankingMonth,
                selectedRankingMonthLabel,
                salesRankingView,
                dashboardStats,
                financialScopeLabel: adminReportSection === 'general' ? reportGeneralScopeLabel : reportFinancialScopeLabel,
                financialSummary: adminReportSection === 'general' ? generalFinancialSummary : reportFinancialSummary,
                taxPolicy: {
                    creditCurrentRate: vatCreditCurrentDisplayRate,
                    creditCarryforwardRate: vatCreditCarryforwardDisplayRate,
                },
                salesOrders: filteredReportSalesOrders,
                salesRankingRows: reportSalesRankingRows,
                rankingDecisionRows: productRankingDecisionRows,
                rankingActionItems: productRankingActionItems,
                salesCategories: reportSalesCategories,
                salesTrendRows,
                inventoryManagementRows,
                inventoryIntelligence,
                recentPurchaseInvoices,
                traceabilitySummary,
                traceabilityIssues,
            })
            downloadReportExport(filename, content)
            showNotification('Reporte exportado correctamente. Ábrelo con Excel.')
        } catch (error) {
            showNotification(String((error as any)?.message || 'No se pudo exportar el reporte.'), 'error')
        }
    }, [
        activeReportMeta.title,
        adminReportSection,
        currentDateLabel,
        dashboardStats,
        inventoryIntelligence,
        inventoryManagementRows,
        productRankingActionItems,
        productRankingDecisionRows,
        recentPurchaseInvoices,
        reportFinancialScopeLabel,
        reportFinancialSummary,
        filteredReportSalesOrders,
        generalFinancialSummary,
        reportSalesCategories,
        reportSalesRankingRows,
        reportGeneralScopeLabel,
        salesRankingView,
        salesTrendRows,
        selectedRankingMonth,
        selectedRankingMonthLabel,
        showNotification,
        traceabilityIssues,
        traceabilitySummary,
        vatCreditCarryforwardDisplayRate,
        vatCreditCurrentDisplayRate,
    ])
    const handleExportSalesRankingReport = React.useCallback(() => {
        try {
            const { filename, content } = buildReportExport({
                section: 'sales',
                reportTitle: 'Ranking de productos',
                generatedAt: new Date(),
                currentDateLabel,
                selectedRankingMonth,
                selectedRankingMonthLabel,
                salesRankingView,
                dashboardStats,
                financialScopeLabel: reportFinancialScopeLabel,
                financialSummary: reportFinancialSummary,
                taxPolicy: {
                    creditCurrentRate: vatCreditCurrentDisplayRate,
                    creditCarryforwardRate: vatCreditCarryforwardDisplayRate,
                },
                salesOrders: filteredReportSalesOrders,
                salesRankingRows: reportSalesRankingRows,
                rankingDecisionRows: productRankingDecisionRows,
                rankingActionItems: productRankingActionItems,
                salesCategories: reportSalesCategories,
                salesTrendRows,
                inventoryManagementRows,
                inventoryIntelligence,
                recentPurchaseInvoices,
                traceabilitySummary,
                traceabilityIssues,
            })
            downloadReportExport(filename, content)
            showNotification('Ranking exportado correctamente. Ábrelo con Excel.')
        } catch (error) {
            showNotification(String((error as any)?.message || 'No se pudo exportar el ranking.'), 'error')
        }
    }, [
        currentDateLabel,
        dashboardStats,
        filteredReportSalesOrders,
        inventoryIntelligence,
        inventoryManagementRows,
        productRankingActionItems,
        productRankingDecisionRows,
        recentPurchaseInvoices,
        reportFinancialScopeLabel,
        reportFinancialSummary,
        reportSalesCategories,
        reportSalesRankingRows,
        salesRankingView,
        salesTrendRows,
        selectedRankingMonth,
        selectedRankingMonthLabel,
        showNotification,
        traceabilityIssues,
        traceabilitySummary,
        vatCreditCarryforwardDisplayRate,
        vatCreditCurrentDisplayRate,
    ])
    const filteredInventoryRows = React.useMemo(() => {
        if (!inventoryViewActive) {
            return [] as typeof inventoryManagementRows
        }
        const scopedRows = inventoryManagementRows.filter((row) => {
            if (inventoryTypeFilter === 'perishable' && !row.isPerishable) return false
            if (inventoryTypeFilter === 'nonperishable' && row.isPerishable) return false
            if (inventoryStatusFilter !== 'all' && row.stockStatus !== inventoryStatusFilter) return false
            return true
        })
        const query = sanitizeProductSearchQuery(deferredInventorySearch)
        if (!query) {
            return scopedRows
        }

        const inventorySearchIndex = new Map(
            scopedRows.map((row) => [
                row.internalId,
                `${buildProductSearchText(row.source as any)} ${row.lotCode} ${row.storageLocation} ${row.supplier} ${row.lastPurchaseInvoiceNumber} ${row.category}`,
            ])
        )

        return scopedRows
            .map((row) => ({
                row,
                score: getProductSearchScore(inventorySearchIndex.get(row.internalId) ?? row.searchText, query),
            }))
            .filter((item) => item.score > 0)
            .sort((left, right) => {
                if (right.score !== left.score) return right.score - left.score
                return left.row.name.localeCompare(right.row.name, 'es')
            })
            .map((item) => item.row)
    }, [deferredInventorySearch, inventoryManagementRows, inventoryStatusFilter, inventoryTypeFilter, inventoryViewActive])
    const inventorySummary = React.useMemo(() => {
        if (!inventoryViewActive) {
            return summarizeInventoryRows([])
        }
        return summarizeInventoryRows(inventoryManagementRows)
    }, [inventoryManagementRows, inventoryViewActive])
    const purchaseInvoicesSummary = React.useMemo(() => {
        if (!inventoryViewActive) {
            return summarizePurchaseInvoices([])
        }
        return summarizePurchaseInvoices(recentPurchaseInvoices)
    }, [inventoryViewActive, recentPurchaseInvoices])
    const hasPerishableProducts = inventoryViewActive && inventoryManagementRows.some((row) => row.isPerishable)
    const inventoryDetailModalRows = React.useMemo(() => {
        if (!inventoryDetailModal) return [] as typeof inventoryManagementRows
        const statusMap: Record<string, string> = {
            low: 'low',
            critical: 'critical',
            out: 'out',
            expiring: 'expiring',
            expired: 'expired',
        }
        const targetStatus = statusMap[inventoryDetailModal]
        if (!targetStatus) return [] as typeof inventoryManagementRows
        return inventoryManagementRows.filter((row) => row.stockStatus === targetStatus)
    }, [inventoryManagementRows, inventoryDetailModal])
    const deferredAdminProductsSearch = React.useDeferredValue(adminProductsSearch)
    const adminProductSearchIndex = React.useMemo(
        () => (productsNeededForProductsPanel ? buildProductSearchIndex((adminProductsList || []) as any) : new Map()),
        [adminProductsList, productsNeededForProductsPanel]
    )
    const pricingProductSearchIndex = React.useMemo(
        () => (activeTab === 'prices' ? buildProductSearchIndex((adminProductsList || []) as any) : new Map()),
        [activeTab, adminProductsList]
    )
    const normalizedAdminProductsSearch = React.useMemo(
        () => sanitizeProductSearchQuery(deferredAdminProductsSearch),
        [deferredAdminProductsSearch]
    )
    const normalizedPricingAnalysisSearch = React.useMemo(
        () => sanitizeProductSearchQuery(deferredPricingAnalysisSearch),
        [deferredPricingAnalysisSearch]
    )
    const filteredPricingAnalysisProducts = React.useMemo(() => {
        if (activeTab !== 'prices') {
            return [] as any[]
        }

        const products = adminProductsList || []
        if (!normalizedPricingAnalysisSearch) {
            return products
        }

        return filterProductsBySearch(
            products as any,
            normalizedPricingAnalysisSearch,
            pricingProductSearchIndex as any
        ) as any[]
    }, [activeTab, adminProductsList, normalizedPricingAnalysisSearch, pricingProductSearchIndex])
    const productPublicationSummary = React.useMemo(() => {
        if (!productsNeededForProductsPanel) {
            return buildProductPublicationSummary([])
        }

        return buildProductPublicationSummary(adminProductsList || [])
    }, [adminProductsList, productsNeededForProductsPanel])
    const filteredAdminProductsList = React.useMemo(() => {
        if (!productsNeededForProductsPanel) {
            return [] as any[]
        }

        const publicationScopedProducts = (adminProductsList || []).filter((product: any) => {
            if (productPublicationFilter === 'published') {
                return product?.published !== false
            }
            if (productPublicationFilter === 'hidden') {
                return product?.published === false
            }
            return true
        })

        const quickScopedProducts = publicationScopedProducts.filter((product: any) => {
            if (adminProductsQuickFilter === 'publishable') {
                return isProductEligibleForPublication(product)
            }
            if (adminProductsQuickFilter === 'blocked') {
                return !isProductEligibleForPublication(product)
            }
            if (adminProductsQuickFilter === 'with-stock') {
                return Number(product?.quantity ?? 0) > 0
            }
            if (adminProductsQuickFilter === 'no-stock') {
                return Number(product?.quantity ?? 0) <= 0
            }
            if (adminProductsQuickFilter === 'no-price') {
                return Number(product?.price ?? 0) <= 0
            }
            return true
        })

        const advancedScopedProducts = quickScopedProducts.filter((product: any) => {
            const attributes = product?.attributes ?? {}
            const normalizedCategory = String(product?.category ?? product?.productType ?? '').trim().toLowerCase()
            const normalizedSupplier = String(attributes?.supplier ?? '').trim().toLowerCase()
            const normalizedBrand = String(product?.brand ?? '').trim().toLowerCase()
            const normalizedSpecies = String(attributes?.species ?? product?.gender ?? '').trim().toLowerCase()
            const taxRate = Number(attributes?.taxRate ?? 0)
            const taxExempt = String(attributes?.taxExempt ?? '').trim().toLowerCase() === 'true'

            if (adminProductsCategoryFilter !== 'all' && normalizedCategory !== adminProductsCategoryFilter) {
                return false
            }
            if (adminProductsSupplierFilter !== 'all' && normalizedSupplier !== adminProductsSupplierFilter) {
                return false
            }
            if (adminProductsBrandFilter !== 'all' && normalizedBrand !== adminProductsBrandFilter) {
                return false
            }
            if (adminProductsSpeciesFilter !== 'all' && normalizedSpecies !== adminProductsSpeciesFilter) {
                return false
            }
            if (adminProductsTaxFilter === 'taxed' && (taxExempt || taxRate <= 0)) {
                return false
            }
            if (adminProductsTaxFilter === 'exempt' && !taxExempt && taxRate > 0) {
                return false
            }
            return true
        })

        if (!normalizedAdminProductsSearch) {
            return advancedScopedProducts
        }

        return filterProductsBySearch(
            advancedScopedProducts as any,
            normalizedAdminProductsSearch,
            adminProductSearchIndex as any
        ) as any[]
    }, [
        adminProductSearchIndex,
        adminProductsBrandFilter,
        adminProductsCategoryFilter,
        adminProductsList,
        adminProductsQuickFilter,
        adminProductsSpeciesFilter,
        adminProductsSupplierFilter,
        adminProductsTaxFilter,
        normalizedAdminProductsSearch,
        productPublicationFilter,
        productsNeededForProductsPanel,
    ])
    const adminProductFilterOptions = React.useMemo(() => {
        if (!productsNeededForProductsPanel) {
            return {
                categories: [],
                suppliers: [],
                brands: [],
                species: [],
            }
        }

        const buildOptionList = (
            getValue: (product: any) => string,
            getLabel?: (value: string) => string
        ) => {
            const counts = new Map<string, number>()

                ; (adminProductsList || []).forEach((product: any) => {
                    const value = getValue(product)
                    if (!value) {
                        return
                    }
                    counts.set(value, (counts.get(value) ?? 0) + 1)
                })

            return Array.from(counts.entries())
                .sort((left, right) => left[0].localeCompare(right[0], 'es', { sensitivity: 'base' }))
                .map(([value, count]) => ({
                    value,
                    label: getLabel ? getLabel(value) : value,
                    count,
                }))
        }

        return {
            categories: buildOptionList((product) => String(product?.category ?? product?.productType ?? '').trim().toLowerCase(), (value) =>
                value ? value.charAt(0).toUpperCase() + value.slice(1) : value
            ),
            suppliers: buildOptionList((product) => String(product?.attributes?.supplier ?? '').trim().toLowerCase(), (value) =>
                value ? value.charAt(0).toUpperCase() + value.slice(1) : value
            ),
            brands: buildOptionList((product) => String(product?.brand ?? '').trim().toLowerCase(), (value) =>
                value ? value.charAt(0).toUpperCase() + value.slice(1) : value
            ),
            species: buildOptionList((product) => String(product?.attributes?.species ?? product?.gender ?? '').trim().toLowerCase(), (value) =>
                value ? value.charAt(0).toUpperCase() + value.slice(1) : value
            ),
        }
    }, [adminProductsList, productsNeededForProductsPanel])
    const localSaleUnits = localSaleItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)
    const localSaleNet = Number(localSaleQuote?.vat_subtotal ?? 0)
    const localSaleVat = Number(localSaleQuote?.vat_amount ?? 0)
    const localSaleGross = Number(localSaleQuote?.subtotal ?? 0)
    const localSaleShipping = Number(localSaleQuote?.shipping ?? 0)
    const localSaleTotal = Number(localSaleQuote?.total ?? 0)
    const localSaleDiscount = Number(localSaleQuote?.discount_total ?? 0)
    const localSaleCost = localSaleItems.reduce((acc, item) => acc + (Number(item.cost || 0) * Number(item.quantity || 0)), 0)
    const localSaleProfit = localSaleNet - localSaleCost
    const localSaleCashReceivedValue = parseDecimalInput(localSaleCashReceived)
    const localSaleElectronicAmountValue = parseDecimalInput(localSaleElectronicAmount)
    const localSalePaidAmount = localSalePaymentMethod === 'cash'
        ? localSaleCashReceivedValue
        : (localSalePaymentMethod === 'mixed' ? (localSaleCashReceivedValue + localSaleElectronicAmountValue) : localSaleTotal)
    const localSalePendingAmount = Math.max(0, localSaleTotal - localSalePaidAmount)
    const localSaleChange = Math.max(0, localSalePaidAmount - localSaleTotal)
    const localSalePaymentReferenceValue = localSalePaymentReference.trim()
    const localSaleDocumentNumberValue = localSaleCustomerDocumentNumber.trim()
    const localSaleCustomerPhoneValue = localSaleCustomerPhone.trim()
    const localSaleCustomerEmailValue = localSaleCustomerEmail.trim()
    const localSaleCustomerEmailValid = localSaleCustomerEmailValue === ''
        ? false
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localSaleCustomerEmailValue)
    const localSaleCustomerWhatsAppNumber = normalizeWhatsAppPhone(localSaleCustomerPhoneValue)
    const localSaleCustomerPhoneValid = Boolean(localSaleCustomerWhatsAppNumber)
    const localSaleCustomerStreetValue = localSaleCustomerStreet.trim()
    const localSaleCustomerCityValue = localSaleCustomerCity.trim()
    const localSaleAddressReady = localSaleCustomerStreetValue.length >= 5
    const selectedLocalSaleQuotation = React.useMemo(
        () => localSaleQuoteHistory.find((item) => item.id === localSaleSelectedQuotationId) || null,
        [localSaleQuoteHistory, localSaleSelectedQuotationId]
    )
    const localSalePaymentIssues = React.useMemo(() => {
        const issues: string[] = []
        if (localSalePaymentMethod === 'cash') {
            if (localSaleCashReceivedValue <= 0) {
                issues.push('Ingresa el efectivo recibido.')
            } else if (localSaleCashReceivedValue < localSaleTotal) {
                issues.push('El efectivo recibido no cubre el total de la venta.')
            }
            return issues
        }
        if (localSalePaymentMethod === 'transfer') {
            if (localSalePaymentReferenceValue.length < 4) {
                issues.push('Ingresa la referencia de la transferencia.')
            }
            return issues
        }
        if (localSalePaymentMethod === 'mixed') {
            if (localSaleCashReceivedValue <= 0) {
                issues.push('Ingresa el valor en efectivo para pago mixto.')
            }
            if (localSaleElectronicAmountValue <= 0) {
                issues.push('Ingresa el monto electrónico para pago mixto.')
            }
            if (localSalePaymentReferenceValue.length < 4) {
                issues.push('Ingresa la referencia del pago electrónico.')
            }
            if (localSalePendingAmount > 0.009) {
                issues.push('El pago mixto aún no cubre el total de la venta.')
            }
            return issues
        }
        return issues
    }, [
        localSaleCashReceivedValue,
        localSaleElectronicAmountValue,
        localSalePaymentMethod,
        localSalePaymentReferenceValue,
        localSalePendingAmount,
        localSaleTotal
    ])
    const buildLocalSalePaymentDetails = React.useCallback(() => ({
        channel: 'local_pos',
        shift_id: posActiveShift?.id || null,
        cashier_user_id: user?.id || null,
        reference: localSalePaymentReferenceValue || null,
        cash_received: localSalePaymentMethod === 'cash' || localSalePaymentMethod === 'mixed' ? Number(localSaleCashReceivedValue.toFixed(2)) : 0,
        electronic_amount: localSalePaymentMethod === 'mixed' ? Number(localSaleElectronicAmountValue.toFixed(2)) : (localSalePaymentMethod === 'cash' ? 0 : Number(localSaleTotal.toFixed(2))),
        paid_amount: Number(localSalePaidAmount.toFixed(2)),
        pending_amount: Number(localSalePendingAmount.toFixed(2)),
        change_due: Number(localSaleChange.toFixed(2))
    }), [
        localSaleCashReceivedValue,
        localSaleChange,
        localSaleElectronicAmountValue,
        localSalePaidAmount,
        localSalePaymentMethod,
        localSalePaymentReferenceValue,
        localSalePendingAmount,
        localSaleTotal,
        posActiveShift?.id,
        user?.id,
    ])
    const localSalePaymentReady = localSalePaymentIssues.length === 0
    const localSaleMissingInfo = React.useMemo(() => {
        const issues: string[] = []
        if (!storeStatus.salesEnabled) {
            issues.push(storeStatus.message || DEFAULT_STORE_PAUSE_MESSAGE)
        }
        if (!(posActiveShift && posActiveShift.status === 'open')) {
            issues.push('Debes abrir la caja del turno antes de registrar la venta.')
        }
        if (localSaleItems.length === 0) {
            issues.push('Agrega al menos un producto a la compra.')
        }
        if (localSaleQuoteLoading) {
            issues.push('Espera que termine el cálculo del total.')
        }
        if (localSaleError) {
            issues.push(localSaleError)
        }
        if (localSaleCustomerLookupLoading) {
            issues.push('Esperando resultado de búsqueda de cliente por documento.')
        }
        if (localSaleCustomerDocumentType !== 'consumidor_final' && localSaleDocumentNumberValue.length < 6) {
            issues.push('Número de documento inválido para facturación.')
        }
        if (!localSaleAddressReady) {
            issues.push('Dirección del cliente obligatoria para registrar la venta.')
        }
        issues.push(...localSalePaymentIssues)
        return issues
    }, [
        localSaleAddressReady,
        localSaleCustomerDocumentType,
        localSaleDocumentNumberValue.length,
        localSaleError,
        localSaleItems.length,
        localSaleCustomerLookupLoading,
        localSalePaymentIssues,
        localSaleQuoteLoading,
        posActiveShift,
        storeStatus.message,
        storeStatus.salesEnabled
    ])
    const localSaleQuotationMissingInfo = React.useMemo(() => {
        const issues: string[] = []
        if (localSaleItems.length === 0) {
            issues.push('Agrega al menos un producto para cotizar.')
        }
        if (localSaleQuoteLoading) {
            issues.push('Espera que termine el cálculo de la cotización.')
        }
        if (localSaleError) {
            issues.push(localSaleError)
        }
        if (localSaleCustomerLookupLoading) {
            issues.push('Espera que termine la búsqueda del cliente por documento.')
        }
        if (localSaleCustomerName.trim().length < 3) {
            issues.push('Ingresa el nombre del cliente para generar la cotización.')
        }
        return issues
    }, [
        localSaleCustomerLookupLoading,
        localSaleCustomerName,
        localSaleError,
        localSaleItems.length,
        localSaleQuoteLoading,
    ])
    const localSalePaymentStatusText = localSalePaymentReady
        ? 'Listo para cobrar'
        : (localSalePaymentIssues[0] || 'Falta completar datos')
    const isLocalSaleSubmitDisabled = localSaleSaving || localSaleMissingInfo.length > 0
    const isLocalSaleQuoteSubmitDisabled = localSaleSaving || localSaleQuotationMissingInfo.length > 0
    const localSaleDocumentReady = localSaleCustomerDocumentType === 'consumidor_final' || localSaleDocumentNumberValue.length >= 6
    const localSaleQuoteReady = !localSaleQuoteLoading && !localSaleError && localSaleTotal > 0
    const localSaleQuickChecks = React.useMemo(() => ([
        {
            key: 'caja',
            label: 'Caja',
            ok: Boolean(posActiveShift && posActiveShift.status === 'open'),
            detail: (posActiveShift && posActiveShift.status === 'open') ? 'Abierta' : 'Cerrada'
        },
        {
            key: 'items',
            label: 'Productos',
            ok: localSaleItems.length > 0,
            detail: localSaleItems.length > 0 ? `${localSaleUnits} uds` : 'Sin items'
        },
        {
            key: 'doc',
            label: 'Cliente',
            ok: localSaleDocumentReady && localSaleAddressReady,
            detail: !localSaleDocumentReady
                ? 'Doc. incompleto'
                : (localSaleAddressReady ? 'OK' : 'Sin dirección')
        },
        {
            key: 'pago',
            label: 'Pago',
            ok: localSalePaymentReady,
            detail: localSalePaymentReady ? 'Completo' : 'Pendiente'
        },
        {
            key: 'total',
            label: 'Total',
            ok: localSaleQuoteReady,
            detail: localSaleQuoteReady ? formatMoney(localSaleTotal) : 'Sin cálculo'
        }
    ]), [
        formatMoney,
        localSaleAddressReady,
        localSaleDocumentReady,
        localSaleItems.length,
        localSalePaymentReady,
        localSaleQuoteReady,
        localSaleTotal,
        localSaleUnits,
        posActiveShift
    ])
    const localSalePrimaryMissing = localSaleMissingInfo[0] || null
    const localSaleQuotationPrimaryMissing = localSaleQuotationMissingInfo[0] || null
    const posSummary = posActiveShift?.summary
    const posExpectedCash = Number(posSummary?.expected_cash ?? 0)
    const posCashSales = Number(posSummary?.cash_sales ?? 0)
    const posElectronicSales = Number(posSummary?.electronic_sales ?? 0)
    const posMovementIncome = Number(posSummary?.movement_income ?? 0)
    const posMovementExpense = Number(posSummary?.movement_expense ?? 0)
    const posMovementAdjustments = Number(posSummary?.movement_adjustments ?? 0)
    const posOrdersCount = Number(posSummary?.orders_count ?? 0)
    const posSalesTotal = Number(posSummary?.sales_total ?? 0)
    const posCanRegisterSale = Boolean(posActiveShift && posActiveShift.status === 'open')
    const posFieldLabelClass = 'text-[10px] uppercase font-bold text-[#475569] mb-1'
    const posFieldClass = 'w-full px-3 py-2 rounded-lg border border-[#8FA0B5] bg-white text-[#111827] placeholder:text-[#64748B] text-sm focus:border-black focus:ring-1 focus:ring-black/15 outline-none'
    const posFieldFlexClass = 'flex-1 px-3 py-2 rounded-lg border border-[#8FA0B5] bg-white text-[#111827] placeholder:text-[#64748B] text-sm focus:border-black focus:ring-1 focus:ring-black/15 outline-none'
    const posTextareaClass = 'w-full px-3 py-2 rounded-lg border border-[#8FA0B5] bg-white text-[#111827] placeholder:text-[#64748B] text-sm resize-none focus:border-black focus:ring-1 focus:ring-black/15 outline-none'

    const handleAddLocalSaleProduct = React.useCallback((product: LocalSaleCatalogItem) => {
        if (product.isExpired) {
            showNotification(`"${product.name}" está vencido y no se puede vender.`, 'error')
            return
        }
        if (product.stock <= 0) {
            showNotification(`"${product.name}" no tiene stock disponible.`, 'error')
            return
        }
        setLocalSaleItems((prev) => {
            const existing = prev.find((item) => item.internalId === product.internalId)
            if (existing) {
                if (existing.quantity >= product.stock) {
                    showNotification(`Stock máximo alcanzado para "${product.name}".`, 'error')
                    return prev
                }
                return prev.map((item) => item.internalId === product.internalId
                    ? { ...item, quantity: item.quantity + 1, stock: product.stock, price: product.price, cost: product.cost }
                    : item
                )
            }
            return [
                ...prev,
                {
                    productId: product.internalId,
                    internalId: product.internalId,
                    name: product.name,
                    category: product.category,
                    sku: product.sku,
                    image: product.image,
                    stock: product.stock,
                    quantity: 1,
                    price: product.price,
                    cost: product.cost
                }
            ]
        })
        setLocalSaleError(null)
    }, [showNotification])

    const handleUpdateLocalSaleQuantity = React.useCallback((internalId: string, quantity: number) => {
        setLocalSaleItems((prev) => prev
            .map((item) => {
                if (item.internalId !== internalId) return item
                const maxStock = Math.max(0, Number(item.stock || 0))
                const nextQty = Math.min(Math.max(0, quantity), maxStock)
                return { ...item, quantity: nextQty }
            })
            .filter((item) => item.quantity > 0)
        )
    }, [])

    const handleRemoveLocalSaleItem = React.useCallback((internalId: string) => {
        setLocalSaleItems((prev) => prev.filter((item) => item.internalId !== internalId))
    }, [])

    const handleClearLocalSale = React.useCallback(() => {
        setLocalSaleItems([])
        setLocalSaleDiscountCode('')
        setLocalSaleNotes('')
        setLocalSaleCustomerName('')
        setLocalSaleCustomerPhone('')
        setLocalSaleCustomerEmail('')
        setLocalSaleQuoteSendEmail(true)
        setLocalSaleCustomerStreet('')
        setLocalSaleCustomerCity('')
        setLocalSaleCustomerDocumentType('cedula')
        setLocalSaleCustomerDocumentNumber('')
        setLocalSalePaymentMethod('cash')
        setLocalSalePaymentReference('')
        setLocalSaleCashReceived('')
        setLocalSaleElectronicAmount('')
        setLocalSaleQuote(null)
        setLocalSaleError(null)
        setLocalSaleCustomerLookupMessage(null)
    }, [])
    const handleOpenLastLocalSaleOrder = async () => {
        if (!localSaleLastOrderId) return
        await handleViewOrder(localSaleLastOrderId)
    }
    const handlePrintLastLocalSaleInvoice = async () => {
        if (!localSaleLastOrderId) return
        await printOrderInvoiceById(localSaleLastOrderId)
    }

    const handleLookupCustomerByDocument = async (documentOverride?: string) => {
        const rawDoc = (documentOverride ?? localSaleCustomerDocumentNumber).trim()
        if (rawDoc.length < 6) {
            setLocalSaleCustomerLookupMessage('Ingresa una cédula/documento válido para buscar cliente.')
            return
        }
        try {
            setLocalSaleCustomerLookupLoading(true)
            const res = await requestApi<{ found?: boolean; customer?: any }>(`/api/admin/pos/customer-by-document?document=${encodeURIComponent(rawDoc)}`)
            const found = Boolean(res.body?.found && res.body?.customer)
            if (!found) {
                setLocalSaleCustomerLookupMessage('Cliente no encontrado. Completa los datos manualmente.')
                return
            }

            const customer = res.body.customer || {}
            const firstName = String(customer.firstName || '').trim()
            const lastName = String(customer.lastName || '').trim()
            const fullName = String(customer.name || `${firstName} ${lastName}`).trim()
            if (fullName) setLocalSaleCustomerName(fullName)
            if (customer.phone) setLocalSaleCustomerPhone(String(customer.phone))
            if (customer.email) setLocalSaleCustomerEmail(String(customer.email))
            const customerAddress = customer.address && typeof customer.address === 'object' ? customer.address : {}
            const customerStreet = String(customerAddress.street || '').trim()
            const customerCity = String(customerAddress.city || '').trim()
            if (customerStreet) setLocalSaleCustomerStreet(customerStreet)
            if (customerCity) setLocalSaleCustomerCity(customerCity)
            if (customer.documentType && ['cedula', 'ruc', 'pasaporte', 'consumidor_final'].includes(String(customer.documentType))) {
                setLocalSaleCustomerDocumentType(String(customer.documentType) as 'cedula' | 'ruc' | 'pasaporte' | 'consumidor_final')
            }
            if (customer.documentNumber) setLocalSaleCustomerDocumentNumber(String(customer.documentNumber))

            const source = customer.source || {}
            const sourceText = source.type === 'order'
                ? `Cliente encontrado (${Number(source.orders_count ?? 1)} compra${Number(source.orders_count ?? 1) === 1 ? '' : 's'}).`
                : 'Cliente encontrado en perfil.'
            const addressText = customerStreet
                ? ' Dirección cargada.'
                : ' Falta dirección registrada.'
            setLocalSaleCustomerLookupMessage(`${sourceText}${addressText}`)
        } catch (error: any) {
            console.error(error)
            setLocalSaleCustomerLookupMessage(String(error?.message || 'No se pudo buscar el cliente por cédula/documento.'))
        } finally {
            setLocalSaleCustomerLookupLoading(false)
        }
    }
    const handleSetCashExact = () => {
        setLocalSaleCashReceived(localSaleTotal > 0 ? localSaleTotal.toFixed(2) : '')
    }
    const handleCompleteMixedWithElectronic = () => {
        const remaining = Math.max(0, localSaleTotal - localSaleCashReceivedValue)
        setLocalSaleElectronicAmount(remaining > 0 ? remaining.toFixed(2) : '0.00')
    }
    const handlePrintLastLocalQuotation = React.useCallback(() => {
        const fallbackQuotation = selectedLocalSaleQuotation || localSaleQuoteHistory[0] || null
        if (fallbackQuotation) {
            const quotationHtml = buildLocalQuotationHtml({
                quotation: fallbackQuotation,
                formatMoney,
                formatDateTimeEcuador,
            })
            setLocalSaleLastQuotationHtml(quotationHtml)
            printHtmlDocument(quotationHtml)
            return
        }
        if (!localSaleLastQuotationHtml) return
        printHtmlDocument(localSaleLastQuotationHtml)
    }, [
        formatDateTimeEcuador,
        formatMoney,
        localSaleLastQuotationHtml,
        localSaleQuoteHistory,
        printHtmlDocument,
        selectedLocalSaleQuotation,
    ])

    const handleCreateLocalQuotation = React.useCallback(async () => {
        if (localSaleQuotationMissingInfo.length > 0) {
            const firstIssue = localSaleQuotationMissingInfo[0]
            const suffix = localSaleQuotationMissingInfo.length > 1 ? ` (+${localSaleQuotationMissingInfo.length - 1} pendiente${localSaleQuotationMissingInfo.length - 1 === 1 ? '' : 's'})` : ''
            showNotification(`${firstIssue}${suffix}`, 'error')
            return
        }
        try {
            setLocalSaleSaving(true)
            const quotationResponse = await requestApi<AdminLocalQuotation>('/api/admin/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: localSaleCustomerName.trim(),
                    customer_document_type: localSaleCustomerDocumentType,
                    customer_document_number: localSaleDocumentNumberValue || null,
                    customer_email: localSaleCustomerEmail.trim() || null,
                    customer_phone: localSaleCustomerPhone.trim() || null,
                    customer_address: {
                        street: localSaleCustomerStreetValue || null,
                        city: localSaleCustomerCityValue || null,
                        state: null,
                        country: 'EC',
                        zip: null,
                    },
                    delivery_method: 'pickup',
                    payment_method: localSalePaymentMethod,
                    discount_code: localSaleQuote?.discount_code || localSaleDiscountCode.trim().toUpperCase() || null,
                    notes: localSaleNotes.trim() || null,
                    send_email: localSaleQuoteSendEmail && localSaleCustomerEmailValid,
                    items: localSaleItems.map((item) => ({
                        product_id: item.productId,
                        quantity: item.quantity,
                    })),
                }),
            })

            const quotation = quotationResponse.body
            const quotationHtml = buildLocalQuotationHtml({
                quotation,
                formatMoney,
                formatDateTimeEcuador,
            })
            const whatsappRequested = localSaleQuoteSendWhatsApp
            const whatsappReady = Boolean(localSaleCustomerWhatsAppNumber)
            const whatsappMessage = whatsappRequested
                ? (whatsappReady
                    ? 'Mensaje de WhatsApp preparado para envío al cliente.'
                    : 'No se abrió WhatsApp porque el teléfono del cliente no es válido.')
                : null
            setLocalSaleLastQuotation({
                ...buildLocalSaleQuotationResult(quotation),
                whatsappPrepared: whatsappRequested && whatsappReady,
                whatsappMessage,
            })
            setLocalSaleLastQuotationHtml(quotationHtml)
            setLocalSaleSelectedQuotationId(quotation.id)
            setLocalSaleQuoteHistory((prev) => [quotation, ...prev.filter((item) => item.id !== quotation.id)].slice(0, 12))
            printHtmlDocument(quotationHtml)
            if (whatsappRequested) {
                if (whatsappReady) {
                    const whatsappText = buildQuotationWhatsAppMessage({ quotation, formatMoney })
                    const whatsappUrl = `https://wa.me/${localSaleCustomerWhatsAppNumber}?text=${encodeURIComponent(whatsappText)}`
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
                } else {
                    showNotification('La cotización se generó, pero no se abrió WhatsApp porque el teléfono no es válido.', 'error')
                }
            }
            const emailMessage = quotation.email_delivery?.message
            if (quotation.email_delivery?.requested) {
                showNotification(
                    emailMessage || `Cotización lista: ${quotation.id}`,
                    quotation.email_delivery?.sent ? 'success' : 'error'
                )
            } else if (whatsappRequested && whatsappReady) {
                showNotification(`Cotización lista: ${quotation.id}. WhatsApp preparado para envío.`)
            } else if (localSaleQuoteSendEmail && localSaleCustomerEmailValue && !localSaleCustomerEmailValid) {
                showNotification(`Cotización lista: ${quotation.id}. El correo no se envió porque no es válido.`, 'error')
            } else {
                showNotification(`Cotización lista: ${quotation.id}`)
            }
        } catch (error) {
            console.error(error)
            showNotification(String((error as any)?.message || 'No se pudo generar la cotización.'), 'error')
        } finally {
            setLocalSaleSaving(false)
        }
    }, [
        formatDateTimeEcuador,
        formatMoney,
        localSaleCustomerCityValue,
        localSaleCustomerDocumentType,
        localSaleCustomerEmail,
        localSaleCustomerEmailValid,
        localSaleCustomerEmailValue,
        localSaleCustomerName,
        localSaleCustomerPhone,
        localSaleCustomerWhatsAppNumber,
        localSaleCustomerStreetValue,
        localSaleDiscountCode,
        localSaleDocumentNumberValue,
        localSaleItems,
        localSaleNotes,
        localSaleQuotationMissingInfo,
        localSaleQuote,
        localSaleQuoteSendEmail,
        localSaleQuoteSendWhatsApp,
        printHtmlDocument,
        showNotification,
    ])

    const handleConvertSelectedLocalQuotation = React.useCallback(async () => {
        if (!selectedLocalSaleQuotation) {
            showNotification('Selecciona una cotización guardada para convertirla en venta.', 'error')
            return
        }
        if (!(posActiveShift && posActiveShift.status === 'open')) {
            showNotification('Debes abrir la caja del turno antes de convertir la cotización.', 'error')
            return
        }
        if (!storeStatus.salesEnabled) {
            showNotification(storeStatus.message || DEFAULT_STORE_PAUSE_MESSAGE, 'error')
            return
        }
        if (selectedLocalSaleQuotation.status === 'converted') {
            showNotification('Esta cotización ya fue convertida en venta.', 'error')
            return
        }
        if (localSalePaymentIssues.length > 0) {
            showNotification(localSalePaymentIssues[0], 'error')
            return
        }

        const paymentMethodLabel = getLocalSalePaymentMethodLabel(localSalePaymentMethod)
        const attemptedAt = new Date().toISOString()
        const fallbackOrderSummary = {
            customerName: selectedLocalSaleQuotation.customer_name,
            documentNumber: selectedLocalSaleQuotation.customer_document_number || null,
            paymentMethod: paymentMethodLabel,
            total: Number(selectedLocalSaleQuotation.quote_snapshot?.total ?? 0),
            itemCount: Number(selectedLocalSaleQuotation.item_count ?? selectedLocalSaleQuotation.items.length ?? 0),
            units: Number(selectedLocalSaleQuotation.units ?? selectedLocalSaleQuotation.items.reduce((acc, item) => acc + Number(item.quantity || 0), 0)),
            createdAt: attemptedAt,
        }

        try {
            setLocalSaleSaving(true)
            setLocalSaleError(null)
            const converted = await requestApi<{ quotation: AdminLocalQuotation; order: any }>(`/api/admin/quotes/${encodeURIComponent(selectedLocalSaleQuotation.id)}/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_method: localSalePaymentMethod,
                    payment_details: buildLocalSalePaymentDetails(),
                }),
            })

            const order = converted.body?.order || {}
            const updatedQuotation = converted.body?.quotation || selectedLocalSaleQuotation
            const createdOrderId = order?.id ? String(order.id) : ''
            const createdItems = Array.isArray(order?.items) ? order.items : []
            const createdUnits = createdItems.length > 0
                ? createdItems.reduce((acc: number, item: any) => acc + Number(item?.quantity || 0), 0)
                : fallbackOrderSummary.units

            setLocalSaleLastSubmission({
                status: 'success',
                orderId: createdOrderId || null,
                orderStatus: order?.status ? String(order.status) : 'completed',
                message: createdOrderId
                    ? `Cotización ${selectedLocalSaleQuotation.id} convertida correctamente en pedido ${createdOrderId}.`
                    : `Cotización ${selectedLocalSaleQuotation.id} convertida correctamente.`,
                customerName: fallbackOrderSummary.customerName,
                documentNumber: fallbackOrderSummary.documentNumber,
                paymentMethod: fallbackOrderSummary.paymentMethod,
                total: Number(order?.total ?? fallbackOrderSummary.total),
                itemCount: createdItems.length > 0 ? createdItems.length : fallbackOrderSummary.itemCount,
                units: createdUnits,
                createdAt: order?.created_at ? String(order.created_at) : fallbackOrderSummary.createdAt,
                invoiceAvailable: Boolean(createdOrderId),
            })
            if (createdOrderId) {
                setLocalSaleLastOrderId(createdOrderId)
            }
            setLocalSaleQuoteHistory((prev) => prev.map((item) => item.id === updatedQuotation.id ? updatedQuotation : item))
            showNotification(createdOrderId ? `Venta creada desde cotización: ${createdOrderId}` : 'Cotización convertida a venta.')
            const monthQuery = /^\d{4}-(0[1-9]|1[0-2])$/.test(salesRankingMonth)
                ? `?period=${encodeURIComponent(salesRankingMonth)}&include_report=0`
                : '?include_report=0'
            const [productsResult, ordersResult, statsResult] = await Promise.allSettled([
                requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT),
                requestApi<Order[]>('/api/orders'),
                requestApi<DashboardStats>(`/api/admin/dashboard/stats${monthQuery}`),
            ])
            if (productsResult.status === 'fulfilled') {
                setAdminProductsList(normalizeAdminProducts(productsResult.value.body))
            }
            if (ordersResult.status === 'fulfilled') {
                setAdminOrdersList(ordersResult.value.body)
            }
            if (statsResult.status === 'fulfilled') {
                setDashboardStats(statsResult.value.body)
            }
            await Promise.all([
                loadPosSnapshot(),
                loadLocalSaleQuoteHistory(true),
            ])
            invalidateAdminPanelData()
            if (localSaleAutoPrint && createdOrderId) {
                await printOrderInvoiceById(createdOrderId)
            }
        } catch (error: any) {
            console.error(error)
            const message = String(error?.message || 'No se pudo convertir la cotización en venta.')
            setLocalSaleError(message)
            setLocalSaleLastSubmission({
                status: 'error',
                orderId: null,
                orderStatus: null,
                message,
                customerName: fallbackOrderSummary.customerName,
                documentNumber: fallbackOrderSummary.documentNumber,
                paymentMethod: fallbackOrderSummary.paymentMethod,
                total: fallbackOrderSummary.total,
                itemCount: fallbackOrderSummary.itemCount,
                units: fallbackOrderSummary.units,
                createdAt: fallbackOrderSummary.createdAt,
                invoiceAvailable: false,
            })
            showNotification(message, 'error')
        } finally {
            setLocalSaleSaving(false)
        }
    }, [
        buildLocalSalePaymentDetails,
        invalidateAdminPanelData,
        loadLocalSaleQuoteHistory,
        loadPosSnapshot,
        localSaleAutoPrint,
        localSalePaymentIssues,
        localSalePaymentMethod,
        normalizeAdminProducts,
        posActiveShift,
        printOrderInvoiceById,
        salesRankingMonth,
        selectedLocalSaleQuotation,
        showNotification,
        storeStatus.message,
        storeStatus.salesEnabled,
    ])

    const handleCreateLocalSale = async () => {
        if (localSaleMissingInfo.length > 0) {
            const firstIssue = localSaleMissingInfo[0]
            const suffix = localSaleMissingInfo.length > 1 ? ` (+${localSaleMissingInfo.length - 1} pendiente${localSaleMissingInfo.length - 1 === 1 ? '' : 's'})` : ''
            showNotification(`${firstIssue}${suffix}`, 'error')
            return
        }

        const customerName = localSaleCustomerName.trim() || 'Cliente local'
        const nameParts = customerName.split(/\s+/).filter(Boolean)
        const firstName = nameParts[0] || 'Cliente'
        const lastName = nameParts.slice(1).join(' ') || 'Local'
        const normalizedDiscountCode = localSaleDiscountCode.trim().toUpperCase() || null
        const paymentMethodLabel = getLocalSalePaymentMethodLabel(localSalePaymentMethod)
        const attemptedAt = new Date().toISOString()
        const fallbackOrderSummary = {
            customerName,
            documentNumber: localSaleDocumentNumberValue || null,
            paymentMethod: paymentMethodLabel,
            total: Number(localSaleTotal.toFixed(2)),
            itemCount: localSaleItems.length,
            units: localSaleUnits,
            createdAt: attemptedAt
        }
        const paymentDetails = buildLocalSalePaymentDetails()

        const customerAddress = {
            firstName,
            lastName,
            phone: localSaleCustomerPhone.trim() || null,
            email: localSaleCustomerEmail.trim() || null,
            street: localSaleCustomerStreetValue,
            city: localSaleCustomerCityValue || null,
            state: null,
            country: 'EC',
            zip: null,
            documentType: localSaleCustomerDocumentType,
            documentNumber: localSaleDocumentNumberValue || null
        }

        try {
            setLocalSaleSaving(true)
            setLocalSaleError(null)
            const payload = {
                total: localSaleTotal,
                status: 'completed',
                delivery_method: 'pickup',
                payment_method: localSalePaymentMethod,
                shipping_address: customerAddress,
                billing_address: customerAddress,
                order_notes: localSaleNotes.trim() || 'Venta en local (POS)',
                coupon_code: normalizedDiscountCode,
                payment_details: paymentDetails,
                items: localSaleItems.map((item) => ({
                    product_id: item.productId,
                    quantity: item.quantity
                }))
            }
            const created = await requestApi<any>('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const createdOrderId = created.body?.id ? String(created.body.id) : ''
            const createdItems = Array.isArray(created.body?.items) ? created.body.items : []
            const createdUnits = createdItems.length > 0
                ? createdItems.reduce((acc: number, item: any) => acc + Number(item?.quantity || 0), 0)
                : fallbackOrderSummary.units
            setLocalSaleLastSubmission({
                status: 'success',
                orderId: createdOrderId || null,
                orderStatus: created.body?.status ? String(created.body.status) : 'completed',
                message: createdOrderId
                    ? `Venta registrada correctamente con pedido ${createdOrderId}.`
                    : 'Venta registrada correctamente.',
                customerName: fallbackOrderSummary.customerName,
                documentNumber: fallbackOrderSummary.documentNumber,
                paymentMethod: fallbackOrderSummary.paymentMethod,
                total: Number(created.body?.total ?? fallbackOrderSummary.total),
                itemCount: createdItems.length > 0 ? createdItems.length : fallbackOrderSummary.itemCount,
                units: createdUnits,
                createdAt: created.body?.created_at ? String(created.body.created_at) : fallbackOrderSummary.createdAt,
                invoiceAvailable: Boolean(createdOrderId)
            })
            showNotification(createdOrderId ? `Venta local registrada: ${createdOrderId}` : 'Venta local registrada.')
            if (createdOrderId) {
                setLocalSaleLastOrderId(createdOrderId)
            }
            handleClearLocalSale()
            if (localSaleAutoPrint && createdOrderId) {
                await printOrderInvoiceById(createdOrderId)
            }

            // El XML del SRI se genera automáticamente en el backend
            // No es necesario hacer una llamada adicional
            const monthQuery = /^\d{4}-(0[1-9]|1[0-2])$/.test(salesRankingMonth)
                ? `?period=${encodeURIComponent(salesRankingMonth)}&include_report=0`
                : '?include_report=0'
            const [productsResult, ordersResult, statsResult] = await Promise.allSettled([
                requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT),
                requestApi<Order[]>('/api/orders'),
                requestApi<DashboardStats>(`/api/admin/dashboard/stats${monthQuery}`)
            ])
            if (productsResult.status === 'fulfilled') {
                setAdminProductsList(normalizeAdminProducts(productsResult.value.body))
            }
            if (ordersResult.status === 'fulfilled') {
                setAdminOrdersList(ordersResult.value.body)
            }
            if (statsResult.status === 'fulfilled') {
                setDashboardStats(statsResult.value.body)
            }
            await Promise.all([
                loadPosSnapshot(),
                loadLocalSaleQuoteHistory(true),
            ])
            invalidateAdminPanelData()
        } catch (error: any) {
            console.error(error)
            const message = String(error?.message || 'No se pudo registrar la venta local.')
            setLocalSaleError(message)
            setLocalSaleLastSubmission({
                status: 'error',
                orderId: null,
                orderStatus: null,
                message,
                customerName: fallbackOrderSummary.customerName,
                documentNumber: fallbackOrderSummary.documentNumber,
                paymentMethod: fallbackOrderSummary.paymentMethod,
                total: fallbackOrderSummary.total,
                itemCount: fallbackOrderSummary.itemCount,
                units: fallbackOrderSummary.units,
                createdAt: fallbackOrderSummary.createdAt,
                invoiceAvailable: false
            })
            showNotification(message, 'error')
        } finally {
            setLocalSaleSaving(false)
        }
    }

    const openProductBreakdown = (metric: ProductDetailMetric) => {
        setSelectedProductMetric(metric)
        setSelectedDeepDive('product-breakdown')
    }

    const productBreakdownMeta = React.useMemo(() => {
        return buildProductBreakdownMeta(dashboardStats, selectedProductMetric)
    }, [dashboardStats, selectedProductMetric])

    const salesProductBreakdown = React.useMemo(() => {
        if (!productsNeededForBreakdowns) {
            return []
        }

        return buildSalesProductBreakdown(
            dashboardStats,
            adminProductsList || [],
            parseMoney,
            selectedProductMetric
        )
    }, [adminProductsList, dashboardStats, parseMoney, productsNeededForBreakdowns, selectedProductMetric])

    const inventoryProductBreakdown = React.useMemo(() => {
        if (!productsNeededForBreakdowns) {
            return []
        }

        return buildInventoryProductBreakdown(adminProductsList || [], parseMoney)
    }, [adminProductsList, parseMoney, productsNeededForBreakdowns])


    const updateAddressData = (type: 'billing' | 'shipping', field: string, value: string) => {
        const newAddresses = [...savedAddresses]
        const addr = newAddresses[currentAddrIndex]
        if (!addr) return
        addr[type] = { ...addr[type], [field]: value }

        if (addr.isSame) {
            const otherType = type === 'billing' ? 'shipping' : 'billing'
            addr[otherType] = { ...addr[otherType], [field]: value }
        }

        setSavedAddresses(newAddresses)
    }

    const updateAddressPartial = (type: 'billing' | 'shipping', partial: Record<string, unknown>) => {
        const newAddresses = [...savedAddresses]
        const addr = newAddresses[currentAddrIndex]
        if (!addr) return
        addr[type] = { ...addr[type], ...partial }

        if (addr.isSame) {
            const otherType = type === 'billing' ? 'shipping' : 'billing'
            addr[otherType] = { ...addr[otherType], ...partial }
        }

        setSavedAddresses(newAddresses)
    }

    const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        const field = id.replace('billing', '').charAt(0).toLowerCase() + id.replace('billing', '').slice(1);
        updateAddressData('billing', field, value)
    }

    const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        const field = id.replace('shipping', '').charAt(0).toLowerCase() + id.replace('shipping', '').slice(1);
        updateAddressData('shipping', field, value)
    }

    const toggleSameAsShipping = () => {
        const newAddresses = [...savedAddresses]
        const addr = newAddresses[currentAddrIndex]
        if (!addr) return
        addr.isSame = !addr.isSame
        if (addr.isSame) {
            addr.billing = { ...addr.shipping }
        }
        setSavedAddresses(newAddresses)
    }

    const addNewAddress = () => {
        if (savedAddresses.length < 3) {
            const newAddr = createEmptySavedAddressEntry(`Dirección ${savedAddresses.length + 1}`, savedAddresses.length)
            setSavedAddresses([...savedAddresses, newAddr])
            setCurrentAddrIndex(savedAddresses.length)
            showNotification('Nueva ranura de dirección añadida.')
        } else {
            showNotification('Máximo 3 direcciones permitidas.', 'error')
        }
    }

    const makePrimaryAddress = (index: number) => {
        if (index <= 0 || index >= savedAddresses.length) return
        const nextAddresses = [...savedAddresses]
        const [selected] = nextAddresses.splice(index, 1)
        nextAddresses.unshift(selected)
        setSavedAddresses(nextAddresses)
        setCurrentAddrIndex(0)
        showNotification('Esta dirección quedó como principal para checkout.')
    }

    const removeAddress = (index: number) => {
        if (savedAddresses.length > 1) {
            const newAddresses = savedAddresses.filter((_, i) => i !== index)
            setSavedAddresses(newAddresses)
            setCurrentAddrIndex(0)
            showNotification('Dirección eliminada.')
        }
    }

    const renderDeepDive = () => {
        if (!selectedDeepDive || !dashboardStats?.businessMetrics) return null;

        const metrics = dashboardStats.businessMetrics;
        const salesDeepDive = metrics.salesDeepDive;
        const isProductBreakdown = selectedDeepDive === 'product-breakdown';
        const productMetricTotal = productBreakdownMeta.total;
        const productMetricRows = selectedProductMetric === 'inventory' ? inventoryProductBreakdown : salesProductBreakdown;
        const inventoryDeepDive = metrics.inventoryDeepDive;
        const inventoryHealth = inventoryDeepDive?.health;
        const expiringInventoryItems = inventoryDeepDive?.expiringItems || [];
        const expiredInventoryItems = inventoryDeepDive?.expiredItems || [];
        const expiringProductsCount = Number(inventoryHealth?.expiring_products ?? expiringInventoryItems.length)
        const expiredProductsCount = Number(inventoryHealth?.expired_products ?? expiredInventoryItems.length)

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white rounded-[32px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-8 border-b border-line flex justify-between items-center bg-surface">
                        <div>
                            <h3 className="heading4">
                                {selectedDeepDive === 'sales' ? 'Análisis Detallado de Ventas' :
                                    selectedDeepDive === 'profit' ? 'Detalle de Rentabilidad' :
                                        selectedDeepDive === 'aov' ? 'Análisis de Ticket Promedio' :
                                            selectedDeepDive === 'inventory' ? 'Salud de Inventario' : productBreakdownMeta.title}
                            </h3>
                            <p className="text-secondary text-sm">
                                {isProductBreakdown ? productBreakdownMeta.subtitle : 'Desglose comparativo y factores de crecimiento'}
                            </p>
                        </div>
                        <button onClick={() => setSelectedDeepDive(null)} className="p-2 hover:bg-line rounded-full transition-colors">
                            <Icon.X size={28} />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto">
                        {selectedDeepDive === 'sales' && (
                            <div className="space-y-10">
                                {/* Daily Comparison Chart */}
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h5 className="heading5 text-sm">Rendimiento Diario (Vs. Mes Anterior)</h5>
                                        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tight">
                                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-black rounded-full"></span> Mes Actual</div>
                                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-black/20 rounded-full"></span> Mes Anterior</div>
                                        </div>
                                    </div>
                                    <div className="h-48 flex items-end gap-1.5 justify-between px-2 bg-surface rounded-2xl p-6 border border-line">
                                        {Array.from({ length: 31 }, (_, i) => {
                                            const dayNum = i + 1;
                                            const currentVal = Number(salesDeepDive?.daily.current.find(d => Number(d.day) === dayNum)?.total || 0);
                                            const previousVal = Number(salesDeepDive?.daily.previous.find(d => Number(d.day) === dayNum)?.total || 0);
                                            const max = Math.max(...(salesDeepDive?.daily.current.map(d => Number(d.total)) || [1]), ...(salesDeepDive?.daily.previous.map(d => Number(d.total)) || [1])) || 1;

                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                                                    <div className="w-full flex items-end gap-[1px] h-full max-h-[140px]">
                                                        <div className="flex-1 bg-black/10 rounded-t-sm" style={{ height: `${(previousVal / max) * 100}%` }}></div>
                                                        <div className="flex-1 bg-black rounded-t-sm transition-all group-hover:bg-primary" style={{ height: `${(currentVal / max) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[8px] text-secondary font-bold">{dayNum}</span>

                                                    <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] p-2 rounded hidden group-hover:block z-20 whitespace-nowrap shadow-xl">
                                                        <div className="font-bold border-b border-white/20 pb-1 mb-1 font-heading">Día {dayNum}</div>
                                                        <div>Hoy: ${currentVal.toLocaleString()}</div>
                                                        <div className="text-white/60">Mes Anterior: ${previousVal.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Drivers Table */}
                                <div>
                                    <h5 className="heading5 mb-6 text-sm">Motores de Crecimiento por Categoría</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="overflow-hidden border border-line rounded-2xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                    <tr>
                                                        <th className="px-6 py-4">Categoría</th>
                                                        <th className="px-6 py-4 text-right">Este Mes</th>
                                                        <th className="px-6 py-4 text-right">Var. %</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-line">
                                                    {salesDeepDive?.categories.slice(0, 6).map((cat, i) => (
                                                        <tr key={i} className="hover:bg-surface/50 transition-colors">
                                                            <td className="px-6 py-4 font-bold capitalize text-sm">{cat.category}</td>
                                                            <td className="px-6 py-4 text-right font-medium text-sm">${Number(cat.current).toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${cat.growth >= 0 ? 'bg-success text-white' : 'bg-red text-white'}`}>
                                                                    {cat.growth >= 0 ? '+' : ''}{cat.growth}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/10 flex flex-col justify-center">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                                                    <Icon.Lightbulb size={20} weight="fill" />
                                                </div>
                                                <h6 className="heading6 text-sm">Resumen Ejecutivo</h6>
                                            </div>
                                            <p className="text-xs leading-relaxed text-secondary space-y-4">
                                                El corte actual muestra <strong className="text-black">{dashboardStats?.totalSales?.progress?.percentage}%</strong> frente al mismo tramo del mes anterior. La categoría con mayor variación es <strong className="text-black capitalize">{salesDeepDive?.categories[0]?.category || 'sin ventas'}</strong>, con <strong className={Number(salesDeepDive?.categories[0]?.growth ?? 0) >= 0 ? 'text-success' : 'text-red'}>{salesDeepDive?.categories[0]?.growth ?? 0}%</strong>.
                                                <br /><br />
                                                Úsalo para decidir reposición, descuentos o foco comercial por categoría sin mezclar pedidos pendientes.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDeepDive === 'profit' && (
                            <div className="space-y-4">
                                <h5 className="heading5 text-sm">Rentabilidad Realizada</h5>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-2 space-y-3">
                                        {salesDeepDive?.categories.slice(0, 4).map((cat, i) => {
                                            const revenue = Number(cat.current);
                                            const maxRevenue = Math.max(...(salesDeepDive?.categories || []).map((item) => Number(item.current || 0)), 1)
                                            const revenueShare = maxRevenue > 0 && revenue > 0 ? Math.max(2, (revenue / maxRevenue) * 100) : 0
                                            return (
                                                <div key={i} className="bg-surface p-4 rounded-lg border border-line">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="capitalize font-bold text-sm">{cat.category}</span>
                                                        <span className="text-xs font-bold text-primary">{formatMoney(revenue)} venta neta MTD</span>
                                                    </div>
                                                    <div className="w-full h-4 bg-line rounded-full overflow-hidden shadow-inner">
                                                        <div className="h-full bg-success" style={{ width: `${revenueShare}%` }}></div>
                                                    </div>
                                                    <div className="flex justify-between mt-2 text-[10px] font-bold text-secondary uppercase">
                                                        <span>MES ACTUAL</span>
                                                        <span>{cat.growth >= 0 ? '+' : ''}{cat.growth}% VS MISMO CORTE ANTERIOR</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="bg-black text-white p-5 rounded-2xl shadow-2xl flex flex-col justify-between border border-white/10">
                                        <div>
                                            <h6 className="text-[10px] text-white/40 uppercase font-bold mb-4">Estado de Resultados</h6>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-xs text-white/50 mb-1">Ingresos Totales (sin IVA, sin envío)</div>
                                                    <div className="text-2xl font-bold">${Number(dashboardStats.businessMetrics?.profitStats?.revenue || 0).toLocaleString()}</div>
                                                </div>
                                                <div className="pb-4 border-b border-white/10">
                                                    <div className="text-xs text-white/50 mb-1">Costo Directo (COGS)</div>
                                                    <div className="text-2xl font-bold text-orange-400">-${Number(dashboardStats.businessMetrics?.profitStats?.cost || 0).toLocaleString()}</div>
                                                </div>
                                                 <div className="grid grid-cols-2 gap-3 border-b border-white/10 pb-4">
                                                     <div>
                                                         <div className="text-xs text-white/50 mb-1">Envío cobrado</div>
                                                         <div className="text-xl font-bold text-white/80">${Number(dashboardStats.businessMetrics?.profitStats?.shipping_collected ?? reportBalanceShipping).toLocaleString()}</div>
                                                     </div>
                                                     <div>
                                                         <div className="text-xs text-white/50 mb-1">Gastos del período</div>
                                                         <div className="text-xl font-bold text-orange-400">-${reportBalancePeriodExpenses.toLocaleString()}</div>
                                                     </div>
                                                     <div className="col-span-2 text-[10px] text-white/40">Gastos pagados: -${reportBalancePaidExpenses.toLocaleString()}. Pendientes/vencidos: -${(reportBalancePendingExpenses + reportBalanceOverdueExpenses).toLocaleString()}.</div>
                                                 </div>
                                                 <div className="grid grid-cols-2 gap-3">
                                                     <div>
                                                         <div className="text-xs text-white/50 mb-1">Utilidad bruta</div>
                                                         <div className="text-2xl font-bold text-success">${Number(dashboardStats.businessMetrics?.profitStats?.gross_profit ?? dashboardStats.businessMetrics?.profitStats?.profit ?? 0).toLocaleString()}</div>
                                                     </div>
                                                     <div>
                                                         <div className="text-xs text-white/50 mb-1">Utilidad neta</div>
                                                         <div className={`text-2xl font-bold ${reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}`}>${reportBalanceNetProfit.toLocaleString()}</div>
                                                     </div>
                                                     <div>
                                                         <div className="text-xs text-white/50 mb-1">Margen bruto</div>
                                                         <div className="text-xl font-bold">{reportBalanceGrossMargin.toFixed(1)}%</div>
                                                     </div>
                                                     <div>
                                                         <div className="text-xs text-white/50 mb-1">Margen neto</div>
                                                         <div className="text-xl font-bold">{reportBalanceNetMargin.toFixed(1)}%</div>
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5 text-[10px] text-white/40 leading-relaxed italic">
                                            * La utilidad neta descuenta gastos registrados por período; la utilidad neta pagada descuenta solo gastos ya pagados de ese período.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDeepDive === 'aov' && (
                            <div className="space-y-10">
                                <h5 className="heading5 text-sm mb-6">Distribución de Valor por Pedido</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-surface p-8 rounded-3xl border border-line">
                                        <div className="space-y-8">
                                            {metrics.aovDeepDive?.distribution.map((item, i) => {
                                                const perc = Number(item.order_share ?? 0);
                                                return (
                                                    <div key={i}>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="font-bold text-sm">{item.bucket}</span>
                                                            <span className="text-xs text-secondary">{Number(item.count ?? 0).toLocaleString('es-EC')} pedidos • {perc.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-line rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${perc}%` }}></div>
                                                        </div>
                                                        <div className="mt-2 flex justify-between text-[11px] text-secondary">
                                                            <span>Promedio: {formatMoney(Number(item.avg_order_value ?? 0))}</span>
                                                            <span>Ingreso: {formatMoney(Number(item.revenue ?? 0))}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-6">
                                        <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl">
                                            <h6 className="heading6 text-sm mb-4 text-blue-900 flex items-center gap-2">
                                                <Icon.Target size={20} weight="fill" /> Lectura útil
                                            </h6>
                                            {(() => {
                                                const distribution = metrics.aovDeepDive?.distribution || []
                                                const lowValueOrders = distribution
                                                    .filter((item) => ['$20 a $49.99', 'Menor a $20'].includes(String(item.bucket)))
                                                    .reduce((acc, item) => acc + Number(item.count ?? 0), 0)
                                                const totalOrders = distribution.reduce((acc, item) => acc + Number(item.count ?? 0), 0) || 1
                                                const lowValueShare = (lowValueOrders / totalOrders) * 100
                                                const largestRevenueBucket = distribution.slice().sort((left, right) => Number(right.revenue ?? 0) - Number(left.revenue ?? 0))[0]
                                                return (
                                                    <p className="text-xs text-blue-800 leading-relaxed">
                                                        {lowValueShare.toFixed(1)}% de los pedidos realizados están por debajo de $50 netos.
                                                        El mayor aporte de ingresos viene de {largestRevenueBucket?.bucket || 'sin segmento'}.
                                                        Usa esta vista para definir umbrales de combos, retiro en tienda o envío gratis sin inventar proyecciones.
                                                    </p>
                                                )
                                            })()}
                                        </div>
                                        <div className="p-8 bg-white border border-line rounded-3xl shadow-sm">
                                            <h6 className="heading6 text-sm mb-4">Ingresos por Segmento</h6>
                                            <div className="space-y-4">
                                                {metrics.aovDeepDive?.distribution.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                        <span className="text-secondary">{item.bucket} ({Number(item.revenue_share ?? 0).toFixed(1)}%)</span>
                                                        <span className="font-bold">{formatMoney(Number(item.revenue ?? 0))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDeepDive === 'inventory' && (
                            <div className="space-y-10">
                                <h5 className="heading5 text-sm mb-6">Salud y Riesgos de Inventario</h5>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="bg-white border border-line rounded-3xl overflow-hidden">
                                            <div className="p-6 bg-surface border-b border-line">
                                                <h6 className="font-bold text-xs uppercase tracking-wider">Mayor Inversión en Almacén (Top 5)</h6>
                                            </div>
                                            <table className="w-full text-left">
                                                <thead className="bg-surface/50 text-[10px] text-secondary font-bold uppercase">
                                                    <tr>
                                                        <th className="px-6 py-4">Producto</th>
                                                        <th className="px-6 py-4 text-center">Stock</th>
                                                        <th className="px-6 py-4 text-right">Valor Costo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-line">
                                                    {inventoryDeepDive?.highValueItems.map((item, i) => (
                                                        <tr key={i} className="hover:bg-surface/30">
                                                            <td className="px-6 py-4 text-sm font-medium">{item.name}</td>
                                                            <td className="px-6 py-4 text-center text-sm">{item.quantity}</td>
                                                            <td className="px-6 py-4 text-right text-sm font-bold text-primary">${Number(item.total_cost).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-red/5 border border-red/10 rounded-2xl">
                                                <h6 className="text-[10px] font-bold text-red uppercase mb-4">Pedidos Pendientes de Stock (Riesgo)</h6>
                                                <div className="space-y-3">
                                                    {inventoryDeepDive?.riskItems.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs">
                                                            <span>{item.name}</span>
                                                            <span className="font-bold text-red">{item.quantity} un.</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-6 bg-success/5 border border-success/10 rounded-2xl flex flex-col justify-center items-center text-center">
                                                <div className="text-3xl font-bold text-success mb-1">{inventoryHealth?.overstock}</div>
                                                <div className="text-[10px] font-bold text-secondary uppercase">Productos en Sobre-Stock</div>
                                                <p className="text-[9px] text-secondary mt-2">Sugerencia: Liquidar para liberar capital operativo</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                                                <h6 className="text-[10px] font-bold text-amber-800 uppercase mb-4">Productos por vencer</h6>
                                                {expiringInventoryItems.length === 0 ? (
                                                    <p className="text-xs text-secondary">No hay productos próximos a vencer.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {expiringInventoryItems.map((item, i) => (
                                                            <div key={`${item.id || item.legacy_id || item.name}-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                                                <div>
                                                                    <div className="font-semibold">{item.name}</div>
                                                                    <div className="text-secondary">
                                                                        Vence: {formatIsoDate(item.expiration_date)} • Stock: {Number(item.quantity || 0)}
                                                                    </div>
                                                                </div>
                                                                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-bold whitespace-nowrap">
                                                                    {Math.max(0, Number(item.days_to_expire || 0))} día(s)
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
                                                <h6 className="text-[10px] font-bold text-red uppercase mb-4">Productos vencidos</h6>
                                                {expiredInventoryItems.length === 0 ? (
                                                    <p className="text-xs text-secondary">No hay productos vencidos con stock.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {expiredInventoryItems.map((item, i) => (
                                                            <div key={`${item.id || item.legacy_id || item.name}-${i}`} className="flex items-center justify-between gap-3 text-xs">
                                                                <div>
                                                                    <div className="font-semibold">{item.name}</div>
                                                                    <div className="text-secondary">
                                                                        Venció: {formatIsoDate(item.expiration_date)} • Stock: {Number(item.quantity || 0)}
                                                                    </div>
                                                                </div>
                                                                <span className="px-2 py-1 rounded-full bg-red-100 text-red font-bold whitespace-nowrap">
                                                                    {Math.max(0, Number(item.days_expired || 0))} día(s)
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-black text-white p-8 rounded-[40px] shadow-xl">
                                            <h6 className="text-xs font-bold uppercase mb-6 text-white/50">Resumen de Almacén</h6>
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm">Sin Stock</span>
                                                    <span className="text-lg font-bold text-red">{inventoryHealth?.out_of_stock}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm">Bajo Stock</span>
                                                    <span className="text-lg font-bold text-yellow">{inventoryHealth?.low_stock}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm">Por vencer</span>
                                                    <span className="text-lg font-bold text-amber-300">{expiringProductsCount}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm">Vencidos</span>
                                                    <span className="text-lg font-bold text-red-300">{expiredProductsCount}</span>
                                                </div>
                                                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                                                    <span className="text-sm font-bold">Inversión Total</span>
                                                    <span className="text-xl font-bold text-success">{formatMoney(Number(dashboardStats.businessMetrics?.inventoryValue?.cost_value ?? 0))}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8 bg-orange-50 border border-orange-100 rounded-[40px]">
                                            <h6 className="text-xs font-bold text-orange-900 mb-4 flex items-center gap-2">
                                                <Icon.WarningDiamond size={20} weight="fill" /> Alerta de Capital
                                            </h6>
                                            <p className="text-xs text-orange-800 leading-relaxed">
                                                Tienes <strong className="text-orange-950">${Number(inventoryDeepDive?.highValueItems[0]?.total_cost).toLocaleString()}</strong> inmovilizados en un solo producto. Se recomienda revisar la rotación para evitar obsolescencia.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedDeepDive === 'product-breakdown' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 border border-line rounded-xl bg-surface">
                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Métrica seleccionada</div>
                                        <div className="text-sm font-semibold">{productBreakdownMeta.title}</div>
                                    </div>
                                    <div className="p-4 border border-line rounded-xl bg-surface">
                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Total</div>
                                        <div className="heading6">{formatMoney(productMetricTotal)}</div>
                                    </div>
                                    <div className="p-4 border border-line rounded-xl bg-surface">
                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Productos</div>
                                        <div className="heading6">{productMetricRows.length}</div>
                                    </div>
                                </div>

                                {selectedProductMetric !== 'inventory' && (
                                    <div className="overflow-x-auto border border-line rounded-xl">
                                        <table className="w-full min-w-[980px] text-left">
                                            <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                <tr>
                                                    <th className="px-4 py-3">Producto</th>
                                                    <th className="px-4 py-3">Categoría</th>
                                                    <th className="px-4 py-3 text-right">Unidades</th>
                                                    <th className="px-4 py-3 text-right">Neto</th>
                                                    <th className="px-4 py-3 text-right">IVA</th>
                                                    <th className="px-4 py-3 text-right">Envío</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                    <th className="px-4 py-3 text-right">Costo</th>
                                                    <th className="px-4 py-3 text-right">Utilidad</th>
                                                    <th className="px-4 py-3 text-right">Pedidos</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                                {salesProductBreakdown.map((item: any, idx: number) => {
                                                    const refs = Array.isArray(item.order_refs)
                                                        ? item.order_refs
                                                        : String(item.order_refs || '').split(',').map((value) => value.trim()).filter(Boolean)
                                                    return (
                                                        <tr key={`${item.product_id || item.product_name}-${idx}`} className="hover:bg-surface/50">
                                                            <td className="px-4 py-3">
                                                                <div className="font-semibold text-sm">{item.product_name}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm capitalize">{item.category || 'Sin categoría'}</td>
                                                            <td className="px-4 py-3 text-sm text-right">{Number(item.units || 0)}</td>
                                                            <td className="px-4 py-3 text-sm text-right font-semibold">{formatMoney(item.net)}</td>
                                                            <td className="px-4 py-3 text-sm text-right">{formatMoney(item.vat)}</td>
                                                            <td className="px-4 py-3 text-sm text-right">{formatMoney(item.shipping)}</td>
                                                            <td className="px-4 py-3 text-sm text-right">{formatMoney(item.gross)}</td>
                                                            <td className="px-4 py-3 text-sm text-right">{formatMoney(item.cost)}</td>
                                                            <td className={`px-4 py-3 text-sm text-right font-semibold ${item.profit >= 0 ? 'text-success' : 'text-red'}`}>
                                                                {formatMoney(item.profit)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right">{refs.length}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {selectedProductMetric === 'inventory' && (
                                    <div className="overflow-x-auto border border-line rounded-xl">
                                        <table className="w-full min-w-[900px] text-left">
                                            <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                <tr>
                                                    <th className="px-4 py-3">Producto</th>
                                                    <th className="px-4 py-3">Categoría</th>
                                                    <th className="px-4 py-3 text-right">Stock</th>
                                                    <th className="px-4 py-3 text-right">Costo Unitario</th>
                                                    <th className="px-4 py-3 text-right">Valor Inventario</th>
                                                    <th className="px-4 py-3 text-right">PVP Unitario</th>
                                                    <th className="px-4 py-3 text-right">Valor Mercado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                                {inventoryProductBreakdown.map((item) => (
                                                    <tr key={item.id} className="hover:bg-surface/50">
                                                        <td className="px-4 py-3 font-semibold text-sm">{item.name}</td>
                                                        <td className="px-4 py-3 text-sm capitalize">{item.category}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{formatMoney(item.unitCost)}</td>
                                                        <td className="px-4 py-3 text-sm text-right font-semibold">{formatMoney(item.inventoryCost)}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{formatMoney(item.unitPrice)}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{formatMoney(item.inventoryMarket)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const usersTabActive = ADMIN_TABS_WITH_USERS.has(activeTab || '')
    const adminUsersEnriched = React.useMemo(() => {
        if (!usersTabActive) {
            return [] as ReturnType<typeof enrichAdminUsers>
        }
        return enrichAdminUsers(adminUsersList, parseJsonValue, getAdminUserResolvedAddress, formatAddress)
    }, [adminUsersList, formatAddress, getAdminUserResolvedAddress, parseJsonValue, usersTabActive])

    const adminUsersSearchTerm = normalizeProductSearch(deferredAdminUsersSearch)
    const filteredAdminUsers = React.useMemo(() => {
        if (!usersTabActive) {
            return [] as typeof adminUsersEnriched
        }
        return adminUsersEnriched.filter((item) => {
            const roleNormalized = String(item.role || 'customer').toLowerCase()
            const isAdmin = roleNormalized === 'admin' || roleNormalized === 'service'
            if (adminUsersRoleFilter === 'admins' && !isAdmin) return false
            if (adminUsersRoleFilter === 'clients' && isAdmin) return false

            if (!adminUsersSearchTerm) return true
            const text = normalizeProductSearch(`${item.name || ''} ${item.email || ''} ${item.document_number || ''} ${item.resolvedPhone || ''} ${item.resolvedAddressText || ''} ${item.resolvedCompany || ''}`)
            return matchesProductSearch(text, adminUsersSearchTerm)
        })
    }, [adminUsersEnriched, adminUsersRoleFilter, adminUsersSearchTerm, usersTabActive])
    const adminUsersSummary = React.useMemo(() => {
        if (!usersTabActive) {
            return {
                admins: 0,
                clients: 0,
                verified: 0,
                withOrders: 0,
                withAddress: 0,
                withPhone: 0,
                newLast30Days: 0,
            }
        }
        const now = Date.now()
        const last30DaysMs = 30 * 24 * 60 * 60 * 1000
        return adminUsersEnriched.reduce((acc, item) => {
            const roleNormalized = String(item.role || 'customer').toLowerCase()
            const isAdmin = roleNormalized === 'admin' || roleNormalized === 'service'
            const createdAt = item.created_at ? new Date(item.created_at).getTime() : NaN
            if (isAdmin) acc.admins += 1
            else acc.clients += 1
            if (Boolean(item.email_verified)) acc.verified += 1
            if (Number(item.orders_total ?? 0) > 0) acc.withOrders += 1
            if (item.hasAddress) acc.withAddress += 1
            if (item.hasPhone) acc.withPhone += 1
            if (Number.isFinite(createdAt) && now - createdAt <= last30DaysMs) acc.newLast30Days += 1
            return acc
        }, {
            admins: 0,
            clients: 0,
            verified: 0,
            withOrders: 0,
            withAddress: 0,
            withPhone: 0,
            newLast30Days: 0
        })
    }, [adminUsersEnriched, usersTabActive])

    const recentUserOrders = React.useMemo(() => userOrders.slice(0, 5), [userOrders])
    const totalUserOrders = userOrders.length
    const canceledUserOrders = React.useMemo(
        () => userOrders.filter((order) => ['canceled', 'cancelled'].includes(normalizeStatus(order.status))).length,
        [userOrders]
    )
    const pickupUserOrders = React.useMemo(
        () => userOrders.filter((order) => ['pickup', 'ready_for_pickup', 'ready'].includes(normalizeStatus(order.status))).length,
        [userOrders]
    )

    const matchesActiveOrder = (order: Order) => {
        const status = normalizeStatus(order.status)
        const isAdminOrders = activeTab === 'admin-orders'
        if (!activeOrders || activeOrders === 'all') return true
        if (activeOrders === 'pending') {
            return isAdminOrders ? status === 'pending' : ['pending', 'processing'].includes(status)
        }
        if (activeOrders === 'processing') return ['processing', 'in_process', 'in-process'].includes(status)
        if (activeOrders === 'delivery') return ['shipped', 'shipping', 'delivery', 'delivered'].includes(status)
        if (activeOrders === 'completed') return ['completed', 'delivered'].includes(status)
        if (activeOrders === 'canceled') return ['canceled', 'cancelled'].includes(status)
        return true
    }
    const filteredUserOrders = React.useMemo(() => userOrders.filter(matchesActiveOrder), [userOrders, activeOrders, activeTab])
    const filteredAdminOrders = React.useMemo(() => adminOrdersList.filter(matchesActiveOrder), [adminOrdersList, activeOrders, activeTab])
    const adminOrdersCounts = React.useMemo(() => {
        const counts = {
            all: adminOrdersList.length,
            pending: 0,
            processing: 0,
            delivery: 0,
            completed: 0,
            canceled: 0
        }
        adminOrdersList.forEach((order) => {
            const status = normalizeStatus(order.status)
            if (status === 'pending') counts.pending += 1
            if (['processing', 'in_process', 'in-process'].includes(status)) counts.processing += 1
            if (['shipped', 'shipping', 'delivery', 'delivered'].includes(status)) counts.delivery += 1
            if (['completed', 'delivered'].includes(status)) counts.completed += 1
            if (['canceled', 'cancelled'].includes(status)) counts.canceled += 1
        })
        return counts
    }, [adminOrdersList])
    const pickupReadyOrders = React.useMemo(() => {
        return adminOrdersList
            .filter((order) => ['pickup', 'ready_for_pickup', 'ready'].includes(normalizeStatus(order.status)))
            .slice(0, 8)
    }, [adminOrdersList])
    const selectedOrderContact = React.useMemo(
        () => getOrderContact(selectedOrder, user, savedAddresses),
        [selectedOrder, savedAddresses, user]
    )
    const balanceSalesSummary = dashboardStats?.businessMetrics?.salesSummary
    const balanceProfitStats = dashboardStats?.businessMetrics?.profitStats
    const balanceRecentOrders = dashboardStats?.businessMetrics?.recentOrders || []
    const balanceTraceabilityOrders = dashboardStats?.businessMetrics?.traceability?.orders || []
    const balanceTraceabilityProducts = dashboardStats?.businessMetrics?.traceability?.products || []

    if (authBootstrapping || !user) {
        return (
            <>
                <div id="header" className='relative w-full'>
                    <MenuOne props="bg-transparent" />
                </div>
                <div className="profile-block bg-[#f7f8f6] py-4 sm:py-5 lg:py-6">
                    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-10">
                        <div className="bg-surface rounded-[20px] p-8 md:p-10 text-center">
                            <div className="heading5 text-title">
                                {authBootstrapping ? 'Cargando tu cuenta...' : 'Sesión no disponible'}
                            </div>
                            <p className="text-secondary mt-3">
                                {authBootstrapping
                                    ? 'Estamos validando tus datos.'
                                    : 'Inicia sesión para continuar en tu panel.'}
                            </p>
                            {!authBootstrapping && (
                                <Link href="/login" className="button-main inline-block mt-5">
                                    Ir a iniciar sesión
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {user.role === 'admin' ? (
                <AccountPanelHeader user={user} onLogout={handleLogout} />
            ) : (
                <div id="header" className='relative w-full'>
                    <MenuOne props="bg-transparent" />
                </div>
            )}

            <NotificationOverlay message={message} onClose={() => setMessage(null)} />
            <AdminAccountShellStyles />

            <div className={`profile-block bg-[#f7f8f6] ${user.role === 'admin' ? 'admin-account-shell py-2 sm:py-3 lg:py-4' : 'py-4 sm:py-5 lg:py-6'}`}>
                <div className={user.role === 'admin' ? 'w-full max-w-none mx-auto px-3 sm:px-4 lg:px-6 2xl:px-8' : 'w-full max-w-[1200px] mx-auto px-6 md:px-10'}>
                    <div className={user.role === 'admin' ? 'content-main grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)] gap-4 lg:gap-5 w-full min-w-0' : 'content-main grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 lg:gap-10 w-full min-w-0'}>
                        <div className="left w-full min-w-0">
                            <AccountSidebar
                                user={user}
                                activeTab={activeTab}
                                adminReportSection={adminReportSection}
                                adminMenuExpanded={adminMenuExpanded}
                                focusedReferenceCatalogKey={focusedReferenceCatalogKey}
                                onToggleAdminMenuGroup={toggleAdminMenuGroup}
                                onOpenAdminReportSection={openAdminReportSection}
                                onNavigateToPanelTab={navigateToPanelTab}
                                onNavigateToReferenceCatalog={navigateToReferenceCatalog}
                                onLogout={handleLogout}
                                strategicAlertsCount={strategicAlerts.length}
                                strategicCriticalCount={strategicAlertSummary.critical}
                            />
                        </div>
                        <div className="right w-full min-w-0">
                            {user.role === 'admin' && (
                                <>
                                    {adminDataLoading && (
                                        <div className="mb-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-secondary">
                                            Actualizando datos del panel...
                                        </div>
                                    )}
                                    {adminDataError && (
                                        <div className="mb-4 rounded-lg border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
                                            {adminDataError}
                                        </div>
                                    )}
                                    <div className="mb-4 flex justify-end">
                                        <button
                                            type="button"
                                            className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${adminDataLoading ? 'border-line text-secondary bg-surface cursor-not-allowed' : 'border-black text-black hover:bg-black hover:text-white'}`}
                                            onClick={invalidateAdminPanelData}
                                            disabled={adminDataLoading}
                                        >
                                            {adminDataLoading ? 'Actualizando...' : 'Recargar panel'}
                                        </button>
                                    </div>
                                    {activeTab === 'alerts' && (
                                        <AdminAlertsTab
                                            currentDateLabel={currentDateLabel}
                                            alertsSeverityFilter={alertsSeverityFilter}
                                            setAlertsSeverityFilter={setAlertsSeverityFilter}
                                            strategicAlertsCount={strategicAlerts.length}
                                            strategicAlertSummary={strategicAlertSummary}
                                            filteredStrategicAlerts={filteredStrategicAlerts}
                                            alertSeverityLabels={alertSeverityLabels}
                                            inventoryHealth={dashboardStats?.businessMetrics?.inventoryDeepDive?.health}
                                            onNavigateToInventory={() => navigateToPanelTab('inventory')}
                                            onAlertAction={handleStrategicAlertAction}
                                        />
                                    )}
                                    {activeTab === 'security-settings' && (
                                        <div className="tab text-content w-full">
                                            <div className="heading5 pb-4">Seguridad</div>
                                            <div className="rounded-xl border border-line bg-white p-5">
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                                                    <div className="flex-1">
                                                        <label htmlFor="customerSessionHours" className="text-secondary text-xs uppercase font-bold mb-2 block">
                                                            Sesión clientes (horas)
                                                        </label>
                                                        <input
                                                            id="customerSessionHours"
                                                            type="number"
                                                            step="1"
                                                            min={sessionSettings.minCustomerSessionHours ?? 6}
                                                            max={sessionSettings.maxSessionHours ?? 168}
                                                            className="border border-line px-4 py-2 rounded-lg w-full"
                                                            value={sessionSettings.customerSessionHours}
                                                            onChange={(event) => {
                                                                const value = Number(event.target.value)
                                                                setSessionSettings((prev) => normalizeSessionSettings({
                                                                    ...prev,
                                                                    customerSessionHours: Number.isFinite(value) ? value : prev.customerSessionHours,
                                                                }))
                                                            }}
                                                            disabled={sessionSettingsLoading || sessionSettingsSaving}
                                                        />
                                                        <p className="text-secondary text-xs mt-2">Mínimo {sessionSettings.minCustomerSessionHours ?? 6} horas.</p>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label htmlFor="adminSessionHours" className="text-secondary text-xs uppercase font-bold mb-2 block">
                                                            Sesión admins (horas)
                                                        </label>
                                                        <input
                                                            id="adminSessionHours"
                                                            type="number"
                                                            step="1"
                                                            min={sessionSettings.minAdminSessionHours ?? 12}
                                                            max={sessionSettings.maxSessionHours ?? 168}
                                                            className="border border-line px-4 py-2 rounded-lg w-full"
                                                            value={sessionSettings.adminSessionHours}
                                                            onChange={(event) => {
                                                                const value = Number(event.target.value)
                                                                setSessionSettings((prev) => normalizeSessionSettings({
                                                                    ...prev,
                                                                    adminSessionHours: Number.isFinite(value) ? value : prev.adminSessionHours,
                                                                }))
                                                            }}
                                                            disabled={sessionSettingsLoading || sessionSettingsSaving}
                                                        />
                                                        <p className="text-secondary text-xs mt-2">Mínimo {sessionSettings.minAdminSessionHours ?? 12} horas.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="button-main py-2 px-6 disabled:opacity-60"
                                                        onClick={handleSaveSessionSettings}
                                                        disabled={sessionSettingsLoading || sessionSettingsSaving}
                                                    >
                                                        {sessionSettingsSaving ? 'Guardando...' : 'Guardar sesiones'}
                                                    </button>
                                                </div>
                                                <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-xs text-secondary">
                                                    Los nuevos inicios de sesión usarán {sessionSettings.customerSessionHours}h para clientes y {sessionSettings.adminSessionHours}h para administradores.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'reports' && (
                                        <div className="tab text-content w-full">
                                            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 pb-4">
                                                <div>
                                                    <div className="heading5">{activeReportMeta.title}</div>
                                                    <p className="text-secondary text-xs mt-1">{activeReportMeta.subtitle}</p>
                                                    {adminReportSection === 'balance' && (
                                                        <div className="mt-2 inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-secondary">
                                                            Alcance del balance: <span className="ml-1 text-black">{reportFinancialScopeLabel}</span>
                                                        </div>
                                                    )}
                                                    {adminReportSection === 'sales' && (
                                                        <div className="mt-2 inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-secondary">
                                                            Periodo de ventas: <span className="ml-1 text-black">{activeSalesReportViewLabel}</span>
                                                        </div>
                                                    )}
                                                    {adminReportSection === 'inventory' && (
                                                        <div className="mt-2 inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-secondary">
                                                            Disponibilidad: <span className="ml-1 text-black">{Number(inventoryHealth?.low_stock ?? 0)} bajo stock / {Number(inventoryHealth?.out_of_stock ?? 0)} sin stock</span>
                                                        </div>
                                                    )}
                                                    {adminReportSection === 'traceability' && (
                                                        <div className="mt-2 inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-secondary">
                                                            Soporte auditado: <span className="ml-1 text-black">{traceabilityOrders.length.toLocaleString('es-EC')} pedidos</span>
                                                        </div>
                                                    )}
                                                    {adminReportSection === 'products-purchases' && (
                                                        <div className="mt-2 inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-secondary">
                                                            Ventas período: <span className="ml-1 text-black">{productsPurchaseSectionSummary.productsWithSales.toLocaleString('es-EC')} SKU</span>
                                                            <span className="mx-1 text-secondary/60">·</span>
                                                            Compras acumuladas: <span className="ml-1 text-black">{productsPurchaseSectionSummary.productsWithPurchases.toLocaleString('es-EC')} SKU</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="text-sm font-bold px-3.5 py-1.5 rounded-lg border border-black bg-black text-white hover:bg-white hover:text-black transition-colors"
                                                        onClick={handleExportCurrentReport}
                                                    >
                                                        Exportar a Excel
                                                    </button>
                                                    <div className="text-sm font-bold text-secondary bg-surface px-3.5 py-1.5 rounded-lg border border-line">
                                                        {currentDateLabel}
                                                    </div>
                                                </div>
                                            </div>

                                            {adminReportSection === 'general' && (
                                                <div className="mb-5 flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <div className="text-sm font-bold">Control financiero completo</div>
                                                        <p className="mt-0.5 text-xs text-secondary">
                                                            Disponible en Balance con IVA utilizable {businessControlSummary.currentCreditRate.toLocaleString('es-EC', { maximumFractionDigits: 1 })}% y diferido {businessControlSummary.carryforwardCreditRate.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="w-fit rounded-lg border border-black bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black"
                                                        onClick={() => openAdminReportSection('balance')}
                                                    >
                                                        Abrir balance
                                                    </button>
                                                </div>
                                            )}

                                            {adminReportSection === 'general' && (
                                                <>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="text-sm font-bold">Resumen ejecutivo</div>
                                                            <p className="text-xs text-secondary">
                                                                {reportGeneralScopeLabel} · {reportOrdersCount.toLocaleString('es-EC')} pedidos realizados · promedio {formatMoney(reportAverageOrderNet)}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex bg-surface p-0.5 rounded-lg border border-line">
                                                                <button
                                                                    onClick={() => {
                                                                        setTrendRange('day')
                                                                        selectSalesReportView('daily')
                                                                    }}
                                                                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${trendRange === 'day' ? 'bg-black text-white shadow-sm' : 'text-secondary hover:text-black'}`}
                                                                >
                                                                    Día
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setTrendRange('week')
                                                                        selectSalesReportView('week')
                                                                    }}
                                                                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${trendRange === 'week' ? 'bg-black text-white shadow-sm' : 'text-secondary hover:text-black'}`}
                                                                >
                                                                    Semana
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setTrendRange('month')
                                                                        selectReportMonth(getCurrentMonthKey())
                                                                    }}
                                                                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${trendRange === 'month' ? 'bg-black text-white shadow-sm' : 'text-secondary hover:text-black'}`}
                                                                >
                                                                    Mes
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setTrendRange('all')
                                                                        selectSalesReportView('historical')
                                                                    }}
                                                                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${trendRange === 'all' ? 'bg-black text-white shadow-sm' : 'text-secondary hover:text-black'}`}
                                                                >
                                                                    Todo
                                                                </button>
                                                            </div>
                                                            {pendingOperationalOrders > 0 && (
                                                                <span className="inline-flex items-center rounded-full bg-[#FDE68A] px-3 py-1 text-[11px] font-bold text-[#92400E]">
                                                                    {pendingOperationalOrders} pedido{pendingOperationalOrders !== 1 ? 's' : ''} por atender
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-bold text-secondary bg-surface border border-line rounded-lg px-3 py-1.5">
                                                                {currentDateLabel}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
                                                        <button
                                                            type="button"
                                                            className={`p-3 rounded-lg border text-left transition-all ${pendingOperationalOrders > 0 ? 'border-[#F59E0B] bg-[#FFF7E8] hover:border-[#D97706]' : 'border-line bg-white hover:border-black'}`}
                                                            onClick={openPendingOrdersShortcut}
                                                        >
                                                            <div className="text-[10px] uppercase font-bold text-secondary mb-1">Pedidos por atender</div>
                                                            <div className={`text-xl font-bold ${pendingOperationalOrders > 0 ? 'text-[#B45309]' : 'text-black'}`}>{pendingOperationalOrders}</div>
                                                            <div className="text-[11px] text-secondary mt-0.5">{purePendingOperationalOrders} pend. · {processingOperationalOrders} proc.</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="p-3 rounded-lg border border-line bg-white text-left transition-all hover:border-black"
                                                            onClick={() => navigateToPanelTab('taxes')}
                                                        >
                                                            <div className="text-[10px] uppercase font-bold text-secondary mb-1">IVA vigente</div>
                                                            <div className="text-xl font-bold">{vatRateLabel}%</div>
                                                            <div className="text-[11px] text-secondary mt-0.5">{vatMultiplierLabel}x · ${vatExampleTotal} c/$100 base</div>
                                                        </button>
                                                         <button
                                                             type="button"
                                                             className="p-3 rounded-lg border border-line bg-white text-left transition-all hover:border-primary"
                                                             onClick={() => openProductBreakdown('gross')}
                                                         >
                                                             <div className="text-[10px] uppercase font-bold text-secondary mb-1">Ventas brutas</div>
                                                             <div className="text-xl font-bold">{formatMoney(reportBalanceGross)}</div>
                                                              <div className="text-[11px] text-secondary mt-0.5">{reportGeneralScopeLabel} · Incluye IVA + envío</div>
                                                         </button>
                                                         <button
                                                             type="button"
                                                             className="p-3 rounded-lg border border-line bg-white text-left transition-all hover:border-primary"
                                                             onClick={() => openProductBreakdown('net')}
                                                         >
                                                             <div className="text-[10px] uppercase font-bold text-secondary mb-1">Ventas netas</div>
                                                             <div className="text-xl font-bold">{formatMoney(reportBalanceNet)}</div>
                                                             <div className="text-[11px] text-secondary mt-0.5">
                                                                  {reportGeneralScopeLabel}
                                                             </div>
                                                         </button>
                                                         <button
                                                             type="button"
                                                             className="p-3 rounded-lg border border-line bg-white text-left transition-all hover:border-primary"
                                                             onClick={() => openProductBreakdown('vat')}
                                                         >
                                                             <div className="text-[10px] uppercase font-bold text-secondary mb-1">IVA cobrado</div>
                                                             <div className="text-xl font-bold">{formatMoney(reportBalanceVat)}</div>
                                                              <div className="text-[11px] text-secondary mt-0.5">{reportGeneralScopeLabel} · Envío cobrado {formatMoney(reportBalanceShipping)}</div>
                                                         </button>
                                                          <button
                                                              type="button"
                                                              className="p-3 rounded-lg border border-line bg-white text-left transition-all hover:border-primary"
                                                              onClick={() => openAdminReportSection('sales')}
                                                          >
                                                               <div className="text-[10px] uppercase font-bold text-secondary mb-1">Unidades vendidas</div>
                                                               <div className="text-xl font-bold">{(trendRange === 'week' ? reportWeekUnitCount : Math.round(salesRankingUnitsSold)).toLocaleString('es-EC')}</div>
                                                                <div className="text-[11px] text-secondary mt-0.5">{reportGeneralScopeLabel} · Ticket prom. {formatMoney(reportAverageOrderNet)}</div>
                                                          </button>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-xl border border-line shadow-sm mb-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                 <div className="text-sm font-bold">Tendencia de ventas</div>
                                                                 <p className="text-xs text-secondary mt-1">
                                                                     Evolución diaria de {trendMetric === 'gross' ? 'ventas totales' : 'utilidad neta'} · {trendRange === 'day' ? 'Hoy' : trendRange === 'week' ? 'Últimos 7 días' : trendRange === 'month' ? 'Mes seleccionado' : 'Todo histórico'}
                                                                 </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex bg-surface p-0.5 rounded-lg border border-line">
                                                                    <button
                                                                        onClick={() => setTrendMetric('gross')}
                                                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${trendMetric === 'gross' ? 'bg-black text-white shadow-sm' : 'text-secondary hover:text-black'}`}
                                                                    >
                                                                        Venta total
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setTrendMetric('profit')}
                                                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${trendMetric === 'profit' ? 'bg-black text-white shadow-sm' : 'text-secondary hover:text-black'}`}
                                                                    >
                                                                        Utilidad
                                                                    </button>
                                                                 </div>
                                                            </div>
                                                        </div>
                                                        {dashboardStats ? (
                                                             (() => {
                                                                 const adjust = (item: { total: number, gross: number, cost: number }) =>
                                                                     trendMetric === 'profit'
                                                                         ? Number(item.gross) - Number(item.cost)
                                                                         : Number(item.gross) || 0
                                                                 const todayKey = getEcuadorTodayKey()
                                                                 const week = getEcuadorLastSevenDaysRange(todayKey)
                                                                 const firstDayStr = `${selectedRankingMonth}-01`
                                                                 const [selectedYear, selectedMonth] = selectedRankingMonth.split('-').map((part) => Number(part))
                                                                 const nextMonthStart = Number.isFinite(selectedYear) && Number.isFinite(selectedMonth)
                                                                     ? new Date(Date.UTC(selectedYear, selectedMonth, 1, 12, 0, 0)).toISOString().slice(0, 10)
                                                                     : ''
                                                                 const monthData = (dashboardStats.salesTrend30Days || []).filter((item) => {
                                                                     const day = item.day || ''
                                                                     return day >= firstDayStr && (!nextMonthStart || day < nextMonthStart)
                                                                 })
                                                                 const weekData = (dashboardStats.monthlyPerformance || []).filter((item) => {
                                                                     const dateKey = String(item.date || item.day || '').slice(0, 10)
                                                                     return dateKey >= week.start && dateKey <= week.end
                                                                 })
                                                                 const dayData = weekData.filter((item) => String(item.date || item.day || '').slice(0, 10) === todayKey)
                                                                 const displayData = trendRange === 'day' ? dayData : trendRange === 'week' ? weekData : monthData
                                                                 const weekAdjusted = weekData.map(adjust)
                                                                 const weekMax = Math.max(...weekAdjusted, 1)
                                                                 const monthAdjusted = monthData.map(adjust)
                                                                 const monthMax = Math.max(...monthAdjusted, 1)
                                                                  if (trendRange === 'all') {
                                                                      return (
                                                                          <div className="rounded-lg border border-line bg-surface px-4 py-8 text-center">
                                                                              <div className="text-sm font-bold">{reportGeneralScopeLabel}</div>
                                                                              <div className="mt-1 text-xs text-secondary">El total histórico se resume en las tarjetas. Para tendencia diaria usa Día, Semana o Mes.</div>
                                                                          </div>
                                                                      )
                                                                  }
                                                                  return (trendRange === 'day' || trendRange === 'week') ? (
                                                                     <div className="flex items-end gap-1 justify-between">
                                                                        {displayData.map((item, i) => {
                                                                            const value = adjust(item)
                                                                            const pct = (value / weekMax) * 100
                                                                            const label = formatDashboardTrendLabel(item, { weekday: 'short' })
                                                                            const itemDateKey = String(item.date || item.day || '').slice(0, 10)
                                                                            const isToday = trendRange === 'day' || itemDateKey === todayKey
                                                                            return (
                                                                                <div key={i} className="flex flex-col items-center gap-1 flex-1 max-w-[48px] group cursor-pointer" title={`${label}: ${formatMoney(value)}`}>
                                                                                    <span className={`text-[10px] font-bold leading-tight ${value > 0 ? (isToday ? 'text-black' : 'text-black') : 'text-secondary/40'}`}>{formatMoney(value)}</span>
                                                                                    <div className="w-full bg-secondary/5 rounded relative flex items-end h-24 overflow-hidden">
                                                                                        {value > 0 ? (
                                                                                            <div
                                                                                                className={`w-full rounded transition-all duration-500 ${isToday ? 'bg-black' : 'bg-black/50 group-hover:bg-black/70'}`}
                                                                                                style={{ height: `${Math.max(pct, 4)}%` }}
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="w-full flex items-center justify-center pb-1">
                                                                                                <div className="w-1 h-1 rounded-full bg-secondary/30" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className={`text-[10px] font-bold leading-tight ${isToday ? 'text-black' : 'text-secondary'}`}>{isToday ? 'HOY' : label}</span>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                         <div className="flex items-end gap-px justify-between mb-1">
                                                                            {monthData.map((item, i) => {
                                                                                const value = adjust(item)
                                                                                const pct = (value / monthMax) * 100
                                                                                return (
                                                                                    <div key={i} className="flex-1 max-w-[24px] group cursor-pointer" title={`${formatDashboardTrendLabel(item, { day: '2-digit', month: 'short' })}: ${formatMoney(value)}`}>
                                                                                        <div className="flex flex-col items-center">
                                                                                            <span className="text-[8px] font-bold text-secondary opacity-0 group-hover:opacity-100 transition-opacity leading-tight">{formatMoney(value)}</span>
                                                                                            <div className="w-full bg-secondary/5 rounded relative flex items-end h-20 overflow-hidden mt-px">
                                                                                                {value > 0 ? (
                                                                                                    <div
                                                                                                        className="w-full rounded bg-black/40 group-hover:bg-black/70 transition-colors"
                                                                                                        style={{ height: `${Math.max(pct, 4)}%` }}
                                                                                                    />
                                                                                                ) : (
                                                                                                    <div className="w-full flex items-center justify-center pb-1">
                                                                                                        <div className="w-0.5 h-0.5 rounded-full bg-secondary/20" />
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            {[0, Math.floor((monthData.length - 1) / 2), monthData.length - 1].map((idx, arrIdx) => {
                                                                                const item = monthData[idx];
                                                                                if (!item) return <span key={arrIdx} />;
                                                                                return (
                                                                                    <span key={idx} className="text-[10px] font-bold text-secondary">{formatDashboardTrendLabel(item, { day: '2-digit', month: 'short' })}</span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })()
                                                        ) : (
                                                            <div className="w-full h-20 flex items-center justify-center text-secondary text-xs">Cargando datos de tendencia...</div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                                                        <div className="bg-white p-4 rounded-xl border border-line shadow-sm">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <div className="text-sm font-bold">Utilidad</div>
                                                                     <p className="text-[11px] text-secondary mt-0.5">{reportGeneralScopeLabel}</p>
                                                                 </div>
                                                                 <button type="button" className="text-[11px] font-bold underline" onClick={() => openAdminReportSection('balance')}>ver balance</button>
                                                             </div>
                                                              <div className="space-y-2">
                                                                  <div className="rounded-lg bg-surface border border-line p-2.5">
                                                                      <div className="text-[10px] uppercase font-bold text-secondary">Bruta</div>
                                                                      <div className={`text-base font-bold ${reportBalanceGrossProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(reportBalanceGrossProfit)}</div>
                                                                      <div className="text-[11px] text-secondary">{reportBalanceGrossMargin.toFixed(1)}% margen</div>
                                                                  </div>
                                                                  <div className="rounded-lg bg-surface border border-line p-2.5">
                                                                      <div className="text-[10px] uppercase font-bold text-secondary">Neta</div>
                                                                      <div className={`text-base font-bold ${reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(reportBalanceNetProfit)}</div>
                                                                      <div className="text-[11px] text-secondary">{reportBalanceNetMargin.toFixed(1)}% margen</div>
                                                                  </div>
                                                             </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-xl border border-line shadow-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div>
                                                                     <div className="text-sm font-bold">Top 5 productos</div>
                                                                     <p className="text-[9px] text-secondary/50">{reportGeneralScopeLabel}</p>
                                                                 </div>
                                                                 <button type="button" className="text-[11px] font-bold underline" onClick={() => openAdminReportSection('sales')}>ver ranking</button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                   {reportSalesRankingRows.slice(0, 5).map((prod, i) => {
                                                                       const scaledUnits = Math.round(prod.units_sold)
                                                                       const scaledRevenue = prod.net_revenue
                                                                      return <div key={i} className="flex items-center gap-2 cursor-pointer group" onClick={() => openAdminReportSection('sales')}>
                                                                          <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">{i + 1}</span>
                                                                          <div className="flex-1 min-w-0">
                                                                              <div className="text-[11px] font-semibold truncate">{prod.product_name}</div>
                                                                              <div className="text-[10px] text-secondary">{scaledUnits} uds</div>
                                                                          </div>
                                                                          <div className="text-[11px] font-bold flex-shrink-0">{formatMoney(scaledRevenue)}</div>
                                                                      </div>
                                                                  })}
                                                                 {reportSalesRankingRows.length === 0 && (
                                                                    <div className="text-xs text-secondary">Sin productos vendidos.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-xl border border-line shadow-sm">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <div className="text-sm font-bold">Ventas recientes</div>
                                                                    <p className="text-[9px] text-secondary/50">{reportGeneralScopeLabel}</p>
                                                                </div>
                                                                <button type="button" className="text-[11px] font-bold underline" onClick={() => navigateToPanelTab('admin-orders')}>ver todo</button>
                                                            </div>
                                                            <div className="divide-y divide-line">
                                                                {reportSalesOrders.slice(0, 4).map((order) => (
                                                                    <div key={order.id} className="flex items-center justify-between py-2 cursor-pointer hover:bg-surface -mx-2 px-2 rounded-lg transition-colors" onClick={() => handleViewOrder(order.id)}>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-xs font-bold truncate">#{order.id.split('-').pop()}</div>
                                                                            <div className="text-[10px] text-secondary truncate">{order.user_name || 'Anónimo'} · {formatDateTimeEcuador(order.created_at, { hour: '2-digit', minute: '2-digit' })}</div>
                                                                        </div>
                                                                        <div className="text-xs font-bold flex-shrink-0 ml-2">{formatMoney(order.gross)}</div>
                                                                    </div>
                                                                ))}
                                                                {reportSalesOrders.length === 0 && (
                                                                    <div className="py-6 text-center text-xs text-secondary">Sin ventas en este período.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-xl border border-line shadow-sm">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <div className="text-sm font-bold">Indicadores financieros</div>
                                                                     <p className="text-[9px] text-secondary/50">{reportGeneralScopeLabel}</p>
                                                                 </div>
                                                                 <button type="button" className="text-[11px] font-bold underline" onClick={() => openAdminReportSection('balance')}>ver balance</button>
                                                            </div>
                                                             <div className="space-y-1.5">
                                                                 <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface border border-line">
                                                                     <span className="text-xs text-secondary font-semibold">Margen bruto</span>
                                                                     <span className={`text-sm font-bold ${reportBalanceGrossProfit >= 0 ? 'text-success' : 'text-red'}`}>{reportBalanceGrossMargin.toFixed(1)}%</span>
                                                                 </div>
                                                                 <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface border border-line">
                                                                     <span className="text-xs text-secondary font-semibold">Margen neto</span>
                                                                     <span className={`text-sm font-bold ${reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}`}>{reportBalanceNetMargin.toFixed(1)}%</span>
                                                                 </div>
                                                                 <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface border border-line">
                                                                     <span className="text-xs text-secondary font-semibold">Margen flujo caja</span>
                                                                     <span className={`text-sm font-bold ${reportBalanceFlowProfit >= 0 ? 'text-success' : 'text-red'}`}>{reportBalanceFlowMargin.toFixed(1)}%</span>
                                                                 </div>
                                                                 <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface border border-line">
                                                                     <span className="text-xs text-secondary font-semibold">ROI bruto</span>
                                                                     <span className="text-sm font-bold">{reportBalanceRoi.toFixed(1)}%</span>
                                                                 </div>
                                                                 <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface border border-line">
                                                                     <span className="text-xs text-secondary font-semibold">ROI neto</span>
                                                                     <span className="text-sm font-bold">{reportBalanceNetRoi.toFixed(1)}%</span>
                                                                 </div>
                                                             </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-xl border border-line shadow-sm">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="text-sm font-bold">Inventario</div>
                                                            <button type="button" className="text-[11px] font-bold underline" onClick={() => openAdminReportSection('inventory')}>ver detalle</button>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                            <div className="flex items-center gap-2 cursor-pointer transition-colors" onClick={() => openAdminReportSection('inventory')}>
                                                                <span className="text-xs text-secondary font-semibold">Capital invertido:</span>
                                                                <span className="text-sm font-bold">{formatMoney(Number(dashboardStats?.businessMetrics?.inventoryValue?.cost_value ?? 0))}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 cursor-pointer transition-colors" onClick={() => openAdminReportSection('inventory')}>
                                                                <span className="text-xs text-secondary font-semibold">Valor de venta:</span>
                                                                <span className="text-sm font-bold">{formatMoney(Number(dashboardStats?.businessMetrics?.inventoryValue?.market_value ?? 0))}</span>
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-secondary">{Number(dashboardStats?.businessMetrics?.inventoryValue?.skus_with_stock ?? 0).toLocaleString('es-EC')} con stock</span>
                                                            {Number(inventoryHealth?.out_of_stock ?? 0) > 0 && <span className="text-[11px] text-red font-bold">{inventoryHealth?.out_of_stock} agotados</span>}
                                                            {Number(inventoryHealth?.low_stock ?? 0) > 0 && <span className="text-[11px] text-amber-700 font-bold">{inventoryHealth?.low_stock} bajo stock</span>}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {adminReportSection === 'sales' && (
                                                <>
                                                    <div className="bg-white p-6 rounded-2xl border border-line shadow-sm mb-6">
                                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                                                            <div>
                                                                <div className="heading6">Corte comercial de ventas</div>
                                                                 <p className="text-secondary text-xs mt-1">
                                                                     Vista activa: {activeSalesReportViewLabel} con pedidos completados o entregados.
                                                                 </p>
                                                                 <p className="text-secondary text-xs mt-1">
                                                                     Periodo: {reportSalesPeriodLabel}
                                                                 </p>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                                            {salesRankingView === 'month' && (
                                                                <label className="flex flex-col gap-1 text-[10px] uppercase font-bold text-secondary">
                                                                    Mes a consultar
                                                                    <input
                                                                        type="month"
                                                                        value={salesRankingMonth}
                                                                        onChange={(event) => selectReportMonth(event.target.value)}
                                                                        className="px-3 py-1.5 text-sm font-semibold rounded-md border border-line bg-white text-black focus:border-black outline-none"
                                                                    />
                                                                </label>
                                                            )}
                                                            <div className="flex bg-surface p-1 rounded-lg border border-line w-fit">
                                                                        <button
                                                                        type="button"
                                                                        onClick={() => selectSalesReportView('daily')}
                                                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'daily' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                                    >
                                                                        Día
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => selectSalesReportView('week')}
                                                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'week' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                                    >
                                                                        Semana
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => selectSalesReportView('month')}
                                                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'month' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                                    >
                                                                        Mes
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => selectSalesReportView('historical')}
                                                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'historical' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                                    >
                                                                        Todo
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 xl:grid-cols-10 gap-3">
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Pedidos vendidos</div>
                                                                <div className="text-lg font-bold">{Number((activePeriodReport?.sales as any)?.orders_count ?? salesRankingFinancial?.orders_count ?? 0).toLocaleString('es-EC')}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Unidades vendidas</div>
                                                                <div className="text-lg font-bold">{Number(salesRankingUnitsSold).toLocaleString('es-EC')}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Ventas brutas</div>
                                                                <div className="text-lg font-bold">{formatMoney(Number((activePeriodReport?.sales as any)?.gross ?? salesRankingFinancial?.gross ?? 0))}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Ventas netas</div>
                                                                <div className="text-lg font-bold">{formatMoney(Number((activePeriodReport?.sales as any)?.net ?? salesRankingFinancial?.net ?? salesRankingTotals?.net_revenue ?? 0))}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">IVA cobrado</div>
                                                                <div className="text-lg font-bold">{formatMoney(Number((activePeriodReport?.sales as any)?.vat ?? salesRankingFinancial?.vat ?? 0))}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Envío cobrado</div>
                                                                <div className="text-lg font-bold">{formatMoney(Number((activePeriodReport?.sales as any)?.shipping ?? salesRankingFinancial?.shipping ?? 0))}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Costo de venta</div>
                                                                <div className="text-lg font-bold">{formatMoney(Number((activePeriodReport?.sales as any)?.cost ?? salesRankingFinancial?.cost ?? 0))}</div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Ganancia bruta</div>
                                                                <div className={`text-lg font-bold ${(Number((activePeriodReport?.sales as any)?.profit ?? salesRankingFinancial?.profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
                                                                    {formatMoney(Number((activePeriodReport?.sales as any)?.profit ?? salesRankingFinancial?.profit ?? 0))}
                                                                </div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Ganancia neta</div>
                                                                <div className={`text-lg font-bold ${(Number((activePeriodReport?.profit as any)?.net_period_profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
                                                                    {formatMoney(Number((activePeriodReport?.profit as any)?.net_period_profit ?? 0))}
                                                                </div>
                                                            </div>
                                                            <div className="p-3 rounded-lg border border-line bg-surface">
                                                                <div className="text-[10px] uppercase font-bold text-secondary">Margen bruto</div>
                                                                <div className="text-lg font-bold">{(() => {
                                                                    const effNet = Number((activePeriodReport?.sales as any)?.net ?? 0)
                                                                    const effProfit = Number((activePeriodReport?.sales as any)?.profit ?? 0)
                                                                    const effMargin = effNet > 0 ? (effProfit / effNet) * 100 : 0
                                                                    const margin = Number(salesRankingFinancial?.margin ?? 0)
                                                                    if (margin !== 0 && effMargin === 0) return margin.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                                                    return effMargin.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                                                })()}%</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-6 rounded-2xl border border-line shadow-sm mb-6">
                                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                                                            <div>
                                                                <div className="heading6">Pedidos vendidos del período</div>
                                                                 <p className="text-secondary text-xs mt-1">
                                                                     Listado de soporte con fecha, cliente, forma de entrega/pago y desglose comercial de cada venta realizada en {salesRankingView === 'daily' ? 'el día' : salesRankingView === 'week' ? 'la semana' : salesRankingView === 'historical' ? 'todo el historial' : 'el mes'} {salesRankingView === 'month' ? `de ${selectedRankingMonthLabel}` : ''} ({reportSalesPeriodLabel}).
                                                                 </p>
                                                            </div>
                                                            <div className="text-xs font-bold text-secondary bg-surface border border-line rounded-lg px-3 py-2">
                                                                {filteredReportSalesOrders.length.toLocaleString('es-EC')} de {reportSalesOrders.length.toLocaleString('es-EC')} venta{reportSalesOrders.length === 1 ? '' : 's'}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col md:flex-row gap-2 mb-4">
                                                            <input
                                                                type="search"
                                                                value={salesOrderSearch}
                                                                onChange={(event) => setSalesOrderSearch(event.target.value)}
                                                                placeholder="Buscar pedido, cliente, fecha o monto"
                                                                className="w-full md:flex-1 px-3 py-2 text-sm rounded-lg border border-line bg-white text-black focus:border-black outline-none"
                                                            />
                                                            <select
                                                                value={salesOrderStatusFilter}
                                                                onChange={(event) => setSalesOrderStatusFilter(event.target.value as 'all' | 'completed' | 'delivered')}
                                                                className="px-3 py-2 text-sm font-semibold rounded-lg border border-line bg-white text-black focus:border-black outline-none"
                                                            >
                                                                <option value="all">Todos los estados</option>
                                                                <option value="completed">Completado</option>
                                                                <option value="delivered">Entregado</option>
                                                            </select>
                                                            {(salesOrderSearch || salesOrderStatusFilter !== 'all') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSalesOrderSearch('')
                                                                        setSalesOrderStatusFilter('all')
                                                                    }}
                                                                    className="px-3 py-2 rounded-lg border border-line text-xs font-bold text-secondary hover:text-black hover:bg-surface"
                                                                >
                                                                    Limpiar
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {filteredReportSalesOrders.map((order: ReportSalesOrder) => {
                                                                const status = getStatusBadge(order.status)
                                                                const profit = Number(order.profit ?? 0)
                                                                return (
                                                                    <article key={order.id} className="rounded-xl border border-line bg-white p-4 shadow-sm transition-colors hover:bg-surface/30">
                                                                        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,0.75fr)_minmax(0,1.15fr)_minmax(0,1.45fr)]">
                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] uppercase font-bold text-secondary">Pedido</div>
                                                                                <button type="button" className="mt-1 text-left text-sm font-bold break-all hover:underline" onClick={() => handleViewOrder(order.id)}>
                                                                                    #{order.id}
                                                                                </button>
                                                                                <div className="mt-2 text-xs text-secondary">
                                                                                    {formatDateEcuador(order.created_at)} · {formatDateTimeEcuador(order.created_at, { hour: '2-digit', minute: '2-digit' })}
                                                                                </div>
                                                                                <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}>
                                                                                    {status.label}
                                                                                </span>
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] uppercase font-bold text-secondary">Cliente y contacto</div>
                                                                                <div className="mt-1 text-sm font-bold break-words">{order.user_name || 'Cliente sin nombre'}</div>
                                                                                <div className="mt-1 text-xs text-secondary break-all">{order.customer_email || '-'}</div>
                                                                                <div className="text-xs text-secondary">{order.customer_phone || '-'}</div>
                                                                                <div className="mt-2 text-xs font-semibold break-words">{getReportCustomerDocument(order)}</div>
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] uppercase font-bold text-secondary">Entrega / pago</div>
                                                                                <div className="mt-1 text-sm font-semibold">{getReportDeliveryMethodLabel(order.delivery_method)}</div>
                                                                                <div className="text-xs text-secondary">{getReportPaymentMethodLabel(order.payment_method)}</div>
                                                                                {order.discount_code && (
                                                                                    <div className="mt-2 rounded-md bg-surface px-2 py-1 text-[11px] font-bold text-secondary break-words">
                                                                                        Cupón: {order.discount_code}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] uppercase font-bold text-secondary">Productos</div>
                                                                                <div className="mt-1 text-sm leading-5 break-words">{order.items_summary || '-'}</div>
                                                                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-secondary">
                                                                                    <span className="rounded-full bg-surface px-2 py-1">
                                                                                        {Number(order.item_lines_count ?? 0).toLocaleString('es-EC')} línea{Number(order.item_lines_count ?? 0) === 1 ? '' : 's'}
                                                                                    </span>
                                                                                    <span className="rounded-full bg-surface px-2 py-1">
                                                                                        {Number(order.units_count ?? 0).toLocaleString('es-EC')} uds
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
                                                                                    <ReportCompactMetric label="Bruta" value={formatMoney(order.gross)} />
                                                                                    <ReportCompactMetric label="Neta" value={formatMoney(order.net)} />
                                                                                    <ReportCompactMetric label="IVA" value={formatMoney(order.vat)} />
                                                                                    <ReportCompactMetric label="Envío" value={formatMoney(order.shipping)} />
                                                                                    <ReportCompactMetric label="Desc." value={formatMoney(order.discount_total ?? 0)} />
                                                                                    <ReportCompactMetric label="Costo" value={formatMoney(order.cost ?? 0)} />
                                                                                    <ReportCompactMetric label="Utilidad" value={formatMoney(order.profit ?? 0)} tone={profit >= 0 ? 'text-success' : 'text-red'} />
                                                                                    <ReportCompactMetric label="Margen" value={`${Number(order.margin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </article>
                                                                )
                                                            })}
                                                            {filteredReportSalesOrders.length === 0 && (
                                                                <div className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-secondary">
                                                                    {reportSalesOrders.length === 0
                                                                        ? 'No hay ventas completadas o entregadas para este período.'
                                                                        : 'No hay ventas que coincidan con los filtros activos.'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6 mb-6">
                                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div>
                                                                    <div className="heading6">Tendencia reciente de ventas</div>
                                                                    <p className="text-secondary text-xs mt-1">Últimos {salesTrendPreview.length} cortes diarios disponibles para comparar ritmo comercial.</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface"
                                                                    onClick={() => setSelectedDeepDive('sales')}
                                                                >
                                                                    Abrir análisis
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                {salesTrendPreview.map((item, index) => {
                                                                    const value = Number(item.total ?? 0)
                                                                    const ratio = salesTrendPreviewMax > 0 && value > 0
                                                                        ? Math.max((value / salesTrendPreviewMax) * 100, 8)
                                                                        : 0
                                                                    return (
                                                                        <div key={`${item.day}-${index}`} className="rounded-xl border border-line bg-surface p-3">
                                                                            <div className="text-[10px] uppercase font-bold text-secondary">{item.displayDay ?? item.day}</div>
                                                                            <div className="font-bold mt-2">{formatMoney(value)}</div>
                                                                            <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
                                                                                <div className="h-full bg-black rounded-full" style={{ width: `${ratio}%` }}></div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                                {salesTrendPreview.length === 0 && (
                                                                    <div className="col-span-full text-sm text-secondary">Sin datos suficientes para tendencia reciente.</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                            <div className="heading6 mb-4">Mix de ventas por categoría</div>
                                                            <div className="space-y-4">
                                                                {reportSalesCategories.slice(0, 6).map((cat, index) => {
                                                                    const value = Number(cat.total ?? 0)
                                                                    const ratio = reportSalesCategoriesTotal > 0 && value > 0 ? Math.max((value / reportSalesCategoriesTotal) * 100, 4) : 0
                                                                    return (
                                                                        <div key={`${cat.category}-${index}`}>
                                                                            <div className="flex items-center justify-between gap-3 text-sm mb-1">
                                                                                <span className="font-semibold capitalize">{cat.category || 'Sin categoría'}</span>
                                                                                <span className="font-bold">{formatMoney(value)}</span>
                                                                            </div>
                                                                            <div className="h-2 rounded-full bg-surface overflow-hidden">
                                                                                <div className="h-full bg-primary rounded-full" style={{ width: `${ratio}%` }}></div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                                {reportSalesCategories.length === 0 && (
                                                                    <div className="text-sm text-secondary">No hay categorías con ventas registradas.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                                                            <div>
                                                                <div className="heading6">Productos líderes del período</div>
                                                                <p className="text-secondary text-xs mt-1">Ranking compacto por unidades, ventas netas, utilidad bruta y margen bruto.</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="px-4 py-2 rounded-lg border border-line text-sm font-semibold hover:bg-surface"
                                                                onClick={() => setActiveTab('sales-ranking')}
                                                            >
                                                                Ver ranking detallado
                                                            </button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {reportSalesRankingRows.slice(0, 10).map((item, index) => {
                                                                const refs = Array.isArray(item.order_refs) ? item.order_refs : []
                                                                return (
                                                                    <article key={`${item.product_id}-${index}`} className="rounded-xl border border-line bg-white p-4 shadow-sm transition-colors hover:bg-surface/30">
                                                                        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.65fr)]">
                                                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                                                                                {index + 1}
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] uppercase font-bold text-secondary">Producto</div>
                                                                                <button type="button" className="mt-1 text-left text-sm font-bold leading-5 break-words hover:underline" onClick={() => openSalesProductDetail(item)}>
                                                                                    {item.product_name}
                                                                                </button>
                                                                                <div className="mt-2 inline-flex rounded-full bg-surface px-2 py-1 text-[11px] font-bold capitalize text-secondary">
                                                                                    {item.category || 'Sin categoría'}
                                                                                </div>
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="text-[10px] uppercase font-bold text-secondary">Pedidos relacionados</div>
                                                                                <div className="mt-1 text-xs leading-5 text-secondary break-words">
                                                                                    {refs.length > 0 ? refs.join(', ') : '-'}
                                                                                </div>
                                                                            </div>

                                                                            <div className="min-w-0">
                                                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                                                    <ReportCompactMetric label="Pedidos" value={item.orders_count.toLocaleString('es-EC')} />
                                                                                    <ReportCompactMetric label="Unidades" value={item.units_sold.toLocaleString('es-EC')} />
                                                                                    <ReportCompactMetric label="Bruta" value={formatMoney(item.gross_revenue)} />
                                                                                    <ReportCompactMetric label="Neta" value={formatMoney(item.net_revenue)} />
                                                                                    <ReportCompactMetric label="IVA" value={formatMoney(item.vat_amount)} />
                                                                                    <ReportCompactMetric label="Envío" value={formatMoney(item.shipping_amount)} />
                                                                                    <ReportCompactMetric label="Costo" value={formatMoney(item.cost)} />
                                                                                    <ReportCompactMetric label="Utilidad" value={formatMoney(item.profit)} tone={item.profit >= 0 ? 'text-success' : 'text-red'} />
                                                                                    <ReportCompactMetric label="Margen" value={`${item.margin.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </article>
                                                                )
                                                            })}
                                                            {reportSalesRankingRows.length === 0 && (
                                                                <div className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-secondary">
                                                                    No hay datos de ventas para construir el reporte.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {adminReportSection === 'balance' && (
                                                <>
                                                    <FinancialTrendsPanel
                                                        trends={financialTrends}
                                                        formatMoney={formatMoney}
                                                        mode={financialTrendMode}
                                                        scope={financialTrendScope}
                                                        selectedPeriod={selectedFinancialPeriod}
                                                        onModeChange={setFinancialTrendMode}
                                                        onScopeChange={setFinancialTrendScope}
                                                        onSelectedPeriodChange={setSelectedFinancialPeriod}
                                                    />

                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                                        <div>
                                                            <div className="text-gray-400 text-sm">Estado financiero operativo para leer ingresos, costos, gastos y utilidad neta.</div>
                                                            <div className="heading3 mt-1">{formatMoney(balanceNet)}</div>
                                                            <div className="text-secondary text-xs mt-0.5">Ventas netas de {reportFinancialScopeLabel.toLowerCase()}, sin IVA ni envío.</div>
                                                        </div>
                                                        <div className="text-xs text-secondary sm:text-right">{balanceOrdersCount.toLocaleString('es-EC')} pedidos realizados • promedio {formatMoney(balanceAverageOrderNet)}</div>
                                                    </div>

                                                    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line">
                                                            <div className="px-3 py-2">
                                                                <div className="text-[10px] uppercase text-secondary font-bold mb-1">Ingresos e impuestos</div>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Ventas brutas</span><strong>{formatMoney(balanceGross)}</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Ventas netas</span><strong>{formatMoney(balanceNet)}</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">IVA cobrado</span><strong className="text-orange-600">{formatMoney(balanceVat)}</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Envío cobrado</span><strong>{formatMoney(balanceShipping)}</strong></div>
                                                                </div>
                                                            </div>
                                                            <div className="px-3 py-2">
                                                                <div className="text-[10px] uppercase text-secondary font-bold mb-1">Utilidad y gastos</div>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Utilidad bruta</span><strong className={balanceGrossProfit >= 0 ? 'text-success' : 'text-red'}>{formatMoney(balanceGrossProfit)}</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Utilidad neta</span><strong className={balanceNetProfit >= 0 ? 'text-success' : 'text-red'}>{formatMoney(balanceNetProfit)}</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Utilidad neta pagada</span><strong className={balanceFlowProfit >= 0 ? 'text-success' : 'text-red'}>{formatMoney(balanceFlowProfit)}</strong></div>
                                                                    <div className="col-span-2 text-[11px] text-secondary">Costo de venta -{formatMoney(balanceCost)} • gastos del período -{formatMoney(balancePeriodExpenses)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="px-3 py-2">
                                                                <div className="text-[10px] uppercase text-secondary font-bold mb-1">Márgenes</div>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Margen bruto</span><strong>{balanceGrossMargin.toFixed(1)}%</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Margen neto</span><strong className={balanceNetProfit >= 0 ? 'text-black' : 'text-red'}>{balanceNetMargin.toFixed(1)}%</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">Margen de flujo</span><strong className={balanceFlowProfit >= 0 ? 'text-black' : 'text-red'}>{balanceFlowMargin.toFixed(1)}%</strong></div>
                                                                    <div className="col-span-2 text-[11px] text-secondary">Sobre ventas netas.</div>
                                                                </div>
                                                            </div>
                                                            <div className="px-3 py-2">
                                                                <div className="text-[10px] uppercase text-secondary font-bold mb-1">ROI</div>
                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">ROI bruto</span><strong>{balanceRoi.toFixed(1)}%</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">ROI neto</span><strong>{balanceNetRoi.toFixed(1)}%</strong></div>
                                                                    <div className="flex justify-between gap-2"><span className="text-secondary">ROI neto pagado</span><strong>{balanceFlowRoi.toFixed(1)}%</strong></div>
                                                                    <div className="col-span-2 text-[11px] text-secondary">Neto: gastos del período. Neto pagado: solo gastos pagados del mismo período.</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-4">
                                                        <div className="p-4 rounded-lg border border-line bg-white shadow-sm">
                                                            <div className="font-bold mb-3">Lectura paso a paso del balance</div>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Ventas brutas facturadas</span>
                                                                    <strong>{formatMoney(balanceGross)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Menos IVA comprometido</span>
                                                                    <strong className="text-orange-600">-{formatMoney(balanceVat)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Ventas netas del negocio</span>
                                                                    <strong>{formatMoney(balanceNet)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Menos costo de venta</span>
                                                                    <strong className="text-orange-600">-{formatMoney(balanceCost)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black text-white">
                                                                    <span>Utilidad bruta</span>
                                                                    <strong>{formatMoney(balanceGrossProfit)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Menos gastos del período</span>
                                                                    <strong className="text-orange-600">-{formatMoney(balancePeriodExpenses)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black text-white">
                                                                    <span>Utilidad neta del negocio</span>
                                                                    <strong>{formatMoney(balanceNetProfit)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Gastos pagados del período</span>
                                                                    <strong className="text-orange-600">-{formatMoney(balancePaidExpenses)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Gastos pendientes</span>
                                                                    <strong className="text-orange-600">-{formatMoney(balancePendingExpenses)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                    <span>Gastos vencidos</span>
                                                                    <strong className="text-orange-600">-{formatMoney(balanceOverdueExpenses)}</strong>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black text-white">
                                                                    <span>Utilidad neta pagada</span>
                                                                    <strong>{formatMoney(balanceFlowProfit)}</strong>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-4 rounded-lg border border-line bg-white shadow-sm">
                                                            <div className="font-bold mb-3">Acciones recomendadas</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="px-3 py-2 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface"
                                                                    onClick={() => {
                                                                        setSelectedDeepDive('profit')
                                                                        openAdminReportSection('general')
                                                                    }}
                                                                >
                                                                    Analizar rentabilidad
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="px-3 py-2 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface"
                                                                    onClick={() => navigateToPanelTab('margins')}
                                                                >
                                                                    Ajustar márgenes
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="px-3 py-2 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface"
                                                                    onClick={() => openAdminReportSection('sales')}
                                                                >
                                                                    Abrir reporte de ventas
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="px-4 py-2 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface"
                                                                    onClick={() => navigateToPanelTab('taxes')}
                                                                >
                                                                    IVA y costos de envío
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="px-4 py-2 rounded-lg border border-line text-sm font-semibold bg-white hover:bg-surface"
                                                                    onClick={() => navigateToPanelTab('expenses')}
                                                                >
                                                                    Registrar gastos
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
                                                        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                                            <div>
                                                                <div className="text-sm font-bold">Control financiero del negocio</div>
                                                                <p className="mt-1 text-xs text-secondary">
                                                                    {businessControlSummary.scopeLabel} · compras: {businessControlSummary.purchaseSourceLabel} · {businessControlSummary.purchaseInvoicesCount.toLocaleString('es-EC')} factura{businessControlSummary.purchaseInvoicesCount === 1 ? '' : 's'} de compra
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="w-fit rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface"
                                                                onClick={() => navigateToPanelTab('expenses')}
                                                            >
                                                                Registrar gastos y compras
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                            <BusinessControlMetric
                                                                label="IVA cobrado"
                                                                value={formatMoney(businessControlSummary.vatCollected)}
                                                                caption="Impuesto generado por ventas realizadas."
                                                                tone="text-orange-700"
                                                            />
                                                            <BusinessControlMetric
                                                                label="Credito IVA utilizable"
                                                                value={formatMoney(businessControlSummary.currentUsableVatCredit)}
                                                                caption={`${businessControlSummary.currentCreditRate.toLocaleString('es-EC', { maximumFractionDigits: 1 })}% de ${formatMoney(businessControlSummary.purchaseVatCredit)} en compras.`}
                                                                tone="text-success"
                                                            />
                                                            <BusinessControlMetric
                                                                label="IVA neto estimado"
                                                                value={businessControlSummary.estimatedVatPayable > 0 ? formatMoney(businessControlSummary.estimatedVatPayable) : formatMoney(0)}
                                                                caption={businessControlSummary.estimatedVatCreditBalance > 0 ? `Credito/diferido a favor ${formatMoney(businessControlSummary.estimatedVatCreditBalance)}` : 'IVA cobrado menos credito utilizable.'}
                                                                tone={businessControlSummary.estimatedVatPayable > 0 ? 'text-orange-700' : 'text-success'}
                                                            />
                                                            <BusinessControlMetric
                                                                label="Credito diferido"
                                                                value={formatMoney(businessControlSummary.deferredVatCredit)}
                                                                caption={`${businessControlSummary.carryforwardCreditRate.toLocaleString('es-EC', { maximumFractionDigits: 1 })}% parametrizado para el mes siguiente.`}
                                                                tone="text-secondary"
                                                            />
                                                            <BusinessControlMetric
                                                                label="Masa invertida controlada"
                                                                value={formatMoney(businessControlSummary.controlledCapitalMass)}
                                                                caption="Inventario a costo + costo vendido + obligaciones pendientes."
                                                            />
                                                            <BusinessControlMetric
                                                                label="Capital en inventario"
                                                                value={formatMoney(businessControlSummary.inventoryCost)}
                                                                caption={`Valor de venta potencial ${formatMoney(businessControlSummary.inventoryMarket)}.`}
                                                            />
                                                            <BusinessControlMetric
                                                                label="Ganancia potencial stock"
                                                                value={formatMoney(businessControlSummary.inventoryPotentialProfit)}
                                                                caption="Diferencia entre valor de venta y costo del inventario actual."
                                                                tone={businessControlSummary.inventoryPotentialProfit >= 0 ? 'text-success' : 'text-red'}
                                                            />
                                                            <BusinessControlMetric
                                                                label="Capital recuperado"
                                                                value={formatMoney(businessControlSummary.recoveredCapital)}
                                                                caption="Costo FIFO de productos ya vendido en el periodo."
                                                            />
                                                            <BusinessControlMetric
                                                                label="Utilidad neta"
                                                                value={formatMoney(businessControlSummary.netProfit)}
                                                                caption={`Flujo neto pagado ${formatMoney(businessControlSummary.flowProfit)}.`}
                                                                tone={businessControlSummary.netProfit >= 0 ? 'text-success' : 'text-red'}
                                                            />
                                                            <BusinessControlMetric
                                                                label="Caja reinvertible"
                                                                value={formatMoney(businessControlSummary.reinvestableCash)}
                                                                caption="Flujo neto descontando IVA estimado y gastos vencidos."
                                                                tone={businessControlSummary.reinvestableCash > 0 ? 'text-success' : 'text-secondary'}
                                                            />
                                                        </div>
                                                        {businessControlAlerts.length > 0 && (
                                                            <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
                                                                {businessControlAlerts.map((alert) => (
                                                                    <div key={alert.title} className={`rounded-lg border px-3 py-2 ${alert.tone}`}>
                                                                        <div className="text-xs font-bold">{alert.title}</div>
                                                                        <div className="mt-0.5 text-[11px] leading-snug">{alert.detail}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="heading6 mb-4 mt-10">Movimientos recientes del balance</div>
                                                    <div className="flex flex-col gap-4">
                                                        {(dashboardStats?.businessMetrics?.recentOrders || []).slice(0, 6).map((order: any) => {
                                                            const net = Number(order.vat_subtotal ?? (Number(order.total ?? 0) - Number(order.vat_amount ?? 0) - Number(order.shipping ?? 0)))
                                                            const vat = Number(order.vat_amount ?? 0)
                                                            const shipping = Number(order.shipping ?? 0)
                                                            return (
                                                                <div key={order.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-surface rounded-xl border border-line">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-success bg-opacity-10 text-success rounded-full flex items-center justify-center">
                                                                            <Icon.ArrowDownLeft weight="bold" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold">Pedido #{order.id}</div>
                                                                            <div className="text-secondary text-xs">{formatDateEcuador(order.created_at)}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-4 text-right text-sm md:w-[340px]">
                                                                        <div>
                                                                            <div className="text-[10px] uppercase text-secondary">Neto</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(net)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] uppercase text-secondary">IVA</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(vat)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] uppercase text-secondary">Envío</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(shipping)}</div>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-1.5 rounded-lg border border-line text-xs font-bold hover:bg-white"
                                                                        onClick={() => handleViewOrder(order.id)}
                                                                    >
                                                                        Ver pedido
                                                                    </button>
                                                                </div>
                                                            )
                                                        })}
                                                        {(dashboardStats?.businessMetrics?.recentOrders || []).length === 0 && (
                                                            <div className="text-center py-4 text-secondary">No hay transacciones recientes.</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {adminReportSection === 'inventory' && (
                                                <>
                                                    <div className="mb-4 rounded-lg border border-line bg-surface px-4 py-3">
                                                        <div className="text-sm font-bold">Valorización, disponibilidad y vencimientos</div>
                                                        <p className="mt-1 text-xs text-secondary">
                                                            Panorama general del inventario. Haz clic en las tarjetas de riesgo para ver el detalle de los productos afectados.
                                                        </p>
                                                    </div>

                                                    {inventoryIntelligence && (
                                                        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                                                            <div className="rounded-2xl border border-line bg-white p-5">
                                                                <div className="text-[10px] font-bold uppercase text-secondary">Plan operativo sugerido</div>
                                                                <div className="mt-2 text-3xl font-bold">{formatMoney(inventoryIntelligence.summary.suggested_purchase_cost)}</div>
                                                                <div className="mt-1 text-sm text-secondary">
                                                                    {Number(inventoryIntelligence.summary.suggested_purchase_units ?? 0).toLocaleString('es-EC')} unidades en {Number(inventoryIntelligence.summary.purchase_recommended_skus ?? 0).toLocaleString('es-EC')} SKU.
                                                                </div>
                                                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                                    <div className="rounded-lg bg-surface p-3">
                                                                        <div className="text-[10px] font-bold uppercase text-secondary">Riesgo</div>
                                                                        <div className="font-bold">{Number(inventoryIntelligence.summary.risk_skus ?? 0).toLocaleString('es-EC')} SKU</div>
                                                                    </div>
                                                                    <div className="rounded-lg bg-surface p-3">
                                                                        <div className="text-[10px] font-bold uppercase text-secondary">Datos</div>
                                                                        <div className="font-bold">{Number(inventoryIntelligence.health.data_quality_issues ?? 0).toLocaleString('es-EC')} revisar</div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="mt-4 w-full rounded-lg border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
                                                                    onClick={() => navigateToPanelTab('inventory')}
                                                                >
                                                                    Abrir centro operativo
                                                                </button>
                                                            </div>
                                                            <div className="rounded-2xl border border-line bg-white p-5">
                                                                <div className="heading6 mb-1">Prioridades inteligentes</div>
                                                                <p className="mb-4 text-xs text-secondary">
                                                                    Basadas en ventas reales, cobertura, margen, vencimientos y capital.
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {(inventoryIntelligence.actions || []).slice(0, 5).map((action) => (
                                                                        <div key={action.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:items-center md:justify-between">
                                                                            <div className="min-w-0">
                                                                                <div className="text-sm font-semibold break-words">{action.name}</div>
                                                                                <div className="text-xs text-secondary">{action.title}: {action.detail}</div>
                                                                            </div>
                                                                            <div className="text-xs font-bold text-secondary md:text-right">
                                                                                Score {Number(action.priority_score ?? 0).toLocaleString('es-EC')}
                                                                                {Number(action.suggested_purchase_qty ?? 0) > 0 && (
                                                                                    <span className="ml-2 text-black">+{Number(action.suggested_purchase_qty).toLocaleString('es-EC')} uds</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {(inventoryIntelligence.actions || []).length === 0 && (
                                                                        <div className="rounded-xl border border-line bg-surface p-4 text-sm text-secondary">
                                                                            No hay acciones urgentes con la información actual.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ── Financial summary row ── */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                        <div className="p-4 rounded-xl border border-line bg-white">
                                                            <div className="text-[10px] uppercase font-bold text-secondary mb-1">Capital en inventario</div>
                                                            <div className="text-2xl font-bold">{formatMoney(Number(inventoryValue?.cost_value ?? 0))}</div>
                                                            <div className="text-xs text-secondary mt-1">Costo actual del stock disponible</div>
                                                        </div>
                                                        <div className="p-4 rounded-xl border border-line bg-white">
                                                            <div className="text-[10px] uppercase font-bold text-secondary mb-1">Valor potencial de venta</div>
                                                            <div className="text-2xl font-bold">{formatMoney(Number(inventoryValue?.market_value ?? 0))}</div>
                                                            <div className="text-xs text-secondary mt-1">Stock valorizado al precio de venta</div>
                                                        </div>
                                                        <div className="p-4 rounded-xl border border-line bg-white">
                                                            <div className="text-[10px] uppercase font-bold text-secondary mb-1">Stock disponible</div>
                                                            <div className="text-2xl font-bold">{Number(inventoryValue?.total_items ?? 0).toLocaleString('es-EC')}</div>
                                                            <div className="text-xs text-secondary mt-1">{Number(inventoryValue?.skus_with_stock ?? 0).toLocaleString('es-EC')} productos con stock</div>
                                                        </div>
                                                    </div>

                                                    {/* ── Risk cards row ── */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                                                        {([
                                                            { key: 'out' as const, label: 'Sin stock', value: Number(inventoryHealth?.out_of_stock ?? 0), color: 'text-red', bg: 'bg-red-50/30', caption: 'Productos sin unidades disponibles', items: riskInventoryItems.filter((i) => (i as any).status === 'out' || Number(i.quantity ?? 0) <= 0) },
                                                            { key: 'critical' as const, label: 'Stock crítico', value: Number(inventoryHealth?.critical_stock ?? 0), color: 'text-orange-600', bg: 'bg-orange-50/30', caption: 'Stock por debajo del punto crítico', items: riskInventoryItems.filter((i) => (i as any).status === 'critical') },
                                                            { key: 'low' as const, label: 'Bajo stock', value: Number(inventoryHealth?.low_stock ?? 0), color: 'text-amber-700', bg: 'bg-amber-50/30', caption: 'Requieren reposición preventiva', items: riskInventoryItems.filter((i) => (i as any).status === 'low') },
                                                            { key: 'expiring' as const, label: 'Por vencer', value: Number(inventoryHealth?.expiring_products ?? 0), color: 'text-amber-600', bg: 'bg-amber-50/30', caption: 'Próximos a expirar', items: expiringInventoryItems },
                                                            { key: 'expired' as const, label: 'Vencidos', value: Number(inventoryHealth?.expired_products ?? 0), color: 'text-red', bg: 'bg-red-50/30', caption: 'Productos ya vencidos', items: expiredInventoryItems },
                                                            { key: 'all' as const, label: 'Capital invertido', value: `${formatMoney(Number(inventoryValue?.cost_value ?? 0))}`, color: 'text-black', bg: 'bg-surface', caption: 'Valor total del inventario', items: highValueInventoryItems.slice(0, 5) },
                                                        ]).map((card) => (
                                                            <div key={card.key} className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (card.key === 'all') {
                                                                            navigateToPanelTab('inventory')
                                                                        } else {
                                                                            setInventoryExpandedSection(inventoryExpandedSection === card.key ? null : card.key)
                                                                        }
                                                                    }}
                                                                    className={`w-full text-left p-4 rounded-xl border border-line bg-white hover:shadow-md transition-all ${inventoryExpandedSection === card.key ? 'ring-2 ring-black shadow-md' : ''}`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="text-[10px] uppercase font-bold text-secondary">{card.label}</div>
                                                                        {card.key !== 'all' && (
                                                                            <div className={`text-2xl font-bold ${card.color}`}>
                                                                                {Number(card.value).toLocaleString('es-EC')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {card.key === 'all' && (
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <div className="text-2xl font-bold">{String(card.value)}</div>
                                                                            <span className="text-xs text-secondary font-semibold">Capital</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs text-secondary mt-1">{card.caption}</div>
                                                                    {card.key !== 'all' && card.items.length > 0 && (
                                                                        <div className="mt-2 text-[11px] font-semibold text-secondary">
                                                                            {card.items.length} producto{card.items.length === 1 ? '' : 's'}
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* ── Inline detail panels ── */}
                                                    {inventoryExpandedSection === 'out' && riskInventoryItems.filter((i) => (i as any).status === 'out' || Number(i.quantity ?? 0) <= 0).length > 0 && (
                                                        <InventoryExpandedDetail
                                                            label="Sin stock"
                                                            items={riskInventoryItems.filter((i) => (i as any).status === 'out' || Number(i.quantity ?? 0) <= 0).slice(0, 10)}
                                                            stockKey="quantity"
                                                            extraLabel="Sin ventas recientes"
                                                            onClose={() => setInventoryExpandedSection(null)}
                                                            onManage={() => { setInventoryExpandedSection(null); navigateToPanelTab('inventory') }}
                                                        />
                                                    )}
                                                    {inventoryExpandedSection === 'critical' && riskInventoryItems.filter((i) => (i as any).status === 'critical').length > 0 && (
                                                        <InventoryExpandedDetail
                                                            label="Stock crítico"
                                                            items={riskInventoryItems.filter((i) => (i as any).status === 'critical').slice(0, 10)}
                                                            stockKey="quantity"
                                                            extraLabel="Cobertura por días"
                                                            onClose={() => setInventoryExpandedSection(null)}
                                                            onManage={() => { setInventoryExpandedSection(null); navigateToPanelTab('inventory') }}
                                                        />
                                                    )}
                                                    {inventoryExpandedSection === 'low' && riskInventoryItems.filter((i) => (i as any).status === 'low').length > 0 && (
                                                        <InventoryExpandedDetail
                                                            label="Bajo stock"
                                                            items={riskInventoryItems.filter((i) => (i as any).status === 'low').slice(0, 10)}
                                                            stockKey="quantity"
                                                            extraLabel="Cobertura por días"
                                                            onClose={() => setInventoryExpandedSection(null)}
                                                            onManage={() => { setInventoryExpandedSection(null); navigateToPanelTab('inventory') }}
                                                        />
                                                    )}
                                                    {inventoryExpandedSection === 'expiring' && expiringInventoryItems.length > 0 && (
                                                        <InventoryExpandedDetail
                                                            label="Por vencer"
                                                            items={expiringInventoryItems.slice(0, 10)}
                                                            stockKey="quantity"
                                                            extraLabel="Días para vencer"
                                                            expirationKey="days_to_expire"
                                                            onClose={() => setInventoryExpandedSection(null)}
                                                            onManage={() => { setInventoryExpandedSection(null); navigateToPanelTab('inventory') }}
                                                        />
                                                    )}
                                                    {inventoryExpandedSection === 'expired' && expiredInventoryItems.length > 0 && (
                                                        <InventoryExpandedDetail
                                                            label="Vencidos"
                                                            items={expiredInventoryItems.slice(0, 10)}
                                                            stockKey="quantity"
                                                            extraLabel="Días vencido"
                                                            expirationKey="days_expired"
                                                            onClose={() => setInventoryExpandedSection(null)}
                                                            onManage={() => { setInventoryExpandedSection(null); navigateToPanelTab('inventory') }}
                                                        />
                                                    )}

                                                    {/* ── Lower sections ── */}
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div>
                                                                    <div className="heading6">Productos con más capital invertido</div>
                                                                    <p className="text-secondary text-xs mt-1">Stock que concentra más costo en inventario.</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface"
                                                                    onClick={() => navigateToPanelTab('inventory')}
                                                                >
                                                                    Abrir inventario
                                                                </button>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {highValueInventoryItems.slice(0, 8).map((item, index) => (
                                                                    <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-line bg-surface">
                                                                        <div>
                                                                            <div className="font-semibold text-sm">{item.name}</div>
                                                                            <div className="text-xs text-secondary">Stock: {Number(item.quantity ?? 0).toLocaleString('es-EC')} • Costo unitario: {formatMoney(Number(item.cost ?? 0))}</div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-xs text-secondary uppercase">Capital</div>
                                                                            <div className="font-bold">{formatMoney(Number(item.total_cost ?? 0))}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {highValueInventoryItems.length === 0 && (
                                                                    <div className="text-sm text-secondary">No hay productos valorizados para este reporte.</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                            <div className="heading6 mb-4">Stock crítico y bajo stock</div>
                                                            <div className="space-y-3">
                                                                {riskInventoryItems.slice(0, 8).map((item, index) => (
                                                                    <div key={`${item.name}-${index}`} className="p-3 rounded-xl border border-line bg-surface">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="font-semibold text-sm">{item.name}</div>
                                                                            <div className="text-sm font-bold text-red">{Number(item.quantity ?? 0)} uds</div>
                                                                        </div>
                                                                        <div className="text-xs text-secondary mt-1">
                                                                            Cobertura: {(item as any).estimated_days_left === null || typeof (item as any).estimated_days_left === 'undefined'
                                                                                ? 'sin ventas recientes'
                                                                                : `${Number((item as any).estimated_days_left ?? 0)} día(s)`}
                                                                            {Number((item as any).units_sold_30d ?? 0) > 0 && ` • ${Number((item as any).units_sold_30d ?? 0)} uds vendidas en 30 días`}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {riskInventoryItems.length === 0 && (
                                                                    <div className="text-sm text-secondary">No hay productos con riesgo inmediato de desabastecimiento.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                            <div className="heading6 mb-4">Productos próximos a vencer</div>
                                                            <div className="space-y-3">
                                                                {expiringInventoryItems.slice(0, 8).map((item, index) => (
                                                                    <div key={`${item.name}-${index}`} className="p-3 rounded-xl border border-line bg-surface">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="font-semibold text-sm">{item.name}</div>
                                                                            <div className="text-sm font-bold text-amber-700">{Number(item.quantity ?? 0)} uds</div>
                                                                        </div>
                                                                        <div className="text-xs text-secondary mt-1">
                                                                            Vence: {formatIsoDate(String(item.expiration_date || ''))} • En {Number(item.days_to_expire ?? 0)} día(s)
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {expiringInventoryItems.length === 0 && (
                                                                    <div className="text-sm text-secondary">No hay productos próximos a vencer.</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                            <div className="heading6 mb-4">Productos vencidos</div>
                                                            <div className="space-y-3">
                                                                {expiredInventoryItems.slice(0, 8).map((item, index) => (
                                                                    <div key={`${item.name}-${index}`} className="p-3 rounded-xl border border-line bg-surface">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="font-semibold text-sm">{item.name}</div>
                                                                            <div className="text-sm font-bold text-red">{Number(item.quantity ?? 0)} uds</div>
                                                                        </div>
                                                                        <div className="text-xs text-secondary mt-1">
                                                                            Vencido desde: {formatIsoDate(String(item.expiration_date || ''))} • Hace {Number(item.days_expired ?? 0)} día(s)
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {expiredInventoryItems.length === 0 && (
                                                                    <div className="text-sm text-secondary">No hay productos vencidos en inventario.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {adminReportSection === 'traceability' && (
                                                <TraceabilityPanel
                                                    currentDateLabel={currentDateLabel}
                                                    formatMoney={formatMoney}
                                                    formatDateEcuador={formatDateEcuador}
                                                    formatDateTimeEcuador={formatDateTimeEcuador}
                                                    getCustomerDocument={getReportCustomerDocument}
                                                    getDeliveryMethodLabel={getReportDeliveryMethodLabel}
                                                    getPaymentMethodLabel={getReportPaymentMethodLabel}
                                                    issues={traceabilityIssues}
                                                    orders={traceabilityOrders}
                                                    products={traceabilityProducts}
                                                    categories={traceabilityCategories}
                                                    periodLabel={reportSalesPeriodLabel}
                                                    salesRankingMonth={salesRankingMonth}
                                                    salesRankingView={salesRankingView}
                                                    selectedRankingMonthLabel={selectedRankingMonthLabel}
                                                    selectReportMonth={selectReportMonth}
                                                    setSalesRankingView={selectSalesReportView}
                                                    summary={traceabilitySummary}
                                                    onViewOrder={handleViewOrder}
                                                    onOpenProduct={openAdminProductByReportId}
                                                    onRegisterPurchase={restockAdminProductByReportId}
                                                    onOpenOrders={() => navigateToPanelTab('admin-orders')}
                                                />
                                            )}

                                            {adminReportSection === 'products-purchases' && (
                                                <ProductPurchaseHistoryPanel
                                                    products={adminProductsList}
                                                    salesRows={reportSalesRankingRows}
                                                    salesOrders={reportSalesOrders}
                                                    salesPeriodLabel={reportSalesPeriodLabel}
                                                    salesRankingMonth={salesRankingMonth}
                                                    salesRankingView={salesRankingView}
                                                    selectedRankingMonthLabel={selectedRankingMonthLabel}
                                                    selectedProductId={selectedProductPurchaseReportId}
                                                    selectedDetail={selectedProductPurchaseReportDetail}
                                                    detailLoading={productPurchaseReportDetailLoading}
                                                    detailError={productPurchaseReportDetailError}
                                                    selectReportMonth={selectReportMonth}
                                                    setSalesRankingView={selectSalesReportView}
                                                    onSelectProduct={handleSelectProductPurchaseReport}
                                                    onRetryLoadSelectedProduct={handleRetryProductPurchaseReportDetail}
                                                    onOpenPurchaseInvoice={handleOpenPurchaseInvoice}
                                                    formatMoney={formatMoney}
                                                    formatIsoDate={formatIsoDate}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'sales-ranking' && (
                                        <SalesRankingPanel
                                            currentDateLabel={currentDateLabel}
                                            effectiveReportData={activePeriodReport}
                                            formatMoney={formatMoney}
                                            openSalesProductDetail={openSalesProductDetail}
                                            productRankingActionItems={productRankingActionItems}
                                            productRankingDecisionRows={productRankingDecisionRows}
                                            periodLabel={reportSalesPeriodLabel}
                                            salesRankingFinancial={salesRankingFinancial}
                                            salesRankingMonth={salesRankingMonth}
                                            salesRankingTotals={salesRankingTotals}
                                            salesRankingView={salesRankingView}
                                            selectReportMonth={selectReportMonth}
                                            selectedRankingMonthLabel={selectedRankingMonthLabel}
                                            setSalesRankingView={selectSalesReportView}
                                            totalUnitsSold={salesRankingUnitsSold}
                                            onExportRanking={handleExportSalesRankingReport}
                                            onOpenProduct={openAdminProductByReportId}
                                            onRestockProduct={restockAdminProductByReportId}
                                        />
                                    )}

                                    {activeTab === 'local-sales' && (
                                        <LocalSalesPanel
                                            currentDateLabel={currentDateLabel}
                                            storeStatus={storeStatus}
                                            formatMoney={formatMoney}
                                            formatIsoDate={formatIsoDate}
                                            formatDateTimeEcuador={formatDateTimeEcuador}
                                            localSaleAutoPrint={localSaleAutoPrint}
                                            localSaleCashReceived={localSaleCashReceived}
                                            localSaleCatalog={localSaleCatalog}
                                            localSaleChange={localSaleChange}
                                            localSaleCustomerCity={localSaleCustomerCity}
                                            localSaleCustomerDocumentNumber={localSaleCustomerDocumentNumber}
                                            localSaleCustomerDocumentType={localSaleCustomerDocumentType}
                                            localSaleCustomerEmail={localSaleCustomerEmail}
                                            localSaleCustomerEmailValid={localSaleCustomerEmailValid}
                                            localSaleCustomerLookupLoading={localSaleCustomerLookupLoading}
                                            localSaleCustomerLookupMessage={localSaleCustomerLookupMessage}
                                            localSaleCustomerName={localSaleCustomerName}
                                            localSaleCustomerPhone={localSaleCustomerPhone}
                                            localSaleCustomerStreet={localSaleCustomerStreet}
                                            localSaleDiscount={localSaleDiscount}
                                            localSaleDiscountCode={localSaleDiscountCode}
                                            localSaleElectronicAmount={localSaleElectronicAmount}
                                            localSaleGross={localSaleGross}
                                            localSaleItemQuantityById={localSaleItemQuantityById}
                                            localSaleItems={localSaleItems}
                                            localSaleLastQuotation={localSaleLastQuotation}
                                            localSaleLastSubmission={localSaleLastSubmission}
                                            localSaleMissingInfo={localSaleMissingInfo}
                                            localSaleQuoteHistory={localSaleQuoteHistory}
                                            localSaleQuoteHistoryLoading={localSaleQuoteHistoryLoading}
                                            localSaleNet={localSaleNet}
                                            localSaleNotes={localSaleNotes}
                                            localSalePaidAmount={localSalePaidAmount}
                                            localSalePaymentMethod={localSalePaymentMethod}
                                            localSalePaymentReady={localSalePaymentReady}
                                            localSalePaymentReference={localSalePaymentReference}
                                            localSalePaymentStatusText={localSalePaymentStatusText}
                                            localSalePendingAmount={localSalePendingAmount}
                                            localSalePrimaryMissing={localSalePrimaryMissing}
                                            localSaleQuotationMissingInfo={localSaleQuotationMissingInfo}
                                            localSaleQuotationPrimaryMissing={localSaleQuotationPrimaryMissing}
                                            localSaleProfit={localSaleProfit}
                                            localSaleQuickChecks={localSaleQuickChecks}
                                            localSaleQuote={localSaleQuote}
                                            localSaleQuoteSendEmail={localSaleQuoteSendEmail}
                                            localSaleQuoteSendWhatsApp={localSaleQuoteSendWhatsApp}
                                            localSaleQuoteLoading={localSaleQuoteLoading}
                                            localSaleSelectedQuotationId={localSaleSelectedQuotationId}
                                            localSaleSaving={localSaleSaving}
                                            localSaleSearch={localSaleSearch}
                                            localSaleShipping={localSaleShipping}
                                            localSaleTotal={localSaleTotal}
                                            localSaleUnits={localSaleUnits}
                                            localSaleVat={localSaleVat}
                                            posActionLoading={posActionLoading}
                                            posActiveShift={posActiveShift}
                                            posCanRegisterSale={posCanRegisterSale}
                                            posCashSales={posCashSales}
                                            posCloseNotes={posCloseNotes}
                                            posClosingCash={posClosingCash}
                                            posElectronicSales={posElectronicSales}
                                            posExpectedCash={posExpectedCash}
                                            posFieldClass={posFieldClass}
                                            posFieldFlexClass={posFieldFlexClass}
                                            posFieldLabelClass={posFieldLabelClass}
                                            posLoading={posLoading}
                                            posMovementAdjustments={posMovementAdjustments}
                                            posMovementAmount={posMovementAmount}
                                            posMovementDescription={posMovementDescription}
                                            posMovementCreateExpense={posMovementCreateExpense}
                                            posMovementExpenseCategory={posMovementExpenseCategory}
                                            posMovementExpense={posMovementExpense}
                                            posMovementIncome={posMovementIncome}
                                            posMovementType={posMovementType}
                                            posMovements={posMovements}
                                            posOpenNotes={posOpenNotes}
                                            posOpeningCash={posOpeningCash}
                                            posOrdersCount={posOrdersCount}
                                            posSalesTotal={posSalesTotal}
                                            posShiftHistory={posShiftHistory}
                                            posTextareaClass={posTextareaClass}
                                            handleAddLocalSaleProduct={handleAddLocalSaleProduct}
                                            handleAddPosMovement={handleAddPosMovement}
                                            handleClearLocalSale={handleClearLocalSale}
                                            handleClosePosShift={handleClosePosShift}
                                            handleCompleteMixedWithElectronic={handleCompleteMixedWithElectronic}
                                            handleCreateLocalQuotation={handleCreateLocalQuotation}
                                            handleCreateLocalSale={handleCreateLocalSale}
                                            handleConvertSelectedLocalQuotation={handleConvertSelectedLocalQuotation}
                                            handleLookupCustomerByDocument={handleLookupCustomerByDocument}
                                            handleOpenLastLocalSaleOrder={handleOpenLastLocalSaleOrder}
                                            handleOpenPosShift={handleOpenPosShift}
                                            handlePrintLastLocalSaleInvoice={handlePrintLastLocalSaleInvoice}
                                            handlePrintLastLocalQuotation={handlePrintLastLocalQuotation}
                                            handleRemoveLocalSaleItem={handleRemoveLocalSaleItem}
                                            handleSetCashExact={handleSetCashExact}
                                            handleUpdateLocalSaleQuantity={handleUpdateLocalSaleQuantity}
                                            loadPosSnapshot={loadPosSnapshot}
                                            loadLocalSaleQuoteHistory={loadLocalSaleQuoteHistory}
                                            setLocalSaleAutoPrint={setLocalSaleAutoPrint}
                                            setLocalSaleCashReceived={setLocalSaleCashReceived}
                                            setLocalSaleCustomerCity={setLocalSaleCustomerCity}
                                            setLocalSaleCustomerDocumentNumber={setLocalSaleCustomerDocumentNumber}
                                            setLocalSaleCustomerDocumentType={setLocalSaleCustomerDocumentType}
                                            setLocalSaleCustomerEmail={setLocalSaleCustomerEmail}
                                            setLocalSaleCustomerLookupMessage={setLocalSaleCustomerLookupMessage}
                                            setLocalSaleCustomerName={setLocalSaleCustomerName}
                                            setLocalSaleCustomerPhone={setLocalSaleCustomerPhone}
                                            setLocalSaleCustomerStreet={setLocalSaleCustomerStreet}
                                            setLocalSaleDiscountCode={setLocalSaleDiscountCode}
                                            setLocalSaleElectronicAmount={setLocalSaleElectronicAmount}
                                            setLocalSaleNotes={setLocalSaleNotes}
                                            setLocalSalePaymentMethod={setLocalSalePaymentMethod}
                                            setLocalSalePaymentReference={setLocalSalePaymentReference}
                                            setLocalSaleQuoteSendEmail={setLocalSaleQuoteSendEmail}
                                            setLocalSaleQuoteSendWhatsApp={setLocalSaleQuoteSendWhatsApp}
                                            setLocalSaleSelectedQuotationId={setLocalSaleSelectedQuotationId}
                                            setLocalSaleSearch={setLocalSaleSearch}
                                            setPosCloseNotes={setPosCloseNotes}
                                            setPosClosingCash={setPosClosingCash}
                                            setPosMovementAmount={setPosMovementAmount}
                                            setPosMovementCreateExpense={setPosMovementCreateExpense}
                                            setPosMovementDescription={setPosMovementDescription}
                                            setPosMovementExpenseCategory={setPosMovementExpenseCategory}
                                            setPosMovementType={setPosMovementType}
                                            setPosOpenNotes={setPosOpenNotes}
                                            setPosOpeningCash={setPosOpeningCash}
                                        />
                                    )}

                                    {activeTab === 'quotations' && (
                                        <QuotationsPanel
                                            currentDateLabel={currentDateLabel}
                                            storeStatus={storeStatus}
                                            formatMoney={formatMoney}
                                            formatIsoDate={formatIsoDate}
                                            formatDateTimeEcuador={formatDateTimeEcuador}
                                            localSaleCatalog={localSaleCatalog}
                                            localSaleCustomerCity={localSaleCustomerCity}
                                            localSaleCustomerDocumentNumber={localSaleCustomerDocumentNumber}
                                            localSaleCustomerDocumentType={localSaleCustomerDocumentType}
                                            localSaleCustomerEmail={localSaleCustomerEmail}
                                            localSaleCustomerEmailValid={localSaleCustomerEmailValid}
                                            localSaleCustomerLookupLoading={localSaleCustomerLookupLoading}
                                            localSaleCustomerLookupMessage={localSaleCustomerLookupMessage}
                                            localSaleCustomerName={localSaleCustomerName}
                                            localSaleCustomerPhone={localSaleCustomerPhone}
                                            localSaleCustomerStreet={localSaleCustomerStreet}
                                            localSaleDiscountCode={localSaleDiscountCode}
                                            localSaleItemQuantityById={localSaleItemQuantityById}
                                            localSaleItems={localSaleItems}
                                            localSaleLastQuotation={localSaleLastQuotation}
                                            localSaleQuotationMissingInfo={localSaleQuotationMissingInfo}
                                            localSaleQuotationPrimaryMissing={localSaleQuotationPrimaryMissing}
                                            localSaleQuote={localSaleQuote}
                                            localSaleQuoteHistory={localSaleQuoteHistory}
                                            localSaleQuoteHistoryLoading={localSaleQuoteHistoryLoading}
                                            localSaleQuoteLoading={localSaleQuoteLoading}
                                            localSaleQuoteSendEmail={localSaleQuoteSendEmail}
                                            localSaleQuoteSendWhatsApp={localSaleQuoteSendWhatsApp}
                                            localSaleCustomerPhoneValid={localSaleCustomerPhoneValid}
                                            localSaleSearch={localSaleSearch}
                                            localSaleSelectedQuotationId={localSaleSelectedQuotationId}
                                            localSaleTotal={localSaleTotal}
                                            localSaleUnits={localSaleUnits}
                                            localSaleVat={localSaleVat}
                                            localSaleNet={localSaleNet}
                                            localSaleNotes={localSaleNotes}
                                            localSaleSaving={localSaleSaving}
                                            posFieldClass={posFieldClass}
                                            posFieldFlexClass={posFieldFlexClass}
                                            posFieldLabelClass={posFieldLabelClass}
                                            posTextareaClass={posTextareaClass}
                                            handleAddLocalSaleProduct={handleAddLocalSaleProduct}
                                            handleClearLocalSale={handleClearLocalSale}
                                            handleCreateLocalQuotation={handleCreateLocalQuotation}
                                            handleConvertSelectedLocalQuotation={handleConvertSelectedLocalQuotation}
                                            handleLookupCustomerByDocument={handleLookupCustomerByDocument}
                                            handlePrintLastLocalQuotation={handlePrintLastLocalQuotation}
                                            handleRemoveLocalSaleItem={handleRemoveLocalSaleItem}
                                            handleUpdateLocalSaleQuantity={handleUpdateLocalSaleQuantity}
                                            loadLocalSaleQuoteHistory={loadLocalSaleQuoteHistory}
                                            setLocalSaleCustomerCity={setLocalSaleCustomerCity}
                                            setLocalSaleCustomerDocumentNumber={setLocalSaleCustomerDocumentNumber}
                                            setLocalSaleCustomerDocumentType={setLocalSaleCustomerDocumentType}
                                            setLocalSaleCustomerEmail={setLocalSaleCustomerEmail}
                                            setLocalSaleCustomerLookupMessage={setLocalSaleCustomerLookupMessage}
                                            setLocalSaleCustomerName={setLocalSaleCustomerName}
                                            setLocalSaleCustomerPhone={setLocalSaleCustomerPhone}
                                            setLocalSaleCustomerStreet={setLocalSaleCustomerStreet}
                                            setLocalSaleDiscountCode={setLocalSaleDiscountCode}
                                            setLocalSaleNotes={setLocalSaleNotes}
                                            setLocalSaleQuoteSendEmail={setLocalSaleQuoteSendEmail}
                                            setLocalSaleQuoteSendWhatsApp={setLocalSaleQuoteSendWhatsApp}
                                            setLocalSaleSearch={setLocalSaleSearch}
                                            setLocalSaleSelectedQuotationId={setLocalSaleSelectedQuotationId}
                                        />
                                    )}

                                    {activeTab === 'inventory' && (
                                        <InventoryManagementPanel
                                            summary={inventorySummary}
                                            rows={filteredInventoryRows}
                                            intelligence={inventoryIntelligence}
                                            searchQuery={inventorySearch}
                                            statusFilter={inventoryStatusFilter}
                                            typeFilter={inventoryTypeFilter}
                                            purchaseInvoicesSummary={{
                                                totalInvoices: purchaseInvoicesSummary.totalInvoices,
                                                totalUnits: purchaseInvoicesSummary.totalUnits,
                                                totalAmount: purchaseInvoicesSummary.totalAmount,
                                                suppliersCount: purchaseInvoicesSummary.suppliersCount,
                                            }}
                                            recentPurchaseInvoices={recentPurchaseInvoices}
                                            purchaseInvoicesLoading={purchaseInvoicesLoading}
                                            hasPerishableProducts={hasPerishableProducts}
                                            lowStockThreshold={INVENTORY_LOW_STOCK_THRESHOLD}
                                            onSearchChange={setInventorySearch}
                                            onStatusFilterChange={setInventoryStatusFilter}
                                            onTypeFilterChange={setInventoryTypeFilter}
                                            onClearFilters={() => {
                                                setInventorySearch('')
                                                setInventoryStatusFilter('all')
                                                setInventoryTypeFilter('all')
                                            }}
                                            onNavigateToProducts={() => navigateToPanelTab('products')}
                                            onNewProduct={handleNewProduct}
                                            onReloadPurchaseInvoices={loadRecentPurchaseInvoices}
                                            onOpenPurchaseInvoice={handleOpenPurchaseInvoice}
                                            onOpenProductBalance={handleOpenProductBalance}
                                            onEditProduct={handleEditProduct}
                                            onRestockProduct={handleRestockProduct}
                                            onOpenLowStockDetail={() => handleOpenDetailModal('low')}
                                            onOpenCriticalStockDetail={() => handleOpenDetailModal('critical')}
                                            onOpenOutOfStockDetail={() => handleOpenDetailModal('out')}
                                            onOpenExpiringDetail={() => handleOpenDetailModal('expiring')}
                                            onOpenExpiredDetail={() => handleOpenDetailModal('expired')}
                                            formatMoney={formatMoney}
                                            formatIsoDate={formatIsoDate}
                                            formatDateEcuador={formatDateEcuador}
                                            formatDateTimeEcuador={formatDateTimeEcuador}
                                        />
                                    )}

                                    {activeTab === 'products' && (
                                        <ProductsManagementPanel
                                            products={filteredAdminProductsList}
                                            allProducts={adminProductsList}
                                            summary={productPublicationSummary}
                                            activeFilter={productPublicationFilter}
                                            activeQuickFilter={adminProductsQuickFilter}
                                            searchQuery={adminProductsSearch}
                                            advancedFilters={{
                                                category: adminProductsCategoryFilter,
                                                supplier: adminProductsSupplierFilter,
                                                brand: adminProductsBrandFilter,
                                                species: adminProductsSpeciesFilter,
                                                tax: adminProductsTaxFilter,
                                            }}
                                            filterOptions={adminProductFilterOptions}
                                            hasPerishableProducts={hasPerishableProducts}
                                            onFilterChange={setProductPublicationFilter}
                                            onQuickFilterChange={setAdminProductsQuickFilter}
                                            onSearchChange={setAdminProductsSearch}
                                            onAdvancedFiltersChange={(nextFilters) => {
                                                setAdminProductsCategoryFilter(nextFilters.category)
                                                setAdminProductsSupplierFilter(nextFilters.supplier)
                                                setAdminProductsBrandFilter(nextFilters.brand)
                                                setAdminProductsSpeciesFilter(nextFilters.species)
                                                setAdminProductsTaxFilter(nextFilters.tax)
                                            }}
                                            onClearAdvancedFilters={() => {
                                                setAdminProductsSearch('')
                                                setAdminProductsCategoryFilter('all')
                                                setAdminProductsSupplierFilter('all')
                                                setAdminProductsBrandFilter('all')
                                                setAdminProductsSpeciesFilter('all')
                                                setAdminProductsTaxFilter('all')
                                                setAdminProductsQuickFilter('all')
                                                setProductPublicationFilter('all')
                                            }}
                                            onNewProduct={handleNewProduct}
                                            onEditProduct={handleEditProduct}
                                            onRestockProduct={handleRestockProduct}
                                            onDuplicateVariant={handleDuplicateVariant}
                                            onDeleteProduct={handleDeleteProduct}
                                            onTogglePublication={handleToggleProductPublication}
                                            publicationPendingIds={productPublicationPendingIds}
                                            isProductEligibleForPublication={isProductEligibleForPublication}
                                            getProductExpirationMeta={getProductExpirationMeta}
                                            formatMoney={formatMoney}
                                            formatIsoDate={formatIsoDate}
                                        />
                                    )}

                                    {activeTab === 'catalogs' && (
                                        <ProductReferenceDataPanel
                                            data={productReferenceData}
                                            loading={productReferenceDataLoading}
                                            saving={productReferenceDataSaving}
                                            focusKey={focusedReferenceCatalogKey}
                                            onChange={setProductReferenceData}
                                            onSave={async () => {
                                                try {
                                                    setProductReferenceDataSaving(true)
                                                    const res = await updateProductReferenceData(productReferenceData)
                                                    setProductReferenceData(res.body)
                                                    showNotification('Catálogos operativos actualizados.')
                                                } catch (error) {
                                                    console.error(error)
                                                    showNotification('No se pudieron guardar los catálogos.', 'error')
                                                } finally {
                                                    setProductReferenceDataSaving(false)
                                                }
                                            }}
                                            onSaveData={async (nextData) => {
                                                try {
                                                    setProductReferenceDataSaving(true)
                                                    const res = await updateProductReferenceData(nextData)
                                                    setProductReferenceData(res.body)
                                                    showNotification('Imágenes de categoría guardadas correctamente.')
                                                } catch (error) {
                                                    console.error(error)
                                                    showNotification('Las imágenes se subieron, pero no se pudieron guardar en el catálogo.', 'error')
                                                } finally {
                                                    setProductReferenceDataSaving(false)
                                                }
                                            }}
                                        />
                                    )}

                                    {activeTab === 'taxes' && (
                                        <TaxesPanel
                                            vatRate={vatRate}
                                            vatCreditCurrentRate={vatCreditCurrentRate}
                                            vatCreditCarryforwardRate={vatCreditCarryforwardRate}
                                            vatCreditCurrentDisplayRate={vatCreditCurrentDisplayRate}
                                            vatCreditCarryforwardDisplayRate={vatCreditCarryforwardDisplayRate}
                                            vatLoading={vatLoading}
                                            vatSaving={vatSaving}
                                            setVatRate={setVatRate}
                                            setVatCreditCurrentRate={setVatCreditCurrentRate}
                                            setVatCreditCarryforwardRate={setVatCreditCarryforwardRate}
                                            onSaveVat={handleSaveVat}
                                            onOpenShipments={() => navigateToPanelTab('shipments')}
                                        />
                                    )}

                                    {activeTab === 'prices' && (
                                        <div className="tab text-content w-full">
                                            <div className="heading5 pb-4">Gestión Inteligente de Precios</div>
                                            <p className="text-secondary mb-6">Optimiza tus márgenes con sugerencias basadas en costos.</p>
                                            <div className="mb-8 p-6 rounded-xl border border-line bg-surface">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="p-4 rounded-lg bg-white border border-line">
                                                        <div className="text-xs uppercase font-bold text-secondary">Margen base</div>
                                                        <div className="heading5">{marginSettings.baseMargin}%</div>
                                                        <button className="text-xs underline mt-2" onClick={() => navigateToPanelTab('margins')}>Editar márgenes</button>
                                                    </div>
                                                    <div className="p-4 rounded-lg bg-white border border-line">
                                                        <div className="text-xs uppercase font-bold text-secondary">Redondeo</div>
                                                        <div className="heading5">${calcSettings.rounding.toFixed(2)}</div>
                                                        <button className="text-xs underline mt-2" onClick={() => navigateToPanelTab('calculations')}>Editar cálculos</button>
                                                    </div>
                                                    <div className="p-4 rounded-lg bg-white border border-line">
                                                        <div className="text-xs uppercase font-bold text-secondary">Descuento por volumen</div>
                                                        <div className="heading5">{pricingRules.bulkDiscount}%</div>
                                                        <button className="text-xs underline mt-2" onClick={() => navigateToPanelTab('pricing-rules')}>Editar reglas</button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                                {(() => {
                                                    const summary = dashboardStats?.businessMetrics?.salesSummary
                                                    const profit = dashboardStats?.businessMetrics?.profitStats
                                                    const gross = Number(summary?.gross ?? 0)
                                                    const net = Number(summary?.net ?? 0)
                                                    const vat = Number(summary?.vat ?? 0)
                                                    const shipping = Number(summary?.shipping ?? 0)
                                                    const cost = Number(profit?.cost ?? 0)
                                                    const utilidad = Number(profit?.profit ?? 0)
                                                    return (
                                                        <>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-secondary text-xs uppercase font-bold mb-1">Venta Total</div>
                                                                <div className="heading5">${gross.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-secondary text-xs mt-1">Incluye IVA + Envío</div>
                                                            </div>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-secondary text-xs uppercase font-bold mb-1">Venta Neta</div>
                                                                <div className="heading5">${net.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-secondary text-xs mt-1">Sin IVA ni envío</div>
                                                            </div>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-secondary text-xs uppercase font-bold mb-1">IVA Cobrado</div>
                                                                <div className="heading5">${vat.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-secondary text-xs mt-1">Impuesto del cliente</div>
                                                            </div>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-secondary text-xs uppercase font-bold mb-1">Envío Cobrado</div>
                                                                <div className="heading5">${shipping.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-secondary text-xs mt-1">Cobro al cliente</div>
                                                            </div>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-secondary text-xs uppercase font-bold mb-1">Costo (COGS)</div>
                                                                <div className="heading5 text-orange-500">-${cost.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-secondary text-xs mt-1">Costo de producto</div>
                                                            </div>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-secondary text-xs uppercase font-bold mb-1">Utilidad Bruta</div>
                                                                <div className="heading5 text-success">${utilidad.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-secondary text-xs mt-1">Sin IVA</div>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>

                                            <div className="grid grid-cols-3 gap-6 mb-8">
                                                <div className="p-5 rounded-xl bg-surface border border-line">
                                                    <div className="text-secondary text-xs uppercase font-bold mb-1">Margen ponderado</div>
                                                    <div className="heading4 text-success">
                                                        {productWeightedMargin.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                                    </div>
                                                    <div className="text-secondary text-xs mt-1">Ponderado por stock valorizado</div>
                                                </div>
                                                <div className="p-5 rounded-xl bg-surface border border-line">
                                                    <div className="text-secondary text-xs uppercase font-bold mb-1">Oportunidades de Precio</div>
                                                    <div className="heading4 text-yellow">
                                                        {dashboardStats?.productAnalysis?.lowMarginOpportunities ?? 0} <span className="text-sm text-secondary font-normal">productos bajo margen</span>
                                                    </div>
                                                    <div className="text-secondary text-xs mt-1">{productMissingCostCount.toLocaleString('es-EC')} sin costo registrado</div>
                                                </div>
                                                <div className="p-5 rounded-xl bg-surface border border-line">
                                                    <div className="text-secondary text-xs uppercase font-bold mb-1">Brecha vs objetivo</div>
                                                    <div className="heading4">
                                                        {Math.max((marginSettings.targetMargin - productWeightedMargin), 0).toFixed(1)}%
                                                    </div>
                                                    <div className="text-secondary text-xs mt-1">{productMarginSampleCount.toLocaleString('es-EC')} productos con costo y precio</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                                {(() => {
                                                    const products = adminProductsList || []
                                                    const netSales = Number(dashboardStats?.businessMetrics?.salesSummary?.net ?? 0) || 1
                                                    const format = (val: number) => val.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                    const risks = products.map((product: any) => {
                                                        const basePrice = getProductBasePrice(product)
                                                        const cost = parseMoney(product.business?.cost ?? product.cost)
                                                        const margin = basePrice > 0 ? ((basePrice - cost) / basePrice) * 100 : 0
                                                        return {
                                                            id: product.id,
                                                            name: product.name,
                                                            margin,
                                                            cost,
                                                            basePrice
                                                        }
                                                    }).sort((a: any, b: any) => a.margin - b.margin).slice(0, 5)

                                                    const topProducts = (dashboardStats?.topProducts || []).map((item: any) => ({
                                                        name: item.name,
                                                        sold: Number(item.sold ?? 0),
                                                        revenue: Number(item.revenue ?? 0),
                                                        share: (Number(item.revenue ?? 0) / netSales) * 100
                                                    }))

                                                    const categories = (dashboardStats?.salesByCategory || []).slice(0, 5).map((cat: any) => ({
                                                        name: cat.category || 'Sin categoría',
                                                        total: Number(cat.total ?? 0),
                                                        share: (Number(cat.total ?? 0) / netSales) * 100
                                                    }))

                                                    const missingCostItems = products.filter((p: any) => parseMoney(p.business?.cost ?? p.cost) <= 0)
                                                    const missingCost = missingCostItems.length

                                                    return (
                                                        <>
                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-xs uppercase font-bold text-secondary mb-2">Márgenes más bajos</div>
                                                                {missingCost > 0 && (
                                                                    <div className="text-[11px] text-orange-600 font-semibold mb-2">
                                                                        Costos sin registrar: {missingCost}
                                                                    </div>
                                                                )}
                                                                <div className="space-y-2">
                                                                    {risks.map((item: any) => (
                                                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                                                            <span className="truncate max-w-[70%]">{item.name}</span>
                                                                            <span className={`font-bold ${item.margin < 20 ? 'text-red' : item.margin < 35 ? 'text-yellow' : 'text-success'}`}>
                                                                                {item.margin.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                    {risks.length === 0 && (
                                                                        <div className="text-sm text-secondary">No hay productos para evaluar.</div>
                                                                    )}
                                                                </div>
                                                                {missingCostItems.length > 0 && (
                                                                    <div className="mt-4 border-t border-line pt-3">
                                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-2">Sin costo</div>
                                                                        <div className="space-y-1">
                                                                            {missingCostItems.slice(0, 4).map((item: any) => (
                                                                                <div key={item.id} className="text-xs text-secondary truncate">{item.name}</div>
                                                                            ))}
                                                                            {missingCostItems.length > 4 && (
                                                                                <div className="text-xs text-secondary">+{missingCostItems.length - 4} más</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="text-[11px] text-secondary mt-3">Ordenado por margen más bajo. Los costos faltantes se listan aparte.</div>
                                                            </div>

                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-xs uppercase font-bold text-secondary mb-3">Top contribuyentes</div>
                                                                <div className="space-y-2">
                                                                    {topProducts.map((item: any) => (
                                                                        <div key={item.name} className="flex items-center justify-between text-sm">
                                                                            <span className="truncate max-w-[60%]">{item.name}</span>
                                                                            <span className="text-secondary">{item.sold} uds</span>
                                                                            <span className="font-bold">{item.share.toFixed(1)}%</span>
                                                                        </div>
                                                                    ))}
                                                                    {topProducts.length === 0 && (
                                                                        <div className="text-sm text-secondary">Sin ventas recientes.</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-secondary mt-3">Participación sobre ventas netas.</div>
                                                            </div>

                                                            <div className="p-5 bg-white rounded-xl border border-line shadow-sm">
                                                                <div className="text-xs uppercase font-bold text-secondary mb-3">Mix por categoría</div>
                                                                <div className="space-y-2">
                                                                    {categories.map((cat: any) => (
                                                                        <div key={cat.name} className="flex items-center justify-between text-sm">
                                                                            <span className="truncate max-w-[70%]">{cat.name}</span>
                                                                            <span className="font-bold">{cat.share.toFixed(1)}%</span>
                                                                        </div>
                                                                    ))}
                                                                    {categories.length === 0 && (
                                                                        <div className="text-sm text-secondary">Sin categorías vendidas.</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-secondary mt-3">Distribución de ventas netas.</div>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>

                                            <div className="bg-surface p-6 rounded-xl border border-line">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <input
                                                        type="search"
                                                        className="border-line px-4 py-2 rounded-lg flex-1"
                                                        placeholder="Buscar por producto, marca, categoría o SKU"
                                                        value={pricingAnalysisSearch}
                                                        onChange={(event) => setPricingAnalysisSearch(event.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="button-main py-2 px-6 disabled:opacity-50"
                                                        disabled={!pricingAnalysisSearch}
                                                        onClick={() => setPricingAnalysisSearch('')}
                                                    >
                                                        Limpiar
                                                    </button>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-line">
                                                                <th className="pb-4 font-bold text-secondary text-sm">PRODUCTO</th>
                                                                <th className="pb-4 font-bold text-secondary text-sm">COSTO</th>
                                                                <th className="pb-4 font-bold text-secondary text-sm">BASE (SIN IVA)</th>
                                                                <th className="pb-4 font-bold text-secondary text-sm">IVA</th>
                                                                <th className="pb-4 font-bold text-secondary text-sm">P.V.P</th>
                                                                <th className="pb-4 font-bold text-secondary text-sm">UTILIDAD</th>
                                                                <th className="pb-4 font-bold text-secondary text-sm">MARGEN</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredPricingAnalysisProducts.length > 0 ? filteredPricingAnalysisProducts.map((product: any) => {
                                                                 const price = Number(product.price) || 0
                                                                 const basePrice = getProductBasePrice(product)
                                                                 const vatPart = getProductVatPart(product)
                                                                 const cost = parseMoney(product.business?.cost ?? product.cost)
                                                                 const utilidad = basePrice - cost
                                                                 const margin = basePrice > 0 ? ((basePrice - cost) / basePrice) * 100 : 0
                                                                 const format = (val: number) => val.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                 return (
                                                                     <tr key={product.id} className="border-b border-line last:border-0 hover:bg-surface duration-300">
                                                                         <td className="py-4">
                                                                             <div className="font-semibold text-sm">{product.name}</div>
                                                                             <div className="text-xs text-secondary">SKU: {product.sku || product.id}</div>
                                                                         </td>
                                                                         <td className="py-4 font-medium text-secondary text-sm">${format(cost)}</td>
                                                                         <td className="py-4 font-medium text-sm">${format(basePrice)}</td>
                                                                         <td className="py-4 font-medium text-sm text-secondary">${format(vatPart)}</td>
                                                                         <td className="py-4 font-bold text-sm">${format(price)}</td>
                                                                         <td className={`py-4 font-bold text-sm ${utilidad >= 0 ? 'text-success' : 'text-red'}`}>${format(utilidad)}</td>
                                                                         <td className="py-4">
                                                                             <span className={`px-2 py-1 rounded text-xs font-bold ${margin < 20 ? 'bg-red text-white' :
                                                                                 margin < 35 ? 'bg-yellow text-white' : 'bg-success text-white'
                                                                                 }`}>
                                                                                 {margin.toFixed(1)}%
                                                                             </span>
                                                                         </td>
                                                                     </tr>
                                                                 )
                                                             }) : (
                                                                <tr>
                                                                    <td colSpan={7} className="py-8 text-center text-secondary">
                                                                        {adminProductsList.length > 0 ? 'No hay productos que coincidan con la búsqueda.' : 'Cargando análisis de precios...'}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'store-status' && (
                                        <StoreStatusPanel
                                            storeStatus={storeStatus}
                                            storeStatusLoading={storeStatusLoading}
                                            storeStatusSaving={storeStatusSaving}
                                            defaultPauseMessage={DEFAULT_STORE_PAUSE_MESSAGE}
                                            formatDateTime={formatDateTimeEcuador}
                                            setStoreStatus={setStoreStatus}
                                            onSaveStoreStatus={handleSaveStoreStatus}
                                        />
                                    )}

                                    {(activeTab === 'margins' || activeTab === 'calculations' || activeTab === 'pricing-rules') && (
                                        <PricingSettingsPanel
                                            activeTab={activeTab}
                                            marginSettings={marginSettings}
                                            calcSettings={calcSettings}
                                            pricingRules={pricingRules}
                                            setMarginSettings={setMarginSettings}
                                            setCalcSettings={setCalcSettings}
                                            setPricingRules={setPricingRules}
                                            onSaveMargins={handleSavePricingMargins}
                                            onSaveCalculations={handleSavePricingCalculations}
                                            onSavePricingRules={handleSavePricingRules}
                                        />
                                    )}

                                    {activeTab === 'discount-codes' && (
                                        <DiscountCodesPanel
                                            discountCodes={discountCodes}
                                            discountAuditRows={discountAuditRows}
                                            discountCodesLoading={discountCodesLoading}
                                            discountFormSaving={discountFormSaving}
                                            editingDiscountId={editingDiscountId}
                                            discountForm={discountForm}
                                            onDiscountFormChange={handleDiscountFormChange}
                                            onDiscountFormSubmit={handleDiscountFormSubmit}
                                            onDiscountFormReset={handleDiscountFormReset}
                                            onDiscountEdit={handleDiscountEdit}
                                            onDiscountToggleStatus={handleDiscountToggleStatus}
                                            onDiscountRefresh={() => loadDiscountData()}
                                        />
                                    )}

                                    {activeTab === 'expenses' && (
                                        <BusinessExpensesPanel
                                            expenses={businessExpenses}
                                            recurrences={businessExpenseRecurrences}
                                            summary={businessExpenseSummary}
                                            financialPeriods={financialPeriods}
                                            financialAdjustments={financialAdjustments}
                                            currentFinancialPeriod={currentFinancialPeriod}
                                            historicalSaleProducts={historicalSaleProducts}
                                            categories={businessExpenseCategories.length > 0 ? businessExpenseCategories : [
                                                'Arriendo',
                                                'Sueldos',
                                                'Servicios básicos',
                                                'Internet / telefonía',
                                                'Software / suscripciones',
                                                'Marketing',
                                                'Transporte / delivery',
                                                'Mantenimiento',
                                                'Contabilidad / legal',
                                                'Otros',
                                            ]}
                                            filters={businessExpenseFilters}
                                            loading={businessExpensesLoading}
                                            saving={businessExpenseSaving}
                                            onFiltersChange={setBusinessExpenseFilters}
                                            onRefresh={() => reloadBusinessExpensesPanel(false)}
                                            onCreateExpense={createBusinessExpense}
                                            onCreateRecurrence={createBusinessExpenseRecurrence}
                                            onUpdateRecurrence={updateBusinessExpenseRecurrence}
                                            onDeleteRecurrence={deleteBusinessExpenseRecurrence}
                                            onUpdateStatus={updateBusinessExpenseStatus}
                                            onToggleRecurrence={toggleBusinessExpenseRecurrence}
                                            onPreviewFinancialPeriod={previewFinancialPeriod}
                                            onCloseFinancialPeriod={closeFinancialPeriod}
                                            onCreateFinancialAdjustment={createFinancialAdjustment}
                                            onCreateHistoricalSale={createHistoricalSale}
                                            formatMoney={formatMoney}
                                            formatDate={formatDateEcuador}
                                            formatDateTime={formatDateTimeEcuador}
                                        />
                                    )}

                                    {activeTab === 'product-page' && (
                                        <ProductPageSettingsPanel
                                            settings={productPageSettings}
                                            onChange={setProductPageSettings}
                                            onSave={async () => {
                                                try {
                                                    const res = await updateProductPageSettings(productPageSettings)
                                                    setProductPageSettings(res.body)
                                                    showNotification('Ficha de producto actualizada.')
                                                } catch (error) {
                                                    console.error(error)
                                                    showNotification('No se pudo guardar la ficha.', 'error')
                                                }
                                            }}
                                        />
                                    )}

                                    {activeTab === 'admin-orders' && (
                                        <AdminOrdersPanel
                                            activeOrders={activeOrders}
                                            counts={adminOrdersCounts}
                                            orders={filteredAdminOrders}
                                            onFilterChange={setActiveOrders}
                                            onViewOrder={handleViewOrder}
                                            getStatusBadge={getStatusBadge}
                                            formatDateTime={formatDateTimeEcuador}
                                        />
                                    )}

                                    {activeTab === 'shipments' && (
                                        <div className="space-y-6">
                                            <ShipmentsPanel
                                                shippingProviders={shippingProviders}
                                                shippingPickups={shippingPickups}
                                                pickupReadyOrders={pickupReadyOrders}
                                                shippingRates={shippingRates}
                                                onViewDeliveryOrders={() => {
                                                    startPanelNavigationTransition(() => {
                                                        setActiveOrders('delivery')
                                                        setActiveTab('admin-orders')
                                                        setSelectedDeepDive(null)
                                                    })
                                                }}
                                                onViewOrder={handleViewOrder}
                                                formatMoney={formatMoney}
                                                formatDate={formatDateEcuador}
                                                formatDateTime={formatDateTimeEcuador}
                                                getStatusBadge={getStatusBadge}
                                            />
                                            <AdminShippingSettingsPanel
                                                shippingRates={shippingRates}
                                                shippingLoading={shippingLoading}
                                                shippingSaving={shippingSaving}
                                                onChange={setShippingRates}
                                                onSave={handleSaveShipping}
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'billing-rides' && (
                                        <BillingRidesPanel
                                            rides={billingRidePdfs}
                                            loading={billingRideLoading}
                                            reissueAccessKey={billingRideReissueAccessKey}
                                            onReload={loadBillingRidePdfs}
                                            onOpenPdf={openBillingRidePdf}
                                            onCancelAndReissue={cancelAndReissueBillingRide}
                                            formatMoney={formatMoney}
                                            formatDate={formatDateEcuador}
                                            formatDateTime={formatDateTimeEcuador}
                                        />
                                    )}

                                    {activeTab === 'users' && (
                                        <UsersManagementPanel
                                            users={adminUsersList}
                                            filteredUsers={filteredAdminUsers}
                                            loading={adminDataLoading}
                                            search={adminUsersSearch}
                                            roleFilter={adminUsersRoleFilter}
                                            summary={adminUsersSummary}
                                            onSearchChange={setAdminUsersSearch}
                                            onRoleFilterChange={setAdminUsersRoleFilter}
                                            getUserRoleBadge={getUserRoleBadge}
                                            formatMoney={formatMoney}
                                            formatDate={formatDateEcuador}
                                            formatDateTime={formatDateTimeEcuador}
                                            currentUserId={user?.id ?? null}
                                            onUsersMutated={reloadAdminUsers}
                                            onUnlockUser={handleUnlockUser}
                                            showNotification={showNotification}
                                        />
                                    )}

                                    {activeTab === 'balances' && (
                                        <BalancesPanel
                                            netSales={Number(balanceSalesSummary?.net ?? 0)}
                                            periodLabel={reportFinancialScopeLabel}
                                            salesSummary={balanceSalesSummary}
                                            profitStats={balanceProfitStats}
                                            recentOrders={balanceRecentOrders}
                                            traceabilityOrders={balanceTraceabilityOrders}
                                            traceabilityProducts={balanceTraceabilityProducts}
                                            formatMoney={formatMoney}
                                            formatDate={formatDateEcuador}
                                            onOpenOrder={handleViewOrder}
                                            onOpenProfitAnalysis={() => {
                                                startPanelNavigationTransition(() => {
                                                    setAdminReportSection('balance')
                                                    setActiveTab('reports')
                                                    setSelectedDeepDive('profit')
                                                })
                                            }}
                                            onOpenMargins={() => navigateToPanelTab('margins')}
                                            onOpenOrders={() => {
                                                startPanelNavigationTransition(() => {
                                                    setActiveOrders('all')
                                                    setActiveTab('admin-orders')
                                                    setSelectedDeepDive(null)
                                                })
                                            }}
                                            onOpenTaxes={() => navigateToPanelTab('taxes')}
                                        />
                                    )}
                                </>
                            )}

                            {user.role !== 'admin' && (
                                <>
                                    {activeTab === 'dashboard' && (
                                        <CustomerDashboardTab
                                            pickupUserOrders={pickupUserOrders}
                                            canceledUserOrders={canceledUserOrders}
                                            totalUserOrders={totalUserOrders}
                                            userOrdersLoading={userOrdersLoading}
                                            recentUserOrders={recentUserOrders}
                                            onOpenOrder={(order) => {
                                                setSelectedOrder(order)
                                                setIsOrderModalOpen(true)
                                            }}
                                            getStatusBadge={getStatusBadge}
                                            formatDateTime={formatDateTimeEcuador}
                                            normalizeOrderItemImage={normalizeOrderItemImage}
                                            isDynamicOrderItemImage={isDynamicOrderItemImage}
                                        />
                                    )}
                                    {activeTab === 'orders' && (
                                        <CustomerOrdersPanel
                                            activeOrders={activeOrders}
                                            orders={filteredUserOrders}
                                            loading={userOrdersLoading}
                                            onFilterChange={handleActiveOrders}
                                            onOpenOrder={(order) => {
                                                setSelectedOrder(order)
                                                setIsOrderModalOpen(true)
                                            }}
                                            getStatusBadge={getStatusBadge}
                                            getItemNetPrice={getItemNetPrice}
                                            formatDateTime={formatDateTimeEcuador}
                                        />
                                    )}
                                    {activeTab === 'address' && (
                                        <CustomerAddressPanel
                                            activeAddress={activeAddress}
                                            addressLoading={addressLoading}
                                            addressSaving={addressSaving}
                                            addNewAddress={addNewAddress}
                                            currentAddress={currentAddress}
                                            currentAddrIndex={currentAddrIndex}
                                            handleActiveAddress={handleActiveAddress}
                                            handleBillingChange={handleBillingChange}
                                            handleSaveAddresses={handleSaveAddresses}
                                            handleShippingChange={handleShippingChange}
                                            makePrimaryAddress={makePrimaryAddress}
                                            removeAddress={removeAddress}
                                            savedAddresses={savedAddresses}
                                            setCurrentAddrIndex={setCurrentAddrIndex}
                                            shippingRates={shippingRates}
                                            toggleSameAsShipping={toggleSameAsShipping}
                                            updateAddressPartial={updateAddressPartial}
                                        />
                                    )}
                                    {activeTab === 'setting' && (
                                        <CustomerSettingsPanel
                                            handleSaveSettings={handleSaveSettings}
                                            passwordForm={passwordForm}
                                            profile={profile}
                                            profileLoading={profileLoading}
                                            profileSaving={profileSaving}
                                            setPasswordForm={setPasswordForm}
                                            setProfile={setProfile}
                                            user={user}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {user.role !== 'admin' && <Footer />}
            {(isProductModalOpen || isPurchaseInvoiceModalOpen || isProductProcurementModalOpen || isSalesProductModalOpen || isOrderModalOpen) && (
                <PanelModals
                    isProductModalOpen={isProductModalOpen}
                    editingProduct={editingProduct}
                    adminProductsList={adminProductsList}
                    productEditorMode={productEditorMode}
                    productEditorInitialForm={productEditorInitialForm}
                    vatMultiplier={vatMultiplier}
                    normalizedMargins={normalizedMarginSettings}
                    normalizedCalc={normalizedCalcSettings}
                    productReferenceData={productReferenceData}
                    activeTab={activeTab}
                    openReferenceCatalog={openReferenceCatalog}
                    onProductReferenceDataUpdated={setProductReferenceData}
                    closeProductModal={() => {
                        setIsProductModalOpen(false)
                        setProductEditorMode('create')
                    }}
                    setAdminProductsList={setAdminProductsList}
                    onProductsChanged={invalidateAdminPanelData}
                    refreshPurchaseInvoices={() => loadRecentPurchaseInvoices({ silent: true })}
                    handleLogout={handleLogout}
                    showNotification={showNotification}
                    isPurchaseInvoiceModalOpen={isPurchaseInvoiceModalOpen}
                    purchaseInvoiceDetailLoading={purchaseInvoiceDetailLoading}
                    selectedPurchaseInvoice={selectedPurchaseInvoice}
                    closePurchaseInvoiceModal={closePurchaseInvoiceModal}
                    formatMoney={formatMoney}
                    formatIsoDate={formatIsoDate}
                    formatDateTimeEcuador={formatDateTimeEcuador}
                    isProductProcurementModalOpen={isProductProcurementModalOpen}
                    productProcurementDetailLoading={productProcurementDetailLoading}
                    selectedProductProcurementDetail={selectedProductProcurementDetail}
                    selectedProcurementSalesProduct={selectedProcurementSalesProduct}
                    currentSalesPeriod={productSalesRanking?.period || { start: null, end: null }}
                    historicalSalesPeriod={productSalesRanking?.historicalPeriod || { start: null, end: null }}
                    closeProductProcurementModal={closeProductProcurementModal}
                    handleOpenPurchaseInvoice={handleOpenPurchaseInvoice}
                    isSalesProductModalOpen={isSalesProductModalOpen}
                    selectedSalesProduct={selectedSalesProduct}
                    closeSalesProductModal={() => {
                        setIsSalesProductModalOpen(false)
                        setSelectedSalesProduct(null)
                    }}
                    isOrderModalOpen={isOrderModalOpen}
                    selectedOrder={selectedOrder}
                    selectedOrderContact={selectedOrderContact}
                    selectedOrderStatusBadge={getStatusBadge(selectedOrder?.status)}
                    canViewSelectedOrderInvoice={(user?.role === 'admin' || user?.role === 'customer') && ['completed', 'delivered'].includes(normalizeStatus(selectedOrder?.status))}
                    canManageSelectedOrderStatus={user?.role === 'admin' && selectedOrder?.status !== 'canceled' && selectedOrder?.status !== 'delivered'}
                    canCancelSelectedOrder={user?.role === 'customer' && ['pending', 'processing'].includes(normalizeStatus(selectedOrder?.status))}
                    closeOrderModal={() => setIsOrderModalOpen(false)}
                    handleGenerateInvoice={handleGenerateInvoice}
                    handleUpdateSelectedOrderStatus={(status) => {
                        if (!selectedOrder?.id) return
                        handleUpdateOrderStatus(selectedOrder.id, status)
                    }}
                    getOrderVatSubtotal={getOrderVatSubtotal}
                    getOrderVatAmount={getOrderVatAmount}
                    getOrderShipping={getOrderShipping}
                    getItemNetPrice={getItemNetPrice}
                />
            )}

            {inventoryDetailModal && (
                <LowStockDetailModal
                    open={true}
                    title={
                        inventoryDetailModal === 'low' ? 'Productos con bajo stock' :
                        inventoryDetailModal === 'critical' ? 'Productos con stock crítico' :
                        inventoryDetailModal === 'out' ? 'Productos sin stock' :
                        inventoryDetailModal === 'expiring' ? 'Productos por vencer' :
                        'Productos vencidos'
                    }
                    subtitle={
                        inventoryDetailModal === 'low' ? 'Stock por debajo del punto de reorden' :
                        inventoryDetailModal === 'critical' ? 'Stock por debajo del punto crítico — requieren atención inmediata' :
                        inventoryDetailModal === 'out' ? 'Productos agotados que necesitan reposición urgente' :
                        inventoryDetailModal === 'expiring' ? 'Productos perecederos próximos a vencer' :
                        'Productos vencidos bloqueados para la venta'
                    }
                    accentColor={
                        inventoryDetailModal === 'low' ? 'amber' :
                        inventoryDetailModal === 'critical' ? 'red' :
                        inventoryDetailModal === 'out' ? 'red' :
                        inventoryDetailModal === 'expiring' ? 'amber' : 'red'
                    }
                    rows={inventoryDetailModalRows}
                    formatMoney={formatMoney}
                    onClose={handleCloseDetailModal}
                    onViewInTable={handleViewDetailInTable}
                    onRestockProduct={handleRestockProduct}
                    onOpenProductBalance={handleOpenProductBalance}
                    onEditProduct={handleEditProduct}
                />
            )}

            {renderDeepDive()}
        </>
    );
};

export default MyAccount;
