import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const appDir = path.resolve(process.cwd())
const publicDir = path.join(appDir, 'public')

const categoryImages = [
  'accesorios-para-mascotas-4x5.webp',
  'alimento-para-mascotas-4x5.webp',
  'catalogo-completo-para-mascotas-4x5.webp',
  'ofertas-para-mascotas-4x5.webp',
  'ropa-para-mascotas-4x5.webp',
  'salud-para-mascotas-4x5.webp',
]

const sliderImages = [
  'slade1-mobile-xs.webp',
  'slade1-mobile.webp',
  'slade1-mobile-wide.webp',
  'slade1-tablet.webp',
  'slade1-laptop.webp',
  'slade1-desktop.webp',
  'slade1-fhd.webp',
  'slade1-qhd.webp',
  'slade1-uhd.webp',
  'slade2-mobile-xs.webp',
  'slade2-mobile.webp',
  'slade2-mobile-wide.webp',
  'slade2-tablet.webp',
  'slade2-laptop.webp',
  'slade2-desktop.webp',
  'slade2-fhd.webp',
  'slade2-qhd.webp',
  'slade2-uhd.webp',
  'slade3-mobile-xs.webp',
  'slade3-mobile.webp',
  'slade3-mobile-wide.webp',
  'slade3-tablet.webp',
  'slade3-laptop.webp',
  'slade3-desktop.webp',
  'slade3-fhd.webp',
  'slade3-qhd.webp',
  'slade3-uhd.webp',
]

const categoryWidths = [240, 320, 432, 640, 768]
const extraSliderVariants = [
  { fileName: 'slade1-desktop.webp', suffix: 'desktop-1440', width: 1440 },
  { fileName: 'slade2-desktop.webp', suffix: 'desktop-1440', width: 1440 },
  { fileName: 'slade3-desktop.webp', suffix: 'desktop-1440', width: 1440 },
]

const ensureDir = (directory) => fs.mkdir(directory, { recursive: true })

const basenameWithoutExt = (fileName) => fileName.replace(/\.[^.]+$/, '')

const writeCategoryVariants = async () => {
  const sourceDir = path.join(publicDir, 'images', 'collection', 'home-top')
  const outputDir = path.join(sourceDir, 'generated')
  await ensureDir(outputDir)

  await Promise.all(categoryImages.flatMap((fileName) => {
    const source = path.join(sourceDir, fileName)
    const baseName = basenameWithoutExt(fileName)

    return categoryWidths.map((width) =>
      sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 84, effort: 5 })
        .toFile(path.join(outputDir, `${baseName}-${width}.webp`))
    )
  }))
}

const writeSliderVariants = async () => {
  const sourceDir = path.join(publicDir, 'images', 'slider')
  const outputDir = path.join(sourceDir, 'generated')
  await ensureDir(outputDir)

  await Promise.all([
    ...sliderImages.map((fileName) => {
      const source = path.join(sourceDir, fileName)
      const baseName = basenameWithoutExt(fileName)

      return sharp(source)
        .webp({ quality: 76, effort: 5 })
        .toFile(path.join(outputDir, `${baseName}.webp`))
    }),
    ...extraSliderVariants.map(({ fileName, suffix, width }) => {
      const source = path.join(sourceDir, fileName)
      const slidePrefix = basenameWithoutExt(fileName).replace(/-desktop$/, '')

      return sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 76, effort: 5 })
        .toFile(path.join(outputDir, `${slidePrefix}-${suffix}.webp`))
    }),
  ])
}

await writeCategoryVariants()
await writeSliderVariants()

process.stdout.write('Home performance image variants generated.\n')
