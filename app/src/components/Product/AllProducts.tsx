'use client'

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ProductType } from '@/type/ProductType'
import Product from './Product'
import { getCategoryFilter, getCategoryLabel, matchesPetCategoryFilter } from '@/data/petCategoryCards'
import {
    getCatalogAllSecondaryId,
    getCatalogAllSecondaryOption,
    getCatalogSecondaryConfig,
    isCatalogPrimaryFilterId,
    matchesCatalogSecondaryFilter,
} from '@/lib/catalogBrowse'
import { buildCatalogCategoryCards, isProductOnSale, sortCatalogProductsByFamily } from '@/lib/catalog'
import { buildProductSearchIndex, filterProductsBySearch, sanitizeProductSearchQuery } from '@/lib/productSearch'

interface Props {
    data: Array<ProductType>;
    categoryIds?: string[];
    pageSize?: number;
}

const getPrimaryFilterLabel = (filterId: string) => {
    return getCategoryLabel(filterId)
}

const normalizePrimaryFilterId = (categoryId: string) => {
    const normalized = categoryId.trim().toLowerCase()
    if (normalized === 'todas') return 'todos'
    if (normalized === 'ofertas') return 'descuentos'
    if (['perros', 'gatos'].includes(normalized)) return ''
    return normalized
}

