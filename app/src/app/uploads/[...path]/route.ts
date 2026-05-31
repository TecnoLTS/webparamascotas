import { createReadStream, promises as fs } from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const uploadsRoot = path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'uploads')

const resolveUploadPath = (segments: string[]) => {
  const decodedSegments = segments.map((segment) => decodeURIComponent(segment))
  const resolvedPath = path.resolve(/* turbopackIgnore: true */ uploadsRoot, ...decodedSegments)
  const relativePath = path.relative(uploadsRoot, resolvedPath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  return resolvedPath
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: requestedPath } = await params
  const filePath = resolveUploadPath(requestedPath || [])

  if (!filePath) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const stat = await fs.stat(/* turbopackIgnore: true */ filePath)
    if (!stat.isFile()) {
      return new NextResponse('Not found', { status: 404 })
    }

    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    if (contentType === 'application/octet-stream') {
      return new NextResponse('Not found', { status: 404 })
    }

    const body = Readable.toWeb(createReadStream(/* turbopackIgnore: true */ filePath)) as ReadableStream<Uint8Array>

    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(stat.size),
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
