'use client'

import { useState, type ComponentType } from 'react'
import Image from '@/components/Common/AppImage'
import {
    ArrowsClockwise,
    Archive,
    Bank,
    Bell,
    BowlFood,
    Briefcase,
    Calculator,
    CaretDown,
    ChartBar,
    ChartLineUp,
    ChartPieSlice,
    CurrencyDollar,
    Files,
    Flask,
    GearSix,
    HourglassMedium,
    HouseLine,
    ListChecks,
    MapPin,
    NotePencil,
    Package,
    Palette,
    Percent,
    Power,
    Receipt,
    Rows,
    Ruler,
    SealCheck,
    ShoppingBag,
    SignOut,
    SlidersHorizontal,
    Stack,
    Storefront,
    Tag,
    TrendUp,
    Trophy,
    Truck,
    Users,
} from "@phosphor-icons/react/dist/ssr"

import {
    PRODUCT_ATTRIBUTE_REFERENCE_KEY_SET,
    PRODUCT_REFERENCE_NAV_SECTIONS,
    type ProductReferenceKey,
} from '@/lib/productReferenceData'
import type { AdminMenuGroupKey, AdminReportSection } from '../types'
import PanelNavButton from './PanelNavButton'

type SidebarUser = {
    role?: string;
    name?: string;
    email?: string;
}

type AccountSidebarProps = {
    user: SidebarUser;
    activeTab?: string;
    adminReportSection: AdminReportSection;
    adminMenuExpanded: Record<AdminMenuGroupKey, boolean>;
    focusedReferenceCatalogKey?: ProductReferenceKey | null;
    onToggleAdminMenuGroup: (groupKey: AdminMenuGroupKey) => void;
    onOpenAdminReportSection: (section: AdminReportSection) => void;
    onNavigateToPanelTab: (tab: string) => void;
    onNavigateToReferenceCatalog: (key: ProductReferenceKey | null) => void;
    onLogout: () => void;
    strategicAlertsCount: number;
    strategicCriticalCount: number;
}

type SidebarIcon = ComponentType<{ size?: string | number; className?: string }>

const referenceCatalogIcons: Record<string, SidebarIcon> = {
    SealCheck,
    Truck,
    Ruler,
    Stack,
    Palette,
    ArrowsClockwise,
    Package,
    Flask,
    MapPin,
    Tag,
    BowlFood,
    HourglassMedium,
}

