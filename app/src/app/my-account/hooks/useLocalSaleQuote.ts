'use client'

import React from 'react'

import { requestApi } from '@/lib/apiClient'
import { apiEndpoints } from '@/lib/api/endpoints'
import type { LocalSaleLineItem, LocalSaleQuote } from '../types'

type AccountUser = {
  id: string
  name: string
  email: string
  role?: 'customer' | 'admin'
}

type UseLocalSaleQuoteParams = {
  activeTab?: string
  user: AccountUser | null
  localSaleItems: LocalSaleLineItem[]
  localSaleDiscountCode: string
  setLocalSaleQuote: React.Dispatch<React.SetStateAction<LocalSaleQuote | null>>
  setLocalSaleError: React.Dispatch<React.SetStateAction<string | null>>
  setLocalSaleQuoteLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const useLocalSaleQuote = ({
  activeTab,
  user,
  localSaleItems,
  localSaleDiscountCode,
  setLocalSaleQuote,
  setLocalSaleError,
  setLocalSaleQuoteLoading,
}: UseLocalSaleQuoteParams) => {
  React.useEffect(() => {
    if (activeTab !== 'local-sales' && activeTab !== 'quotations') return
    if (!user || user.role !== 'admin') return

    if (localSaleItems.length === 0) {
      setLocalSaleQuote(null)
      setLocalSaleError(null)
      setLocalSaleQuoteLoading(false)
      return
    }

    let cancelled = false
    setLocalSaleQuoteLoading(true)
    setLocalSaleError(null)

    const normalizedDiscountCode = localSaleDiscountCode.trim().toUpperCase() || null
    requestApi<LocalSaleQuote>(apiEndpoints.orderQuote, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_method: 'pickup',
        discount_code: normalizedDiscountCode,
        items: localSaleItems.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      }),
    })
      .then((res) => {
        if (cancelled) return
        setLocalSaleQuote(res.body)
      })
      .catch((error: any) => {
        if (cancelled) return
        console.error(error)
        setLocalSaleQuote(null)
        setLocalSaleError(String(error?.message || 'No se pudo calcular la venta local.'))
      })
      .finally(() => {
        if (!cancelled) setLocalSaleQuoteLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    activeTab,
    localSaleDiscountCode,
    localSaleItems,
    setLocalSaleError,
    setLocalSaleQuote,
    setLocalSaleQuoteLoading,
    user,
  ])
}
