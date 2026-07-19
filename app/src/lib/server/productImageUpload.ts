import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { toInternalBackendUrl } from '@/lib/api/backendBase'
import { apiEndpoints } from '@/lib/api/endpoints'
import { resolveRequestProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'
import {
  forwardUploadAuthenticationHeaders,
  validateDashboardUploadSecurity,
} from '@/lib/server/uploadAuthSurface.mjs'

type UploadImageKind =
  | 'thumb'
  | 'gallery'
  | 'brandLogo'
  | 'categoryTop'
  | 'categoryFeaturedMobilePrimary'
  | 'categoryFeaturedMobileSecondary'
  | 'categoryFeaturedDesktopPrimary'
  | 'categoryFeaturedDesktopSecondary'

const allowedKinds = new Set<UploadImageKind>([
  'thumb',
  'gallery',
  'brandLogo',
  'categoryTop',
  'categoryFeaturedMobilePrimary',
  'categoryFeaturedMobileSecondary',
  'categoryFeaturedDesktopPrimary',
  'categoryFeaturedDesktopSecondary',
])
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const outputImageExtension = 'webp'
const productUploadVariantWidths = [220, 360]
const categoryImageSpecs: Partial<Record<UploadImageKind, { width: number; height: number; label: string }>> = {
  categoryTop: { width: 1200, height: 1500, label: 'categoria-home-4x5' },
  categoryFeaturedMobilePrimary: { width: 1176, height: 736, label: 'banner2-movil-16x10' },
  categoryFeaturedMobileSecondary: { width: 588, height: 588, label: 'banner2-movil-1x1' },
  categoryFeaturedDesktopPrimary: { width: 1260, height: 1240, label: 'banner2-desktop-630x620' },
  categoryFeaturedDesktopSecondary: { width: 1260, height: 590, label: 'banner2-desktop-630x295' },
}
const maxUploadBytes = 8 * 1024 * 1024
const maxProcessedBatchBytes = 16 * 1024 * 1024
const backendAdminStatsUrl = toInternalBackendUrl(apiEndpoints.adminDashboardStats())
const backendCatalogImageUploadUrl = toInternalBackendUrl(apiEndpoints.adminCatalogImageUpload)
const seoFilenameMaxLength = 140

type ProductImageUploadMode = 'local' | 'backend-object-storage'

type ProcessedImageArtifact = {
  field: 'image' | 'variant220' | 'variant360'
  fileName: string
  buffer: Buffer
}

type BackendCatalogImageResponse = {
  ok?: boolean
  data?: {
    url?: string
    fileName?: string
    variants?: Record<string, string>
  }
  error?: {
    message?: string
    code?: string
  }
}

type UploadImageMetadata = {
  platform?: string
  brandName?: string
  productName?: string
  category?: string
  productType?: string
  size?: string
  color?: string
  species?: string
  material?: string
  variantLabel?: string
}

const hasJpegSignature = (buffer: Buffer) =>
  buffer.length >= 3
  && buffer[0] === 0xff
  && buffer[1] === 0xd8
  && buffer[2] === 0xff

const hasPngSignature = (buffer: Buffer) =>
  buffer.length >= 8
  && buffer[0] === 0x89
  && buffer[1] === 0x50
  && buffer[2] === 0x4e
  && buffer[3] === 0x47
  && buffer[4] === 0x0d
  && buffer[5] === 0x0a
  && buffer[6] === 0x1a
  && buffer[7] === 0x0a

const hasWebpSignature = (buffer: Buffer) =>
  buffer.length >= 12
  && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
  && buffer.subarray(8, 12).toString('ascii') === 'WEBP'

const matchesDeclaredImageType = (buffer: Buffer, mimeType: string) => {
  if (mimeType === 'image/jpeg') return hasJpegSignature(buffer)
  if (mimeType === 'image/png') return hasPngSignature(buffer)
  if (mimeType === 'image/webp') return hasWebpSignature(buffer)
  return false
}

const slugifySeoSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const clipSlug = (value: string, maxLength = 28) => value.slice(0, maxLength).replace(/-+$/g, '')

const extractPlatformSlug = (host: string | null) => {
  if (!host) return 'paramascotas'
  const normalized = host.split(':')[0].trim().toLowerCase()
  if (!normalized) return 'paramascotas'
  if (normalized === 'localhost' || normalized === '127.0.0.1') return 'paramascotas'

  const noWww = normalized.replace(/^www\./, '')
  const preferred = noWww.split('.')[0] || noWww
  return slugifySeoSegment(preferred) || 'paramascotas'
}

const parseImageMetadata = (formData: FormData, reqHost: string | null): UploadImageMetadata => ({
  platform: typeof formData.get('platform') === 'string' ? String(formData.get('platform') || '') : extractPlatformSlug(reqHost),
  brandName: typeof formData.get('brandName') === 'string' ? String(formData.get('brandName') || '') : '',
  productName: typeof formData.get('productName') === 'string' ? String(formData.get('productName') || '') : '',
  category: typeof formData.get('category') === 'string' ? String(formData.get('category') || '') : '',
  productType: typeof formData.get('productType') === 'string' ? String(formData.get('productType') || '') : '',
  size: typeof formData.get('size') === 'string' ? String(formData.get('size') || '') : '',
  color: typeof formData.get('color') === 'string' ? String(formData.get('color') || '') : '',
  species: typeof formData.get('species') === 'string' ? String(formData.get('species') || '') : '',
  material: typeof formData.get('material') === 'string' ? String(formData.get('material') || '') : '',
  variantLabel: typeof formData.get('variantLabel') === 'string' ? String(formData.get('variantLabel') || '') : '',
})

const buildSeoImageFileName = (
  metadata: UploadImageMetadata,
  kind: UploadImageKind,
  ext: string
) => {
  const categorySpec = categoryImageSpecs[kind]
  const rawSegments = kind === 'brandLogo'
    ? [
      metadata.platform,
      metadata.brandName,
      'logo-marca',
    ]
    : categorySpec
      ? [
        metadata.platform,
        metadata.category,
        categorySpec.label,
      ]
    : [
      metadata.platform,
      metadata.productName,
      metadata.productType,
      metadata.category,
      metadata.variantLabel,
      metadata.size,
      metadata.color,
      metadata.material,
      metadata.species,
      kind === 'thumb' ? 'miniatura' : 'ficha',
    ]

  const orderedSegments = rawSegments
    .map((segment) => clipSlug(slugifySeoSegment(String(segment || ''))))
    .filter(Boolean)

  const dedupedSegments = orderedSegments.filter((segment, index) => orderedSegments.indexOf(segment) === index)
  const readableBase = dedupedSegments.join('-') || `paramascotas-${kind}`
  const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 10)
  const datedSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const maxBaseLength = seoFilenameMaxLength - (`-${datedSuffix}-${uniqueSuffix}.${ext}`).length
  const clippedBase = clipSlug(readableBase, Math.max(32, maxBaseLength))

  return `${clippedBase}-${datedSuffix}-${uniqueSuffix}.${ext}`
}

