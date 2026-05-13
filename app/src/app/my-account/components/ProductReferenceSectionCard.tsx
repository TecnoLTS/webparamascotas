'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import type {
    ProductCategoryImageReference,
    ProductReferenceSection,
} from '@/lib/productReferenceData'

type CategoryImageRequirement = {
    key: 'topImageUrl' | 'mobilePrimary' | 'mobileSecondary' | 'desktopPrimary' | 'desktopSecondary';
    kind: 'categoryTop' | 'categoryFeaturedMobilePrimary' | 'categoryFeaturedMobileSecondary' | 'categoryFeaturedDesktopPrimary' | 'categoryFeaturedDesktopSecondary';
    label: string;
    dimensions: string;
    helper: string;
}

const categoryImageRequirements: CategoryImageRequirement[] = [
    { key: 'topImageUrl', kind: 'categoryTop', label: 'Tarjeta superior', dimensions: '1200 x 1500 px', helper: 'Proporción 4:5 para el carril principal de categorías.' },
    { key: 'mobilePrimary', kind: 'categoryFeaturedMobilePrimary', label: 'Banner2 móvil principal', dimensions: '1176 x 736 px', helper: 'Proporción 16:10 para el primer bloque móvil.' },
    { key: 'mobileSecondary', kind: 'categoryFeaturedMobileSecondary', label: 'Banner2 móvil secundaria', dimensions: '588 x 588 px', helper: 'Proporción 1:1 para bloques secundarios móviles.' },
    { key: 'desktopPrimary', kind: 'categoryFeaturedDesktopPrimary', label: 'Banner2 desktop principal', dimensions: '1260 x 1240 px', helper: 'Proporción 630:620 para la tarjeta grande desktop.' },
    { key: 'desktopSecondary', kind: 'categoryFeaturedDesktopSecondary', label: 'Banner2 desktop secundaria', dimensions: '1260 x 590 px', helper: 'Proporción 630:295 para tarjetas horizontales desktop.' },
]

type CategoryImageFiles = Partial<Record<CategoryImageRequirement['key'], File>>
type CategoryImageUrlMap = Record<CategoryImageRequirement['key'], string>

type UploadResponse = {
    ok?: boolean;
    data?: {
        url?: string;
    };
    error?: {
        message?: string;
    };
}

type ProductReferenceSectionCardProps = {
    section: ProductReferenceSection;
    values: string[];
    categoryImages?: ProductCategoryImageReference[];
    saving?: boolean;
    focused?: boolean;
    onChangeValues: (nextValues: string[]) => void;
    onChangeCategoryValues?: (nextValues: string[], nextCategoryImages: ProductCategoryImageReference[]) => void;
}

const normalizeComparable = (value?: string | null) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('es-EC')

//const fixedVisualCategories = ['Todas', 'Ofertas'] as const

const getCategoryAliasKeys = (value: string) => {
    const normalized = normalizeComparable(value)
    if (normalized === 'todas' || normalized === 'todos') return ['todas', 'todos']
    if (normalized === 'ofertas' || normalized === 'descuentos') return ['ofertas', 'descuentos']
    return [normalized]
}

const isFixedVisualCategory = (_value: string) => false

const getCategoryReferenceImage = (
    reference: ProductCategoryImageReference | undefined,
    requirement: CategoryImageRequirement,
) => {
    if (!reference) return ''
    if (requirement.key === 'topImageUrl') return reference.topImageUrl
    return reference.featuredImages[requirement.key] || ''
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const uploadSlowly = async <T,>(task: () => Promise<T>): Promise<T> => {
    return await task()
}


const FilePreviewImage = ({
    file,
    fallbackUrl,
    alt,
    className,
}: {
    file?: File;
    fallbackUrl?: string;
    alt: string;
    className: string;
}) => {
    const [previewUrl, setPreviewUrl] = React.useState('')

    React.useEffect(() => {
        let cancelled = false

        if (!file) {
            setPreviewUrl('')
            return
        }

        const reader = new FileReader()

        reader.onload = () => {
            if (!cancelled) {
                setPreviewUrl(String(reader.result || ''))
            }
        }

        reader.onerror = () => {
            if (!cancelled) {
                setPreviewUrl('')
            }
        }

        reader.readAsDataURL(file)

        return () => {
            cancelled = true
        }
    }, [file])

    const src = previewUrl || fallbackUrl || ''

    if (!src) return null

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
        />
    )
}

