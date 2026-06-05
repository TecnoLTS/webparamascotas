'use client'

import React from 'react'
import { requestApi } from '@/lib/apiClient'
import type { DashboardStats, SalesReportView } from '../types'

type AccountUser = {
  id: string
  name: string
  email: string
  role?: 'customer' | 'admin'
}

export type ReportDataResult = {
  products: Array<{
    product_id: string
    product_name: string
    category: string
    orders_count: number
    units_sold: number
    gross_revenue: number
    net_revenue: number
    vat_amount: number
    shipping_amount: number
    cost: number
    profit: number
    margin: number
    order_refs: string[]
  }>
  categories: Array<{ category: string; net_revenue: number }>
  orders: Array<{
    id: string
    created_at: string
    status: string
    user_name: string | null
    customer_email: string | null
    customer_phone: string | null
    customer_document_type: string | null
    customer_document_number: string | null
    payment_method: string | null
    delivery_method: string | null
    discount_code: string | null
    discount_total: number
    items_subtotal: number
    vat_rate: number
    shipping_base: number
    shipping_tax_amount: number
    item_lines_count: number
    units_count: number
    items_summary: string
    gross: number
    net: number
    vat: number
    shipping: number
    cost: number
    profit: number
    margin: number
    average_unit_net: number
  }>
  sales: Record<string, unknown>
  profit: Record<string, unknown>
  period: { period_key: string; start_date: string; end_date: string; end_exclusive: string; timezone: string }
} | null

type UseReportDataParams = {
  activeTab?: string
  user: AccountUser | null
  salesRankingView: SalesReportView
  salesRankingMonth: string
  salesRankingDate: string
  adminReloadNonce: number
  setDashboardStats: React.Dispatch<React.SetStateAction<DashboardStats | null>>
}

export function useReportData({
  activeTab,
  user,
  salesRankingView,
  salesRankingMonth,
  salesRankingDate,
  adminReloadNonce,
  setDashboardStats,
}: UseReportDataParams) {
  const reportDataRef = React.useRef<ReportDataResult>(null)
  const reportCacheRef = React.useRef<Record<string, NonNullable<ReportDataResult>>>({})
  const reportCacheNonceRef = React.useRef(adminReloadNonce)
  const reportAbortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    if (reportCacheNonceRef.current !== adminReloadNonce) {
      reportCacheRef.current = {}
      reportDataRef.current = null
      reportCacheNonceRef.current = adminReloadNonce
    }
  }, [adminReloadNonce])

  React.useEffect(() => {
    if (!user || user.role !== 'admin') return
    if (activeTab !== 'reports' && activeTab !== 'sales-ranking') return

    reportAbortRef.current?.abort()
    const controller = new AbortController()
    reportAbortRef.current = controller

    let cancelled = false

    const cacheKey = salesRankingView === 'historical'
      ? 'historical'
      : salesRankingView === 'week'
        ? 'week'
      : salesRankingView === 'daily' && salesRankingDate
        ? `daily:${salesRankingDate}`
        : `month:${salesRankingMonth}`
    const query = salesRankingView === 'historical'
      ? '?scope=historical'
      : salesRankingView === 'week'
        ? '?scope=week'
      : salesRankingView === 'daily' && salesRankingDate
        ? `?date=${encodeURIComponent(salesRankingDate)}`
        : `?period=${encodeURIComponent(salesRankingMonth)}`
    const mergeReportData = (data: NonNullable<ReportDataResult>) => {
      reportDataRef.current = data
      setDashboardStats((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          businessMetrics: {
            ...(prev.businessMetrics || {}),
            report: data,
          },
        } as typeof prev
      })
    }

    const cached = reportCacheRef.current[cacheKey]
    if (cached) {
      mergeReportData(cached)
      return () => {
        cancelled = true
        controller.abort()
      }
    }

    requestApi<NonNullable<ReportDataResult>>(`/api/admin/report${query}`, { signal: controller.signal })
      .then((res) => {
        const data = res.body as NonNullable<ReportDataResult>
        if (cancelled || !data) return
        reportCacheRef.current[cacheKey] = data
        mergeReportData(data)
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted && err?.name !== 'AbortError') {
          console.error('Report fetch failed:', err)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeTab, user, salesRankingView, salesRankingMonth, salesRankingDate, adminReloadNonce, setDashboardStats])

  return {
    reportDataRef,
  }
}
