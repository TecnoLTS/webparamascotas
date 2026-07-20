'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import SwiperCore from 'swiper/core'
import {
  ArrowCounterClockwise,
  CheckCircle,
  CreditCard,
  Info,
  ListBullets,
  Minus,
  Package,
  Plus,
  Star,
  Truck,
  X,
} from '@phosphor-icons/react/dist/ssr'
import 'swiper/css/bundle'
import { ProductType } from '@/type/ProductType'
import Product from '../Product'
import Rate from '@/components/Other/Rate'
import ModalSizeguide from '@/components/Modal/ModalSizeguide'
import ShareMenu from '@/components/Product/ShareMenu'
import { useCart } from '@/context/CartContext'
import { useModalCartContext } from '@/context/ModalCartContext'
import {
  getProductReviewCount,
  getProductSku,
  getProductVariantDisplayInfo,
  getProductVariantLabel,
  getProductVariants,
  hasRealReviews,
} from '@/lib/catalog'
import { getBrandSeoPath } from '@/lib/seoUrls'
import {
  fetchLiveCatalogSnapshot,
  findLiveCatalogProduct,
  getLiveProductAvailableStock,
  resolveLiveSelectedVariant,
} from '@/lib/liveCatalog'
import {
  getProductVariantAxes,
  getVariantColorValue,
  getVariantSizeValue,
} from '@/lib/catalogAttributes'
import {
  getAvailableVariantAxisOptions,
  getVariantSelectionFromProduct,
  reconcileVariantSelection,
  resolveVariantFromSelection,
  type VariantSelection,
} from '@/lib/variantSelection'
import { getProductImageAlt } from '@/lib/productImageAlt'
import type { ProductReview, ProductReviewSummary } from '@/lib/api/productReviews'

const Icon = {
  ArrowCounterClockwise,
  CheckCircle,
  CreditCard,
  Info,
  ListBullets,
  Minus,
  Package,
  Plus,
  Star,
  Truck,
  X,
} as const

const normalizeOptionValue = (value?: string | null) => (value ?? '').trim().toLowerCase()
const normalizeDetailText = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

const normalizeSpecKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const areVariantSelectionsEqual = (left: VariantSelection, right: VariantSelection) => {
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]))
  return keys.every((key) => normalizeOptionValue(left[key as keyof VariantSelection]) === normalizeOptionValue(right[key as keyof VariantSelection]))
}

interface Props {
  data: Array<ProductType>
  relatedProducts?: Array<ProductType>
  productId: string | number | null
  reviews?: ProductReview[]
  reviewSummary?: ProductReviewSummary
}

