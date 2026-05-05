export const formatMoney = (value: unknown) => {
  const num = Number(value ?? 0)
  return `$${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatDateEcuador = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const dateOnly = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return dateOnly.toLocaleDateString('es-EC', { timeZone: 'UTC', ...options })
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', ...options })
}

export const formatDateTimeEcuador = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {},
) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('es-EC', { timeZone: 'America/Guayaquil', ...options })
}

export const getLocalSalePaymentMethodLabel = (method?: string) => {
  switch ((method || '').toLowerCase()) {
    case 'cash':
      return 'Efectivo'
    case 'card':
      return 'Tarjeta'
    case 'transfer':
      return 'Transferencia'
    case 'mixed':
      return 'Mixto'
    default:
      return 'Otro'
  }
}
