'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Image from '@/components/Common/AppImage'
import { isPublicUploadUrl } from '@/lib/publicUploads'
import { ProductType } from '@/type/ProductType'
import { Eye, ShoppingBagOpen } from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext'
import { useModalCartContext } from '@/context/ModalCartContext'
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext'
import { useRouter } from 'next/navigation'
import Rate from '../Other/Rate'
import {
    getProductCurrentPrice,
    getProductDiscountPercent,
    getProductOriginalPrice,
    getProductReviewCount,
    getProductVariantDisplayRows,
    getProductVariantLabel,
    getProductVariants,
    hasRealReviews,
    isProductOnSale,
    resolveSelectedVariant,
} from '@/lib/catalog'
import { getProductSeoPath } from '@/lib/seoUrls'
import {
    fetchLiveCatalogSnapshot,
    findLiveCatalogProduct,
    getLiveProductAvailableStock,
    resolveLiveSelectedVariant,
} from '@/lib/liveCatalog'
import { getProductImageAlt } from '@/lib/productImageAlt'

const Icon = {
    Eye,
    ShoppingBagOpen,
} as const

interface ProductProps {
    data: ProductType
    type: string
    style?: string
    showQuickView?: boolean
}

const Product: React.FC<ProductProps> = ({ data, type, style = '', showQuickView = false }) => {
    const [activeColor, setActiveColor] = useState<string>('')
    const [activeSize, setActiveSize] = useState<string>('')
    const [openQuickShop, setOpenQuickShop] = useState<boolean>(false)
    const { addToCart, updateCart, cartState } = useCart();
    const { openModalCart } = useModalCartContext()
    const { openQuickview } = useModalQuickviewContext()
    const router = useRouter()
    const variantProducts = getProductVariants(data)
    const hasVariantChoices = variantProducts.length > 1
    const defaultVariant = resolveSelectedVariant(data)
    const selectedVariant = variantProducts.find((product) => getProductVariantLabel(product) === activeSize) ?? defaultVariant
    const reviewCount = getProductReviewCount(data)
    const showReviewSummary = hasRealReviews(data)

    const handleActiveColor = (item: string) => {
        setActiveColor(item)
    }

    const handleActiveSize = (item: string) => {
        setActiveSize(item)
    }

    const refreshSelectedVariant = useCallback(async () => {
        const snapshot = await fetchLiveCatalogSnapshot(getProductVariants(data))
        const refreshedProduct = findLiveCatalogProduct(snapshot.groupedProducts, data.id)
        if (!refreshedProduct) return null
        const refreshedVariant = resolveLiveSelectedVariant(refreshedProduct, {
            requestedId: data.id,
            preferredVariantId: selectedVariant.id,
            preferredVariantLabel: activeSize,
            strictPreferredMatch: true,
        })
        if (!refreshedVariant) return null
        const refreshedStock = getLiveProductAvailableStock(refreshedVariant)
        if (refreshedStock <= 0) return null
        return {
            product: refreshedProduct,
            variant: refreshedVariant,
            stock: refreshedStock,
        }
    }, [activeSize, data.id, selectedVariant.id])

    const handleAddToCart = async () => {
        if (hasVariantChoices && !activeSize) {
            handleQuickviewOpen()
            return
        }

        const liveSelection = await refreshSelectedVariant()
        if (!liveSelection) {
            return
        }

        const cartProduct = liveSelection.variant
        const selectedSizeLabel = activeSize || getProductVariantLabel(cartProduct)
        const existingItem = cartState.cartArray.find((item: any) => item.id === cartProduct.id)
        const qtyToAdd = Math.min(cartProduct.quantityPurchase ?? data.quantityPurchase ?? 1, liveSelection.stock)

        if (existingItem) {
            const nextQuantity = Math.min((existingItem.quantity ?? 0) + qtyToAdd, liveSelection.stock)
            updateCart(cartProduct.id, nextQuantity, selectedSizeLabel, activeColor)
        } else {
            addToCart({ ...cartProduct, quantityPurchase: qtyToAdd });
            updateCart(cartProduct.id, qtyToAdd, selectedSizeLabel, activeColor)
        }
        openModalCart()
    };

    const handleQuickviewOpen = () => {
        openQuickview(data)
    }

    const handleDetailProduct = () => {
        router.push(getProductSeoPath(data));
    };

    useEffect(() => {
        if (hasVariantChoices) {
            setActiveSize('')
        } else {
            setActiveSize('')
        }
    }, [data.id, defaultVariant.id, hasVariantChoices])

    const thumbImages: string[] =
        Array.isArray((selectedVariant as any)?.thumbImage) && (selectedVariant as any)?.thumbImage.length
            ? (selectedVariant as any).thumbImage
            : [];
    const fullImages: string[] =
        Array.isArray((selectedVariant as any)?.images)
            ? (selectedVariant as any).images
                .map((img: any) => img?.url ?? img)
                .filter(Boolean)
            : []
    const primaryImage = thumbImages[0] || fullImages[0] || '/images/product/1.webp'
    const primaryImageAlt = getProductImageAlt(selectedVariant as ProductType, primaryImage, 'producto')
    const isDirectUploadImage = (src: string) => isPublicUploadUrl(src)
    const shouldBypassOptimizer = (src: string) =>
        src.startsWith('data:') || src.startsWith('blob:') || isDirectUploadImage(src)
    const resolveFallbackImage = (src: string) => src || '/images/product/1.webp'
    const buildUploadVariantUrl = (src: string, width: number) =>
        src.replace(/\.webp(?=($|[?#]))/i, `-${width}.webp`)
    const buildUploadSrcSet = (src: string) => {
        if (!/\.webp($|[?#])/i.test(src)) return undefined
        return [
            `${buildUploadVariantUrl(src, 220)} 220w`,
            `${buildUploadVariantUrl(src, 360)} 360w`,
            `${src} 640w`,
        ].join(', ')
    }
    const renderProductImage = (src: string) => {
        const resolvedSrc = resolveFallbackImage(src)

        if (isDirectUploadImage(resolvedSrc)) {
            return (
                <img
                    src={buildUploadVariantUrl(resolvedSrc, 220)}
                    srcSet={buildUploadSrcSet(resolvedSrc)}
                    sizes="(min-width: 1024px) 176px, (min-width: 640px) 180px, 45vw"
                    alt={primaryImageAlt}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain duration-700"
                    onError={(event) => {
                        const fallback = '/images/product/1.webp'
                        if (event.currentTarget.src.endsWith(fallback)) return
                        event.currentTarget.src = fallback
                    }}
                />
            )
        }

        return (
            <Image
                src={resolvedSrc}
                width={640}
                height={800}
                alt={primaryImageAlt}
                sizes="(min-width: 1024px) 220px, (min-width: 640px) 200px, 45vw"
                quality={85}
                unoptimized={shouldBypassOptimizer(resolvedSrc)}
                className="w-full h-full object-contain duration-700"
            />
        )
    }

    const sizes: string[] = data.sizes ?? []
    const variantDisplayRows = getProductVariantDisplayRows(data)
    const variations = selectedVariant.variation ?? []
    const productType = (data.productType ?? '').toLowerCase()
    const showSizes = productType === 'ropa' && sizes.length > 0

    const price = getProductCurrentPrice(data)
    const originPrice = getProductOriginalPrice(data)
    const hasSale = isProductOnSale(data)
    const percentSale = getProductDiscountPercent(data)
    const percentSold = data.quantity > 0
        ? Math.floor((data.sold / data.quantity) * 100)
        : 0
    const showFromPrice = hasVariantChoices && Number(data.priceMax ?? price) > price
    const availabilityLabel = hasVariantChoices ? 'Disponibles total: ' : 'Disponibles: '

    return (
        <>
            {type === "grid" ? (
                <div className={`product-item pm-product-card grid-type ${style}`}>
                    <div onClick={handleDetailProduct} className="product-main pm-product-card__main cursor-pointer block">
                        <div className="product-thumb pm-product-card__thumb bg-white relative overflow-hidden rounded-2xl">
                            {data.new && (
                                <div className="product-tag text-button-uppercase text-white bg-[var(--green)] px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                    Nuevo
                                </div>
                            )}
                            {hasSale && (
                                <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                    Oferta
                                </div>
                            )}

                            <div className="product-img pm-product-card__image w-full aspect-[4/5] max-h-[240px] bg-white">
                                {activeColor ? (
                                    <>
                                        {renderProductImage(variations.find((item: any) => item.color === activeColor)?.image || primaryImage)}
                                    </>
                                ) : (
                                    <>
                                        {renderProductImage(primaryImage)}
                                    </>
                                )}
                            </div>

                            {showSizes && (style === 'style-2' || style === 'style-4') ? (
                                <div className="list-size-block flex items-center justify-center gap-4 absolute bottom-0 left-0 w-full h-8">
                                    {sizes.map((item: string, index: number) => (
                                        <strong key={index} className="size-item text-xs font-bold uppercase">{item}</strong>
                                    ))}
                                </div>
                            ) : null}

                            {(style === 'style-1' || style === 'style-3' || showQuickView) && (
                                <div className={`list-action ${(style === 'style-1' || showQuickView) ? 'flex justify-center' : ''} px-5 absolute w-full bottom-5 max-lg:hidden`}>
                                    {(style === 'style-1' || showQuickView) && (
                                        <div
                                            className="quick-view-btn w-auto min-w-[160px] text-button-uppercase py-2 px-5 text-center rounded-full duration-300 bg-white hover:bg-black hover:text-white"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleQuickviewOpen()
                                            }}
                                        >
                                            Vista rápida
                                        </div>
                                    )}
                                </div>
                            )}

                            {(style === 'style-2' || style === 'style-5') ? (
                                <>
                                    <div className={`list-action flex items-center justify-center gap-3 px-5 absolute w-full ${style === 'style-2' ? 'bottom-12' : 'bottom-5'} max-lg:hidden`}>
                                        {style === 'style-2' && (
                                            <div
                                                className="add-cart-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleAddToCart()
                                                }}
                                            >
                                                <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Agregar al carrito</div>
                                                <Icon.ShoppingBagOpen size={20} />
                                            </div>
                                        )}
                                        <div
                                            className="quick-view-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleQuickviewOpen()
                                            }}
                                        >
                                            <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Vista rápida</div>
                                            <Icon.Eye size={20} />
                                        </div>
                                        {style === 'style-5' && data.action !== 'add to cart' && (
                                            <div
                                                className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? 'open' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                            {showSizes && (
                                                <div className="list-size flex items-center justify-center flex-wrap gap-2">
                                                    {sizes.map((item: string, index: number) => (
                                                        <div
                                                            className={`size-item w-10 h-10 rounded-full flex items-center justify-center text-button bg-white border border-line ${activeSize === item ? 'active' : ''}`}
                                                            key={index}
                                                            onClick={() => handleActiveSize(item)}
                                                        >
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div
                                                className="button-main w-full text-center rounded-full py-3 mt-4"
                                                onClick={() => {
                                                    handleAddToCart()
                                                    setOpenQuickShop(false)
                                                    }}
                                                >
                                                    Agregar al carrito
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}

                            <div className="list-action-icon flex items-center justify-center gap-2 absolute w-full bottom-3 z-[1] lg:hidden">
                                <div
                                    className="quick-view-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleQuickviewOpen()
                                    }}
                                >
                                    <Icon.Eye className='text-lg' />
                                </div>
                                <div
                                    className="add-cart-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleAddToCart()
                                    }}
                                >
                                    <Icon.ShoppingBagOpen className='text-lg' />
                                </div>
                            </div>
                        </div>

                        <div className="product-infor pm-product-card__info mt-4 lg:mb-7">
                            <div className="product-sold sm:pb-4 pb-2">
                                <div className="progress bg-line h-1.5 w-full rounded-full overflow-hidden relative">
                                    <div
                                        className="progress-sold bg-red absolute left-0 top-0 h-full"
                                        style={{ width: `${percentSold}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-3 gap-y-1 flex-wrap mt-2">
                                    <div className="text-button-uppercase">
                                        <span className='text-secondary2 max-sm:text-xs'>Vendidos: </span>
                                        <span className='max-sm:text-xs'>{data.sold}</span>
                                    </div>
                                    <div className="text-button-uppercase">
                                        <span className='text-secondary2 max-sm:text-xs'>{availabilityLabel}</span>
                                        <span className='max-sm:text-xs'>{data.quantity}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="product-name pm-product-card__name text-title duration-300">{data.name}</div>
                            {variantDisplayRows.length > 0 && (
                                <div className="pm-product-card__variants caption1 text-secondary mt-1 space-y-0.5">
                                    {variantDisplayRows.map((row) => (
                                        <div key={`${row.label}-${row.values.join('|')}`}>{row.label}: {row.values.join(', ')}</div>
                                    ))}
                                </div>
                            )}
                            <div className="product-price-block pm-product-card__price flex items-center gap-2 flex-wrap mt-1 duration-300 relative z-[1]">
                                <div className="product-price text-title">{showFromPrice ? 'Desde ' : ''}${price.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                {hasSale && (
                                    <>
                                        <div className="product-origin-price caption1 text-secondary2">
                                            <del>${originPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del>
                                        </div>
                                        <div className="product-sale caption1 font-medium bg-[var(--bluefor)] px-3 py-0.5 inline-block rounded-full">
                                            -{percentSale}%
                                        </div>
                                    </>
                                )}
                            </div>

                            {style === 'style-5' && (
                                <>
                                    {data.action === 'add to cart' ? (
                                        <div
                                            className="add-cart-btn w-full text-button-uppercase py-2.5 text-center mt-2 rounded-full duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden"
                                            onClick={e => {
                                                e.stopPropagation()
                                                handleAddToCart()
                                            }}
                                        >
                                            Agregar al carrito
                                        </div>
                                    ) : (
                                        <div
                                            className="quick-shop-btn text-button-uppercase py-2.5 text-center mt-2 rounded-full duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden"
                                            onClick={e => {
                                                e.stopPropagation()
                                                setOpenQuickShop(!openQuickShop)
                                            }}
                                        >
                                            Compra rápida
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {type === "list" ? (
                        <div className="product-item list-type border-b border-line pb-6 last:border-none">
                            <div className="product-main cursor-pointer grid md:grid-cols-[300px,1fr,auto] grid-cols-1 items-center gap-7 max-lg:gap-5">
                                <div
                                    onClick={handleDetailProduct}
                                    className="product-thumb bg-white relative overflow-hidden rounded-2xl block max-sm:w-1/2 md:w-full md:max-w-[300px] md:flex-shrink-0"
                                >
                                    {data.new && (
                                        <div className="product-tag text-button-uppercase bg-green px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                            Nuevo
                                        </div>
                                    )}
                                    {hasSale && (
                                        <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                            Oferta
                                        </div>
                                    )}
                                    <div className="product-img w-full aspect-[4/5] rounded-2xl overflow-hidden bg-white">
                                        {thumbImages.map((img: string, index: number) => (
                                            <Image
                                                key={index}
                                                src={img}
                                                width={640}
                                                height={800}
                                                priority={true}
                                                alt={getProductImageAlt(selectedVariant as ProductType, img, 'producto')}
                                                className='w-full h-full object-contain duration-700'
                                            />
                                        ))}
                                    </div>
                                    <div className="list-action px-5 absolute w-full bottom-5 max-lg:hidden">
                                        <div
                                            className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? 'open' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        >
                                            {showSizes && (
                                                <div className="list-size flex items-center justify-center flex-wrap gap-2">
                                                    {sizes.map((item: string, index: number) => (
                                                        <div
                                                            className={`size-item ${item !== 'freesize' ? 'w-10 h-10' : 'h-10 px-4'} flex items-center justify-center text-button bg-white rounded-full border border-line ${activeSize === item ? 'active' : ''}`}
                                                            key={index}
                                                            onClick={() => handleActiveSize(item)}
                                                        >
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div
                                                className="button-main w-full text-center rounded-full py-3 mt-4"
                                                onClick={() => {
                                                    handleAddToCart()
                                                    setOpenQuickShop(false)
                                                }}
                                            >
                                                Agregar al carrito
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className='flex items-start gap-7 max-lg:gap-4 max-lg:flex-wrap max-lg:w-full max-sm:flex-col max-sm:w-full'>
                                    <div className="product-infor max-sm:w-full flex-1 min-w-[260px]">
                                        <div onClick={handleDetailProduct} className="product-name heading6 inline-block duration-300">{data.name}</div>
                                        {variantDisplayRows.length > 0 && (
                                            <div className="caption1 text-secondary mt-1 space-y-0.5">
                                                {variantDisplayRows.map((row) => (
                                                    <div key={`${row.label}-${row.values.join('|')}`}>{row.label}: {row.values.join(', ')}</div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="product-price-block flex items-center gap-2 flex-wrap mt-2 duration-300 relative z-[1]">
                                            <div className="product-price text-title">{showFromPrice ? 'Desde ' : ''}${price.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            {hasSale && (
                                                <>
                                                    <div className="product-origin-price caption1 text-secondary2">
                                                        <del>${originPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del>
                                                    </div>
                                                    <div className="product-sale caption1 font-medium bg-green px-3 py-0.5 inline-block rounded-full">
                                                        -{percentSale}%
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {(variations.length > 0 || showSizes) && (
                                            <div className="flex items-center gap-4 flex-wrap mt-5 mb-1">
                                                {variations.length > 0 && (
                                                    <div className="list-color py-2 flex items-center gap-3 flex-wrap duration-300">
                                                        {variations.map((item: any, index: number) => (
                                                            <button
                                                                key={index}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleActiveColor(item.color)
                                                                }}
                                                                className={`color-item w-10 h-10 rounded-full border relative flex items-center justify-center ${activeColor === item.color ? 'border-black scale-105' : 'border-line'}`}
                                                                aria-label={`Color ${item.color}`}
                                                            >
                                                                <span
                                                                    className="w-8 h-8 rounded-full block"
                                                                    style={{ backgroundColor: item.colorCode || '#d9d9d9' }}
                                                                />
                                                                <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">
                                                                    {item.color}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {showSizes && (
                                                    <div className="list-size flex items-center gap-2 flex-wrap">
                                                        {sizes.map((item: string, index: number) => (
                                                            <div
                                                                key={index}
                                                                className="px-3 py-1 rounded-full border border-line text-button bg-white"
                                                            >
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div
                                            className='text-secondary desc mt-5 max-sm:hidden'
                                            style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                maxWidth: '520px',
                                                minHeight: '48px',
                                            }}
                                        >
                                            {data.description}
                                        </div>
                                    </div>

                                    <div className="action w-fit flex flex-col items-center justify-center self-center flex-shrink-0">
                                        <div
                                            className="quick-shop-btn button-main whitespace-nowrap py-2 px-9 max-lg:px-5 rounded-full bg-white text-black border border-black hover:bg-black hover:text-white"
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleQuickviewOpen()
                                            }}
                                        >
                                            Vista rápida
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            {type === 'marketplace' ? (
                <div className="product-item style-marketplace p-4 border border-line rounded-2xl" onClick={handleDetailProduct}>
                    <div className="bg-img relative w-full">
                        <Image
                            className='w-full aspect-square'
                            width={5000}
                            height={5000}
                            src={thumbImages[0] ?? ''}
                            alt={getProductImageAlt(selectedVariant as ProductType, thumbImages[0], 'producto')}
                        />
                        <div className="list-action flex flex-col gap-1 absolute top-0 right-0">
                            <span
                                className="quick-view-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickviewOpen()
                                }}
                            >
                                <Icon.Eye />
                            </span>
                            <span
                                className="add-cart-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleAddToCart()
                                }}
                            >
                                <Icon.ShoppingBagOpen />
                            </span>
                        </div>
                    </div>
                    <div className="product-infor mt-4">
                        <span className="text-title">{data.name}</span>
                        {variantDisplayRows.length > 0 && (
                            <div className="caption1 text-secondary mt-1 space-y-0.5">
                                {variantDisplayRows.map((row) => (
                                    <div key={`${row.label}-${row.values.join('|')}`}>{row.label}: {row.values.join(', ')}</div>
                                ))}
                            </div>
                        )}
                        {showReviewSummary && (
                            <div className="flex items-center gap-1 mt-1">
                                <Rate currentRate={data.rate} size={16} />
                                <span className="caption2 text-secondary">({reviewCount})</span>
                            </div>
                        )}
                        <span className="text-title inline-block mt-1">{showFromPrice ? 'Desde ' : ''}${price.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            ) : null}
        </>
    )
}

export default Product
