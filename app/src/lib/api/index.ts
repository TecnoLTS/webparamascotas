// src/lib/api/index.ts

// 👇 Importamos lo que vamos a USAR dentro de este archivo
import { apiEndpoints } from './endpoints'
import { fetchJson } from '@/lib/apiClient'

// 👇 Re-exports (para que otros módulos puedan importar desde aquí)
export { apiEndpoints } from './endpoints'
export { listProductPage, getProduct, createProduct, updateProduct, deleteProduct } from './products'
export { createOrder, getQuote } from './orders'
export { fetchRecentOrdersReport } from './reports'
export { getProductPageSettings, updateProductPageSettings } from './settings'
export { listDiscounts, createDiscount, updateDiscount, updateDiscountStatus, listDiscountAudit } from './discounts'
export { fetchJson, requestApi } from '@/lib/apiClient'

// Endpoints ligeros disponibles para chequeo rápido de salud/demo.
export type HealthResponse = {
  estado: string
  fecha: string
  servicio?: string
  base_de_datos?: string
  registro_tenants?: string
}

export const healthApi = () => fetchJson<HealthResponse>(apiEndpoints.health)