const buildSeoImageAltText = (metadata: UploadImageMetadata, kind: UploadImageKind) => {
  if (kind === 'brandLogo') {
    const brand = String(metadata.brandName || '').trim()
    return brand ? `Logo oficial de ${brand} en ParaMascotasEC` : 'Logo de marca en ParaMascotasEC'
  }
  if (isCategoryImageKind(kind)) {
    const category = String(metadata.category || metadata.productType || '').trim()
    return category ? `${category} para mascotas en ParaMascotasEC` : 'Categoria de productos para mascotas en ParaMascotasEC'
  }

  const parts = [
    metadata.brandName,
    metadata.productName,
    metadata.variantLabel || metadata.size,
    metadata.color,
    metadata.material,
    metadata.category || metadata.productType,
    metadata.species,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
  const uniqueParts = parts.filter((part, index) => parts.indexOf(part) === index)
  const base = uniqueParts.join(' ')
  return base
    ? `${base} ${kind === 'thumb' ? 'miniatura' : 'imagen de ficha'} en ParaMascotasEC`
    : 'Producto para mascotas en ParaMascotasEC'
}

const buildVariantFileName = (fileName: string, width: number) =>
  fileName.replace(/\.webp$/i, `-${width}.webp`)

const isUploadImageKind = (value: unknown): value is UploadImageKind =>
  typeof value === 'string' && allowedKinds.has(value as UploadImageKind)

const isCategoryImageKind = (kind: UploadImageKind) => Boolean(categoryImageSpecs[kind])

const resolvePublicDir = async () => {
  const candidates = [
    process.env.UPLOADS_PUBLIC_DIR,
    path.join(process.cwd(), 'public'),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (stat.isDirectory()) return candidate
    } catch {}
  }

  const fallback = candidates[0] ?? path.join(process.cwd(), 'public')
  await fs.mkdir(fallback, { recursive: true })
  return fallback
}

