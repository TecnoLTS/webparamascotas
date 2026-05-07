'use client'
import React, { useEffect, useState } from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'
import { getQuote } from '@/lib/api'
import { getPublicStoreStatus } from '@/lib/api/settings'

const Cart = () => {


    const router = useRouter()
    const { cartState, updateCart, removeFromCart } = useCart();
    const [salesEnabled, setSalesEnabled] = useState(true)
    const [salesDisabledMessage, setSalesDisabledMessage] = useState('Tienda temporalmente en mantenimiento. Intenta más tarde.')

    const handleQuantityChange = (productId: string, newQuantity: number) => {
        // Tìm sản phẩm trong giỏ hàng
        const itemToUpdate = cartState.cartArray.find((item) => item.id === productId);

        // Kiểm tra xem sản phẩm có tồn tại không
        if (itemToUpdate) {
            const availableStock = Math.max(
                0,
                Number((itemToUpdate as any).availableStock ?? itemToUpdate.inventory?.available ?? 0),
            )
            const boundedQuantity = availableStock > 0
                ? Math.min(Math.max(1, Math.floor(newQuantity)), availableStock)
                : 0
            if (boundedQuantity <= 0) {
                return
            }
            // Truyền giá trị hiện tại của selectedSize và selectedColor
            updateCart(productId, boundedQuantity, itemToUpdate.selectedSize, itemToUpdate.selectedColor);
        }
    };

    const totalCart = cartState.cartArray.reduce(
        (acc, item) => acc + Number(item.price ?? 0) * Number(item.quantity ?? 1),
        0
    )
    const [vatRate, setVatRate] = useState(0)
    const [vatSubtotal, setVatSubtotal] = useState(0)
    const [vatAmount, setVatAmount] = useState(0)
    const [mixedVatRates, setMixedVatRates] = useState(false)
    const discountCart = 0
    const formattedDiscount = discountCart.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formattedCartTotal = totalCart.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formattedVatSubtotal = vatSubtotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formattedVatAmount = vatAmount.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
        const items = cartState.cartArray.map((item) => ({
            product_id: item.id,
            quantity: Number(item.quantity ?? 1)
        }))
        if (items.length === 0) {
            setVatRate(0)
            setVatSubtotal(0)
            setVatAmount(0)
            setMixedVatRates(false)
            return
        }
        getQuote({ items, delivery_method: 'pickup' })
            .then((res: any) => {
                if (res?.storeDisabled) {
                    setVatRate(0)
                    setVatSubtotal(0)
                    setVatAmount(0)
                    setMixedVatRates(false)
                    return
                }
                setVatRate(Number(res?.vat_rate ?? 0))
                setVatSubtotal(Number(res?.vat_subtotal ?? 0))
                setVatAmount(Number(res?.vat_amount ?? 0))
                setMixedVatRates(Boolean(res?.mixed_vat_rates))
            })
            .catch((err) => {
                const backendMessage = err instanceof Error ? err.message.trim() : ''
                if (!backendMessage || backendMessage === 'Error interno del servidor') {
                    console.error('No se pudo calcular IVA del carrito', err)
                }
                setVatRate(0)
                setVatSubtotal(0)
                setVatAmount(0)
                setMixedVatRates(false)
            })
    }, [cartState.cartArray])

    const redirectToCheckout = () => {
        if (!canCheckout) return
        router.push('/checkout')
    }
    const canCheckout = salesEnabled && cartState.cartArray.length > 0
    const checkoutButtonStyle: React.CSSProperties = canCheckout
        ? { backgroundColor: '#1f3b3b', color: '#ffffff', opacity: 1 }
        : { backgroundColor: '#7f8f90', color: '#ffffff', opacity: 1 }

    return (
        <>
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
            </div>
            <div className="cart-block md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex justify-between max-xl:flex-col gap-y-8">
                        <div className="xl:w-2/3 xl:pr-3 w-full">
                            
                            <div className="heading banner mt-5" />
                            <div className="list-product w-full sm:mt-7 mt-5">
                                <div className='w-full'>
                                    <div className="heading bg-surface bora-4 pt-4 pb-4">
                                        <div className="flex">
                                            <div className="w-1/2">
                                                <div className="text-button text-center">Productos</div>
                                            </div>
                                            <div className="w-1/12">
                                                <div className="text-button text-center">Precio</div>
                                            </div>
                                            <div className="w-1/6">
                                                <div className="text-button text-center">Cantidad</div>
                                            </div>
                                            <div className="w-1/6">
                                                <div className="text-button text-center">Total</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="list-product-main w-full mt-3">
                                        {cartState.cartArray.length < 1 ? (
                                            <p className='text-button pt-3'>No hay productos en el carrito</p>
                                        ) : (
                                            cartState.cartArray.map((product) => {
                                                const itemPrice = Number((product as any).price ?? 0)
                                                const itemQuantity = Number((product as any).quantity ?? 1)
                                                const availableStock = Math.max(
                                                    0,
                                                    Number((product as any).availableStock ?? (product as any).inventory?.available ?? 0),
                                                )
                                                const itemTotal = itemPrice * itemQuantity
                                                return (
                                                    <div className="item flex md:mt-7 md:pb-7 mt-5 pb-5 border-b border-line w-full" key={product.id}>
                                                        <div className="w-1/2">
                                                            <div className="flex items-center gap-6">
                                                                <div className="bg-img md:w-[100px] w-20 aspect-[3/4]">
                                                                    <Image
                                                                        src={
                                                                            Array.isArray((product as any).thumbImage)
                                                                                ? (product as any).thumbImage[0]
                                                                                : Array.isArray((product as any).images)
                                                                                    ? (typeof (product as any).images[0] === 'string'
                                                                                        ? (product as any).images[0]
                                                                                        : ((product as any).images[0]?.url ?? ''))
                                                                                    : '/images/product/1.webp'
                                                                        }
                                                                        width={1000}
                                                                        height={1000}
                                                                        alt={product.name}
                                                                        className='w-full h-full object-cover rounded-lg'
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="text-title">{product.name}</div>
                                                                    <div className="list-select mt-3"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-1/12 price flex items-center justify-center">
                                                            <div className="text-title text-center">${itemPrice.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        </div>
                                                        <div className="w-1/6 flex items-center justify-center">
                                                            <div className="quantity-block bg-surface md:p-3 p-2 flex items-center justify-between rounded-lg border border-line md:w-[100px] flex-shrink-0 w-20">
                                                                <Icon.Minus
                                                                    onClick={() => {
                                                                        if (itemQuantity > 1) {
                                                                            handleQuantityChange(product.id, itemQuantity - 1)
                                                                        }
                                                                    }}
                                                                    className={`text-base max-md:text-sm ${itemQuantity === 1 ? 'disabled' : ''}`}
                                                                />
                                                                <div className="text-button quantity">{itemQuantity}</div>
                                                                <Icon.Plus
                                                                    onClick={() => handleQuantityChange(product.id, itemQuantity + 1)}
                                                                    className={`text-base max-md:text-sm ${availableStock > 0 && itemQuantity >= availableStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="w-1/6 flex total-price items-center justify-center">
                                                            <div className="text-title text-center">${itemTotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        </div>
                                                        <div className="w-1/12 flex items-center justify-center">
                                                            <Icon.XCircle
                                                                className='text-xl max-md:text-base text-red cursor-pointer hover:text-black duration-500'
                                                                onClick={() => {
                                                                    removeFromCart(product.id)
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                        <div className="xl:w-1/3 xl:pl-12 w-full">
                            <div className="checkout-block bg-surface p-6 rounded-2xl">
                                <div className="heading5">Resumen de compra</div>
                                <div className="total-block py-5 flex justify-between border-b border-line">
                                    <div className="text-title">Subtotal sin IVA</div>
                                    <div className="text-title">$<span className="total-product">{formattedVatSubtotal}</span></div>
                                </div>
                                {vatAmount > 0 && (
                                    <div className="discount-block py-5 flex justify-between border-b border-line">
                                        <div className="text-title">{mixedVatRates ? 'IVA aplicado' : `IVA (${vatRate.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`}</div>
                                        <div className="text-title">$<span className="discount">{formattedVatAmount}</span></div>
                                    </div>
                                )}
                                <div className="discount-block py-5 flex justify-between border-b border-line">
                                    <div className="text-title">Descuentos</div>
                                    <div className="text-title"> <span>$</span><span className="discount">{formattedDiscount}</span></div>
                                </div>
                                <div className="total-cart-block pt-4 pb-4 flex justify-between">
                                    <div className="heading5">Total</div>
                                    <div className="heading5">$<span className="total-cart heading5">{formattedCartTotal}</span></div>
                                </div>
                                <div className="block-button flex flex-col items-center gap-y-4 mt-5">
                                    <button
                                        type="button"
                                        className={`checkout-btn button-main text-center w-full ${!canCheckout ? 'cursor-not-allowed' : ''}`}
                                        onClick={redirectToCheckout}
                                        aria-disabled={!canCheckout}
                                        style={checkoutButtonStyle}
                                    >
                                        Continuar al pago
                                    </button>
                                    {!salesEnabled && (
                                        <div className="w-full rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-xs text-red text-left">
                                            {salesDisabledMessage}
                                        </div>
                                    )}
                                    <Link className="text-button hover-underline" href={"/tienda"}>Seguir comprando</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
            <Footer />
        </>
    )
}

export default Cart