export default React.memo(function ProductReferenceSectionCard({
    section,
    values,
    categoryImages = [],
    saving = false,
    focused = false,
    onChangeValues,
    onChangeCategoryValues,
}: ProductReferenceSectionCardProps) {
    const ItemIcon = Icon[section.menuIcon]
    const [draftValue, setDraftValue] = React.useState('')
    const [searchValue, setSearchValue] = React.useState('')
    const [errorMessage, setErrorMessage] = React.useState('')
    const [editingValue, setEditingValue] = React.useState<string | null>(null)
    const [editingDraft, setEditingDraft] = React.useState('')
    const [categoryImageFiles, setCategoryImageFiles] = React.useState<CategoryImageFiles>({})
    const [replacementImageFiles, setReplacementImageFiles] = React.useState<CategoryImageFiles>({})
    const [uploadingCategoryImages, setUploadingCategoryImages] = React.useState(false)
    const [selectedImageCategory, setSelectedImageCategory] = React.useState('')
    const [fileInputResetKey, setFileInputResetKey] = React.useState(0)
    const [replacementInputResetKey, setReplacementInputResetKey] = React.useState(0)
    const [page, setPage] = React.useState(1)
    const isCategorySection = section.key === 'categories'

    const normalizedDraft = React.useMemo(() => normalizeComparable(draftValue), [draftValue])
    const normalizedSearch = React.useMemo(() => normalizeComparable(searchValue), [searchValue])

    const sortedValues = React.useMemo(
        () => [...values],
        [values]
    )

    const visibleValues = React.useMemo(() => {
        const seen = new Set<string>()

        return sortedValues.filter((value) => {
            const key = normalizeComparable(value)
            if (!key || seen.has(key)) return false
            seen.add(key)
            return true
        })
    }, [sortedValues])

    const exactDraftMatch = React.useMemo(
        () => visibleValues.find((value) => normalizeComparable(value) === normalizedDraft) || '',
        [normalizedDraft, visibleValues]
    )

    const filteredValues = React.useMemo(() => {
        if (!normalizedSearch) return visibleValues
        return visibleValues.filter((value) => normalizeComparable(value).includes(normalizedSearch))
    }, [normalizedSearch, visibleValues])

    const pageSize = 8
    const totalPages = Math.max(1, Math.ceil(filteredValues.length / pageSize))
    const currentPage = Math.min(page, totalPages)

    const paginatedValues = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredValues.slice(start, start + pageSize)
    }, [currentPage, filteredValues])

    const emitCategoryChange = React.useCallback((
        nextValues: string[],
        nextCategoryImages: ProductCategoryImageReference[],
    ) => {
        if (onChangeCategoryValues) {
            onChangeCategoryValues(nextValues, nextCategoryImages)
            return
        }

        onChangeValues(nextValues)
    }, [onChangeCategoryValues, onChangeValues])

    const getCategoryImageReference = React.useCallback((categoryName: string) => {
        const aliases = getCategoryAliasKeys(categoryName)
        return categoryImages.find((item) => aliases.includes(normalizeComparable(item.name)))
    }, [categoryImages])

    const selectedCategoryImageReference = React.useMemo(
        () => selectedImageCategory ? getCategoryImageReference(selectedImageCategory) : undefined,
        [getCategoryImageReference, selectedImageCategory]
    )

    const selectedCategoryCompleteCount = React.useMemo(() => {
        if (!selectedImageCategory) return 0

        return categoryImageRequirements.filter((requirement) => (
            replacementImageFiles[requirement.key]
            || getCategoryReferenceImage(selectedCategoryImageReference, requirement)
        )).length
    }, [replacementImageFiles, selectedCategoryImageReference, selectedImageCategory])

    const newCategoryCompleteCount = React.useMemo(() => (
        categoryImageRequirements.filter((requirement) => categoryImageFiles[requirement.key]).length
    ), [categoryImageFiles])

    const upsertCategoryImageReference = React.useCallback((
        categoryName: string,
        images: CategoryImageUrlMap,
    ) => {
        const aliases = getCategoryAliasKeys(categoryName)

        const currentReference = categoryImages.find((item) =>
            aliases.includes(normalizeComparable(item.name))
        )

        const canonicalName = normalizeComparable(categoryName) === 'todos' ? 'Todas'
            : normalizeComparable(categoryName) === 'descuentos' ? 'Ofertas'
                : categoryName

        const nextImages = [
            ...categoryImages.filter((item) => !aliases.includes(normalizeComparable(item.name))),
            {
                name: canonicalName,
                topImageUrl: images.topImageUrl,
                featuredImages: {
                    mobilePrimary: images.mobilePrimary,
                    mobileSecondary: images.mobileSecondary,
                    desktopPrimary: images.desktopPrimary,
                    desktopSecondary: images.desktopSecondary,
                },
                showInImageSection: currentReference?.showInImageSection !== false,
            },
        ]

        emitCategoryChange(values, nextImages)
    }, [categoryImages, emitCategoryChange, values])

    const uploadCategoryImage = React.useCallback(async (
        file: File,
        requirement: CategoryImageRequirement,
        categoryName: string,
    ) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('kind', requirement.kind)
        formData.append('category', categoryName)
        formData.append('variantLabel', requirement.label)

        const response = await fetch('/api/uploads/images', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        })

        const payload = await response.json().catch(() => null) as UploadResponse | null

        if (!response.ok || !payload?.ok || !payload.data?.url) {
            if (response.status === 429) {
                throw new Error('429 Too Many Requests: el servidor bloqueó demasiadas subidas seguidas. Intenta nuevamente en unos segundos.')
            }

            throw new Error(payload?.error?.message || 'No se pudo subir una imagen de la categoría.')
        }

        return payload.data.url
    }, [])

    const addValue = React.useCallback(async () => {
        const nextValue = draftValue.replace(/\s+/g, ' ').trim()

        if (!nextValue) {
            setErrorMessage(`Escribe una ${section.itemLabel} antes de agregar.`)
            return
        }

        if (exactDraftMatch) {
            setErrorMessage(`La ${section.itemLabel} "${exactDraftMatch}" ya está registrada.`)
            return
        }

        if (isCategorySection) {
            const missingRequirement = categoryImageRequirements.find((requirement) => !categoryImageFiles[requirement.key])

            if (missingRequirement) {
                setErrorMessage(`Carga la imagen "${missingRequirement.label}" (${missingRequirement.dimensions}) antes de agregar la categoría.`)
                return
            }

            setUploadingCategoryImages(true)

            try {
                const uploadedEntries: Array<readonly [CategoryImageRequirement['key'], string]> = []

                for (const requirement of categoryImageRequirements) {
                    const file = categoryImageFiles[requirement.key]

                    if (!file) {
                        throw new Error(`Falta la imagen "${requirement.label}".`)
                    }

                    const url = await uploadSlowly(
                        () => uploadCategoryImage(file, requirement, nextValue),
                    )

                    uploadedEntries.push([requirement.key, url] as const)

                    // Pausa más larga para no activar el límite del servidor.
                    await wait(4000)
                }

                const uploaded = Object.fromEntries(uploadedEntries) as CategoryImageUrlMap

                const nextImages = [
                    ...categoryImages.filter((item) => normalizeComparable(item.name) !== normalizeComparable(nextValue)),
                    {
                        name: nextValue,
                        topImageUrl: uploaded.topImageUrl,
                        featuredImages: {
                            mobilePrimary: uploaded.mobilePrimary,
                            mobileSecondary: uploaded.mobileSecondary,
                            desktopPrimary: uploaded.desktopPrimary,
                            desktopSecondary: uploaded.desktopSecondary,
                        },
                        showInImageSection: true,
                    },
                ]

                emitCategoryChange([...values, nextValue], nextImages)
                setDraftValue('')
                setCategoryImageFiles({})
                setFileInputResetKey((prev) => prev + 1)
                setErrorMessage('')
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'No se pudieron subir las imágenes de la categoría.')
            } finally {
                setUploadingCategoryImages(false)
            }

            return
        }

        onChangeValues([...values, nextValue])
        setDraftValue('')
        setErrorMessage('')
    }, [
        categoryImageFiles,
        categoryImages,
        draftValue,
        emitCategoryChange,
        exactDraftMatch,
        isCategorySection,
        onChangeValues,
        section.itemLabel,
        uploadCategoryImage,
        values,
    ])

    const saveSelectedCategoryImages = React.useCallback(async () => {
        const categoryName = selectedImageCategory.replace(/\s+/g, ' ').trim()
        if (!categoryName) return

        const currentReference = getCategoryImageReference(categoryName)

        const missingRequirement = categoryImageRequirements.find((requirement) => (
            !replacementImageFiles[requirement.key]
            && !getCategoryReferenceImage(currentReference, requirement)
        ))

        if (missingRequirement) {
            setErrorMessage(`Carga la imagen "${missingRequirement.label}" (${missingRequirement.dimensions}) para completar la categoría.`)
            return
        }

        const hasNewFiles = categoryImageRequirements.some((requirement) => replacementImageFiles[requirement.key])

        if (!hasNewFiles) {
            setErrorMessage('Selecciona al menos una imagen nueva antes de guardar.')
            return
        }

        setUploadingCategoryImages(true)
        setErrorMessage('')

        try {
            const uploadedEntries: Array<readonly [CategoryImageRequirement['key'], string]> = []

            for (const requirement of categoryImageRequirements) {
                const file = replacementImageFiles[requirement.key]

                if (!file) {
                    uploadedEntries.push([
                        requirement.key,
                        getCategoryReferenceImage(currentReference, requirement),
                    ] as const)
                    continue
                }

                const url = await uploadSlowly(
                    () => uploadCategoryImage(file, requirement, categoryName),
                )

                uploadedEntries.push([requirement.key, url] as const)

                // Pausa más larga para no activar el límite del servidor.
                await wait(4000)
            }

            upsertCategoryImageReference(categoryName, Object.fromEntries(uploadedEntries) as CategoryImageUrlMap)

            setReplacementImageFiles({})
            setReplacementInputResetKey((prev) => prev + 1)
            setErrorMessage('')
            setSelectedImageCategory('')
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No se pudieron guardar las imágenes.'
            )
        } finally {
            setUploadingCategoryImages(false)
        }
    }, [
        getCategoryImageReference,
        replacementImageFiles,
        selectedImageCategory,
        uploadCategoryImage,
        upsertCategoryImageReference,
    ])

    const removeValue = React.useCallback((value: string) => {
        if (isCategorySection && isFixedVisualCategory(value)) {
            setErrorMessage(`${value} es una categoría del sistema; solo puedes cambiar sus imágenes.`)
            return
        }

        const nextValues = values.filter((item) => item !== value)

        if (isCategorySection) {
            emitCategoryChange(
                nextValues,
                categoryImages.filter((item) => normalizeComparable(item.name) !== normalizeComparable(value)),
            )
        } else {
            onChangeValues(nextValues)
        }

        if (editingValue === value) {
            setEditingValue(null)
            setEditingDraft('')
        }
    }, [categoryImages, editingValue, emitCategoryChange, isCategorySection, onChangeValues, values])

    const startEdit = React.useCallback((value: string) => {
        if (isCategorySection && isFixedVisualCategory(value)) {
            setErrorMessage(`${value} es una categoría del sistema; solo puedes cambiar sus imágenes.`)
            return
        }

        setEditingValue(value)
        setEditingDraft(value)
        setErrorMessage('')
    }, [isCategorySection])

    const saveEdit = React.useCallback(() => {
        if (!editingValue) return

        const nextValue = editingDraft.replace(/\s+/g, ' ').trim()

        if (!nextValue) {
            setErrorMessage(`La ${section.itemLabel} no puede quedar vacía.`)
            return
        }

        const duplicate = values.some((value) => value !== editingValue && normalizeComparable(value) === normalizeComparable(nextValue))

        if (duplicate) {
            setErrorMessage(`La ${section.itemLabel} "${nextValue}" ya existe.`)
            return
        }

        const nextValues = values.map((value) => (value === editingValue ? nextValue : value))

        if (isCategorySection) {
            emitCategoryChange(
                nextValues,
                categoryImages.map((item) => (
                    normalizeComparable(item.name) === normalizeComparable(editingValue)
                        ? { ...item, name: nextValue }
                        : item
                )),
            )
        } else {
            onChangeValues(nextValues)
        }

        setEditingValue(null)
        setEditingDraft('')
        setErrorMessage('')
    }, [categoryImages, editingDraft, editingValue, emitCategoryChange, isCategorySection, onChangeValues, section.itemLabel, values])

    React.useEffect(() => {
        if (!draftValue && !editingDraft) {
            setErrorMessage('')
        }
    }, [draftValue, editingDraft])

    React.useEffect(() => {
        setPage(1)
        setCategoryImageFiles({})
        setReplacementImageFiles({})
        setSelectedImageCategory('')
        setFileInputResetKey((prev) => prev + 1)
        setReplacementInputResetKey((prev) => prev + 1)
    }, [searchValue, section.key])

    React.useEffect(() => {
        if (currentPage !== page) {
            setPage(currentPage)
        }
    }, [currentPage, page])

    const moveValue = React.useCallback((value: string, direction: 'up' | 'down') => {
        const currentIndex = values.findIndex((item) => normalizeComparable(item) === normalizeComparable(value))

        if (currentIndex < 0) return

        const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

        if (nextIndex < 0 || nextIndex >= values.length) return

        const nextValues = [...values]
        const [removed] = nextValues.splice(currentIndex, 1)
        nextValues.splice(nextIndex, 0, removed)

        if (isCategorySection) {
            emitCategoryChange(nextValues, categoryImages)
        } else {
            onChangeValues(nextValues)
        }

        setErrorMessage('')
    }, [
        categoryImages,
        emitCategoryChange,
        isCategorySection,
        onChangeValues,
        values,
    ])

    const canMoveValueUp = React.useCallback((value: string) => {
        return values.findIndex((item) => normalizeComparable(item) === normalizeComparable(value)) > 0
    }, [values])

    const canMoveValueDown = React.useCallback((value: string) => {
        const index = values.findIndex((item) => normalizeComparable(item) === normalizeComparable(value))
        return index >= 0 && index < values.length - 1
    }, [values])

    return (
        <div className={`rounded-2xl border p-5 transition-all shadow-sm ${focused
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
                        <p className="text-secondary text-xs mt-1 max-w-xl">{section.description}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1 rounded-full bg-surface text-xs font-bold text-secondary shrink-0">
                        {visibleValues.length} opciones
                    </div>
                    <div className="px-3 py-1 rounded-full bg-surface text-xs font-bold text-secondary shrink-0">
                        {filteredValues.length} visibles
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div>
                    <div className="rounded-2xl border border-line bg-surface/50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div className="w-full md:max-w-sm">
                                <label className="text-secondary text-[11px] uppercase font-bold mb-2 block">
                                    Buscar {section.itemLabel}
                                </label>

                                <div className="relative">
                                    <Icon.MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                                    <input
                                        className="border border-line rounded-xl pl-10 pr-4 py-3 w-full outline-none transition-all focus:border-black bg-white"
                                        value={searchValue}
                                        placeholder={`Buscar ${section.itemLabel} registrada`}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div className="text-xs text-secondary">
                                Mostrando {paginatedValues.length} de {filteredValues.length} resultados
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-line overflow-hidden">
                        <div className={`grid ${isCategorySection
                            ? 'grid-cols-[minmax(0,1fr)_108px_118px] sm:grid-cols-[minmax(0,1fr)_130px_145px]'
                            : 'grid-cols-[minmax(0,1fr)_110px] sm:grid-cols-[minmax(0,1fr)_132px]'
                            } bg-surface/70 px-4 py-3 text-[11px] uppercase font-bold text-secondary tracking-wide`}>
                            <div>{section.title}</div>
                            {isCategorySection && <div className="text-center">Imagen</div>}
                            <div className="text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-line max-h-[460px] overflow-y-auto">
                            {filteredValues.length > 0 ? paginatedValues.map((value) => {
                                const isEditing = editingValue === value
                                const imageReference = isCategorySection ? getCategoryImageReference(value) : undefined
                                const topImageUrl = imageReference?.topImageUrl || ''
                                const completeImageCount = isCategorySection
                                    ? categoryImageRequirements.filter((requirement) => getCategoryReferenceImage(imageReference, requirement)).length
                                    : 0

                                return (
                                    <div
                                        key={`${section.key}-${value}`}
                                        className={`grid ${isCategorySection
                                            ? 'grid-cols-[minmax(0,1fr)_108px_118px] sm:grid-cols-[minmax(0,1fr)_130px_145px]'
                                            : 'grid-cols-[minmax(0,1fr)_110px] sm:grid-cols-[minmax(0,1fr)_132px]'
                                            } items-center gap-3 px-4 py-3 bg-white`}
                                    >
                                        {isEditing ? (
                                            <div className={`${isCategorySection ? 'col-span-3' : 'col-span-2'} flex flex-col lg:flex-row gap-2`}>
                                                <input
                                                    className="border border-line rounded-xl px-3 py-2.5 w-full outline-none transition-all focus:border-black"
                                                    value={editingDraft}
                                                    onChange={(event) => setEditingDraft(event.target.value)}
                                                    disabled={saving}
                                                />

                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        className="px-3 py-2.5 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-60"
                                                        onClick={saveEdit}
                                                        disabled={saving}
                                                    >
                                                        Guardar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="px-3 py-2.5 rounded-xl border border-line text-sm font-semibold disabled:opacity-60"
                                                        onClick={() => {
                                                            setEditingValue(null)
                                                            setEditingDraft('')
                                                            setErrorMessage('')
                                                        }}
                                                        disabled={saving}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-sm break-words">{value}</div>

                                                    {isCategorySection && (
                                                        <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-secondary cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="accent-black"
                                                                checked={imageReference?.showInImageSection !== false}
                                                                onChange={(event) => {
                                                                    const checked = event.target.checked
                                                                    const existingReference = getCategoryImageReference(value)

                                                                    const nextImages = existingReference
                                                                        ? categoryImages.map((item) => (
                                                                            normalizeComparable(item.name) === normalizeComparable(existingReference.name)
                                                                                ? { ...item, showInImageSection: checked }
                                                                                : item
                                                                        ))
                                                                        : [
                                                                            ...categoryImages,
                                                                            {
                                                                                name: value,
                                                                                topImageUrl: '',
                                                                                featuredImages: {
                                                                                    mobilePrimary: '',
                                                                                    mobileSecondary: '',
                                                                                    desktopPrimary: '',
                                                                                    desktopSecondary: '',
                                                                                },
                                                                                showInImageSection: checked,
                                                                            },
                                                                        ]

                                                                    emitCategoryChange(values, nextImages)
                                                                }}
                                                                disabled={saving || uploadingCategoryImages}
                                                            />
                                                            Mostrar en sección de imágenes
                                                        </label>
                                                    )}
                                                </div>

                                                {isCategorySection && (
                                                    <button
                                                        type="button"
                                                        className={`h-14 rounded-xl border transition-all overflow-hidden flex items-center justify-center ${completeImageCount === categoryImageRequirements.length
                                                            ? 'border-line bg-white'
                                                            : 'border-dashed border-orange-300 bg-orange-50 text-orange-700'
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedImageCategory(value)
                                                            setReplacementImageFiles({})
                                                            setReplacementInputResetKey((prev) => prev + 1)
                                                            setErrorMessage('')
                                                        }}
                                                        disabled={saving || uploadingCategoryImages}
                                                        aria-label={`Cambiar imágenes de ${value}`}
                                                    >
                                                        {topImageUrl ? (
                                                            <div className="relative h-full w-full">
                                                                <img src={topImageUrl} alt="" className="h-full w-full object-cover" />
                                                                <span className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${completeImageCount === categoryImageRequirements.length
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-orange-600 text-white'
                                                                    }`}>
                                                                    {completeImageCount}/5
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-bold">{completeImageCount}/5</span>
                                                        )}
                                                    </button>
                                                )}
                                                <div className="flex items-center justify-end gap-1 shrink-0">
                                                    {isCategorySection && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="w-9 h-9 rounded-lg border border-line bg-white hover:border-black transition-all flex items-center justify-center disabled:opacity-40"
                                                                onClick={() => moveValue(value, 'up')}
                                                                disabled={saving || uploadingCategoryImages || !canMoveValueUp(value)}
                                                                aria-label={`Subir ${value}`}
                                                                title="Subir categoría"
                                                            >
                                                                <Icon.CaretUp size={16} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="w-9 h-9 rounded-lg border border-line bg-white hover:border-black transition-all flex items-center justify-center disabled:opacity-40"
                                                                onClick={() => moveValue(value, 'down')}
                                                                disabled={saving || uploadingCategoryImages || !canMoveValueDown(value)}
                                                                aria-label={`Bajar ${value}`}
                                                                title="Bajar categoría"
                                                            >
                                                                <Icon.CaretDown size={16} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {isCategorySection && (
                                                        <button
                                                            type="button"
                                                            className="w-9 h-9 rounded-lg border border-line bg-white hover:border-black transition-all flex items-center justify-center disabled:opacity-60"
                                                            onClick={() => {
                                                                setSelectedImageCategory(value)
                                                                setReplacementImageFiles({})
                                                                setReplacementInputResetKey((prev) => prev + 1)
                                                                setErrorMessage('')
                                                            }}
                                                            disabled={saving || uploadingCategoryImages}
                                                            aria-label={`Imágenes de ${value}`}
                                                        >
                                                            <Icon.ImageSquare size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            }) : (
                                <div className="px-4 py-8 text-sm text-secondary bg-white">
                                    {visibleValues.length === 0
                                        ? `Aún no hay ${section.itemLabel}s registradas.`
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

                <div className="rounded-2xl border border-line bg-surface/50 p-4 h-fit">
                    <div className="text-sm font-semibold">Registrar nueva {section.itemLabel}</div>
                    <p className="text-secondary text-xs mt-1">
                        Verifica primero si ya existe usando la búsqueda del catálogo.
                    </p>

                    {isCategorySection && (
                        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-bold uppercase text-primary">
                                    Imágenes requeridas
                                </div>

                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${newCategoryCompleteCount === categoryImageRequirements.length
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-orange-50 text-orange-700'
                                    }`}>
                                    {newCategoryCompleteCount}/{categoryImageRequirements.length}
                                </span>
                            </div>

                            <p className="mt-2 text-xs text-secondary">
                                Carga las 5 imágenes antes de agregar la categoría. Se mostrarán previews para revisar cada archivo.
                            </p>

                            <div className="mt-3 space-y-3">
                                {categoryImageRequirements.map((requirement) => {
                                    const selectedFile = categoryImageFiles[requirement.key]
                                    const hasImage = Boolean(selectedFile)

                                    return (
                                        <label
                                            key={`${fileInputResetKey}-${requirement.kind}`}
                                            className={`block rounded-xl border p-3 bg-white transition-all cursor-pointer ${hasImage ? 'border-green-100' : 'border-line'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="block text-[11px] font-bold uppercase text-black">
                                                        {requirement.label}
                                                    </span>
                                                    <span className="mt-1 block text-[11px] text-secondary">
                                                        {requirement.dimensions}. {requirement.helper}
                                                    </span>
                                                </div>

                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${hasImage ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                                    }`}>
                                                    {hasImage ? 'Lista' : 'Falta'}
                                                </span>
                                            </div>

                                            {selectedFile && (
                                                <FilePreviewImage
                                                    file={selectedFile}
                                                    alt={`Preview ${requirement.label}`}
                                                    className="mt-3 h-24 w-full rounded-lg object-cover border border-line bg-white"
                                                />
                                            )}

                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="mt-3 block w-full text-xs text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0]

                                                    setCategoryImageFiles((prev) => {
                                                        const next = { ...prev }

                                                        if (file) {
                                                            next[requirement.key] = file
                                                        } else {
                                                            delete next[requirement.key]
                                                        }

                                                        return next
                                                    })
                                                }}
                                                disabled={saving || uploadingCategoryImages}
                                            />
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="text-secondary text-[11px] uppercase font-bold mb-2 block">
                            Nueva {section.itemLabel}
                        </label>

                        <input
                            className={`border rounded-xl px-4 py-3.5 w-full outline-none transition-all bg-white ${errorMessage ? 'border-red focus:border-red' : 'border-line focus:border-black'
                                }`}
                            value={draftValue}
                            placeholder={section.placeholder}
                            onChange={(event) => setDraftValue(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault()
                                    addValue()
                                }
                            }}
                            disabled={saving || uploadingCategoryImages}
                        />
                    </div>

                    <div className="mt-3 min-h-[20px]">
                        {errorMessage ? (
                            <p className="text-xs text-red">{errorMessage}</p>
                        ) : exactDraftMatch ? (
                            <p className="text-xs text-orange-700">Ya existe una coincidencia exacta: {exactDraftMatch}</p>
                        ) : (
                            <p className="text-xs text-secondary">No se agregan duplicados exactos, incluso si cambian mayúsculas o espacios.</p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="mt-4 w-full px-4 py-3.5 rounded-xl bg-black text-white font-semibold hover:bg-primary transition-all disabled:opacity-60"
                        onClick={addValue}
                        disabled={saving || uploadingCategoryImages || !draftValue.trim() || Boolean(exactDraftMatch)}
                    >
                        {uploadingCategoryImages ? 'Subiendo imágenes...' : 'Agregar'}
                    </button>
                </div>
            </div>

            {isCategorySection && selectedImageCategory && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 px-4 py-6">
                    <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-[28px] bg-white shadow-2xl border border-line flex flex-col">
                        <div className="px-6 py-5 border-b border-line flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="text-xl font-bold leading-tight">
                                    Imágenes de {selectedImageCategory}
                                </div>

                                <p className="text-sm text-secondary mt-1">
                                    Carga o reemplaza las imágenes de esta categoría. Revisa las previews antes de guardar.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-2 rounded-xl text-sm font-bold ${selectedCategoryCompleteCount === categoryImageRequirements.length
                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                    : 'bg-orange-50 text-orange-700 border border-orange-100'
                                    }`}>
                                    {selectedCategoryCompleteCount}/{categoryImageRequirements.length} imágenes listas
                                </div>

                                <button
                                    type="button"
                                    className="w-10 h-10 rounded-xl border border-line flex items-center justify-center hover:bg-surface disabled:opacity-60"
                                    onClick={() => {
                                        setSelectedImageCategory('')
                                        setReplacementImageFiles({})
                                        setReplacementInputResetKey((prev) => prev + 1)
                                    }}
                                    disabled={saving || uploadingCategoryImages}
                                    aria-label="Cerrar editor de imágenes"
                                >
                                    <Icon.X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {categoryImageRequirements.map((requirement) => {
                                    const currentUrl = getCategoryReferenceImage(selectedCategoryImageReference, requirement)
                                    const selectedFile = replacementImageFiles[requirement.key]
                                    const hasImage = Boolean(selectedFile || currentUrl)

                                    return (
                                        <label
                                            key={`${replacementInputResetKey}-${selectedImageCategory}-${requirement.kind}`}
                                            className={`rounded-2xl border p-4 bg-white transition-all cursor-pointer ${hasImage
                                                ? 'border-line hover:border-black'
                                                : 'border-dashed border-orange-300 bg-orange-50/40'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div>
                                                    <div className="text-[11px] font-bold uppercase text-black">
                                                        {requirement.label}
                                                    </div>

                                                    <div className="text-xs text-secondary mt-1">
                                                        {requirement.dimensions}
                                                    </div>
                                                </div>

                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${hasImage
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {hasImage ? 'Lista' : 'Falta'}
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-line bg-surface overflow-hidden">
                                                {hasImage ? (
                                                    <FilePreviewImage
                                                        file={selectedFile}
                                                        fallbackUrl={currentUrl}
                                                        alt={`Preview ${requirement.label}`}
                                                        className="w-full h-48 object-cover bg-white"
                                                    />
                                                ) : (
                                                    <div className="h-48 flex flex-col items-center justify-center text-center px-4">
                                                        <Icon.ImageSquare size={34} className="text-orange-700" />
                                                        <div className="mt-2 text-xs font-semibold text-orange-800">
                                                            Sin imagen cargada
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-secondary">
                                                            {requirement.helper}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3">
                                                <div className="text-[11px] text-secondary leading-relaxed min-h-[34px]">
                                                    {selectedFile
                                                        ? `Archivo seleccionado: ${selectedFile.name}`
                                                        : currentUrl
                                                            ? 'Imagen actual cargada. Puedes reemplazarla si deseas.'
                                                            : requirement.helper}
                                                </div>

                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className="mt-3 block w-full text-xs text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0]

                                                        setReplacementImageFiles((prev) => {
                                                            const next = { ...prev }

                                                            if (file) {
                                                                next[requirement.key] = file
                                                            } else {
                                                                delete next[requirement.key]
                                                            }

                                                            return next
                                                        })
                                                    }}
                                                    disabled={saving || uploadingCategoryImages}
                                                />
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="px-6 py-5 border-t border-line bg-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-secondary">
                                Los cambios se guardan en esta categoría. Luego puedes presionar “Guardar catálogos” en el panel principal.
                            </p>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="px-5 py-3 rounded-xl border border-line bg-white font-semibold hover:bg-surface disabled:opacity-60"
                                    onClick={() => {
                                        setSelectedImageCategory('')
                                        setReplacementImageFiles({})
                                        setReplacementInputResetKey((prev) => prev + 1)
                                    }}
                                    disabled={saving || uploadingCategoryImages}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="px-5 py-3 rounded-xl bg-black text-white font-semibold hover:bg-primary transition-all disabled:opacity-60"
                                    onClick={saveSelectedCategoryImages}
                                    disabled={saving || uploadingCategoryImages}
                                >
                                    {uploadingCategoryImages ? 'Guardando imágenes...' : 'Guardar imágenes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
})