'use client'

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductType } from '@/type/ProductType'
import Product from '../Product/Product';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css'
import HandlePagination from '../Other/HandlePagination';
import { getCategoryFilter, getCategoryUrl, getCategoryLabel, matchesPetCategoryFilter } from '@/data/petCategoryCards';
import { useSite } from '@/context/SiteContext';
import { buildCatalogCategoryCards, getProductDiscountPercent, isProductOnSale } from '@/lib/catalog';
import { buildProductSearchIndex, filterProductsBySearch, matchesProductSearch, sanitizeProductSearchQuery } from '@/lib/productSearch';
import {
    getProductColorValues,
    getProductMaterialValues,
    getProductSizeValues,
    getProductSpeciesValues,
} from '@/lib/catalogAttributes';

interface Props {
    data: Array<ProductType>
    productPerPage: number
    dataType: string | null | undefined
    gender: string | null
    category: string | null
    searchQuery?: string | null
    categoryIds?: string[]
}

const sortLabels = (values: Iterable<string>) =>
    Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, 'es'))

const getPrimaryFilterLabel = (filterId: string) => {
    if (filterId === 'todas') return 'Todas'
    if (filterId === 'ofertas') return 'Ofertas'
    return getCategoryLabel(filterId)
}

const normalizeCategoryOptionId = (categoryId: string) => {
    const normalized = categoryId.trim().toLowerCase()
    if (normalized === 'todas') return 'todos'
    if (normalized === 'ofertas') return 'descuentos'
    if (['perros', 'gatos'].includes(normalized)) return ''
    return normalized
}