export default function AccountSidebar({
    user,
    activeTab,
    adminReportSection,
    adminMenuExpanded,
    focusedReferenceCatalogKey = null,
    onToggleAdminMenuGroup,
    onOpenAdminReportSection,
    onNavigateToPanelTab,
    onNavigateToReferenceCatalog,
    onLogout,
    strategicAlertsCount,
    strategicCriticalCount,
}: AccountSidebarProps) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const isAdmin = user.role === 'admin'
    const customerInitials = String(user.name || user.email || 'Cliente')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'C'
    const customerNavClass = (isActive: boolean) =>
        `customer-nav-item item group flex w-full items-center gap-3 px-3 py-2.5 text-left ${isActive ? 'customer-nav-item--active' : ''}`
    const navigateCustomer = (tab: string) => {
        onNavigateToPanelTab(tab)
        setMobileNavOpen(false)
    }

    return (
        <div className={`user-infor ${isAdmin ? 'bg-surface lg:px-7 px-4 lg:py-10 py-5 md:rounded-[20px] rounded-xl' : 'customer-account-nav p-4'}`}>
            <div className="heading flex flex-col items-center justify-center">
                {isAdmin ? (
                    <div className="avatar">
                        <Image
                            src={'/images/avatar/1.png'}
                            width={300}
                            height={300}
                            alt='Foto de perfil'
                            priority
                            loading="eager"
                            className='md:w-[140px] w-[120px] md:h-[140px] h-[120px] rounded-full'
                        />
                    </div>
                ) : (
                    <div className="customer-initials flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-base font-bold tracking-wide" aria-hidden="true">
                        {customerInitials}
                    </div>
                )}
                <div className={`${isAdmin ? 'name heading6 mt-4 text-center' : 'customer-profile-copy min-w-0 text-center'}`}>
                    {!isAdmin && <span className="customer-eyebrow mb-0.5 block text-[11px] font-bold uppercase tracking-[0.12em]">Cuenta cliente</span>}
                    <div className={isAdmin ? '' : 'customer-profile-name truncate text-sm font-bold'}>{user.name || 'Cliente'}</div>
                    {!isAdmin && <div className="customer-muted mt-0.5 truncate text-xs font-normal normal-case" title={user.email}>{user.email}</div>}
                </div>
                {isAdmin && <div className="mail heading6 font-normal normal-case text-secondary text-center mt-1 break-all">{user.email}</div>}
            </div>
            <button
                type="button"
                className={`mt-3 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-bold lg:hidden ${isAdmin ? 'min-h-[48px] border border-line bg-white text-black' : 'customer-account-menu-toggle'}`}
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-expanded={mobileNavOpen}
                aria-controls="account-navigation"
            >
                <span className="flex items-center gap-2">
                    <ListChecks size={18} />
                    {isAdmin ? 'Menú del panel' : 'Menú de mi cuenta'}
                </span>
                <CaretDown size={16} className={`duration-300 ${mobileNavOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                id="account-navigation"
                className={`menu-tab w-full max-w-none lg:mt-10 mt-4 ${!mobileNavOpen ? 'hidden lg:block' : ''}`}
            >
                {isAdmin ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-line overflow-hidden bg-white">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface duration-300"
                                onClick={() => onToggleAdminMenuGroup('reporting')}
                            >
                                <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wide text-secondary">
                                    <ChartPieSlice size={16} />
                                    <span>Reportes</span>
                                </div>
                                <CaretDown size={14} className={`duration-300 ${adminMenuExpanded.reporting ? 'rotate-180' : ''}`} />
                            </button>
                            {adminMenuExpanded.reporting && (
                                <div className="pb-2 px-2 space-y-1.5">
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'reports' && adminReportSection === 'general'} onClick={() => onOpenAdminReportSection('general')}>
                                        <ChartPieSlice size={18} />
                                        <strong className="heading6">Reporte general</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'reports' && adminReportSection === 'sales'} onClick={() => onOpenAdminReportSection('sales')}>
                                        <ChartLineUp size={18} />
                                        <strong className="heading6">Reporte de ventas</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'reports' && adminReportSection === 'balance'} onClick={() => onOpenAdminReportSection('balance')}>
                                        <Bank size={18} />
                                        <strong className="heading6">Balance general</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'reports' && adminReportSection === 'inventory'} onClick={() => onOpenAdminReportSection('inventory')}>
                                        <Archive size={18} />
                                        <strong className="heading6">Reporte de inventario</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'reports' && adminReportSection === 'traceability'} onClick={() => onOpenAdminReportSection('traceability')}>
                                        <Files size={18} />
                                        <strong className="heading6">Reporte de trazabilidad</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'reports' && adminReportSection === 'products-purchases'} onClick={() => onOpenAdminReportSection('products-purchases')}>
                                        <Package size={18} />
                                        <strong className="heading6">Productos x Compra</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-3 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'sales-ranking'} onClick={() => onNavigateToPanelTab('sales-ranking')}>
                                        <Trophy size={18} />
                                        <strong className="heading6">Ranking de productos</strong>
                                    </PanelNavButton>
                                </div>
                            )}
                        </div>

                        
                        <div className="rounded-xl border border-line overflow-hidden bg-white">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface duration-300"
                                onClick={() => onToggleAdminMenuGroup('monitoring')}
                            >
                                <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wide text-secondary">
                                    <ChartBar size={16} />
                                    <span>Monitoreo</span>
                                </div>
                                <CaretDown size={14} className={`duration-300 ${adminMenuExpanded.monitoring ? 'rotate-180' : ''}`} />
                            </button>
                            {adminMenuExpanded.monitoring && (
                                <div className="pb-2 px-2 space-y-1.5">
                                    <PanelNavButton
                                        className="item flex items-center justify-between gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface"
                                        isActive={activeTab === 'alerts'}
                                        onClick={() => onNavigateToPanelTab('alerts')}
                                        trailing={strategicAlertsCount > 0 ? (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${strategicCriticalCount > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {strategicAlertsCount}
                                            </span>
                                        ) : undefined}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Bell size={18} />
                                            <strong className="heading6">Alertas</strong>
                                        </span>
                                    </PanelNavButton>
                                    <PanelNavButton
                                        className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface"
                                        isActive={activeTab === 'security-settings'}
                                        onClick={() => onNavigateToPanelTab('security-settings')}
                                    >
                                        <SealCheck size={18} />
                                        <strong className="heading6">Seguridad</strong>
                                    </PanelNavButton>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-line overflow-hidden bg-white">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface duration-300"
                                onClick={() => onToggleAdminMenuGroup('catalog')}
                            >
                                <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wide text-secondary">
                                    <Package size={16} />
                                    <span>Catálogo</span>
                                </div>
                                <CaretDown size={14} className={`duration-300 ${adminMenuExpanded.catalog ? 'rotate-180' : ''}`} />
                            </button>
                            {adminMenuExpanded.catalog && (
                                <div className="pb-2 px-2 space-y-1.5">
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'products'} onClick={() => onNavigateToPanelTab('products')}>
                                        <ShoppingBag size={18} />
                                        <strong className="heading6">Productos</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'inventory'} onClick={() => onNavigateToPanelTab('inventory')}>
                                        <Archive size={18} />
                                        <strong className="heading6">Inventario</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'catalogs' && !focusedReferenceCatalogKey} onClick={() => onNavigateToReferenceCatalog(null)}>
                                        <span className="flex items-center gap-3">
                                            <Rows size={18} />
                                            <strong className="heading6">Catálogos operativos</strong>
                                        </span>
                                        <CaretDown size={14} className={`ml-auto duration-300 ${activeTab === 'catalogs' ? 'rotate-180' : ''}`} />
                                    </PanelNavButton>
                                    {activeTab === 'catalogs' && (
                                        <div className="mt-2 rounded-xl border border-line bg-surface p-2">
                                            <div className="px-2 pb-2 text-[10px] uppercase font-bold tracking-wide text-secondary">
                                                Listas operativas
                                            </div>
                                            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                                            {PRODUCT_REFERENCE_NAV_SECTIONS.map((section) => {
                                                const ItemIcon = referenceCatalogIcons[section.menuIcon] ?? Tag
                                                const isActiveReference = focusedReferenceCatalogKey === section.key
                                                    || (section.key === 'sizes' && !!focusedReferenceCatalogKey && PRODUCT_ATTRIBUTE_REFERENCE_KEY_SET.has(focusedReferenceCatalogKey))
                                                return (
                                                    <PanelNavButton
                                                        key={`reference-catalog-${section.key}`}
                                                        className="item flex items-center gap-3 w-full px-3 py-2.5 rounded-lg cursor-pointer duration-300 border border-transparent hover:bg-white hover:border-line"
                                                        isActive={isActiveReference}
                                                        onClick={() => onNavigateToReferenceCatalog(section.key)}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center shrink-0">
                                                            <ItemIcon size={15} />
                                                        </div>
                                                        <span className="text-[13px] font-semibold leading-tight">{section.sidebarTitle}</span>
                                                    </PanelNavButton>
                                                )
                                            })}
                                            </div>
                                        </div>
                                    )}
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'users'} onClick={() => onNavigateToPanelTab('users')}>
                                        <Users size={18} />
                                        <strong className="heading6">Usuarios</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'product-page'} onClick={() => onNavigateToPanelTab('product-page')}>
                                        <NotePencil size={18} />
                                        <strong className="heading6">Ficha de producto</strong>
                                    </PanelNavButton>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-line overflow-hidden bg-white">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface duration-300"
                                onClick={() => onToggleAdminMenuGroup('operations')}
                            >
                                <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wide text-secondary">
                                    <Truck size={16} />
                                    <span>Operación</span>
                                </div>
                                <CaretDown size={14} className={`duration-300 ${adminMenuExpanded.operations ? 'rotate-180' : ''}`} />
                            </button>
                            {adminMenuExpanded.operations && (
                                <div className="pb-2 px-2 space-y-1.5">
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'store-status'} onClick={() => onNavigateToPanelTab('store-status')}>
                                        <Power size={18} />
                                        <strong className="heading6">Ventas</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'local-sales'} onClick={() => onNavigateToPanelTab('local-sales')}>
                                        <Storefront size={18} />
                                        <strong className="heading6">Venta en local</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'quotations'} onClick={() => onNavigateToPanelTab('quotations')}>
                                        <Files size={18} />
                                        <strong className="heading6">Cotizaciones</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'admin-orders'} onClick={() => onNavigateToPanelTab('admin-orders')}>
                                        <ListChecks size={18} />
                                        <strong className="heading6">Pedidos</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'shipments'} onClick={() => onNavigateToPanelTab('shipments')}>
                                        <Truck size={18} />
                                        <strong className="heading6">Envíos y mapa</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'billing-rides'} onClick={() => onNavigateToPanelTab('billing-rides')}>
                                        <Receipt size={18} />
                                        <strong className="heading6">Facturas PDF</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'balances'} onClick={() => onNavigateToPanelTab('balances')}>
                                        <Briefcase size={18} />
                                        <strong className="heading6">Balances</strong>
                                    </PanelNavButton>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-line overflow-hidden bg-white">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface duration-300"
                                onClick={() => onToggleAdminMenuGroup('finance')}
                            >
                                <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wide text-secondary">
                                    <CurrencyDollar size={16} />
                                    <span>Precios y finanzas</span>
                                </div>
                                <CaretDown size={14} className={`duration-300 ${adminMenuExpanded.finance ? 'rotate-180' : ''}`} />
                            </button>
                            {adminMenuExpanded.finance && (
                                <div className="pb-2 px-2 space-y-1.5">
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'prices'} onClick={() => onNavigateToPanelTab('prices')}>
                                        <CurrencyDollar size={18} />
                                        <strong className="heading6">Precios</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'taxes'} onClick={() => onNavigateToPanelTab('taxes')}>
                                        <Percent size={18} />
                                        <strong className="heading6">Impuestos</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'margins'} onClick={() => onNavigateToPanelTab('margins')}>
                                        <TrendUp size={18} />
                                        <strong className="heading6">Márgenes</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'calculations'} onClick={() => onNavigateToPanelTab('calculations')}>
                                        <Calculator size={18} />
                                        <strong className="heading6">Cálculos</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'pricing-rules'} onClick={() => onNavigateToPanelTab('pricing-rules')}>
                                        <SlidersHorizontal size={18} />
                                        <strong className="heading6">Reglas de precio</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'discount-codes'} onClick={() => onNavigateToPanelTab('discount-codes')}>
                                        <Tag size={18} />
                                        <strong className="heading6">Cupones</strong>
                                    </PanelNavButton>
                                    <PanelNavButton className="item flex items-center gap-3 w-full px-4 py-2.5 rounded-lg cursor-pointer duration-300 hover:bg-surface" isActive={activeTab === 'expenses'} onClick={() => onNavigateToPanelTab('expenses')}>
                                        <Receipt size={18} />
                                        <strong className="heading6">Gastos</strong>
                                    </PanelNavButton>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <PanelNavButton className={customerNavClass(activeTab === 'dashboard')} isActive={activeTab === 'dashboard'} onClick={() => navigateCustomer('dashboard')}>
                            <HouseLine size={20} />
                            <strong className="text-sm font-bold">Resumen</strong>
                        </PanelNavButton>
                        <PanelNavButton className={customerNavClass(activeTab === 'orders')} isActive={activeTab === 'orders'} onClick={() => navigateCustomer('orders')}>
                            <Package size={20} />
                            <strong className="text-sm font-bold">Mis pedidos</strong>
                        </PanelNavButton>
                        <PanelNavButton className={customerNavClass(activeTab === 'address')} isActive={activeTab === 'address'} onClick={() => navigateCustomer('address')}>
                            <MapPin size={20} />
                            <strong className="text-sm font-bold">Direcciones</strong>
                        </PanelNavButton>
                        <PanelNavButton className={customerNavClass(activeTab === 'setting')} isActive={activeTab === 'setting'} onClick={() => navigateCustomer('setting')}>
                            <GearSix size={20} />
                            <strong className="text-sm font-bold">Datos y seguridad</strong>
                        </PanelNavButton>
                    </div>
                )}
                <button onClick={onLogout} className={isAdmin ? 'item flex items-center gap-3 w-full px-5 py-4 rounded-lg cursor-pointer duration-300 hover:bg-white mt-1.5 text-left border-none bg-transparent' : 'customer-account-logout mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors'}>
                    <SignOut size={20} />
                    <strong className={isAdmin ? 'heading6' : 'text-sm font-bold'}>Cerrar sesión</strong>
                </button>
            </div>
        </div>
    )
}
