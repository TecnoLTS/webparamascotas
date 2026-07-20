'use client'

import React, { useMemo, useState } from 'react'
import Product from '../Product/Product'
import { ProductType } from '@/type/ProductType'
import { motion } from 'framer-motion'
import { getCatalogBrandStats, isProductOnSale } from '@/lib/catalog'

interface Props {
    data: Array<ProductType>;
    start: number;
    limit: number;
}

const toTimestamp = (value?: string) => {
    const parsed = Date.parse(value ?? '')
    return Number.isFinite(parsed) ? parsed : 0
}

const getTabLabel = (tabId: string, offersFilterId: string) => {
    if (tabId === 'todas') return 'Todas'
    if (tabId === offersFilterId) return 'Ofertas'
    return tabId
}

const FeatureProduct: React.FC<Props> = ({ data, start, limit }) => {
    const offersFilterId = '__offers__'
    const [activeTab, setActiveTab] = useState<string>('');
    const newestFirst = useMemo(
        () =>
            data.slice().sort((left, right) => {
                const createdDiff = toTimestamp(right.createdAt) - toTimestamp(left.createdAt)
                if (createdDiff !== 0) return createdDiff

                const updatedDiff = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt)
                if (updatedDiff !== 0) return updatedDiff

                return String(right.id).localeCompare(String(left.id))
            }),
        [data]
    )
    const explicitNewProducts = useMemo(
        () => newestFirst.filter((product) => product.new),
        [newestFirst]
    )
    const hasExplicitNew = explicitNewProducts.length > 0
    const featuredPool = useMemo(() => {
        if (hasExplicitNew) {
            return explicitNewProducts
        }

        const fallbackLimit = Math.max(limit * 4, 16)
        return newestFirst.slice(0, fallbackLimit)
    }, [explicitNewProducts, hasExplicitNew, limit, newestFirst])
    const matchesTab = React.useCallback((product: ProductType, tabId: string) => {
        if (tabId === 'todas') {
            return true
        }

        if (tabId === offersFilterId) {
            return isProductOnSale(product)
        }

        return (product.brand ?? '').trim() === tabId
    }, [offersFilterId])
    const availableTabs = useMemo(() => {
        const brandTabs = getCatalogBrandStats(featuredPool).map((item) => item.brand)

        return [
            'todas',
            ...(featuredPool.some((product) => isProductOnSale(product)) ? [offersFilterId] : []),
            ...brandTabs,
        ]
    }, [featuredPool, offersFilterId])
    const resolvedActiveTab = availableTabs.includes(activeTab) ? activeTab : (availableTabs[0] ?? '')

    React.useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
            setActiveTab(availableTabs[0]);
        }
    }, [activeTab, availableTabs]);

    const handleTabClick = (type: string) => {
        setActiveTab(type);
    };

    const filteredProducts = useMemo(
        () =>
            featuredPool.filter((product: ProductType) => matchesTab(product, resolvedActiveTab)),
        [featuredPool, matchesTab, resolvedActiveTab]
    )
    const visibleProducts = useMemo(
        () =>
            filteredProducts.slice(start, start + limit).map((product) => ({
                ...product,
                new: true,
            })),
        [filteredProducts, limit, start]
    )

    if (availableTabs.length === 0 || featuredPool.length === 0) {
        return null
    }

    return (
        <>
            <div className="what-new-block md:pt-20 pt-10">
                <div className="container">
                    <div className="heading flex flex-col items-center text-center">
                        <div className="heading3">Novedades</div>
                        <div className="menu-tab style-pet flex w-full min-w-0 max-w-full flex-wrap items-center justify-center gap-2 overflow-visible rounded-2xl bg-surface p-1 mt-6">
                            {availableTabs.map((type: string) => (
                                <div
                                    key={type}
                                    className={`tab-item relative shrink-0 text-secondary text-button-uppercase py-2 px-5 cursor-pointer duration-500 ${resolvedActiveTab === type ? 'active text-white' : 'hover:text-black'}`}
                                    onClick={() => handleTabClick(type)}
                                >
                                    {resolvedActiveTab === type && (
                                        <motion.div layoutId='active-pill' className='absolute inset-0 rounded-2xl bg-black'></motion.div>
                                    )}
                                    <span className='relative text-button-uppercase z-[1]'>
                                        {getTabLabel(type, offersFilterId)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="list-product hide-product-sold grid lg:grid-cols-4 grid-cols-2 sm:gap-[30px] gap-[20px] md:mt-10 mt-6">
                        {visibleProducts.length > 0 ? (
                            visibleProducts.map((prd: ProductType) => (
                                <Product data={prd} type='grid' key={prd.id} style='style-1' />
                            ))
                        ) : (
                            <div className="col-span-full rounded-2xl bg-surface px-6 py-10 text-center text-secondary">
                                Aun no hay novedades en esta categoria.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default FeatureProduct