const ShopBreadCrumb1: React.FC<Props> = ({ data, productPerPage, dataType, gender, category, searchQuery, categoryIds }) => {
    useSite()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultPriceRange = { min: 0, max: 500 }
    const availableTypes = useMemo(
        () => Array.from(new Set(data.map((product) => product.type).filter((value): value is string => Boolean(value)))),
        [data]
    )
    const normalizedDataType = useMemo(() => {
        if (!dataType) return null
        return availableTypes.includes(dataType) ? dataType : null
    }, [availableTypes, dataType])
    const [showOnlySale, setShowOnlySale] = useState(false)
    const [sortOption, setSortOption] = useState('');
    const [type, setType] = useState<string | null | undefined>(normalizedDataType)
    const [size, setSize] = useState<string | null>()
    const [color, setColor] = useState<string | null>()
    const [material, setMaterial] = useState<string | null>()
    const [species, setSpecies] = useState<string | null>()
    const [brand, setBrand] = useState<string | null>()
    const [searchInput, setSearchInput] = useState(searchQuery ?? '')
    const [priceRange, setPriceRange] = useState<{ min: number; max: number }>(defaultPriceRange);
    const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
    const [currentPage, setCurrentPage] = useState(0);
    const productsPerPage = 15;
    const offset = currentPage * productsPerPage;
    const productsRef = useRef<HTMLDivElement>(null)
    const deferredSearchInput = useDeferredValue(searchInput)

    const handleShowOnlySale = () => {
        setShowOnlySale(toggleSelect => !toggleSelect)
    }

    const handleSortChange = (option: string) => {
        setSortOption(option);
        setCurrentPage(0);
    };

    const handleType = (type: string | null) => {
        setType((prevType) => (prevType === type ? null : type))
        setCurrentPage(0);
    }

    const handleSize = (size: string) => {
        setSize((prevSize) => (prevSize === size ? null : size))
        setCurrentPage(0);
    }

    const handlePriceChange = (values: number | number[]) => {
        if (Array.isArray(values)) {
            setPriceRange({ min: values[0], max: values[1] });
            setCurrentPage(0);
        }
    };

    const handleColor = (color: string) => {
        setColor((prevColor) => (prevColor === color ? null : color))
        setCurrentPage(0);
    }

    const handleMaterial = (material: string) => {
        setMaterial((prevMaterial) => (prevMaterial === material ? null : material))
        setCurrentPage(0);
    }

    const handleSpecies = (species: string) => {
        setSpecies((prevSpecies) => (prevSpecies === species ? null : species))
        setCurrentPage(0);
    }

    const handleBrand = (brand: string) => {
        setBrand((prevBrand) => (prevBrand === brand ? null : brand));
        setCurrentPage(0);
    }
    const handleViewType = (view: 'grid' | 'list') => {
        setViewType(view);
    }


    // Filter product
    const normalizedCategoryInput = category?.toLowerCase();
    const normalizedCategory = normalizedCategoryInput === 'ofertas' ? 'descuentos' : normalizedCategoryInput;
    const categoryFilter = normalizedCategory ? getCategoryFilter(normalizedCategory) : undefined;
    const isDiscountCategory = normalizedCategory === 'descuentos';
    const effectiveSearchQuery = useMemo(() => sanitizeProductSearchQuery(deferredSearchInput), [deferredSearchInput])
    const productSearchIndex = useMemo(() => buildProductSearchIndex(data), [data])
    const productAttributeIndex = useMemo(() => new Map(
        data.map((product) => ([
            product.id,
            {
                sizes: getProductSizeValues(product),
                colors: getProductColorValues(product),
                materials: getProductMaterialValues(product),
                species: getProductSpeciesValues(product),
                onSale: isProductOnSale(product),
            },
        ]))
    ), [data])

    const categoryBrowseIds = useMemo(() => {
        const sourceCategoryIds = categoryIds?.length
            ? categoryIds
            : buildCatalogCategoryCards(data).map((categoryCard) => categoryCard.id)
        const normalizedIds = sourceCategoryIds
            .map(normalizeCategoryOptionId)
            .filter(Boolean)

        return Array.from(new Set(['todos', ...normalizedIds]))
    }, [categoryIds, data])

    const getIndexedAttributes = useCallback((product: ProductType) => (
        productAttributeIndex.get(product.id) ?? {
            sizes: [],
            colors: [],
            materials: [],
            species: [],
            onSale: isProductOnSale(product),
        }
    ), [productAttributeIndex])

    const categoryCountsMap = useMemo(() => {
        const preferredCategoryIds = categoryBrowseIds.filter((categoryId) => categoryId !== 'todos')
        const initialCounts = new Map<string, number>(preferredCategoryIds.map((categoryId) => [categoryId, 0]))
        const searchScopedProducts = effectiveSearchQuery
            ? data.filter((product) => matchesProductSearch(productSearchIndex.get(product.id) ?? '', effectiveSearchQuery))
            : data

        searchScopedProducts.forEach((product) => {
            const indexed = getIndexedAttributes(product)

            preferredCategoryIds.forEach((categoryId) => {
                if (categoryId === 'descuentos') {
                    if (indexed.onSale) {
                        initialCounts.set(categoryId, (initialCounts.get(categoryId) ?? 0) + 1)
                    }
                    return
                }

                if (matchesPetCategoryFilter(product, getCategoryFilter(categoryId))) {
                    initialCounts.set(categoryId, (initialCounts.get(categoryId) ?? 0) + 1)
                }
            })
        })

        return initialCounts
    }, [categoryBrowseIds, data, effectiveSearchQuery, productSearchIndex])
    const catalogPrimaryCounts = useMemo(() => {
        const counts = new Map<string, number>()
        const searchScopedProducts = effectiveSearchQuery
            ? data.filter((product) => matchesProductSearch(productSearchIndex.get(product.id) ?? '', effectiveSearchQuery))
            : data

        const primaryFilterIds = categoryBrowseIds

        primaryFilterIds.forEach((filterId) => {
            counts.set(
                filterId,
                filterId === 'todos'
                    ? searchScopedProducts.length
                    : filterId === 'descuentos'
                        ? searchScopedProducts.filter((product) => getIndexedAttributes(product).onSale).length
                    : searchScopedProducts.filter((product) => matchesPetCategoryFilter(product, getCategoryFilter(filterId))).length
            )
        })

        return counts
    }, [categoryBrowseIds, data, effectiveSearchQuery, getIndexedAttributes, productSearchIndex])

    const categoryCounts = useCallback((categoryId: string) => (
        categoryId === 'todos'
            ? data.length
            : (categoryCountsMap.get(categoryId) ?? 0)
    ), [categoryCountsMap, data.length])

    const categoryOptions = useMemo(() => {
        return categoryBrowseIds.filter((categoryId) => {
            return categoryCounts(categoryId) > 0 || normalizedCategory === categoryId
        })
    }, [categoryBrowseIds, categoryCounts, data.length, normalizedCategory])
    const buildCategoryHref = useCallback((categoryId: string) => {
        const baseUrl = getCategoryUrl(categoryId)

        const sanitizedQuery = sanitizeProductSearchQuery(searchInput)

        if (!sanitizedQuery) {
            return baseUrl
        }

        const url = new URL(baseUrl, 'https://paramascotas.local')
        url.searchParams.set('query', sanitizedQuery)
        return `${url.pathname}${url.search}`
    }, [searchInput])
    const buildPrimaryFilterHref = useCallback((filterId: string) => {
        if (filterId === 'todas') return buildCategoryHref('todos')
        if (filterId === 'ofertas') return buildCategoryHref('descuentos')
        return buildCategoryHref(filterId)
    }, [buildCategoryHref])
    const clearSearchQuery = useCallback(() => {
        setSearchInput('')
        const nextParams = new URLSearchParams(searchParams.toString())
        nextParams.delete('query')
        const nextQuery = nextParams.toString()
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }, [pathname, router, searchParams])

    const matchesProduct = useCallback((product: ProductType, ignore?: 'type' | 'size' | 'color' | 'material' | 'species' | 'brand' | 'priceRange' | 'sale' | 'search') => {
        const indexed = getIndexedAttributes(product)

        if (ignore !== 'sale' && showOnlySale && !indexed.onSale) {
            return false
        }

        if (!matchesPetCategoryFilter(product, categoryFilter, { gender })) {
            return false
        }

        if (isDiscountCategory && !indexed.onSale) {
            return false
        }

        if (ignore !== 'search' && effectiveSearchQuery && !matchesProductSearch(productSearchIndex.get(product.id) ?? '', effectiveSearchQuery)) {
            return false
        }

        if (ignore !== 'type' && type && product.type !== type) {
            return false
        }

        if (ignore !== 'size' && size && !indexed.sizes.includes(size)) {
            return false
        }

        if (ignore !== 'color' && color && !indexed.colors.includes(color)) {
            return false
        }

        if (ignore !== 'material' && material && !indexed.materials.includes(material)) {
            return false
        }

        if (ignore !== 'species' && species && !indexed.species.includes(species)) {
            return false
        }

        if (ignore !== 'brand' && brand && product.brand !== brand) {
            return false
        }

        if (
            ignore !== 'priceRange' &&
            (priceRange.min !== defaultPriceRange.min || priceRange.max !== defaultPriceRange.max) &&
            !(product.price >= priceRange.min && product.price <= priceRange.max)
        ) {
            return false
        }
        return true
    }, [brand, categoryFilter, color, defaultPriceRange.max, defaultPriceRange.min, effectiveSearchQuery, gender, getIndexedAttributes, isDiscountCategory, material, priceRange.max, priceRange.min, productSearchIndex, showOnlySale, size, species, type])

    const productsExcludingSizeFilter = useMemo(
        () => data.filter((product) => matchesProduct(product, 'size')),
        [data, matchesProduct]
    )
    const productsExcludingColorFilter = useMemo(
        () => data.filter((product) => matchesProduct(product, 'color')),
        [data, matchesProduct]
    )
    const productsExcludingMaterialFilter = useMemo(
        () => data.filter((product) => matchesProduct(product, 'material')),
        [data, matchesProduct]
    )
    const productsExcludingSpeciesFilter = useMemo(
        () => data.filter((product) => matchesProduct(product, 'species')),
        [data, matchesProduct]
    )
    const productsExcludingBrandFilter = useMemo(
        () => data.filter((product) => matchesProduct(product, 'brand')),
        [data, matchesProduct]
    )

    const uniqueSizes = useMemo(
        () => sortLabels(productsExcludingSizeFilter.flatMap((product) => getIndexedAttributes(product).sizes).filter(Boolean)),
        [getIndexedAttributes, productsExcludingSizeFilter]
    )
    const uniqueColors = useMemo(
        () => sortLabels(productsExcludingColorFilter.flatMap((product) => getIndexedAttributes(product).colors).filter(Boolean)),
        [getIndexedAttributes, productsExcludingColorFilter]
    )
    const uniqueMaterials = useMemo(
        () => sortLabels(productsExcludingMaterialFilter.flatMap((product) => getIndexedAttributes(product).materials).filter(Boolean)),
        [getIndexedAttributes, productsExcludingMaterialFilter]
    )
    const uniqueSpecies = useMemo(
        () => sortLabels(productsExcludingSpeciesFilter.flatMap((product) => getIndexedAttributes(product).species).filter(Boolean)),
        [getIndexedAttributes, productsExcludingSpeciesFilter]
    )
    const brandCountsMap = useMemo(() => {
        const counts = new Map<string, number>()
        productsExcludingBrandFilter.forEach((product) => {
            const productBrand = product.brand ?? ''
            if (!productBrand) return
            counts.set(productBrand, (counts.get(productBrand) ?? 0) + 1)
        })
        return counts
    }, [productsExcludingBrandFilter])
    const uniqueBrands = useMemo(
        () => sortLabels(productsExcludingBrandFilter.map((product) => product.brand ?? '').filter(Boolean)),
        [productsExcludingBrandFilter]
    )
    const brandCounts = useCallback(
        (brandValue: string) => brandCountsMap.get(brandValue) ?? 0,
        [brandCountsMap]
    );

    useEffect(() => {
        if (size && !uniqueSizes.includes(size)) {
            setSize(null)
        }
    }, [size, uniqueSizes])

    useEffect(() => {
        if (color && !uniqueColors.includes(color)) {
            setColor(null)
        }
    }, [color, uniqueColors])

    useEffect(() => {
        if (material && !uniqueMaterials.includes(material)) {
            setMaterial(null)
        }
    }, [material, uniqueMaterials])

    useEffect(() => {
        if (species && !uniqueSpecies.includes(species)) {
            setSpecies(null)
        }
    }, [species, uniqueSpecies])

    useEffect(() => {
        if (brand && !uniqueBrands.includes(brand)) {
            setBrand(null)
        }
    }, [brand, uniqueBrands])

    useEffect(() => {
        setType(normalizedDataType)
    }, [normalizedDataType])

    useEffect(() => {
        setSearchInput(searchQuery ?? '')
    }, [searchQuery])

    useEffect(() => {
        setCurrentPage(0)
    }, [effectiveSearchQuery])

    const filteredData = useMemo(() => {
        const scopedProducts = data.filter((product) => matchesProduct(product, 'search'))
        const searchOrderedProducts = effectiveSearchQuery
            ? filterProductsBySearch(scopedProducts, effectiveSearchQuery, productSearchIndex)
            : scopedProducts
        const sortedProducts = [...searchOrderedProducts]

        if (sortOption === 'soldQuantityHighToLow') {
            return sortedProducts.sort((a, b) => b.sold - a.sold)
        }

        if (sortOption === 'discountHighToLow') {
            return sortedProducts.sort((a, b) => getProductDiscountPercent(b) - getProductDiscountPercent(a))
        }

        if (sortOption === 'priceHighToLow') {
            return sortedProducts.sort((a, b) => b.price - a.price)
        }

        if (sortOption === 'priceLowToHigh') {
            return sortedProducts.sort((a, b) => a.price - b.price)
        }

        return searchOrderedProducts
    }, [data, effectiveSearchQuery, matchesProduct, productSearchIndex, sortOption])

    const totalProducts = filteredData.length
    const activePrimaryFilter = isDiscountCategory ? 'descuentos' : normalizedCategory ?? 'todos'
    const selectedType = type
    const selectedSize = size
    const selectedColor = color
    const selectedMaterial = material
    const selectedSpecies = species
    const selectedBrand = brand
    const pageCount = Math.ceil(filteredData.length / productsPerPage);

    useEffect(() => {
        if (pageCount === 0 && currentPage !== 0) {
            setCurrentPage(0)
        } else if (pageCount > 0 && currentPage > pageCount - 1) {
            setCurrentPage(0)
        }
    }, [currentPage, pageCount])

    const currentProducts = filteredData.slice(offset, offset + productsPerPage)

    const handlePageChange = (selected: number) => {
        setCurrentPage(selected);

        productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    };

    const handleClearAll = () => {
        setShowOnlySale(false);
        setSortOption('');
        setType(null);
        setSize(null);
        setColor(null);
        setMaterial(null);
        setSpecies(null);
        setBrand(null);
        setPriceRange(defaultPriceRange);
        setCurrentPage(0);

        if (effectiveSearchQuery) {
            clearSearchQuery()
        }
    };

    return (
        <>
            <div ref={productsRef} className="shop-product breadcrumb1 lg:py-10 md:py-14 py-10">
                <div className="container">
                    <div className="flex max-md:flex-wrap max-md:flex-col-reverse gap-y-8">
                        <div className="sidebar lg:w-1/4 md:w-1/3 w-full md:pr-12">
                            <div className="filter-type pb-8 border-b border-line">
                                <div className="heading6">Categorías</div>
                                <div className="list-type mt-4">
                                    {categoryOptions.map((item, index) => {
                                        const isActiveCategory = normalizedCategory ? normalizedCategory === item : item === 'todos';
                                        return (
                                            <Link
                                                key={index}
                                                href={buildCategoryHref(item)}
                                                className={`item flex items-center cursor-pointer ${isActiveCategory ? 'active' : ''}`}
                                            >
                                                <div className='text-secondary has-line-before hover:text-black capitalize'>{getCategoryLabel(item)}</div>
                                                <div className='text-secondary2'>
                                                    ({categoryCounts(item)})
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="filter-brand mt-8">
                                <div className="heading6">Marcas</div>
                                <div className="list-type mt-4">
                                    {uniqueBrands.map((brandItem, index) => (
                                        <div
                                            key={index}
                                            className={`item flex items-center justify-between cursor-pointer ${brand === brandItem ? 'active' : ''}`}
                                            onClick={() => handleBrand(brandItem)}
                                        >
                                            <div className='text-secondary has-line-before hover:text-black capitalize'>{brandItem}</div>
                                            <div className='text-secondary2'>
                                                ({brandCounts(brandItem)})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="filter-size pb-8 border-b border-line mt-8">
                                <div className="heading6">Tamaños</div>
                                <div className="list-size flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                    {uniqueSizes.map((item, index) => (
                                        <div
                                            key={index}
                                            className={`size-item text-button h-[44px] px-4 flex items-center justify-center rounded-full border border-line ${size === item ? 'active' : ''}`}
                                            onClick={() => handleSize(item)}
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="filter-price pb-8 border-b border-line mt-8">
                                <div className="heading6">Rango de precios</div>
                                <Slider
                                    range
                                    defaultValue={[defaultPriceRange.min, defaultPriceRange.max]}
                                    min={defaultPriceRange.min}
                                    max={defaultPriceRange.max}
                                    onChange={handlePriceChange}
                                    className='mt-5'
                                />
                                <div className="price-block flex items-center justify-between flex-wrap mt-4">
                                    <div className="min flex items-center gap-1">
                                        <div>Precio mínimo:</div>
                                        <div className='price-min'>$<span>{priceRange.min}</span></div>
                                    </div>
                                    <div className="min flex items-center gap-1">
                                        <div>Precio máximo:</div>
                                        <div className='price-max'>$<span>{priceRange.max}</span></div>
                                    </div>
                                </div>
                            </div>
                            {uniqueColors.length > 0 && (
                                <div className="filter-color pb-8 border-b border-line mt-8">
                                    <div className="heading6">Colores</div>
                                    <div className="list-color flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                        {uniqueColors.map((item) => (
                                            <div
                                                key={item}
                                                className={`color-item px-3 py-[5px] flex items-center justify-center gap-2 rounded-full border border-line ${color === item ? 'active' : ''}`}
                                                onClick={() => handleColor(item)}
                                            >
                                                <span className='color me-1 bg-[#d9d9d9] w-5 h-5 rounded-full'></span>
                                                <div className="caption1 capitalize">{item}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {uniqueMaterials.length > 0 && (
                                <div className="filter-color pb-8 border-b border-line mt-8">
                                    <div className="heading6">Materiales</div>
                                    <div className="list-color flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                        {uniqueMaterials.map((item) => (
                                            <div
                                                key={item}
                                                className={`color-item px-3 py-[5px] flex items-center justify-center gap-2 rounded-full border border-line ${material === item ? 'active' : ''}`}
                                                onClick={() => handleMaterial(item)}
                                            >
                                                <div className="caption1 capitalize">{item}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {uniqueSpecies.length > 0 && (
                                <div className="filter-color pb-8 border-b border-line mt-8">
                                    <div className="heading6">Mascota</div>
                                    <div className="list-color flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                        {uniqueSpecies.map((item) => (
                                            <div
                                                key={item}
                                                className={`color-item px-3 py-[5px] flex items-center justify-center gap-2 rounded-full border border-line ${species === item ? 'active' : ''}`}
                                                onClick={() => handleSpecies(item)}
                                            >
                                                <div className="caption1 capitalize">{item}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="list-product-block lg:w-3/4 md:w-2/3 w-full md:pl-3">
                            <div className="menu-tab md:mt-8 mt-6 mb-6">
                                <div className="rounded-[32px] border border-line bg-white px-4 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6 lg:px-7">
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="relative flex-1">
                                            <input
                                                aria-label="Buscar en el catalogo"
                                                autoComplete="off"
                                                className="h-12 w-full rounded-full border border-[rgba(0,127,155,0.18)] bg-white pl-5 pr-24 text-[15px] text-black shadow-[0_8px_20px_rgba(15,23,42,0.05)] outline-none duration-300 placeholder:text-[rgba(15,23,42,0.45)] focus:border-[var(--blue)] focus:shadow-[0_12px_28px_rgba(0,127,155,0.12)]"
                                                onChange={(event) => setSearchInput(event.target.value)}
                                                placeholder="Buscar en el catálogo"
                                                spellCheck={false}
                                                suppressHydrationWarning
                                                type="search"
                                                value={searchInput}
                                            />
                                            {searchInput ? (
                                                <button
                                                    className="absolute right-3 top-1/2 inline-flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(0,127,155,0.14)] bg-[rgba(0,127,155,0.06)] px-3 text-[12px] font-semibold text-[var(--blue)] duration-300 hover:bg-[rgba(0,127,155,0.12)] hover:text-black"
                                                    onClick={clearSearchQuery}
                                                    type="button"
                                                >
                                                    Limpiar
                                                </button>
                                            ) : (
                                                <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">
                                                    Buscar
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                            <div className="inline-flex items-center rounded-full bg-surface px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                                {filteredData.length} producto{filteredData.length === 1 ? '' : 's'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                            Categorías principales
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2.5 lg:justify-start">
                                            {Array.from(catalogPrimaryCounts.keys()).filter((filterId) => {
                                                const count = catalogPrimaryCounts.get(filterId) ?? 0
                                                return count > 0 || activePrimaryFilter === filterId
                                            }).map((filterId) => {
                                                const isActive = activePrimaryFilter === filterId
                                                const count = catalogPrimaryCounts.get(filterId) ?? 0

                                                return (
                                                    <Link
                                                        key={filterId}
                                                        aria-current={isActive ? 'page' : undefined}
                                                        className={`tab-item inline-flex min-h-[48px] items-center gap-2.5 rounded-full border px-4 py-2.5 text-left font-semibold duration-300 ${isActive ? 'border-[var(--blue)] bg-[var(--blue)] text-white shadow-[0_10px_24px_rgba(0,127,155,0.24)]' : 'border-line bg-white text-secondary shadow-sm hover:-translate-y-0.5 hover:border-[var(--blue)] hover:text-[var(--blue)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'}`}
                                                        href={buildPrimaryFilterHref(filterId)}
                                                    >
                                                        <span className="text-[14px] leading-[20px] sm:text-[15px] sm:leading-[22px]">
                                                            {getPrimaryFilterLabel(filterId)}
                                                        </span>
                                                        <span className={`min-w-[30px] rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-[1] ${isActive ? 'bg-white/18 text-white' : 'bg-surface text-secondary'}`}>
                                                            {count}
                                                        </span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="filter-heading flex items-center gap-5 flex-wrap">
                                <div className="left flex has-line items-center flex-wrap gap-5">
                                    <div className="choose-layout flex items-center gap-2">
                                        <button
                                            type="button"
                                            className={`w-10 h-10 border rounded-lg flex items-center justify-center ${viewType === 'grid' ? 'bg-black text-white' : 'bg-white'}`}
                                            onClick={() => handleViewType('grid')}
                                        >
                                            <Icon.SquaresFour />
                                        </button>
                                        <button
                                            type="button"
                                            className={`w-10 h-10 border rounded-lg flex items-center justify-center ${viewType === 'list' ? 'bg-black text-white' : 'bg-white'}`}
                                            onClick={() => handleViewType('list')}
                                        >
                                            <Icon.List />
                                        </button>
                                    </div>
                                    <div className="check-sale flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="filterSale"
                                            id="filter-sale"
                                            className='border-line'
                                            onChange={handleShowOnlySale}
                                        />
                                        <label htmlFor="filter-sale" className='cation1 cursor-pointer'>Ver solo productos en oferta</label>
                                    </div>
                                </div>
                                <div className="right flex items-center gap-3">
                                    <div className="select-block relative">
                                        <select
                                            id="select-filter"
                                            name="select-filter"
                                            className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line'
                                            onChange={(e) => { handleSortChange(e.target.value) }}
                                            defaultValue={''}
                                            suppressHydrationWarning
                                        >
                                            <option value="" disabled>Ordenar por</option>
                                            <option value="soldQuantityHighToLow">Más vendidos</option>
                                            <option value="discountHighToLow">Mayor descuento</option>
                                            <option value="priceHighToLow">Precio de mayor a menor</option>
                                            <option value="priceLowToHigh">Precio de menor a mayor</option>
                                        </select>
                                        <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-4 right-2' />
                                    </div>
                                </div>
                            </div>

                            <div className="list-filtered flex items-center gap-3 mt-4">
                                <div className="total-product">
                                    {totalProducts}
                                    <span className='text-secondary pl-1'>productos encontrados</span>
                                </div>
                                {
                                    (selectedType || selectedSize || selectedColor || selectedMaterial || selectedSpecies || selectedBrand || effectiveSearchQuery) && (
                                        <>
                                            <div className="list flex items-center gap-3">
                                                <div className='w-px h-4 bg-line'></div>
                                                {effectiveSearchQuery && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full" onClick={clearSearchQuery}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{effectiveSearchQuery}</span>
                                                    </div>
                                                )}
                                                {selectedType && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => { setType(null) }}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedType}</span>
                                                    </div>
                                                )}
                                                {selectedSize && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => { setSize(null) }}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedSize}</span>
                                                    </div>
                                                )}
                                                {selectedColor && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => { setColor(null) }}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedColor}</span>
                                                    </div>
                                                )}
                                                {selectedMaterial && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => { setMaterial(null) }}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedMaterial}</span>
                                                    </div>
                                                )}
                                                {selectedSpecies && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => { setSpecies(null) }}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedSpecies}</span>
                                                    </div>
                                                )}
                                                {selectedBrand && (
                                                    <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => { setBrand(null) }}>
                                                        <Icon.X className='cursor-pointer' />
                                                        <span>{selectedBrand}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                className="clear-btn flex items-center px-2 py-1 gap-1 rounded-full border border-red cursor-pointer"
                                                onClick={handleClearAll}
                                            >
                                                <Icon.X color='rgb(219, 68, 68)' className='cursor-pointer' />
                                                <span className='text-button-uppercase text-red'>Limpiar filtros</span>
                                            </div>
                                        </>
                                    )
                                }
                            </div>

                            <div className={`list-product hide-product-sold ${viewType === 'grid' ? 'grid lg:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px]' : 'flex flex-col gap-6'} mt-7`}>
                                {totalProducts === 0 ? (
                                    <div className="no-data-product">No hay productos que coincidan con los filtros seleccionados.</div>
                                ) : (
                                    currentProducts.map((item) => (
                                        <Product key={item.id} data={item} type={viewType} showQuickView />
                                    ))
                                )}
                            </div>

                            {pageCount > 1 && (
                                <div className="list-pagination flex items-center md:mt-10 mt-7">
                                    <HandlePagination pageCount={pageCount} onPageChange={handlePageChange} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </>
    )
}

export default ShopBreadCrumb1
