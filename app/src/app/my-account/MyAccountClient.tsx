'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from '@/components/Common/AppImage'
import dynamic from 'next/dynamic'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
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
import { motion } from 'framer-motion'

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
import { requestApi } from '@/lib/apiClient'
import { clearStoredSession, setStoredSessionUser } from '@/lib/authSession'
import { createDiscount, listDiscountAudit, listDiscounts, updateDiscount, updateDiscountStatus } from '@/lib/api/discounts'
import type { AdminDiscountAuditRow, AdminDiscountCode, AdminDiscountPayload, AdminDiscountType } from '@/lib/api/discounts'
import { getPricingCalc, getPricingMargins, getPricingRules, getProductPageSettings, getProductReferenceData, getStoreStatus, updatePricingCalc, updatePricingMargins, updatePricingRules, updateProductPageSettings, updateProductReferenceData, updateStoreStatus } from '@/lib/api/settings'
import type { PricingCalc, PricingMargins, PricingRules, ProductPageSettings, StoreStatusSettings } from '@/lib/api/settings'
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
import { buildProductSearchIndex, buildProductSearchText, filterProductsBySearch, getProductSearchScore, sanitizeProductSearchQuery } from '@/lib/productSearch'
import {
    ADMIN_PRODUCTS_ENDPOINT,
    DEFAULT_STORE_PAUSE_MESSAGE,
    formatMonthKeyLabel,
    getCurrentMonthKey,
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
import { useAdminSidebarNavigation } from './hooks/useAdminSidebarNavigation'
import { useAuthBootstrap } from './hooks/useAuthBootstrap'
import { useAdminDataLoader } from './hooks/useAdminDataLoader'
import { useCustomerAccountData } from './hooks/useCustomerAccountData'
import { useLocalSaleQuote } from './hooks/useLocalSaleQuote'
import { usePosShift } from './hooks/usePosShift'
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
import { buildReportExport, downloadReportExport } from './reportExport'
import {
    buildInventoryManagementRows,
    buildLocalSaleCatalog,
    buildProductPublicationSummary,
    INVENTORY_LOW_STOCK_THRESHOLD,
    type LocalSaleCatalogItem,
} from './adminProductDerivations'
import {
    buildInventoryProductBreakdown,
    buildProductBreakdownMeta,
    buildSalesProductBreakdown,
    buildSalesRankingRows,
    buildSalesTrendPreview,
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
    DashboardStats,
    DeepDiveView,
    LocalSaleLineItem,
    LocalSaleQuotationResult,
    LocalSaleQuote,
    LocalSaleSubmissionResult,
    Order,
    PosMovement,
    PosShift,
    ProductEditorMode,
    ProductDetailMetric,
    ProductFormState,
    ProductProcurementDetail,
    ProductPublicationFilter,
    PurchaseInvoiceDetail,
    PurchaseInvoiceSummary,
    SalesRankingRow,
    ShippingPickup,
    ShippingProvider,
} from './types'

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
const DiscountCodesPanel = dynamic(() => import('./components/DiscountCodesPanel'), {
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
    const [trendRange, setTrendRange] = useState<7 | 30>(7)
    const [salesRankingView, setSalesRankingView] = useState<'month' | 'historical'>('month')
    const [salesRankingMonth, setSalesRankingMonth] = useState<string>(getCurrentMonthKey())
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
    const [adminProductsList, setAdminProductsList] = useState<any[]>([])
    const [adminProductsSearch, setAdminProductsSearch] = useState('')
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
    const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'available' | 'low' | 'out' | 'expiring' | 'expired'>('all')
    const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'all' | 'perishable' | 'nonperishable'>('all')
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
    const [vatRate, setVatRate] = useState<number>(0)
    const [vatLoading, setVatLoading] = useState(false)
    const [vatSaving, setVatSaving] = useState(false)
    const [shippingRates, setShippingRates] = useState<{ delivery: number; pickup: number; taxRate: number }>({ delivery: 0, pickup: 0, taxRate: 0 })
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

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            await requestApi(`/api/products/${id}`, {
                method: 'DELETE',
            });
            showNotification('Producto retirado correctamente');
            const res = await requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT);
            setAdminProductsList(normalizeAdminProducts(res.body));
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
        const openedWindow = window.open(`/api/admin/billing/rides/${encodeURIComponent(normalized)}/pdf`, '_blank')
        if (!openedWindow) {
            showNotification('Tu navegador bloqueó la apertura del PDF.', 'error')
        }
    }, [showNotification])

    const printOrderInvoiceById = async (orderId: string) => {
        let printWindow: Window | null = null

        try {
            const res = await fetch(`/api/orders/${orderId}/invoice`, {
                credentials: 'include'
            })
            if (!res.ok) {
                throw new Error('No se pudo preparar la factura para impresión.')
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
            const res = await withTransientRetry(() => requestApi<{ rate: number }>('/api/admin/settings/tax'))
            setVatRate(Number(res.body.rate ?? 0))
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
            const res = await withTransientRetry(() => requestApi<{ delivery: number; pickup: number; tax_rate: number }>('/api/admin/settings/shipping'))
            setShippingRates({
                delivery: Number(res.body.delivery ?? 0),
                pickup: Number(res.body.pickup ?? 0),
                taxRate: Number(res.body.tax_rate ?? 0)
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
            const res = await withTransientRetry(() => requestApi<any[]>('/api/admin/purchase-invoices?limit=15'))
            const rows = Array.isArray(res.body) ? res.body.map(normalizePurchaseInvoiceSummary) : []
            setRecentPurchaseInvoices(rows)
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

    const handleOpenProductBalance = async (product: any) => {
        const productId = String(getAdminProductEntityId(product) || '').trim()
        if (!productId) {
            showNotification('El producto no tiene un identificador válido para consultar su balance.', 'error')
            return
        }
        setIsProductProcurementModalOpen(true)
        setProductProcurementDetailLoading(true)
        try {
            const res = await withTransientRetry(() => requestApi<any>(`/api/products/${encodeURIComponent(productId)}?scope=admin&procurement_detail=1`))
            setSelectedProductProcurementDetail(normalizeProductProcurementDetail(res.body))
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
            const res = await requestApi<{ rate: number }>('/api/admin/settings/tax', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rate: vatRate })
            })
            setVatRate(Number(res.body.rate ?? 0))
            showNotification('IVA actualizado correctamente.')
        } catch (error) {
            console.error(error)
            showNotification('No se pudo guardar el IVA.', 'error')
        } finally {
            setVatSaving(false)
        }
    }

    const handleSaveShipping = async () => {
        setShippingSaving(true)
        try {
            const res = await requestApi<{ delivery: number; pickup: number; tax_rate: number }>('/api/admin/settings/shipping', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    delivery: shippingRates.delivery,
                    pickup: shippingRates.pickup,
                    tax_rate: shippingRates.taxRate
                })
            })
            setShippingRates({
                delivery: Number(res.body.delivery ?? 0),
                pickup: Number(res.body.pickup ?? 0),
                taxRate: Number(res.body.tax_rate ?? 0)
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
        user,
        adminReloadNonce,
        passiveRefreshNonce,
        handleLogout,
        setAdminDataLoading,
        setAdminDataError,
        setDashboardStats,
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
        loadProductPageSettings,
        loadPosSnapshot,
        normalizeAdminProducts,
    })

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
    const salesProgressPercentage = Number(dashboardStats?.totalSales?.progress?.percentage ?? 0)
    const salesTrendIsPositive = salesProgressPercentage >= 0
    const productSalesRanking = dashboardStats?.businessMetrics?.productSalesRanking
    const selectedRankingMonth = productSalesRanking?.selectedMonth || salesRankingMonth
    const selectedRankingMonthLabel = formatMonthKeyLabel(selectedRankingMonth)
    const salesRankingRows = React.useMemo<SalesRankingRow[]>(() => {
        return buildSalesRankingRows(productSalesRanking, salesRankingView)
    }, [productSalesRanking, salesRankingView])
    const selectedProcurementSalesProduct = React.useMemo(() => {
        if (!selectedProductProcurementDetail) return null
        return salesRankingRows.find((item) => item.product_id === selectedProductProcurementDetail.product_id) || null
    }, [salesRankingRows, selectedProductProcurementDetail])
    const monthlySalesRankingTotals = productSalesRanking?.monthlyTotals
    const historicalSalesRankingTotals = productSalesRanking?.historicalTotals
    const salesRankingTotals = salesRankingView === 'month' ? monthlySalesRankingTotals : historicalSalesRankingTotals
    const monthlySalesFinancial = productSalesRanking?.monthlyFinancial
    const historicalSalesFinancial = productSalesRanking?.historicalFinancial
    const salesRankingFinancial = salesRankingView === 'month' ? monthlySalesFinancial : historicalSalesFinancial
    const activeReportMeta = REPORT_SECTION_META[adminReportSection]
    const salesSummary = dashboardStats?.businessMetrics?.salesSummary
    const profitStats = dashboardStats?.businessMetrics?.profitStats
    const inventoryValue = dashboardStats?.businessMetrics?.inventoryValue
    const inventoryDeepDive = dashboardStats?.businessMetrics?.inventoryDeepDive
    const inventoryHealth = inventoryDeepDive?.health
    const traceabilityData = dashboardStats?.businessMetrics?.traceability
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
    const traceabilityOrders = traceabilityData?.orders ?? []
    const traceabilityProducts = traceabilityData?.products ?? []
    const traceabilityCategories = traceabilityData?.categories ?? []
    const salesCategories = dashboardStats?.salesByCategory ?? []
    const salesCategoriesTotal = salesCategories.reduce((acc, item) => acc + Number(item.total ?? 0), 0)
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
    const reportBalanceNet = Number(salesSummary?.net ?? 0)
    const reportBalanceGross = Number(salesSummary?.gross ?? 0)
    const reportBalanceVat = Number(salesSummary?.vat ?? 0)
    const reportBalanceShipping = Number(salesSummary?.shipping ?? 0)
    const reportBalanceCost = Number(profitStats?.cost ?? 0)
    const reportBalanceGrossProfit = Number(profitStats?.gross_profit ?? profitStats?.profit ?? 0)
    const reportBalanceGrossMargin = Number(profitStats?.gross_margin ?? profitStats?.margin ?? 0)
    const reportBalanceOperatingExpenses = Number(profitStats?.operating_expenses ?? 0)
    const reportBalanceNetProfit = Number(profitStats?.net_profit ?? reportBalanceGrossProfit - reportBalanceOperatingExpenses)
    const reportBalanceNetMargin = Number(profitStats?.net_margin ?? (reportBalanceNet > 0 ? (reportBalanceNetProfit / reportBalanceNet) * 100 : 0))
    const reportBalanceRoi = Number(profitStats?.roi ?? 0)
    const reportOrdersCount = Number(salesSummary?.orders_count ?? 0)
    const reportAverageOrderNet = Number(salesSummary?.average_order_net ?? dashboardStats?.businessMetrics?.averageOrderValue ?? 0)
    const productWeightedMargin = Number(dashboardStats?.productAnalysis?.weightedMargin ?? dashboardStats?.productAnalysis?.averageMargin ?? 0)
    const productMarginSampleCount = Number(dashboardStats?.productAnalysis?.pricedCostedProducts ?? 0)
    const productMissingCostCount = Number(dashboardStats?.productAnalysis?.missingCostCount ?? 0)
    const openSalesProductDetail = (item: SalesRankingRow) => {
        setSelectedSalesProduct(item)
        setIsSalesProductModalOpen(true)
    }
    const productsNeededForLocalSales = activeTab === 'local-sales' || activeTab === 'quotations'
    const productsNeededForInventory = activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'alerts'
    const productsNeededForProductsPanel = activeTab === 'products'
    const productsNeededForBreakdowns = Boolean(selectedDeepDive === 'product-breakdown')
    const inventoryRowsNeeded = productsNeededForInventory || productsNeededForLocalSales || productsNeededForBreakdowns
    const localSaleCatalog = React.useMemo(() => {
        if (!productsNeededForLocalSales) {
            return [] as ReturnType<typeof buildLocalSaleCatalog>
        }

        return buildLocalSaleCatalog(adminProductsList || [], deferredLocalSaleSearch, parseMoney)
    }, [adminProductsList, deferredLocalSaleSearch, parseMoney, productsNeededForLocalSales])
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
                salesRankingRows,
                salesCategories,
                salesTrendRows,
                inventoryManagementRows,
                recentPurchaseInvoices,
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
        inventoryManagementRows,
        recentPurchaseInvoices,
        salesCategories,
        salesRankingRows,
        salesRankingView,
        salesTrendRows,
        selectedRankingMonth,
        selectedRankingMonthLabel,
        showNotification,
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
    const deferredAdminProductsSearch = React.useDeferredValue(adminProductsSearch)
    const adminProductSearchIndex = React.useMemo(
        () => (productsNeededForProductsPanel ? buildProductSearchIndex((adminProductsList || []) as any) : new Map()),
        [adminProductsList, productsNeededForProductsPanel]
    )
    const normalizedAdminProductsSearch = React.useMemo(
        () => sanitizeProductSearchQuery(deferredAdminProductsSearch),
        [deferredAdminProductsSearch]
    )
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

            ;(adminProductsList || []).forEach((product: any) => {
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
                ? `?month=${encodeURIComponent(salesRankingMonth)}`
                : ''
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
                ? `?month=${encodeURIComponent(salesRankingMonth)}`
                : ''
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
                                            const revenueShare = Math.max(2, (revenue / maxRevenue) * 100)
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
                                                        <div className="text-xs text-white/50 mb-1">Gastos operativos</div>
                                                        <div className="text-xl font-bold text-orange-400">-${reportBalanceOperatingExpenses.toLocaleString()}</div>
                                                    </div>
                                                    <div className="col-span-2 text-[10px] text-white/40">El envío cobrado se muestra separado; no se trata como costo.</div>
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
                                            * Neto descuenta gastos operativos registrados en caja/POS.
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
                                                <p className="text-[9px] text-secondary mt-2">Sugerencia: Liquidar para liberar flujo de caja</p>
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
                                                    <span className="text-xl font-bold text-success">${Number(dashboardStats.businessMetrics?.inventoryValue?.cost_value).toLocaleString()}</span>
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

    const adminUsersSearchTerm = deferredAdminUsersSearch.trim().toLowerCase()
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
            const text = `${item.name || ''} ${item.email || ''} ${item.document_number || ''} ${item.resolvedPhone || ''} ${item.resolvedAddressText || ''} ${item.resolvedCompany || ''}`.toLowerCase()
            return text.includes(adminUsersSearchTerm)
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
                <div className="profile-block md:py-20 py-10">
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
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${message.type === 'success' ? 'bg-white border-success text-success' : 'bg-white border-red text-red'}`}
                    >
                        <div className="flex items-start gap-3">
                            {message.type === 'success' ? (
                                <Icon.CheckCircle size={24} weight="fill" />
                            ) : (
                                <Icon.Warning size={24} weight="fill" />
                            )}
                            <div className="flex-1">
                                <div className="text-base font-semibold">
                                    {message.type === 'success' ? 'Listo' : 'Atención'}
                                </div>
                                <div className="mt-1 text-sm text-[#111827]">{message.text}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMessage(null)}
                                className="text-[#6b7280] hover:text-[#111827]"
                            >
                                <Icon.X size={18} />
                            </button>
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setMessage(null)}
                                className="px-5 py-2 rounded-full border border-line text-sm font-semibold hover:bg-surface"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            <div className="profile-block md:py-20 py-10">
                <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10">
                    <div className="content-main flex gap-y-8 max-lg:flex-col w-full min-w-0">
                        <div className="left lg:w-1/4 xl:w-1/5 w-full xl:pr-10 lg:pr-6 min-w-0">
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
                        <div className="right lg:w-3/4 xl:w-4/5 w-full lg:pl-6 pl-0 min-w-0">
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
                                    {activeTab === 'reports' && (
                                    <div className="tab text-content w-full">
                                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 pb-4">
                                            <div>
                                                <div className="heading5">{activeReportMeta.title}</div>
                                                <p className="text-secondary text-xs mt-1">{activeReportMeta.subtitle}</p>
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
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

                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 mb-4">
                                            <button
                                                type="button"
                                                className={`p-3.5 rounded-lg border text-left transition-all ${(adminReportSection === 'general') ? 'border-black bg-surface' : 'border-line bg-white hover:border-black'}`}
                                                onClick={() => openAdminReportSection('general')}
                                            >
                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">General</div>
                                                <div className="text-lg font-bold">{formatMoney(reportBalanceNet)}</div>
                                                <div className="text-xs text-secondary mt-1">Vista ejecutiva del negocio</div>
                                            </button>
                                            <button
                                                type="button"
                                                className={`p-3.5 rounded-lg border text-left transition-all ${(adminReportSection === 'sales') ? 'border-black bg-surface' : 'border-line bg-white hover:border-black'}`}
                                                onClick={() => openAdminReportSection('sales')}
                                            >
                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">Ventas</div>
                                                <div className="text-lg font-bold">{Number(salesRankingTotals?.units_sold ?? 0).toLocaleString('es-EC')} uds</div>
                                                <div className="text-xs text-secondary mt-1">{formatMoney(Number(salesRankingFinancial?.net ?? salesRankingTotals?.net_revenue ?? 0))} netos</div>
                                            </button>
                                            <button
                                                type="button"
                                                className={`p-3.5 rounded-lg border text-left transition-all ${(adminReportSection === 'balance') ? 'border-black bg-surface' : 'border-line bg-white hover:border-black'}`}
                                                onClick={() => openAdminReportSection('balance')}
                                            >
                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">Balance</div>
                                                <div className={`text-lg font-bold ${reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(reportBalanceNetProfit)}</div>
                                                <div className="text-xs text-secondary mt-1">Neto {reportBalanceNetMargin.toFixed(1)}% • Bruto {reportBalanceGrossMargin.toFixed(1)}%</div>
                                            </button>
                                            <button
                                                type="button"
                                                className={`p-3.5 rounded-lg border text-left transition-all ${(adminReportSection === 'inventory') ? 'border-black bg-surface' : 'border-line bg-white hover:border-black'}`}
                                                onClick={() => openAdminReportSection('inventory')}
                                            >
                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">Inventario</div>
                                                <div className="text-lg font-bold">{formatMoney(Number(inventoryValue?.cost_value ?? 0))}</div>
                                                <div className="text-xs text-secondary mt-1">{Number(inventoryHealth?.low_stock ?? 0)} bajo stock • {Number(inventoryHealth?.out_of_stock ?? 0)} sin stock</div>
                                            </button>
                                            <button
                                                type="button"
                                                className={`p-3.5 rounded-lg border text-left transition-all ${(adminReportSection === 'traceability') ? 'border-black bg-surface' : 'border-line bg-white hover:border-black'}`}
                                                onClick={() => openAdminReportSection('traceability')}
                                            >
                                                <div className="text-[10px] uppercase font-bold text-secondary mb-1">Trazabilidad</div>
                                                <div className="text-lg font-bold">{traceabilityOrders.length.toLocaleString('es-EC')} pedidos</div>
                                                <div className="text-xs text-secondary mt-1">{traceabilityProducts.length.toLocaleString('es-EC')} productos • {traceabilityCategories.length.toLocaleString('es-EC')} categorías</div>
                                            </button>
                                        </div>

                                        {adminReportSection === 'general' && (
                                            <>
                                        <div className="mb-4 grid grid-cols-1 xl:grid-cols-[1.12fr_0.88fr] gap-3">
                                            <button
                                                type="button"
                                                className={`p-4 rounded-lg border w-full text-left transition-all ${
                                                    pendingOperationalOrders > 0
                                                        ? 'border-[#F59E0B] bg-[#FFF7E8] hover:border-[#D97706]'
                                                        : 'border-line bg-white hover:border-black'
                                                }`}
                                                onClick={openPendingOrdersShortcut}
                                            >
                                                <div className="flex h-full flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                                    <div className="min-w-0">
                                                        <div className="text-secondary text-xs uppercase font-bold mb-1">Atención operativa</div>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <div className={`heading5 ${pendingOperationalOrders > 0 ? 'text-[#B45309]' : 'text-black'}`}>
                                                                {pendingOperationalOrders.toLocaleString('es-EC')} pedidos por atender
                                                            </div>
                                                            {pendingOperationalOrders > 0 && (
                                                                <span className="inline-flex items-center rounded-full bg-[#FDE68A] px-3 py-1 text-[11px] font-bold text-[#92400E]">
                                                                    Requieren revisión
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-secondary text-xs mt-2 max-w-2xl">
                                                            Este bloque es solo operativo. No entra en ventas, utilidad ni trazabilidad hasta que el pedido se complete o entregue.
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5 text-sm min-w-full sm:min-w-[320px] lg:min-w-[332px]">
                                                        <div className="rounded-lg bg-white/70 border border-[#F2D29B] px-2.5 py-2.5">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Pendientes</div>
                                                            <div className="text-lg font-bold text-black">{purePendingOperationalOrders.toLocaleString('es-EC')}</div>
                                                        </div>
                                                        <div className="rounded-lg bg-white/70 border border-[#F2D29B] px-2.5 py-2.5">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">En proceso</div>
                                                            <div className="text-lg font-bold text-black">{processingOperationalOrders.toLocaleString('es-EC')}</div>
                                                        </div>
                                                        <div className="rounded-lg bg-white/70 border border-[#F2D29B] px-2.5 py-2.5 flex flex-col justify-between">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Acción</div>
                                                            <div className="text-sm font-bold underline">Ver pedidos</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                className="p-4 rounded-lg border border-line bg-surface w-full text-left transition-all hover:border-black"
                                                onClick={() => navigateToPanelTab('taxes')}
                                            >
                                                <div className="flex h-full flex-col justify-between gap-3">
                                                    <div>
                                                        <div className="text-secondary text-xs uppercase font-bold mb-1">IVA configurado</div>
                                                        <div className="heading4">{vatRateLabel}%</div>
                                                        <p className="text-secondary text-xs mt-2">Los productos gravados incluyen IVA; los exentos conservan precio final sin IVA.</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5 text-sm">
                                                        <div className="rounded-lg bg-white border border-line px-2.5 py-2.5">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Multiplicador</div>
                                                            <div className="text-lg font-bold text-black">{vatMultiplierLabel}x</div>
                                                        </div>
                                                        <div className="rounded-lg bg-white border border-line px-2.5 py-2.5">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Ejemplo gravado</div>
                                                            <div className="text-lg font-bold text-black">${vatExampleTotal}</div>
                                                            <div className="text-[11px] text-secondary">$100 base</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                                            {(() => {
                                                const summary = dashboardStats?.businessMetrics?.salesSummary
                                                const ranking = dashboardStats?.businessMetrics?.productSalesRanking
                                                const gross = Number(summary?.gross ?? 0)
                                                const net = Number(summary?.net ?? 0)
                                                const vat = Number(summary?.vat ?? 0)
                                                const shipping = Number(summary?.shipping ?? 0)
                                                const monthUnits = Number(ranking?.monthlyTotals?.units_sold ?? 0)
                                                const histUnits = Number(ranking?.historicalTotals?.units_sold ?? 0)
                                                return (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="p-3.5 bg-white rounded-lg border border-line shadow-sm text-left cursor-pointer hover:border-primary transition-all"
                                                            onClick={() => openProductBreakdown('gross')}
                                                        >
                                                            <div className="text-secondary text-xs uppercase font-bold mb-1">Venta Total</div>
                                                            <div className="heading5">${gross.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            <div className="text-secondary text-xs mt-1">Incluye IVA + Envío • Ver productos</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="p-3.5 bg-white rounded-lg border border-line shadow-sm text-left cursor-pointer hover:border-primary transition-all"
                                                            onClick={() => openProductBreakdown('net')}
                                                        >
                                                            <div className="text-secondary text-xs uppercase font-bold mb-1">Venta Neta</div>
                                                            <div className="heading5">${net.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            <div className="text-secondary text-xs mt-1">Sin IVA ni envío • Ver productos</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="p-3.5 bg-white rounded-lg border border-line shadow-sm text-left cursor-pointer hover:border-primary transition-all"
                                                            onClick={() => openProductBreakdown('vat')}
                                                        >
                                                            <div className="text-secondary text-xs uppercase font-bold mb-1">IVA Cobrado</div>
                                                            <div className="heading5">${vat.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            <div className="text-secondary text-xs mt-1">Impuesto del cliente • Ver productos</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="p-3.5 bg-white rounded-lg border border-line shadow-sm text-left cursor-pointer hover:border-primary transition-all"
                                                            onClick={() => openProductBreakdown('shipping')}
                                                        >
                                                            <div className="text-secondary text-xs uppercase font-bold mb-1">Envío Cobrado</div>
                                                            <div className="heading5">${shipping.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            <div className="text-secondary text-xs mt-1">Cobro al cliente • Ver productos</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="p-3.5 bg-white rounded-lg border border-line shadow-sm text-left cursor-pointer hover:border-primary transition-all"
                                                            onClick={() => openAdminReportSection('sales')}
                                                        >
                                                            <div className="text-secondary text-xs uppercase font-bold mb-1">Productos Vendidos (uds)</div>
                                                            <div className="heading5">{monthUnits.toLocaleString('es-EC')}</div>
                                                            <div className="text-secondary text-xs mt-1">
                                                                Mes actual • Hist: {histUnits.toLocaleString('es-EC')}
                                                            </div>
                                                        </button>
                                                    </>
                                                )
                                            })()}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                                            <div
                                                className="p-3.5 bg-white rounded-lg border border-line shadow-sm cursor-pointer hover:border-primary transition-all"
                                                onClick={() => openProductBreakdown('net')}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-secondary text-sm font-medium">Ventas (Mes, netas)</div>
                                                    <Icon.CurrencyDollar className="text-success" size={20} />
                                                </div>
                                                <div className="heading5">${dashboardStats?.totalSales?.amount ? Number(dashboardStats.totalSales.amount).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
                                                <div className={`${salesTrendIsPositive ? 'text-success' : 'text-red'} text-xs mt-2 font-bold flex items-center gap-1`}>
                                                    {salesTrendIsPositive ? <Icon.TrendUp weight="bold" /> : <Icon.TrendDown weight="bold" />}
                                                    {salesTrendIsPositive ? '+' : ''}{salesProgressPercentage.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                                    <span className="text-secondary font-normal ml-1 flex items-center gap-1 underline">ver detalle <Icon.ArrowRight size={10} /></span>
                                                </div>
                                            </div>

                                            <div
                                                className="p-3.5 bg-white rounded-lg border border-line shadow-sm cursor-pointer hover:border-primary transition-all"
                                                onClick={() => setSelectedDeepDive('aov')}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-secondary text-sm font-medium">Ticket Promedio</div>
                                                    <Icon.Receipt className="text-blue-500" size={20} />
                                                </div>
                                                        <div className="heading5">{formatMoney(reportAverageOrderNet)}</div>
                                                <div className="text-secondary text-xs mt-2 underline">Analizar distribución <Icon.ArrowRight size={10} className="inline ml-1" /></div>
                                            </div>

                                            <div
                                                className="p-3.5 bg-white rounded-lg border border-line shadow-sm cursor-pointer hover:border-primary transition-all"
                                                onClick={() => openProductBreakdown('profit')}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-secondary text-sm font-medium">Utilidad bruta / neta</div>
                                                    <Icon.HandCoins className="text-orange-500" size={20} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <div className="text-[10px] uppercase font-bold text-secondary">Bruta</div>
                                                        <div className="text-lg font-bold text-success">{formatMoney(reportBalanceGrossProfit)}</div>
                                                        <div className="text-xs text-secondary">{reportBalanceGrossMargin.toFixed(1)}%</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] uppercase font-bold text-secondary">Neta</div>
                                                        <div className={`text-lg font-bold ${reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(reportBalanceNetProfit)}</div>
                                                        <div className="text-xs text-secondary">{reportBalanceNetMargin.toFixed(1)}%</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="p-3.5 bg-white rounded-lg border border-line shadow-sm cursor-pointer hover:border-primary transition-all"
                                                onClick={() => openAdminReportSection('inventory')}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-secondary text-sm font-medium">Valor Inventario</div>
                                                    <Icon.Archive className="text-purple-500" size={20} />
                                                </div>
                                                <div className="heading5">${dashboardStats?.businessMetrics?.inventoryValue?.cost_value?.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}</div>
                                                <div className="text-secondary text-xs mt-2">{Number(dashboardStats?.businessMetrics?.inventoryValue?.skus_with_stock ?? 0).toLocaleString('es-EC')} productos con stock <span className="underline">ver riesgos <Icon.ArrowRight size={10} className="inline ml-1" /></span></div>
                                            </div>

                                            <div
                                                className="p-3.5 bg-white rounded-lg border border-line shadow-sm cursor-pointer hover:border-primary transition-all"
                                                onClick={() => navigateToPanelTab('products')}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-secondary text-sm font-medium">Productos Activos</div>
                                                    <Icon.ShoppingBag className="text-primary" size={20} />
                                                </div>
                                                <div className="heading5">{Number(dashboardStats?.productAnalysis?.totalMonitored ?? 0).toLocaleString('es-EC')}</div>
                                                <div className="text-secondary text-xs mt-2 underline">Ver catálogo <Icon.ArrowRight size={10} className="inline ml-1" /></div>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <div className="bg-white p-5 rounded-xl border border-line shadow-sm relative overflow-hidden">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div>
                                                        <div className="heading6">Tendencia de Ventas</div>
                                                        <p className="text-secondary text-xs mt-1">Comparativa de ingresos diarios</p>
                                                    </div>
                                                    <div className="flex bg-surface p-1 rounded-lg border border-line">
                                                        <button
                                                            onClick={() => setTrendRange(7)}
                                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${trendRange === 7 ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                        >
                                                            7 Días
                                                        </button>
                                                        <button
                                                            onClick={() => setTrendRange(30)}
                                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${trendRange === 30 ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                        >
                                                            30 Días
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="h-64 md:h-72 relative mt-2">
                                                    {dashboardStats ? (
                                                        trendRange === 7 ? (
                                                            <div className="flex items-end gap-3 h-full justify-between pt-6 px-2">
                                                                {(dashboardStats.monthlyPerformance || []).slice(-7).map((item, i) => {
                                                                    // Calculate max value dynamically or default to 1 to avoid division by zero
                                                                    // Use the max of the visible slice for better scaling
                                                                    const currentData = (dashboardStats.monthlyPerformance || []).slice(-7);
                                                                    const maxVal = Math.max(...currentData.map(p => Number(p.total))) || 100;
                                                                    const rawHeight = (Number(item.total) / maxVal) * 100;
                                                                    const height = Math.max(rawHeight, 4); // Min height for visibility

                                                                    return (
                                                                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-3 group relative cursor-pointer">
                                                                            {/* Tooltip positioned absolutely relative to the bar column */}
                                                                            <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-20 font-bold shadow-xl pointer-events-none mb-1">
                                                                                Ventas: ${Number(item.total).toLocaleString()}
                                                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                                                            </div>

                                                                            {/* The Bar */}
                                                                            <div className="w-full max-w-[60px] bg-secondary/5 rounded-t-xl relative flex items-end h-full overflow-visible group-hover:bg-secondary/10 transition-colors duration-300">
                                                                                <motion.div
                                                                                    initial={{ height: 0 }}
                                                                                    animate={{ height: `${height}%` }}
                                                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                                                    className={`w-full relative rounded-t-xl ${i === 6 ? 'bg-black' : 'bg-black/80 group-hover:bg-black'}`}
                                                                                >
                                                                                </motion.div>
                                                                            </div>

                                                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${i === 6 ? 'text-black' : 'text-secondary group-hover:text-black'}`}>{item.day}</span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full pt-10 px-2 flex flex-col justify-between">
                                                                <svg className="w-full h-[200px] overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                                                                    <defs>
                                                                        <linearGradient id="gradientTrend" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="#000000" stopOpacity="0.1" />
                                                                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                                                                        </linearGradient>
                                                                        <clipPath id="chartClip">
                                                                            <rect x="0" y="0" width="1000" height="200" />
                                                                        </clipPath>
                                                                    </defs>

                                                                    {/* Background Grid - More subtle and cleaner */}
                                                                    <line x1="0" y1="50" x2="1000" y2="50" stroke="#E5E7EB" strokeDasharray="4 4" />
                                                                    <line x1="0" y1="100" x2="1000" y2="100" stroke="#E5E7EB" strokeDasharray="4 4" />
                                                                    <line x1="0" y1="150" x2="1000" y2="150" stroke="#E5E7EB" strokeDasharray="4 4" />
                                                                    <line x1="0" y1="200" x2="1000" y2="200" stroke="#E5E7EB" strokeWidth="1" />

                                                                    {(() => {
                                                                        const data = dashboardStats.salesTrend30Days || [];
                                                                        const maxVal = Math.max(...data.map(p => Number(p.total))) || 1;

                                                                        // Create smooth curve using cubic bezier
                                                                        const points = data.map((d, i) => {
                                                                            const x = (i / (data.length - 1)) * 1000;
                                                                            const y = 200 - (Number(d.total) / maxVal) * 180; // Leave 20px padding at top
                                                                            return { x, y, val: d.total, date: d.day };
                                                                        });

                                                                        // Generate smooth path command (Catmull-Rom to Bezier conversion or similar simple smoothing)
                                                                        // For simplicity and robustness in this specialized constraint, we'll use straight lines but with a slight curve effect logic or just high quality polyline
                                                                        // Actually, let's use a simple line for 30 days to avoid over-smoothing artifacts, but style it elegantly

                                                                        const pathData = points.reduce((acc, p, i) =>
                                                                            acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), "");

                                                                        const areaData = pathData + ` L 1000 200 L 0 200 Z`;

                                                                        return (
                                                                            <>
                                                                                <motion.path
                                                                                    initial={{ opacity: 0 }}
                                                                                    animate={{ opacity: 1 }}
                                                                                    transition={{ duration: 1 }}
                                                                                    d={areaData}
                                                                                    fill="url(#gradientTrend)"
                                                                                />
                                                                                <motion.path
                                                                                    initial={{ pathLength: 0 }}
                                                                                    animate={{ pathLength: 1 }}
                                                                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                                                                    d={pathData}
                                                                                    fill="none"
                                                                                    stroke="black"
                                                                                    strokeWidth="2.5"
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                />
                                                                                {/* Interactive Points - Only show some points to avoid clutter */}
                                                                                {points.map((p, i) => (
                                                                                    <g key={i} className="group/point">
                                                                                        {/* larger invisible target for easier hovering */}
                                                                                        <rect x={p.x - 10} y="0" width="20" height="200" fill="transparent" className="cursor-pointer" />

                                                                                        <circle
                                                                                            cx={p.x}
                                                                                            cy={p.y}
                                                                                            r="3"
                                                                                            className="fill-white stroke-black stroke-[3px] opacity-0 group-hover/point:opacity-100 transition-all duration-200"
                                                                                        />

                                                                                        {/* Tooltip */}
                                                                                        <foreignObject x={Math.min(p.x - 40, 920)} y={Math.max(p.y - 60, 0)} width="80" height="50" className="opacity-0 group-hover/point:opacity-100 pointer-events-none transition-all duration-200 z-50 overflow-visible">
                                                                                            <div className="bg-black text-white text-[10px] py-2 px-3 rounded-lg text-center shadow-xl transform translate-y-1">
                                                                                                <div className="font-bold mb-0.5">{p.date}</div>
                                                                                                <div>${Number(p.val).toLocaleString()}</div>
                                                                                                {/* Little triangle arrow at bottom */}
                                                                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                                                                            </div>
                                                                                        </foreignObject>
                                                                                    </g>
                                                                                ))}
                                                                            </>
                                                                        )
                                                                    })()}
                                                                </svg>

                                                                {/* X-Axis Labels - Better distributed */}
                                                                <div className="flex justify-between w-full mt-4 border-t border-line pt-4">
                                                                    {(() => {
                                                                        const data = dashboardStats.salesTrend30Days || [];
                                                                        // Show ~5 labels evenly distributed
                                                                        const step = Math.max(1, Math.floor(data.length / 5));
                                                                        const labels: Array<{ day: string; total: number }> = [];
                                                                        for (let i = 0; i < data.length; i += step) {
                                                                            if (labels.length < 5) labels.push(data[i]);
                                                                        }
                                                                        if (data.length > 0 && labels[labels.length - 1] !== data[data.length - 1]) {
                                                                            labels[4] = data[data.length - 1]; // Ensure last one is last day
                                                                        }

                                                                        return labels.map((item, idx) => (
                                                                            <span key={idx} className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                                                                                {idx === labels.length - 1 ? 'HOY' : item?.day}
                                                                            </span>
                                                                        ));
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-secondary">Cargando datos...</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                <div className="bg-white p-8 rounded-2xl border border-line shadow-sm">
                                                    <div className="heading6 mb-2">Distribución de Ventas Realizadas</div>
                                                    <div className="text-[11px] text-secondary mb-6">Solo cuenta pedidos completados o entregados.</div>
                                                    <div className="space-y-6">
                                                        {(dashboardStats?.businessMetrics?.ordersByStatus || [])
                                                            .filter((status) => ['completed', 'delivered'].includes(normalizeStatus(status.status)))
                                                            .map((status, i, realizedStatuses) => {
                                                            const total = realizedStatuses.reduce((acc, curr) => acc + Number(curr.count), 0) || 1;
                                                            const perc = Math.round((Number(status.count) / total) * 100);
                                                            const normalizedStatus = normalizeStatus(status.status)
                                                            const barColorClass = ['completed', 'delivered'].includes(normalizedStatus)
                                                                ? 'bg-success'
                                                                : ['processing', 'in_process', 'in-process'].includes(normalizedStatus)
                                                                    ? 'bg-yellow'
                                                                    : ['pending'].includes(normalizedStatus)
                                                                        ? 'bg-amber-400'
                                                                        : ['canceled', 'cancelled'].includes(normalizedStatus)
                                                                            ? 'bg-red'
                                                                            : ['pickup', 'ready_for_pickup', 'ready'].includes(normalizedStatus)
                                                                                ? 'bg-amber-600'
                                                                                : 'bg-primary'
                                                            return (
                                                                <div key={i} className="cursor-pointer group hover:bg-surface -mx-2 p-2 rounded-lg transition-colors" onClick={() => navigateToPanelTab('admin-orders')}>
                                                                    <div className="flex justify-between text-sm mb-2">
                                                                        <span className="capitalize font-bold text-secondary group-hover:text-black transition-colors">{getStatusBadge(status.status).label}</span>
                                                                        <span className="font-bold">{status.count} ({perc}%)</span>
                                                                    </div>
                                                                    <div className="w-full h-2 bg-line rounded-full overflow-hidden">
                                                                        <div className={`h-full ${barColorClass}`} style={{ width: `${perc}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                        {((dashboardStats?.businessMetrics?.ordersByStatus || [])
                                                            .filter((status) => ['completed', 'delivered'].includes(normalizeStatus(status.status)))).length === 0 && (
                                                            <div className="text-sm text-secondary">Aún no hay ventas completadas.</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                    <div className="bg-white p-8 rounded-2xl border border-line shadow-sm overflow-hidden">
                                                        <div className="heading6 mb-2">Ventas Completadas Recientes</div>
                                                        <div className="text-[11px] text-secondary mb-6">Últimos pedidos que ya cuentan como venta realizada.</div>
                                                        <div className="w-full">
                                                            <table className="w-full text-left text-sm table-fixed">
                                                                <thead>
                                                                    <tr className="border-b border-line">
                                                                        <th className="pb-3 text-secondary font-medium w-1/4">ID</th>
                                                                        <th className="pb-3 text-secondary font-medium w-1/3">Cliente</th>
                                                                        <th className="pb-3 text-secondary font-medium text-right">Total</th>
                                                                        <th className="pb-3 text-secondary font-medium text-right">Hora</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {dashboardStats?.businessMetrics?.recentOrders?.map((order, i) => (
                                                                        <tr key={i}
                                                                            className="border-b border-line last:border-0 hover:bg-surface transition-colors cursor-pointer group"
                                                                            onClick={() => handleViewOrder(order.id)}
                                                                        >
                                                                            <td className="py-4 font-bold text-xs truncate pr-2 group-hover:text-primary transition-colors">#{order.id.split('-').pop()}</td>
                                                                            <td className="py-4 text-xs truncate pr-2">{order.user_name || 'Anónimo'}</td>
                                                                            <td className="py-4 text-right font-bold text-xs">${Number(order.total).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                            <td className="py-4 text-right text-[10px] text-secondary whitespace-nowrap">
                                                                                {formatDateTimeEcuador(order.created_at, { hour: '2-digit', minute: '2-digit' })}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-8 rounded-2xl border border-line shadow-sm">
                                                        <div className="heading6 mb-2">Top 5 Productos Vendidos</div>
                                                        <div className="text-[11px] text-secondary mb-6">Ranking basado solo en pedidos completados o entregados.</div>
                                                        <div className="space-y-4">
                                                            {dashboardStats?.topProducts?.map((prod, i) => (
                                                                <div key={i}
                                                                    className="flex items-center gap-4 p-3 bg-surface rounded-xl hover:shadow-md transition-all cursor-pointer hover:bg-white border border-transparent hover:border-line"
                                                                    onClick={() => openAdminReportSection('sales')}
                                                                >
                                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-bold truncate group-hover:text-primary">{prod.name}</div>
                                                                        <div className="text-[10px] text-secondary">{prod.sold} unidades</div>
                                                                    </div>
                                                                    <div className="text-xs font-bold text-success whitespace-nowrap">${Number(prod.revenue).toLocaleString()}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                <div className="bg-surface rounded-lg border border-line p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Icon.Tag size={20} className="text-primary" />
                                                        <div className="font-bold">Categorías Estrella</div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {dashboardStats?.salesByCategory?.slice(0, 4).map((cat, i) => {
                                                            const total = dashboardStats.salesByCategory?.reduce((acc, curr) => acc + Number(curr.total), 0) || 1;
                                                            const perc = Math.round((Number(cat.total) / total) * 100);
                                                            return (
                                                                <div key={i} className="cursor-pointer group hover:bg-white -mx-2 p-2 rounded-lg transition-colors" onClick={() => navigateToPanelTab('products')}>
                                                                    <div className="flex justify-between text-[10px] mb-1">
                                                                        <span className="capitalize font-bold text-secondary group-hover:text-black">{cat.category}</span>
                                                                        <span className="font-bold">{perc}%</span>
                                                                    </div>
                                                                    <div className="w-full h-1 bg-line rounded-full overflow-hidden">
                                                                        <div className="h-full bg-primary" style={{ width: `${perc}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-surface rounded-lg border border-line p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Icon.Lightbulb size={24} className="text-yellow" />
                                                        <div className="font-bold">Análisis de Stock</div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div
                                                            className="p-3 bg-white rounded-lg border border-line cursor-pointer hover:border-black transition-colors shadow-sm group"
                                                            onClick={() => openAdminReportSection('inventory')}
                                                        >
                                                            <div className="text-[10px] text-secondary uppercase font-bold group-hover:text-black">Valor de Mercado</div>
                                                            <div className="text-lg font-bold">${Number(dashboardStats?.businessMetrics?.inventoryValue?.market_value ?? 0).toLocaleString()}</div>
                                                        </div>
                                                        <div
                                                            className="p-3 bg-white rounded-lg border border-line cursor-pointer hover:border-black transition-colors shadow-sm group"
                                                            onClick={() => openAdminReportSection('inventory')}
                                                        >
                                                            <div className="text-[10px] text-secondary uppercase font-bold group-hover:text-black">Inversión en Almacén</div>
                                                            <div className="text-lg font-bold">${Number(dashboardStats?.businessMetrics?.inventoryValue?.cost_value ?? 0).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-surface rounded-lg border border-line p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Icon.TrendUp size={24} className="text-success" />
                                                        <div className="font-bold">KPIs Financieros</div>
                                                    </div>
                                                    <div className="space-y-2 cursor-pointer" onClick={() => setSelectedDeepDive('profit')}>
                                                    <div className="flex justify-between items-center py-2 border-b border-line hover:bg-white -mx-2 px-2 rounded-lg transition-colors">
                                                            <span className="text-xs text-secondary font-bold">Margen bruto sobre venta neta</span>
                                                            <span className="font-bold text-success text-sm">{dashboardStats?.businessMetrics?.profitStats?.gross_margin ?? dashboardStats?.businessMetrics?.profitStats?.margin}%</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2 border-b border-line hover:bg-white -mx-2 px-2 rounded-lg transition-colors">
                                                            <span className="text-xs text-secondary font-bold">Margen neto sobre venta neta</span>
                                                            <span className={`font-bold text-sm ${reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}`}>{reportBalanceNetMargin.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2 border-b border-line hover:bg-white -mx-2 px-2 rounded-lg transition-colors">
                                                            <span className="text-xs text-secondary font-bold">ROI bruto sobre costo vendido</span>
                                                            <span className="font-bold text-sm">{Number(dashboardStats?.businessMetrics?.profitStats?.roi ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2 border-b border-line hover:bg-white -mx-2 px-2 rounded-lg transition-colors">
                                                            <span className="text-xs text-secondary font-bold">ROI neto con gastos</span>
                                                            <span className="font-bold text-sm">{Number(dashboardStats?.businessMetrics?.profitStats?.net_roi ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                                                        </div>
                                                        <div className="text-[9px] text-secondary text-center mt-2 group-hover:text-black">Bruto descuenta producto; neto descuenta gastos registrados.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                            </>
                                        )}

                                        {adminReportSection === 'sales' && (
                                            <>
                                                <div className="bg-white p-6 rounded-2xl border border-line shadow-sm mb-6">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                                                        <div>
                                                            <div className="heading6">Corte comercial</div>
                                                            <p className="text-secondary text-xs mt-1">
                                                                Vista activa: {salesRankingView === 'month' ? `mes (${selectedRankingMonthLabel})` : 'histórico total'}.
                                                            </p>
                                                            <p className="text-secondary text-xs mt-1">
                                                                Periodo: {salesRankingView === 'month'
                                                                    ? `${productSalesRanking?.period?.start || '-'} → ${productSalesRanking?.period?.end || '-'}`
                                                                    : `${productSalesRanking?.historicalPeriod?.start || '-'} → ${productSalesRanking?.historicalPeriod?.end || '-'}`}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                                            <label className="flex flex-col gap-1 text-[10px] uppercase font-bold text-secondary">
                                                                Mes a consultar
                                                                <input
                                                                    type="month"
                                                                    value={salesRankingMonth}
                                                                    onChange={(event) => {
                                                                        const nextMonth = event.target.value
                                                                        setSalesRankingMonth(nextMonth || getCurrentMonthKey())
                                                                        setSalesRankingView('month')
                                                                    }}
                                                                    className="px-3 py-1.5 text-sm font-semibold rounded-md border border-line bg-white text-black focus:border-black outline-none"
                                                                />
                                                            </label>
                                                            <div className="flex bg-surface p-1 rounded-lg border border-line w-fit">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSalesRankingView('month')}
                                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'month' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                                >
                                                                    Mes
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSalesRankingView('historical')}
                                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'historical' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                                >
                                                                    Histórico
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 xl:grid-cols-8 gap-3">
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Pedidos</div>
                                                            <div className="text-lg font-bold">{Number(salesRankingFinancial?.orders_count ?? 0).toLocaleString('es-EC')}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Unidades</div>
                                                            <div className="text-lg font-bold">{Number(salesRankingTotals?.units_sold ?? 0).toLocaleString('es-EC')}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Bruto</div>
                                                            <div className="text-lg font-bold">{formatMoney(Number(salesRankingFinancial?.gross ?? 0))}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Neto</div>
                                                            <div className="text-lg font-bold">{formatMoney(Number(salesRankingFinancial?.net ?? salesRankingTotals?.net_revenue ?? 0))}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">IVA</div>
                                                            <div className="text-lg font-bold">{formatMoney(Number(salesRankingFinancial?.vat ?? 0))}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Envío</div>
                                                            <div className="text-lg font-bold">{formatMoney(Number(salesRankingFinancial?.shipping ?? 0))}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Costo</div>
                                                            <div className="text-lg font-bold">{formatMoney(Number(salesRankingFinancial?.cost ?? 0))}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg border border-line bg-surface">
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Margen</div>
                                                            <div className="text-lg font-bold">{Number(salesRankingFinancial?.margin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6 mb-6">
                                                    <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <div className="heading6">Tendencia reciente</div>
                                                                <p className="text-secondary text-xs mt-1">Últimos {salesTrendPreview.length} cortes diarios disponibles.</p>
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
                                                                const ratio = Math.max((Number(item.total ?? 0) / salesTrendPreviewMax) * 100, 8)
                                                                return (
                                                                    <div key={`${item.day}-${index}`} className="rounded-xl border border-line bg-surface p-3">
                                                                        <div className="text-[10px] uppercase font-bold text-secondary">{item.day}</div>
                                                                        <div className="font-bold mt-2">{formatMoney(Number(item.total ?? 0))}</div>
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
                                                        <div className="heading6 mb-4">Mix por categoría</div>
                                                        <div className="space-y-4">
                                                            {salesCategories.slice(0, 6).map((cat, index) => {
                                                                const value = Number(cat.total ?? 0)
                                                                const ratio = salesCategoriesTotal > 0 ? Math.max((value / salesCategoriesTotal) * 100, 4) : 0
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
                                                            {salesCategories.length === 0 && (
                                                                <div className="text-sm text-secondary">No hay categorías con ventas registradas.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                                                        <div>
                                                            <div className="heading6">Productos líderes del periodo</div>
                                                            <p className="text-secondary text-xs mt-1">Resumen compacto de lo más vendido y su rentabilidad.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold hover:bg-surface"
                                                            onClick={() => setActiveTab('sales-ranking')}
                                                        >
                                                            Ver ranking detallado
                                                        </button>
                                                    </div>
                                                    <div className="overflow-x-auto border border-line rounded-xl">
                                                        <table className="w-full min-w-[900px] text-left">
                                                            <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-right">#</th>
                                                                    <th className="px-4 py-3">Producto</th>
                                                                    <th className="px-4 py-3">Categoría</th>
                                                                    <th className="px-4 py-3 text-right">Pedidos</th>
                                                                    <th className="px-4 py-3 text-right">Unidades</th>
                                                                    <th className="px-4 py-3 text-right">Venta neta</th>
                                                                    <th className="px-4 py-3 text-right">Costo</th>
                                                                    <th className="px-4 py-3 text-right">Utilidad</th>
                                                                    <th className="px-4 py-3 text-right">Margen</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-line">
                                                                {salesRankingRows.slice(0, 10).map((item, index) => (
                                                                    <tr key={`${item.product_id}-${index}`} className="hover:bg-surface/40">
                                                                        <td className="px-4 py-3 text-right font-semibold text-sm">{index + 1}</td>
                                                                        <td className="px-4 py-3 text-sm font-semibold">
                                                                            <button type="button" className="text-left hover:underline" onClick={() => openSalesProductDetail(item)}>
                                                                                {item.product_name}
                                                                            </button>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm capitalize">{item.category || 'Sin categoría'}</td>
                                                                        <td className="px-4 py-3 text-sm text-right">{item.orders_count}</td>
                                                                        <td className="px-4 py-3 text-sm text-right font-semibold">{item.units_sold}</td>
                                                                        <td className="px-4 py-3 text-sm text-right">{formatMoney(item.net_revenue)}</td>
                                                                        <td className="px-4 py-3 text-sm text-right">{formatMoney(item.cost)}</td>
                                                                        <td className={`px-4 py-3 text-sm text-right font-semibold ${item.profit >= 0 ? 'text-success' : 'text-red'}`}>{formatMoney(item.profit)}</td>
                                                                        <td className="px-4 py-3 text-sm text-right">{item.margin.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</td>
                                                                    </tr>
                                                                ))}
                                                                {salesRankingRows.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={9} className="px-4 py-6 text-center text-secondary text-sm">
                                                                            No hay datos de ventas para construir el reporte.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {adminReportSection === 'balance' && (
                                            <>
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                                    <div>
                                                        <div className="text-gray-400 text-sm">Balance general consolidado para decisiones operativas y financieras.</div>
                                                        <div className="heading3 mt-1">{formatMoney(reportBalanceNet)}</div>
                                                        <div className="text-secondary text-xs mt-0.5">Ventas netas acumuladas, sin IVA ni envío</div>
                                                    </div>
                                                    <div className="text-xs text-secondary sm:text-right">{reportOrdersCount.toLocaleString('es-EC')} pedidos realizados • promedio {formatMoney(reportAverageOrderNet)}</div>
                                                </div>

                                                <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line">
                                                        <div className="px-3 py-2">
                                                            <div className="text-[10px] uppercase text-secondary font-bold mb-1">Ventas e impuestos</div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Total</span><strong>{formatMoney(reportBalanceGross)}</strong></div>
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Neta</span><strong>{formatMoney(reportBalanceNet)}</strong></div>
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">IVA</span><strong className="text-orange-600">{formatMoney(reportBalanceVat)}</strong></div>
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Envío</span><strong>{formatMoney(reportBalanceShipping)}</strong></div>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-2">
                                                            <div className="text-[10px] uppercase text-secondary font-bold mb-1">Utilidad en dólares</div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Bruta</span><strong className={reportBalanceGrossProfit >= 0 ? 'text-success' : 'text-red'}>{formatMoney(reportBalanceGrossProfit)}</strong></div>
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Neta</span><strong className={reportBalanceNetProfit >= 0 ? 'text-success' : 'text-red'}>{formatMoney(reportBalanceNetProfit)}</strong></div>
                                                                <div className="col-span-2 text-[11px] text-secondary">Costo -{formatMoney(reportBalanceCost)} • gastos -{formatMoney(reportBalanceOperatingExpenses)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-2">
                                                            <div className="text-[10px] uppercase text-secondary font-bold mb-1">Márgenes</div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Bruto</span><strong>{reportBalanceGrossMargin.toFixed(1)}%</strong></div>
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Neto</span><strong className={reportBalanceNetProfit >= 0 ? 'text-black' : 'text-red'}>{reportBalanceNetMargin.toFixed(1)}%</strong></div>
                                                                <div className="col-span-2 text-[11px] text-secondary">Sobre ventas netas.</div>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-2">
                                                            <div className="text-[10px] uppercase text-secondary font-bold mb-1">ROI</div>
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Bruto</span><strong>{reportBalanceRoi.toFixed(1)}%</strong></div>
                                                                <div className="flex justify-between gap-2"><span className="text-secondary">Neto</span><strong>{Number(profitStats?.net_roi ?? 0).toFixed(1)}%</strong></div>
                                                                <div className="col-span-2 text-[11px] text-secondary">Neto incluye gastos.</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-4">
                                                    <div className="p-4 rounded-lg border border-line bg-white shadow-sm">
                                                        <div className="font-bold mb-3">Lectura del balance</div>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                <span>Venta bruta facturada</span>
                                                                <strong>{formatMoney(reportBalanceGross)}</strong>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                <span>Menos IVA comprometido</span>
                                                                <strong className="text-orange-600">-{formatMoney(reportBalanceVat)}</strong>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                <span>Base neta del negocio</span>
                                                                <strong>{formatMoney(reportBalanceNet)}</strong>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                <span>Menos costo histórico vendido</span>
                                                                <strong className="text-orange-600">-{formatMoney(reportBalanceCost)}</strong>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black text-white">
                                                                <span>Resultado bruto</span>
                                                                <strong>{formatMoney(reportBalanceGrossProfit)}</strong>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line">
                                                                <span>Menos gastos operativos registrados</span>
                                                                <strong className="text-orange-600">-{formatMoney(reportBalanceOperatingExpenses)}</strong>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black text-white">
                                                                <span>Resultado neto</span>
                                                                <strong>{formatMoney(reportBalanceNetProfit)}</strong>
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
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="heading6 mb-4 mt-10">Movimientos recientes (neto, IVA, envío)</div>
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
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 mb-6">
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Valor costo</div>
                                                        <div className="text-2xl font-bold">{formatMoney(Number(inventoryValue?.cost_value ?? 0))}</div>
                                                        <div className="text-xs text-secondary mt-1">Capital comprometido</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Potencial PVP</div>
                                                        <div className="text-2xl font-bold">{formatMoney(Number(inventoryValue?.market_value ?? 0))}</div>
                                                        <div className="text-xs text-secondary mt-1">Stock valorizado a PVP</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Unidades en stock</div>
                                                        <div className="text-2xl font-bold">{Number(inventoryValue?.total_items ?? 0).toLocaleString('es-EC')}</div>
                                                        <div className="text-xs text-secondary mt-1">{Number(inventoryValue?.skus_with_stock ?? 0).toLocaleString('es-EC')} productos con stock</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Sin stock</div>
                                                        <div className="text-2xl font-bold text-red">{Number(inventoryHealth?.out_of_stock ?? 0)}</div>
                                                        <div className="text-xs text-secondary mt-1">Reposición urgente</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Bajo stock</div>
                                                        <div className="text-2xl font-bold text-amber-700">{Number(inventoryHealth?.low_stock ?? 0)}</div>
                                                        <div className="text-xs text-secondary mt-1">Atención preventiva</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Riesgo sanitario</div>
                                                        <div className="text-2xl font-bold text-red">{Number(inventoryHealth?.expired_products ?? 0) + Number(inventoryHealth?.expiring_products ?? 0)}</div>
                                                        <div className="text-xs text-secondary mt-1">Vencidos + por vencer</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                                                    <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <div className="heading6">Productos de mayor inversión</div>
                                                                <p className="text-secondary text-xs mt-1">Stock que concentra más capital en bodega.</p>
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
                                                                        <div className="text-xs text-secondary uppercase">Valor</div>
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
                                                        <div className="heading6 mb-4">Riesgos de stock</div>
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
                                                                <div className="text-sm text-secondary">No hay productos en riesgo inmediato de desabastecimiento.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                    <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
                                                        <div className="heading6 mb-4">Próximos a vencer</div>
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
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Pedidos trazados</div>
                                                        <div className="text-2xl font-bold">{traceabilityOrders.length.toLocaleString('es-EC')}</div>
                                                        <div className="text-xs text-secondary mt-1">Pedidos que explican la venta</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Productos con venta</div>
                                                        <div className="text-2xl font-bold">{traceabilityProducts.length.toLocaleString('es-EC')}</div>
                                                        <div className="text-xs text-secondary mt-1">Ítems ligados a ingresos netos</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-line bg-white">
                                                        <div className="text-[10px] uppercase font-bold text-secondary mb-1">Categorías auditadas</div>
                                                        <div className="text-2xl font-bold">{traceabilityCategories.length.toLocaleString('es-EC')}</div>
                                                        <div className="text-xs text-secondary mt-1">Agrupaciones que soportan el resultado</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                                    <div className="bg-white border border-line rounded-2xl p-5">
                                                        <div className="flex items-center justify-between gap-3 mb-4">
                                                            <div className="heading6">Pedidos fuente</div>
                                                            <button
                                                                type="button"
                                                                className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface"
                                                                onClick={() => navigateToPanelTab('admin-orders')}
                                                            >
                                                                Ver todos
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            {traceabilityOrders.slice(0, 8).map((order) => (
                                                                <button
                                                                    key={order.id}
                                                                    type="button"
                                                                    className="text-left p-3 rounded-lg border border-line hover:bg-surface transition-colors"
                                                                    onClick={() => handleViewOrder(order.id)}
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="font-bold text-sm">#{order.id}</span>
                                                                        <span className="text-xs text-secondary">{formatDateEcuador(order.created_at)}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-4 gap-2 mt-2 text-[11px]">
                                                                        <div>
                                                                            <div className="text-secondary uppercase">Neto</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(order.net)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-secondary uppercase">IVA</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(order.vat)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-secondary uppercase">Envío</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(order.shipping)}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-secondary uppercase">Total</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(order.gross)}</div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                            {traceabilityOrders.length === 0 && (
                                                                <div className="text-sm text-secondary">Sin pedidos para trazabilidad.</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="bg-white border border-line rounded-2xl p-5">
                                                        <div className="heading6 mb-4">Productos explicativos</div>
                                                        <div className="flex flex-col gap-3">
                                                            {traceabilityProducts.slice(0, 8).map((product, idx) => {
                                                                const refs = Array.isArray(product.order_refs)
                                                                    ? product.order_refs
                                                                    : String(product.order_refs || '').split(',').map((value) => value.trim()).filter(Boolean)
                                                                return (
                                                                    <div key={`${product.product_id || product.product_name}-${idx}`} className="p-3 rounded-lg border border-line">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="font-semibold text-sm">{product.product_name}</div>
                                                                            <div className="font-bold tabular-nums">{formatMoney(product.net_revenue)}</div>
                                                                        </div>
                                                                        <div className="text-xs text-secondary mt-1">
                                                                            Categoría: <span className="font-semibold capitalize">{product.category || 'Sin categoría'}</span> | Unidades: <span className="font-semibold">{Number(product.units_sold || 0)}</span>
                                                                        </div>
                                                                        <div className="text-xs text-secondary mt-1 break-words">
                                                                            Pedidos: {refs.length > 0 ? refs.join(', ') : 'Sin referencia'}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                            {traceabilityProducts.length === 0 && (
                                                                <div className="text-sm text-secondary">Sin productos vendidos para trazabilidad.</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="bg-white border border-line rounded-2xl p-5">
                                                        <div className="heading6 mb-4">Categorías auditadas</div>
                                                        <div className="flex flex-col gap-3">
                                                            {traceabilityCategories.slice(0, 8).map((category, idx) => {
                                                                const refs = Array.isArray(category.order_refs)
                                                                    ? category.order_refs
                                                                    : String(category.order_refs || '').split(',').map((value) => value.trim()).filter(Boolean)
                                                                return (
                                                                    <div key={`${category.category}-${idx}`} className="p-3 rounded-lg border border-line bg-surface">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="font-semibold text-sm capitalize">{category.category || 'Sin categoría'}</div>
                                                                            <div className="font-bold">{formatMoney(category.net_revenue)}</div>
                                                                        </div>
                                                                        <div className="text-xs text-secondary mt-1 break-words">
                                                                            Pedidos asociados: {refs.length > 0 ? refs.join(', ') : 'Sin referencia'}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                            {traceabilityCategories.length === 0 && (
                                                                <div className="text-sm text-secondary">Sin categorías para la trazabilidad.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    )}
                                    {activeTab === 'sales-ranking' && (
                                    <div className="tab text-content w-full">
                                        <div className="flex items-center justify-between pb-6">
                                            <div>
                                                <div className="heading5">Ranking de productos vendidos</div>
                                                <p className="text-secondary text-xs mt-1">
                                                    Ranking completo del producto más vendido al menos vendido.
                                                </p>
                                            </div>
                                            <div className="text-sm font-bold text-secondary bg-surface px-4 py-2 rounded-lg border border-line">
                                                {currentDateLabel}
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm mb-8">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                                                <div>
                                                    <div className="heading6">Resumen y orden de ventas</div>
                                                    <p className="text-secondary text-xs mt-1">
                                                        Vista activa: {salesRankingView === 'month' ? `mes (${selectedRankingMonthLabel})` : 'histórico total'}.
                                                    </p>
                                                    <p className="text-secondary text-xs mt-1">
                                                        Haz clic en el nombre del producto para ver su detalle (mes e histórico).
                                                    </p>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                                    <label className="flex flex-col gap-1 text-[10px] uppercase font-bold text-secondary">
                                                        Mes a consultar
                                                        <input
                                                            type="month"
                                                            value={salesRankingMonth}
                                                            onChange={(event) => {
                                                                const nextMonth = event.target.value
                                                                setSalesRankingMonth(nextMonth || getCurrentMonthKey())
                                                                setSalesRankingView('month')
                                                            }}
                                                            className="px-3 py-1.5 text-sm font-semibold rounded-md border border-line bg-white text-black focus:border-black outline-none"
                                                        />
                                                    </label>
                                                    <div className="flex bg-surface p-1 rounded-lg border border-line w-fit">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSalesRankingView('month')}
                                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'month' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                        >
                                                            Mes
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSalesRankingView('historical')}
                                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${salesRankingView === 'historical' ? 'bg-black text-white shadow-md' : 'text-secondary hover:text-black'}`}
                                                        >
                                                            Histórico total
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Periodo activo</div>
                                                    <div className="text-sm font-semibold">
                                                        {salesRankingView === 'month'
                                                            ? `${productSalesRanking?.period?.start || '-'} → ${productSalesRanking?.period?.end || '-'}`
                                                            : `${productSalesRanking?.historicalPeriod?.start || '-'} → ${productSalesRanking?.historicalPeriod?.end || '-'}`
                                                        }
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Pedidos</div>
                                                    <div className="text-lg font-bold">{Number(salesRankingFinancial?.orders_count ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Unidades</div>
                                                    <div className="text-lg font-bold">{Number(salesRankingTotals?.units_sold ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Venta bruta</div>
                                                    <div className="text-lg font-bold">{formatMoney(salesRankingFinancial?.gross ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Venta neta</div>
                                                    <div className="text-lg font-bold">{formatMoney(salesRankingFinancial?.net ?? salesRankingTotals?.net_revenue ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">IVA</div>
                                                    <div className="text-lg font-bold">{formatMoney(salesRankingFinancial?.vat ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Envío</div>
                                                    <div className="text-lg font-bold">{formatMoney(salesRankingFinancial?.shipping ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Costo</div>
                                                    <div className="text-lg font-bold">{formatMoney(salesRankingFinancial?.cost ?? 0)}</div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Utilidad</div>
                                                    <div className={`text-lg font-bold ${(Number(salesRankingFinancial?.profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
                                                        {formatMoney(salesRankingFinancial?.profit ?? 0)}
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-lg border border-line bg-surface">
                                                    <div className="text-[10px] uppercase font-bold text-secondary">Margen</div>
                                                    <div className="text-lg font-bold">{Number(salesRankingFinancial?.margin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</div>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto border border-line rounded-xl">
                                                <table className="w-full min-w-[980px] text-left">
                                                    <thead className="bg-surface text-[10px] uppercase font-bold text-secondary border-b border-line">
                                                        <tr>
                                                            <th className="px-4 py-3 text-right">#</th>
                                                            <th className="px-4 py-3">Producto</th>
                                                            <th className="px-4 py-3">Categoría</th>
                                                            <th className="px-4 py-3 text-right">Pedidos ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Vendidos ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Venta bruta ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Venta neta ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">IVA ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Envío ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Costo ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Utilidad ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                            <th className="px-4 py-3 text-right">Margen ({salesRankingView === 'month' ? 'Mes' : 'Histórico'})</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-line">
                                                        {salesRankingRows.map((item, index) => (
                                                            <tr key={`${item.product_id}-${index}`} className="hover:bg-surface/40">
                                                                <td className="px-4 py-3 text-right font-semibold text-sm">{index + 1}</td>
                                                                <td className="px-4 py-3 text-sm font-semibold">
                                                                    <button
                                                                        type="button"
                                                                        className="text-left hover:underline"
                                                                        onClick={() => openSalesProductDetail(item)}
                                                                    >
                                                                        {item.product_name}
                                                                    </button>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm capitalize">{item.category || 'Sin categoría'}</td>
                                                                <td className="px-4 py-3 text-sm text-right">{item.orders_count}</td>
                                                                <td className="px-4 py-3 text-sm text-right font-semibold">{item.units_sold}</td>
                                                                <td className="px-4 py-3 text-sm text-right">{formatMoney(item.gross_revenue)}</td>
                                                                <td className="px-4 py-3 text-sm text-right">{formatMoney(item.net_revenue)}</td>
                                                                <td className="px-4 py-3 text-sm text-right">{formatMoney(item.vat_amount)}</td>
                                                                <td className="px-4 py-3 text-sm text-right">{formatMoney(item.shipping_amount)}</td>
                                                                <td className="px-4 py-3 text-sm text-right">{formatMoney(item.cost)}</td>
                                                                <td className={`px-4 py-3 text-sm text-right font-semibold ${(Number(item.profit ?? 0) >= 0) ? 'text-success' : 'text-red'}`}>
                                                                    {formatMoney(item.profit)}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-right">
                                                                    {Number(item.margin ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {salesRankingRows.length === 0 && (
                                                            <tr>
                                                                <td colSpan={12} className="px-4 py-6 text-center text-secondary text-sm">
                                                                    No hay datos de ventas para construir el ranking.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
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
                                            setPosMovementDescription={setPosMovementDescription}
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
                                        formatMoney={formatMoney}
                                        formatIsoDate={formatIsoDate}
                                        formatDateEcuador={formatDateEcuador}
                                        formatDateTimeEcuador={formatDateTimeEcuador}
                                    />
                                    )}

                                    {activeTab === 'products' && (
                                    <ProductsManagementPanel
                                        products={filteredAdminProductsList}
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
                                                showNotification('Catalogos operativos actualizados.')
                                            } catch (error) {
                                                console.error(error)
                                                showNotification('No se pudieron guardar los catalogos.', 'error')
                                            } finally {
                                                setProductReferenceDataSaving(false)
                                            }
                                        }}
                                    />
                                    )}

                                    {activeTab === 'taxes' && (
                                    <div className="tab text-content w-full">
                                        <div className="heading5 pb-4">Impuestos y cargos</div>
                                        <p className="text-secondary mb-6">Configura IVA y ajustes de envío que impactan el precio final.</p>
                                        <div className="mb-8 p-6 rounded-xl border border-line bg-surface">
                                            <div className="flex flex-col md:flex-row md:items-end gap-4">
                                                <div className="flex-1 group">
                                                    <label
                                                        htmlFor="vatRate"
                                                        className="text-secondary text-xs uppercase font-bold mb-2 block"
                                                        title="Incrementa el precio final del cliente. El IVA no cuenta como utilidad."
                                                    >
                                                        IVA (%)
                                                    </label>
                                                    <input
                                                        id="vatRate"
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        className="border border-line px-4 py-2 rounded-lg w-full"
                                                        value={vatRate}
                                                        onChange={(e) => setVatRate(Number(e.target.value))}
                                                        disabled={vatLoading || vatSaving}
                                                    />
                                                    <p className="text-secondary text-xs mt-2">Los precios del catálogo se muestran con IVA incluido.</p>
                                                    <p className="text-[11px] text-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Subir el IVA aumenta el total pagado por el cliente, pero no cambia la utilidad del producto.
                                                    </p>
                                                </div>
                                                <button
                                                    className="button-main py-2 px-6"
                                                    onClick={handleSaveVat}
                                                    disabled={vatLoading || vatSaving}
                                                >
                                                    {vatSaving ? 'Guardando...' : 'Guardar IVA'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mb-8 p-6 rounded-xl border border-line bg-surface">
                                            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="group">
                                                        <label
                                                            htmlFor="shippingDelivery"
                                                            className="text-secondary text-xs uppercase font-bold mb-2 block"
                                                            title="Se suma al total del pedido cuando el cliente elige envío a domicilio."
                                                        >
                                                            Envío a domicilio ($)
                                                        </label>
                                                        <input
                                                            id="shippingDelivery"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="border border-line px-4 py-2 rounded-lg w-full"
                                                            value={shippingRates.delivery}
                                                            onChange={(e) => setShippingRates({ ...shippingRates, delivery: Number(e.target.value) })}
                                                            disabled={shippingLoading || shippingSaving}
                                                        />
                                                        <p className="text-[11px] text-secondary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Aumentar este valor incrementa el costo final del pedido para envíos a domicilio.
                                                        </p>
                                                    </div>
                                                    <div className="group">
                                                        <label
                                                            htmlFor="shippingPickup"
                                                            className="text-secondary text-xs uppercase font-bold mb-2 block"
                                                            title="Costo aplicado cuando el cliente recoge en tienda."
                                                        >
                                                            Retiro en tienda ($)
                                                        </label>
                                                        <input
                                                            id="shippingPickup"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="border border-line px-4 py-2 rounded-lg w-full"
                                                            value={shippingRates.pickup}
                                                            onChange={(e) => setShippingRates({ ...shippingRates, pickup: Number(e.target.value) })}
                                                            disabled={shippingLoading || shippingSaving}
                                                        />
                                                        <p className="text-[11px] text-secondary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Define el cargo por retiro en tienda; 0 significa retiro gratuito.
                                                        </p>
                                                    </div>
                                                    <div className="md:col-span-2 group">
                                                        <label
                                                            htmlFor="shippingTaxRate"
                                                            className="text-secondary text-xs uppercase font-bold mb-2 block"
                                                            title="Porcentaje de IVA que se suma al costo de envío."
                                                        >
                                                            IVA aplicado al envío (%)
                                                        </label>
                                                        <input
                                                            id="shippingTaxRate"
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            className="border border-line px-4 py-2 rounded-lg w-full"
                                                            value={shippingRates.taxRate}
                                                            onChange={(e) => setShippingRates({ ...shippingRates, taxRate: Number(e.target.value) })}
                                                            disabled={shippingLoading || shippingSaving}
                                                        />
                                                        <p className="text-secondary text-xs mt-2">Se suma al envío para cubrir impuestos. Ej: 15% incrementa el costo final.</p>
                                                        <p className="text-[11px] text-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            A mayor IVA de envío, mayor total del pedido cuando hay costos logísticos.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    className="button-main py-2 px-6"
                                                    onClick={handleSaveShipping}
                                                    disabled={shippingLoading || shippingSaving}
                                                >
                                                    {shippingSaving ? 'Guardando...' : 'Guardar Envío'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
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

                                        <div className="mb-6 rounded-xl border border-line bg-white p-5">
                                            <div className="text-xs uppercase font-bold text-secondary mb-3">Resumen de costos e impuestos</div>
                                            {(() => {
                                                const summary = dashboardStats?.businessMetrics?.salesSummary
                                                const profit = dashboardStats?.businessMetrics?.profitStats
                                                const gross = Number(summary?.gross ?? 0)
                                                const net = Number(summary?.net ?? 0)
                                                const vat = Number(summary?.vat ?? 0)
                                                const shipping = Number(summary?.shipping ?? 0)
                                                const cost = Number(profit?.cost ?? 0)
                                                const utilidad = Number(profit?.profit ?? 0)
                                                const format = (val: number) => val.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                return (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Venta total</div>
                                                            <div className="font-semibold">${format(gross)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Venta neta</div>
                                                            <div className="font-semibold">${format(net)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">IVA cobrado</div>
                                                            <div className="font-semibold">${format(vat)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Envío cobrado</div>
                                                            <div className="font-semibold">${format(shipping)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Costo (COGS)</div>
                                                            <div className="font-semibold text-orange-600">-${format(cost)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-secondary">Utilidad</div>
                                                            <div className="font-semibold text-success">${format(utilidad)}</div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                            <div className="text-[11px] text-secondary mt-3">Los montos se calculan sin IVA y el envío se muestra por separado.</div>
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
                                                <input className="border-line px-4 py-2 rounded-lg flex-1" placeholder="Buscar producto..." />
                                                <button className="button-main py-2 px-6">Buscar</button>
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
                                                        {adminProductsList.length > 0 ? adminProductsList.map((product: any) => {
                                                            const price = Number(product.price) || 0
                                                            const basePrice = getProductBasePrice(product)
                                                            const vatPart = getProductVatPart(product)
                                                            const cost = parseMoney(product.business?.cost ?? product.cost)
                                                            const utilidad = Math.max(basePrice - cost, 0)
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
                                                                    <td className="py-4 font-bold text-sm text-success">${format(utilidad)}</td>
                                                                    <td className="py-4">
                                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${((product.business?.margin || 0) < 20) ? 'bg-red text-white' :
                                                                            ((product.business?.margin || 0) < 35) ? 'bg-yellow text-white' : 'bg-success text-white'
                                                                            }`}>
                                                                            {product.business?.margin || 0}%
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        }) : (
                                                            <tr><td colSpan={7} className="py-8 text-center text-secondary">Cargando análisis de precios...</td></tr>
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
                                    <ShipmentsPanel
                                        shippingProviders={shippingProviders}
                                        shippingPickups={shippingPickups}
                                        pickupReadyOrders={pickupReadyOrders}
                                        shippingRates={shippingRates}
                                        onConfigureTaxes={() => navigateToPanelTab('taxes')}
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
                                    )}

                                    {activeTab === 'billing-rides' && (
                                    <div className="tab text-content w-full">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
                                            <div>
                                                <div className="heading4">Facturas PDF enviadas</div>
                                                <p className="text-secondary text-sm mt-1">RIDE generados por Facturador en <span className="font-semibold text-black">storage/pdf/rides</span>.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="px-4 py-2 rounded-lg border border-line bg-white text-sm font-semibold hover:bg-surface disabled:opacity-60"
                                                onClick={loadBillingRidePdfs}
                                                disabled={billingRideLoading}
                                            >
                                                {billingRideLoading ? 'Actualizando...' : 'Actualizar'}
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto rounded-lg border border-line bg-white">
                                            <table className="w-full min-w-[980px] text-sm">
                                                <thead className="bg-surface text-[11px] uppercase text-secondary">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Factura</th>
                                                        <th className="px-3 py-2 text-left">Cliente</th>
                                                        <th className="px-3 py-2 text-left">Correo</th>
                                                        <th className="px-3 py-2 text-right">Total</th>
                                                        <th className="px-3 py-2 text-left">Fecha</th>
                                                        <th className="px-3 py-2 text-left">SRI</th>
                                                        <th className="px-3 py-2 text-left">PDF</th>
                                                        <th className="px-3 py-2 text-right">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-line">
                                                    {billingRidePdfs.map((ride) => {
                                                        const sequential = [ride.establishment_code, ride.emission_point, ride.sequential].filter(Boolean).join('-') || ride.source_reference || ride.access_key
                                                        return (
                                                            <tr key={ride.access_key} className="hover:bg-surface/50">
                                                                <td className="px-3 py-2">
                                                                    <div className="font-semibold">{sequential}</div>
                                                                    <div className="text-[11px] text-secondary break-all">{ride.access_key}</div>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <div className="font-semibold">{ride.customer_name || '-'}</div>
                                                                    <div className="text-[11px] text-secondary">{ride.customer_identification || '-'}</div>
                                                                </td>
                                                                <td className="px-3 py-2 text-secondary">{ride.customer_email || 'Sin correo'}</td>
                                                                <td className="px-3 py-2 text-right font-semibold">{formatMoney(ride.total ?? 0)}</td>
                                                                <td className="px-3 py-2">
                                                                    <div>{ride.issue_date ? formatDateEcuador(ride.issue_date) : '-'}</div>
                                                                    <div className="text-[11px] text-secondary">{ride.pdf_modified_at ? `PDF ${formatDateTimeEcuador(ride.pdf_modified_at)}` : 'Sin archivo generado'}</div>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className="inline-flex rounded-full bg-surface px-2 py-1 text-[11px] font-bold text-secondary">{ride.sri_status || '-'}</span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${ride.pdf_exists ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                        {ride.pdf_exists ? 'Disponible' : 'No generado'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-surface disabled:opacity-50"
                                                                        onClick={() => openBillingRidePdf(ride.access_key)}
                                                                        disabled={!ride.pdf_exists}
                                                                    >
                                                                        Abrir PDF
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                    {!billingRideLoading && billingRidePdfs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={8} className="px-3 py-8 text-center text-secondary">
                                                                No hay RIDE PDF generados todavía.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {billingRideLoading && (
                                                        <tr>
                                                            <td colSpan={8} className="px-3 py-8 text-center text-secondary">
                                                                Cargando facturas PDF...
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
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
                                    <div className="tab_address text-content w-full p-7 border border-line rounded-xl">
                                        <div className="heading5 pb-4">Direcciones guardadas</div>
                                        <form onSubmit={handleSaveAddresses}>
                                            <div className="flex items-center justify-between mb-8 border-b border-line pb-4">
                                                <div className="flex gap-4">
                                                    {savedAddresses.map((addr, index) => (
                                                        <button
                                                            key={addr.id}
                                                            type="button"
                                                            onClick={() => setCurrentAddrIndex(index)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentAddrIndex === index ? 'bg-black text-white' : 'bg-surface border border-line text-secondary hover:bg-line'}`}
                                                        >
                                                            {addr.title}
                                                        </button>
                                                    ))}
                                                    {(savedAddresses.length < 3) && (
                                                        <button
                                                            type="button"
                                                            onClick={addNewAddress}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-success/10 text-success border border-success/20 hover:bg-success/20"
                                                        >
                                                            <Icon.Plus size={16} /> Agregar
                                                        </button>
                                                    )}
                                                </div>
                                                {savedAddresses.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAddress(currentAddrIndex)}
                                                        className="text-red hover:underline text-sm font-bold flex items-center gap-1"
                                                    >
                                                        <Icon.Trash size={16} /> Eliminar actual
                                                    </button>
                                                )}
                                            </div>

                                            <button
                                                type='button'
                                                className={`tab_btn flex items-center justify-between w-full pb-1.5 border-b border-line ${activeAddress === 'shipping' ? 'active' : ''}`}
                                                onClick={() => handleActiveAddress('shipping')}
                                            >
                                                <strong className="heading6">Dirección de envío</strong>
                                                <Icon.CaretDown className='text-2xl ic_down duration-300' />
                                            </button>
                                            <div className={`form_address ${activeAddress === 'shipping' ? 'block' : 'hidden'}`}>
                                                <div className='grid sm:grid-cols-2 gap-4 gap-y-5 mt-5'>
                                                    <div className="first-name">
                                                        <label htmlFor="shippingFirstName" className='caption1 capitalize'>Nombre <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingFirstName" type="text" value={currentAddress.shipping.firstName} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="last-name">
                                                        <label htmlFor="shippingLastName" className='caption1 capitalize'>Apellido <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingLastName" type="text" value={currentAddress.shipping.lastName} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="company">
                                                        <label htmlFor="shippingCompany" className='caption1 capitalize'>Nombre de la empresa (opcional)</label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingCompany" type="text" value={currentAddress.shipping.company} onChange={handleShippingChange} />
                                                    </div>
                                                    <div className="country">
                                                        <label htmlFor="shippingCountry" className='caption1 capitalize'>País / Región <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingCountry" type="text" value={currentAddress.shipping.country} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="street">
                                                        <label htmlFor="shippingStreet" className='caption1 capitalize'>Dirección <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingStreet" type="text" value={currentAddress.shipping.street} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="city">
                                                        <label htmlFor="shippingCity" className='caption1 capitalize'>Ciudad <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingCity" type="text" value={currentAddress.shipping.city} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="state">
                                                        <label htmlFor="shippingState" className='caption1 capitalize'>Estado / Provincia <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingState" type="text" value={currentAddress.shipping.state} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="zip">
                                                        <label htmlFor="shippingZip" className='caption1 capitalize'>Código Postal <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingZip" type="text" value={currentAddress.shipping.zip} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="phone">
                                                        <label htmlFor="shippingPhone" className='caption1 capitalize'>Teléfono <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingPhone" type="text" value={currentAddress.shipping.phone} onChange={handleShippingChange} required />
                                                    </div>
                                                    <div className="email">
                                                        <label htmlFor="shippingEmail" className='caption1 capitalize'>Correo electrónico <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="shippingEmail" type="email" value={currentAddress.shipping.email} onChange={handleShippingChange} required />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type='button'
                                                className={`tab_btn flex items-center justify-between w-full mt-8 pb-1.5 border-b border-line ${activeAddress === 'billing' ? 'active' : ''}`}
                                                onClick={() => handleActiveAddress('billing')}
                                            >
                                                <strong className="heading6">Dirección de facturación</strong>
                                                <Icon.CaretDown className='text-2xl ic_down duration-300' />
                                            </button>
                                            <div className={`form_address ${activeAddress === 'billing' ? 'block' : 'hidden'}`}>
                                                <div className={`flex items-center gap-3 mt-4 px-4 py-3 bg-surface rounded-lg border border-line ${currentAddress.isSame ? 'bg-success/5 border-success/30' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        id="sameAsShippingBilling"
                                                        checked={currentAddress.isSame}
                                                        onChange={toggleSameAsShipping}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                    <label htmlFor="sameAsShippingBilling" className="caption1 cursor-pointer font-bold text-secondary">Usar la misma dirección de envío también para facturación</label>
                                                </div>
                                                {currentAddress.isSame && (
                                                    <div className="mt-4 px-4 py-3 rounded-lg border border-success/25 bg-success/5 text-sm text-secondary">
                                                        La facturación usará exactamente los mismos datos de la dirección de envío actual.
                                                    </div>
                                                )}
                                                <div className={`grid sm:grid-cols-2 gap-4 gap-y-5 mt-5 ${currentAddress.isSame ? 'opacity-60' : ''}`}>
                                                    <div className="first-name">
                                                        <label htmlFor="billingFirstName" className='caption1 capitalize'>Nombre <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingFirstName" type="text" value={currentAddress.billing.firstName} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="last-name">
                                                        <label htmlFor="billingLastName" className='caption1 capitalize'>Apellido <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingLastName" type="text" value={currentAddress.billing.lastName} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="company">
                                                        <label htmlFor="billingCompany" className='caption1 capitalize'>Nombre de la empresa (opcional)</label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingCompany" type="text" value={currentAddress.billing.company} onChange={handleBillingChange} disabled={currentAddress.isSame} />
                                                    </div>
                                                    <div className="country">
                                                        <label htmlFor="billingCountry" className='caption1 capitalize'>País / Región <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingCountry" type="text" value={currentAddress.billing.country} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="street">
                                                        <label htmlFor="billingStreet" className='caption1 capitalize'>Dirección <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingStreet" type="text" value={currentAddress.billing.street} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="city">
                                                        <label htmlFor="billingCity" className='caption1 capitalize'>Ciudad <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingCity" type="text" value={currentAddress.billing.city} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="state">
                                                        <label htmlFor="billingState" className='caption1 capitalize'>Estado / Provincia <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingState" type="text" value={currentAddress.billing.state} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="zip">
                                                        <label htmlFor="billingZip" className='caption1 capitalize'>Código Postal <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingZip" type="text" value={currentAddress.billing.zip} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="phone">
                                                        <label htmlFor="billingPhone" className='caption1 capitalize'>Teléfono <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingPhone" type="text" value={currentAddress.billing.phone} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                    <div className="email">
                                                        <label htmlFor="billingEmail" className='caption1 capitalize'>Correo electrónico <span className='text-red'>*</span></label>
                                                        <input className="border-line mt-2 px-4 py-3 w-full rounded-lg disabled:bg-surface disabled:text-secondary" id="billingEmail" type="email" value={currentAddress.billing.email} onChange={handleBillingChange} disabled={currentAddress.isSame} required={!currentAddress.isSame} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="block-button md:mt-10 mt-6 flex justify-end">
                                                <button className="button-main py-3 px-10 rounded-full font-bold bg-black text-white hover:bg-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed" disabled={addressSaving || addressLoading}>
                                                    {addressSaving ? 'Guardando...' : 'Guardar Direcciones'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                    )}
                                    {activeTab === 'setting' && (
                                    <div className="tab text-content w-full p-7 border border-line rounded-xl">
                                        <div className="heading5 pb-4">Configuraciones de la cuenta</div>
                                        <form className='form-password' onSubmit={handleSaveSettings}>
                                            <div className="heading5 pb-4">Información Personal</div>
                                            <div className="upload_image col-span-full">
                                                <label htmlFor="uploadImage">Subir Avatar: <span className="text-red">*</span></label>
                                                <div className="flex flex-wrap items-center gap-5 mt-3">
                                                    <div className="bg_img flex-shrink-0 relative w-[7.5rem] h-[7.5rem] rounded-lg overflow-hidden bg-surface">
                                                        <span className="ph ph-image text-5xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-secondary"></span>
                                                        <Image
                                                            src={'/images/avatar/1.png'}
                                                            width={300}
                                                            height={300}
                                                            alt='Foto de perfil'
                                                            className="upload_img relative z-[1] w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <strong className="text-button">Subir Archivo:</strong>
                                                        <p className="caption1 text-secondary mt-1">JPG 120x120px</p>
                                                        <div className="upload_file flex items-center gap-3 w-[220px] mt-3 px-3 py-2 border border-line rounded">
                                                            <label htmlFor="uploadImage" className="caption2 py-1 px-3 rounded bg-line whitespace-nowrap cursor-pointer">Elegir Archivo</label>
                                                            <input type="file" name="uploadImage" id="uploadImage" accept="image/*" className="caption2 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className='grid sm:grid-cols-2 gap-4 gap-y-5 mt-5'>
                                                <div className="first-name">
                                                    <label htmlFor="firstName" className='caption1 capitalize'>Nombre <span className='text-red'>*</span></label>
                                                    <input
                                                        className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                        id="firstName"
                                                        type="text"
                                                        placeholder="Nombre"
                                                        required
                                                        value={profile.firstName}
                                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                </div>
                                                <div className="last-name">
                                                    <label htmlFor="lastName" className='caption1 capitalize'>Apellido <span className='text-red'>*</span></label>
                                                    <input
                                                        className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                        id="lastName"
                                                        type="text"
                                                        placeholder="Apellido"
                                                        required
                                                        value={profile.lastName}
                                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                </div>
                                                <div className="phone-number">
                                                    <label htmlFor="phoneNumber" className='caption1 capitalize'>Número de Teléfono <span className='text-red'>*</span></label>
                                                    <input
                                                        className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                        id="phoneNumber"
                                                        type="text"
                                                        placeholder="Número de teléfono"
                                                        required
                                                        value={profile.phone}
                                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                </div>
                                                <div className="email">
                                                    <label htmlFor="email" className='caption1 capitalize'>Correo Electrónico <span className='text-red'>*</span></label>
                                                    <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="email" type="email" defaultValue={user.email} placeholder="Correo electrónico" required disabled />
                                                </div>
                                                <div className="document-type">
                                                    <label htmlFor="documentType" className='caption1 capitalize'>Tipo de identificación <span className='text-red'>*</span></label>
                                                    <div className="select-block mt-2">
                                                        <select
                                                            className="border border-line px-4 py-3 w-full rounded-lg"
                                                            id="documentType"
                                                            name="documentType"
                                                            value={profile.documentType || 'default'}
                                                            onChange={(e) => setProfile({ ...profile, documentType: e.target.value })}
                                                            disabled={profileLoading}
                                                            required
                                                        >
                                                            <option value="default" disabled>Seleccionar</option>
                                                            <option value="Cédula">Cédula</option>
                                                            <option value="RUC">RUC</option>
                                                            <option value="Pasaporte">Pasaporte</option>
                                                            <option value="Otro">Otro</option>
                                                        </select>
                                                        <Icon.CaretDown className='arrow-down text-lg' />
                                                    </div>
                                                </div>
                                                <div className="document-number">
                                                    <label htmlFor="documentNumber" className='caption1 capitalize'>Número de identificación <span className='text-red'>*</span></label>
                                                    <input
                                                        className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                        id="documentNumber"
                                                        type="text"
                                                        placeholder="Número de identificación"
                                                        required
                                                        value={profile.documentNumber}
                                                        onChange={(e) => setProfile({ ...profile, documentNumber: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                </div>
                                                <div className="business-name sm:col-span-2">
                                                    <label htmlFor="businessName" className='caption1 capitalize'>Razón social (opcional)</label>
                                                    <input
                                                        className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                        id="businessName"
                                                        type="text"
                                                        placeholder="Razón social"
                                                        value={profile.businessName}
                                                        onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                </div>
                                                <div className="gender">
                                                    <label htmlFor="gender" className='caption1 capitalize'>Género <span className='text-red'>*</span></label>
                                                    <div className="select-block mt-2">
                                                        <select
                                                            className="border border-line px-4 py-3 w-full rounded-lg"
                                                            id="gender"
                                                            name="gender"
                                                            value={profile.gender || 'default'}
                                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                                            disabled={profileLoading}
                                                            required
                                                        >
                                                            <option value="default" disabled>Elegir Género</option>
                                                            <option value="Male">Masculino</option>
                                                            <option value="Female">Femenino</option>
                                                            <option value="Other">Otro</option>
                                                        </select>
                                                        <Icon.CaretDown className='arrow-down text-lg' />
                                                    </div>
                                                </div>
                                                <div className="birth">
                                                    <label htmlFor="birth" className='caption1'>Fecha de Nacimiento <span className='text-red'>*</span></label>
                                                    <input
                                                        className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                        id="birth"
                                                        type="date"
                                                        placeholder="Fecha de Nacimiento"
                                                        required
                                                        value={profile.birth}
                                                        onChange={(e) => setProfile({ ...profile, birth: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                </div>
                                            </div>
                                            <div className="heading5 pb-4 lg:mt-10 mt-6">Cambiar Contraseña</div>
                                            <p className="text-secondary text-sm mb-4">Opcional. Si cambias tu contraseña, se cerrará la sesión por seguridad.</p>
                                            <div className="pass">
                                                <label htmlFor="password-setting" className='caption1'>Contraseña actual</label>
                                                <input
                                                    className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                    id="password-setting"
                                                    type="password"
                                                    placeholder="Contraseña actual"
                                                    autoComplete="current-password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                    disabled={profileSaving || profileLoading}
                                                />
                                            </div>
                                            <div className="new-pass mt-5">
                                                <label htmlFor="newPassword" className='caption1'>Nueva contraseña</label>
                                                <input
                                                    className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                    id="newPassword"
                                                    type="password"
                                                    placeholder="Mínimo 12 caracteres"
                                                    autoComplete="new-password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    disabled={profileSaving || profileLoading}
                                                />
                                            </div>
                                            <div className="confirm-pass mt-5">
                                                <label htmlFor="confirmPassword" className='caption1'>Confirmar nueva contraseña</label>
                                                <input
                                                    className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                                                    id="confirmPassword"
                                                    type="password"
                                                    placeholder="Confirmar nueva contraseña"
                                                    autoComplete="new-password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                    disabled={profileSaving || profileLoading}
                                                />
                                            </div>
                                            <div className="block-button lg:mt-10 mt-6 flex justify-end">
                                                <button className="button-main py-3 px-10 rounded-full font-bold bg-black text-white hover:bg-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed" disabled={profileSaving || profileLoading}>
                                                    {profileSaving ? 'Guardando...' : 'Guardar Cambios'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
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
                    closeProductModal={() => {
                        setIsProductModalOpen(false)
                        setProductEditorMode('create')
                    }}
                    setAdminProductsList={setAdminProductsList}
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

            {renderDeepDive()}
        </>
    );
};

export default MyAccount;
