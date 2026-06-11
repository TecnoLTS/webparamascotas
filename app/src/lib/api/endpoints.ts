import { buildApiRoute } from '@/generated/systemCapabilities'

export const apiEndpoints = {
  products: buildApiRoute('backend:GET:/api/products'),
  product: (id: string) => buildApiRoute('backend:GET:/api/products/{id}', { id }),
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
    requestPasswordReset: buildApiRoute('backend:POST:/api/auth/password-reset/request'),
    confirmPasswordReset: buildApiRoute('backend:POST:/api/auth/password-reset/confirm'),
  },
  users: buildApiRoute('backend:GET:/api/users'),
  user: (id: string) => buildApiRoute('backend:PUT:/api/users/{id}', { id }),
  discounts: {
    list: buildApiRoute('backend:GET:/api/admin/discounts'),
    detail: (id: string) => buildApiRoute('backend:GET:/api/admin/discounts/{id}', { id }),
    status: (id: string) => buildApiRoute('backend:PATCH:/api/admin/discounts/{id}/status', { id }),
    audit: buildApiRoute('backend:GET:/api/admin/discounts/audit'),
  },
  orders: buildApiRoute('backend:GET:/api/orders'),
  settings: {
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
  },
} as const

export type ApiEndpointKey = keyof typeof apiEndpoints
