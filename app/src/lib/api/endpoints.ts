import { buildApiRoute } from '@/generated/systemCapabilities'

type QueryValue = string | number | boolean | null | undefined
type QueryInput = Record<string, QueryValue | QueryValue[]>

const appendQueryParam = (params: URLSearchParams, key: string, value: QueryValue | QueryValue[]) => {
  const values = Array.isArray(value) ? value : [value]
  for (const item of values) {
    if (item === null || item === undefined || item === '') continue
    params.append(key, String(item))
  }
}

export const withQuery = (path: string, query: QueryInput = {}) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    appendQueryParam(params, key, value)
  }

  const queryString = params.toString()
  if (!queryString) return path
  return `${path}?${queryString}`
}

export const apiEndpoints = {
  products: buildApiRoute('backend:GET:/api/products'),
  product: (id: string) => buildApiRoute('backend:GET:/api/products/{id}', { id }),
  adminProduct: (id: string, options: { procurementDetail?: boolean; scope?: 'admin' } = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/products/{id}', { id }), {
      scope: options.scope,
      procurement_detail: options.procurementDetail ? 1 : undefined,
    }),
  productMovement: (id: string, query: { period?: string } = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/products/{id}/movement', { id }), query),
  productReviews: (id: string) => buildApiRoute('backend:GET:/api/products/{id}/reviews', { id }),
  adminReviews: buildApiRoute('backend:GET:/api/admin/reviews'),
  adminReview: (id: string) => buildApiRoute('backend:PATCH:/api/admin/reviews/{id}', { id }),
  contact: buildApiRoute('backend:POST:/api/contact'),
  health: buildApiRoute('backend:GET:/api/health'),
  auth: {
    login: buildApiRoute('backend:POST:/api/auth/login'),
    logout: buildApiRoute('backend:POST:/api/auth/logout'),
    session: buildApiRoute('backend:GET:/api/auth/session'),
    register: buildApiRoute('backend:POST:/api/auth/register'),
    requestOtp: buildApiRoute('backend:POST:/api/auth/request-otp'),
    verifyOtp: buildApiRoute('backend:POST:/api/auth/verify-otp'),
    verify: buildApiRoute('backend:GET:/api/auth/verify'),
    requestPasswordReset: buildApiRoute('backend:POST:/api/auth/password-reset/request'),
    confirmPasswordReset: buildApiRoute('backend:POST:/api/auth/password-reset/confirm'),
    accessRequests: buildApiRoute('backend:POST:/api/auth/access-requests'),
  },
  users: buildApiRoute('backend:GET:/api/users'),
  user: (id: string) => buildApiRoute('backend:PUT:/api/users/{id}', { id }),
  userUnlock: (id: string) => buildApiRoute('backend:POST:/api/users/{id}/unlock', { id }),
  userProfile: buildApiRoute('backend:GET:/api/user/profile'),
  userAddresses: buildApiRoute('backend:GET:/api/user/addresses'),
  userPassword: buildApiRoute('backend:PUT:/api/user/password'),
  discounts: {
    list: buildApiRoute('backend:GET:/api/admin/discounts'),
    detail: (id: string) => buildApiRoute('backend:GET:/api/admin/discounts/{id}', { id }),
    status: (id: string) => buildApiRoute('backend:PATCH:/api/admin/discounts/{id}/status', { id }),
    audit: buildApiRoute('backend:GET:/api/admin/discounts/audit'),
  },
  orders: buildApiRoute('backend:GET:/api/orders'),
  orderCreate: buildApiRoute('backend:POST:/api/orders'),
  orderQuote: buildApiRoute('backend:POST:/api/orders/quote'),
  order: (id: string) => buildApiRoute('backend:GET:/api/orders/{id}', { id }),
  orderStatus: (id: string) => buildApiRoute('backend:PATCH:/api/orders/{id}/status', { id }),
  orderInvoice: (id: string) => buildApiRoute('backend:GET:/api/orders/{id}/invoice', { id }),
  myOrders: buildApiRoute('backend:GET:/api/orders/my-orders'),
  shipments: buildApiRoute('backend:GET:/api/shipments'),
  settings: {
    tax: buildApiRoute('backend:GET:/api/admin/settings/tax'),
    adminShipping: buildApiRoute('backend:GET:/api/admin/settings/shipping'),
    publicShipping: buildApiRoute('backend:GET:/api/settings/shipping'),
    productPage: buildApiRoute('backend:GET:/api/admin/settings/product-page'),
    pricingMargins: buildApiRoute('backend:GET:/api/admin/settings/pricing-margins'),
    pricingCalc: buildApiRoute('backend:GET:/api/admin/settings/pricing-calc'),
    pricingRules: buildApiRoute('backend:GET:/api/admin/settings/pricing-rules'),
    productReferenceData: buildApiRoute('backend:GET:/api/admin/settings/product-reference-data'),
    session: buildApiRoute('backend:GET:/api/admin/settings/session'),
    storeStatus: buildApiRoute('backend:GET:/api/admin/settings/store-status'),
    publicStoreStatus: buildApiRoute('backend:GET:/api/settings/store-status'),
    publicBrandLogos: buildApiRoute('backend:GET:/api/settings/brand-logos'),
    publicProductCategories: buildApiRoute('backend:GET:/api/settings/product-categories'),
    publicProductCategoryReferences: buildApiRoute('backend:GET:/api/settings/product-category-references'),
  },
  reports: {
    recentOrders: buildApiRoute('backend:GET:/api/reports/recent-orders'),
    admin: (query: QueryInput = {}) => withQuery(buildApiRoute('backend:GET:/api/admin/report'), query),
  },
  adminDashboardStats: (query: QueryInput = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/admin/dashboard/stats'), query),
  adminInventoryIntelligence: (query: QueryInput = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/admin/inventory/intelligence'), query),
  adminPurchaseInvoices: (query: QueryInput = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/admin/purchase-invoices'), query),
  adminPurchaseInvoice: (id: string) =>
    buildApiRoute('backend:GET:/api/admin/purchase-invoices/{id}', { id }),
  adminPos: {
    activeShift: buildApiRoute('backend:GET:/api/admin/pos/shift/active'),
    openShift: buildApiRoute('backend:POST:/api/admin/pos/shift/open'),
    closeShift: buildApiRoute('backend:POST:/api/admin/pos/shift/close'),
    movements: buildApiRoute('backend:POST:/api/admin/pos/movements'),
    customerByDocument: (query: QueryInput = {}) =>
      withQuery(buildApiRoute('backend:GET:/api/admin/pos/customer-by-document'), query),
  },
  adminQuotes: (query: QueryInput = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/admin/quotes'), query),
  adminQuoteCreate: buildApiRoute('backend:POST:/api/admin/quotes'),
  adminQuoteConvert: (id: string) =>
    buildApiRoute('backend:POST:/api/admin/quotes/{id}/convert', { id }),
  adminBillingRides: (query: QueryInput = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/admin/billing/rides'), query),
  adminBillingRidePdf: (accessKey: string) =>
    buildApiRoute('backend:GET:/api/admin/billing/rides/{accessKey}/pdf', { accessKey }),
  adminBillingRideCancelAndReissue: (accessKey: string) =>
    buildApiRoute('backend:POST:/api/admin/billing/rides/{accessKey}/cancel-and-reissue', { accessKey }),
  adminExpenses: (query: QueryInput = {}) =>
    withQuery(buildApiRoute('backend:GET:/api/admin/expenses'), query),
  adminExpenseCreate: buildApiRoute('backend:POST:/api/admin/expenses'),
  adminExpenseStatus: (id: string) =>
    buildApiRoute('backend:PATCH:/api/admin/expenses/{id}/status', { id }),
  adminExpenseRecurrences: buildApiRoute('backend:GET:/api/admin/expenses/recurrences'),
  adminExpenseRecurrenceCreate: buildApiRoute('backend:POST:/api/admin/expenses/recurrences'),
  adminExpenseRecurrence: (id: string) =>
    buildApiRoute('backend:PUT:/api/admin/expenses/recurrences/{id}', { id }),
  adminFinancialPeriods: buildApiRoute('backend:GET:/api/admin/financial-periods'),
  adminFinancialPeriodPreview: (period: string) =>
    buildApiRoute('backend:GET:/api/admin/financial-periods/{period}/preview', { period }),
  adminFinancialPeriodClose: (period: string) =>
    buildApiRoute('backend:POST:/api/admin/financial-periods/{period}/close', { period }),
  adminFinancialAdjustments: buildApiRoute('backend:POST:/api/admin/financial-adjustments'),
  adminHistoricalSales: buildApiRoute('backend:POST:/api/admin/historical-sales'),
  uploads: {
    images: '/api/uploads/images',
  },
  internal: {
    quote: '/quote',
    suggestionsData: '/suggestions-data',
    suggestionsApi: '/api/suggestions',
  },
} as const

export type ApiEndpointKey = keyof typeof apiEndpoints

export const authFreeApiPaths = new Set([
  apiEndpoints.auth.login,
  apiEndpoints.auth.register,
  apiEndpoints.auth.requestOtp,
  apiEndpoints.auth.verifyOtp,
  apiEndpoints.auth.requestPasswordReset,
  apiEndpoints.auth.confirmPasswordReset,
  apiEndpoints.auth.verify,
  apiEndpoints.auth.session,
  apiEndpoints.auth.accessRequests,
  apiEndpoints.contact,
])

const publicGetApiPrefixes = [`${apiEndpoints.products}/`]
const publicGetApiPaths = new Set([
  apiEndpoints.products,
  apiEndpoints.settings.publicShipping,
  apiEndpoints.settings.publicStoreStatus,
  apiEndpoints.settings.publicBrandLogos,
  apiEndpoints.settings.publicProductCategories,
  apiEndpoints.settings.publicProductCategoryReferences,
  apiEndpoints.health,
])

const publicMutationApiPaths = new Set([
  apiEndpoints.orderQuote,
  apiEndpoints.contact,
])

export const isPublicApiPath = (pathname: string, method = 'GET') => {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') {
    if (publicGetApiPaths.has(pathname)) return true
    return publicGetApiPrefixes.some((prefix) => pathname.startsWith(prefix))
  }

  if (normalizedMethod === 'POST') {
    return publicMutationApiPaths.has(pathname)
  }

  return false
}

export const shouldDisableApiPathCache = (pathname: string) => {
  if (pathname === apiEndpoints.products || pathname.startsWith(`${apiEndpoints.products}/`)) {
    return true
  }

  return pathname === apiEndpoints.settings.publicProductCategories
    || pathname === apiEndpoints.settings.publicProductCategoryReferences
}