const Default: React.FC<Props> = ({ data, relatedProducts = [], productId, reviews = [], reviewSummary }) => {
  const router = useRouter()
  const popupSwiperRef = useRef<SwiperCore | null>(null)

  const [openPopupImg, setOpenPopupImg] = useState(false)
  const [openSizeGuide, setOpenSizeGuide] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [activeVariantSelection, setActiveVariantSelection] = useState<VariantSelection>({})
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description')
  const [quantity, setQuantity] = useState(1)
  const [liveProducts, setLiveProducts] = useState(data)
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null)
  const [isStockRefreshing, setIsStockRefreshing] = useState(false)

  const { addToCart, updateCart, cartState } = useCart()
  const { openModalCart } = useModalCartContext()

  const requestedId = typeof productId === 'string' ? productId : String(productId ?? '')
  const productFamily = useMemo(() => findLiveCatalogProduct(liveProducts, requestedId), [liveProducts, requestedId])
  const variantProducts = useMemo(() => (productFamily ? getProductVariants(productFamily) : []), [productFamily])
  const defaultVariant = useMemo(
    () => (productFamily ? resolveLiveSelectedVariant(productFamily, { requestedId }) : null),
    [productFamily, requestedId],
  )
  const variantAxes = useMemo(() => (productFamily ? getProductVariantAxes(productFamily) : []), [productFamily])
  const availableVariantAxes = useMemo(
    () => getAvailableVariantAxisOptions(variantProducts, variantAxes, activeVariantSelection),
    [activeVariantSelection, variantAxes, variantProducts],
  )
  const activeColor = activeVariantSelection.color || ''
  const setActiveAxisValue = useCallback((axis: keyof VariantSelection, value: string) => {
    setActiveVariantSelection((current) => ({ ...current, [axis]: value }))
  }, [])
  const genericVariantOptions = useMemo(
    () => variantProducts.map((product) => ({
      id: product.id,
      label: getProductVariantLabel(product) || product.name,
    })),
    [variantProducts],
  )
  const showGenericVariantSelector = variantProducts.length > 1 && variantAxes.length === 0
  const activeVariant = useMemo(() => {
    if (!productFamily || !defaultVariant) return null
    return resolveVariantFromSelection(
      variantProducts,
      defaultVariant,
      variantAxes,
      activeVariantSelection,
      showGenericVariantSelector,
    )
  }, [activeVariantSelection, defaultVariant, productFamily, showGenericVariantSelector, variantAxes, variantProducts])
  const defaultVariantStock = getLiveProductAvailableStock(defaultVariant)
  const availableStock = getLiveProductAvailableStock(activeVariant)
  const hasVariantChoices = variantProducts.length > 1
  const totalFamilyStock = variantProducts.reduce((sum, variant) => sum + getLiveProductAvailableStock(variant), 0)
  const visibleReviews = reviews
  const verifiedReviewCount = Number(reviewSummary?.count ?? visibleReviews.length)
  const verifiedReviewAverage = Number(reviewSummary?.average ?? 0)
  const showReviewSummary = verifiedReviewCount > 0 || (productFamily ? hasRealReviews(productFamily) : false)
  const reviewCount = verifiedReviewCount > 0 ? verifiedReviewCount : (productFamily ? getProductReviewCount(productFamily) : 0)
  const reviewAverage = verifiedReviewCount > 0 ? verifiedReviewAverage : (productFamily?.rate ?? 0)

  useEffect(() => {
    setLiveProducts(data)
  }, [data])

  const refreshLiveCatalog = useCallback(async () => {
    const snapshot = await fetchLiveCatalogSnapshot(data.flatMap(getProductVariants))
    setLiveProducts(snapshot.groupedProducts)
    return findLiveCatalogProduct(snapshot.groupedProducts, requestedId)
  }, [data, requestedId])

  const refreshSelectedVariant = useCallback(async () => {
    const refreshedFamily = await refreshLiveCatalog()
    if (!refreshedFamily) {
      setQuantity(0)
      setAvailabilityNotice('Este producto ya no está disponible en la tienda.')
      return null
    }

    const refreshedVariant = resolveLiveSelectedVariant(refreshedFamily, {
      requestedId,
      preferredVariantId: activeVariant?.id ?? defaultVariant?.id ?? null,
      preferredVariantLabel: getProductVariantLabel(activeVariant ?? defaultVariant ?? refreshedFamily),
      strictPreferredMatch: true,
    })
    if (!refreshedVariant) {
      setQuantity(0)
      setAvailabilityNotice('La variante seleccionada ya no está disponible.')
      return null
    }
    const refreshedStock = getLiveProductAvailableStock(refreshedVariant)

    if (refreshedStock <= 0) {
      setQuantity(0)
      setAvailabilityNotice('Esta variante ya no tiene stock disponible.')
      return null
    }

    setQuantity((current) => {
      if (current <= 0) return 1
      return Math.min(current, refreshedStock)
    })
    setAvailabilityNotice(null)
    return {
      family: refreshedFamily,
      variant: refreshedVariant,
      stock: refreshedStock,
    }
  }, [activeVariant?.id, defaultVariant?.id, refreshLiveCatalog, requestedId])

  useEffect(() => {
    if (!openPopupImg) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPopupImg(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPopupImg])

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveCatalog().catch(() => {})
      }
    }
    const handleFocusRefresh = () => {
      refreshLiveCatalog().catch(() => {})
    }

    window.addEventListener('focus', handleFocusRefresh)
    document.addEventListener('visibilitychange', handleVisibilityRefresh)

    return () => {
      window.removeEventListener('focus', handleFocusRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityRefresh)
    }
  }, [refreshLiveCatalog])

  useEffect(() => {
    if (!defaultVariant || !productFamily) {
      setQuantity(0)
      return
    }
    setQuantity(defaultVariantStock > 0 ? 1 : 0)
    setActiveVariantSelection(getVariantSelectionFromProduct(defaultVariant, variantAxes, showGenericVariantSelector))
    setPhotoIndex(0)
  }, [defaultVariant?.id, defaultVariantStock, productFamily?.id, showGenericVariantSelector, variantAxes])

  useEffect(() => {
    if (!activeVariant) return
    const nextSelection = getVariantSelectionFromProduct(activeVariant, variantAxes, showGenericVariantSelector)
    setActiveVariantSelection((current) => areVariantSelectionsEqual(current, nextSelection) ? current : nextSelection)
  }, [activeVariant?.id, showGenericVariantSelector, variantAxes])

  useEffect(() => {
    if (showGenericVariantSelector || availableVariantAxes.length === 0) return
    setActiveVariantSelection((current) => reconcileVariantSelection(current, availableVariantAxes))
  }, [availableVariantAxes, showGenericVariantSelector])

  useEffect(() => {
    setQuantity((current) => {
      if (availableStock <= 0) return 0
      if (current <= 0) return 1
      return Math.min(current, availableStock)
    })
  }, [availableStock, activeVariant?.id])

  useEffect(() => {
    if (openPopupImg) {
      popupSwiperRef.current?.slideTo(photoIndex, 0)
    }
  }, [openPopupImg, photoIndex])

  const productType = (productFamily?.productType ?? '').trim().toLowerCase()
  const isClothing = productType === 'ropa'
  const categoryLabel = (productFamily?.category ?? '').trim().toLowerCase()
  const isFoodCategory = ['alimento', 'premio', 'snack'].some((word) => categoryLabel.includes(word) || productType.includes(word))
  const sku = activeVariant ? getProductSku(activeVariant) : ''
  const price = Number(activeVariant?.price ?? 0)
  const originPrice = Number(activeVariant?.originPrice ?? 0)
  const hasSale = Boolean(activeVariant?.sale || productFamily?.sale) && originPrice > price
  const percentSale = hasSale ? Math.floor(100 - ((price / originPrice) * 100)) : 0

  const pageSettings = productFamily?.pageSettings ?? {
    deliveryEstimate: '14 de enero - 18 de enero',
    viewerCount: 38,
    freeShippingThreshold: 75,
    supportHours: '8:30 AM a 10:00 PM',
    returnDays: 100,
  }

  const attributeLabels: Record<string, Record<string, string>> = {
    alimento: {
      flavor: 'Sabor',
      target: 'Etapa',
      species: 'Especie',
    },
    ropa: {
      size: 'Talla',
      material: 'Material',
      color: 'Color',
      gender: 'Genero de la prenda',
      species: 'Mascota',
    },
    accesorios: {
      size: 'Tamaño',
      color: 'Color',
      material: 'Material',
      usage: 'Uso',
      species: 'Especie',
      presentation: 'Presentación',
    },
    cuidado: {
      weight: 'Contenido',
      range: 'Rango recomendado',
      presentation: 'Formato',
      dosage: 'Dosis',
      volume: 'Volumen',
      packaging: 'Empaque',
      activeIngredient: 'Ingrediente activo',
      usage: 'Uso',
      species: 'Especie',
    },
    salud: {
      weight: 'Contenido',
      range: 'Rango recomendado',
      presentation: 'Formato',
      dosage: 'Dosis',
      volume: 'Volumen',
      packaging: 'Empaque',
      activeIngredient: 'Ingrediente activo',
      usage: 'Uso',
      species: 'Especie',
    },
  }

  const attributeRows = useMemo(() => {
    const attributes = activeVariant?.attributes ?? {}
    const labels = attributeLabels[productType] ?? attributeLabels[categoryLabel] ?? {}

    if (isFoodCategory) {
      const presentationLabel = normalizeDetailText(
        attributes.presentation
        || productFamily?.attributes?.presentation
        || 'Presentacion'
      )
      const labelSource = activeVariant ?? productFamily
      const contentValue = normalizeDetailText(
        attributes.weight
        || attributes.volume
        || (labelSource ? getProductVariantLabel(labelSource) : '')
      )
      const foodRows = [
        { key: 'presentationContent', label: presentationLabel || 'Presentación', value: contentValue },
        { key: 'flavor', label: 'Sabor', value: attributes.flavor },
        { key: 'target', label: 'Etapa / rango', value: attributes.target || attributes.age || attributes.range },
        { key: 'species', label: 'Especie', value: attributes.species },
      ]

      return foodRows.filter((item) => normalizeDetailText(item.value) !== '')
    }

    return Object.entries(labels)
      .map(([key, label]) => {
        let value: unknown = attributes[key]
        if (key === 'size' && !value && activeVariant) value = getVariantSizeValue(activeVariant)
        return { key, label, value }
      })
      .filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
  }, [activeVariant, categoryLabel, isFoodCategory, productFamily, productType])

  const productImages = Array.isArray((activeVariant as any)?.images)
    ? (activeVariant as any).images.map((img: any) => (typeof img === 'string' ? img : img?.url ?? '')).filter(Boolean)
    : []
  const thumbImages = Array.isArray((activeVariant as any)?.thumbImage)
    ? (activeVariant as any).thumbImage.map((img: any) => (typeof img === 'string' ? img : img?.url ?? '')).filter(Boolean)
    : []
  const variationImages = (activeVariant?.variation ?? [])
    .flatMap((variation) => [variation.image, variation.colorImage])
    .filter((img): img is string => typeof img === 'string' && img.length > 0)
  const galleryImages = Array.from(new Set([...productImages, ...variationImages])).filter(Boolean)
  const resolvedGalleryImages = galleryImages.length > 0
    ? galleryImages
    : (thumbImages.length > 0 ? thumbImages : ['/images/product/1.webp'])
  const colorAxisValues = variantAxes.find((axisInfo) => axisInfo.axis === 'color')?.values ?? []
  const colorOptions = useMemo(
    () => colorAxisValues.map((color) => {
      const matchingVariant = variantProducts.find((product) => normalizeOptionValue(getVariantColorValue(product)) === normalizeOptionValue(color))
      const variationMatch = (matchingVariant?.variation ?? []).find((item) => normalizeOptionValue(item.color) === normalizeOptionValue(color))
      return {
        color,
        colorCode: variationMatch?.colorCode || '',
        image: variationMatch?.colorImage || variationMatch?.image || '',
      }
    }),
    [colorAxisValues, variantProducts],
  )
  const currentGalleryImage = resolvedGalleryImages[photoIndex] ?? resolvedGalleryImages[0] ?? '/images/product/1.webp'
  const getGalleryAlt = (image: string, index: number, kind = 'imagen') =>
    activeVariant
      ? getProductImageAlt(activeVariant, image, `${kind} ${index + 1}`)
      : (productFamily ? getProductImageAlt(productFamily, image, `${kind} ${index + 1}`) : `Imagen de producto ${index + 1}`)

  const variantDisplayInfo = useMemo(
    () => productFamily ? getProductVariantDisplayInfo(productFamily) : { label: 'Opciones', values: [] },
    [productFamily],
  )
  const variantDisplayValues = variantDisplayInfo.values

  const petLabel = productFamily?.gender === 'dog'
    ? 'Perros'
    : productFamily?.gender === 'cat'
      ? 'Gatos'
      : ''
  const formattedCategory = [productFamily?.category, petLabel]
    .filter(Boolean)
    .join(' · ')
  const brandPath = productFamily?.brand ? getBrandSeoPath(productFamily.brand) : null
  const descriptionText =
    activeVariant?.description?.trim()
    || productFamily?.description?.trim()
    || 'Producto publicado en ParaMascotasEC con información de precio, disponibilidad y presentaciones según stock vigente.'

  const specificationRows = useMemo(() => {
    const rows = [
      { key: 'brand', label: 'Marca', value: activeVariant?.brand || productFamily?.brand },
      { key: 'category', label: 'Categoría', value: formattedCategory },
      { key: 'species', label: 'Especie', value: petLabel },
      { key: 'sku', label: 'SKU', value: sku },
      { key: 'price', label: 'Precio', value: price > 0 ? `USD ${price.toFixed(2)}` : '' },
      { key: 'stock', label: hasVariantChoices ? 'Stock de variante' : 'Disponibilidad', value: availableStock > 0 ? `${availableStock} en stock` : 'Sin stock' },
      { key: 'familyStock', label: 'Stock total', value: hasVariantChoices ? `${totalFamilyStock} en la familia` : '' },
      { key: 'variants', label: 'Variantes', value: variantProducts.length > 1 ? `${variantProducts.length} opciones` : 'Producto único' },
      { key: 'presentations', label: variantDisplayInfo.label, value: variantDisplayValues.join(', ') },
      {
        key: 'expiration',
        label: 'Fecha de expiración',
        value: activeVariant?.expirationDate
          || activeVariant?.inventory?.expiration?.date
          || activeVariant?.attributes?.expirationDate
          || '',
      },
      ...attributeRows,
    ]
    const seen = new Set<string>()

    return rows.filter((row) => {
      const value = row.value === undefined || row.value === null ? '' : String(row.value).trim()
      if (!value) return false

      const key = normalizeSpecKey(row.label)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [
    activeVariant?.attributes,
    activeVariant?.brand,
    activeVariant?.expirationDate,
    activeVariant?.inventory?.expiration?.date,
    attributeRows,
    availableStock,
    formattedCategory,
    hasVariantChoices,
    petLabel,
    price,
    productFamily?.brand,
    sku,
    totalFamilyStock,
    variantDisplayInfo.label,
    variantDisplayValues,
    variantProducts.length,
  ])

  const addVariantToCart = useCallback((variantToAdd: ProductType, stockToUse: number) => {
    const quantityToAdd = Math.min(Math.max(quantity ?? 1, 1), stockToUse)
    const existingItem = cartState.cartArray.find((item) => item.id === variantToAdd.id)
    const variantLabel = getProductVariantLabel(variantToAdd)
    const selectedColor = activeColor || getVariantColorValue(variantToAdd)

    if (!existingItem) {
      addToCart({ ...variantToAdd, quantityPurchase: quantityToAdd })
      updateCart(variantToAdd.id, quantityToAdd, variantLabel, selectedColor)
      return
    }

    const nextQuantity = Math.min((existingItem.quantity ?? 0) + quantityToAdd, stockToUse)
    updateCart(variantToAdd.id, nextQuantity, variantLabel, selectedColor)
  }, [activeColor, addToCart, cartState.cartArray, quantity, updateCart])

  const handleAddToCart = async () => {
    if (!activeVariant || availableStock <= 0) {
      return
    }

    setIsStockRefreshing(true)
    try {
      const liveSelection = await refreshSelectedVariant()
      if (!liveSelection) {
        return
      }

      addVariantToCart(liveSelection.variant, liveSelection.stock)
      openModalCart()
    } finally {
      setIsStockRefreshing(false)
    }
  }

  const handleBuyNow = async () => {
    if (!activeVariant || availableStock <= 0) {
      return
    }

    setIsStockRefreshing(true)
    try {
      const liveSelection = await refreshSelectedVariant()
      if (!liveSelection) {
        return
      }

      addVariantToCart(liveSelection.variant, liveSelection.stock)
      router.push('/cart')
    } finally {
      setIsStockRefreshing(false)
    }
  }

  if (!productFamily || !defaultVariant || !activeVariant) {
    return (
      <div className="container py-16 text-center">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8">
          <h1 className="heading5">Producto no disponible</h1>
          <p className="mt-3 text-secondary">
            Este producto ya no está publicado o se quedó sin stock.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="button-main mt-6 inline-flex items-center justify-center"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="product-detail default">
      <div className="featured-product underwear md:py-20 py-10">
        <div className="container grid md:grid-cols-2 gap-x-10 gap-y-8">
          <div className="list-img w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="order-2 w-full sm:order-1 sm:w-[84px] sm:flex-shrink-0">
                <div className="flex gap-3 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
                  {resolvedGalleryImages.map((image, index) => {
                    const isActive = photoIndex === index
                    return (
                      <button
                        type="button"
                        key={`${image}-thumb-${index}`}
                        onClick={() => {
                          setPhotoIndex(index)
                        }}
                        className={`w-[72px] flex-shrink-0 overflow-hidden rounded-xl border bg-white transition-all sm:w-full ${
                          isActive ? 'border-black shadow-sm' : 'border-line opacity-80'
                        }`}
                        aria-label={`Ver imagen ${index + 1} de ${productFamily.name}`}
                        aria-pressed={isActive}
                      >
                        <Image
                          src={image}
                          width={240}
                          height={300}
                          alt={getGalleryAlt(image, index, 'miniatura')}
                          sizes="72px"
                          quality={85}
                          unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                          className="w-full aspect-[4/5] object-contain bg-white"
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="order-1 min-w-0 flex-1 sm:order-2">
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-2xl bg-white"
                  onClick={() => setOpenPopupImg(true)}
                  aria-label={`Abrir imagen principal de ${productFamily.name}`}
                >
                  <Image
                    src={currentGalleryImage}
                    width={1200}
                    height={1400}
                    alt={getGalleryAlt(currentGalleryImage, photoIndex, 'vista principal')}
                    sizes="(min-width: 1024px) 500px, (min-width: 640px) calc(100vw - 180px), 100vw"
                    quality={90}
                    unoptimized={currentGalleryImage.startsWith('data:') || currentGalleryImage.startsWith('blob:')}
                    className="w-full aspect-[4/5] object-contain bg-white"
                  />
                </button>
              </div>
            </div>

            <div
              className={`popup-img ${openPopupImg ? 'open' : ''}`}
              onClick={() => setOpenPopupImg(false)}
              aria-hidden={!openPopupImg}
            >
              <button
                type="button"
                className="close-popup-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenPopupImg(false)
                }}
                aria-label="Cerrar visor de imagen"
              >
                <Icon.X weight="bold" />
              </button>
              <div className="popup-img-dialog" onClick={(event) => event.stopPropagation()}>
                <Swiper
                  spaceBetween={0}
                  slidesPerView={1}
                  modules={[Navigation]}
                  navigation
                  loop={resolvedGalleryImages.length > 1}
                  className="popupSwiper"
                  initialSlide={photoIndex}
                  onSwiper={(swiper) => {
                    popupSwiperRef.current = swiper
                  }}
                >
                  {resolvedGalleryImages.map((image, index) => (
                    <SwiperSlide key={`${image}-zoom-${index}`}>
                      <Image
                        src={image}
                        width={1400}
                        height={1600}
                        alt={getGalleryAlt(image, index, 'detalle ampliado')}
                        sizes="(min-width: 1024px) 70vw, 90vw"
                        quality={92}
                        unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                        className="w-full aspect-[4/5] object-contain bg-white rounded-xl"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          </div>

          <div className="product-infor w-full">
            <div className="flex gap-4">
              <div>
                {productFamily.brand && brandPath && (
                  <Link className="caption2 text-secondary font-semibold uppercase hover:text-[var(--blue)]" href={brandPath}>
                    {productFamily.brand}
                  </Link>
                )}
                <h1 className="heading4 mt-1">{productFamily.name}</h1>
                {hasVariantChoices && (
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-surface px-3 py-1 font-semibold text-secondary">
                      {variantProducts.length} variantes
                    </span>
                    <span className="rounded-full bg-surface px-3 py-1 font-semibold text-secondary">
                      {totalFamilyStock} unidades totales
                    </span>
                    <span className="rounded-full bg-surface px-3 py-1 font-semibold text-secondary">
                      {availableStock} de la variante seleccionada
                    </span>
                  </div>
                )}
              </div>
            </div>

            {showReviewSummary && (
              <div className="flex items-center mt-3 gap-2">
                <Rate currentRate={reviewAverage} size={14} />
                <span className="caption1 text-secondary">({reviewCount} reseñas)</span>
              </div>
            )}

            <div className="mt-5 pb-6 border-b border-line">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="product-price heading5">${price.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                {hasSale && (
                  <>
                    <div className="w-px h-4 bg-line"></div>
                    <div className="product-origin-price font-normal text-secondary2">
                      <del>${originPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del>
                    </div>
                    <div className="product-sale caption2 font-semibold bg-green px-3 py-0.5 inline-block rounded-full">
                      -{percentSale}%
                    </div>
                  </>
                )}
              </div>
              <div className="desc text-secondary mt-3">{descriptionText}</div>

              {attributeRows.length > 0 && (
                <div className="mt-4 p-4 bg-surface border border-line rounded-xl">
                  <div className="text-title mb-3">Detalles del producto</div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {attributeRows.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-baseline gap-2 text-left"
                      >
                        <span className="text-secondary text-left">{item.label}</span>
                        <span className="font-semibold text-left">{String(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="list-action mt-6">
              {availableVariantAxes.map((axisInfo, axisIndex) => {
                const activeAxisValue = activeVariantSelection[axisInfo.axis] || ''
                return (
                  <div key={axisInfo.axis} className={`${axisIndex > 0 ? 'mt-5' : ''}`}>
                    <div className="heading flex items-center justify-between gap-3">
                      <div className="text-title">{axisInfo.label}: <span className="text-title size">{activeAxisValue}</span></div>
                      {isClothing && axisInfo.axis === 'size' && (
                        <>
                          <div
                            className="caption1 size-guide text-red underline cursor-pointer whitespace-nowrap"
                            onClick={() => setOpenSizeGuide(true)}
                          >
                            Guia de tallas
                          </div>
                          <ModalSizeguide data={activeVariant} isOpen={openSizeGuide} onClose={() => setOpenSizeGuide(false)} />
                        </>
                      )}
                    </div>
                    <div className="list-size flex items-center gap-2 flex-wrap mt-3">
                      {axisInfo.values.map((value, index) => {
                        const isActive = normalizeOptionValue(activeAxisValue) === normalizeOptionValue(value)
                        if (axisInfo.axis === 'color') {
                          const item = colorOptions.find((option) => normalizeOptionValue(option.color) === normalizeOptionValue(value)) || {
                            color: value,
                            colorCode: '',
                            image: '',
                          }
                          return item.colorCode ? (
                            <button
                              type="button"
                              key={`${axisInfo.axis}-${value}-${index}`}
                              onClick={() => setActiveAxisValue(axisInfo.axis, value)}
                              className={`color-item w-12 h-12 rounded-full border duration-300 relative flex items-center justify-center ${isActive ? 'border-black scale-105' : 'border-line'}`}
                              aria-label={`Color ${value}`}
                            >
                              <span className="w-10 h-10 rounded-full block" style={{ backgroundColor: item.colorCode || '#d9d9d9' }} />
                              <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">
                                {value}
                              </div>
                            </button>
                          ) : (
                            <button
                              type="button"
                              key={`${axisInfo.axis}-${value}-${index}`}
                              onClick={() => setActiveAxisValue(axisInfo.axis, value)}
                              className={`px-3 py-2 flex items-center justify-center text-button rounded-full bg-white border border-line ${isActive ? 'active' : ''}`}
                              aria-label={`Color ${value}`}
                            >
                              {value}
                            </button>
                          )
                        }

                        return (
                          <button
                            type="button"
                            className={`size-item px-3 py-2 flex items-center justify-center text-button rounded-full bg-white border border-line ${isActive ? 'active' : ''}`}
                            key={`${axisInfo.axis}-${value}-${index}`}
                            onClick={() => setActiveAxisValue(axisInfo.axis, value)}
                          >
                            {value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {showGenericVariantSelector && (
                <div className="choose-size mt-5">
                  <div className="heading flex items-center justify-between gap-3">
                    <div className="text-title">Variante: <span className="text-title size">{getProductVariantLabel(activeVariant) || activeVariant?.name || ''}</span></div>
                  </div>
                  <div className="list-size flex items-center gap-2 flex-wrap mt-3">
                    {genericVariantOptions.map((option) => {
                      const isActive = normalizeOptionValue(activeVariantSelection.__variant) === normalizeOptionValue(option.label)
                      return (
                        <button
                          type="button"
                          className={`size-item px-3 py-2 flex items-center justify-center text-button rounded-full bg-white border border-line ${isActive ? 'active' : ''}`}
                          key={option.id}
                          onClick={() => setActiveAxisValue('__variant', option.label)}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                {sku && (
                  <div className="rounded-xl border border-line p-4 bg-white">
                    <div className="caption1 text-secondary">SKU</div>
                    <div className="text-title mt-1">{sku}</div>
                  </div>
                )}
                <div className="rounded-xl border border-line p-4 bg-white">
                  <div className="caption1 text-secondary">{hasVariantChoices ? 'Stock de variante' : 'Disponibilidad'}</div>
                  <div className="text-title mt-1">{availableStock > 0 ? `${availableStock} en stock` : 'Sin stock'}</div>
                </div>
                {hasVariantChoices && (
                  <div className="rounded-xl border border-line p-4 bg-white">
                    <div className="caption1 text-secondary">Stock total</div>
                    <div className="text-title mt-1">{totalFamilyStock} en la familia</div>
                  </div>
                )}
              </div>

              <div className="text-title mt-5">Cantidad:</div>
              <div className="choose-quantity flex items-center lg:justify-between gap-5 gap-y-3 mt-3 flex-wrap">
                <div className="quantity-block md:p-3 max-md:py-1.5 max-md:px-3 flex items-center justify-between rounded-lg border border-line sm:w-[180px] w-[120px] flex-shrink-0">
                  <Icon.Minus
                    size={20}
                    onClick={() => setQuantity((current) => current <= 1 ? current : current - 1)}
                    className={`cursor-pointer ${quantity <= 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                  <div className="body1 font-semibold">{quantity}</div>
                  <Icon.Plus
                    size={20}
                    onClick={() => setQuantity((current) => current >= availableStock ? current : current + 1)}
                    className={`cursor-pointer ${quantity >= availableStock || availableStock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div
                  onClick={availableStock > 0 ? handleAddToCart : undefined}
                  className={`button-main w-full text-center bg-white text-black border border-black ${availableStock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Agregar al carrito
                </div>
              </div>

              <div className="button-block mt-5">
                <div
                  className={`button-main w-full text-center ${availableStock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={availableStock > 0 ? handleBuyNow : undefined}
                >
                  Comprar ahora
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-5 pb-6 border-b border-line">
                <div className="rounded-xl border border-line p-4 bg-surface">
                  <div className="caption1 text-secondary">Categoría</div>
                  <div className="text-title mt-1">{formattedCategory}</div>
                </div>
                <div className="rounded-xl border border-line p-4 bg-surface">
                  <div className="caption1 text-secondary">Entrega estimada</div>
                  <div className="text-title mt-1">{pageSettings.deliveryEstimate}</div>
                </div>
              </div>

              <div className="flex items-center lg:gap-20 gap-8 mt-5">
                <ShareMenu product={activeVariant} />
              </div>
            </div>
          </div>
        </div>

        <div className="container mt-10">
          <div className="product-tabs pb-10">
            <div
              className="tab-headers inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_6px_20px_rgba(15,23,42,0.05)]"
              role="tablist"
              aria-label="Información del producto"
            >
              <button
                type="button"
                id="product-tab-description"
                role="tab"
                aria-selected={activeTab === 'description'}
                aria-controls="product-tabpanel-description"
                className={`inline-flex min-h-11 flex-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 ${activeTab === 'description'
                  ? 'bg-[var(--blue)] text-white'
                  : 'text-secondary hover:bg-surface hover:text-black'
                  }`}
                onClick={() => setActiveTab('description')}
              >
                <Icon.Info size={19} weight="bold" aria-hidden="true" />
                Descripción
              </button>
              <button
                type="button"
                id="product-tab-specifications"
                role="tab"
                aria-selected={activeTab === 'specifications'}
                aria-controls="product-tabpanel-specifications"
                className={`inline-flex min-h-11 flex-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 ${activeTab === 'specifications'
                  ? 'bg-[var(--blue)] text-white'
                  : 'text-secondary hover:bg-surface hover:text-black'
                  }`}
                onClick={() => setActiveTab('specifications')}
              >
                <Icon.ListBullets size={19} weight="bold" aria-hidden="true" />
                Especificaciones
              </button>
              {visibleReviews.length > 0 && (
                <button
                  type="button"
                  id="product-tab-reviews"
                  role="tab"
                  aria-selected={activeTab === 'reviews'}
                  aria-controls="product-tabpanel-reviews"
                  className={`inline-flex min-h-11 flex-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 ${activeTab === 'reviews'
                    ? 'bg-[var(--blue)] text-white'
                    : 'text-secondary hover:bg-surface hover:text-black'
                    }`}
                  onClick={() => setActiveTab('reviews')}
                >
                  <Icon.Star size={19} weight="bold" aria-hidden="true" />
                  Reseñas
                </button>
              )}
            </div>

            {activeTab === 'description' ? (
              <div
                id="product-tabpanel-description"
                role="tabpanel"
                aria-labelledby="product-tab-description"
                className="mt-6 overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_18px_50px_rgba(15,23,42,0.055)] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
              >
                <article className="p-6 sm:p-8 lg:p-10">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white text-[var(--blue)]" aria-hidden="true">
                    <Icon.Info size={24} weight="duotone" />
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">
                    Conoce este producto
                  </p>
                  <h2 className="heading4 mt-2 max-w-3xl text-black">
                    {productFamily.name}{productFamily.gender === 'dog' ? ' para perros' : productFamily.gender === 'cat' ? ' para gatos' : ''}
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-secondary">{descriptionText}</p>
                  <dl className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {specificationRows.slice(0, 5).map((row) => (
                      <div key={`desc-${row.key}`} className="rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.035)]">
                        <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-secondary">{row.label}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-black">{String(row.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>

                <aside className="border-t border-line bg-white p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10" aria-labelledby="useful-details-title">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-line bg-white text-[var(--blue)]" aria-hidden="true">
                      <Icon.Package size={24} weight="duotone" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">Información rápida</p>
                      <h3 id="useful-details-title" className="text-title mt-0.5">Detalles útiles</h3>
                    </div>
                  </div>
                  <dl className="mt-6 divide-y divide-line">
                    {specificationRows
                      .filter((row) => ['stock', 'familyStock', 'variants', 'presentations', 'expiration'].includes(row.key))
                      .slice(0, 4)
                      .map((row) => (
                        <div key={`useful-${row.key}`} className="flex min-h-14 items-center justify-between gap-4 py-3.5">
                          <dt className="flex items-center gap-2.5 text-sm text-secondary">
                            <Icon.CheckCircle size={19} weight="duotone" className="flex-none text-[var(--blue)]" aria-hidden="true" />
                            {row.label}
                          </dt>
                          <dd className="text-right text-sm font-semibold text-black">{String(row.value)}</dd>
                        </div>
                      ))}
                  </dl>
                </aside>
              </div>
            ) : activeTab === 'reviews' ? (
              <div id="product-tabpanel-reviews" role="tabpanel" aria-labelledby="product-tab-reviews" className="mt-6 rounded-[28px] border border-line bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.055)] sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="heading5">Reseñas verificadas</h2>
                    <div className="mt-2 flex items-center gap-2 text-secondary">
                      <Rate currentRate={reviewAverage} size={14} />
                      <span>{reviewAverage.toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 · {reviewCount} reseñas</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  {visibleReviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-line bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{review.authorName || 'Cliente verificado'}</div>
                          {review.createdAt && (
                            <time className="caption1 text-secondary" dateTime={review.createdAt}>
                              {new Date(review.createdAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </time>
                          )}
                        </div>
                        <Rate currentRate={review.rating} size={14} />
                      </div>
                      {review.title && <h3 className="text-title mt-4">{review.title}</h3>}
                      <p className="mt-3 text-secondary leading-7">{review.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div id="product-tabpanel-specifications" role="tabpanel" aria-labelledby="product-tab-specifications" className="mt-6 overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
                {specificationRows.length > 0 ? (
                  <dl className="grid sm:grid-cols-2">
                    {specificationRows.map((item) => (
                    <div
                      key={`spec-${item.key}`}
                      className="flex min-h-20 items-start justify-between gap-4 border-b border-line p-5 text-left last:border-b-0 sm:items-center sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(2n)]:border-r-0"
                    >
                      <dt className="flex items-center gap-2 text-sm text-secondary">
                        <Icon.CheckCircle size={18} weight="duotone" className="flex-none text-[var(--blue)]" aria-hidden="true" />
                        {item.label}
                      </dt>
                      <dd className="max-w-[55%] break-words text-right text-sm font-semibold text-black">{String(item.value)}</dd>
                    </div>
                    ))}
                  </dl>
                ) : (
                  <div className="p-6 text-secondary">Este producto aún no tiene especificaciones adicionales cargadas.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="container mt-2">
          <div className="grid overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)] md:grid-cols-3 md:divide-x md:divide-line">
            <div className="flex items-start gap-4 border-b border-line p-5 sm:p-6 md:border-b-0">
              <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-line bg-white text-[var(--blue)]" aria-hidden="true">
                <Icon.Truck size={25} weight="duotone" />
              </span>
              <div>
                <div className="text-title">Envíos y entregas</div>
                <div className="mt-1.5 text-sm leading-6 text-secondary">Envíos en zonas habilitadas con tiempos informados.</div>
              </div>
            </div>
            <div className="flex items-start gap-4 border-b border-line p-5 sm:p-6 md:border-b-0">
              <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-line bg-white text-[var(--blue)]" aria-hidden="true">
                <Icon.CreditCard size={25} weight="duotone" />
              </span>
              <div>
                <div className="text-title">Pagos seguros</div>
                <div className="mt-1.5 text-sm leading-6 text-secondary">Transferencia bancaria o efectivo coordinado, con confirmación previa.</div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-line bg-white text-[var(--blue)]" aria-hidden="true">
                <Icon.ArrowCounterClockwise size={25} weight="duotone" />
              </span>
              <div>
                <div className="text-title">Cambios y devoluciones</div>
                <div className="mt-1.5 text-sm leading-6 text-secondary">Consulta las políticas completas en Términos y Condiciones.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="related-product bg-white pb-14 md:pb-20" aria-labelledby="related-products-title">
          <div className="container">
            <div className="border-t border-line pt-10 md:pt-14">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">Productos relacionados</p>
                <h2 id="related-products-title" className="heading3 mt-2">También te puede gustar</h2>
              </div>
              <div className="list-product hide-product-sold mt-7 grid grid-cols-2 gap-[20px] sm:gap-[30px] md:mt-10 lg:grid-cols-4">
                {relatedProducts.map((item) => (
                  <Product key={item.id} data={item} type="grid" style="style-1" />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Default