const parseBooleanEnvironment = (name: string, fallback: boolean) => {
  const raw = (process.env[name] || '').trim().toLowerCase()
  if (!raw) return fallback
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'off'].includes(raw)) return false
  throw new Error(`${name} debe ser true o false.`)
}

const resolveProductImageUploadMode = (): ProductImageUploadMode => {
  const configuredEnvironment = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV
  if (!configuredEnvironment?.trim()) {
    throw new Error('APP_ENV es obligatorio para resolver el almacenamiento de imagenes.')
  }
  const appEnvironment = configuredEnvironment.trim().toLowerCase()
  const production = appEnvironment === 'production' || appEnvironment === 'prod'
  const requireHa = parseBooleanEnvironment('REQUIRE_HA', false)
  const configured = (process.env.PRODUCT_IMAGE_UPLOAD_MODE || '').trim().toLowerCase()
  const mode = (configured || (production || requireHa ? 'backend-object-storage' : 'local')) as ProductImageUploadMode

  if (mode !== 'local' && mode !== 'backend-object-storage') {
    throw new Error('PRODUCT_IMAGE_UPLOAD_MODE debe ser local o backend-object-storage.')
  }
  if ((production || requireHa) && mode !== 'backend-object-storage') {
    throw new Error('Produccion y REQUIRE_HA=true exigen PRODUCT_IMAGE_UPLOAD_MODE=backend-object-storage.')
  }
  if (mode === 'local' && appEnvironment !== 'qa') {
    throw new Error('PRODUCT_IMAGE_UPLOAD_MODE=local solo esta permitido en APP_ENV=qa.')
  }

  return mode
}

const buildBackendRequestHeaders = (req: Request) => {
  const headers = forwardUploadAuthenticationHeaders(req.headers)
  for (const name of [
    'origin',
    'referer',
    'sec-fetch-site',
    'user-agent',
    'x-request-id',
  ]) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }

  const host = resolveTenantHost(req.headers.get('x-forwarded-host') || req.headers.get('host'))
  const proto = resolveRequestProto(req.headers.get('x-forwarded-proto'), req.url)
  if (host) {
    headers.set('host', host)
    headers.set('x-forwarded-host', host)
  }
  headers.set('x-forwarded-proto', proto)
  attachInternalProxyToken(headers)

  return headers
}

const validateAdminRequest = async (req: Request) => {
  const authorization = req.headers.get('authorization')
  const cookieHeader = req.headers.get('cookie')
  if (!authorization && !cookieHeader) {
    return NextResponse.json(
      { ok: false, error: { message: 'No autorizado para subir imágenes.' } },
      { status: 401 }
    )
  }

  const headers = buildBackendRequestHeaders(req)

  try {
    const res = await fetch(backendAdminStatsUrl, {
      cache: 'no-store',
      headers,
    })

    if (res.ok) {
      return null
    }

    return NextResponse.json(
      { ok: false, error: { message: 'No autorizado para subir imágenes.' } },
      { status: res.status === 401 ? 401 : 403 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: 'No se pudo validar la sesión de administrador.' } },
      { status: 502 }
    )
  }
}

