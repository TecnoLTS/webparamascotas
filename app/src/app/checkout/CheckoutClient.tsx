'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from '@/components/Common/AppImage'
import CheckoutLocationPicker from '@/components/Checkout/CheckoutLocationPicker'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import { Package, Truck, Building2, Banknote } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { createOrder, getQuote } from '@/lib/api'
import { login, register, requestOtp, verifyOtp } from '@/lib/api/auth'
import { fetchJson, requestApi } from '@/lib/apiClient'
import { apiEndpoints } from '@/lib/api/endpoints'
import { getStoredSessionUser, hasCookieSessionMarker, setCookieSessionMarker, setStoredSessionUser } from '@/lib/authSession'
import { clearCheckoutDraft, isCountryEcuador, loadCheckoutDraft, normalizeCountryToEcuador, saveCheckoutDraft } from '@/lib/checkoutDraft'
import { buildLiveAvailabilityMap, fetchLiveCatalogSnapshot } from '@/lib/liveCatalog'
import { normalizeSavedAddresses } from '@/app/my-account/customerDataUtils'
import { getSiteConfig } from '@/lib/site'

const PASSWORD_MIN_LENGTH = 8
const site = getSiteConfig()

interface AddressData {
    firstName: string;
    lastName: string;
    company: string;
    documentType: string;
    documentNumber: string;
    country: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    latitude: number | null;
    longitude: number | null;
    formattedAddress: string;
    placeId: string;
    distanceKm: number | null;
    shippingZone: string;
    shippingRule: string;
    isFreeShipping: boolean;
    storeAddress: string;
    storeLatitude: number | null;
    storeLongitude: number | null;
    freeShippingRadiusKm: number | null;
}

interface SavedAddress {
    id: string;
    title: string;
    billing: AddressData;
    shipping: AddressData;
    isSame: boolean;
}

interface CheckoutProfileResponse {
    name?: string;
    email?: string;
    phone?: string;
    profile?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        documentType?: string;
        documentNumber?: string;
        businessName?: string;
    };
}

const emptyAddress: AddressData = {
    firstName: '',
    lastName: '',
    company: '',
    documentType: '',
    documentNumber: '',
    country: 'Ecuador',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    formattedAddress: '',
    placeId: '',
    distanceKm: null,
    shippingZone: '',
    shippingRule: '',
    isFreeShipping: false,
    storeAddress: '',
    storeLatitude: null,
    storeLongitude: null,
    freeShippingRadiusKm: null,
};

const ensureEcuadorAddress = (address: AddressData): AddressData => ({
    ...address,
    country: 'Ecuador',
})

const normalizeSavedAddressEntryForCheckout = (entry: unknown): SavedAddress | null => {
    const normalized = normalizeSavedAddresses([entry])[0]
    if (!normalized) return null

    return {
        id: String(normalized.id),
        title: normalized.title,
        billing: ensureEcuadorAddress({ ...emptyAddress, ...normalized.billing }),
        shipping: ensureEcuadorAddress({ ...emptyAddress, ...normalized.shipping }),
        isSame: !!normalized.isSame,
    }
}

const normalizeSavedAddressesForCheckout = (entries: unknown): SavedAddress[] => {
    if (!Array.isArray(entries)) return []
    return entries
        .map((entry) => normalizeSavedAddressEntryForCheckout(entry))
        .filter((entry): entry is SavedAddress => Boolean(entry))
}

const isAddressComplete = (address: AddressData) =>
    !!address.country.trim()
    && !!address.city.trim()
    && !!address.zip.trim()
    && !!address.street.trim()

const normalizeCoordinate = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

const hasGeoCoordinates = (address: Pick<AddressData, 'latitude' | 'longitude'>) =>
    normalizeCoordinate(address.latitude) !== null
    && normalizeCoordinate(address.longitude) !== null

const normalizeAddressComparable = (value: string | null | undefined) =>
    String(value || '').trim().toLowerCase()

const normalizeCoordinateComparable = (value: number | null | undefined) =>
    Number.isFinite(value) ? Number(value).toFixed(6) : ''

const hasSameSavedShippingLocation = (left?: Partial<AddressData> | null, right?: Partial<AddressData> | null) => {
    if (!left || !right) return false

    const sameCoordinates =
        normalizeCoordinateComparable(left.latitude) === normalizeCoordinateComparable(right.latitude)
        && normalizeCoordinateComparable(left.longitude) === normalizeCoordinateComparable(right.longitude)

    const samePlace =
        normalizeAddressComparable(left.placeId) === normalizeAddressComparable(right.placeId)
        && normalizeAddressComparable(left.formattedAddress) === normalizeAddressComparable(right.formattedAddress)

    const sameAddressText =
        normalizeAddressComparable(left.street) === normalizeAddressComparable(right.street)
        && normalizeAddressComparable(left.city) === normalizeAddressComparable(right.city)
        && normalizeAddressComparable(left.state) === normalizeAddressComparable(right.state)
        && normalizeAddressComparable(left.zip) === normalizeAddressComparable(right.zip)

    return sameCoordinates && samePlace && sameAddressText
}

const fallbackItems = [
    {
        id: 'sample-1',
        name: 'Off-The-Shoulder Blouse',
        size: 'M',
        color: 'Pink',
        quantity: 2,
        price: 32.0,
        image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=500',
    },
    {
        id: 'sample-2',
        name: 'Raglan Sleeve T-Shirt',
        size: 'XS',
        color: 'White',
        quantity: 1,
        price: 28.0,
        image: 'https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg?auto=compress&cs=tinysrgb&w=500',
    }
]

const fallbackSubtotal = fallbackItems.reduce((acc, item) => acc + item.price * item.quantity, 0)

type CheckoutSummaryImageProps = {
    src: string;
    alt: string;
}

const CHECKOUT_PLACEHOLDER_IMAGE = '/images/product/1.webp'
const ACCOUNT_ADDRESSES_STORAGE_KEY = 'userAddresses'
const LEGACY_ADDRESSES_STORAGE_KEY = 'savedAddresses'
const PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY = 'checkoutPendingAddresses'

const CheckoutSummaryImage = ({ src, alt }: CheckoutSummaryImageProps) => {
    const normalizedSrc = src || CHECKOUT_PLACEHOLDER_IMAGE
    const [imageSrc, setImageSrc] = useState(normalizedSrc)

    useEffect(() => {
        setImageSrc(normalizedSrc)
    }, [normalizedSrc])

    return (
        <Image
            src={imageSrc}
            alt={alt}
            width={80}
            height={80}
            sizes="80px"
            className="w-full h-full object-cover"
            onError={() => {
                if (imageSrc !== CHECKOUT_PLACEHOLDER_IMAGE) {
                    setImageSrc(CHECKOUT_PLACEHOLDER_IMAGE)
                }
            }}
        />
    )
}

