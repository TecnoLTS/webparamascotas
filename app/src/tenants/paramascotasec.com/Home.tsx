import React from 'react'
import dynamic from 'next/dynamic'
import MenuPet from '@/components/Header/Menu/MenuPet'
import SliderPet from '@/components/Slider/SliderPet'
import Footer from '@/components/Footer/Footer'
import { ProductType } from '@/type/ProductType'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import { getCategoryCards, getHomeSecondaryCategoryCards } from '@/data/petCategoryCards'
import type { ProductBrandReference } from '@/lib/productReferenceData'

const Collection = dynamic(() => import('@/components/Pet/Collection'))
const Collection2 = dynamic(() => import('@/components/Pet/Collection2'))
const DeferredFeatureProduct = dynamic(() => import('@/components/Pet/DeferredFeatureProduct'))
const ChooseUs = dynamic(() => import('@/components/Pet/ChooseUs'))
const DeferredAllProducts = dynamic(() => import('@/components/Product/DeferredAllProducts'))
const Benefit = dynamic(() => import('@/components/Pet/Benefit'))
const Brand = dynamic(() => import('@/components/Pet/Brand'))

const ParamascotasecHome = ({
  products,
  brandLogos = [],
}: {
  products: ProductType[]
  brandLogos?: ProductBrandReference[]
}) => {
  const availableCategoryIds = buildCatalogCategoryCards(products).map((category) => category.id)
  const availableCategoryIdSet = new Set(availableCategoryIds.map((categoryId) => categoryId.toLowerCase()))
  const homeCategories = getCategoryCards().filter((category) =>
    category.id === 'todos' || availableCategoryIdSet.has(category.id.toLowerCase())
  )
  const homeFeaturedCategories = getHomeSecondaryCategoryCards().filter((category) =>
    availableCategoryIdSet.has(category.id.toLowerCase())
  )
  const footerCategoryIds = availableCategoryIds.filter((categoryId) => categoryId.toLowerCase() !== 'todos')

  return (
    <>
      <header id="header" className="relative w-full style-pet">
        <MenuPet searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <main id="main-content">
        <SliderPet />
        <Collection categories={homeCategories} />
        <DeferredAllProducts data={products} />
        <Benefit props="md:py-10 py-5" />
        <ChooseUs />
        <DeferredFeatureProduct data={products} start={0} limit={4} />
        <Collection2 categories={homeFeaturedCategories} />
        <Brand products={products} brandReferences={brandLogos} />
      </main>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}

export default ParamascotasecHome
