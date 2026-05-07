'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import SwiperCore from 'swiper/core'
import { Minus, Plus, X } from '@phosphor-icons/react/dist/ssr'
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
  getProductVariantLabel,
  getProductVariants,
  hasRealReviews,
} from '@/lib/catalog'
import { getCatalogPagePath } from '@/lib/seoUrls'
import {
  fetchLiveCatalogSnapshot,
  findLiveCatalogProduct,
  getLiveProductAvailableStock,
  resolveLiveSelectedVariant,
} from '@/lib/liveCatalog'
import {
  getProductColorValues,
  getProductSizeValues,
  getVariantColorValue,
  getVariantSizeValue,
} from '@/lib/catalogAttributes'

const Icon = {
  Minus,
  Plus,
  X,
} as const

const normalizeOptionValue = (value?: string | null) => (value ?? '').trim().toLowerCase()

const normalizeSpecKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

interface Props {
  data: Array<ProductType>
  productId: string | number | null
}

const Default: React.FC<Props> = ({ data, productId }) => {
  const router = useRouter()
  const popupSwiperRef = useRef<SwiperCore | null>(null)

  const [openPopupImg, setOpenPopupImg] = useState(false)
  const [openSizeGuide, setOpenSizeGuide] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [activeColor, setActiveColor] = useState('')
  const [activeSize, setActiveSize] = useState('')
  const [activeTab, setActiveTab] = useState<'description' | 'specifications'>('description')
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
  const familySizeValues = useMemo(() => (productFamily ? getProductSizeValues(productFamily) : []), [productFamily])
  const familyColorValues = useMemo(() => (productFamily ? getProductColorValues(productFamily) : []), [productFamily])
  const hasSizeSelector = familySizeValues.length > 1
  const hasColorSelector = familyColorValues.length > 1
  const genericVariantOptions = useMemo(
    () => variantProducts.map((product) => ({
      id: product.id,
      label: getProductVariantLabel(product) || product.name,
    })),
    [variantProducts],
  )
  const showGenericVariantSelector = variantProducts.length > 1 && !hasSizeSelector && !hasColorSelector
  const activeVariant = useMemo(() => {
    if (!productFamily || !defaultVariant) return null
    if (showGenericVariantSelector && activeSize) {
      return variantProducts.find((product) => {
        const label = getProductVariantLabel(product) || product.name
        return label === activeSize
      }) ?? defaultVariant
    }

    const matchesSize = (product: ProductType) =>
      !activeSize || normalizeOptionValue(getVariantSizeValue(product)) === normalizeOptionValue(activeSize)
    const matchesColor = (product: ProductType) =>
      !activeColor || normalizeOptionValue(getVariantColorValue(product)) === normalizeOptionValue(activeColor)

    const exactMatches = variantProducts.filter((product) => matchesSize(product) && matchesColor(product))
    if (exactMatches.length > 0) {
      return exactMatches.find((product) => product.id === defaultVariant.id) ?? exactMatches[0]
    }

    if (activeColor) {
      const colorMatches = variantProducts.filter(matchesColor)
      if (colorMatches.length > 0) {
        return colorMatches.find((product) => product.id === defaultVariant.id) ?? colorMatches[0]
      }
    }

    if (activeSize) {
      const sizeMatches = variantProducts.filter(matchesSize)
      if (sizeMatches.length > 0) {
        return sizeMatches.find((product) => product.id === defaultVariant.id) ?? sizeMatches[0]
      }
    }

    return resolveLiveSelectedVariant(productFamily, {
      requestedId,
      preferredVariantId: defaultVariant.id,
      preferredVariantLabel: getProductVariantLabel(defaultVariant),
    })
  }, [activeColor, activeSize, defaultVariant, productFamily, requestedId, showGenericVariantSelector, variantProducts])
  const defaultVariantStock = getLiveProductAvailableStock(defaultVariant)
  const availableStock = getLiveProductAvailableStock(activeVariant)
  const showReviewSummary = productFamily ? hasRealReviews(productFamily) : false
  const reviewCount = productFamily ? getProductReviewCount(productFamily) : 0

  useEffect(() => {
    setLiveProducts(data)
  }, [data])

  const refreshLiveCatalog = useCallback(async () => {
    const snapshot = await fetchLiveCatalogSnapshot()
    setLiveProducts(snapshot.groupedProducts)
    return findLiveCatalogProduct(snapshot.groupedProducts, requestedId)
  }, [requestedId])

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
  }, [activeSize, activeVariant?.id, defaultVariant?.id, refreshLiveCatalog, requestedId])

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
    setActiveColor(getVariantColorValue(defaultVariant))
    setActiveSize(showGenericVariantSelector ? (getProductVariantLabel(defaultVariant) || defaultVariant.name) : getVariantSizeValue(defaultVariant))
    setPhotoIndex(0)
  }, [defaultVariant?.id, defaultVariantStock, productFamily?.id, showGenericVariantSelector])

  useEffect(() => {
    if (!activeVariant) return
    const nextColor = getVariantColorValue(activeVariant)
    const nextSize = showGenericVariantSelector
      ? (getProductVariantLabel(activeVariant) || activeVariant.name)
      : getVariantSizeValue(activeVariant)

    setActiveColor((current) => current === nextColor ? current : nextColor)
    setActiveSize((current) => current === nextSize ? current : nextSize)
  }, [activeVariant?.id, showGenericVariantSelector])

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
  const selectorLabel = isFoodCategory
    ? 'Tamano del paquete'
    : (isClothing ? 'Talla' : (hasSizeSelector ? 'Tamaño' : 'Variante'))
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
      size: 'Tamano',
      flavor: 'Sabor',
      target: 'Etapa',
      species: 'Especie',
      presentation: 'Presentacion',
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
      presentation: 'Presentacion',
    },
    cuidado: {
      size: 'Tamano',
      presentation: 'Presentacion',
      usage: 'Uso',
      species: 'Especie',
    },
    salud: {
      size: 'Tamano',
      presentation: 'Presentacion',
      usage: 'Uso',
      species: 'Especie',
    },
  }

  const attributeRows = useMemo(() => {
    const attributes = activeVariant?.attributes ?? {}
    const labels = attributeLabels[productType] ?? attributeLabels[categoryLabel] ?? {}

    return Object.entries(labels)
      .map(([key, label]) => {
        let value: unknown = attributes[key]
        if (key === 'size' && !value && activeVariant) value = getVariantSizeValue(activeVariant)
        return { key, label, value }
      })
      .filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
  }, [activeVariant, categoryLabel, productType])

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
  const colorOptions = useMemo(
    () => familyColorValues.map((color) => {
      const matchingVariant = variantProducts.find((product) => normalizeOptionValue(getVariantColorValue(product)) === normalizeOptionValue(color))
      const variationMatch = (matchingVariant?.variation ?? []).find((item) => normalizeOptionValue(item.color) === normalizeOptionValue(color))
      return {
        color,
        colorCode: variationMatch?.colorCode || '',
        image: variationMatch?.colorImage || variationMatch?.image || '',
      }
    }),
    [familyColorValues, variantProducts],
  )
  const currentGalleryImage = resolvedGalleryImages[photoIndex] ?? resolvedGalleryImages[0] ?? '/images/product/1.webp'

  const variantDisplayValues = useMemo(() => Array.from(new Set(
    variantProducts
      .map((product) =>
        getProductVariantLabel(product)
        || getVariantSizeValue(product)
        || product.variantPresentation
        || product.variantLabel
        || ''
      )
      .map((value) => value.trim())
      .filter(Boolean)
  )), [variantProducts])

  const petLabel = productFamily?.gender === 'dog'
    ? 'Perros'
    : productFamily?.gender === 'cat'
      ? 'Gatos'
      : ''
  const formattedCategory = [productFamily?.category, petLabel]
    .filter(Boolean)
    .join(' · ')
  const categoryPath = productFamily?.category
    ? getCatalogPagePath(productFamily.category, { gender: productFamily.gender })
    : '/tienda'
  const descriptionText =
    activeVariant?.description?.trim()
    || productFamily?.description?.trim()
    || 'Producto publicado en ParaMascotasEC con informacion de precio, disponibilidad y presentaciones segun stock vigente.'

  const specificationRows = useMemo(() => {
    const rows = [
      { key: 'brand', label: 'Marca', value: activeVariant?.brand || productFamily?.brand },
      { key: 'category', label: 'Categoria', value: formattedCategory },
      { key: 'species', label: 'Especie', value: petLabel },
      { key: 'sku', label: 'SKU', value: sku },
      { key: 'price', label: 'Precio', value: price > 0 ? `USD ${price.toFixed(2)}` : '' },
      { key: 'stock', label: 'Disponibilidad', value: availableStock > 0 ? `${availableStock} en stock` : 'Sin stock' },
      { key: 'variants', label: 'Variantes', value: variantProducts.length > 1 ? `${variantProducts.length} opciones` : 'Producto unico' },
      { key: 'presentations', label: 'Presentaciones', value: variantDisplayValues.join(', ') },
      {
        key: 'expiration',
        label: 'Fecha de expiracion',
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
    petLabel,
    price,
    productFamily?.brand,
    sku,
    variantDisplayValues,
    variantProducts.length,
  ])

  const relatedProducts = useMemo(() => {
    if (!productFamily) return []
    return data
      .filter((product) => product.id !== productFamily.id && product.variantGroupKey !== productFamily.variantGroupKey)
      .filter((product) => !productFamily.gender || product.gender === productFamily.gender)
      .slice(0, 4)
  }, [data, productFamily?.gender, productFamily?.id, productFamily?.variantGroupKey])

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
                          alt={`${productFamily.name} - Miniatura ${index + 1}`}
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
                    alt={`${productFamily.name} - Vista ${photoIndex + 1}`}
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
                        alt={`${productFamily.name} - Zoom ${index + 1}`}
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
                {productFamily.brand && (
                  <div className="caption2 text-secondary font-semibold uppercase">{productFamily.brand}</div>
                )}
                <h1 className="heading4 mt-1">{productFamily.name}</h1>
              </div>
            </div>

            {showReviewSummary && (
              <div className="flex items-center mt-3 gap-2">
                <Rate currentRate={productFamily.rate} size={14} />
                <span className="caption1 text-secondary">({reviewCount} resenas)</span>
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
              {hasColorSelector && (
                <div className="choose-color">
                  <div className="text-title">Color: <span className="text-title color">{activeColor}</span></div>
                  <div className="list-color flex items-center gap-2 flex-wrap mt-3">
                    {colorOptions.map((item, index) => (
                      item.colorCode ? (
                        <button
                          type="button"
                          key={`${item.color}-${index}`}
                          onClick={() => setActiveColor(item.color)}
                          className={`color-item w-12 h-12 rounded-full border duration-300 relative flex items-center justify-center ${activeColor === item.color ? 'border-black scale-105' : 'border-line'}`}
                          aria-label={`Color ${item.color}`}
                        >
                          <span className="w-10 h-10 rounded-full block" style={{ backgroundColor: item.colorCode || '#d9d9d9' }} />
                          <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">
                            {item.color}
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          key={`${item.color}-${index}`}
                          onClick={() => setActiveColor(item.color)}
                          className={`px-3 py-2 flex items-center justify-center text-button rounded-full bg-white border border-line ${activeColor === item.color ? 'active' : ''}`}
                          aria-label={`Color ${item.color}`}
                        >
                          {item.color}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}

              {(showGenericVariantSelector || hasSizeSelector || isClothing) && (
                <div className="choose-size mt-5">
                  <div className="heading flex items-center justify-between gap-3">
                    <div className="text-title">{selectorLabel}: <span className="text-title size">{showGenericVariantSelector ? (getProductVariantLabel(activeVariant) || activeVariant?.name || '') : activeSize}</span></div>
                    {isClothing && hasSizeSelector && (
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
                  {(showGenericVariantSelector || hasSizeSelector) && (
                    <div className="list-size flex items-center gap-2 flex-wrap mt-3">
                      {(showGenericVariantSelector
                        ? genericVariantOptions
                        : familySizeValues.map((label) => ({ id: label, label }))
                      ).map((option) => {
                        const isActive = showGenericVariantSelector
                          ? (getProductVariantLabel(activeVariant) || activeVariant?.name || '') === option.label
                          : activeSize === option.label
                        return (
                          <button
                            type="button"
                            className={`size-item px-3 py-2 flex items-center justify-center text-button rounded-full bg-white border border-line ${isActive ? 'active' : ''}`}
                            key={option.id}
                            onClick={() => setActiveSize(option.label)}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
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
                  <div className="caption1 text-secondary">Disponibilidad</div>
                  <div className="text-title mt-1">{availableStock > 0 ? `${availableStock} en stock` : 'Sin stock'}</div>
                </div>
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
                  <div className="caption1 text-secondary">Categoria</div>
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
          <div className="product-tabs pb-10 border-b border-line">
            <div className="tab-headers flex items-center gap-6 border-b border-line pb-3 overflow-x-auto">
              <button
                type="button"
                className={`text-button pb-1 relative ${activeTab === 'description'
                  ? 'font-semibold after:content-[""] after:absolute after:left-0 after:-bottom-[2px] after:w-full after:h-[2px] after:bg-black'
                  : 'text-secondary'
                  }`}
                onClick={() => setActiveTab('description')}
              >
                Descripcion
              </button>
              <button
                type="button"
                className={`text-button pb-1 relative ${activeTab === 'specifications'
                  ? 'font-semibold after:content-[""] after:absolute after:left-0 after:-bottom-[2px] after:w-full after:h-[2px] after:bg-black'
                  : 'text-secondary'
                  }`}
                onClick={() => setActiveTab('specifications')}
              >
                Especificaciones
              </button>
            </div>

            {activeTab === 'description' ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-normal text-secondary">
                    Compra online en Ecuador
                  </p>
                  <h2 className="heading5 mt-2">
                    {productFamily.name}{productFamily.gender === 'dog' ? ' para perros' : productFamily.gender === 'cat' ? ' para gatos' : ''}
                  </h2>
                  <p className="mt-4 text-secondary leading-7">{descriptionText}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-sm">
                    {specificationRows.slice(0, 5).map((row) => (
                      <span key={`desc-${row.key}`} className="rounded-full bg-surface px-3 py-1">
                        {row.label}: {String(row.value)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border-line pl-0 lg:border-l lg:pl-8">
                  <h3 className="text-title">Detalles utiles</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    {specificationRows
                      .filter((row) => ['stock', 'variants', 'presentations', 'expiration'].includes(row.key))
                      .slice(0, 4)
                      .map((row) => (
                        <div key={`useful-${row.key}`} className="flex justify-between gap-4 border-b border-line pb-3">
                          <dt className="text-secondary">{row.label}</dt>
                          <dd className="text-right font-semibold">{String(row.value)}</dd>
                        </div>
                      ))}
                  </dl>
                  <Link href={categoryPath} className="button-main mt-6 inline-flex rounded-full px-6 py-3">
                    Ver productos relacionados
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {specificationRows.length > 0 ? (
                  specificationRows.map((item) => (
                    <div
                      key={`spec-${item.key}`}
                      className="grid grid-cols-1 gap-1 rounded-xl border border-line bg-white p-4 text-left sm:grid-cols-[minmax(140px,220px)_1fr] sm:items-start sm:gap-4"
                    >
                      <div className="caption1 text-secondary text-left">{item.label}</div>
                      <div className="text-title mt-0 text-left">{String(item.value)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-secondary">Este producto aun no tiene especificaciones adicionales cargadas.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="container mt-10">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-line p-5 bg-surface">
              <div className="text-title">Envíos y entregas</div>
              <div className="caption1 text-secondary mt-2">Envíos en zonas habilitadas con tiempos informados.</div>
            </div>
            <div className="rounded-2xl border border-line p-5 bg-surface">
              <div className="text-title">Pagos seguros</div>
              <div className="caption1 text-secondary mt-2">Transferencia bancaria o efectivo coordinado, con confirmación previa.</div>
            </div>
            <div className="rounded-2xl border border-line p-5 bg-surface">
              <div className="text-title">Cambios y devoluciones</div>
              <div className="caption1 text-secondary mt-2">Consulta políticas completas en Términos y Condiciones.</div>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="related-product md:py-20 py-10">
          <div className="container">
            <div className="heading3 text-center">Productos relacionados</div>
            <div className="list-product hide-product-sold grid lg:grid-cols-4 grid-cols-2 md:gap-[30px] gap-5 md:mt-10 mt-6">
              {relatedProducts.map((item) => (
                <Product key={item.id} data={item} type="grid" style="style-1" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Default
