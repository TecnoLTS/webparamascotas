'use client'

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
    ArrowRight,
    ArrowUpRight,
    CaretLeft,
    CaretRight,
    EnvelopeSimple,
    House,
    List,
    MagnifyingGlass,
    ShoppingCartSimple,
    Star,
    Storefront,
    User,
    X,
} from "@phosphor-icons/react/dist/ssr";
import useLoginPopup from '@/store/useLoginPopup';
import useShopDepartmentPopup from '@/store/useShopDepartmentPopup';
import useMenuMobile from '@/store/useMenuMobile';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useCart } from '@/context/CartContext';
import { getCategoryLabel, getCategoryUrl } from '@/data/petCategoryCards'
import { useSite } from '@/context/SiteContext'
import { getProductSeoPath } from '@/lib/seoUrls'
import { buildProductSearchIndex, filterProductsBySearch, sanitizeProductSearchQuery } from '@/lib/productSearch'
import { ProductType } from '@/type/ProductType'
import { clearStoredSession, getStoredSessionUser } from '@/lib/authSession'
import { requestApi } from '@/lib/apiClient'

type MenuPetProps = {
    props?: string;
    searchProducts?: ProductType[];
    availableCategoryIds?: string[];
};

const Icon = {
    ArrowRight,
    ArrowUpRight,
    CaretLeft,
    CaretRight,
    EnvelopeSimple,
    House,
    List,
    MagnifyingGlass,
    ShoppingCartSimple,
    Star,
    Storefront,
    User,
    X,
} as const

const DASHBOARD_PATH = '/dashboard/'
const DASHBOARD_SIGN_IN_PATH = '/dashboard/sign-in'

