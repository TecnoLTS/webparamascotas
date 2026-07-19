'use client'

import React from 'react'

import { requestApi } from '@/lib/apiClient'
import { apiEndpoints } from '@/lib/api/endpoints'
import { listBoundedOrderHistory } from '@/lib/api/orderHistory'
import { ADMIN_PRODUCTS_ENDPOINT, RETRYABLE_PANEL_ERROR_PATTERN, withTransientRetry } from '../utils'
import {
  ADMIN_TABS_WITH_ORDERS,
  ADMIN_TABS_WITH_PRICING_SETTINGS,
  ADMIN_TABS_WITH_PRODUCTS,
  ADMIN_TABS_WITH_REFERENCE_DATA,
  ADMIN_TABS_WITH_SHIPPING_SETTINGS,
  ADMIN_TABS_WITH_STATS,
  ADMIN_TABS_WITH_USERS,
  ADMIN_TABS_WITH_VAT_SETTINGS,
} from '../adminDataScopes'
import type {
  AdminUserSummary,
  DashboardStats,
  InventoryIntelligence,
  Order,
  SalesReportView,
  ShippingPickup,
  ShippingProvider,
} from '../types'

type AccountUser = {
  id: string
  name: string
  email: string
  role?: 'customer' | 'admin'
}

type UseAdminDataLoaderParams = {
  activeTab?: string
  salesRankingMonth: string
  salesRankingDate: string
  salesRankingView?: SalesReportView
  user: AccountUser | null
  adminReloadNonce: number
  passiveRefreshNonce?: number
  handleLogout: () => void
  setAdminDataLoading: React.Dispatch<React.SetStateAction<boolean>>
  setAdminDataError: React.Dispatch<React.SetStateAction<string | null>>
  setDashboardStats: React.Dispatch<React.SetStateAction<DashboardStats | null>>
  setInventoryIntelligence: React.Dispatch<React.SetStateAction<InventoryIntelligence | null>>
  setAdminProductsList: React.Dispatch<React.SetStateAction<any[]>>
  setAdminUsersList: React.Dispatch<React.SetStateAction<AdminUserSummary[]>>
  setAdminOrdersList: React.Dispatch<React.SetStateAction<Order[]>>
  setShippingProviders: React.Dispatch<React.SetStateAction<ShippingProvider[]>>
  setShippingPickups: React.Dispatch<React.SetStateAction<ShippingPickup[]>>
  setPosLoading: React.Dispatch<React.SetStateAction<boolean>>
  loadVatRate: (options?: { silent?: boolean }) => Promise<void>
  loadShippingRates: (options?: { silent?: boolean }) => Promise<void>
  loadPricingSettings: () => Promise<void>
  loadProductReferenceData: (options?: { silent?: boolean }) => Promise<void>
  loadRecentPurchaseInvoices: (options?: { silent?: boolean }) => Promise<void>
  loadStoreStatus: () => Promise<void>
  loadSessionSettings: () => Promise<void>
  loadProductPageSettings: () => Promise<void>
  loadPosSnapshot: () => Promise<void>
  normalizeAdminProducts: (products: any[]) => any[]
}