const persistProcessedImagesLocally = async (
  publicDir: string,
  uploadFolder: string,
  artifacts: ProcessedImageArtifact[],
) => {
  const uploadDir = path.join(/* turbopackIgnore: true */ publicDir, 'uploads', uploadFolder)
  await fs.mkdir(uploadDir, { recursive: true })

  const staged: Array<{ temporaryPath: string; finalPath: string }> = []
  const published: string[] = []
  try {
    for (const artifact of artifacts) {
      const finalPath = path.join(/* turbopackIgnore: true */ uploadDir, artifact.fileName)
      try {
        await fs.access(finalPath)
        throw new Error('El archivo generado ya existe.')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      const temporaryPath = path.join(
        /* turbopackIgnore: true */ uploadDir,
        `.${artifact.fileName}.${randomUUID()}.tmp`,
      )
      await fs.writeFile(temporaryPath, artifact.buffer, { flag: 'wx', mode: 0o644 })
      staged.push({ temporaryPath, finalPath })
    }

    for (const item of staged) {
      await fs.rename(item.temporaryPath, item.finalPath)
      published.push(item.finalPath)
    }
  } catch (error) {
    await Promise.allSettled([
      ...staged.map((item) => fs.rm(item.temporaryPath, { force: true })),
      ...published.map((publishedPath) => fs.rm(publishedPath, { force: true })),
    ])
    throw error
  }
}

const uploadProcessedImagesToBackend = async (
  req: Request,
  uploadFolder: string,
  mainFileName: string,
  artifacts: ProcessedImageArtifact[],
) => {
  const backendForm = new FormData()
  backendForm.set('folder', uploadFolder)
  backendForm.set('fileName', mainFileName)
  for (const artifact of artifacts) {
    backendForm.set(
      artifact.field,
      new Blob([new Uint8Array(artifact.buffer)], { type: 'image/webp' }),
      artifact.fileName,
    )
  }

  const configuredTimeout = Number(process.env.UPLOAD_BACKEND_TIMEOUT_MS || 30_000)
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.max(5_000, Math.min(120_000, Math.trunc(configuredTimeout)))
    : 30_000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(backendCatalogImageUploadUrl, {
      method: 'POST',
      headers: buildBackendRequestHeaders(req),
      body: backendForm,
      cache: 'no-store',
      signal: controller.signal,
    })
    const rawPayload = await response.text()
    let payload: BackendCatalogImageResponse
    try {
      payload = rawPayload ? JSON.parse(rawPayload) as BackendCatalogImageResponse : {}
    } catch {
      payload = {}
    }

    return { response, payload }
  } finally {
    clearTimeout(timeout)
  }
}

