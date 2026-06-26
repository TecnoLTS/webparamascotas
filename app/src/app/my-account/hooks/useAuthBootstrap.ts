'use client'

import React from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { requestApi } from '@/lib/apiClient'
import {
  clearStoredSession,
  getStoredSessionUser,
  hasCookieSessionMarker,
  setCookieSessionMarker,
  setStoredSessionUser,
} from '@/lib/authSession'

import type { AdminReportSection } from '../types'

type AccountUser = {
  id: string
  name: string
  email: string
  role?: 'customer' | 'admin'
}

type UseAuthBootstrapParams = {
  router: AppRouterInstance
  setAuthBootstrapping: React.Dispatch<React.SetStateAction<boolean>>
  setUser: React.Dispatch<React.SetStateAction<AccountUser | null>>
  setAdminReportSection: React.Dispatch<React.SetStateAction<AdminReportSection>>
  setActiveTab: React.Dispatch<React.SetStateAction<string | undefined>>
}

export const useAuthBootstrap = ({
  router,
  setAuthBootstrapping,
  setUser,
  setAdminReportSection,
  setActiveTab,
}: UseAuthBootstrapParams) => {
  React.useEffect(() => {
    let cancelled = false
    const redirectAdminToDashboard = () => {
      if (typeof window !== 'undefined') {
        window.location.replace('/dashboard/')
        return
      }

      router.replace('/dashboard/')
    }

    const storedUser = hasCookieSessionMarker() ? getStoredSessionUser() : null

    if (storedUser?.role === 'admin') {
      redirectAdminToDashboard()
      return () => {
        cancelled = true
      }
    }

    if (storedUser?.id && storedUser.name && storedUser.email) {
      setUser(storedUser)
      setActiveTab('dashboard')
      setAuthBootstrapping(false)
    }

    requestApi<{ user?: AccountUser }>('/api/auth/session')
      .then((res) => {
        if (cancelled) return
        const sessionUser = res.body.user
        if (!sessionUser?.id || !sessionUser?.name || !sessionUser?.email) {
          throw new Error('Sesión inválida')
        }
        setCookieSessionMarker()
        setStoredSessionUser(sessionUser)
        if (sessionUser.role === 'admin') {
          redirectAdminToDashboard()
          return
        }
        setUser(sessionUser)
        setActiveTab('dashboard')
      })
      .catch(() => {
        if (cancelled) return
        clearStoredSession()
        router.replace('/login')
      })
      .finally(() => {
        if (!cancelled) {
          setAuthBootstrapping(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [router, setActiveTab, setAdminReportSection, setAuthBootstrapping, setUser])
}
