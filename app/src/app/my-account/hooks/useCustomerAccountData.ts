'use client'

import React from 'react'

import { requestApi } from '@/lib/apiClient'
import { apiEndpoints } from '@/lib/api/endpoints'
import type { Order } from '../types'
import { normalizeSavedAddresses, type SavedAddressEntry } from '../customerDataUtils'

type AccountUser = {
  id: string
  name: string
  email: string
  role?: 'customer' | 'admin'
}

type ProfileState = {
  firstName: string
  lastName: string
  phone: string
  gender: string
  birth: string
  documentType: string
  documentNumber: string
  businessName: string
}

type UseCustomerAccountDataParams = {
  user: AccountUser | null
  setUserOrders: React.Dispatch<React.SetStateAction<Order[]>>
  setUserOrdersLoading: React.Dispatch<React.SetStateAction<boolean>>
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>
  setProfileLoading: React.Dispatch<React.SetStateAction<boolean>>
  setSavedAddresses: React.Dispatch<React.SetStateAction<SavedAddressEntry[]>>
  setCurrentAddrIndex: React.Dispatch<React.SetStateAction<number>>
  setAddressLoading: React.Dispatch<React.SetStateAction<boolean>>
  showNotification: (text: string, type?: 'success' | 'error') => void
  handleLogout: () => void
}

export const useCustomerAccountData = ({
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
}: UseCustomerAccountDataParams) => {
  const handlersRef = React.useRef({
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

  React.useEffect(() => {
    handlersRef.current = {
      setUserOrders,
      setUserOrdersLoading,
      setProfile,
      setProfileLoading,
      setSavedAddresses,
      setCurrentAddrIndex,
      setAddressLoading,
      showNotification,
      handleLogout,
    }
  }, [
    setUserOrders,
    setUserOrdersLoading,
    setProfile,
    setProfileLoading,
    setSavedAddresses,
    setCurrentAddrIndex,
    setAddressLoading,
    showNotification,
    handleLogout,
  ])

  React.useEffect(() => {
    const current = handlersRef.current
    if (!user?.id || user.role === 'admin') return

    let cancelled = false
    const controller = new AbortController()

    current.setUserOrdersLoading(true)
    requestApi<Order[]>(apiEndpoints.myOrders, { signal: controller.signal })
      .then((res) => {
        if (cancelled || controller.signal.aborted) return
        current.setUserOrders(res.body)
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return
        console.error(err)
        if (err?.message && (err.message.includes('Error 401') || err.message.includes('No autorizado'))) {
          current.handleLogout()
          return
        }
        current.showNotification('No se pudieron cargar tus pedidos.', 'error')
        current.setUserOrders([])
      })
      .finally(() => {
        if (!cancelled) {
          current.setUserOrdersLoading(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [user?.id, user?.role])

  React.useEffect(() => {
    const current = handlersRef.current
    if (!user?.id || user.role === 'admin') return

    let cancelled = false
    const controller = new AbortController()

    current.setProfileLoading(true)
    requestApi<{ name?: string; profile?: ProfileState }>(apiEndpoints.userProfile, { signal: controller.signal })
      .then((res) => {
        if (cancelled || controller.signal.aborted) return
        const apiProfile: Partial<ProfileState> = res.body.profile || {}
        const fallbackName = res.body.name || user.name || ''
        const [firstName, ...rest] = fallbackName.split(' ')
        current.setProfile({
          firstName: apiProfile.firstName || firstName || '',
          lastName: apiProfile.lastName || rest.join(' ') || '',
          phone: apiProfile.phone || '',
          gender: apiProfile.gender || '',
          birth: apiProfile.birth || '',
          documentType: apiProfile.documentType || '',
          documentNumber: apiProfile.documentNumber || '',
          businessName: apiProfile.businessName || '',
        })
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return
        console.error(err)
        current.showNotification('No se pudieron cargar los datos de perfil.', 'error')
      })
      .finally(() => {
        if (!cancelled) {
          current.setProfileLoading(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [user?.id, user?.role, user?.name])

  React.useEffect(() => {
    const current = handlersRef.current
    if (!user?.id || user.role === 'admin') return

    let cancelled = false
    const controller = new AbortController()

    current.setAddressLoading(true)
    requestApi<{ addresses: SavedAddressEntry[] }>(apiEndpoints.userAddresses, { signal: controller.signal })
      .then((res) => {
        if (cancelled || controller.signal.aborted) return
        const normalizedAddresses = normalizeSavedAddresses(res.body.addresses)
        if (normalizedAddresses.length > 0) {
          current.setSavedAddresses(normalizedAddresses)
          current.setCurrentAddrIndex(0)
        }
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return
        console.error(err)
        current.showNotification('No se pudieron cargar las direcciones guardadas.', 'error')
      })
      .finally(() => {
        if (!cancelled) {
          current.setAddressLoading(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [user?.id, user?.role])
}
