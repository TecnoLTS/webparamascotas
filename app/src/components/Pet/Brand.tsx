'use client'

import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import { ProductType } from '@/type/ProductType';
import { getCatalogBrandStats } from '@/lib/catalog';
import { normalizeProductBrandRecords, type ProductBrandReference } from '@/lib/productReferenceData';

type BrandProps = {
    products?: ProductType[]
    brandReferences?: ProductBrandReference[]
}

const normalizeBrandKey = (value?: string | null) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('es-EC')

const Brand = ({ products = [], brandReferences = [] }: BrandProps) => {
    const logoReferences = normalizeProductBrandRecords(brandReferences).filter((brand) => brand.logoUrl)
    const logosByBrand = new Map(logoReferences.map((brand) => [normalizeBrandKey(brand.name), brand]))
    const orderedBrandNames = products.length > 0
        ? getCatalogBrandStats(products).map((brandStat) => brandStat.brand)
        : logoReferences.map((brand) => brand.name)
    const brands = orderedBrandNames
        .map((brandName) => {
            const reference = logosByBrand.get(normalizeBrandKey(brandName))
            if (!reference?.logoUrl) return null

            return {
                name: brandName,
                logoUrl: reference.logoUrl,
            }
        })
        .filter((brand): brand is { name: string; logoUrl: string } => Boolean(brand))

    if (brands.length === 0) {
        return null
    }

    const enableLoop = brands.length > 6

    return (
        <>
            <div className="brand-block md:py-[60px] py-[32px]">
                <div className="container">
                    <div className="heading3 text-center mb-8">Marcas con las que trabajamos</div>
                    <div className="list-brand">
                        <Swiper
                            spaceBetween={12}
                            slidesPerView={2}
                            loop={enableLoop}
                            roundLengths
                            modules={[Autoplay]}
                            autoplay={{
                                delay: 4000,
                            }}
                            breakpoints={{
                                500: {
                                    slidesPerView: 3,
                                    spaceBetween: 16,
                                },
                                680: {
                                    slidesPerView: 4,
                                    spaceBetween: 16,
                                },
                                992: {
                                    slidesPerView: 5,
                                    spaceBetween: 16,
                                },
                                1200: {
                                    slidesPerView: 6,
                                    spaceBetween: 16,
                                },
                            }}
                        >
                            {brands.map((brand) => (
                                <SwiperSlide key={brand.name}>
                                    <div className="brand-item relative flex items-center justify-center min-h-[76px] rounded-2xl border border-line bg-white px-4 py-3">
                                        <img
                                            src={brand.logoUrl}
                                            alt={`Logo ${brand.name}`}
                                            className="block h-auto max-h-[52px] w-auto max-w-[140px] object-contain"
                                            loading="lazy"
                                            decoding="async"
                                            draggable={false}
                                        />
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Brand
