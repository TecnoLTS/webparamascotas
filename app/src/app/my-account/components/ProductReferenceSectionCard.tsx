'use client'

import React from 'react'
import * as Icon from "@phosphor-icons/react/dist/ssr"

import { apiEndpoints } from '@/lib/api/endpoints'
import { requestApi } from '@/lib/apiClient'
import { toPublicApiUrl } from '@/lib/publicApiPath'
import type {
    ProductCategoryImageReference,
    ProductReferenceSection,
} from '@/lib/productReferenceData'
import { matchesProductSearch, normalizeProductSearch } from '@/lib/productSearch'

type CategoryImageRequirement = {
    key: 'topImageUrl' | 'mobilePrimary' | 'mobileSecondary' | 'desktopPrimary' | 'desktopSecondary';
    kind: 'categoryTop' | 'categoryFeaturedMobilePrimary' | 'categoryFeaturedMobileSecondary' | 'categoryFeaturedDesktopPrimary' | 'categoryFeaturedDesktopSecondary';
    section: 'top' | 'featured';
    label: string;
    dimensions: string;
    previewAspectClass: string;
    helper: string;
}

const categoryImageRequirements: CategoryImageRequirement[] = [
    { key: 'topImageUrl', kind: 'categoryTop', section: 'top', label: 'Superior 4:5', dimensions: '1200 x 1500 px', previewAspectClass: 'aspect-[4/5]', helper: 'Genera o recorta en vertical 4:5. Mantén el producto centrado y deja margen superior e inferior.' },
    { key: 'mobilePrimary', kind: 'categoryFeaturedMobilePrimary', section: 'featured', label: 'Inferior móvil grande', dimensions: '1176 x 736 px', previewAspectClass: 'aspect-[16/10]', helper: 'Genera o recorta en horizontal 16:10 para el slot destacado 1 en móvil.' },
    { key: 'mobileSecondary', kind: 'categoryFeaturedMobileSecondary', section: 'featured', label: 'Inferior móvil pequeña', dimensions: '588 x 588 px', previewAspectClass: 'aspect-square', helper: 'Genera o recorta en cuadrado 1:1 para los slots destacados 2 y 3 en móvil.' },
    { key: 'desktopPrimary', kind: 'categoryFeaturedDesktopPrimary', section: 'featured', label: 'Inferior desktop grande', dimensions: '1260 x 1240 px', previewAspectClass: 'aspect-[630/620]', helper: 'Genera o recorta casi cuadrada para el slot grande izquierdo. Deja aire alrededor del sujeto principal.' },
    { key: 'desktopSecondary', kind: 'categoryFeaturedDesktopSecondary', section: 'featured', label: 'Inferior desktop horizontal', dimensions: '1260 x 590 px', previewAspectClass: 'aspect-[630/295]', helper: 'Genera una imagen horizontal nueva. No reutilices una vertical o cuadrada: se recortará. Mantén cara, cuerpo/producto y texto visual dentro del 70% central.' },
]

const topCategoryImageRequirements = categoryImageRequirements.filter((requirement) => requirement.section === 'top')
const featuredCategoryImageRequirements = categoryImageRequirements.filter((requirement) => requirement.section === 'featured')

