import { fetchJson } from '@/lib/apiClient'
import { apiEndpoints } from './endpoints'

export type ContactMessagePayload = {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  website?: string
}

export type ContactMessageResponse = {
  id: string | null
  delivered: boolean
  confirmationDelivered?: boolean
  spamFiltered?: boolean
}

export const sendContactMessage = (body: ContactMessagePayload) =>
  fetchJson<ContactMessageResponse>(apiEndpoints.contact, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
