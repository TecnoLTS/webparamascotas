'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import {
    getBrandSearchText,
    getSupplierSearchText,
    normalizeReferenceList,
    PRODUCT_REFERENCE_SECTIONS,
    PRODUCT_SYSTEM_REFERENCE_GROUPS,
    type ProductBrandReference,
    type ProductReferenceData,
    type ProductReferenceKey,
    type ProductSupplierReference,
} from '@/lib/productReferenceData'
import BrandReferenceSectionCard from './BrandReferenceSectionCard'
import ProductReferenceSectionCard from './ProductReferenceSectionCard'
import SupplierReferenceSectionCard from './SupplierReferenceSectionCard'

type ProductReferenceDataPanelProps = {
    data: ProductReferenceData;
    loading?: boolean;
    saving?: boolean;
    focusKey?: ProductReferenceKey | null;
    onChange: (next: ProductReferenceData) => void;
    onSave: () => Promise<void> | void;
}

export default React.memo(function ProductReferenceDataPanel({
    data,
    loading = false,
    saving = false,
    focusKey = null,
    onChange,
    onSave,
}: ProductReferenceDataPanelProps) {
    const [panelSearch, setPanelSearch] = React.useState('')
    const [selectedKey, setSelectedKey] = React.useState<ProductReferenceKey>(PRODUCT_REFERENCE_SECTIONS[0].key)

    const normalizedPanelSearch = React.useMemo(
        () => panelSearch.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es-EC'),
        [panelSearch]
    )
    const totalEntries = React.useMemo(
        () => PRODUCT_REFERENCE_SECTIONS.reduce((acc, section) => acc + (data[section.key]?.length || 0), 0),
        [data]
    )
    const emptyCatalogCount = React.useMemo(
        () => PRODUCT_REFERENCE_SECTIONS.filter((section) => (data[section.key] || []).length === 0).length,
        [data]
    )
    const filteredSections = React.useMemo(() => {
        if (!normalizedPanelSearch) return PRODUCT_REFERENCE_SECTIONS
        return PRODUCT_REFERENCE_SECTIONS.filter((section) => {
            const haystack = [
                section.title,
                section.sidebarTitle,
                section.description,
                ...(section.key === 'brands'
                    ? data.brands.map((brand) => getBrandSearchText(brand))
                    : section.key === 'suppliers'
                        ? data.suppliers.map((supplier) => getSupplierSearchText(supplier))
                        : (data[section.key] || [])),
            ]
                .join(' ')
                .toLocaleLowerCase('es-EC')

            return haystack.includes(normalizedPanelSearch)
        })
    }, [data, normalizedPanelSearch])

    const updateSectionValues = React.useCallback((key: ProductReferenceKey, nextValues: string[]) => {
        onChange({
            ...data,
            [key]: normalizeReferenceList(nextValues),
        })
    }, [data, onChange])

    const updateBrands = React.useCallback((nextValues: ProductBrandReference[]) => {
        onChange({
            ...data,
            brands: nextValues,
        })
    }, [data, onChange])

    const updateSuppliers = React.useCallback((nextValues: ProductSupplierReference[]) => {
        onChange({
            ...data,
            suppliers: nextValues,
        })
    }, [data, onChange])

    React.useEffect(() => {
        if (focusKey) {
            setSelectedKey(focusKey)
        }
    }, [focusKey])

    React.useEffect(() => {
        if (!filteredSections.some((section) => section.key === selectedKey)) {
            setSelectedKey(filteredSections[0]?.key ?? PRODUCT_REFERENCE_SECTIONS[0].key)
        }
    }, [filteredSections, selectedKey])

    const selectedSection = React.useMemo(
        () => PRODUCT_REFERENCE_SECTIONS.find((section) => section.key === selectedKey) || PRODUCT_REFERENCE_SECTIONS[0],
        [selectedKey]
    )

    return (
        <div className="tab text-content w-full">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 pb-5">
                <div>
                    <div className="heading5">Catálogos operativos</div>
                    <p className="text-secondary mt-2 max-w-3xl">
                        Administra las opciones reutilizables del editor de productos. Aquí registras, consultas y editas
                        categorías, marcas, proveedores, tallas, materiales y demás listas operativas sin dejar texto libre descontrolado.
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:min-w-[420px]">
                    <div className="rounded-xl border border-line bg-white px-4 py-3">
                        <div className="text-[10px] uppercase font-bold text-secondary">Catálogos</div>
                        <div className="text-2xl font-bold mt-1">{PRODUCT_REFERENCE_SECTIONS.length}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-white px-4 py-3">
                        <div className="text-[10px] uppercase font-bold text-secondary">Opciones</div>
                        <div className="text-2xl font-bold mt-1">{totalEntries}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-white px-4 py-3">
                        <div className="text-[10px] uppercase font-bold text-secondary">Vacíos</div>
                        <div className="text-2xl font-bold mt-1">{emptyCatalogCount}</div>
                    </div>
                    <div className="rounded-xl border border-line bg-white px-4 py-3">
                        <div className="text-[10px] uppercase font-bold text-secondary">Estado</div>
                        <div className={`text-sm font-bold mt-2 ${saving ? 'text-orange-600' : 'text-green-700'}`}>
                            {saving ? 'Guardando' : 'Listo'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 rounded-2xl border border-line bg-white mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold">Buscar catálogo u opción</div>
                        <p className="text-secondary text-xs mt-1">Busca por nombre de catálogo, descripción u opción existente.</p>
                    </div>
                    <div className="relative lg:w-[420px]">
                        <Icon.MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                        <input
                            className="border border-line rounded-xl pl-10 pr-4 py-3 w-full outline-none transition-all focus:border-black"
                            value={panelSearch}
                            placeholder="Buscar marca, proveedor, talla, color..."
                            onChange={(event) => setPanelSearch(event.target.value)}
                            disabled={saving || loading}
                        />
                    </div>
                </div>
            </div>

            <div className="p-5 rounded-2xl border border-line bg-surface mb-6">
                <div className="text-sm font-semibold mb-3">Taxonomía fija del sistema</div>
                <p className="text-secondary text-xs mb-4">
                    Tipo de producto y mascota siguen controlando atributos y validaciones del editor. Las categorías públicas
                    se administran como catálogo operativo y quedan disponibles para tienda, filtros y sitemap.
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {PRODUCT_SYSTEM_REFERENCE_GROUPS.map((group) => (
                        <div key={group.title} className="rounded-2xl border border-line bg-white p-4">
                            <div className="text-xs uppercase font-bold text-secondary mb-2">{group.title}</div>
                            <p className="text-secondary text-xs mb-3">{group.description}</p>
                            <div className="flex flex-wrap gap-2">
                                {group.values.map((value) => (
                                    <span key={value} className="px-3 py-1.5 rounded-full bg-surface text-sm font-semibold">
                                        {value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
                <div className="rounded-2xl border border-line bg-white p-4 h-fit">
                    <div className="text-sm font-semibold">Catálogos disponibles</div>
                    <p className="text-secondary text-xs mt-1">
                        Elige el catálogo que quieres administrar. Esta vista está pensada para crecer sin volverse incómoda.
                    </p>
                    <div className="mt-4 space-y-2 max-h-[720px] overflow-y-auto pr-1">
                        {filteredSections.length > 0 ? filteredSections.map((section) => {
                            const ItemIcon = Icon[section.menuIcon]
                            const isActive = selectedSection.key === section.key
                            return (
                                <button
                                    key={`catalog-selector-${section.key}`}
                                    type="button"
                                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                                        isActive
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary/10'
                                            : 'border-line bg-surface/40 hover:bg-surface'
                                    }`}
                                    onClick={() => setSelectedKey(section.key)}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                isActive ? 'bg-primary/10 text-primary' : 'bg-white border border-line'
                                            }`}>
                                                <ItemIcon size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm leading-tight">{section.title}</div>
                                                <div className="text-xs text-secondary mt-1 truncate">{section.description}</div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 rounded-full bg-white text-[11px] font-bold text-secondary shrink-0">
                                            {(data[section.key] || []).length}
                                        </div>
                                    </div>
                                </button>
                            )
                        }) : (
                            <div className="rounded-xl border border-dashed border-line px-4 py-6 text-sm text-secondary bg-surface/50">
                                No hay catálogos que coincidan con la búsqueda actual.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 rounded-2xl border border-line bg-white">
                {loading ? (
                    <div className="py-12 text-center text-secondary">Cargando catálogos...</div>
                ) : (
                    selectedSection.key === 'suppliers' ? (
                        <SupplierReferenceSectionCard
                            section={selectedSection}
                            values={data.suppliers}
                            saving={saving}
                            focused={focusKey === selectedSection.key}
                            onChangeValues={updateSuppliers}
                        />
                    ) : selectedSection.key === 'brands' ? (
                        <BrandReferenceSectionCard
                            section={selectedSection}
                            values={data.brands}
                            saving={saving}
                            focused={focusKey === selectedSection.key}
                            onChangeValues={updateBrands}
                        />
                    ) : (
                        <ProductReferenceSectionCard
                            section={selectedSection}
                            values={(data[selectedSection.key] || []) as string[]}
                            saving={saving}
                            focused={focusKey === selectedSection.key}
                            onChangeValues={(nextValues) => updateSectionValues(selectedSection.key, nextValues)}
                        />
                    )
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                    <p className="text-xs text-secondary">
                        Los cambios quedan disponibles en el editor de productos después de guardar este módulo.
                    </p>
                    <button className="button-main py-2.5 px-6 disabled:opacity-60" onClick={onSave} disabled={saving || loading}>
                        {saving ? 'Guardando...' : 'Guardar catálogos'}
                    </button>
                </div>
                </div>
            </div>
        </div>
    )
})
