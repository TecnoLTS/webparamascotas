import { fetchJsonEnvelope } from '@/lib/apiClient'

type OrderPaginationMeta = {
  hasMore?: boolean
  nextCursor?: string | null
}

export type BoundedOrderHistoryOptions = {
  init?: RequestInit
  maxItems?: number
  pageSize?: number
}

const endpointPage = (endpoint: string, pageSize: number, cursor: string | null) => {
  const separator = endpoint.includes('?') ? '&' : '?'
  const query = new URLSearchParams({ page_size: String(pageSize) })
  if (cursor) query.set('cursor', cursor)
  return `${endpoint}${separator}${query.toString()}`
}

const paginationMeta = (meta: Record<string, unknown>): OrderPaginationMeta => {
  const pagination = meta.pagination
  return pagination && typeof pagination === 'object'
    ? pagination as OrderPaginationMeta
    : {}
}

/**
 * Recorre historial de pedidos con páginas de hasta 100 y un techo total
 * explícito. Falla cerrado ante cursores ausentes/repetidos o historiales que
 * superen el presupuesto, evitando truncados silenciosos y acumulación libre.
 */
export async function listBoundedOrderHistory<T>(
  endpoint: string,
  options: BoundedOrderHistoryOptions = {},
): Promise<T[]> {
  const maxItems = Math.max(1, Math.min(1000, Math.trunc(options.maxItems ?? 1000)))
  const pageSize = Math.max(1, Math.min(100, Math.trunc(options.pageSize ?? 100), maxItems))
  const maxPages = Math.ceil(maxItems / pageSize)
  const items: T[] = []
  const seenCursors = new Set<string>()
  let cursor: string | null = null

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const result = await fetchJsonEnvelope<unknown>(
      endpointPage(endpoint, pageSize, cursor),
      { ...options.init, cache: 'no-store' },
    )
    if (!Array.isArray(result.data)) {
      throw new Error('El historial de pedidos devolvio una pagina invalida.')
    }
    if (result.data.length > pageSize) {
      throw new Error('El historial de pedidos excedio el tamano de pagina solicitado.')
    }
    items.push(...result.data as T[])

    const pagination = paginationMeta(result.meta)
    if (pagination.hasMore !== true) {
      return items
    }

    const nextCursor = typeof pagination.nextCursor === 'string'
      ? pagination.nextCursor.trim()
      : ''
    if (!nextCursor) {
      throw new Error('El historial de pedidos indico mas resultados sin entregar cursor.')
    }
    if (seenCursors.has(nextCursor)) {
      throw new Error('El historial de pedidos repitio un cursor.')
    }
    if (items.length >= maxItems || pageNumber + 1 >= maxPages) {
      throw new Error(`El historial de pedidos supera el limite operativo de ${maxItems} registros.`)
    }
    seenCursors.add(nextCursor)
    cursor = nextCursor
  }

  throw new Error(`El historial de pedidos supera el limite operativo de ${maxItems} registros.`)
}
