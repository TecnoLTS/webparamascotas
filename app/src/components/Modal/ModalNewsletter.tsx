'use client'

import { useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import InlineSpinner from '@/components/Other/InlineSpinner'
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext';
import Image from '@/components/Common/AppImage';
import useProducts from '@/hooks/useProducts'
import { getProductSeoPath } from '@/lib/seoUrls'

const ModalNewsletter = () => {
    const [open, setOpen] = useState<boolean>(false)
    const router = useRouter()
    const { openQuickview } = useModalQuickviewContext()
    const { products, loading, error } = useProducts({ pageSize: 16, enabled: open })

    const handleDetailProduct = (product: any) => {
        router.push(getProductSeoPath(product));
    };

    useEffect(() => {
        setTimeout(() => {
            setOpen(true)
        }, 3000)
    }, [])

    return (
        <div className="modal-newsletter" onClick={() => setOpen(false)}>
            <div className="container h-full flex items-center justify-center w-full">
                <div
                    className={`modal-newsletter-main ${open ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    <div className="main-content flex rounded-[20px] overflow-hidden w-full">
                        <div
                            className="left lg:w-1/2 sm:w-2/5 max-sm:hidden bg-green flex flex-col items-center justify-center gap-5 py-14">
                            <div className="text-xs font-semibold uppercase text-center">Special Offer</div>
                            <div
                                className="lg:text-[70px] text-4xl lg:leading-[78px] leading-[42px] font-bold uppercase text-center">
                                Black<br />Fridays</div>
                            <div className="text-button-uppercase text-center">New customers save <span
                                className="text-red">30%</span>
                                with the code</div>
                            <div className="text-button-uppercase text-red bg-white py-2 px-4 rounded-lg">GET20off</div>
                            <div className="button-main w-fit bg-black text-white hover:bg-white uppercase">Copy coupon code
                            </div>
                        </div>
                        <div className="right lg:w-1/2 sm:w-3/5 w-full bg-white sm:pt-10 sm:pl-10 max-sm:p-6 relative">
                            <div
                                className="close-newsletter-btn w-10 h-10 flex items-center justify-center border border-line rounded-full absolute right-5 top-5 cursor-pointer" onClick={() => setOpen(false)}>
                                <Icon.X weight='bold' className='text-xl' />
                            </div>
                            <div className="heading5 pb-5">You May Also Like</div>
                            {loading && (
                                <div className="flex items-center gap-2 py-4 text-secondary">
                                    <InlineSpinner size={18} className="text-black" />
                                    <span>Cargando productos...</span>
                                </div>
                            )}
                            {error && !loading && <div className="py-4 text-secondary">No se pudieron cargar productos.</div>}
                            {!loading && products.length > 0 && (
                                <div className="list flex flex-col gap-5 overflow-x-auto sm:pr-6">
                                    {products.slice(11, 16).map((item) => {
                                        const firstImage = Array.isArray(item.images) ? item.images[0] : null
                                        const src = typeof firstImage === 'string'
                                            ? firstImage
                                            : (firstImage as any)?.url ?? item.thumbImage?.[0] ?? '/images/product/1.webp'
                                        return (
                                            <div
                                                className='product-item item pb-5 flex items-center justify-between gap-3 border-b border-line'
                                                key={item.id}
                                            >
                                                <div
                                                    className="infor flex items-center gap-5 cursor-pointer"
                                                    onClick={() => handleDetailProduct(item)}
                                                >
                                                    <div className="bg-img flex-shrink-0">
                                                        <Image width={5000} height={5000} src={src} alt={item.name}
                                                            className='w-[100px] aspect-square flex-shrink-0 rounded-lg' />
                                                    </div>
                                                    <div className=''>
                                                        <div className="name text-button">{item.name}</div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="product-price text-title">${Number(item.price ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            <div className="product-origin-price text-title text-secondary2">
                                                                <del>${Number(item.originPrice ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</del>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="quick-view-btn button-main sm:py-3 py-2 sm:px-5 px-4 bg-black hover:bg-green text-white rounded-full whitespace-nowrap"
                                                    onClick={() => openQuickview(item)}
                                                >
                                                    QUICK VIEW
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ModalNewsletter
