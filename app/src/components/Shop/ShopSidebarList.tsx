'use client'

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductType } from '@/type/ProductType'
import Product from '../Product/Product';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css'
import HandlePagination from '../Other/HandlePagination';
import { getCategoryFilter, getCategoryLabel, getCategoryUrl, matchesPetCategoryFilter } from '@/data/petCategoryCards';
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
    data: Array<ProductType>;
    productPerPage: number
    dataType: string | null
    category?: string | null
    gender?: string | null
    searchQuery?: string | null
    categoryIds?: string[]
}

const normalizeCategoryOptionId = (categoryId: string) => {
    const normalized = categoryId.trim().toLowerCase()
    if (normalized === 'todas') return 'todos'
    if (normalized === 'ofertas') return 'descuentos'
    if (['perros', 'gatos'].includes(normalized)) return ''
    return normalized
}

const ShopSidebarList: React.FC<Props> = ({ data, productPerPage, dataType, category, gender, searchQuery, categoryIds }) => {
    useSite()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultPriceRange = { min: 0, max: 100 }
    const [type, setType] = useState<string | null>(dataType)
    const [showOnlySale, setShowOnlySale] = useState(false)
    const [sortOption, setSortOption] = useState('');
    const [size, setSize] = useState<string | null>()
    const [color, setColor] = useState<string | null>()
    const [material, setMaterial] = useState<string | null>()
    const [species, setSpecies] = useState<string | null>()
    const [brand, setBrand] = useState<string | null>()
    const [searchInput, setSearchInput] = useState(searchQuery ?? '')
    const [priceRange, setPriceRange] = useState<{ min: number; max: number }>(defaultPriceRange);
    const [currentPage, setCurrentPage] = useState(0);
    const productsPerPage = productPerPage;
    const offset = currentPage * productsPerPage;
    const deferredSearchInput = useDeferredValue(searchInput)

    const normalizedCategoryInput = category?.toLowerCase()
    const normalizedCategory = normalizedCategoryInput === 'ofertas' ? 'descuentos' : normalizedCategoryInput
    const categoryFilter = normalizedCategory ? getCategoryFilter(normalizedCategory) : undefined
    const isDiscountCategory = normalizedCategory === 'descuentos'
    const effectiveSearchQuery = useMemo(() => sanitizeProductSearchQuery(deferredSearchInput), [deferredSearchInput])
    const productSearchIndex = useMemo(() => buildProductSearchIndex(data), [data])
    const categoryBrowseIds = useMemo(() => {
        const sourceCategoryIds = categoryIds?.length
            ? categoryIds
            : buildCatalogCategoryCards(data).map((categoryCard) => categoryCard.id)
        const normalizedIds = sourceCategoryIds
            .map(normalizeCategoryOptionId)
            .filter(Boolean)

        return Array.from(new Set(['todos', ...normalizedIds]))
    }, [categoryIds, data])

    const categoryCounts = useCallback((categoryId: string) => {
        const filter = getCategoryFilter(categoryId)
        return data.filter(product => {
            if (effectiveSearchQuery && !matchesProductSearch(productSearchIndex.get(product.id) ?? '', effectiveSearchQuery)) {
                return false
            }
            if (categoryId === 'descuentos') {
                return isProductOnSale(product)
            }
            return matchesPetCategoryFilter(product, filter)
        }).length
    }, [data, effectiveSearchQuery, productSearchIndex])
    const categoryOptions = useMemo(() => {
        return categoryBrowseIds.filter((categoryId) => {
            return categoryCounts(categoryId) > 0 || normalizedCategory === categoryId
        })
    }, [categoryBrowseIds, categoryCounts, normalizedCategory])
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
    const clearSearchQuery = useCallback(() => {
        setSearchInput('')
        const nextParams = new URLSearchParams(searchParams.toString())
        nextParams.delete('query')
        const nextQuery = nextParams.toString()
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }, [pathname, router, searchParams])

    const matchesProduct = useCallback((product: ProductType, ignore?: 'type' | 'size' | 'color' | 'material' | 'species' | 'brand' | 'priceRange' | 'sale' | 'search') => {
        if (ignore !== 'sale' && showOnlySale && !isProductOnSale(product)) {
            return false
        }

        if (type && ignore !== 'type' && product.type !== type) {
            return false
        }

        if (size && ignore !== 'size' && !getProductSizeValues(product).includes(size)) {
            return false
        }

        if (
            ignore !== 'priceRange' &&
            (priceRange.min !== defaultPriceRange.min || priceRange.max !== defaultPriceRange.max) &&
            !(product.price >= priceRange.min && product.price <= priceRange.max)
        ) {
            return false
        }

        if (color && ignore !== 'color' && !getProductColorValues(product).includes(color)) {
            return false
        }

        if (material && ignore !== 'material' && !getProductMaterialValues(product).includes(material)) {
            return false
        }

        if (species && ignore !== 'species' && !getProductSpeciesValues(product).includes(species)) {
            return false
        }

        if (brand && ignore !== 'brand' && product.brand !== brand) {
            return false
        }

        if (ignore !== 'search' && effectiveSearchQuery && !matchesProductSearch(productSearchIndex.get(product.id) ?? '', effectiveSearchQuery)) {
            return false
        }

        if (!matchesPetCategoryFilter(product, categoryFilter, { gender })) {
            return false
        }

        if (isDiscountCategory && !isProductOnSale(product)) {
            return false
        }

        return true
    }, [brand, categoryFilter, color, defaultPriceRange.max, defaultPriceRange.min, effectiveSearchQuery, gender, isDiscountCategory, material, priceRange.max, priceRange.min, productSearchIndex, showOnlySale, size, species, type])

    const uniqueSizes = useMemo(
        () => Array.from(new Set(data.filter((product) => matchesProduct(product, 'size')).flatMap((product) => getProductSizeValues(product)).filter(Boolean))).sort(),
        [data, matchesProduct]
    )
    const uniqueColors = useMemo(
        () => Array.from(new Set(data.filter((product) => matchesProduct(product, 'color')).flatMap((product) => getProductColorValues(product)).filter(Boolean))).sort(),
        [data, matchesProduct]
    )
    const uniqueMaterials = useMemo(
        () => Array.from(new Set(data.filter((product) => matchesProduct(product, 'material')).flatMap((product) => getProductMaterialValues(product)).filter(Boolean))).sort(),
        [data, matchesProduct]
    )
    const uniqueSpecies = useMemo(
        () => Array.from(new Set(data.filter((product) => matchesProduct(product, 'species')).flatMap((product) => getProductSpeciesValues(product)).filter(Boolean))).sort(),
        [data, matchesProduct]
    )
    const uniqueBrands = useMemo(
        () => Array.from(new Set(data.filter((product) => matchesProduct(product, 'brand')).map((product) => product.brand).filter(Boolean))).sort(),
        [data, matchesProduct]
    )
    const brandCounts = useCallback(
        (brandValue: string) => data.filter((product) => matchesProduct(product, 'brand') && product.brand === brandValue).length,
        [data, matchesProduct]
    )

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
        setSearchInput(searchQuery ?? '')
    }, [searchQuery])

    useEffect(() => {
        setCurrentPage(0)
    }, [effectiveSearchQuery])

    const handleType = (type: string) => {
        setType((prevType) => (prevType === type ? null : type))
        setCurrentPage(0);
    }

    const handleShowOnlySale = () => {
        setShowOnlySale(toggleSelect => !toggleSelect)
        setCurrentPage(0);
    }

    const handleSortChange = (option: string) => {
        setSortOption(option);
        setCurrentPage(0);
    };

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
    };

    const handleClearAll = () => {
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
            <div className="breadcrumb-block style-img">
                <div className="breadcrumb-main bg-linear overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center">{dataType === null ? 'Tienda' : dataType}</div>
                                <div className="link flex items-center justify-center gap-1 caption1 mt-3">
                                    <Link href={'/'}>Inicio</Link>
                                    <Icon.CaretRight size={14} className='text-secondary2' />
                                    <div className='text-secondary2 capitalize'>{dataType === null ? 'Tienda' : dataType}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="flex max-md:flex-wrap max-md:flex-col-reverse gap-y-8">
                        <div className="sidebar lg:w-1/4 md:w-1/3 w-full md:pr-12">
                            <div className="filter-type pb-8 border-b border-line">
                                <div className="heading6">Categorías</div>
                                <div className="list-type mt-4">
                                    {categoryOptions.map((item, index) => {
                                        const isActiveCategory = category ? normalizedCategory === item : item === 'todos'
                                        return (
                                            <Link
                                                key={index}
                                                href={buildCategoryHref(item)}
                                                className={`item flex items-center justify-between cursor-pointer ${isActiveCategory ? 'active' : ''}`}
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
                                <div className="list-brand mt-4">
                                    {uniqueBrands.map((item, index) => (
                                        <div key={index} className="brand-item flex items-center justify-between">
                                            <div className="left flex items-center cursor-pointer" onClick={() => handleBrand(item)}>
                                                <div className="block-input">
                                                    <input
                                                        type="checkbox"
                                                        name={item}
                                                        id={item}
                                                        checked={brand === item}
                                                        readOnly />
                                                    <Icon.CheckSquare size={20} weight='fill' className='icon-checkbox' />
                                                </div>
                                                <label htmlFor={item} className="brand-name capitalize pl-2 cursor-pointer">{item}</label>
                                            </div>
                                            <div className='text-secondary2'>
                                                ({brandCounts(item)})
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
                                        <div className='price-min'>$
                                            <span>{priceRange.min}</span>
                                        </div>
                                    </div>
                                    <div className="min flex items-center gap-1">
                                        <div>Precio máximo:</div>
                                        <div className='price-max'>$
                                            <span>{priceRange.max}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {uniqueColors.length > 0 && (
                                <div className="filter-color pb-8 border-b border-line mt-8">
                                    <div className="heading6">Colores</div>
                                    <div className="list-color flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                                        {uniqueColors.map(item => (
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
                            <div className="mb-6 rounded-[28px] border border-line bg-white px-4 py-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] sm:px-5">
                                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="relative flex-1">
                                        <input
                                            aria-label="Buscar en tienda"
                                            autoComplete="off"
                                            className="h-12 w-full rounded-full border border-[rgba(0,127,155,0.18)] bg-white pl-5 pr-24 text-[15px] text-black shadow-[0_8px_20px_rgba(15,23,42,0.05)] outline-none duration-300 placeholder:text-[rgba(15,23,42,0.45)] focus:border-[var(--blue)] focus:shadow-[0_12px_28px_rgba(0,127,155,0.12)]"
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="Buscar por marca, producto, categoría o SKU"
                                            spellCheck={false}
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
                                        {effectiveSearchQuery && (
                                            <div className="inline-flex items-center rounded-full bg-surface px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary">
                                                Búsqueda activa
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                                <div className="left flex has-line items-center flex-wrap gap-5">
                                    <div className="choose-layout flex items-center gap-2">
                                        <Link href={'/tienda'} className="item three-col w-8 h-8 border border-line rounded flex items-center justify-center cursor-pointer">
                                            <div className='flex items-center gap-0.5'>
                                                <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                                <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                                <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            </div>
                                        </Link>
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
                                    <label htmlFor='select-filter' className="caption1 capitalize">Ordenar por</label>
                                    <div className="select-block relative">
                                        <select
                                            id="select-filter"
                                            name="select-filter"
                                            className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line'
                                            onChange={(e) => { handleSortChange(e.target.value) }}
                                            defaultValue={''}
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

                            <div className="list-product hide-product-sold flex flex-col gap-8 mt-7">
                                {totalProducts === 0 ? (
                                    <div className="no-data-product">No hay productos que coincidan con los filtros seleccionados.</div>
                                ) : (
                                    currentProducts.map((item) => (
                                        <Product key={item.id} data={item} type='list' />
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

export default ShopSidebarList
