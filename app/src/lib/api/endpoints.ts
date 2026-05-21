export const apiEndpoints = {
  products: '/api/products',
  product: (id: string) => `/api/products/${id}`,
  contact: '/api/contact',
  health: '/api/health',
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    session: '/api/auth/session',
    register: '/api/auth/register',
    requestOtp: '/api/auth/request-otp',
    verifyOtp: '/api/auth/verify-otp',
    requestPasswordReset: '/api/auth/password-reset/request',
    confirmPasswordReset: '/api/auth/password-reset/confirm',
  },
  users: '/api/users',
  user: (id: string) => `/api/users/${id}`,
  discounts: {
    list: '/api/admin/discounts',
    detail: (id: string) => `/api/admin/discounts/${id}`,
    status: (id: string) => `/api/admin/discounts/${id}/status`,
    audit: '/api/admin/discounts/audit',
  },
  orders: '/api/orders',
  settings: {
    productPage: '/api/admin/settings/product-page',
    pricingMargins: '/api/admin/settings/pricing-margins',
    pricingCalc: '/api/admin/settings/pricing-calc',
    pricingRules: '/api/admin/settings/pricing-rules',
    productReferenceData: '/api/admin/settings/product-reference-data',
    storeStatus: '/api/admin/settings/store-status',
    publicStoreStatus: '/api/settings/store-status',
    publicBrandLogos: '/api/settings/brand-logos',
    publicProductCategories: '/api/settings/product-categories',
    publicProductCategoryReferences: '/api/settings/product-category-references',
  },
  reports: {
    recentOrders: '/api/reports/recent-orders',
  },
} as const

export type ApiEndpointKey = keyof typeof apiEndpoints
