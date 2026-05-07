import type { AdminUserSummary } from './types'

export const normalizeStatus = (status?: string) => (status || '').toLowerCase()

export const getStatusBadge = (status?: string) => {
  const normalized = normalizeStatus(status)
  if (['processing', 'in_process', 'in-process'].includes(normalized)) {
    return { label: 'En proceso', className: 'bg-blue-100 text-blue-600' }
  }
  if (normalized === 'completed') {
    return { label: 'Completado', className: 'bg-success/10 text-success' }
  }
  if (normalized === 'delivered') {
    return { label: 'Entregado', className: 'bg-success/10 text-success' }
  }
  if (['canceled', 'cancelled'].includes(normalized)) {
    return { label: 'Cancelado', className: 'bg-red/10 text-red' }
  }
  if (['shipped', 'shipping', 'delivery', 'delivering'].includes(normalized)) {
    return { label: 'Enviado', className: 'bg-purple/10 text-purple' }
  }
  if (['pickup', 'ready_for_pickup', 'ready'].includes(normalized)) {
    return { label: 'Esperando Recojo', className: 'bg-amber-400/15 text-amber-600' }
  }
  return { label: 'Pendiente', className: 'bg-yellow/10 text-yellow' }
}

export const getUserRoleBadge = (role?: string | null) => {
  const normalized = String(role || 'customer').toLowerCase()
  if (normalized === 'admin') {
    return { label: 'Admin', className: 'bg-blue-100 text-blue-700' }
  }
  if (normalized === 'service') {
    return { label: 'Servicio', className: 'bg-violet-100 text-violet-700' }
  }
  if (normalized === 'client') {
    return { label: 'Cliente', className: 'bg-emerald-100 text-emerald-700' }
  }
  return { label: 'Cliente', className: 'bg-surface text-secondary' }
}

export const formatIsoDate = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '-'
  const [year, month, day] = raw.split('-')
  return `${day}/${month}/${year}`
}

export const getProductExpirationMeta = (product: any) => {
  const productType = String(product?.productType || '').trim().toLowerCase()
  const category = String(product?.category || '').trim().toLowerCase()
  const isFood = productType === 'alimento' || category === 'alimento'
  if (!isFood) {
    return {
      isFood: false,
      expirationDate: '',
      daysToExpire: null,
      expirationStatus: 'none',
      badge: { label: 'No perecedero', className: 'bg-surface text-secondary' },
      isExpired: false,
    }
  }

  const expirationDate = String(
    product?.expirationDate ||
    product?.attributes?.expirationDate ||
    product?.attributes?.expiryDate ||
    '',
  ).trim()
  const statusRaw = String(product?.expirationStatus || '').toLowerCase()
  const status = ['none', 'ok', 'expiring', 'expired'].includes(statusRaw) ? statusRaw : 'none'
  const days = Number(product?.daysToExpire)
  const alertDays = Number(
    product?.expirationAlertDays ??
    product?.attributes?.expirationAlertDays ??
    product?.attributes?.expiryAlertDays ??
    30,
  )
  const normalizedDays = Number.isFinite(days) ? days : null
  const normalizedAlertDays = Number.isFinite(alertDays) && alertDays >= 0 ? alertDays : 30

  let effectiveStatus = status
  if (effectiveStatus === 'none' && expirationDate) {
    if (normalizedDays !== null) {
      if (normalizedDays < 0) effectiveStatus = 'expired'
      else if (normalizedDays <= normalizedAlertDays) effectiveStatus = 'expiring'
      else effectiveStatus = 'ok'
    } else {
      effectiveStatus = 'ok'
    }
  }

  const isExpired = effectiveStatus === 'expired'
  const isExpiring = effectiveStatus === 'expiring'
  const badge = isExpired
    ? {
      label: normalizedDays !== null ? `Vencido hace ${Math.abs(normalizedDays)} día(s)` : 'Vencido',
      className: 'bg-red-100 text-red-700',
    }
    : isExpiring
      ? {
        label: normalizedDays !== null ? `Por vencer (${Math.max(0, normalizedDays)} día(s))` : 'Por vencer',
        className: 'bg-amber-100 text-amber-700',
      }
      : effectiveStatus === 'ok'
        ? { label: 'Vigente', className: 'bg-emerald-100 text-emerald-700' }
        : { label: 'Sin fecha', className: 'bg-surface text-secondary' }

  return {
    isFood,
    expirationDate,
    daysToExpire: normalizedDays,
    expirationStatus: effectiveStatus,
    badge,
    isExpired,
  }
}

export const alertSeverityLabels: Record<'all' | 'critical' | 'warning' | 'info', string> = {
  all: 'todas',
  critical: 'críticas',
  warning: 'advertencias',
  info: 'informativas',
}

export const enrichAdminUsers = (
  adminUsersList: AdminUserSummary[],
  parseJsonValue: (value: unknown) => any,
  getAdminUserResolvedAddress: (adminUser: AdminUserSummary, profile: Record<string, unknown>) => any,
  formatAddress: (value: unknown) => string,
) => {
  return adminUsersList.map((item) => {
    const profileRaw = parseJsonValue(item.profile)
    const profile = profileRaw && typeof profileRaw === 'object' && !Array.isArray(profileRaw)
      ? profileRaw as Record<string, any>
      : {}
    const resolvedAddress = getAdminUserResolvedAddress(item, profile)
    const resolvedPhone = String(
      profile.phone
      ?? profile.mobile
      ?? resolvedAddress?.phone
      ?? '',
    ).trim()
    const resolvedCompany = String(
      item.business_name
      ?? profile.businessName
      ?? profile.business_name
      ?? resolvedAddress?.company
      ?? '',
    ).trim()
    const emailRaw = String(item.email ?? '').trim()
    const resolvedEmail = emailRaw.toLowerCase().endsWith('@local-pos.invalid') ? '' : emailRaw
    const resolvedAddressText = resolvedAddress ? formatAddress(resolvedAddress) : '-'
    return {
      ...item,
      resolvedAddress,
      resolvedAddressText,
      resolvedPhone,
      resolvedCompany,
      resolvedEmail,
      hasAddress: Boolean(resolvedAddress && resolvedAddressText !== '-'),
      hasPhone: Boolean(resolvedPhone),
    }
  })
}
