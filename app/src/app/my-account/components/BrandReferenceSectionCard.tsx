'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import { requestApi } from '@/lib/apiClient'
import {
    createEmptyProductBrandReference,
    createProductBrandReferenceId,
    getBrandSearchText,
    normalizeProductBrandRecord,
    type ProductBrandReference,
    type ProductReferenceSection,
} from '@/lib/productReferenceData'

type BrandReferenceSectionCardProps = {
    section: ProductReferenceSection;
    values: ProductBrandReference[];
    saving?: boolean;
    focused?: boolean;
    onChangeValues: (nextValues: ProductBrandReference[]) => void;
}

type UploadLogoResponse = {
    url: string;
    width?: number;
    height?: number;
    kind: string;
}

const normalizeComparable = (value?: string | null) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('es-EC')

const uploadBrandLogo = async (file: File, brandName: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', 'brandLogo')
    formData.append('brandName', brandName)

    const url =
        typeof window !== 'undefined'
            ? `${window.location.origin}/api/uploads/images`
            : '/api/uploads/images'

    const res = await requestApi<UploadLogoResponse>(url, {
        method: 'POST',
        body: formData,
        timeoutMs: 60000,
    })

    return res.body
}

const pageSize = 8

export default React.memo(function BrandReferenceSectionCard({
    section,
    values,
    saving = false,
    focused = false,
    onChangeValues,
}: BrandReferenceSectionCardProps) {
    const ItemIcon = Icon[section.menuIcon]
    const fileInputRef = React.useRef<HTMLInputElement | null>(null)
    const [searchValue, setSearchValue] = React.useState('')
    const [formState, setFormState] = React.useState<ProductBrandReference>(createEmptyProductBrandReference())
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [errorMessage, setErrorMessage] = React.useState('')
    const [logoUploading, setLogoUploading] = React.useState(false)
    const [page, setPage] = React.useState(1)

    const normalizedSearch = React.useMemo(() => normalizeComparable(searchValue), [searchValue])
    const sortedValues = React.useMemo(
        () => [...values].sort((left, right) => left.name.localeCompare(right.name, 'es-EC', { sensitivity: 'base' })),
        [values]
    )
    const filteredValues = React.useMemo(() => {
        if (!normalizedSearch) return sortedValues
        return sortedValues.filter((brand) => normalizeComparable(getBrandSearchText(brand)).includes(normalizedSearch))
    }, [normalizedSearch, sortedValues])
    const totalPages = Math.max(1, Math.ceil(filteredValues.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const paginatedValues = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredValues.slice(start, start + pageSize)
    }, [currentPage, filteredValues])
    const brandWithSameName = React.useMemo(() => {
        const name = normalizeComparable(formState.name)
        if (!name) return null
        return values.find((brand) => brand.id !== editingId && normalizeComparable(brand.name) === name) || null
    }, [editingId, formState.name, values])

    const resetForm = React.useCallback(() => {
        setFormState(createEmptyProductBrandReference())
        setEditingId(null)
        setErrorMessage('')
    }, [])

    const validateForm = React.useCallback(() => {
        const name = String(formState.name || '').replace(/\s+/g, ' ').trim()
        if (!name || name.length < 2) {
            return 'La marca debe tener al menos 2 caracteres.'
        }
        if (brandWithSameName) {
            return `Ya existe una marca registrada como "${brandWithSameName.name}".`
        }
        return ''
    }, [brandWithSameName, formState.name])

    const saveBrand = React.useCallback(() => {
        const validationError = validateForm()
        if (validationError) {
            setErrorMessage(validationError)
            return
        }

        const normalizedBrand = normalizeProductBrandRecord({
            ...formState,
            id: editingId || formState.id || createProductBrandReferenceId(formState.name),
        })

        if (!normalizedBrand) {
            setErrorMessage('No se pudo normalizar la marca.')
            return
        }

        const nextValues = editingId
            ? values.map((brand) => (brand.id === editingId ? normalizedBrand : brand))
            : [...values, normalizedBrand]

        onChangeValues(nextValues)
        resetForm()
    }, [editingId, formState, onChangeValues, resetForm, validateForm, values])

    const removeBrand = React.useCallback((brandId: string) => {
        onChangeValues(values.filter((brand) => brand.id !== brandId))
        if (editingId === brandId) {
            resetForm()
        }
    }, [editingId, onChangeValues, resetForm, values])

    const startEdit = React.useCallback((brand: ProductBrandReference) => {
        setFormState(brand)
        setEditingId(brand.id)
        setErrorMessage('')
    }, [])

    const handleLogoFileChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        const brandName = String(formState.name || '').replace(/\s+/g, ' ').trim()
        if (!brandName) {
            setErrorMessage('Escribe el nombre de la marca antes de subir el logo.')
            return
        }

        setLogoUploading(true)
        setErrorMessage('')
        try {
            const uploaded = await uploadBrandLogo(file, brandName)
            setFormState((prev) => ({ ...prev, logoUrl: uploaded.url }))
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo subir el logo.'
            setErrorMessage(message)
        } finally {
            setLogoUploading(false)
        }
    }, [formState.name])

    React.useEffect(() => {
        setPage(1)
    }, [searchValue])

    React.useEffect(() => {
        if (currentPage !== page) {
            setPage(currentPage)
        }
    }, [currentPage, page])

    return (
        <div className={`rounded-2xl border p-5 transition-all shadow-sm ${
            focused
                ? 'border-primary bg-white ring-2 ring-primary/15 shadow-md'
                : 'border-line bg-white'
        }`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ItemIcon size={22} />
                    </div>
                    <div>
                        <div className="text-lg font-semibold leading-tight">{section.title}</div>
                        <p className="text-secondary text-xs mt-1 max-w-2xl">{section.description}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 rounded-xl bg-surface text-xs">
                        <div className="uppercase font-bold text-secondary">Registros</div>
                        <div className="text-lg font-bold mt-1">{values.length}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-surface text-xs">
                        <div className="uppercase font-bold text-secondary">Con logo</div>
                        <div className="text-lg font-bold mt-1">{values.filter((brand) => brand.logoUrl).length}</div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-surface text-xs">
                        <div className="uppercase font-bold text-secondary">Visibles</div>
                        <div className="text-lg font-bold mt-1">{filteredValues.length}</div>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 2xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-5">
                <div className="rounded-2xl border border-line bg-surface/50 p-4 h-fit">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">{editingId ? 'Editar marca' : 'Registrar marca'}</div>
                            <p className="text-secondary text-xs mt-1">
                                El logo se usa en la sección pública de marcas de la tienda.
                            </p>
                        </div>
                        {editingId && (
                            <button
                                type="button"
                                className="w-9 h-9 rounded-lg border border-line bg-white hover:border-black transition-all flex items-center justify-center disabled:opacity-60"
                                onClick={resetForm}
                                disabled={saving || logoUploading}
                                aria-label="Cancelar edición"
                            >
                                <Icon.X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-secondary text-[11px] uppercase font-bold mb-2 block">Nombre de marca</label>
                            <input
                                className="border border-line rounded-xl px-4 py-3 w-full outline-none transition-all focus:border-black bg-white"
                                value={formState.name}
                                placeholder={section.placeholder}
                                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                disabled={saving || logoUploading}
                            />
                        </div>
                        <div>
                            <label className="text-secondary text-[11px] uppercase font-bold mb-2 block">URL del logo</label>
                            <input
                                className="border border-line rounded-xl px-4 py-3 w-full outline-none transition-all focus:border-black bg-white"
                                value={formState.logoUrl}
                                placeholder="/uploads/brands/logo.webp"
                                onChange={(event) => setFormState((prev) => ({ ...prev, logoUrl: event.target.value }))}
                                disabled={saving || logoUploading}
                            />
                        </div>
                        <div className="rounded-xl border border-line bg-white p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-24 h-16 rounded-lg border border-line bg-surface flex items-center justify-center overflow-hidden shrink-0">
                                    {formState.logoUrl ? (
                                        <img src={formState.logoUrl} alt={`Logo ${formState.name || 'marca'}`} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Icon.ImageSquare size={24} className="text-secondary" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{formState.logoUrl ? 'Logo cargado' : 'Sin logo seleccionado'}</div>
                                    <p className="text-secondary text-xs mt-1">JPEG, PNG o WebP hasta 8MB.</p>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleLogoFileChange}
                                disabled={saving || logoUploading}
                            />
                            <button
                                type="button"
                                className="mt-3 w-full px-4 py-3 rounded-xl border border-line bg-white font-semibold hover:border-black transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={saving || logoUploading}
                            >
                                <Icon.UploadSimple size={17} />
                                {logoUploading ? 'Subiendo...' : 'Subir logo'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 min-h-[20px]">
                        {errorMessage ? (
                            <p className="text-xs text-red">{errorMessage}</p>
                        ) : brandWithSameName ? (
                            <p className="text-xs text-orange-700">Ya existe una coincidencia exacta: {brandWithSameName.name}</p>
                        ) : (
                            <p className="text-xs text-secondary">Puedes guardar la marca sin logo y agregarlo después.</p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="mt-4 w-full px-4 py-3.5 rounded-xl bg-black text-white font-semibold hover:bg-primary transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        onClick={saveBrand}
                        disabled={saving || logoUploading || !formState.name.trim() || Boolean(brandWithSameName)}
                    >
                        <Icon.Check size={17} />
                        {editingId ? 'Guardar marca' : 'Agregar marca'}
                    </button>
                </div>

                <div>
                    <div className="rounded-2xl border border-line bg-surface/50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div className="w-full md:max-w-sm">
                                <label className="text-secondary text-[11px] uppercase font-bold mb-2 block">
                                    Buscar marca
                                </label>
                                <div className="relative">
                                    <Icon.MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                                    <input
                                        className="border border-line rounded-xl pl-10 pr-4 py-3 w-full outline-none transition-all focus:border-black bg-white"
                                        value={searchValue}
                                        placeholder="Buscar marca registrada"
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        disabled={saving || logoUploading}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-secondary">
                                Mostrando {paginatedValues.length} de {filteredValues.length} resultados
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-line overflow-hidden">
                        <div className="grid grid-cols-[84px_minmax(0,1fr)_110px] sm:grid-cols-[100px_minmax(0,1fr)_132px] bg-surface/70 px-4 py-3 text-[11px] uppercase font-bold text-secondary tracking-wide">
                            <div>Logo</div>
                            <div>Marca</div>
                            <div className="text-right">Acciones</div>
                        </div>
                        <div className="divide-y divide-line max-h-[520px] overflow-y-auto">
                            {filteredValues.length > 0 ? paginatedValues.map((brand) => (
                                <div key={`${section.key}-${brand.id || brand.name}`} className="grid grid-cols-[84px_minmax(0,1fr)_110px] sm:grid-cols-[100px_minmax(0,1fr)_132px] items-center gap-3 px-4 py-3 bg-white">
                                    <div className="w-16 h-12 rounded-lg border border-line bg-surface flex items-center justify-center overflow-hidden">
                                        {brand.logoUrl ? (
                                            <img src={brand.logoUrl} alt={`Logo ${brand.name}`} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Icon.ImageSquare size={20} className="text-secondary" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-sm break-words">{brand.name}</div>
                                        <div className="text-xs text-secondary mt-1 truncate">{brand.logoUrl || 'Sin logo'}</div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 shrink-0">
                                        <button
                                            type="button"
                                            className="w-9 h-9 rounded-lg border border-line bg-white hover:border-black transition-all flex items-center justify-center disabled:opacity-60"
                                            onClick={() => startEdit(brand)}
                                            disabled={saving || logoUploading}
                                            aria-label={`Editar ${brand.name}`}
                                        >
                                            <Icon.PencilSimple size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="w-9 h-9 rounded-lg border border-line bg-white hover:border-red-500 hover:text-red-600 transition-all flex items-center justify-center disabled:opacity-60"
                                            onClick={() => removeBrand(brand.id)}
                                            disabled={saving || logoUploading}
                                            aria-label={`Eliminar ${brand.name}`}
                                        >
                                            <Icon.Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-4 py-8 text-sm text-secondary bg-white">
                                    {values.length === 0
                                        ? 'Aún no hay marcas registradas.'
                                        : 'No hay coincidencias con la búsqueda actual.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="text-xs text-secondary">
                                Página {currentPage} de {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border border-line text-sm font-semibold disabled:opacity-50"
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage <= 1}
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border border-line text-sm font-semibold disabled:opacity-50"
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage >= totalPages}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})
