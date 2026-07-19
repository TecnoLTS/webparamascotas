import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const appDir = path.resolve(process.cwd())
const uploadProductsDir = path.join(appDir, 'public', 'uploads', 'products')
const variantWidths = [220, 360]
const variantPattern = /-(?:220|360)\.webp$/i
const variantRecipeEpochMs = Date.parse('2026-07-16T12:00:00Z')
const generationConcurrency = 4

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const walk = async (directory) => {
  if (!(await pathExists(directory))) return []

  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolutePath)
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.webp')) return []
    if (variantPattern.test(entry.name)) return []
    return [absolutePath]
  }))

  return nested.flat()
}

const variantPathFor = (filePath, width) => filePath.replace(/\.webp$/i, `-${width}.webp`)

const isCurrentVariant = async (sourcePath, outputPath) => {
  try {
    const [sourceStat, outputStat] = await Promise.all([
      fs.stat(sourcePath),
      fs.stat(outputPath),
    ])
    return outputStat.isFile()
      && outputStat.size > 0
      && outputStat.mtimeMs >= sourceStat.mtimeMs
      && outputStat.mtimeMs >= variantRecipeEpochMs
  } catch {
    return false
  }
}

const generateVariant = async (filePath, width) => {
  const outputPath = variantPathFor(filePath, width)
  await sharp(filePath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(outputPath)
  return outputPath
}

const main = async () => {
  const files = await walk(uploadProductsDir)
  const pending = []
  let reused = 0

  for (const filePath of files) {
    for (const width of variantWidths) {
      const outputPath = variantPathFor(filePath, width)
      if (await isCurrentVariant(filePath, outputPath)) {
        reused += 1
      } else {
        pending.push({ filePath, width })
      }
    }
  }

  let cursor = 0
  const workers = Array.from(
    { length: Math.min(generationConcurrency, pending.length) },
    async () => {
      while (cursor < pending.length) {
        const job = pending[cursor]
        cursor += 1
        await generateVariant(job.filePath, job.width)
      }
    },
  )
  await Promise.all(workers)

  process.stdout.write(
    `Upload image variants ready: generated ${pending.length}, reused ${reused}, sources ${files.length}.\n`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