type CategoryImageFiles = Partial<Record<CategoryImageRequirement['key'], File>>
type CategoryImageUrlMap = Record<CategoryImageRequirement['key'], string>

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
    normalizeProductSearch(String(value || ''))

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
        return visibleValues.filter((value) => matchesProductSearch(normalizeComparable(value), normalizedSearch))
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

    const getCategoryTopVisibility = React.useCallback((categoryName: string) => {
        const reference = getCategoryImageReference(categoryName)
        return reference?.showInTopSection ?? reference?.showInImageSection ?? true
    }, [getCategoryImageReference])

    const getCategoryFeaturedVisibility = React.useCallback((categoryName: string) => {
        const reference = getCategoryImageReference(categoryName)
        return reference?.showInFeaturedSection ?? reference?.showInImageSection ?? true
    }, [getCategoryImageReference])

    const updateCategoryVisibility = React.useCallback((
        categoryName: string,
        key: 'showInTopSection' | 'showInFeaturedSection',
        checked: boolean,
    ) => {
        const existingReference = getCategoryImageReference(categoryName)
        const currentTop = existingReference?.showInTopSection ?? existingReference?.showInImageSection ?? true
        const currentFeatured = existingReference?.showInFeaturedSection ?? existingReference?.showInImageSection ?? true
        const nextTop = key === 'showInTopSection' ? checked : currentTop
        const nextFeatured = key === 'showInFeaturedSection' ? checked : currentFeatured

        const nextReference = {
            name: existingReference?.name ?? categoryName,
            topImageUrl: existingReference?.topImageUrl ?? '',
            featuredImages: {
                mobilePrimary: existingReference?.featuredImages?.mobilePrimary ?? '',
                mobileSecondary: existingReference?.featuredImages?.mobileSecondary ?? '',
                desktopPrimary: existingReference?.featuredImages?.desktopPrimary ?? '',
                desktopSecondary: existingReference?.featuredImages?.desktopSecondary ?? '',
            },
            showInTopSection: nextTop,
            showInFeaturedSection: nextFeatured,
            showInImageSection: nextTop || nextFeatured,
        }

        const nextImages = existingReference
            ? categoryImages.map((item) => (
                normalizeComparable(item.name) === normalizeComparable(existingReference.name)
                    ? nextReference
                    : item
            ))
            : [...categoryImages, nextReference]

        emitCategoryChange(values, nextImages)
    }, [categoryImages, emitCategoryChange, getCategoryImageReference, values])

    const selectedCategoryImageReference = React.useMemo(
        () => selectedImageCategory ? getCategoryImageReference(selectedImageCategory) : undefined,
        [getCategoryImageReference, selectedImageCategory]
    )

    const topVisibleCategoryCount = React.useMemo(
        () => visibleValues.filter((value) => getCategoryTopVisibility(value)).length,
        [getCategoryTopVisibility, visibleValues]
    )

    const featuredVisibleCategories = React.useMemo(
        () => visibleValues.filter((value) => getCategoryFeaturedVisibility(value)),
        [getCategoryFeaturedVisibility, visibleValues]
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
                showInTopSection: currentReference?.showInTopSection ?? currentReference?.showInImageSection ?? true,
                showInFeaturedSection: currentReference?.showInFeaturedSection ?? currentReference?.showInImageSection ?? true,
                showInImageSection: (
                    currentReference?.showInTopSection
                    ?? currentReference?.showInImageSection
                    ?? true
                ) || (
                    currentReference?.showInFeaturedSection
                    ?? currentReference?.showInImageSection
                    ?? true
                ),
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

        const response = await requestApi<{ url: string }>(toPublicApiUrl(apiEndpoints.uploads.images), {
            method: 'POST',
            body: formData,
            timeoutMs: 60000,
        })
        return response.body.url
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
                        showInTopSection: true,
                        showInFeaturedSection: true,
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

            {isCategorySection && (
                <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <div className="text-sm font-semibold">Control de categorías en portada</div>
                            <p className="mt-1 max-w-3xl text-xs text-secondary">
                                La sección superior muestra todas las categorías marcadas como “Home superior”. El bloque destacado muestra solo las primeras 3 marcadas como “Destacada”, siguiendo el orden de esta lista.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
                            <div className="rounded-xl border border-line bg-white px-3 py-2">
                                <div className="text-[10px] uppercase font-bold text-secondary">Home superior</div>
                                <div className="mt-1 text-lg font-bold">{topVisibleCategoryCount}</div>
                            </div>
                            <div className="rounded-xl border border-line bg-white px-3 py-2">
                                <div className="text-[10px] uppercase font-bold text-secondary">Destacadas</div>
                                <div className="mt-1 text-lg font-bold">{Math.min(featuredVisibleCategories.length, 3)}/3</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {featuredVisibleCategories.slice(0, 3).map((category, index) => (
                            <div key={`featured-slot-${category}`} className="rounded-xl border border-line bg-white p-3">
                                <div className="text-[10px] uppercase font-bold text-secondary">
                                    Slot {index + 1}
                                </div>
                                <div className="mt-1 text-sm font-semibold">{category}</div>
                                <div className="mt-1 text-xs text-secondary">
                                    {index === 0 ? 'Tarjeta grande izquierda' : `Tarjeta derecha ${index}`}
                                </div>
                            </div>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - featuredVisibleCategories.length) }).map((_, index) => (
                            <div key={`featured-empty-slot-${index}`} className="rounded-xl border border-dashed border-orange-300 bg-white/70 p-3">
                                <div className="text-[10px] uppercase font-bold text-orange-700">
                                    Slot pendiente
                                </div>
                                <div className="mt-1 text-xs text-secondary">
                                    Marca una categoría como destacada para completar el bloque inferior.
                                </div>
                            </div>
                        ))}
                    </div>

                    {featuredVisibleCategories.length > 3 && (
                        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                            Hay {featuredVisibleCategories.length} categorías marcadas como destacadas; la portada usa solo las primeras 3. Usa las flechas para ordenar o desmarca las que no deben aparecer en el bloque inferior.
                        </div>
                    )}
                </div>
            )}

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

                    <div className="mt-4 rounded-2xl border border-line overflow-x-auto">
                        <div className={`grid ${isCategorySection
                            ? 'min-w-[680px] grid-cols-[minmax(0,1fr)_104px_104px_110px_118px]'
                            : 'grid-cols-[minmax(0,1fr)_110px] sm:grid-cols-[minmax(0,1fr)_132px]'
                            } bg-surface/70 px-4 py-3 text-[11px] uppercase font-bold text-secondary tracking-wide`}>
                            <div>{section.title}</div>
                            {isCategorySection && <div className="text-center">Home superior</div>}
                            {isCategorySection && <div className="text-center">Destacada</div>}
                            {isCategorySection && <div className="text-center">Imágenes</div>}
                            <div className="text-right">Acciones</div>
                        </div>

                        <div className="divide-y divide-line max-h-[460px] overflow-y-auto">
                            {filteredValues.length > 0 ? paginatedValues.map((value) => {
                                const isEditing = editingValue === value
                                const imageReference = isCategorySection ? getCategoryImageReference(value) : undefined
                                const topImageUrl = imageReference?.topImageUrl || ''
                                const showInTopSection = isCategorySection ? getCategoryTopVisibility(value) : false
                                const showInFeaturedSection = isCategorySection ? getCategoryFeaturedVisibility(value) : false
                                const completeImageCount = isCategorySection
                                    ? categoryImageRequirements.filter((requirement) => getCategoryReferenceImage(imageReference, requirement)).length
                                    : 0

                                return (
                                    <div
                                        key={`${section.key}-${value}`}
                                        className={`grid ${isCategorySection
                                            ? 'min-w-[680px] grid-cols-[minmax(0,1fr)_104px_104px_110px_118px]'
                                            : 'grid-cols-[minmax(0,1fr)_110px] sm:grid-cols-[minmax(0,1fr)_132px]'
                                            } items-center gap-3 px-4 py-3 bg-white`}
                                    >
                                        {isEditing ? (
                                            <div className={`${isCategorySection ? 'col-span-5' : 'col-span-2'} flex flex-col lg:flex-row gap-2`}>
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
                                                </div>

                                                {isCategorySection && (
                                                    <label className="flex items-center justify-center gap-2 text-[11px] font-semibold text-secondary cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-black"
                                                            checked={showInTopSection}
                                                            onChange={(event) => updateCategoryVisibility(value, 'showInTopSection', event.target.checked)}
                                                            disabled={saving || uploadingCategoryImages}
                                                        />
                                                        Ver
                                                    </label>
                                                )}

                                                {isCategorySection && (
                                                    <label className="flex items-center justify-center gap-2 text-[11px] font-semibold text-secondary cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-black"
                                                            checked={showInFeaturedSection}
                                                            onChange={(event) => updateCategoryVisibility(value, 'showInFeaturedSection', event.target.checked)}
                                                            disabled={saving || uploadingCategoryImages}
                                                        />
                                                        Ver
                                                    </label>
                                                )}

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
                                    Cargas de portada
                                </div>

                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${newCategoryCompleteCount === categoryImageRequirements.length
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-orange-50 text-orange-700'
                                    }`}>
                                    {newCategoryCompleteCount}/{categoryImageRequirements.length}
                                </span>
                            </div>

                            <p className="mt-2 text-xs text-secondary">
                                Carga la imagen superior y las variantes del bloque inferior. Cada preview usa la proporción real donde se verá en la home.
                            </p>

                            <div className="mt-3 space-y-4">
                                {[
                                    {
                                        title: 'Categoría superior',
                                        description: 'Una imagen vertical para el carril de categorías bajo el banner principal.',
                                        requirements: topCategoryImageRequirements,
                                    },
                                    {
                                        title: 'Categoría inferior destacada',
                                        description: 'Cuatro variantes para el bloque grande de 3 categorías. Las tarjetas derechas de desktop necesitan una imagen horizontal real; si partes de una foto vertical, genera una versión nueva con fondo extendido.',
                                        requirements: featuredCategoryImageRequirements,
                                    },
                                ].map((group) => (
                                    <div key={group.title} className="rounded-xl border border-line bg-white p-3">
                                        <div className="mb-3">
                                            <div className="text-[11px] font-bold uppercase text-black">{group.title}</div>
                                            <div className="mt-1 text-[11px] leading-relaxed text-secondary">{group.description}</div>
                                        </div>

                                        <div className="space-y-3">
                                            {group.requirements.map((requirement) => {
                                                const selectedFile = categoryImageFiles[requirement.key]
                                                const hasImage = Boolean(selectedFile)

                                                return (
                                                    <label
                                                        key={`${fileInputResetKey}-${requirement.kind}`}
                                                        className={`block rounded-xl border p-3 transition-all cursor-pointer ${hasImage ? 'border-green-100 bg-green-50/30' : 'border-line bg-surface/40'
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
                                                                className={`mt-3 w-full rounded-lg object-cover border border-line bg-white ${requirement.previewAspectClass}`}
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
                                ))}
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

                        <div className="overflow-y-auto p-6 space-y-6">
                            {[
                                {
                                    title: 'Categoría superior',
                                    description: 'Esta imagen aparece en el carril superior de categorías. La preview es vertical 4:5.',
                                    requirements: topCategoryImageRequirements,
                                    gridClass: 'grid-cols-1 md:grid-cols-[minmax(0,360px)]',
                                },
                                {
                                    title: 'Categorías inferiores destacadas',
                                    description: 'Estas imágenes aparecen en el bloque inferior de 3 categorías. Para la imagen horizontal de desktop, usa un lienzo 1260 x 590 con el sujeto completo dentro del centro; una foto vertical se recorta.',
                                    requirements: featuredCategoryImageRequirements,
                                    gridClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
                                },
                            ].map((group) => (
                                <section key={group.title} className="rounded-2xl border border-line bg-surface/40 p-4">
                                    <div className="mb-4">
                                        <div className="text-sm font-semibold">{group.title}</div>
                                        <p className="mt-1 text-xs text-secondary">{group.description}</p>
                                    </div>

                                    <div className={`grid gap-4 ${group.gridClass}`}>
                                        {group.requirements.map((requirement) => {
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
                                                            {requirement.key === 'desktopSecondary' && (
                                                                <div className="mt-2 rounded-lg bg-orange-50 px-2 py-1.5 text-[11px] font-semibold leading-relaxed text-orange-800">
                                                                    Para evitar recortes, genera esta imagen directamente en horizontal 1260 x 590.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${hasImage
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {hasImage ? 'Lista' : 'Falta'}
                                                        </span>
                                                    </div>

                                                    <div className={`rounded-xl border border-line bg-surface overflow-hidden ${requirement.previewAspectClass}`}>
                                                        {hasImage ? (
                                                            <FilePreviewImage
                                                                file={selectedFile}
                                                                fallbackUrl={currentUrl}
                                                                alt={`Preview ${requirement.label}`}
                                                                className="h-full w-full object-cover bg-white"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full min-h-[9rem] flex-col items-center justify-center text-center px-4">
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
                                </section>
                            ))}
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
