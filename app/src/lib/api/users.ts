import { requestApi } from '@/lib/apiClient'
import { apiEndpoints } from './endpoints'

export type AdminManagedUserRole = 'customer' | 'admin'

export type AdminManagedUserPayload = {
  name: string
  email: string
  role: AdminManagedUserRole
  password?: string
  emailVerified?: boolean
  documentType?: string
  documentNumber?: string
  businessName?: string
  phone?: string
}

export const createAdminUser = (payload: AdminManagedUserPayload) =>
  requestApi<any>(apiEndpoints.users, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const updateAdminUser = (id: string, payload: AdminManagedUserPayload) =>
  requestApi<any>(apiEndpoints.user(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const unlockAdminUser = (id: string) =>
  requestApi<any>(apiEndpoints.userUnlock(id), {
    method: 'POST',
  })
