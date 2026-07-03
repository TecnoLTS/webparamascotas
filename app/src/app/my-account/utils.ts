import { apiEndpoints, withQuery } from '@/lib/api/endpoints'

export const ADMIN_PRODUCTS_ENDPOINT = withQuery(apiEndpoints.products, { scope: 'admin' })
export const DEFAULT_STORE_PAUSE_MESSAGE = 'Tienda temporalmente en mantenimiento. Intenta más tarde.'
export const RETRYABLE_PANEL_ERROR_PATTERN = /(502|503|504|bad gateway|gateway timeout|service unavailable|failed to fetch|networkerror|tiempo de espera agotado)/i
export const ECUADOR_TIME_ZONE = 'America/Guayaquil'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const withTransientRetry = async <T,>(
    operation: () => Promise<T>,
    retries = 2,
    baseDelayMs = 450
): Promise<T> => {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            const message = String((error as any)?.message || '')
            const canRetry = RETRYABLE_PANEL_ERROR_PATTERN.test(message)

            if (!canRetry || attempt === retries) {
                throw error
            }

            await delay(baseDelayMs * (attempt + 1))
        }
    }

    throw lastError
}

export const getEcuadorDateKey = (value: string | number | Date = new Date()) => {
    if (typeof value === 'string') {
        const rawValue = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return rawValue

        let normalizedValue = rawValue
        if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(rawValue)) {
            normalizedValue = rawValue.replace(' ', 'T')
            if (/[+-]\d{2}$/.test(normalizedValue)) {
                normalizedValue = `${normalizedValue}:00`
            } else if (!/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(normalizedValue)) {
                normalizedValue = `${normalizedValue}Z`
            }
        }
        const date = new Date(normalizedValue)
        if (!Number.isFinite(date.getTime())) return ''
        return date.toLocaleDateString('en-CA', { timeZone: ECUADOR_TIME_ZONE })
    }

    const date = value instanceof Date ? value : new Date(value)
    if (!Number.isFinite(date.getTime())) return ''
    return date.toLocaleDateString('en-CA', { timeZone: ECUADOR_TIME_ZONE })
}

export const getEcuadorTodayKey = () => getEcuadorDateKey(new Date())

export const addDaysToDateKey = (dateKey: string, days: number) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
    if (!match) return ''
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12, 0, 0))
    return date.toISOString().slice(0, 10)
}

export const getEcuadorLastSevenDaysRange = (reference: string | number | Date = new Date()) => {
    const anchorKey = typeof reference === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(reference)
        ? reference
        : getEcuadorDateKey(reference)
    if (!anchorKey) return { start: '', end: '' }
    return {
        start: addDaysToDateKey(anchorKey, -6),
        end: anchorKey,
    }
}

export const getCurrentMonthKey = () => {
    return getEcuadorTodayKey().slice(0, 7)
}

export const formatMonthKeyLabel = (monthKey: string) => {
    const match = monthKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
    if (!match) return monthKey

    const year = Number(match[1])
    const month = Number(match[2])

    return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)).toLocaleDateString('es-EC', {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric'
    })
}
