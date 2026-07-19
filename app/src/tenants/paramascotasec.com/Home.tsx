import React from 'react'
import dynamic from 'next/dynamic'
import MenuPet from '@/components/Header/Menu/MenuPet'
import SliderPet from '@/components/Slider/SliderPet'
import Footer from '@/components/Footer/Footer'
import { buildCatalogCategoryCards } from '@/lib/catalog'
import type { ProductBrandReference, ProductCategoryImageReference } from '@/lib/productReferenceData'
import { DeferredHomeBenefits, DeferredHomeDiscovery } from '@/components/Home/DeferredHomeSections'

const Collection = dynamic(() => import('@/components/Pet/Collection'))
const DeferredFeatureProduct = dynamic(() => import('@/components/Pet/DeferredFeatureProduct'))
const DeferredAllProducts = dynamic(() => import('@/components/Product/DeferredAllProducts'))

const normalizeHomeCategoryId = (value: string) => {
  const normalized = value.trim().toLocaleLowerCase('es-EC')
  if (normalized === 'ofertas') return 'descuentos'
  if (normalized === 'todas') return 'todos'
  if (['cuidado', 'cuidados', 'higiene'].includes(normalized)) return 'salud'
  return normalized
}

const buildReferenceCategoryIdSet = (categories: ProductCategoryImageReference[]) =>
  new Set(categories.map((category) => normalizeHomeCategoryId(category.name)).filter(Boolean))

const ParamascotasecHome = ({
  brandLogos = [],
  publicCategories = [],
}: {
  brandLogos?: ProductBrandReference[]
  publicCategories?: ProductCategoryImageReference[]
}) => {
  const topSectionCategories = publicCategories.filter(
    (category) => category.showInTopSection !== false
  )

  const featuredSectionCategories = publicCategories.filter(
    (category) => category.showInFeaturedSection !== false
  )
  const hasPublicCategoryControls = publicCategories.length > 0
  const topSectionCategoryIds = buildReferenceCategoryIdSet(topSectionCategories)
  const featuredSectionCategoryIds = buildReferenceCategoryIdSet(featuredSectionCategories)

  const topCategoryCards = buildCatalogCategoryCards([], undefined, {
    referenceCategories: topSectionCategories,
  })

  const featuredCategoryCards = buildCatalogCategoryCards([], undefined, {
    referenceCategories: featuredSectionCategories,
  })

  const allCategoryCards = buildCatalogCategoryCards([], undefined, {
    referenceCategories: publicCategories,
  })

  const availableCategoryIds = allCategoryCards.map((category) => category.id)
  const availableCategoryIdSet = new Set(availableCategoryIds.map((categoryId) => categoryId.toLowerCase()))
  const homeCategories = topCategoryCards.filter((category) => {
    const categoryId = category.id.toLowerCase()
    return categoryId !== 'todos'
      && availableCategoryIdSet.has(categoryId)
      && (!hasPublicCategoryControls || topSectionCategoryIds.has(normalizeHomeCategoryId(category.id)))
  })
  const homeFeaturedCategories = featuredCategoryCards
    .filter((category) => (
      !['todos', 'descuentos'].includes(category.id.toLowerCase())
      && (!hasPublicCategoryControls || featuredSectionCategoryIds.has(normalizeHomeCategoryId(category.id)))
    ))
    .slice(0, 3)
  const footerCategoryIds = availableCategoryIds

  return (
    <>
      <header id="header" className="relative w-full style-pet">
        <MenuPet availableCategoryIds={availableCategoryIds} />
      </header>
      <main id="main-content">
        <SliderPet />
        <Collection categories={homeCategories} />
        <DeferredAllProducts categoryIds={availableCategoryIds} />
        <DeferredHomeBenefits />
        <DeferredFeatureProduct start={0} limit={4} />
        <DeferredHomeDiscovery categories={homeFeaturedCategories} brandLogos={brandLogos} />
      </main>
      <Footer categoryIds={footerCategoryIds} />
    </>
  )
}

export default ParamascotasecHome
