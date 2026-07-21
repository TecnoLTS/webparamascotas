import { fetchJson } from '@/lib/apiClient';
import { apiEndpoints } from './endpoints';

export interface CreateOrderData {
    id?: string;
    status?: string;
    shipping_address?: Record<string, unknown>;
    billing_address?: Record<string, unknown>;
    items: Array<{
        product_id: string;
        quantity: number;
    }>;
    delivery_method?: string;
    order_notes?: string | null;
    payment_details?: Record<string, unknown> | null;
    payment_method?: string | null;
    coupon_code?: string | null;
}

export const createOrder = async (data: CreateOrderData) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    return fetchJson<any>(apiEndpoints.orderCreate, {
        method: 'POST',
        timeoutMs: 30000,
        headers: {
            ...headers
        },
        body: JSON.stringify(data)
    });
};

export const getQuote = async (data: {
    items: any[],
    delivery_method: string,
    coupon_code?: string | null,
    discount_code?: string | null,
    shipping_address?: Record<string, unknown> | null,
}, options: { timeoutMs?: number } = {}) => {
    const controller = new AbortController()
    const timeoutMs = Math.max(1_000, options.timeoutMs ?? 15_000)
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response

    try {
        res = await fetch(apiEndpoints.internal.quote, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            signal: controller.signal,
        })
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('El cálculo tardó demasiado. Intenta nuevamente.')
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }

    const body = await res.json().catch(() => null)
    if (!res.ok) {
        const code = body?.error?.code || body?.code || ''
        const message =
            body?.error?.message
            || body?.message
            || `Error ${res.status} al calcular la cotización`

        if (code === 'STORE_SALES_DISABLED') {
            return {
                subtotal: 0,
                shipping: 0,
                total: 0,
                vat_rate: 0,
                vat_subtotal_before_discount: 0,
                vat_amount_before_discount: 0,
                vat_subtotal: 0,
                vat_amount: 0,
                mixed_vat_rates: false,
                discount_total: 0,
                storeDisabled: true,
                message
            }
        }

        throw new Error(message)
    }

    return body
};