export const useAdminDataLoader = ({
  activeTab,
  salesRankingMonth,
  user,
  adminReloadNonce,
  passiveRefreshNonce = 0,
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
}: UseAdminDataLoaderParams) => {
  const resourceCacheRef = React.useRef<Record<string, unknown>>({})
  const lastCacheNonceRef = React.useRef<number>(adminReloadNonce)
  const lastLoadSignalRef = React.useRef({
    activeTab,
    salesRankingMonth,
    adminReloadNonce,
    passiveRefreshNonce,
  })

  const handlersRef = React.useRef({
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

  React.useEffect(() => {
    if (lastCacheNonceRef.current !== adminReloadNonce) {
      resourceCacheRef.current = {}
      lastCacheNonceRef.current = adminReloadNonce
    }
  }, [adminReloadNonce])

  React.useEffect(() => {
    handlersRef.current = {
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
    }
  }, [
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
  ])

  React.useEffect(() => {
    const current = handlersRef.current
    const previousSignal = lastLoadSignalRef.current
    const adminNonceChanged = previousSignal.adminReloadNonce !== adminReloadNonce
    const passiveNonceChanged = previousSignal.passiveRefreshNonce !== passiveRefreshNonce
    const tabOrMonthChanged = previousSignal.activeTab !== activeTab || previousSignal.salesRankingMonth !== salesRankingMonth
    const loadMode: 'manual' | 'mutation' | 'passive' = passiveNonceChanged && !adminNonceChanged && !tabOrMonthChanged ? 'passive' : (adminNonceChanged ? 'mutation' : 'manual')

    lastLoadSignalRef.current = {
      activeTab,
      salesRankingMonth,
      adminReloadNonce,
      passiveRefreshNonce,
    }

    if (!user || user.role !== 'admin' || !activeTab) {
      current.setAdminDataLoading(false)
      current.setAdminDataError(null)
      return
    }

    let cancelled = false
    const headers = {}
    const getCached = <T,>(key: string): T | null => {
      if (!(key in resourceCacheRef.current)) {
        return null
      }

      return resourceCacheRef.current[key] as T
    }
    const setCached = (key: string, value: unknown) => {
      resourceCacheRef.current[key] = value
    }
    const withoutReport = (stats: DashboardStats): DashboardStats => {
      if (!stats?.businessMetrics || !('report' in stats.businessMetrics)) {
        return stats
      }

      const businessMetrics = { ...(stats.businessMetrics as Record<string, unknown>) }
      delete businessMetrics.report
      return {
        ...stats,
        businessMetrics,
      } as DashboardStats
    }

    const handleError = (error: any) => {
      console.error(error)
      const message = String(error?.message || '')
      if (message.includes('Error 401') || message.includes('Unauthenticated')) {
        current.handleLogout()
        return
      }

      if (loadMode === 'passive') {
        return
      }

      if (!cancelled) {
        if (RETRYABLE_PANEL_ERROR_PATTERN.test(message)) {
          current.setAdminDataError('Hubo inestabilidad temporal del servidor. Reintenta en unos segundos.')
        } else {
          current.setAdminDataError('No se pudieron actualizar algunos datos del panel.')
        }
      }
    }

    const loadAdminData = async () => {
      const isPassive = loadMode === 'passive'

      if (!cancelled && !isPassive) {
        current.setAdminDataLoading(true)
        current.setAdminDataError(null)
      }

      const tasks: Array<Promise<any>> = []

      if (ADMIN_TABS_WITH_STATS.has(activeTab)) {
        const statsCacheKey = `stats:${salesRankingMonth}`
        const cachedStats = getCached<DashboardStats>(statsCacheKey)

        if (cachedStats) {
          if (!cancelled) current.setDashboardStats(cachedStats)
        }
        if (!cachedStats || isPassive || adminNonceChanged) {
          const dateQuery = { period: salesRankingMonth, include_report: 0 }
          tasks.push(
            withTransientRetry(() => requestApi<DashboardStats>(apiEndpoints.adminDashboardStats(dateQuery), { headers })).then((res) => {
              const stats = withoutReport(res.body)
              setCached(statsCacheKey, stats)
              if (!cancelled) current.setDashboardStats(stats)
            }),
          )
        }
      }

      if (!isPassive && ADMIN_TABS_WITH_VAT_SETTINGS.has(activeTab)) {
        tasks.push(current.loadVatRate({ silent: true }))
      }

      if (!isPassive && ADMIN_TABS_WITH_SHIPPING_SETTINGS.has(activeTab)) {
        tasks.push(current.loadShippingRates({ silent: true }))
      }

      if (ADMIN_TABS_WITH_PRODUCTS.has(activeTab)) {
        const cachedProducts = getCached<any[]>('products')
        if (cachedProducts && !isPassive) {
          if (!cancelled) current.setAdminProductsList(cachedProducts)
        } else {
          tasks.push(
            withTransientRetry(() => requestApi<any[]>(ADMIN_PRODUCTS_ENDPOINT, { headers })).then((res) => {
              const normalizedProducts = current.normalizeAdminProducts(res.body)
              setCached('products', normalizedProducts)
              if (!cancelled) current.setAdminProductsList(normalizedProducts)
            }),
          )
        }
      }

      if (['inventory', 'reports', 'alerts', 'sales-ranking'].includes(activeTab)) {
        const inventoryCacheKey = 'inventory-intelligence:30:30'
        const cachedInventory = getCached<InventoryIntelligence>(inventoryCacheKey)
        if (cachedInventory && !isPassive) {
          if (!cancelled) current.setInventoryIntelligence(cachedInventory)
        } else {
          tasks.push(
            withTransientRetry(() => requestApi<InventoryIntelligence>(
              apiEndpoints.adminInventoryIntelligence({ window_days: 30, target_days: 30 }),
              { headers }
            )).then((res) => {
              setCached(inventoryCacheKey, res.body)
              if (!cancelled) current.setInventoryIntelligence(res.body)
            }),
          )
        }
      }

      if (!isPassive && ADMIN_TABS_WITH_REFERENCE_DATA.has(activeTab)) {
        tasks.push(current.loadProductReferenceData({ silent: true }))
      }

      if (activeTab === 'inventory') {
        tasks.push(current.loadRecentPurchaseInvoices({ silent: true }))
      }

      if (!isPassive && ADMIN_TABS_WITH_USERS.has(activeTab)) {
        const cachedUsers = getCached<AdminUserSummary[]>('users')
        if (cachedUsers) {
          if (!cancelled) current.setAdminUsersList(cachedUsers)
        } else {
          tasks.push(
            withTransientRetry(() => requestApi<AdminUserSummary[]>(apiEndpoints.users, { headers })).then((res) => {
              const users = Array.isArray(res.body) ? res.body : []
              setCached('users', users)
              if (!cancelled) {
                current.setAdminUsersList(users)
              }
            }),
          )
        }
      }

      if (ADMIN_TABS_WITH_ORDERS.has(activeTab)) {
        const cachedOrders = getCached<Order[]>('orders')
        if (cachedOrders && !isPassive) {
          if (!cancelled) current.setAdminOrdersList(cachedOrders)
        } else {
          tasks.push(
            withTransientRetry(() => listBoundedOrderHistory<Order>(apiEndpoints.orders, { init: { headers } })).then((orders) => {
              setCached('orders', orders)
              if (!cancelled) current.setAdminOrdersList(orders)
            }),
          )
        }
      }

      if (!isPassive && ADMIN_TABS_WITH_PRICING_SETTINGS.has(activeTab)) {
        tasks.push(current.loadPricingSettings())
      }

      if (!isPassive && activeTab === 'product-page') {
        tasks.push(current.loadProductPageSettings())
      }

      if (!isPassive && activeTab === 'store-status') {
        tasks.push(current.loadStoreStatus())
      }

      if (!isPassive && activeTab === 'security-settings') {
        tasks.push(current.loadSessionSettings())
      }

      if (!isPassive && activeTab === 'local-sales') {
        if (!cancelled) current.setPosLoading(true)
        tasks.push(
          current.loadPosSnapshot().finally(() => {
            if (!cancelled) current.setPosLoading(false)
          }),
        )
      }

      if (activeTab === 'shipments') {
        const cachedShipments = getCached<{ providers: ShippingProvider[]; pickups: ShippingPickup[] }>('shipments')
        if (cachedShipments && !isPassive) {
          if (!cancelled) {
            current.setShippingProviders(cachedShipments.providers)
            current.setShippingPickups(cachedShipments.pickups)
          }
        } else {
          tasks.push(
            withTransientRetry(() => requestApi<{ providers?: ShippingProvider[]; pickups?: ShippingPickup[] }>(apiEndpoints.shipments, { headers })).then((res) => {
              const shipments = {
                providers: Array.isArray(res.body.providers) ? res.body.providers : [],
                pickups: Array.isArray(res.body.pickups) ? res.body.pickups : [],
              }
              setCached('shipments', shipments)
              if (!cancelled) {
                current.setShippingProviders(shipments.providers)
                current.setShippingPickups(shipments.pickups)
              }
            }),
          )
        }
      }

      const results = await Promise.allSettled(tasks)
      results.forEach((result) => {
        if (result.status === 'rejected') {
          handleError(result.reason)
        }
      })

      if (!cancelled && !isPassive) {
        current.setAdminDataLoading(false)
      }
    }

    loadAdminData()

    return () => {
      cancelled = true
    }
  }, [activeTab, salesRankingMonth, user, adminReloadNonce, passiveRefreshNonce])
}
