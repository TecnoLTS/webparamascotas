import React from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'

const Banner = () => {
    return (
        <>
            <div className="banner-block">
                <div className="container md:py-10 py-5">
                    <div className="list-banner grid lg:grid-cols-3 md:grid-cols-2 gap-[20px]">
                        <Link href={'/tienda'} className="banner-item relative block rounded-[20px] overflow-hidden duration-500">
                            <div className="banner-img w-full h-full">
                                <Image
                                    src={'/images/banner/27.webp'}
                                    width={1000}
                                    height={800}
                                    alt='bg-img'
                                    className='w-full h-full object-cover duration-500'
                                />
                            </div>
                            <div className="text-content xl:py-0 md:py-4 absolute top-1/2 left-8 -translate-y-1/2 text-white">
                                <div className="button-upper-case">15 productos</div>
                                <div className="heading3 mt-3">Alimento para perros</div>
                                <div className="heading6 font-normal mt-1">Sillón de bambú relajante</div>
                                <div className="button-main mt-5">Compra ahora</div>
                            </div>
                        </Link>
                        <Link href={'/tienda/accesorios'} className="banner-item relative block rounded-[20px] overflow-hidden duration-500">
                            <div className="banner-img w-full h-full">
                                <Image
                                    src={'/images/banner/28.webp'}
                                    width={1000}
                                    height={800}
                                    alt='bg-img'
                                    className='w-full h-full object-cover duration-500'
                                />
                            </div>
                            <div className="text-content xl:py-0 md:py-4 absolute top-1/2 left-8 -translate-y-1/2 text-white">
                                <div className="button-upper-case">15 productos</div>
                                <div className="heading3 mt-3">Alimento para gatos</div>
                                <div className="heading6 font-normal mt-1">Sillón de bambú relajante</div>
                                <div className="button-main mt-5">Compra ahora</div>
                            </div>
                        </Link>
                        <Link href={'/tienda/alimento'} className="banner-item relative block rounded-[20px] overflow-hidden duration-500 max-lg:hidden">
                            <div className="banner-img w-full h-full">
                                <Image
                                    src={'/images/banner/29.webp'}
                                    width={1000}
                                    height={800}
                                    alt='bg-img'
                                    className='w-full h-full object-cover duration-500'
                                />
                            </div>
                            <div className="text-content xl:py-0 md:py-4 absolute top-1/2 left-8 -translate-y-1/2 text-white">
                                <div className="button-upper-case">15 productos</div>
                                <div className="heading3 mt-3">20% de descuento</div>
                                <div className="heading6 font-normal mt-1">Sillón de bambú relajante</div>
                                <div className="button-main mt-5">Compra ahora</div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Banner
