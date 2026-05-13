import React from 'react'
import dynamic from 'next/dynamic'
import MenuPet from '@/components/Header/Menu/MenuPet'
import SliderPet from '@/components/Slider/SliderPet'
import Footer from '@/components/Footer/Footer'
import { ProductType } from '@/type/ProductType'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import type { ProductBrandReference, ProductCategoryImageReference } from '@/lib/productReferenceData'

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
  publicCategories = [],
}: {
  products: ProductType[]
  brandLogos?: ProductBrandReference[]
  publicCategories?: ProductCategoryImageReference[]
}) => {
const imageSectionCategories = publicCategories.filter(
  (category) => category.showInImageSection !== false
)

const categoryCards = buildCatalogCategoryCards(products, undefined, {
  referenceCategories: imageSectionCategories,
})

const allCategoryCards = buildCatalogCategoryCards(products, undefined, {
  referenceCategories: publicCategories,
})

const availableCategoryIds = allCategoryCards.map((category) => category.id)
  const availableCategoryIdSet = new Set(availableCategoryIds.map((categoryId) => categoryId.toLowerCase()))
  //const homeCategories = categoryCards.filter((category) => availableCategoryIdSet.has(category.id.toLowerCase()))
  const homeCategories = categoryCards.filter((category) => {
  const categoryId = category.id.toLowerCase()
  return categoryId !== 'todos' && availableCategoryIdSet.has(categoryId)
})
  const homeFeaturedCategories = categoryCards
    .filter((category) => !['todos', 'descuentos'].includes(category.id.toLowerCase()))
    .slice(0, 3)
  const footerCategoryIds = availableCategoryIds

  return (
    <>
      <header id="header" className="relative w-full style-pet">
        <MenuPet searchProducts={products} availableCategoryIds={availableCategoryIds} />
      </header>
      <main id="main-content">
        <SliderPet />
        <Collection categories={homeCategories} />
        <DeferredAllProducts data={products} categoryIds={availableCategoryIds} />
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
