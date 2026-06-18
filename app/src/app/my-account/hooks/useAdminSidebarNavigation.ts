'use client'

import React from 'react'
import type { ReadonlyURLSearchParams } from 'next/navigation'

import { createAdminMenuExpandedState, getAdminGroupForTab } from '../adminNavigation'
import type { AdminMenuGroupKey, AdminReportSection, DeepDiveView } from '../types'
import { PRODUCT_REFERENCE_KEY_SET, type ProductReferenceKey } from '@/lib/productReferenceData'

const ADMIN_REPORT_SECTION_SET = new Set<AdminReportSection>(['general', 'sales', 'balance', 'inventory', 'traceability', 'products-purchases'])

type UseAdminSidebarNavigationParams = {
  userRole?: string
  activeTab?: string
  searchParams: ReadonlyURLSearchParams
  startPanelNavigationTransition: React.TransitionStartFunction
  setActiveTab: React.Dispatch<React.SetStateAction<string | undefined>>
  setSelectedDeepDive: React.Dispatch<React.SetStateAction<DeepDiveView | null>>
  setAdminReportSection: React.Dispatch<React.SetStateAction<AdminReportSection>>
}

export const useAdminSidebarNavigation = ({
  userRole,
  activeTab,
  searchParams,
  startPanelNavigationTransition,
  setActiveTab,
  setSelectedDeepDive,
  setAdminReportSection,
}: UseAdminSidebarNavigationParams) => {
  const [adminMenuExpanded, setAdminMenuExpanded] = React.useState<Record<AdminMenuGroupKey, boolean>>(
    () => createAdminMenuExpandedState('reporting'),
  )
  const [focusedReferenceCatalogKey, setFocusedReferenceCatalogKey] = React.useState<ProductReferenceKey | null>(null)

  const navigateToPanelTab = React.useCallback((
    nextTab: string,
    options?: {
      adminReportSection?: AdminReportSection
      clearDeepDive?: boolean
    },
  ) => {
    startPanelNavigationTransition(() => {
      if (typeof options?.adminReportSection !== 'undefined') {
        setAdminReportSection(options.adminReportSection)
      }
      if (options?.clearDeepDive !== false) {
        setSelectedDeepDive(null)
      }
      if (nextTab !== 'catalogs') {
        setFocusedReferenceCatalogKey(null)
      }
      setActiveTab((prev) => (prev === nextTab ? prev : nextTab))
    })
  }, [setActiveTab, setAdminReportSection, setSelectedDeepDive, startPanelNavigationTransition])

  const openReferenceCatalog = React.useCallback((key: ProductReferenceKey) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/my-account?tab=catalogs&catalog=${encodeURIComponent(key)}`
      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (openedWindow) return
    }

    startPanelNavigationTransition(() => {
      setFocusedReferenceCatalogKey(key)
      setActiveTab('catalogs')
      setSelectedDeepDive(null)
    })
  }, [setActiveTab, setSelectedDeepDive, startPanelNavigationTransition])

  const navigateToReferenceCatalog = React.useCallback((key: ProductReferenceKey | null) => {
    startPanelNavigationTransition(() => {
      setFocusedReferenceCatalogKey(key)
      setSelectedDeepDive(null)
      setActiveTab('catalogs')
    })
  }, [setActiveTab, setSelectedDeepDive, startPanelNavigationTransition])

  const toggleAdminMenuGroup = React.useCallback((groupKey: AdminMenuGroupKey) => {
    setAdminMenuExpanded((prev) => {
      const nextIsExpanded = !prev[groupKey]
      return nextIsExpanded ? createAdminMenuExpandedState(groupKey) : createAdminMenuExpandedState(null)
    })
  }, [])

  const openAdminReportSection = React.useCallback((section: AdminReportSection) => {
    navigateToPanelTab('reports', { adminReportSection: section })
  }, [navigateToPanelTab])

  React.useEffect(() => {
    if (userRole !== 'admin') return
    const groupKey = getAdminGroupForTab(activeTab)
    if (!groupKey) return

    setAdminMenuExpanded((prev) => {
      const nextState = createAdminMenuExpandedState(groupKey)
      const hasChanged =
        prev.monitoring !== nextState.monitoring ||
        prev.reporting !== nextState.reporting ||
        prev.catalog !== nextState.catalog ||
        prev.operations !== nextState.operations ||
        prev.finance !== nextState.finance

      return hasChanged ? nextState : prev
    })
  }, [activeTab, userRole])

  React.useEffect(() => {
    if (userRole !== 'admin') return
    const requestedTab = searchParams.get('tab')
    const requestedCatalog = searchParams.get('catalog')
    const requestedReportSection = searchParams.get('section') || searchParams.get('report')

    if (requestedTab === 'catalogs') {
      setActiveTab('catalogs')
      setSelectedDeepDive(null)
      if (requestedCatalog && PRODUCT_REFERENCE_KEY_SET.has(requestedCatalog as ProductReferenceKey)) {
        setFocusedReferenceCatalogKey(requestedCatalog as ProductReferenceKey)
      } else {
        setFocusedReferenceCatalogKey(null)
      }
      return
    }

    if (requestedTab === 'reports') {
      setActiveTab('reports')
      setSelectedDeepDive(null)
      setFocusedReferenceCatalogKey(null)
      if (requestedReportSection && ADMIN_REPORT_SECTION_SET.has(requestedReportSection as AdminReportSection)) {
        setAdminReportSection(requestedReportSection as AdminReportSection)
      }
      return
    }

    if (requestedTab && getAdminGroupForTab(requestedTab)) {
      setActiveTab(requestedTab)
      setSelectedDeepDive(null)
      setFocusedReferenceCatalogKey(null)
    }
  }, [searchParams, setActiveTab, setAdminReportSection, setSelectedDeepDive, userRole])

  return {
    adminMenuExpanded,
    focusedReferenceCatalogKey,
    navigateToPanelTab,
    openReferenceCatalog,
    navigateToReferenceCatalog,
    toggleAdminMenuGroup,
    openAdminReportSection,
  }
}
