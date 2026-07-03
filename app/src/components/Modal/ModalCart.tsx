'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from '@/components/Common/AppImage'
import { Handbag, X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from 'next/navigation'
import InlineSpinner from '@/components/Other/InlineSpinner'
import { ProductType } from '@/type/ProductType';
import { useModalCartContext } from '@/context/ModalCartContext'
import { useCart } from '@/context/CartContext'
import { useSite } from '@/context/SiteContext'
import { countdownTime } from '@/store/countdownTime'
import CountdownTimeType from '@/type/CountdownType';
import { apiEndpoints } from '@/lib/api/endpoints'
import { getPublicStoreStatus } from '@/lib/api/settings'
import { getProductVariantLabel } from '@/lib/catalog'
import { toPublicApiUrl } from '@/lib/publicApiPath'

const Icon = {
    Handbag,
    X,
} as const

const SUGGESTIONS_TIMEOUT_MS = 15000
const SUGGESTIONS_ENDPOINTS = [
    { url: `${apiEndpoints.internal.suggestionsData}?limit=4`, needsGatewayUrl: false },
    { url: `${apiEndpoints.internal.suggestionsApi}?limit=4`, needsGatewayUrl: true },
] as const

const ModalCart = ({
    serverTimeLeft,
    initialSuggestions = [],
}: {
    serverTimeLeft: CountdownTimeType
    initialSuggestions?: Array<Partial<ProductType>>
}) => {
    const router = useRouter()
    const site = useSite()
    const [timeLeft, setTimeLeft] = useState(serverTimeLeft);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(countdownTime());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const { isModalOpen, closeModalCart } = useModalCartContext();
    const { cartState, addToCart, removeFromCart, updateCart } = useCart()
    const [suggested, setSuggested] = useState<ProductType[]>(() => (initialSuggestions as ProductType[]).slice(0, 4))
    const [loadingSuggested, setLoadingSuggested] = useState<boolean>(false)
    const [errorSuggested, setErrorSuggested] = useState<string | null>(null)
    const [salesEnabled, setSalesEnabled] = useState(true)
    const [salesDisabledMessage, setSalesDisabledMessage] = useState('Tienda temporalmente en mantenimiento. Intenta más tarde.')

    const fetchSuggestedProducts = async (signal: AbortSignal): Promise<ProductType[]> => {
        for (const url of SUGGESTIONS_ENDPOINTS) {
            try {
                const requestUrl = url.needsGatewayUrl ? toPublicApiUrl(url.url) : url.url
                const res = await fetch(requestUrl, {
                    cache: 'no-store',
                    signal,
                })
                if (!res.ok) continue
                const data = await res.json()
                const items = Array.isArray(data) ? data : (data?.data ?? [])
                if (Array.isArray(items) && items.length > 0) {
                    return (items as ProductType[]).slice(0, 4)
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') throw err
            }
        }

        return []
    }

    useEffect(() => {
        getPublicStoreStatus()
            .then((status) => {
                setSalesEnabled(status?.salesEnabled !== false)
                const nextMessage = String(status?.message || '').trim()
                if (nextMessage) {
                    setSalesDisabledMessage(nextMessage)
                }
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (suggested.length > 0 || initialSuggestions.length === 0) return
        setSuggested((initialSuggestions as ProductType[]).slice(0, 4))
    }, [initialSuggestions, suggested.length])

    useEffect(() => {
        if (!isModalOpen || suggested.length > 0) return

        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), SUGGESTIONS_TIMEOUT_MS)

        const loadSuggested = async () => {
            setLoadingSuggested(true)
            try {
                const items = await fetchSuggestedProducts(controller.signal)
                setSuggested(items)
                setErrorSuggested(items.length > 0 ? null : 'No hay sugerencias disponibles por ahora.')
            } catch (err: any) {
                setSuggested([])
                setErrorSuggested(
                    err?.name === 'AbortError'
                        ? 'La carga de sugerencias tardó demasiado.'
                        : (err?.message ?? 'No se pudieron cargar sugerencias')
                )
            } finally {
                window.clearTimeout(timeoutId)
                setLoadingSuggested(false)
            }
        }

        loadSuggested()

        return () => {
            window.clearTimeout(timeoutId)
            controller.abort()
        }
    }, [isModalOpen, suggested.length])

    const handleAddToCart = (productItem: ProductType) => {
        // Desde sugerencias siempre agregamos 1 unidad, sin importar el valor por defecto del producto
        const quantityToAdd = 1
        addToCart({ ...productItem, quantityPurchase: quantityToAdd })
    };

    const handleGoToCheckout = () => {
        if (!canCheckout) return
        closeModalCart()
        router.push('/checkout')
    }
    const canCheckout = salesEnabled && cartState.cartArray.length > 0
    const checkoutButtonStyle: React.CSSProperties = canCheckout
        ? { backgroundColor: '#1f3b3b', color: '#ffffff', opacity: 1 }
        : { backgroundColor: '#7f8f90', color: '#ffffff', opacity: 1 }

    const totalCart = cartState.cartArray.reduce(
        (acc, item) => acc + Number(item.price ?? 0) * Number(item.quantity ?? 1),
        0
    )
    let [discountCart, setDiscountCart] = useState<number>(0)
    const filteredSuggested = useMemo(() => {
        const cartIdentifiers = new Set<string>()

        cartState.cartArray.forEach((item) => {
            ;[item.id, (item as any).internalId, item.slug]
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                .forEach((value) => cartIdentifiers.add(value))
        })

        return suggested.filter((product) => {
            const productIdentifiers = [product.id, product.internalId, product.slug]
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

            return !productIdentifiers.some((identifier) => cartIdentifiers.has(identifier))
        })
    }, [cartState.cartArray, suggested])
    const showSuggestionsPanel = loadingSuggested || filteredSuggested.length > 0

    const overlayRef = useRef<HTMLDivElement | null>(null)
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        pointerEvents: isModalOpen ? 'auto' : 'none',
        opacity: isModalOpen ? 1 : 0,
        visibility: isModalOpen ? 'visible' : 'hidden',
    }

    const normalizeImageSrc = (src: string) => {
        if (!src) return src
        if (src.startsWith('http://localhost:8080') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            return src.replace('http://localhost:8080', site.apiBaseUrl)
        }
        return src
    }

    const shouldUnoptimize = (src: string) => src.startsWith('data:') || src.startsWith('blob:')

    const normalizeMetaIdentity = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '')

    const genericCartMetaIdentities = new Set([
        'bolsa',
        'empaque',
        'pack',
        'package',
        'packaging',
        'paquete',
        'presentacion',
        'presentation',
    ])

    const sanitizeCartMetaValue = (value: unknown) => {
        const text = String(value ?? '').replace(/\s+/g, ' ').trim()
        if (!text || text === '/') return ''

        const identity = normalizeMetaIdentity(text)
        if (genericCartMetaIdentities.has(identity)) return ''

        return text
    }

    const getCartMetaParts = (product: ProductType & { selectedSize?: string; selectedColor?: string }) => {
        const attributes = product.attributes ?? {}
        const variantLabel =
            sanitizeCartMetaValue(product.selectedSize)
            || sanitizeCartMetaValue(product.variantLabel)
            || sanitizeCartMetaValue(attributes.variantLabel)
            || sanitizeCartMetaValue(attributes.weight)
            || sanitizeCartMetaValue(attributes.volume)
            || sanitizeCartMetaValue(attributes.size)
            || sanitizeCartMetaValue(getProductVariantLabel(product))
        const colorLabel = sanitizeCartMetaValue(product.selectedColor)
        const parts = variantLabel ? [variantLabel] : []

        if (colorLabel && normalizeMetaIdentity(colorLabel) !== normalizeMetaIdentity(variantLabel)) {
            parts.push(colorLabel)
        }

        return parts
    }

    const getCartProductImageSrc = (product: ProductType) => {
        const thumbs = Array.isArray((product as any).thumbImage) ? (product as any).thumbImage : []
        const imgs = Array.isArray(product.images) ? product.images : []
        const firstThumb = thumbs[0]
        const first = imgs[0]
        const rawSrc =
            (typeof firstThumb === 'string' ? firstThumb : (firstThumb as any)?.url) ??
            (typeof first === 'string' ? first : (first as any)?.url) ??
            '/images/product/1.webp'

        return normalizeImageSrc(rawSrc || '/images/product/1.webp')
    }

    // Si se cierra el modal y el foco quedó dentro, lo limpiamos para evitar warnings de aria-hidden
    useEffect(() => {
        if (isModalOpen) return
        const active = document.activeElement as HTMLElement | null
        if (active && overlayRef.current?.contains(active)) {
            active.blur()
        }
    }, [isModalOpen])

    return (
        <>
            <div
                className="modal-cart-block"
                ref={overlayRef}
                style={overlayStyle}
                aria-hidden={isModalOpen ? undefined : true}
                onClick={closeModalCart}
            >
                <div
                    className={`modal-cart-main flex ${showSuggestionsPanel ? 'has-suggestions' : 'cart-only'} ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    {showSuggestionsPanel && (
                        <div className="left w-1/2 border-r border-line py-6 max-md:hidden">
                            <div className="heading5 px-6 pb-3">Tambien te puede gustar</div>
                            <div className="list px-6">
                                {loadingSuggested && (
                                    <div className="flex items-center gap-2 py-4 text-secondary">
                                        <InlineSpinner size={18} className="text-black" />
                                        <span>Cargando sugerencias...</span>
                                    </div>
                                )}
                                {errorSuggested && !loadingSuggested && (
                                    <div className="py-4 text-secondary">No se pudieron cargar sugerencias.</div>
                                )}
                                {!loadingSuggested && !errorSuggested && filteredSuggested.length === 0 && (
                                    <div className="py-4 text-secondary">No hay sugerencias disponibles por ahora.</div>
                                )}
                                {filteredSuggested.map((product) => {
                                    const firstThumb = Array.isArray(product.thumbImage) ? product.thumbImage[0] : null
                                    const firstImage = Array.isArray(product.images) ? product.images[0] : null
                                    const rawSrc =
                                        (typeof firstThumb === 'string' ? firstThumb : (firstThumb as any)?.url) ??
                                        (typeof firstImage === 'string' ? firstImage : (firstImage as any)?.url) ??
                                        '/images/product/1.webp'
                                    const src = normalizeImageSrc(rawSrc)
                                    return (
                                        <div key={product.id} className='item py-5 flex items-center justify-between gap-3 border-b border-line'>
                                            <div className="infor flex items-center gap-5">
                                                <div className="bg-img w-[100px] h-[100px] flex-shrink-0 overflow-hidden">
                                                    <Image
                                                        src={src}
                                                        width={300}
                                                        height={300}
                                                        alt={product.name}
                                                        className='w-full h-full object-contain object-center'
                                                        unoptimized={shouldUnoptimize(src)}
                                                    />
                                                </div>
                                                <div className=''>
                                                    <div className="name text-button">{product.name}</div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="product-price text-title">${Number(product.price ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        <div className="product-origin-price text-title text-secondary2"><del>${Number(product.originPrice ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className="text-xl bg-white w-10 h-10 rounded-xl border border-black flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleAddToCart(product)
                                                }}
                                            >
                                                <Icon.Handbag />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    <div className={`right cart-block ${showSuggestionsPanel ? 'md:w-1/2' : 'w-full'} w-full py-6 relative overflow-hidden`}>
                        <div className="heading px-6 pb-3 flex items-center justify-between relative">
                            <div className="heading5">Carrito de compras</div>
                            <div
                                className="close-btn absolute right-6 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                onClick={closeModalCart}
                            >
                                <Icon.X size={14} />
                            </div>
                        </div>
                 
                        <div className="heading banner mt-3 px-6" />
                        <div className="list-product px-6">
                            {cartState.cartArray.length < 1 ? (
                                <div className="cart-preview-empty text-secondary">No hay productos en el carrito</div>
                            ) : (
                                cartState.cartArray.map((product) => {
                                    const imageSrc = getCartProductImageSrc(product)
                                    const metaParts = getCartMetaParts(product)
                                    return (
                                        <div key={product.id} className='cart-preview-item item py-5 border-b border-line'>
                                            <div className="cart-preview-media bg-img">
                                                <Image
                                                    src={imageSrc}
                                                    width={300}
                                                    height={300}
                                                    alt={product.name}
                                                    className='w-full h-full object-contain object-center'
                                                    unoptimized={shouldUnoptimize(imageSrc)}
                                                />
                                            </div>
                                            <div className='cart-preview-content'>
                                                <div className="cart-preview-heading">
                                                    <div className="name text-button">{product.name}</div>
                                                    <button
                                                        type="button"
                                                        className="remove-cart-btn caption1 font-semibold text-red underline cursor-pointer"
                                                        onClick={() => removeFromCart(product.id)}
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                                {metaParts.length > 0 && (
                                                    <div className="cart-preview-meta text-secondary2 capitalize">
                                                        {metaParts.join(' / ')}
                                                    </div>
                                                )}
                                                <div className="cart-preview-actions">
                                                    <div className="cart-preview-quantity flex items-center gap-2 border border-line rounded-md px-2 py-1">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease quantity"
                                                            className="text-lg px-2 disabled:text-secondary2"
                                                            onClick={() => updateCart(product.id, Math.max((product.quantity ?? 1) - 1, 1), product.selectedSize, product.selectedColor)}
                                                            disabled={(product.quantity ?? 1) <= 1}
                                                        >
                                                            -
                                                        </button>
                                                        <div className="text-button min-w-[24px] text-center">{product.quantity ?? 1}</div>
                                                        <button
                                                            type="button"
                                                            aria-label="Increase quantity"
                                                            className="text-lg px-2"
                                                            onClick={() => updateCart(product.id, (product.quantity ?? 1) + 1, product.selectedSize, product.selectedColor)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <div className="product-price text-title">
                                                        ${(Number(product.price ?? 0) * Number(product.quantity ?? 1)).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        <div className="footer-modal bg-white absolute bottom-0 left-0 w-full">
                            <div className="flex items-center justify-between pt-6 px-6">
                                    <div className="heading5">Subtotal</div>
                                <div className="heading5">${Number(totalCart ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="block-button text-center p-6">
                                <div className="flex items-center gap-4">
                                    <Link
                                        href={'/cart'}
                                        className='button-main basis-1/2 bg-white border border-black text-black text-center uppercase'
                                        onClick={closeModalCart}
                                    >
                                        Ver carrito
                                    </Link>
                                    <button
                                        type="button"
                                        className={`button-main basis-1/2 text-center uppercase ${!canCheckout ? 'cursor-not-allowed' : ''}`}
                                        onClick={handleGoToCheckout}
                                        aria-disabled={!canCheckout}
                                        style={checkoutButtonStyle}
                                    >
                                        Pagar
                                    </button>
                                </div>
                                {!salesEnabled && (
                                    <div className="mt-3 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-xs text-red text-left">
                                        {salesDisabledMessage}
                                    </div>
                                )}
                                <div onClick={closeModalCart} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">O seguir comprando</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ModalCart