const Checkout = () => {
    const [shippingRates, setShippingRates] = useState<{
        delivery: number
        pickup: number
        taxRate: number
        storeAddress: string
        storeLatitude: number | null
        storeLongitude: number | null
        freeShippingRadiusKm: number
        shippingKmFlatRateLimit: number
        shippingPerKmRate: number
        mapMinSearchChars: number
        mapLookupCooldownSeconds: number
        mapSessionLookupLimit: number
    }>({
        delivery: 0,
        pickup: 0,
        taxRate: 0,
        storeAddress: 'Av. de la Prensa y Juan Paz y Miño, 170104 Quito',
        storeLatitude: -0.148306,
        storeLongitude: -78.490870,
        freeShippingRadiusKm: 5,
        shippingKmFlatRateLimit: 7,
        shippingPerKmRate: 1,
        mapMinSearchChars: 6,
        mapLookupCooldownSeconds: 3,
        mapSessionLookupLimit: 12,
    })
    const [shippingRatesLoaded, setShippingRatesLoaded] = useState(false)

    const [showLogin, setShowLogin] = useState(false)
    const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
    const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('cash')
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
    const [transferSecondsLeft, setTransferSecondsLeft] = useState(600)
    const [transferOrderRef, setTransferOrderRef] = useState(() => Math.floor(1000 + Math.random() * 9000))
    const [transferReference, setTransferReference] = useState('')
    const [transferAmount, setTransferAmount] = useState('')
    const [transferProofName, setTransferProofName] = useState('')
    const [guestOrderId, setGuestOrderId] = useState<string | null>(null)
    const [orderNotes, setOrderNotes] = useState('')
    const [couponDraft, setCouponDraft] = useState('')
    const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)

    // Address management state
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string>('one-time')
    const [tempAddress, setTempAddress] = useState<AddressData>(emptyAddress)
    const [billingAddress, setBillingAddress] = useState<AddressData>(emptyAddress)
    const [useBillingSame, setUseBillingSame] = useState(true)
    const [overwriteOriginal, setOverwriteOriginal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const { cartState, clearCart, removeFromCart, updateCart } = useCart()
    const router = useRouter()
    const [availableProductsMap, setAvailableProductsMap] = useState<Map<string, number> | null>(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loginForm, setLoginForm] = useState({ email: '', password: '' })
    const [loginLoading, setLoginLoading] = useState(false)
    const [contactInfo, setContactInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        documentType: '',
        documentNumber: '',
        businessName: ''
    })
    const [registering, setRegistering] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otpCode, setOtpCode] = useState('')
    const [otpLoading, setOtpLoading] = useState(false)
    const [otpVerified, setOtpVerified] = useState(false)
    const [otpModalOpen, setOtpModalOpen] = useState(false)
    const [otpSendError, setOtpSendError] = useState<string | null>(null)
    const [orderCompletionInProgress, setOrderCompletionInProgress] = useState(false)
    const keepOneTimeSelectionRef = useRef(false)
    const [quote, setQuote] = useState<{
        subtotal: number
        shipping: number
        total: number
        vat_rate?: number
        vat_subtotal_before_discount?: number
        vat_amount_before_discount?: number
        vat_subtotal?: number
        vat_amount?: number
        discount_total?: number
        discount_code?: string | null
        discounts_applied?: Array<{ code?: string; amount?: number; type?: string; value?: number }>
        discount_rejections?: Array<{ code?: string; reason?: string; message?: string }>
        mixed_vat_rates?: boolean
        distance_km?: number | null
        shipping_rule?: 'free_radius' | 'standard_delivery' | 'pickup' | string
        is_free_shipping?: boolean
        store_address?: string
    } | null>(null)

    const mergeAddressFields = (current: AddressData, incoming?: Partial<AddressData>) => {
        if (!incoming) return current
        const next = { ...current }
        Object.entries(incoming).forEach(([key, value]) => {
            if (value === undefined || value === null) return
            if (typeof value === 'string' && value.trim() === '') return
            ;(next as any)[key] = value
        })
        next.country = normalizeCountryToEcuador(next.country)
        return next
    }

    useEffect(() => {
        const draft = loadCheckoutDraft()
        setOrderNotes(draft.note)
        setCouponDraft(String(draft.couponCode || ''))
        setAppliedCouponCode(String(draft.couponCode || '').trim().toUpperCase() || null)
        setTempAddress((prev) => mergeAddressFields(prev, {
            ...draft.shipping,
            distanceKm: prev.distanceKm,
            shippingZone: prev.shippingZone,
            shippingRule: prev.shippingRule,
            isFreeShipping: prev.isFreeShipping,
            storeAddress: prev.storeAddress,
            storeLatitude: prev.storeLatitude,
            storeLongitude: prev.storeLongitude,
            freeShippingRadiusKm: prev.freeShippingRadiusKm,
        }))
        setBillingAddress((prev) => mergeAddressFields(prev, { country: 'Ecuador' }))
    }, [])

    useEffect(() => {
        fetchJson<{
            delivery: number
            pickup: number
            tax_rate?: number
            store_address?: string
            store_latitude?: number
            store_longitude?: number
            free_shipping_radius_km?: number
            shipping_km_flat_rate_limit?: number
            shipping_per_km_rate?: number
            map_min_search_chars?: number
            map_lookup_cooldown_seconds?: number
            map_session_lookup_limit?: number
        }>(apiEndpoints.settings.publicShipping)
            .then((data) => {
                if (data && typeof data.delivery === 'number' && typeof data.pickup === 'number') {
                    setShippingRates({
                        delivery: data.delivery,
                        pickup: data.pickup,
                        taxRate: typeof data.tax_rate === 'number' ? data.tax_rate : 0,
                        storeAddress: String(data.store_address || 'Av. de la Prensa y Juan Paz y Miño, 170104 Quito'),
                        storeLatitude: typeof data.store_latitude === 'number' ? data.store_latitude : -0.148306,
                        storeLongitude: typeof data.store_longitude === 'number' ? data.store_longitude : -78.490870,
                        freeShippingRadiusKm: typeof data.free_shipping_radius_km === 'number' ? data.free_shipping_radius_km : 5,
                        shippingKmFlatRateLimit: typeof data.shipping_km_flat_rate_limit === 'number' ? data.shipping_km_flat_rate_limit : 7,
                        shippingPerKmRate: typeof data.shipping_per_km_rate === 'number' ? data.shipping_per_km_rate : 1,
                        mapMinSearchChars: typeof data.map_min_search_chars === 'number' ? data.map_min_search_chars : 6,
                        mapLookupCooldownSeconds: typeof data.map_lookup_cooldown_seconds === 'number' ? data.map_lookup_cooldown_seconds : 3,
                        mapSessionLookupLimit: typeof data.map_session_lookup_limit === 'number' ? data.map_session_lookup_limit : 12,
                    })
                }
            })
            .catch(() => {})
            .finally(() => setShippingRatesLoaded(true))
    }, [])

    useEffect(() => {
        setIsLoggedIn(hasCookieSessionMarker())
    }, [])

    const loadAuthenticatedProfile = useCallback(async () => {
        if (!hasCookieSessionMarker()) return

        const storedUser = getStoredSessionUser()
        const fallbackEmail = storedUser?.email || ''
        const fallbackName = storedUser?.name || ''

        try {
            const res = await requestApi<CheckoutProfileResponse>(apiEndpoints.userProfile, {})
            const profile = res.body.profile || {}
            const fullName = (res.body.name || fallbackName || '').trim()
            const [firstName, ...rest] = fullName.split(' ').filter(Boolean)
            const email = (res.body.email || fallbackEmail || '').trim()
            const phone = (res.body.phone || profile.phone || '').trim()

            setContactInfo((prev) => ({
                ...prev,
                firstName: profile.firstName || firstName || prev.firstName || '',
                lastName: profile.lastName || rest.join(' ') || prev.lastName || '',
                email: email || prev.email || '',
                phone: phone || prev.phone || '',
                documentType: profile.documentType || prev.documentType,
                documentNumber: profile.documentNumber || prev.documentNumber,
                businessName: profile.businessName || prev.businessName,
            }))

            setBillingAddress((prev) =>
                mergeAddressFields(prev, {
                    documentType: profile.documentType,
                    documentNumber: profile.documentNumber,
                    company: profile.businessName,
                    email: email,
                    phone: phone,
                })
            )
        } catch (err) {
            console.error('No se pudo cargar el perfil', err)
            if (fallbackName || fallbackEmail) {
                const [firstName, ...rest] = fallbackName.split(' ').filter(Boolean)
                setContactInfo((prev) => ({
                    ...prev,
                    firstName: prev.firstName || firstName || '',
                    lastName: prev.lastName || rest.join(' ') || '',
                    email: prev.email || fallbackEmail || '',
                }))
            }
        }
    }, [])

    const applySavedAddressesToCheckout = useCallback((addresses: SavedAddress[]) => {
        setSavedAddresses(addresses)

        if (addresses.length === 0) {
            setSelectedAddressId('one-time')
            return
        }

        localStorage.setItem(ACCOUNT_ADDRESSES_STORAGE_KEY, JSON.stringify(addresses))
        localStorage.setItem(LEGACY_ADDRESSES_STORAGE_KEY, JSON.stringify(addresses))

        if (keepOneTimeSelectionRef.current) {
            return
        }

        const primary = addresses[0]
        setSelectedAddressId(primary.id)
        setTempAddress(mergeAddressFields(ensureEcuadorAddress(emptyAddress), primary.shipping))
        setBillingAddress((prev) => mergeAddressFields(prev, primary.billing))
        setUseBillingSame(!!primary.isSame)
    }, [])

    const loadAuthenticatedAddresses = useCallback(async () => {
        if (!hasCookieSessionMarker()) return

        try {
            const res = await requestApi<{ addresses: unknown[] }>(apiEndpoints.userAddresses, {})
            const addresses = normalizeSavedAddressesForCheckout(res.body.addresses)

            if (addresses.length > 0) {
                applySavedAddressesToCheckout(addresses)
                localStorage.removeItem(PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY)
                return
            }

            const stored =
                localStorage.getItem(PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY)
                || localStorage.getItem(ACCOUNT_ADDRESSES_STORAGE_KEY)
                || localStorage.getItem(LEGACY_ADDRESSES_STORAGE_KEY)

            if (!stored) {
                setSavedAddresses([])
                setSelectedAddressId('one-time')
                return
            }

            const parsed = JSON.parse(stored)
            const fallbackAddresses = normalizeSavedAddressesForCheckout(parsed)
            if (fallbackAddresses.length === 0) {
                setSavedAddresses([])
                setSelectedAddressId('one-time')
                return
            }

            applySavedAddressesToCheckout(fallbackAddresses)

            await requestApi(apiEndpoints.userAddresses, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ addresses: fallbackAddresses })
            })

            localStorage.removeItem(PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY)
        } catch (err) {
            console.error('No se pudieron cargar las direcciones', err)
        }
    }, [applySavedAddressesToCheckout])

    useEffect(() => {
        if (!isLoggedIn) return
        void loadAuthenticatedProfile()
        void loadAuthenticatedAddresses()
    }, [isLoggedIn, loadAuthenticatedProfile, loadAuthenticatedAddresses])

    const handleLoginSubmit = async () => {
        if (!loginForm.email.trim() || !loginForm.password.trim()) {
            setMessage({ text: 'Ingresa tu correo y contraseña.', type: 'error' })
            return
        }
        setLoginLoading(true)
        try {
            const res = await login({ email: loginForm.email, password: loginForm.password })
            if (res.mfaRequired) {
                throw new Error('La cuenta administrativa requiere MFA y debe iniciar sesión desde el panel.')
            }
            if (!res.user) {
                throw new Error('No se pudo iniciar la sesión.')
            }
            setCookieSessionMarker()
            setStoredSessionUser(res.user)
            setIsLoggedIn(true)
            await Promise.all([loadAuthenticatedProfile(), loadAuthenticatedAddresses()])
            setShowLogin(false)
            setMessage({ text: 'Sesión iniciada correctamente.', type: 'success' })
        } catch (err: any) {
            setMessage({ text: err?.message || 'No se pudo iniciar sesión.', type: 'error' })
        } finally {
            setLoginLoading(false)
        }
    }

    useEffect(() => {
        if (!isLoggedIn) return
        if (savedAddresses.length === 0) return
        if (selectedAddressId === 'one-time') {
            if (keepOneTimeSelectionRef.current) return
            const first = savedAddresses[0]
            setSelectedAddressId(first.id)
            setTempAddress(mergeAddressFields(ensureEcuadorAddress(emptyAddress), first.shipping))
            setBillingAddress((prev) => mergeAddressFields(prev, first.billing))
            setUseBillingSame(!!first.isSame)
        }
    }, [isLoggedIn, savedAddresses, selectedAddressId])

    useEffect(() => {
        const draft = loadCheckoutDraft()
        const shippingDraftChanged =
            draft.shipping.state !== tempAddress.state
            || draft.shipping.city !== tempAddress.city
            || draft.shipping.zip !== tempAddress.zip
            || draft.shipping.country !== normalizeCountryToEcuador(tempAddress.country)
            || draft.shipping.street !== tempAddress.street
            || draft.shipping.latitude !== tempAddress.latitude
            || draft.shipping.longitude !== tempAddress.longitude
            || draft.shipping.formattedAddress !== tempAddress.formattedAddress
            || draft.shipping.placeId !== tempAddress.placeId
        const noteChanged = draft.note !== orderNotes
        const couponChanged = draft.couponCode !== couponDraft

        if (!shippingDraftChanged && !noteChanged && !couponChanged) return

        saveCheckoutDraft({
            note: orderNotes,
            couponCode: couponDraft,
            shipping: {
                country: 'Ecuador',
                state: tempAddress.state,
                city: tempAddress.city,
                zip: tempAddress.zip,
                street: tempAddress.street,
                latitude: tempAddress.latitude,
                longitude: tempAddress.longitude,
                formattedAddress: tempAddress.formattedAddress,
                placeId: tempAddress.placeId,
            },
        })
    }, [orderNotes, couponDraft, tempAddress.state, tempAddress.city, tempAddress.zip, tempAddress.country, tempAddress.street, tempAddress.latitude, tempAddress.longitude, tempAddress.formattedAddress, tempAddress.placeId])

    const refreshAvailableProducts = useCallback(async () => {
        const snapshot = await fetchLiveCatalogSnapshot(cartState.cartArray)
        const availabilityMap = buildLiveAvailabilityMap(snapshot.rawProducts)
        setAvailableProductsMap(availabilityMap)
        return availabilityMap
    }, [cartState.cartArray])

    useEffect(() => {
        let mounted = true
        const refresh = () => {
            refreshAvailableProducts()
                .then((availabilityMap) => {
                    if (!mounted) return
                    setAvailableProductsMap(availabilityMap)
                })
                .catch((err) => {
                    console.error('No se pudo cargar el catálogo para validar el carrito', err)
                })
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refresh()
            }
        }

        refresh()
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            mounted = false
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [refreshAvailableProducts])


    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target
        setTempAddress(prev => {
            const nextValue = id === 'country' ? 'Ecuador' : value
            const updated = { ...prev, [id]: nextValue, country: 'Ecuador' }
            if (useBillingSame) {
                const addressFields = {
                    firstName: updated.firstName,
                    lastName: updated.lastName,
                    country: 'Ecuador',
                    street: updated.street,
                    city: updated.city,
                    state: updated.state,
                    zip: updated.zip,
                    phone: updated.phone,
                    email: updated.email
                }
                setBillingAddress(current => ({
                    ...current,
                    ...addressFields
                }))
            }
            return updated
        })
    }

    const handleLocationAddressChange = useCallback((partial: Partial<AddressData>) => {
        setTempAddress((prev) => {
            const coordinatesChanged =
                partial.latitude !== undefined
                || partial.longitude !== undefined
                || partial.placeId !== undefined
                || partial.formattedAddress !== undefined
            const updated = ensureEcuadorAddress({
                ...prev,
                ...(coordinatesChanged
                    ? {
                        distanceKm: null,
                        shippingZone: '',
                        shippingRule: '',
                        isFreeShipping: false,
                    }
                    : {}),
                ...partial,
            })
            if (useBillingSame) {
                const addressFields = {
                    firstName: updated.firstName,
                    lastName: updated.lastName,
                    country: 'Ecuador',
                    street: updated.street,
                    city: updated.city,
                    state: updated.state,
                    zip: updated.zip,
                    phone: updated.phone,
                    email: updated.email,
                }
                setBillingAddress((current) => ({
                    ...current,
                    ...addressFields,
                }))
            }
            return updated
        })
        if (
            partial.latitude !== undefined
            || partial.longitude !== undefined
            || partial.placeId !== undefined
            || partial.formattedAddress !== undefined
        ) {
            setQuote(null)
        }
    }, [useBillingSame])

    const handleBillingAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = e.target
        const field = target.name || target.id
        if (!field) return
        setBillingAddress(prev => ({
            ...prev,
            [field]: field === 'country' ? 'Ecuador' : target.value,
            country: 'Ecuador'
        }))
    }

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target
        setContactInfo(prev => ({ ...prev, [id]: value }))
    }

    const validateContactInfo = () => {
        if (isLoggedIn) return true
        if (!contactInfo.firstName.trim() || !contactInfo.lastName.trim() || !contactInfo.email.trim() || !contactInfo.phone.trim()) {
            setMessage({ text: 'Completa nombre, apellido, correo y teléfono para continuar.', type: 'error' })
            return false
        }
        const emailOk = /\S+@\S+\.\S+/.test(contactInfo.email)
        if (!emailOk) {
            setMessage({ text: 'Ingresa un correo válido.', type: 'error' })
            return false
        }
        if (!contactInfo.password || contactInfo.password.length < PASSWORD_MIN_LENGTH) {
            setMessage({ text: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`, type: 'error' })
            return false
        }
        if (contactInfo.password !== contactInfo.confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' })
            return false
        }
        if (!contactInfo.documentType.trim() || !contactInfo.documentNumber.trim()) {
            setMessage({ text: 'Completa el tipo y número de identificación para la facturación.', type: 'error' })
            return false
        }
        return true
    }

    const validateShippingAddress = () => {
        if (deliveryMethod !== 'delivery') return true
        if (!tempAddress.formattedAddress || !hasGeoCoordinates(tempAddress)) {
            setMessage({ text: 'Selecciona tu ubicación exacta en el mapa o usa "Mi ubicación actual" para calcular el envío.', type: 'error' })
            return false
        }
        return true
    }

    const validateBillingAddress = () => {
        const docType = isLoggedIn ? billingAddress.documentType : contactInfo.documentType
        const docNumber = isLoggedIn ? billingAddress.documentNumber : contactInfo.documentNumber
        if (!docType.trim() || !docNumber.trim()) {
            if (!isLoggedIn) {
                setMessage({
                    text: 'Completa el tipo y número de identificación para la facturación.',
                    type: 'error'
                })
            }
            return false
        }
        if (deliveryMethod !== 'delivery') return true
        if (useBillingSame) return true
        if (!billingAddress.country.trim() || !billingAddress.city.trim() || !billingAddress.zip.trim() || !billingAddress.street.trim()) {
            setMessage({ text: 'Completa país, ciudad, código postal y dirección para la facturación.', type: 'error' })
            return false
        }
        if (!isCountryEcuador(billingAddress.country)) {
            setMessage({ text: 'La dirección de facturación debe estar en Ecuador.', type: 'error' })
            return false
        }
        return true
    }

    const handleRegister = async () => {
        setRegistering(true)
        try {
            const fullName = `${contactInfo.firstName} ${contactInfo.lastName}`.trim()
            const newAddress: SavedAddress = {
                id: String(Date.now()),
                title: 'Dirección principal',
                billing: {
                    ...billingAddress,
                    firstName: contactInfo.firstName,
                    lastName: contactInfo.lastName,
                    email: contactInfo.email,
                    phone: contactInfo.phone
                },
                shipping: {
                    ...ensureEcuadorAddress(tempAddress),
                    firstName: contactInfo.firstName,
                    lastName: contactInfo.lastName,
                    email: contactInfo.email,
                    phone: contactInfo.phone
                },
                isSame: useBillingSame
            }

            await register({
                name: fullName,
                email: contactInfo.email,
                phone: contactInfo.phone,
                password: contactInfo.password,
                documentType: contactInfo.documentType,
                documentNumber: contactInfo.documentNumber,
                businessName: contactInfo.businessName,
                profile: {
                    firstName: contactInfo.firstName,
                    lastName: contactInfo.lastName,
                    phone: contactInfo.phone,
                    documentType: contactInfo.documentType,
                    documentNumber: contactInfo.documentNumber,
                    businessName: contactInfo.businessName,
                },
                addresses: [newAddress],
                skipVerificationEmail: true,
                sendOtpOnCreate: true
            })
            setOtpSent(true)
            setOtpModalOpen(true)
            setOtpCode('')
            setOtpSendError(null)
            setMessage({
                text: 'Cuenta creada. Te enviamos un código al correo para verificarlo.',
                type: 'success'
            })
            localStorage.setItem(PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY, JSON.stringify([newAddress]))
        } catch (err: any) {
            setMessage({ text: err?.message || 'No se pudo crear la cuenta.', type: 'error' })
        } finally {
            setRegistering(false)
        }
    }

    const handleVerifyOtp = async () => {
        if (!otpCode.trim()) {
            setMessage({ text: 'Ingresa el código de verificación.', type: 'error' })
            return
        }
        setOtpLoading(true)
        try {
            await verifyOtp({ email: contactInfo.email, code: otpCode.trim() })
            const res = await login({ email: contactInfo.email, password: contactInfo.password })
            if (!res.user) {
                throw new Error('No se pudo iniciar la sesión tras verificar el correo.')
            }
            setCookieSessionMarker()
            setStoredSessionUser(res.user)
            setIsLoggedIn(true)
            setOtpVerified(true)
            setOtpModalOpen(false)
            const pending =
                localStorage.getItem(PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY)
                || localStorage.getItem(ACCOUNT_ADDRESSES_STORAGE_KEY)
                || localStorage.getItem(LEGACY_ADDRESSES_STORAGE_KEY)
            if (pending) {
                try {
                    const parsed = JSON.parse(pending)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        await requestApi(apiEndpoints.userAddresses, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ addresses: parsed })
                        })
                        setSavedAddresses(parsed)
                        setSelectedAddressId(parsed[0].id)
                        setTempAddress(mergeAddressFields(ensureEcuadorAddress(emptyAddress), parsed[0].shipping))
                        setBillingAddress((prev) => mergeAddressFields(prev, parsed[0].billing))
                        setUseBillingSame(!!parsed[0].isSame)
                        localStorage.setItem(ACCOUNT_ADDRESSES_STORAGE_KEY, JSON.stringify(parsed))
                        localStorage.setItem(LEGACY_ADDRESSES_STORAGE_KEY, JSON.stringify(parsed))
                        localStorage.removeItem(PENDING_CHECKOUT_ADDRESSES_STORAGE_KEY)
                    }
                } catch {
                    // ignore sync errors
                }
            }
            setMessage({ text: 'Correo verificado. Continuemos con tu compra.', type: 'success' })
            setCurrentStep(2)
        } catch (err: any) {
            setMessage({ text: err?.message || 'No se pudo verificar el código.', type: 'error' })
        } finally {
            setOtpLoading(false)
        }
    }

    const handleResendOtp = async () => {
        setOtpLoading(true)
        try {
            await requestOtp({ email: contactInfo.email })
            setOtpSendError(null)
            setMessage({
                text: 'Te enviamos un nuevo código.',
                type: 'success'
            })
        } catch (err: any) {
            const errorText = err?.message || 'No se pudo reenviar el código.'
            setOtpSendError(errorText)
        } finally {
            setOtpLoading(false)
        }
    }

    const handleConfirmStep1 = async () => {
        if (!validateContactInfo()) return
        if (!validateShippingAddress()) return
        if (!validateBillingAddress()) {
            if (isLoggedIn) {
                try {
                    if (hasCookieSessionMarker()) {
                        const res = await requestApi<{ profile?: { documentType?: string; documentNumber?: string; businessName?: string } }>(apiEndpoints.userProfile, {
                        })
                        const profile = res.body.profile || {}
                        if (profile.documentType && profile.documentNumber) {
                            setBillingAddress((prev) => mergeAddressFields(prev, {
                                documentType: profile.documentType,
                                documentNumber: profile.documentNumber,
                                company: profile.businessName
                            }))
                            return
                        }
                    }
                } catch (err) {
                    // noop: we'll show the validation error below
                }
                setMessage({
                    text: 'Tus datos de facturación no se pudieron cargar. Verifícalos en Mi cuenta.',
                    type: 'error'
                })
            }
            return
        }
        if (!isLoggedIn) {
            if (!otpVerified) {
                if (!otpSent) {
                    handleRegister()
                } else {
                    setMessage({ text: 'Ingresa el código que enviamos a tu correo para continuar.', type: 'error' })
                    setOtpModalOpen(true)
                }
                return
            }
            return
        }
        if (overwriteOriginal && selectedAddressId !== 'one-time') {
            const updated = savedAddresses.map(addr =>
                addr.id === selectedAddressId
                    ? {
                        ...addr,
                        shipping: tempAddress,
                        billing: useBillingSame
                            ? {
                                ...tempAddress,
                                documentType: billingAddress.documentType,
                                documentNumber: billingAddress.documentNumber,
                                company: billingAddress.company
                            }
                            : billingAddress,
                        isSame: useBillingSame
                    }
                    : addr
            )
            setSavedAddresses(updated)
            localStorage.setItem(ACCOUNT_ADDRESSES_STORAGE_KEY, JSON.stringify(updated))
            localStorage.setItem(LEGACY_ADDRESSES_STORAGE_KEY, JSON.stringify(updated))
        }
        setCurrentStep(2)
    }

    const normalizedCart = useMemo(
        () =>
            cartState.cartArray.map((item) => ({
                id: item.id,
                name: item.name || 'Producto',
                size: item.selectedSize || item.sizes?.[0] || '—',
                color: item.selectedColor || item.variation?.[0]?.color || '—',
                quantity: item.quantity,
                price: item.price,
                image: item.thumbImage?.[0]
                    || item.images?.[0]
                    || item.variation?.[0]?.image
                    || item.variation?.[0]?.colorImage
                    || '/images/product/1.webp',
            })),
        [cartState.cartArray]
    )

    const syncCartWithLiveAvailability = useCallback((availabilityMap: Map<string, number>, showFeedback = true) => {
        const removedItems: string[] = []
        const adjustedItems: Array<{ name: string; available: number }> = []

        normalizedCart.forEach((item) => {
            const itemId = String(item.id)
            const liveStock = availabilityMap.get(itemId)

            if (!Number.isFinite(liveStock)) {
                removeFromCart(itemId)
                removedItems.push(item.name)
                return
            }

            if ((liveStock ?? 0) <= 0) {
                removeFromCart(itemId)
                removedItems.push(item.name)
                return
            }

            if (item.quantity > (liveStock ?? 0)) {
                updateCart(itemId, liveStock ?? 0, item.size === '—' ? '' : item.size, item.color === '—' ? '' : item.color)
                adjustedItems.push({ name: item.name, available: liveStock ?? 0 })
            }
        })

        if (!showFeedback) {
            return { changed: removedItems.length > 0 || adjustedItems.length > 0, removedItems, adjustedItems }
        }

        if (removedItems.length > 0) {
            setMessage({
                text: 'Se eliminaron productos que ya no están disponibles. Revisa tu carrito.',
                type: 'error'
            })
        } else if (adjustedItems.length > 0) {
            setMessage({
                text: 'Actualizamos cantidades del carrito porque algunos productos ya no tienen el stock que mostraba la página.',
                type: 'error'
            })
        }

        return { changed: removedItems.length > 0 || adjustedItems.length > 0, removedItems, adjustedItems }
    }, [normalizedCart, removeFromCart, setMessage, updateCart])

    const quoteShippingAddress = useMemo(() => {
        if (deliveryMethod !== 'delivery' || !hasGeoCoordinates(tempAddress)) {
            return null
        }

        return {
            country: tempAddress.country,
            latitude: tempAddress.latitude,
            longitude: tempAddress.longitude,
            formattedAddress: tempAddress.formattedAddress,
            placeId: tempAddress.placeId,
        }
    }, [
        deliveryMethod,
        tempAddress.country,
        tempAddress.latitude,
        tempAddress.longitude,
        tempAddress.formattedAddress,
        tempAddress.placeId,
    ])

    const selectedSavedAddress = useMemo(
        () => savedAddresses.find((address) => address.id === selectedAddressId) || null,
        [savedAddresses, selectedAddressId],
    )

    const hasSelectedShippingLocation = useMemo(
        () => deliveryMethod === 'delivery' && hasGeoCoordinates(tempAddress),
        [deliveryMethod, tempAddress.latitude, tempAddress.longitude],
    )

    const hasSavedAddressOverride = useMemo(() => {
        if (!selectedSavedAddress || selectedAddressId === 'one-time') return false
        return !hasSameSavedShippingLocation(selectedSavedAddress.shipping, tempAddress)
    }, [selectedAddressId, selectedSavedAddress, tempAddress])

    useEffect(() => {
        if (hasSavedAddressOverride) return
        setOverwriteOriginal(false)
    }, [hasSavedAddressOverride])

    useEffect(() => {
        let cancelled = false

        const updateQuote = async () => {
            if (normalizedCart.length === 0) return;
            if (availableProductsMap) {
                const syncResult = syncCartWithLiveAvailability(availableProductsMap)
                if (syncResult.changed) {
                    return
                }
            }
            try {
                // Product pricing does not depend on the delivery coordinates. Until the
                // customer selects a location, quote the items as pickup so the backend can
                // still return its authoritative prices, VAT and discounts. Shipping and the
                // grand total remain explicitly pending in the UI.
                const quoteDeliveryMethod = deliveryMethod === 'delivery' && !quoteShippingAddress
                    ? 'pickup'
                    : deliveryMethod
                const res = await getQuote({
                    items: normalizedCart.map(i => ({ product_id: i.id, quantity: i.quantity })),
                    delivery_method: quoteDeliveryMethod,
                    coupon_code: appliedCouponCode,
                    shipping_address: quoteShippingAddress,
                });
                if (cancelled) return
                if (res?.storeDisabled) {
                    setQuote(null)
                    setMessage({
                        text: String(res?.message || 'Tienda temporalmente en mantenimiento. Intenta más tarde.'),
                        type: 'error'
                    })
                    return
                }
                setQuote(res);
            } catch (err) {
                if (cancelled) return
                const backendMessage = err instanceof Error ? err.message.trim() : ''
                if (backendMessage.includes('Producto no encontrado')) {
                    const missingId = backendMessage.split(':').pop()?.trim()
                    if (missingId) {
                        removeFromCart(String(missingId))
                        setMessage({
                            text: 'Se eliminó un producto que ya no está disponible. Revisa tu carrito.',
                            type: 'error'
                        })
                        return
                    }
                }
                if (backendMessage.includes('Stock insuficiente')) {
                    try {
                        const latestAvailability = await refreshAvailableProducts()
                        const syncResult = syncCartWithLiveAvailability(latestAvailability, false)
                        if (syncResult.changed) {
                            setMessage({
                                text: 'Actualizamos tu carrito porque el stock cambió mientras estabas en checkout.',
                                type: 'error'
                            })
                            return
                        }
                    } catch {
                        // ignore refresh errors and keep backend message below
                    }
                }
                if (backendMessage && backendMessage !== 'Error interno del servidor') {
                    setMessage({ text: backendMessage, type: 'error' })
                    return
                }
                console.error("Error fetching quote", err);
                setMessage({ text: 'No se pudo calcular el total del pedido.', type: 'error' })
            }
        };
        updateQuote();

        return () => {
            cancelled = true
        }
    }, [normalizedCart, deliveryMethod, appliedCouponCode, availableProductsMap, syncCartWithLiveAvailability, quoteShippingAddress]);

    const items = normalizedCart
    const subtotal = quote?.subtotal || 0
    const shipping = quote?.shipping || 0
    const fallbackDeliveryFee = shippingRatesLoaded ? shippingRates.delivery : 0
    const fallbackPickupFee = shippingRatesLoaded ? shippingRates.pickup : 0
    const deliveryFeeLabel = deliveryMethod === 'delivery'
        ? (quote ? shipping : fallbackDeliveryFee)
        : fallbackPickupFee
    const total = quote?.total || 0
    const vatRateValue = Number(quote?.vat_rate ?? 0)
    const vatNetSubtotal = Number(quote?.vat_subtotal ?? 0)
    const vatAmount = Number(quote?.vat_amount ?? 0)
    const vatNetSubtotalBeforeDiscount = Number(quote?.vat_subtotal_before_discount ?? vatNetSubtotal)
    const vatAmountBeforeDiscount = Number(quote?.vat_amount_before_discount ?? vatAmount)
    const discountTotal = Number(quote?.discount_total ?? 0)
    const shippingDistanceKm = Number(quote?.distance_km ?? tempAddress.distanceKm ?? 0)
    const isFreeShipping = Boolean(quote?.is_free_shipping ?? tempAddress.isFreeShipping)
    const shippingRule = String(quote?.shipping_rule ?? tempAddress.shippingRule ?? '')
    const checkoutStoreAddress = String(quote?.store_address ?? shippingRates.storeAddress ?? '').trim()
    const productsTotal = Math.max(0, Number(quote?.subtotal ?? (vatNetSubtotal + vatAmount)))
    const couponRejection = quote?.discount_rejections?.[0] || null
    const couponAppliedLabel = String(
        quote?.discount_code
        || quote?.discounts_applied?.[0]?.code
        || appliedCouponCode
        || ''
    ).trim()
    const mixedVatRates = Boolean(quote?.mixed_vat_rates)
    const vatLabel = mixedVatRates
        ? 'IVA aplicado'
        : `IVA (${vatRateValue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`

    useEffect(() => {
        if (deliveryMethod !== 'delivery' || !quoteShippingAddress || !quote) return

        const knownRules = ['free_radius', 'standard_delivery', 'km_flat_rate', 'km_per_km_rate']
        const quoteShippingRule = typeof quote.shipping_rule === 'string' ? quote.shipping_rule : ''
        const nextShippingRule = knownRules.includes(quoteShippingRule) ? quoteShippingRule : null
        setTempAddress((prev) => ({
            ...prev,
            distanceKm: quote.distance_km ?? prev.distanceKm,
            shippingZone: nextShippingRule ?? prev.shippingZone,
            shippingRule: nextShippingRule ?? prev.shippingRule,
            isFreeShipping: Boolean(quote.is_free_shipping ?? prev.isFreeShipping),
            storeAddress: quote.store_address ?? prev.storeAddress,
            storeLatitude: shippingRates.storeLatitude,
            storeLongitude: shippingRates.storeLongitude,
            freeShippingRadiusKm: shippingRates.freeShippingRadiusKm,
        }))
    }, [deliveryMethod, quoteShippingAddress, quote, shippingRates.storeLatitude, shippingRates.storeLongitude, shippingRates.freeShippingRadiusKm])

    useEffect(() => {
        if (orderCompletionInProgress) return
        if (normalizedCart.length === 0) {
            router.push('/cart')
        }
    }, [normalizedCart, orderCompletionInProgress, router])

    useEffect(() => {
        if (paymentMethod !== 'transfer') {
            setTransferSecondsLeft(600)
        }
    }, [paymentMethod])

    useEffect(() => {
        if (deliveryMethod === 'pickup') {
            setUseBillingSame(false)
        }
    }, [deliveryMethod])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const isStep1 = currentStep === 1
    const isStep2 = currentStep === 2
    const isStep3 = currentStep === 3

    const handleConfirmStep2 = () => {
        if (paymentMethod === 'transfer') {
            if (!transferReference.trim() || !transferAmount.trim()) {
                setMessage({ text: 'Ingresa la referencia y el monto de la transferencia.', type: 'error' })
                return
            }
        }
        setCurrentStep(3)
    }

    const handleFinalizeOrder = async () => {
        if (!isLoggedIn) {
            setMessage({ text: 'Debes iniciar sesión para comprar.', type: 'error' })
            return
        }
        if (!validateContactInfo()) {
            setCurrentStep(1);
            return
        }
        if (!validateShippingAddress()) {
            setCurrentStep(1)
            return
        }
        if (!validateBillingAddress()) {
            setCurrentStep(1)
            return
        }

        setLoading(true);
        setMessage(null);

        try {
            const latestAvailability = await refreshAvailableProducts()
            const syncResult = syncCartWithLiveAvailability(latestAvailability, false)
            if (syncResult.changed) {
                setMessage({
                    text: 'Actualizamos tu carrito con el stock real antes de cobrar. Revisa las cantidades y vuelve a confirmar.',
                    type: 'error'
                })
                setLoading(false)
                return
            }

            const shippingAddress = {
                ...ensureEcuadorAddress(tempAddress),
                ...contactInfo
            }
            const billingAddressPayload = (deliveryMethod === 'delivery' && useBillingSame)
                ? {
                    ...shippingAddress,
                    documentType: billingAddress.documentType,
                    documentNumber: billingAddress.documentNumber,
                    company: billingAddress.company
                }
                : { ...ensureEcuadorAddress(billingAddress), ...contactInfo }
            const orderData = {
                delivery_method: deliveryMethod,
                shipping_address: shippingAddress,
                billing_address: billingAddressPayload,
                order_notes: orderNotes.trim() || null,
                payment_details: paymentMethod === 'transfer' ? {
                    reference: transferReference,
                    amount: transferAmount,
                    proof_name: transferProofName || null
                } : null,
                payment_method: paymentMethod,
                coupon_code: appliedCouponCode,
                items: items.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity
                }))
            };

            const created = await createOrder(orderData);
            const orderId = created?.id || created?.order?.id || null
            setOrderCompletionInProgress(true)
            if (!isLoggedIn && orderId) {
                setGuestOrderId(orderId)
                setMessage({ text: `¡Pedido realizado con éxito! Tu número de pedido es ${orderId}.`, type: 'success' })
            } else {
                setMessage({ text: '¡Pedido realizado con éxito!', type: 'success' })
            }
            clearCheckoutDraft();
            clearCart();

            if (isLoggedIn) {
                router.replace('/my-account?tab=orders');
            }

        } catch (err: any) {
            const backendMessage = err?.message || ''
            if (typeof backendMessage === 'string' && backendMessage.includes('Stock insuficiente')) {
                try {
                    const latestAvailability = await refreshAvailableProducts()
                    const syncResult = syncCartWithLiveAvailability(latestAvailability, false)
                    if (syncResult.changed) {
                        setMessage({
                            text: 'Actualizamos tu carrito con el stock real. Revisa las cantidades y vuelve a confirmar.',
                            type: 'error'
                        })
                        setOrderCompletionInProgress(false)
                        return
                    }
                } catch {
                    // ignore sync errors and show backend message below
                }
            }
            setMessage({ text: err.message || 'Error al procesar el pedido', type: 'error' });
            setOrderCompletionInProgress(false)
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {message?.type === 'success' && (
                <div className={`fixed top-5 right-5 z-[200] p-4 rounded-lg shadow-2xl border ${message.type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'} animate-fadeIn`}>
                    <div className="flex items-center gap-3">
                        <Icon.CheckCircle size={24} weight="fill" />
                        <span className="font-semibold">{message.text}</span>
                        <button
                            type="button"
                            onClick={() => setMessage(null)}
                            className="ml-2 text-current/70 hover:text-current"
                            aria-label="Cerrar notificación"
                        >
                            <Icon.X size={16} weight="bold" />
                        </button>
                    </div>
                </div>
            )}
            {message?.type === 'error' && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#ef4444]">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-[#ef4444]">
                                <Icon.Warning size={22} weight="fill" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-[#111827]">Atención</h3>
                                <p className="mt-2 text-sm text-[#374151]">{message.text}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMessage(null)}
                                className="text-[#9ca3af] hover:text-[#111827]"
                                aria-label="Cerrar alerta"
                            >
                                <Icon.X size={18} weight="bold" />
                            </button>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setMessage(null)}
                                className="rounded-lg bg-[#1f3b3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2e4d4d] transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {!isLoggedIn && otpSent && !otpVerified && otpModalOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#e5e7eb]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[#111827]">Verifica tu correo</h3>
                            <button
                                type="button"
                                onClick={() => setOtpModalOpen(false)}
                                className="text-[#9ca3af] hover:text-[#111827]"
                                aria-label="Cerrar"
                            >
                                <Icon.X size={18} weight="bold" />
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-[#6b7280]">
                            {otpSendError
                                ? <>No pudimos enviar el código a <span className="font-medium text-[#111827]">{contactInfo.email}</span>. Revisa tu correo y vuelve a intentarlo con el botón de reenvío.</>
                                : <>Te enviamos un código de 6 dígitos a <span className="font-medium text-[#111827]">{contactInfo.email}</span>.</>}
                        </p>
                        {otpSendError && (
                            <div className="mt-4 rounded-xl border border-[#ef4444]/30 bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                                {otpSendError}
                            </div>
                        )}
                        <form
                            className="mt-4 space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleVerifyOtp()
                            }}
                        >
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Código de verificación"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-full border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                            />
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#1f3b3b] text-white rounded-lg px-4 py-2.5 font-medium hover:bg-[#2e4d4d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? 'Verificando...' : 'Verificar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    className="flex-1 border border-[#1f3b3b] text-[#1f3b3b] rounded-lg px-4 py-2.5 font-medium hover:bg-[#2e4d4d1a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={otpLoading}
                                >
                                    Reenviar código
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div id="header" className='relative w-full'>
                <MenuOne />
            </div>
            <div className="bg-[#f7f8fb] py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-[#111827]">Finalizar compra</h1>
                        <p className="mt-2 text-sm text-[#6b7280]">Complete su pedido en pocos pasos</p>
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            {[
                                { step: 1 as const, label: 'Envío' },
                                { step: 2 as const, label: 'Pago' },
                                { step: 3 as const, label: 'Confirmación' },
                            ].map(({ step, label }) => {
                                const active = currentStep === step
                                const done = currentStep > step
                                return (
                                    <div
                                        key={step}
                                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${active ? 'border-[#2e4d4d] bg-[#2e4d4d1a]' : 'border-[#e5e7eb]'
                                            }`}
                                    >
                                        <div
                                            className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${active || done ? 'bg-[#2e4d4d] text-white' : 'bg-[#e5e7eb] text-[#6b7280]'
                                                }`}
                                        >
                                            {done ? '✓' : step}
                                        </div>
                                        <div className={`text-sm font-medium ${active ? 'text-[#1f3b3b]' : 'text-[#6b7280]'}`}>{label}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid items-start lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {isStep1 && (
                                <>
                                    {!isLoggedIn && (
                                        <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(31,59,59,0.12)] p-6 border border-[#e5e7eb]">
                                            <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => setShowLogin(!showLogin)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[#6b7280]">¿Ya tienes cuenta?</span>
                                                    <button className="text-[#2e4d4d] hover:text-[#1f3b3b] font-medium">
                                                        Iniciar sesión
                                                    </button>
                                                </div>
                                                <Icon.CaretDown
                                                    className={`text-[#9ca3af] transition-transform ${showLogin ? 'rotate-180' : ''}`}
                                                    size={20}
                                                    weight="bold"
                                                />
                                            </div>

                                            {showLogin && (
                                                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                                                    <input
                                                        type="email"
                                                        placeholder="Email"
                                                        value={loginForm.email}
                                                        onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                                                        className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                    />
                                                    <input
                                                        type="password"
                                                        placeholder="Contraseña"
                                                        value={loginForm.password}
                                                        onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                                                        className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                    />
                                                    <button
                                                        className="sm:col-span-2 bg-[#1f3b3b] text-white rounded-lg px-4 py-2.5 font-medium hover:bg-[#2e4d4d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                                        onClick={handleLoginSubmit}
                                                        disabled={loginLoading}
                                                    >
                                                        {loginLoading ? 'Ingresando...' : 'Iniciar sesión'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(31,59,59,0.12)] p-6 border border-[#e5e7eb]">
                                        <h2 className="text-xl font-semibold text-[#111827] mb-4">Información personal</h2>
                                        {isLoggedIn ? (
                                            <div className="text-sm text-[#6b7280]">
                                                <p className="text-[#111827] font-medium">{contactInfo.firstName} {contactInfo.lastName}</p>
                                                <p>{contactInfo.email || 'Sin correo registrado'}</p>
                                                <p>{contactInfo.phone || 'Sin teléfono registrado'}</p>
                                                <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-semibold text-[#111827]">Identificación fiscal</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => router.push('/my-account')}
                                                            className="text-xs font-medium text-[#2e4d4d] hover:underline"
                                                        >
                                                            Editar
                                                        </button>
                                                    </div>
                                                    <div className="mt-1.5 space-y-0.5 text-xs text-[#374151]">
                                                        <p>{billingAddress.documentType || '—'}: {billingAddress.documentNumber || '—'}</p>
                                                        {billingAddress.company && <p>{billingAddress.company}</p>}
                                                    </div>
                                                    {(!billingAddress.documentType || !billingAddress.documentNumber) && (
                                                        <p className="mt-1.5 text-[10px] text-[#b45309]">Requerido para la factura.</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    placeholder="Nombre *"
                                                    value={contactInfo.firstName}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    placeholder="Apellido *"
                                                    value={contactInfo.lastName}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <input
                                                    type="email"
                                                    id="email"
                                                    placeholder="Email *"
                                                    value={contactInfo.email}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    placeholder="Teléfono *"
                                                    value={contactInfo.phone}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <div className="relative">
                                                    <select
                                                        id="documentType"
                                                        value={contactInfo.documentType}
                                                        onChange={handleContactChange}
                                                        className="w-full appearance-none border border-[#e5e7eb] bg-white px-4 py-2.5 pr-12 placeholder:text-[#9ca3af] rounded-lg focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                    >
                                                        <option value="">Tipo de identificación *</option>
                                                        <option value="Cédula">Cédula</option>
                                                        <option value="RUC">RUC</option>
                                                        <option value="Pasaporte">Pasaporte</option>
                                                        <option value="Otro">Otro</option>
                                                    </select>
                                                    <Icon.CaretDown
                                                        size={18}
                                                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#2e4d4d]"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="documentNumber"
                                                    placeholder="Número de identificación *"
                                                    value={contactInfo.documentNumber}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    id="businessName"
                                                    placeholder="Razón social (opcional)"
                                                    value={contactInfo.businessName}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent sm:col-span-2"
                                                />
                                                <input
                                                    type="password"
                                                    id="password"
                                                    placeholder={`Contraseña (mínimo ${PASSWORD_MIN_LENGTH} caracteres) *`}
                                                    value={contactInfo.password}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <input
                                                    type="password"
                                                    id="confirmPassword"
                                                    placeholder="Confirmar contraseña *"
                                                    value={contactInfo.confirmPassword}
                                                    onChange={handleContactChange}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <div className="sm:col-span-2 text-xs text-[#6b7280]">
                                                    Necesitas una cuenta para comprar. La cuenta se creará con estos datos.
                                                </div>
                                            </div>
                                        )}
                                        {!isLoggedIn && otpSent && !otpVerified && (
                                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-[#6b7280]">
                                                <span>Te enviamos un código a tu correo. Revísalo para continuar.</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setOtpModalOpen(true)}
                                                    className="text-[#2e4d4d] font-medium hover:underline text-left"
                                                >
                                                    Verificar correo
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(31,59,59,0.12)] p-6 border border-[#e5e7eb]">
                                        <h2 className="text-xl font-semibold text-[#111827] mb-4">Método de entrega</h2>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setDeliveryMethod('delivery')}
                                                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${deliveryMethod === 'delivery'
                                                    ? 'border-[#2e4d4d] bg-[#2e4d4d1a]'
                                                    : 'border-[#e5e7eb] hover:border-[#cbd5e1]'
                                                    }`}
                                            >
                                                <Truck className={`w-8 h-8 mb-2 ${deliveryMethod === 'delivery' ? 'text-[#2e4d4d]' : 'text-[#94a3b8]'}`} />
                                                <span className="font-medium text-[#111827]">Envío a domicilio</span>
                                                <span className="mt-1 text-sm text-[#6b7280]">
                                                    {deliveryMethod === 'delivery' && !hasSelectedShippingLocation
                                                        ? 'Selecciona tu ubicación'
                                                        : deliveryMethod === 'delivery' && quoteShippingAddress && !quote
                                                            ? 'Calculando envío...'
                                                        : `$${deliveryFeeLabel.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setDeliveryMethod('pickup')}
                                                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${deliveryMethod === 'pickup'
                                                    ? 'border-[#2e4d4d] bg-[#2e4d4d1a]'
                                                    : 'border-[#e5e7eb] hover:border-[#cbd5e1]'
                                                    }`}
                                            >
                                                <Package className={`w-8 h-8 mb-2 ${deliveryMethod === 'pickup' ? 'text-[#2e4d4d]' : 'text-[#94a3b8]'}`} />
                                                <span className="font-medium text-[#111827]">Retiro en tienda</span>
                                                <span className="text-sm text-[#6b7280] mt-1">
                                                    {fallbackPickupFee === 0 ? 'Gratis' : `$${fallbackPickupFee.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </span>
                                            </button>
                                        </div>

                                        {deliveryMethod === 'delivery' && (
                                            <div className="mt-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-medium text-[#111827]">Dirección de envío</h3>
                                                    {isLoggedIn && savedAddresses.length > 0 && (
                                                        <select
                                                            className="text-sm border border-[#e5e7eb] rounded-lg px-3 py-1.5"
                                                            value={selectedAddressId}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setSelectedAddressId(val);
                                                                if (val !== 'one-time') {
                                                                    keepOneTimeSelectionRef.current = false
                                                                    const addr = savedAddresses.find(a => a.id === val);
                                                                    if (addr) {
                                                                        setTempAddress(mergeAddressFields(ensureEcuadorAddress(emptyAddress), addr.shipping));
                                                                        setBillingAddress((prev) => mergeAddressFields(prev, addr.billing));
                                                                        setUseBillingSame(!!addr.isSame);
                                                                    }
                                                                    setQuote(null)
                                                                    setOverwriteOriginal(false);
                                                                } else {
                                                                    keepOneTimeSelectionRef.current = true
                                                                    setTempAddress(emptyAddress);
                                                                    setQuote(null)
                                                                }
                                                            }}
                                                        >
                                                            {savedAddresses.map(addr => (
                                                                <option key={addr.id} value={addr.id}>{addr.title}</option>
                                                            ))}
                                                            <option value="one-time">Usar otra dirección (un solo uso)</option>
                                                        </select>
                                                    )}
                                                </div>

                                                {isLoggedIn ? (
                                                    <>
                                                        <div className="text-sm text-[#6b7280] space-y-1">
                                                            {tempAddress.formattedAddress ? (
                                                                <>
                                                                    <p className="text-[#111827] font-medium">
                                                                        {tempAddress.firstName ? `${tempAddress.firstName} ${tempAddress.lastName}` : 'Dirección de envío'}
                                                                    </p>
                                                                    <p>{tempAddress.formattedAddress}</p>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#64748b]">
                                                                        {tempAddress.city && <span>{tempAddress.city}</span>}
                                                                        {tempAddress.state && <span>{tempAddress.state}</span>}
                                                                        {tempAddress.zip && <span>CP {tempAddress.zip}</span>}
                                                                    </div>
                                                                    {tempAddress.distanceKm != null && (
                                                                        <p className="text-xs text-[#64748b]">
                                                                            A {tempAddress.distanceKm.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km del local
                                                                        </p>
                                                                    )}
                                                                </>
                                                            ) : hasSelectedShippingLocation ? (
                                                                <p className="text-[#6b7280]">
                                                                    Se está usando la ubicación registrada de esta dirección para calcular el envío.
                                                                </p>
                                                            ) : (
                                                                <p className="text-[#6b7280]">
                                                                    Usa el mapa debajo para seleccionar tu ubicación de envío.
                                                                </p>
                                                            )}
                                                        </div>

                                                        {savedAddresses.length > 0 && selectedAddressId !== 'one-time' && tempAddress.formattedAddress && (
                                                            <div className="flex items-center gap-2 p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
                                                                <input
                                                                    type="checkbox"
                                                                    id="overwrite"
                                                                    checked={overwriteOriginal}
                                                                    onChange={(e) => setOverwriteOriginal(e.target.checked)}
                                                                    className="w-4 h-4 cursor-pointer text-[#2e4d4d] focus:ring-[#2e4d4d]"
                                                                />
                                                                <label htmlFor="overwrite" className="text-sm cursor-pointer text-[#6b7280]">Actualizar esta dirección guardada con los nuevos cambios</label>
                                                            </div>
                                                        )}

                                                        <CheckoutLocationPicker
                                                            address={tempAddress}
                                                            storeLocation={{
                                                                address: shippingRates.storeAddress,
                                                                latitude: shippingRates.storeLatitude,
                                                                longitude: shippingRates.storeLongitude,
                                                                freeShippingRadiusKm: shippingRates.freeShippingRadiusKm,
                                                            }}
                                                            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                                            usageConfig={{
                                                                minSearchLength: shippingRates.mapMinSearchChars,
                                                                lookupCooldownSeconds: shippingRates.mapLookupCooldownSeconds,
                                                                maxLookupsPerSession: shippingRates.mapSessionLookupLimit,
                                                            }}
                                                            sessionStorageNamespace="checkout"
                                                            onAddressChange={handleLocationAddressChange}
                                                        />

                                                        {selectedSavedAddress && selectedAddressId !== 'one-time' && hasSavedAddressOverride && (
                                                            <div className="rounded-lg border border-[#dbe4ea] bg-white p-4 text-sm">
                                                                <p className="font-medium text-[#111827]">Ubicación temporal para este pedido</p>
                                                                <p className="mt-1 text-[#6b7280]">
                                                                    Cambiaste la ubicación del mapa respecto a la dirección guardada. Puedes usar esta nueva ubicación solo para este pedido o actualizar la dirección registrada.
                                                                </p>
                                                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setTempAddress(mergeAddressFields(ensureEcuadorAddress(emptyAddress), selectedSavedAddress.shipping))
                                                                            setOverwriteOriginal(false)
                                                                            setQuote(null)
                                                                        }}
                                                                        className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#f8fafc]"
                                                                    >
                                                                        Mantener ubicación registrada
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOverwriteOriginal(true)}
                                                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                                                            overwriteOriginal
                                                                                ? 'bg-[#1f3b3b] text-white'
                                                                                : 'border border-[#1f3b3b] text-[#1f3b3b] hover:bg-[#1f3b3b] hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {overwriteOriginal ? 'Se actualizará la dirección guardada' : 'Actualizar dirección guardada'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="rounded-lg border border-[#dbe4ea] bg-white p-4 text-sm">
                                                            <p className="font-medium text-[#111827]">Estado del envío</p>
                                                            {!hasSelectedShippingLocation && (
                                                                <p className="mt-2 text-[#6b7280]">
                                                                    Selecciona tu punto exacto en el mapa para calcular el costo de envío y validar si aplica la cobertura gratis.
                                                                </p>
                                                            )}
                                                            {hasSelectedShippingLocation && quote && (
                                                                <div className="mt-2 space-y-1 text-[#475569]">
                                                                    <p>
                                                                        Distancia al local: <span className="font-medium text-[#111827]">
                                                                            {shippingDistanceKm.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                                                                        </span>
                                                                    </p>
                                                                    <p>
                                                                        {isFreeShipping
                                                                            ? `Tu dirección está dentro del radio gratis de ${shippingRates.freeShippingRadiusKm.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} km.`
                                                                            : shippingRule === 'km_flat_rate'
                                                                                ? `Tarifa plana de $${shippingRates.delivery.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hasta ${shippingRates.shippingKmFlatRateLimit.toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} km.`
                                                                                : shippingRule === 'km_per_km_rate'
                                                                                    ? `Tarifa plana + $${shippingRates.shippingPerKmRate.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por km adicional.`
                                                                                    : 'Tu dirección está fuera del radio gratis; se aplica la tarifa normal de envío.'}
                                                                    </p>
                                                                    {checkoutStoreAddress && (
                                                                        <p className="text-xs text-[#64748b]">Base operativa: {checkoutStoreAddress}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {hasSelectedShippingLocation && !quote && (
                                                                <p className="mt-2 text-[#6b7280]">
                                                                    {selectedAddressId !== 'one-time' && !hasSavedAddressOverride
                                                                        ? 'Calculando tarifa con base en tu ubicación registrada...'
                                                                        : 'Calculando tarifa con base en tu ubicación seleccionada...'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="rounded-lg border border-[#dbe4ea] bg-white p-4 text-sm">
                                                        <p className="text-[#6b7280]">
                                                            <a onClick={() => setShowLogin(true)} className="text-[#2e4d4d] font-medium underline cursor-pointer hover:text-[#1a302f]">Inicia sesión</a> para seleccionar tu ubicación exacta y calcular el costo de envío.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {deliveryMethod === 'pickup' && (
                                            <div className="mt-6 p-4 bg-[#2e4d4d1a] rounded-lg border border-[#2e4d4d]/30">
                                                <p className="text-sm text-[#374151]">
                                                    <strong>Retiro en tienda:</strong><br />
                                                    {checkoutStoreAddress || 'Av. de la Prensa y Juan Paz y Miño, 170104 Quito'}. El horario de retiro se coordinará por nuestros canales oficiales al confirmar el pedido.
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-6 space-y-2">
                                            <h3 className="font-medium text-[#111827]">Nota del pedido</h3>
                                            <textarea
                                                placeholder="Entrega, referencias o indicaciones adicionales"
                                                rows={3}
                                                value={orderNotes}
                                                onChange={(e) => setOrderNotes(e.target.value)}
                                                className="w-full border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                            />
                                            <p className="text-sm text-[#6b7280]">
                                                Esta nota se guarda en el pedido y la verá el equipo al preparar la compra.
                                            </p>
                                        </div>

                                        <div className="mt-6 space-y-6">
                                            {deliveryMethod === 'delivery' && (
                                                <div className="flex items-center gap-2 p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
                                                    <input
                                                        type="checkbox"
                                                        id="billingSame"
                                                        checked={useBillingSame}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked
                                                            setUseBillingSame(checked)
                                                            if (checked) {
                                                                const addressFields = {
                                                                    firstName: tempAddress.firstName,
                                                                    lastName: tempAddress.lastName,
                                                                    country: tempAddress.country,
                                                                    street: tempAddress.street,
                                                                    city: tempAddress.city,
                                                                    state: tempAddress.state,
                                                                    zip: tempAddress.zip,
                                                                    phone: tempAddress.phone,
                                                                    email: tempAddress.email
                                                                }
                                                                setBillingAddress(current => ({
                                                                    ...current,
                                                                    ...addressFields
                                                                }))
                                                            }
                                                        }}
                                                        className="w-4 h-4 cursor-pointer text-[#2e4d4d] focus:ring-[#2e4d4d]"
                                                    />
                                                    <label htmlFor="billingSame" className="text-sm cursor-pointer text-[#6b7280]">
                                                        Usar esta misma dirección para la facturación
                                                    </label>
                                                </div>
                                            )}

                                            {!useBillingSame && (
                                                <div className="space-y-4">
                                                    <h3 className="font-medium text-[#111827]">Dirección de facturación</h3>
                                                    <div className="grid sm:grid-cols-2 gap-4">
                                                        <select
                                                            name="country"
                                                            value={billingAddress.country}
                                                            onChange={handleBillingAddressChange}
                                                            className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent sm:col-span-2 bg-white"
                                                        >
                                                            <option value="Ecuador">Ecuador</option>
                                                        </select>
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            placeholder="Ciudad *"
                                                            value={billingAddress.city}
                                                            onChange={handleBillingAddressChange}
                                                            className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                        />
                                                        <input
                                                            type="text"
                                                            name="zip"
                                                            placeholder="Código Postal *"
                                                            value={billingAddress.zip}
                                                            onChange={handleBillingAddressChange}
                                                            className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                        />
                                                        <input
                                                            type="text"
                                                            name="street"
                                                            placeholder="Calle y número *"
                                                            value={billingAddress.street}
                                                            onChange={handleBillingAddressChange}
                                                            className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent sm:col-span-2"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                             
                                    </div>
                                </>
                            )}

                            {isStep2 && (
                                <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(31,59,59,0.12)] p-6 border border-[#e5e7eb]">
                                    <h2 className="text-xl font-semibold text-[#111827] mb-4">Método de pago</h2>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setPaymentMethod('transfer')}
                                            className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${paymentMethod === 'transfer'
                                                ? 'border-[#2e4d4d] bg-[#2e4d4d1a]'
                                                : 'border-[#e5e7eb] hover:border-[#cbd5e1]'
                                                }`}
                                        >
                                            <Building2 className={`w-5 h-5 ${paymentMethod === 'transfer' ? 'text-[#2e4d4d]' : 'text-[#94a3b8]'}`} />
                                            <span className="font-medium text-[#111827]">Transferencia bancaria</span>
                                        </button>

                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${paymentMethod === 'cash'
                                                ? 'border-[#2e4d4d] bg-[#2e4d4d1a]'
                                                : 'border-[#e5e7eb] hover:border-[#cbd5e1]'
                                                }`}
                                        >
                                            <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-[#2e4d4d]' : 'text-[#94a3b8]'}`} />
                                            <span className="font-medium text-[#111827]">Pago en efectivo</span>
                                        </button>
                                    </div>

                                    {paymentMethod === 'transfer' && (
                                        <div className="mt-6 p-4 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-[#374151] font-medium">Transferencia bancaria</p>
                                            </div>
                                            <p className="text-sm text-[#374151]">
                                                <strong>Datos bancarios:</strong>
                                            </p>
                                            <div className="space-y-3 text-sm text-[#374151]">
                                                <div>
                                                    <p className="font-medium text-[#111827]">Banco Pichincha</p>
                                                    <p>Cuenta de ahorro: 2212851809</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#111827]">Banco Pacífico</p>
                                                    <p>Cuenta de ahorro: 1056034091</p>
                                                </div>
                                                <div>
                                                    <p>A nombre de: Glaymel Vasquez</p>
                                                    <p>Cédula: 1759687682</p>
                                                </div>
                                                <div>
                                                    <p>Concepto: Pedido #{transferOrderRef}</p>
                                                    <p>
                                                        Envía el comprobante a{' '}
                                                        <a
                                                            href={`mailto:${site.contact.email}`}
                                                            className="font-medium text-[#2e4d4d] hover:underline"
                                                        >
                                                            {site.contact.email}
                                                        </a>
                                                        {' '}o al WhatsApp{' '}
                                                        <a
                                                            href={`https://wa.me/${site.contact.whatsappNumber}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-[#2e4d4d] hover:underline"
                                                        >
                                                            {site.contact.whatsappLabel}
                                                        </a>
                                                        .
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Referencia de pago"
                                                    value={transferReference}
                                                    onChange={(e) => setTransferReference(e.target.value)}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Monto pagado"
                                                    value={transferAmount}
                                                    onChange={(e) => setTransferAmount(e.target.value)}
                                                    className="border border-[#e5e7eb] placeholder:text-[#9ca3af] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#2e4d4d]/60 focus:border-transparent"
                                                />
                                                <label className="sm:col-span-2 border border-dashed border-[#2e4d4d] bg-white rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#f8fafc] transition-colors">
                                                    <span className="w-9 h-9 rounded-full bg-[#2e4d4d]/10 text-[#2e4d4d] flex items-center justify-center">
                                                        <Icon.UploadSimple size={18} weight="bold" />
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-[#111827]">Adjuntar comprobante (opcional, recomendado)</p>
                                                        <p className="text-xs text-[#6b7280]">
                                                            {transferProofName ? transferProofName : 'PNG, JPG o PDF'}
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => setTransferProofName(e.target.files?.[0]?.name || '')}
                                                        className="hidden"
                                                        accept=".png,.jpg,.jpeg,.pdf"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'cash' && (
                                        <div className="mt-6 p-4 bg-[#fef9c3] rounded-lg border border-[#fde68a]">
                                            <p className="text-sm text-[#374151]">
                                                El pago se realizará al momento de {deliveryMethod === 'pickup' ? 'recoger' : 'recibir'} el pedido.
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-6 flex justify-between">
                                        <button
                                            className="text-sm font-medium text-[#1f3b3b] border border-[#1f3b3b] rounded-lg px-4 py-2 hover:bg-[#2e4d4d1a] transition-colors"
                                            onClick={() => setCurrentStep(1)}
                                        >
                                            Volver a envío
                                        </button>
                                        <button
                                            className="bg-[#1f3b3b] text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-[#2e4d4d] transition-colors"
                                            onClick={handleConfirmStep2}
                                        >
                                            Ir a resumen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isStep3 && (
                                <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(31,59,59,0.12)] p-6 border border-[#e5e7eb]">
                                    <h2 className="text-xl font-semibold text-[#111827] mb-6">Confirmación de Pedido</h2>
                                    {!isLoggedIn && guestOrderId && (
                                        <div className="mb-6 p-4 rounded-xl border border-[#d1fae5] bg-[#ecfdf5] text-[#065f46] text-sm font-medium">
                                            Tu número de pedido es <span className="font-bold">{guestOrderId}</span>. Guárdalo para seguimiento.
                                        </div>
                                    )}

                                    <div className="grid sm:grid-cols-2 gap-8 mb-8">
                                        <div>
                                            <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-3">Contacto</h3>
                                            <p className="text-[#111827] font-medium">{contactInfo.firstName} {contactInfo.lastName}</p>
                                            <p className="text-sm text-[#6b7280]">{contactInfo.email}</p>
                                            <p className="text-sm text-[#6b7280]">{contactInfo.phone}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-3">Entrega</h3>
                                            {deliveryMethod === 'pickup' ? (
                                                <p className="text-sm text-[#374151]">Retiro en tienda (Gratis)</p>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-[#6b7280]">{tempAddress.formattedAddress || `${tempAddress.street}, ${tempAddress.city}, ${tempAddress.zip}`}</p>
                                                    {tempAddress.distanceKm != null && (
                                                        <p className="text-xs text-[#64748b] mt-1">{tempAddress.distanceKm.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km del local</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-3">Método de Pago</h3>
                                            <p className="text-[#111827] font-medium">
                                                {paymentMethod === 'transfer' && 'Transferencia Bancaria'}
                                                {paymentMethod === 'cash' && 'Pago en Efectivo'}
                                            </p>
                                            {paymentMethod === 'transfer' && (
                                                <div className="text-sm text-[#6b7280] mt-2 space-y-1">
                                                    <p>Referencia: {transferReference || '—'}</p>
                                                    <p>Monto: {transferAmount ? `$${Number(transferAmount).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p>
                                                    {transferProofName && <p>Comprobante: {transferProofName}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-8">
                                        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                                            <Icon.CheckCircle weight="fill" />
                                            Revisa que toda la información sea correcta antes de confirmar.
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center pt-6 border-t border-[#e5e7eb]">
                                        <button
                                            className="text-sm font-medium text-[#1f3b3b] hover:underline"
                                            onClick={() => setCurrentStep(2)}
                                        >
                                            ← Volver a pago
                                        </button>
                                        <button
                                            className="bg-[#1f3b3b] text-white rounded-lg px-8 py-3 font-bold hover:bg-[#2e4d4d] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleFinalizeOrder}
                                            disabled={loading}
                                        >
                                            {loading ? 'Procesando...' : 'Finalizar Compra'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-1 lg:self-start lg:sticky lg:top-32">
                            <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(31,59,59,0.12)] p-6 border border-[#e5e7eb] lg:max-h-[calc(100vh-9rem)] lg:flex lg:flex-col">
                                <h2 className="text-xl font-semibold text-[#111827] mb-4">Resumen del pedido</h2>

                                <div className="space-y-4 mb-6 lg:overflow-y-auto lg:pr-1">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#f3f4f6] flex-shrink-0">
                                                <CheckoutSummaryImage
                                                    src={item.image}
                                                    alt={item.name}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-medium text-[#111827] truncate">{item.name || 'Producto'}</h3>
                                                        {(item.size !== '—' || item.color !== '—') && (
                                                            <p className="text-xs text-[#6b7280] mt-1">
                                                                {[item.size, item.color].filter((val) => val && val !== '—').join(' / ') || '—'}
                                                            </p>
                                                        )}
                                                        <span className="text-xs text-[#6b7280] mt-1 inline-block">x{item.quantity}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-[#111827] text-right whitespace-nowrap">
                                                        ${(item.price * item.quantity).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-[#e5e7eb] pt-4 space-y-2 lg:mt-auto bg-white">
                                    <div className="pb-3 mb-1 border-b border-[#e5e7eb] space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <label htmlFor="checkout-coupon" className="text-sm font-medium text-[#111827]">
                                                Cupón
                                            </label>
                                            {couponAppliedLabel && discountTotal > 0 && (
                                                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                                                    {couponAppliedLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                id="checkout-coupon"
                                                type="text"
                                                value={couponDraft}
                                                onChange={(event) => setCouponDraft(event.target.value.toUpperCase())}
                                                placeholder="Ej: BIENVENIDA10"
                                                className="min-w-0 flex-1 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm uppercase tracking-wide text-[#111827] placeholder:normal-case placeholder:tracking-normal placeholder:text-[#9ca3af] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2e4d4d]/60"
                                            />
                                            {appliedCouponCode ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAppliedCouponCode(null)
                                                        setCouponDraft('')
                                                    }}
                                                    className="shrink-0 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm font-medium text-[#374151] hover:border-[#111827] hover:text-[#111827]"
                                                >
                                                    Quitar
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const normalized = couponDraft.trim().toUpperCase()
                                                        if (!normalized) {
                                                            setMessage({ text: 'Ingresa un cupón para aplicarlo.', type: 'error' })
                                                            return
                                                        }
                                                        setAppliedCouponCode(normalized)
                                                    }}
                                                    className="shrink-0 rounded-lg bg-[#1f3b3b] px-3 py-2 text-sm font-medium text-white hover:bg-[#2e4d4d]"
                                                >
                                                    Aplicar
                                                </button>
                                            )}
                                        </div>
                                        {couponRejection?.message && appliedCouponCode && (
                                            <p className="text-xs text-[#b45309]">
                                                {couponRejection.message}
                                            </p>
                                        )}
                                        {!couponRejection?.message && couponAppliedLabel && discountTotal > 0 && (
                                            <p className="text-xs text-green-700">
                                                Cupón aplicado correctamente al pedido.
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                                        <span className="text-[#6b7280]">Subtotal sin IVA</span>
                                        <span className="text-[#111827] text-right tabular-nums">${vatNetSubtotalBeforeDiscount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                                        <span className="text-[#6b7280]">{vatLabel}</span>
                                        <span className="text-[#111827] text-right tabular-nums">${vatAmountBeforeDiscount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {discountTotal > 0 && (
                                        <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                                            <span className="text-[#6b7280]">Descuento</span>
                                            <span className="text-green-600 text-right tabular-nums">-${discountTotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-[#eef2f7] pt-2 mt-2">
                                        <span className="text-sm font-medium text-[#111827]">Total productos</span>
                                        <span className="text-base font-semibold text-[#111827] text-right tabular-nums">
                                            ${productsTotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="border-t border-[#e5e7eb] pt-3 mt-3 space-y-2">
                                        <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                                        <span className="text-[#6b7280]">Envío</span>
                                        <span className="text-[#111827] text-right tabular-nums">
                                            {deliveryMethod === 'delivery' && !quoteShippingAddress
                                                ? 'Selecciona ubicación'
                                                : (shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
                                        </span>
                                        </div>
                                        {deliveryMethod === 'delivery' && quoteShippingAddress && quote && (
                                            <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-xs">
                                                <span className="text-[#6b7280]">
                                                    {shippingRule === 'free_radius' ? 'Radio gratis aplicado' :
                                                     shippingRule === 'km_flat_rate' ? 'Tarifa plana por distancia' :
                                                     shippingRule === 'km_per_km_rate' ? 'Tarifa por km adicional' :
                                                     'Tarifa normal por distancia'}
                                                </span>
                                                <span className="text-[#111827] text-right tabular-nums">
                                                    {shippingDistanceKm.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-[#e5e7eb] pt-3 mt-3">
                                        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                                            <span className="text-lg font-semibold text-[#111827]">Total + envío</span>
                                            <span className="text-lg font-semibold text-[#111827] text-right tabular-nums">
                                                {deliveryMethod === 'delivery' && !quoteShippingAddress
                                                    ? 'Pendiente'
                                                    : `$${total.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="w-full mt-6 bg-[#1f3b3b] text-white rounded-lg px-6 py-3 font-medium hover:bg-[#2e4d4d] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        if (currentStep === 1) {
            handleConfirmStep1()
        } else if (currentStep === 2) {
            handleConfirmStep2()
        } else if (currentStep === 3) {
                                            handleFinalizeOrder()
                                        }
                                    }}
                                    disabled={(currentStep === 3 && loading) || (currentStep === 1 && registering)}
                                >
                                    {currentStep === 3
                                        ? (loading ? 'Procesando...' : 'Finalizar compra')
                                        : (currentStep === 1 && !isLoggedIn
                                            ? (registering ? 'Creando cuenta...' : 'Crear cuenta y continuar')
                                            : 'Continuar')}
                                </button>

                                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#6b7280]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span>Pago seguro y encriptado</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default Checkout
