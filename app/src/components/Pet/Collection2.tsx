import React from 'react'
import Link from 'next/link'
import Image from '@/components/Common/AppImage'
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
    const featuredCategories = categories.slice(0, 3)

    if (featuredCategories.length === 0) {
        return null
    }

    const renderCategoryTile = (
        item: PetCategoryCard,
        options?: {
            aspectClass?: string
            imageVariant?: PetCategoryFeaturedImageVariant
            labelWidthClass?: string
            wrapperClass?: string
        }
    ) => {
        const imageSpec = getHomeFeaturedCategoryImageSpec(item.id, options?.imageVariant)
        const dynamicFeaturedImage = options?.imageVariant ? item.featuredImages?.[options.imageVariant] : undefined
        // Cada slot ya publica un WebP recortado a 2x de su tamano visual.
        // Evitar el optimizador aqui elimina un srcset de decenas de candidatos
        // sin degradar la resolucion ni cambiar la imagen elegida por breakpoint.

        return (
            <Link
                key={item.id}
                href={getCategoryUrl(item.id)}
                className={`collection-item block h-full relative md:rounded-[20px] rounded-xl overflow-hidden cursor-pointer ${options?.wrapperClass ?? ''}`}
            >
                <div className={`bg-img h-full w-full bg-[#f6f7f9] ${options?.aspectClass ?? 'aspect-square'}`}>
                    <Image
                        src={dynamicFeaturedImage || imageSpec?.src || item.image}
                        alt={item.label}
                        width={1000}
                        height={1000}
                        quality={90}
                        loading="lazy"
                        unoptimized
                        className='category-card-image h-full w-full object-cover'
                        style={{ transform: 'none' }}
                    />
                </div>
                <div
                    className={`collection-name heading5 text-center sm:bottom-[30px] bottom-3 sm:bottom-4 ${options?.labelWidthClass ?? 'w-[calc(100%-28px)] max-w-[190px] sm:max-w-none lg:w-[200px]'} md:w-auto px-4 sm:max-lg:px-5 lg:py-3 py-2 sm:py-1.5 bg-white rounded-xl duration-500 max-md:text-[16px] max-md:leading-[22px]`}
                >
                    {item.label}
                </div>
            </Link>
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
                            labelWidthClass: 'w-[calc(100%-28px)] max-w-[210px]',
                        })}
                    </div>
                    <div>
                        {renderCategoryTile(secondaryTop, {
                            aspectClass: 'aspect-square',
                            imageVariant: 'mobileSecondary',
                            labelWidthClass: 'w-[calc(100%-20px)] max-w-[160px]',
                        })}
                    </div>
                    <div>
                        {renderCategoryTile(secondaryBottom, {
                            aspectClass: 'aspect-square',
                            imageVariant: 'mobileSecondary',
                            labelWidthClass: 'w-[calc(100%-20px)] max-w-[160px]',
                        })}
                    </div>
                </div>
                <div className='hidden sm:grid sm:grid-cols-2 sm:items-start md:gap-[30px] gap-[16px]'>
                    <div className="left">
                        {renderCategoryTile(primary, {
                            aspectClass: 'aspect-[630/620]',
                            imageVariant: 'desktopPrimary',
                            labelWidthClass: 'lg:w-[220px]',
                        })}
                    </div>
                    <div className="right grid grid-cols-1 md:gap-[30px] gap-[16px]">
                        <div>
                            {renderCategoryTile(secondaryTop, {
                                aspectClass: 'aspect-[630/295]',
                                imageVariant: 'desktopSecondary',
                                labelWidthClass: 'lg:w-[220px]',
                            })}
                        </div>
                        <div>
                            {renderCategoryTile(secondaryBottom, {
                                aspectClass: 'aspect-[630/295]',
                                imageVariant: 'desktopSecondary',
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