const AllProducts: React.FC<Props> = ({
    data,
    categoryIds,
    pageSize = 15,
}) => {
    const allSecondaryId = getCatalogAllSecondaryId()
    const [page, setPage] = useState<number>(1)
    const [activePrimaryFilter, setActivePrimaryFilter] = useState<string>('todos')
    const [activeSecondaryFilter, setActiveSecondaryFilter] = useState<string>(allSecondaryId)
    const [searchQuery, setSearchQuery] = useState<string>('')

    const productsRef = useRef<HTMLDivElement | null>(null)
    const searchCardRef = useRef<HTMLDivElement | null>(null)
    const secondaryFiltersRef = useRef<HTMLDivElement | null>(null)
    const productGridRef = useRef<HTMLDivElement | null>(null)
    const deferredSearchQuery = useDeferredValue(searchQuery)

    const productSearchIndex = useMemo(() => buildProductSearchIndex(data), [data])
    const effectiveSearchQuery = useMemo(() => sanitizeProductSearchQuery(deferredSearchQuery), [deferredSearchQuery])
    const searchScopedProducts = useMemo(() => {
        if (!effectiveSearchQuery) {
            return data
        }

        return filterProductsBySearch(data, effectiveSearchQuery, productSearchIndex)
    }, [data, effectiveSearchQuery, productSearchIndex])
    const primaryFilterIds = useMemo(() => {
        const sourceCategoryIds = categoryIds?.length
            ? categoryIds
            : buildCatalogCategoryCards(data).map((category) => category.id)
        const normalizedIds = sourceCategoryIds
            .map(normalizePrimaryFilterId)
            .filter(Boolean)

        return Array.from(new Set(['todos', ...normalizedIds]))
    }, [categoryIds, data])
    const matchesPrimaryFilter = React.useCallback((product: ProductType, filterId: string) => {
        if (!filterId || filterId === 'todos') {
            return true
        }

        if (filterId === 'descuentos') {
            return isProductOnSale(product)
        }

        return matchesPetCategoryFilter(product, getCategoryFilter(filterId))
    }, [])

    const primaryFilterCounts = useMemo(() => {
        const counts = new Map<string, number>()
        primaryFilterIds.forEach((filterId) => {
            counts.set(filterId, searchScopedProducts.filter((product) => matchesPrimaryFilter(product, filterId)).length)
        })
        return counts
    }, [matchesPrimaryFilter, primaryFilterIds, searchScopedProducts])

    const primaryScopedProducts = useMemo(
        () => searchScopedProducts.filter((product) => matchesPrimaryFilter(product, activePrimaryFilter)),
        [activePrimaryFilter, matchesPrimaryFilter, searchScopedProducts]
    )

    const secondaryConfig = useMemo(
        () => isCatalogPrimaryFilterId(activePrimaryFilter)
            ? getCatalogSecondaryConfig(activePrimaryFilter, primaryScopedProducts)
            : null,
        [activePrimaryFilter, primaryScopedProducts]
    )

    const secondaryOptions = useMemo(() => {
        if (!secondaryConfig) return []
        return [getCatalogAllSecondaryOption(primaryScopedProducts.length), ...secondaryConfig.options]
    }, [primaryScopedProducts.length, secondaryConfig])

    const visibleSecondaryOptions = useMemo(() => secondaryOptions, [secondaryOptions])

    const filteredData = useMemo(
        () => primaryScopedProducts.filter((product) =>
            isCatalogPrimaryFilterId(activePrimaryFilter)
                ? matchesCatalogSecondaryFilter(product, activePrimaryFilter, activeSecondaryFilter)
                : true
        ),
        [activePrimaryFilter, activeSecondaryFilter, primaryScopedProducts]
    )

    const orderedData = useMemo(
        () => sortCatalogProductsByFamily(filteredData),
        [filteredData]
    )

    useEffect(() => {
        setPage(1)
    }, [effectiveSearchQuery, activePrimaryFilter, activeSecondaryFilter])

    useEffect(() => {
        if (!secondaryConfig) {
            if (activeSecondaryFilter !== allSecondaryId) {
                setActiveSecondaryFilter(allSecondaryId)
            }
            return
        }

        if (!secondaryOptions.some((option) => option.id === activeSecondaryFilter)) {
            setActiveSecondaryFilter(allSecondaryId)
        }
    }, [activeSecondaryFilter, allSecondaryId, secondaryConfig, secondaryOptions])

    const totalPages = Math.max(1, Math.ceil(orderedData.length / pageSize))

    const paginatedProducts = useMemo(() => {
        const start = (page - 1) * pageSize
        return orderedData.slice(start, start + pageSize)
    }, [orderedData, page, pageSize])

    const scrollToTarget = (target: HTMLElement | null, extraOffset = 30) => {
        setTimeout(() => {
            if (!target) return;

            const rect = target.getBoundingClientRect();
            const scrollTop = rect.top + window.scrollY;

            // mide el header sticky
            const headerHeight = document.querySelector('.header')?.clientHeight ?? 120;

            window.scrollTo({
                top: scrollTop - headerHeight - extraOffset,
                behavior: 'smooth'
            });
        }, 50);
    };

    const scrollToProducts = () => {
        scrollToTarget(searchCardRef.current ?? productsRef.current, 16)
    }

    const scrollToSecondaryFilters = () => {
        scrollToTarget(secondaryFiltersRef.current ?? productsRef.current, 12)
    }

    const scrollToProductGrid = () => {
        scrollToTarget(productGridRef.current ?? productsRef.current, 20)
    }

    const handlePrimaryFilterChange = (filterId: string) => {
        setActivePrimaryFilter(filterId)
        setActiveSecondaryFilter(allSecondaryId)
        setPage(1)
        scrollToProducts()
    }

    const handleSecondaryFilterChange = (filterId: string) => {
        setActiveSecondaryFilter(filterId)
        setPage(1)
        scrollToSecondaryFilters()
    }

    const handlePageChange = (nextPage: number) => {
        const sanitized = Math.min(Math.max(nextPage, 1), totalPages)
        if (sanitized === page) return
        setPage(sanitized)
        scrollToProductGrid()
    }

    return (
        <div className="container pm-catalog md:py-10 py-5">
            <div ref={productsRef} className="pm-catalog__heading heading flex flex-col items-center text-center">
                <div className="heading3 pm-catalog__title">Todos los productos</div>
                <div className="heading6 pm-catalog__subtitle font-normal text-secondary mt-2">
                    Explora nuestro catálogo completo
                </div>
            </div>

            <div ref={searchCardRef} className="pm-catalog__controls md:mt-8 mt-6">
                <div className="pm-catalog__panel rounded-[32px] border border-line bg-white px-4 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6 lg:px-7">
                    <div className="pm-catalog__toolbar flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="pm-catalog__search relative flex-1">
                            <input
                                aria-label="Buscar en el catalogo"
                                autoComplete="off"
                                className="pm-catalog__search-input h-12 w-full rounded-full border border-[rgba(0,127,155,0.18)] bg-white pl-5 pr-24 text-[15px] text-black shadow-[0_8px_20px_rgba(15,23,42,0.05)] outline-none duration-300 placeholder:text-[rgba(15,23,42,0.45)] focus:border-[var(--blue)] focus:shadow-[0_12px_28px_rgba(0,127,155,0.12)]"
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Buscar en el catálogo"
                                spellCheck={false}
                                suppressHydrationWarning
                                type="text"
                                value={searchQuery}
                            />
                            {searchQuery ? (
                                <button
                                    className="pm-catalog__search-clear absolute right-3 top-1/2 inline-flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(0,127,155,0.14)] bg-[rgba(0,127,155,0.06)] px-3 text-[12px] font-semibold text-[var(--blue)] duration-300 hover:bg-[rgba(0,127,155,0.12)] hover:text-black"
                                    onClick={() => setSearchQuery('')}
                                    type="button"
                                >
                                    Limpiar
                                </button>
                            ) : (
                                <div className="pm-catalog__search-label pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">
                                    Buscar
                                </div>
                            )}
                        </div>

                        <div className="pm-catalog__meta flex flex-wrap items-center gap-2 xl:justify-end">
                            <div className="pm-catalog__count inline-flex items-center rounded-full bg-surface px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                {filteredData.length} producto{filteredData.length === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>

                    <div className="pm-catalog__filter-section mt-5">
                        <div className="pm-catalog__filter-label mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                            Categorías principales
                        </div>
                        <div className="pm-catalog__filter-list flex flex-wrap justify-center gap-2.5 lg:justify-start">
                            {primaryFilterIds.filter((filterId) => {
                                const count = primaryFilterCounts.get(filterId) ?? 0
                                return count > 0
                            }).map((filterId) => {
                                const isActive = activePrimaryFilter === filterId
                                const count = primaryFilterCounts.get(filterId) ?? 0

                                return (
                                    <button
                                        key={filterId}
                                        aria-pressed={isActive}
                                        className={`pm-catalog__filter-button inline-flex min-h-[48px] items-center gap-2.5 rounded-full border px-4 py-2.5 text-left font-semibold duration-300 ${isActive ? 'is-active border-[var(--blue)] bg-[var(--blue)] text-white shadow-[0_10px_24px_rgba(0,127,155,0.24)]' : 'border-line bg-white text-secondary shadow-sm hover:-translate-y-0.5 hover:border-[var(--blue)] hover:text-[var(--blue)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'}`}
                                        onClick={() => handlePrimaryFilterChange(filterId)}
                                    >
                                        <span className="text-[14px] leading-[20px] sm:text-[15px] sm:leading-[22px]">
                                            {getPrimaryFilterLabel(filterId)}
                                        </span>
                                        <span className={`pm-catalog__filter-count min-w-[30px] rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-[1] ${isActive ? 'bg-white/18 text-white' : 'bg-surface text-secondary'}`}>
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {secondaryConfig && (
                        <div ref={secondaryFiltersRef} className="pm-catalog__filter-section mt-5">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="pm-catalog__filter-label text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                    {secondaryConfig.label}
                                </div>
                            </div>

                            <div className="pm-catalog__filter-list flex flex-wrap justify-center gap-2.5 lg:justify-start">
                                {visibleSecondaryOptions.map((option) => {
                                    const isActive = activeSecondaryFilter === option.id

                                    return (
                                        <button
                                            key={`${secondaryConfig.id}-${option.id}`}
                                            aria-pressed={isActive}
                                            className={`pm-catalog__filter-button inline-flex min-h-[46px] items-center gap-2.5 rounded-full border px-4 py-2 text-left font-semibold duration-300 ${isActive ? 'is-active border-black bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]' : 'border-line bg-white text-secondary shadow-sm hover:-translate-y-0.5 hover:border-black hover:text-black hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'}`}
                                            onClick={() => handleSecondaryFilterChange(option.id)}
                                            type="button"
                                        >
                                            <span className="text-[14px] leading-[20px] sm:text-[15px] sm:leading-[22px]">
                                                {option.label}
                                            </span>
                                            <span className={`pm-catalog__filter-count min-w-[30px] rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-[1] ${isActive ? 'bg-white/18 text-white' : 'bg-surface text-secondary'}`}>
                                                {option.count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {effectiveSearchQuery && filteredData.length === 0 && (
                        <div className="pm-catalog__notice mt-4 rounded-[20px] border border-dashed border-line px-4 py-3 text-left">
                            <div className="caption1 text-secondary">
                                No hubo coincidencias. Prueba con otra palabra o limpia la búsqueda.
                            </div>
                        </div>
                    )}

                    {effectiveSearchQuery ? (
                        <div className="pm-catalog__search-summary mt-4 flex flex-col gap-2 rounded-[20px] bg-surface px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
                            <div className="caption1 text-secondary">
                                {filteredData.length} resultado{filteredData.length === 1 ? '' : 's'} para &quot;{effectiveSearchQuery}&quot; dentro de {getPrimaryFilterLabel(activePrimaryFilter)}.
                            </div>
                            <button
                                className="pm-catalog__summary-clear text-button font-semibold text-[var(--blue)] duration-300 hover:text-black"
                                onClick={() => setSearchQuery('')}
                                type="button"
                            >
                                Limpiar búsqueda
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            <div ref={productGridRef} className="pm-catalog__grid hide-product-sold grid lg:grid-cols-5 grid-cols-2 sm:gap-[30px] gap-[20px] md:mt-10 mt-6">
                {paginatedProducts.map((product) => (
                    <Product data={product} type='grid' key={product.id} style='style-1' />
                ))}
            </div>

            <div className="pm-catalog__pagination pagination flex items-center justify-center gap-2 md:mt-12 mt-8">
                <button
                    className={`pm-catalog__page-button button-main bg-white text-black border border-line px-4 py-2 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                >
                    Anterior
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNumber = idx + 1
                    const isActive = pageNumber === page
                    return (
                        <button
                            key={pageNumber}
                            className={`pm-catalog__page-number w-10 h-10 rounded-xl text-button-uppercase duration-300 ${isActive ? 'is-active bg-black text-white' : 'bg-surface text-secondary hover:text-black'}`}
                            onClick={() => handlePageChange(pageNumber)}
                        >
                            {pageNumber}
                        </button>
                    )
                })}

                <button
                    className={`pm-catalog__page-button button-main bg-white text-black border border-line px-4 py-2 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                >
                    Siguiente
                </button>
            </div>
        </div>
    )
}

export default AllProducts
