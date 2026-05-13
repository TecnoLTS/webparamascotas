'use client'

import React from 'react'
import Image from '@/components/Common/AppImage'
import { useRouter } from 'next/navigation'
import {
    PetCategoryCard,
    PetCategoryFeaturedImageVariant,
    getCategoryUrl,
    getHomeFeaturedCategoryImageSpec,
    getHomeSecondaryCategoryCards,
} from '@/data/petCategoryCards'

type CollectionProps = {
    categories?: PetCategoryCard[]
}

const Collection = ({ categories = getHomeSecondaryCategoryCards() }: CollectionProps) => {
    const router = useRouter()
    const featuredCategories = categories.slice(0, 3)

    const sizesMobilePrimary = '92vw'
    const sizesMobileSecondary = '46vw'
    const sizesDesktopPrimary = '(min-width: 1150px) 630px, (min-width: 640px) calc((100vw - 32px - 16px) / 2), 92vw'
    const sizesDesktopSecondary = '(min-width: 1150px) 630px, (min-width: 640px) calc((100vw - 32px - 16px) / 2), calc((100vw - 32px - 12px) / 2)'

    const handleCategoryClick = (category: string) => {
        router.push(getCategoryUrl(category))
    }

    if (featuredCategories.length === 0) {
        return null
    }

    const renderCategoryTile = (
        item: PetCategoryCard,
        options?: {
            aspectClass?: string
            imageVariant?: PetCategoryFeaturedImageVariant
            sizes?: string
            labelWidthClass?: string
            wrapperClass?: string
        }
    ) => {
        const imageSpec = getHomeFeaturedCategoryImageSpec(item.id, options?.imageVariant)
        const dynamicFeaturedImage = options?.imageVariant ? item.featuredImages?.[options.imageVariant] : undefined

        return (
            <div
                key={item.id}
                className={`collection-item block h-full relative md:rounded-[20px] rounded-xl overflow-hidden cursor-pointer ${options?.wrapperClass ?? ''}`}
                onClick={() => handleCategoryClick(item.id)}
            >
                <div className={`bg-img h-full w-full bg-[#f6f7f9] ${options?.aspectClass ?? 'aspect-square'}`}>
                    <Image
                        src={dynamicFeaturedImage || imageSpec?.src || item.image}
                        alt={item.label}
                        width={1000}
                        height={1000}
                        quality={90}
                        loading="lazy"
                        sizes={options?.sizes ?? '(min-width: 1280px) 360px, (min-width: 640px) 44vw, 92vw'}
                        className='category-card-image h-full w-full object-contain'
                        style={{ transform: 'none' }}
                    />
                </div>
                <div
                    className={`collection-name heading5 text-center sm:bottom-[30px] bottom-3 sm:bottom-4 ${options?.labelWidthClass ?? 'w-[calc(100%-28px)] max-w-[190px] sm:max-w-none lg:w-[200px]'} md:w-auto px-4 sm:max-lg:px-5 lg:py-3 py-2 sm:py-1.5 bg-white rounded-xl duration-500 max-md:text-[16px] max-md:leading-[22px]`}
                >
                    {item.label}
                </div>
            </div>
        )
    }

    if (featuredCategories.length < 3) {
        return null
    }

    const [primary, secondaryTop, secondaryBottom] = featuredCategories

    return (
        <div className="collection-block cosmetic md:pt-20 pt-10">
            <div className="container">
                <div className="grid grid-cols-2 gap-[12px] sm:hidden">
                    <div className="col-span-2">
                        {renderCategoryTile(primary, {
                            aspectClass: 'aspect-[16/10]',
                            imageVariant: 'mobilePrimary',
                            sizes: sizesMobilePrimary,
                            labelWidthClass: 'w-[calc(100%-28px)] max-w-[210px]',
                        })}
                    </div>
                    <div>
                        {renderCategoryTile(secondaryTop, {
                            aspectClass: 'aspect-square',
                            imageVariant: 'mobileSecondary',
                            sizes: sizesMobileSecondary,
                            labelWidthClass: 'w-[calc(100%-20px)] max-w-[160px]',
                        })}
                    </div>
                    <div>
                        {renderCategoryTile(secondaryBottom, {
                            aspectClass: 'aspect-square',
                            imageVariant: 'mobileSecondary',
                            sizes: sizesMobileSecondary,
                            labelWidthClass: 'w-[calc(100%-20px)] max-w-[160px]',
                        })}
                    </div>
                </div>
                <div className='hidden sm:grid sm:grid-cols-2 sm:items-start md:gap-[30px] gap-[16px]'>
                    <div className="left">
                        {renderCategoryTile(primary, {
                            aspectClass: 'aspect-[630/620]',
                            imageVariant: 'desktopPrimary',
                            sizes: sizesDesktopPrimary,
                            labelWidthClass: 'lg:w-[220px]',
                        })}
                    </div>
                    <div className="right grid grid-cols-1 md:gap-[30px] gap-[16px]">
                        <div>
                            {renderCategoryTile(secondaryTop, {
                                aspectClass: 'aspect-[630/295]',
                                imageVariant: 'desktopSecondary',
                                sizes: sizesDesktopSecondary,
                                labelWidthClass: 'lg:w-[220px]',
                            })}
                        </div>
                        <div>
                            {renderCategoryTile(secondaryBottom, {
                                aspectClass: 'aspect-[630/295]',
                                imageVariant: 'desktopSecondary',
                                sizes: sizesDesktopSecondary,
                                labelWidthClass: 'lg:w-[220px]',
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Collection