const MenuPet: React.FC<MenuPetProps> = ({ props, searchProducts = [], availableCategoryIds }) => {
    const site = useSite()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { openLoginPopup, handleLoginPopup } = useLoginPopup()
    const { openShopDepartmentPopup, handleShopDepartmentPopup } = useShopDepartmentPopup()
    const { openMenuMobile, handleMenuMobile, closeMenuMobile } = useMenuMobile()
    const [openSubNavMobile, setOpenSubNavMobile] = useState<number | null>(null)
    const { openModalCart } = useModalCartContext()
    const { cartState } = useCart()

    const [searchKeyword, setSearchKeyword] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const [accountDisplayName, setAccountDisplayName] = useState('Mi cuenta')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const router = useRouter()
    const [hasMounted, setHasMounted] = useState(false)
    const searchContainerRef = useRef<HTMLDivElement>(null)
    const minAutocompleteQueryLength = 1
    const searchParamsKey = searchParams.toString()
    const deferredSearchKeyword = useDeferredValue(searchKeyword)
    const visibleAccountDisplayName = hasMounted ? accountDisplayName : 'Mi cuenta'
    const showAuthenticatedMenu = hasMounted && isAuthenticated

    const handleSearch = (value: string) => {
        const trimmedValue = sanitizeProductSearchQuery(value)

        if (pathname.startsWith('/tienda')) {
            const nextParams = new URLSearchParams(searchParams.toString())

            if (trimmedValue) {
                nextParams.set('query', trimmedValue)
            } else {
                nextParams.delete('query')
            }

            const nextQuery = nextParams.toString()
            router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
            setSearchKeyword(trimmedValue)
            return
        }

        if (!trimmedValue) {
            return
        }

        router.push(`/search-result?query=${encodeURIComponent(trimmedValue)}`)
        setSearchKeyword('')
    }

    const handleOpenSubNavMobile = (index: number) => {
        setOpenSubNavMobile(openSubNavMobile === index ? null : index)
    }

    const [fixedHeader, setFixedHeader] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)
    const topNavRef = useRef<HTMLDivElement>(null)
    const [headerHeight, setHeaderHeight] = useState(0)
    const [stickyHeight, setStickyHeight] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            setFixedHeader(window.scrollY > 16)
        };

        handleScroll()
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const updateHeaderHeight = () => {
            const nextHeaderHeight = headerRef.current?.offsetHeight ?? 0
            const nextTopNavHeight = topNavRef.current?.offsetHeight ?? 0
            setHeaderHeight(nextHeaderHeight)
            setStickyHeight(nextHeaderHeight + nextTopNavHeight)
        }

        updateHeaderHeight()
        window.addEventListener('resize', updateHeaderHeight)

        return () => {
            window.removeEventListener('resize', updateHeaderHeight)
        }
    }, [])

    useEffect(() => {
        setHasMounted(true)
    }, [])

    useEffect(() => {
        const resolveAccountDisplayName = () => {
            const sessionUser = getStoredSessionUser()
            const firstName = String(sessionUser?.name || '').trim().split(/\s+/).filter(Boolean)[0] || ''
            setAccountDisplayName(firstName || 'Mi cuenta')
            setIsAuthenticated(Boolean(sessionUser?.id))
        }

        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key === 'user') {
                resolveAccountDisplayName()
            }
        }

        const handleVisibilityRefresh = () => {
            resolveAccountDisplayName()
        }

        resolveAccountDisplayName()
        window.addEventListener('storage', handleStorage)
        window.addEventListener('focus', handleVisibilityRefresh)
        document.addEventListener('visibilitychange', handleVisibilityRefresh)
        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('focus', handleVisibilityRefresh)
            document.removeEventListener('visibilitychange', handleVisibilityRefresh)
        }
    }, [pathname])

    useEffect(() => {
        if (pathname.startsWith('/tienda')) {
            setSearchKeyword(searchParams.get('query') ?? '')
        }
        closeMenuMobile()
        setOpenSubNavMobile(null)
    }, [pathname, searchParamsKey, closeMenuMobile])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!searchContainerRef.current?.contains(event.target as Node)) {
                setIsSearchFocused(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleGenderClick = (gender: string) => {
        router.push(gender === 'cat' ? '/tienda/gatos' : '/tienda/perros');
    };

    const handleCategoryClick = (category: string, gender?: string) => {
        const options = gender ? { gender } : undefined
        closeMenuMobile()
        setOpenSubNavMobile(null)
        router.push(getCategoryUrl(category, options));
    };

    const handleSuggestionSelect = (product: ProductType) => {
        setSearchKeyword(product.name)
        setIsSearchFocused(false)
        closeMenuMobile()
        setOpenSubNavMobile(null)
        router.push(getProductSeoPath(product))
    }

    type CategoryLink = {
        id: string
        gender?: string
        labelOverride?: string
    }

    type MegaNavLink = {
        label: string
        href: string
    }

    type MegaMenuLink = CategoryLink | MegaNavLink
    type MegaMenuSection = {
        title: string
        links?: MegaMenuLink[]
    }

    const isCategoryLink = (link: MegaMenuLink): link is CategoryLink =>
        (link as CategoryLink).id !== undefined

    const categoriesSections: Array<{ title: string; links: CategoryLink[] }> =
        site.menu.categorySections
    const normalizedAvailableCategoryIds = useMemo(
        () => new Set((availableCategoryIds ?? []).map((categoryId) => String(categoryId).trim().toLowerCase())),
        [availableCategoryIds]
    )
    const visibleCategorySections = useMemo(() => {
        if (!availableCategoryIds || normalizedAvailableCategoryIds.size === 0) {
            return categoriesSections
        }

        const configuredCategoryIds = new Set(
            categoriesSections.flatMap((section) => section.links.map((link) => link.id.toLowerCase()))
        )
        const dynamicCategoryLinks = availableCategoryIds
            .map((categoryId) => String(categoryId).trim())
            .filter(Boolean)
            .filter((categoryId) => {
                const normalizedId = categoryId.toLowerCase()
                return (
                    !configuredCategoryIds.has(normalizedId) &&
                    !['todos', 'todas', 'perros', 'gatos'].includes(normalizedId)
                )
            })
            .map((id) => ({ id }))

        const filteredSections = categoriesSections
            .map((section) => ({
                ...section,
                links: section.links.filter((link) =>
                    normalizedAvailableCategoryIds.has(link.id.toLowerCase())
                ),
            }))
            .filter((section) => section.links.length > 0)

        if (dynamicCategoryLinks.length === 0) {
            return filteredSections
        }

        const categorySectionIndex = filteredSections.findIndex((section) =>
            section.title.toLowerCase().includes('categor')
        )

        if (categorySectionIndex === -1) {
            return [...filteredSections, { title: 'Categorías', links: dynamicCategoryLinks }]
        }

        return filteredSections.map((section, index) =>
            index === categorySectionIndex
                ? { ...section, links: [...section.links, ...dynamicCategoryLinks] }
                : section
        )
    }, [availableCategoryIds, categoriesSections, normalizedAvailableCategoryIds])

    // Ya no se usa companyLinks en el render, pero lo dejo por si acaso lo necesitas luego
    const companyLinks: MegaNavLink[] = site.menu.companyLinks

    const mainMenuItems = [
        {
            key: 'home',
            label: 'Inicio',
            href: '/',
            icon: Icon.House,
            isActive: hasMounted && pathname === '/',
        },
        {
            key: 'shop',
            label: 'Tienda',
            href: '/tienda',
            icon: Icon.Storefront,
            isActive: hasMounted && pathname.startsWith('/tienda'),
        },
        {
            key: 'about',
            label: 'Conócenos',
            href: '/pages/about',
            icon: Icon.Star,
            isActive: hasMounted && pathname === '/pages/about',
        },
        {
            key: 'contact',
            label: 'Contacto',
            href: '/pages/contact',
            icon: Icon.EnvelopeSimple,
            isActive: hasMounted && pathname === '/pages/contact',
        },
    ] as const

    const mobileMenuDescriptions: Record<(typeof mainMenuItems)[number]['key'], string> = {
        home: 'Novedades y destacados',
        shop: 'Categorías y mascotas',
        about: 'Historia y esencia de la marca',
        contact: 'Canales de atención directa',
    }

    const renderMegaMenu = (
        sections: MegaMenuSection[],
        banner: { title: string; subtitle: string; image: string }
    ) =>
    (
        <div className="mega-menu absolute top-full left-0 bg-white w-screen">
            <div className="container">
                <div className="flex justify-between pt-4 pb-8 gap-8">
                    <div className="nav-link basis-3/4 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {sections.map((section) => (
                            <div className="nav-item" key={section.title}>
                                <div className="text-button-uppercase pb-2">{section.title}</div>
                                <ul>
                                    {section.links?.map((link) => (
                                        <li key={isCategoryLink(link) ? `${link.id}-${link.gender ?? 'none'}` : link.label}>
                                            {isCategoryLink(link) ? (
                                                <div
                                                    onClick={() => handleCategoryClick(link.id, link.gender)}
                                                    className="link text-secondary duration-300 cursor-pointer"
                                                >
                                                    {link.labelOverride ?? getCategoryLabel(link.id)}
                                                </div>
                                            ) : (
                        <Link
                            href={link.href}
                            className="link text-secondary duration-300 hover:text-black"
                            onClick={() => {
                                closeMenuMobile()
                                setOpenSubNavMobile(null)
                            }}
                        >
                            {link.label}
                        </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="banner-ads-block pl-2.5 basis-1/4 min-w-[220px]">
                        <div
                            className={`banner-ads-item bg-linear rounded-2xl relative overflow-hidden cursor-pointer ${banner.image === '/images/collection/14.webp' || banner.image === '/images/collection/15.webp' || banner.image === '/images/collection/conocenos_paramascotas.webp'
                                    ? 'min-h-[220px]'
                                    : ''
                                }`}
                            onClick={() => router.push('/tienda')}
                        >
                            <div className="text-content py-14 pl-8 relative z-[1]">
                                <div className="heading6 mt-2">{banner.title}</div>
                                <div className="body1 mt-3 text-secondary">
                                    {banner.subtitle}
                                </div>
                            </div>
                            <Image
                                src={banner.image}
                                width={1000}
                                height={800}
                                alt='banner'
                                className='absolute left-0 top-0 w-full h-full object-cover'
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderMobileLinkItems = (links: MegaMenuLink[]) => (
        <>
            {links.map((link) => (
                <li key={isCategoryLink(link) ? `${link.id}-${link.gender ?? 'none'}` : link.label}>
                    {isCategoryLink(link) ? (
                        <button
                            type="button"
                            onClick={() => handleCategoryClick(link.id, link.gender)}
                            className="nav-item-mobile mobile-subnav-link text-secondary duration-300 cursor-pointer"
                        >
                            <span>{link.labelOverride ?? getCategoryLabel(link.id)}</span>
                            <Icon.ArrowRight size={16} />
                        </button>
                    ) : (
                        <Link
                            href={link.href}
                            className="nav-item-mobile mobile-subnav-link text-secondary duration-300"
                            onClick={() => {
                                closeMenuMobile()
                                setOpenSubNavMobile(null)
                            }}
                        >
                            <span>{link.label}</span>
                            <Icon.ArrowRight size={16} />
                        </Link>
                    )}
                </li>
            ))}
        </>
    )

    const categoryBanner = site.menu.banner

    const departmentLinks = useMemo(() => {
        if (!availableCategoryIds || availableCategoryIds.length === 0) {
            return site.menu.departmentLinks ?? []
        }

        const seen = new Set<string>()
        return availableCategoryIds
            .map((categoryId) => String(categoryId).trim())
            .filter(Boolean)
            .filter((categoryId) => !['perros', 'gatos'].includes(categoryId.toLowerCase()))
            .filter((categoryId) => {
                const normalized = categoryId.toLowerCase()
                if (seen.has(normalized)) return false
                seen.add(normalized)
                return true
            })
            .map((categoryId) => ({
                label: getCategoryLabel(categoryId),
                href: getCategoryUrl(categoryId),
            }))
    }, [availableCategoryIds, site.menu.departmentLinks])
    const HomeMenuIcon = mainMenuItems[0].icon
    const ShopMenuIcon = mainMenuItems[1].icon
    const AboutMenuIcon = mainMenuItems[2].icon
    const ContactMenuIcon = mainMenuItems[3].icon
    const normalizedSearchKeyword = useMemo(
        () => sanitizeProductSearchQuery(deferredSearchKeyword),
        [deferredSearchKeyword]
    )
    const shouldShowSearchPanel =
        isSearchFocused &&
        normalizedSearchKeyword.length >= minAutocompleteQueryLength &&
        searchProducts.length > 0
    const productSearchIndex = useMemo(() => {
        if (!shouldShowSearchPanel) {
            return new Map<string, string>()
        }

        return buildProductSearchIndex(searchProducts)
    }, [searchProducts, shouldShowSearchPanel])
    const searchSuggestions = useMemo(() => {
        if (!shouldShowSearchPanel) {
            return []
        }

        return filterProductsBySearch(searchProducts, normalizedSearchKeyword, productSearchIndex).slice(0, 6)
    }, [normalizedSearchKeyword, productSearchIndex, searchProducts, shouldShowSearchPanel])

    const normalizeImageSrc = (src: string) => {
        if (!src) return src
        if (src.startsWith('http://localhost:8080') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            return src.replace('http://localhost:8080', site.apiBaseUrl)
        }
        return src
    }

    const getSuggestionImage = (product: ProductType) => {
        const firstThumb = Array.isArray(product.thumbImage) ? product.thumbImage[0] : ''
        const firstImage = Array.isArray(product.images) ? product.images[0] : ''
        const imageValue = typeof firstImage === 'string' ? firstImage : (firstImage as any)?.url ?? ''
        return normalizeImageSrc(firstThumb || imageValue || '/images/product/1.webp')
    }

    const handleLogout = async () => {
        // Logout must be "strong" in SPA: clear local state immediately, then invalidate cookies server-side.
        clearStoredSession()
        setAccountDisplayName('Mi cuenta')
        setIsAuthenticated(false)

        try {
            // Must go through requestApi so CSRF/cookies behave exactly like the panel lateral logout.
            await requestApi('/api/auth/logout', { method: 'POST' })
        } catch {}

        if (openLoginPopup) {
            handleLoginPopup()
        }

        router.replace(DASHBOARD_SIGN_IN_PATH)
        router.refresh()
    }

    return (
        <>
            {fixedHeader && <div aria-hidden="true" className="pet-header-spacer" style={{ height: stickyHeight }} />}

            <div
                ref={headerRef}
                className={`header-menu style-eight ${props ?? ''} ${fixedHeader ? ' fixed' : 'relative'} bg-white w-full md:h-[90px] h-[64px]`}
            >

                <div className="container mx-auto h-full">
                    <div className="header-main flex items-center justify-between h-full">
                        <button
                            type="button"
                            className="menu-mobile-icon flex h-11 w-11 items-center justify-center border-0 bg-transparent p-0 text-black lg:hidden"
                            onClick={handleMenuMobile}
                            aria-label="Abrir menú"
                        >
                            <Icon.List size={28} weight="bold" aria-hidden="true" />
                        </button>
                        <Link href={'/'} className='flex items-center'>
                            <div className="relative h-[55px] w-[126px] md:h-[80px] md:w-[184px]">
                                <Image
                                    src={site.logo.src}
                                    alt={site.logo.alt}
                                    fill
                                    priority
                                    loading="eager"
                                    className="object-contain"
                                    sizes="(min-width: 1024px) 184px, 126px"
                                />
                            </div>
                        </Link>
                        <div className="form-search w-[54%] pl-8 flex items-center h-[42px] max-lg:hidden">
                            <div ref={searchContainerRef} className='relative w-full'>
                                <div className='group flex h-full min-h-[42px] w-full items-center overflow-hidden rounded-[22px] border border-[rgba(0,127,155,0.18)] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.08)] transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-[var(--blue)] focus-within:shadow-[0_16px_32px_rgba(0,127,155,0.14)]'>
                                    <input
                                        type="text"
                                        className="search-input h-full w-full border-none bg-transparent px-6 text-[16px] text-black outline-none placeholder:text-[rgba(15,23,42,0.48)]"
                                        placeholder="Buscar por marca, producto, categoría o SKU"
                                        suppressHydrationWarning
                                        value={searchKeyword}
                                        onFocus={() => {
                                            if (searchProducts.length > 0) {
                                                setIsSearchFocused(true)
                                            }
                                        }}
                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setIsSearchFocused(false)
                                                return
                                            }

                                            if (e.key === 'Enter') {
                                                setIsSearchFocused(false)
                                                handleSearch(searchKeyword)
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        aria-label="Buscar productos"
                                        className="search-button mr-2 flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-[var(--blue)] px-0 text-white transition-all duration-300 hover:bg-[var(--bluesecondary)]"
                                        onClick={() => {
                                            setIsSearchFocused(false)
                                            handleSearch(searchKeyword)
                                        }}
                                    >
                                        <Icon.MagnifyingGlass size={22} weight='bold' className='duration-300' />
                                    </button>
                                </div>

                                {shouldShowSearchPanel && (
                                    <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-[140] overflow-hidden rounded-[24px] border border-[rgba(0,127,155,0.12)] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                                        {searchSuggestions.length > 0 ? (
                                            <>
                                                <div className="border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
                                                    Resultados rápidos
                                                </div>
                                                <div className="max-h-[420px] overflow-y-auto">
                                                    {searchSuggestions.map((product) => {
                                                        const imageSrc = getSuggestionImage(product)
                                                        const price = Number(product.priceMin ?? product.price ?? 0)

                                                        return (
                                                            <button
                                                                key={product.id}
                                                                type="button"
                                                                className="flex w-full items-center gap-4 border-b border-line px-4 py-3 text-left duration-200 last:border-b-0 hover:bg-surface"
                                                                onMouseDown={(event) => event.preventDefault()}
                                                                onClick={() => handleSuggestionSelect(product)}
                                                            >
                                                                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface">
                                                                    <Image
                                                                        src={imageSrc}
                                                                        alt={product.name}
                                                                        fill
                                                                        sizes="56px"
                                                                        unoptimized={imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')}
                                                                        className="object-contain"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="truncate text-[14px] font-semibold text-black">
                                                                        {product.name}
                                                                    </div>
                                                                    <div className="mt-1 truncate text-[12px] text-secondary">
                                                                        {[product.brand, product.category].filter(Boolean).join(' · ')}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[13px] font-semibold text-[var(--blue)]">
                                                                        ${price.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </div>
                                                                    <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-secondary">
                                                                        Ver
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="flex w-full items-center justify-between bg-surface px-5 py-3 text-left text-[13px] font-semibold text-[var(--blue)] duration-200 hover:text-black"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        setIsSearchFocused(false)
                                                        handleSearch(searchKeyword)
                                                    }}
                                                >
                                                    <span>Ver todos los resultados</span>
                                                    <Icon.ArrowRight size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="px-5 py-4 text-sm text-secondary">
                                                No encontramos productos para esa búsqueda.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="right flex gap-12">
                            <div className="list-action flex items-center gap-6">
                                <div className="user-icon relative flex items-center flex-col justify-center cursor-pointer">
                                    <Icon.User size={26} color='black' onClick={handleLoginPopup} />
                                    <div className="caption1" onClick={handleLoginPopup}>{visibleAccountDisplayName}</div>
                                    <div
                                        className={`login-popup absolute top-[74px] w-[320px] p-7 rounded-xl bg-white box-shadow-sm 
                                            ${openLoginPopup ? 'open' : ''}`}
                                    >
                                        {showAuthenticatedMenu ? (
                                            <>
                                                <Link href={DASHBOARD_PATH} prefetch={false} className="button-main w-full text-center">Panel</Link>
                                                <button
                                                    type="button"
                                                    onClick={handleLogout}
                                                    className="button-main mt-3 bg-white text-black border border-black w-full text-center"
                                                >
                                                    Cerrar sesión
                                                </button>
                                                <div className="bottom mt-4 pt-4 border-t border-line"></div>
                                                <Link href={'/pages/contact'} className='body1 hover:underline'>Soporte</Link>
                                            </>
                                        ) : (
                                            <>
                                                <Link href={DASHBOARD_SIGN_IN_PATH} prefetch={false} className="button-main w-full text-center">Iniciar sesión</Link>
                                                <div className="text-secondary text-center mt-3 pb-4">¿No tienes una cuenta?
                                                    <Link href={'/register'} className='text-black pl-1 hover:underline'>Regístrate</Link>
                                                </div>
                                                <Link href={DASHBOARD_PATH} prefetch={false} className="button-main bg-white text-black border border-black w-full text-center">Panel</Link>
                                                <div className="bottom mt-4 pt-4 border-t border-line"></div>
                                                <Link href={'/pages/contact'} className='body1 hover:underline'>Soporte</Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="cart-icon flex flex-col items-center relative cursor-pointer" onClick={openModalCart}>
                                    <Icon.ShoppingCartSimple size={26} color='black' />
                                    <div className="caption1">Carrito</div>
                                    <span className="quantity cart-quantity absolute -right-3 -top-3 text-base text-[#2f4f4f] font-semibold">
                                        {cartState.cartArray.reduce((sum, item) => sum + (item.quantity ?? 0), 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                ref={topNavRef}
                className={`top-nav-menu relative bg-white h-[44px] max-lg:hidden ${fixedHeader ? 'fixed' : ''}`}
                style={fixedHeader ? { top: headerHeight } : undefined}
            >
                <div className="container h-full">
                    <div className="top-nav-menu-main flex items-center justify-center h-full">
                        <div className="left flex items-center justify-center h-full w-full">
                            <div className="menu-department-block relative h-full">

                                <div
                                    className={`sub-menu-department absolute top-[44px] left-0 right-0 h-max bg-white rounded-b-2xl ${openShopDepartmentPopup ? 'open' : ''}`}
                                >
                                    {departmentLinks.map((link, index) => (
                                        <div className="item block" key={`${link.href}-${index}`}>
                                            <Link
                                                href={link.href}
                                                className={`caption1 py-4 px-5 whitespace-nowrap block ${index < departmentLinks.length - 1 ? 'border-b border-line' : ''}`}
                                                onClick={() => {
                                                    closeMenuMobile()
                                                    setOpenSubNavMobile(null)
                                                }}
                                            >
                                                {link.label}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="menu-main style-eight h-full max-lg:hidden">
                                <ul className='flex items-center gap-8 h-full'>
                                    <li className='h-full'>
                                        <Link
                                            href={mainMenuItems[0].href}
                                            className={`text-button-uppercase duration-300 h-full flex items-center justify-center gap-1 ${mainMenuItems[0].isActive ? 'active' : ''}`}
                                        >
                                            {mainMenuItems[0].label}
                                        </Link>
                                    </li>
                                    <li className='h-full'>
                                        <Link href={mainMenuItems[1].href} className={`text-button-uppercase duration-300 h-full flex items-center justify-center gap-1 ${mainMenuItems[1].isActive ? 'active' : ''}`}>
                                            {mainMenuItems[1].label}
                                        </Link>
                                        {renderMegaMenu(
                                            visibleCategorySections,
                                            categoryBanner
                                        )}
                                    </li>
                                    <li className='h-full '>
                                        <Link
                                            href={mainMenuItems[2].href}
                                            className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${mainMenuItems[2].isActive ? 'active' : ''}`}
                                        >
                                            {mainMenuItems[2].label}
                                        </Link>
                                    </li>

                                    <li className='h-full'>
                                        <Link
                                            href={mainMenuItems[3].href}
                                            className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${mainMenuItems[3].isActive ? 'active' : ''}`}
                                        >
                                            {mainMenuItems[3].label}
                                        </Link>
                                    </li>

                                </ul>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div
                id="menu-mobile"
                className={`${openMenuMobile ? 'open' : ''}`}
                onClick={handleMenuMobile}
            >
                <div
                    className="menu-container bg-white h-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="menu-mobile-shell h-full">
                        <div className="menu-main h-full overflow-hidden relative">
                            <div className="heading menu-mobile-header">
                                <div className="menu-mobile-header__copy">
                                    <div className="menu-mobile-title">Menú</div>
                                </div>
                                <button
                                    type="button"
                                    className="close-menu-mobile-btn"
                                    onClick={handleMenuMobile}
                                    aria-label="Cerrar menú"
                                >
                                    <Icon.X size={16} />
                                </button>
                            </div>
                            <div className="list-nav mt-6">
                                <div className="menu-mobile-section-title">Menú principal</div>
                                <ul>

                                    <li>
                                        <Link
                                            href={mainMenuItems[0].href}
                                            className={`menu-primary-link ${mainMenuItems[0].isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                closeMenuMobile()
                                                setOpenSubNavMobile(null)
                                            }}
                                        >
                                            <span className="menu-primary-link__icon">
                                                <HomeMenuIcon size={19} />
                                            </span>
                                            <span className="menu-primary-link__body">
                                                <span className="menu-primary-link__label">{mainMenuItems[0].label}</span>
                                                <span className="menu-primary-link__hint">{mobileMenuDescriptions.home}</span>
                                            </span>
                                            <span className="menu-primary-link__chevron">
                                                <Icon.ArrowUpRight size={18} />
                                            </span>
                                        </Link>
                                    </li>

                                    <li className={`${openSubNavMobile === 1 ? 'open' : ''}`}>
                                        <button
                                            type="button"
                                            className="menu-primary-link menu-primary-link--button"
                                            onClick={() => handleOpenSubNavMobile(1)}
                                        >
                                            <span className="menu-primary-link__icon">
                                                <ShopMenuIcon size={19} />
                                            </span>
                                            <span className="menu-primary-link__body">
                                                <span className="menu-primary-link__label">{mainMenuItems[1].label}</span>
                                                <span className="menu-primary-link__hint">{mobileMenuDescriptions.shop}</span>
                                            </span>
                                            <span className="menu-primary-link__chevron">
                                                <Icon.CaretRight size={18} />
                                            </span>
                                        </button>

                                        <div className="sub-nav-mobile">
                                            <div className="sub-nav-mobile__header">
                                                <button
                                                    type="button"
                                                    className="back-btn"
                                                    onClick={() => handleOpenSubNavMobile(1)}
                                                >
                                                    <Icon.CaretLeft size={18} />
                                                    <span>Atrás</span>
                                                </button>
                                                <div className="sub-nav-mobile__title">Tienda</div>
                                                <div className="sub-nav-mobile__subtitle">Explora por categoría pública o por mascota.</div>
                                            </div>

                                            <div className="list-nav-item">
                                                {visibleCategorySections.map((section) => (
                                                    <div className="mobile-nav-section-card" key={section.title}>
                                                        <div className="mobile-nav-section-card__title">{section.title}</div>
                                                        <ul className="mobile-nav-section-card__list">
                                                            {renderMobileLinkItems(section.links ?? [])}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </li>

                                    <li>
                                        <Link
                                            href={mainMenuItems[2].href}
                                            className={`menu-primary-link ${mainMenuItems[2].isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                closeMenuMobile()
                                                setOpenSubNavMobile(null)
                                            }}
                                        >
                                            <span className="menu-primary-link__icon">
                                                <AboutMenuIcon size={19} />
                                            </span>
                                            <span className="menu-primary-link__body">
                                                <span className="menu-primary-link__label">{mainMenuItems[2].label}</span>
                                                <span className="menu-primary-link__hint">{mobileMenuDescriptions.about}</span>
                                            </span>
                                            <span className="menu-primary-link__chevron">
                                                <Icon.ArrowUpRight size={18} />
                                            </span>
                                        </Link>
                                    </li>

                                    <li>
                                        <Link
                                            href={mainMenuItems[3].href}
                                            className={`menu-primary-link ${mainMenuItems[3].isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                closeMenuMobile()
                                                setOpenSubNavMobile(null)
                                            }}
                                        >
                                            <span className="menu-primary-link__icon">
                                                <ContactMenuIcon size={19} />
                                            </span>
                                            <span className="menu-primary-link__body">
                                                <span className="menu-primary-link__label">{mainMenuItems[3].label}</span>
                                                <span className="menu-primary-link__hint">{mobileMenuDescriptions.contact}</span>
                                            </span>
                                            <span className="menu-primary-link__chevron">
                                                <Icon.ArrowUpRight size={18} />
                                            </span>
                                        </Link>
                                    </li>

                                </ul>

                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default MenuPet
