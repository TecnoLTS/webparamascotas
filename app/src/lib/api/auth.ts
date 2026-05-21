import { fetchJson, requestApi } from '@/lib/apiClient'
import { apiEndpoints } from './endpoints'

export interface LoginResponse {
    token?: string
    mfaRequired?: boolean
    mfaMethod?: 'email_otp' | 'recovery_code'
    user?: {
        id: string
        email: string
        name: string
        role?: 'customer' | 'admin'
    }
    message?: string
}

export interface OtpResponse {
    sent?: boolean
    delivery?: 'email'
}

export interface PasswordResetRequestResponse {
    sent?: boolean
    message?: string
}

export interface PasswordResetConfirmResponse {
    passwordReset?: boolean
    message?: string
}

export const login = (body: any) =>
    fetchJson<LoginResponse>(apiEndpoints.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })

export const register = (body: any) =>
    fetchJson<any>(apiEndpoints.auth.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })

export const requestOtp = (body: { email: string }) =>
    fetchJson<OtpResponse>(apiEndpoints.auth.requestOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })

export const verifyOtp = (body: { email: string; code: string }) =>
    fetchJson<{ verified?: boolean }>(apiEndpoints.auth.verifyOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })

export const requestPasswordReset = (body: { email: string }) =>
    requestApi<PasswordResetRequestResponse>(apiEndpoints.auth.requestPasswordReset, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then((response) => ({
        ...response.body,
        message: response.message || response.body.message,
    }))

export const confirmPasswordReset = (body: { token: string; password: string }) =>
    requestApi<PasswordResetConfirmResponse>(apiEndpoints.auth.confirmPasswordReset, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then((response) => ({
        ...response.body,
        message: response.message || response.body.message,
    }))