const isExpectedBackendPublicUrl = (candidate: string, fileName: string) => {
  const configuredBase = (process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || '').trim()
  if (!configuredBase) return false
  try {
    const base = new URL(configuredBase)
    const url = new URL(candidate)
    if (base.protocol !== 'https:'
      || base.username
      || base.password
      || base.search
      || base.hash
      || url.protocol !== 'https:'
      || url.origin !== base.origin
      || url.username
      || url.password
      || url.search
      || url.hash) return false

    const basePath = base.pathname.replace(/\/$/, '')
    const expectedPrefix = `${basePath}/tenants/`.replace(/^\/\//, '/')
    return url.pathname.startsWith(expectedPrefix)
      && url.pathname.endsWith(`/${encodeURIComponent(fileName)}`)
  } catch {
    return false
  }
}

export const handleProductImageUpload = async (req: Request) => {
  const requestSecurity = validateDashboardUploadSecurity(req.headers)
  if (!requestSecurity.ok) {
    return NextResponse.json(
      { ok: false, error: { code: 'UPLOAD_REQUEST_FORBIDDEN', message: 'Solicitud de carga no autorizada.' } },
      { status: requestSecurity.status },
    )
  }

  let uploadMode: ProductImageUploadMode
  try {
    uploadMode = resolveProductImageUploadMode()
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: 'La configuración de almacenamiento de imágenes no es válida.' } },
      { status: 503 },
    )
  }

  const authFailure = await validateAdminRequest(req)
  if (authFailure) {
    return authFailure
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const kind = formData.get('kind')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: { message: 'No se recibió ninguna imagen.' } }, { status: 400 })
    }

    const kindValue: UploadImageKind = isUploadImageKind(kind) ? kind : 'gallery'
    const metadata = parseImageMetadata(formData, req.headers.get('x-forwarded-host') || req.headers.get('host'))
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ ok: false, error: { message: 'Formato de imagen no permitido.' } }, { status: 400 })
    }

    if (file.size <= 0 || file.size > maxUploadBytes) {
      return NextResponse.json({ ok: false, error: { message: 'La imagen debe pesar entre 1 byte y 8MB.' } }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!matchesDeclaredImageType(buffer, file.type)) {
      return NextResponse.json({ ok: false, error: { message: 'El archivo no coincide con un formato de imagen permitido.' } }, { status: 400 })
    }

    let webpBuffer: Buffer
    try {
      const image = sharp(buffer, { failOn: 'warning' }).rotate()
      if (kindValue === 'brandLogo') {
        webpBuffer = await image
          .resize({ width: 1200, height: 480, fit: 'inside', withoutEnlargement: true })
          .webp({ lossless: true, effort: 6 })
          .toBuffer()
      } else if (isCategoryImageKind(kindValue)) {
        const spec = categoryImageSpecs[kindValue]
        if (!spec) throw new Error('Invalid category image kind')
        webpBuffer = await image
          .resize({ width: spec.width, height: spec.height, fit: 'cover', position: 'center' })
          .webp({ quality: 88, effort: 5 })
          .toBuffer()
      } else {
        webpBuffer = await image
          .webp({ quality: 82, effort: 5 })
          .toBuffer()
      }
    } catch {
      return NextResponse.json({ ok: false, error: { message: 'No se pudo convertir la imagen a WebP.' } }, { status: 400 })
    }

    const uploadFolder = kindValue === 'brandLogo' ? 'brands' : isCategoryImageKind(kindValue) ? 'categories' : 'products'
    const fileName = buildSeoImageFileName(metadata, kindValue, outputImageExtension)
    const artifacts: ProcessedImageArtifact[] = [{
      field: 'image',
      fileName,
      buffer: webpBuffer,
    }]
    if (kindValue === 'thumb' || kindValue === 'gallery') {
      const variants = await Promise.all(productUploadVariantWidths.map(async (width) => ({
        field: `variant${width}` as 'variant220' | 'variant360',
        fileName: buildVariantFileName(fileName, width),
        buffer: await sharp(webpBuffer)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 78, effort: 5 })
          .toBuffer(),
      })))
      artifacts.push(...variants)
    }
    const processedBytes = artifacts.reduce((total, artifact) => total + artifact.buffer.length, 0)
    if (artifacts.some((artifact) => artifact.buffer.length <= 0 || artifact.buffer.length > maxUploadBytes)
      || processedBytes > maxProcessedBatchBytes) {
      return NextResponse.json(
        { ok: false, error: { message: 'Las imágenes WebP procesadas superan el tamaño permitido.' } },
        { status: 400 },
      )
    }

    const outputMetadata = await sharp(webpBuffer).metadata()
    let publicUrl = `/uploads/${uploadFolder}/${fileName}`
    if (uploadMode === 'local') {
      const publicDir = await resolvePublicDir()
      await persistProcessedImagesLocally(publicDir, uploadFolder, artifacts)
    } else {
      let backendResult: Awaited<ReturnType<typeof uploadProcessedImagesToBackend>>
      try {
        backendResult = await uploadProcessedImagesToBackend(req, uploadFolder, fileName, artifacts)
      } catch {
        return NextResponse.json(
          { ok: false, error: { message: 'No se pudo conectar con el almacenamiento de imágenes.' } },
          { status: 502 },
        )
      }
      const { response, payload } = backendResult
      if (!response.ok) {
        return NextResponse.json(
          payload.error
            ? { ok: false, error: payload.error }
            : { ok: false, error: { message: 'El backend rechazó la imagen procesada.' } },
          { status: response.status },
        )
      }
      const backendUrl = typeof payload.data?.url === 'string' ? payload.data.url.trim() : ''
      const backendFileName = typeof payload.data?.fileName === 'string' ? payload.data.fileName.trim() : ''
      if (!isExpectedBackendPublicUrl(backendUrl, fileName) || backendFileName !== fileName) {
        return NextResponse.json(
          { ok: false, error: { message: 'El backend devolvió una referencia de imagen inválida.' } },
          { status: 502 },
        )
      }
      publicUrl = backendUrl
    }

    return NextResponse.json({
      ok: true,
      data: {
        url: publicUrl,
        fileName,
        kind: kindValue,
        width: outputMetadata.width,
        height: outputMetadata.height,
        altText: buildSeoImageAltText(metadata, kindValue),
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: { message: 'No se pudo subir la imagen.' } }, { status: 500 })
  }
}
