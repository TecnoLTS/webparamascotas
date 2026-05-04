import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { resolveRequestProto, resolveTenantHost } from '@/lib/requestHost'
import { attachInternalProxyToken } from '@/lib/internalProxy'

type UploadImageKind = 'thumb' | 'gallery' | 'brandLogo'

const allowedKinds = new Set<UploadImageKind>(['thumb', 'gallery', 'brandLogo'])
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const outputImageExtension = 'webp'
const productUploadVariantWidths = [220, 360]
const maxUploadBytes = 8 * 1024 * 1024
const backendBase = (process.env.BACKEND_URL_INTERNAL || 'http://paramascotasec-backend-web/api').replace(/\/$/, '')
const seoFilenameMaxLength = 140

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
  const rawSegments = kind === 'brandLogo'
    ? [
      metadata.platform,
      metadata.brandName,
      'logo-marca',
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

const buildVariantFileName = (fileName: string, width: number) =>
  fileName.replace(/\.webp$/i, `-${width}.webp`)

const isUploadImageKind = (value: unknown): value is UploadImageKind =>
  typeof value === 'string' && allowedKinds.has(value as UploadImageKind)

const resolvePublicDir = async () => {
  const candidates = [
    process.env.UPLOADS_PUBLIC_DIR,
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), '..', 'public'),
    path.join(process.cwd(), '..', '..', 'public'),
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

const validateAdminRequest = async (req: Request) => {
  const authorization = req.headers.get('authorization')
  const cookieHeader = req.headers.get('cookie')
  if (!authorization && !cookieHeader) {
    return NextResponse.json(
      { ok: false, error: { message: 'No autorizado para subir imágenes.' } },
      { status: 401 }
    )
  }

  const headers = new Headers()
  if (authorization) {
    headers.set('authorization', authorization)
  }
  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }
  const host = resolveTenantHost(req.headers.get('x-forwarded-host') || req.headers.get('host'))
  const proto = resolveRequestProto(req.headers.get('x-forwarded-proto'), req.url)
  if (host) {
    headers.set('host', host)
    headers.set('x-forwarded-host', host)
  }
  headers.set('x-forwarded-proto', proto)
  attachInternalProxyToken(headers)

  try {
    const res = await fetch(`${backendBase}/admin/dashboard/stats`, {
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

export const handleProductImageUpload = async (req: Request) => {
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
      webpBuffer = kindValue === 'brandLogo'
        ? await image
          .resize({ width: 600, height: 240, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 90, effort: 5 })
          .toBuffer()
        : await image
          .webp({ quality: 82, effort: 5 })
          .toBuffer()
    } catch {
      return NextResponse.json({ ok: false, error: { message: 'No se pudo convertir la imagen a WebP.' } }, { status: 400 })
    }

    const publicDir = await resolvePublicDir()
    const uploadDir = path.join(publicDir, 'uploads', kindValue === 'brandLogo' ? 'brands' : 'products')
    await fs.mkdir(uploadDir, { recursive: true })
    const fileName = buildSeoImageFileName(metadata, kindValue, outputImageExtension)
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, webpBuffer)
    if (kindValue !== 'brandLogo') {
      await Promise.all(productUploadVariantWidths.map(async (width) => {
        const variantPath = path.join(uploadDir, buildVariantFileName(fileName, width))
        await sharp(webpBuffer)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 78, effort: 5 })
          .toFile(variantPath)
      }))
    }

    const outputMetadata = await sharp(webpBuffer).metadata()

    return NextResponse.json({
      ok: true,
      data: {
        url: `/uploads/${kindValue === 'brandLogo' ? 'brands' : 'products'}/${fileName}`,
        fileName,
        kind: kindValue,
        width: outputMetadata.width,
        height: outputMetadata.height,
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: { message: 'No se pudo subir la imagen.' } }, { status: 500 })
  }
}
