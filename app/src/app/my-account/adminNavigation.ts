import type { AdminMenuGroupKey } from './types'

export const ADMIN_TAB_GROUPS: Record<AdminMenuGroupKey, string[]> = {
  monitoring: ['alerts'],
  reporting: ['reports', 'sales-ranking'],
  catalog: ['products', 'inventory', 'catalogs', 'users', 'product-page'],
  operations: ['store-status', 'local-sales', 'admin-orders', 'shipments', 'billing-rides', 'balances'],
  finance: ['prices', 'taxes', 'margins', 'calculations', 'pricing-rules', 'discount-codes', 'expenses'],
}

export const createAdminMenuExpandedState = (
  expandedGroup: AdminMenuGroupKey | null = 'reporting',
): Record<AdminMenuGroupKey, boolean> => ({
  monitoring: expandedGroup === 'monitoring',
  reporting: expandedGroup === 'reporting',
  catalog: expandedGroup === 'catalog',
  operations: expandedGroup === 'operations',
  finance: expandedGroup === 'finance',
})

export const getAdminGroupForTab = (tab?: string): AdminMenuGroupKey | null => {
  if (!tab) return null

  const entries = Object.entries(ADMIN_TAB_GROUPS) as Array<[AdminMenuGroupKey, string[]]>
  for (const [groupKey, tabs] of entries) {
    if (tabs.includes(tab)) return groupKey
  }

  return null
}
