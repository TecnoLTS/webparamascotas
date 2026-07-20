import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const walk = (relativeDirectory) => fs.readdirSync(path.join(root, relativeDirectory), { withFileTypes: true })
  .flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name)
    return entry.isDirectory() ? walk(relativePath) : [relativePath]
  })
const failures = []
const requireText = (source, expected, message) => {
  if (!source.includes(expected)) failures.push(message)
}

const homePage = read('src/app/page.tsx')
const tenantHome = read('src/tenants/paramascotasec.com/Home.tsx')
const productApi = read('src/lib/api/products.ts')
const apiClient = read('src/lib/apiClient.ts')
const deferredCatalog = read('src/components/Product/DeferredAllProducts.tsx')
const catalogGrid = read('src/components/Product/AllProducts.tsx')
const featuredProducts = read('src/components/Pet/FeatureProduct.tsx')

if (/\bfetchProducts\b/.test(homePage)) {
  failures.push('La portada no debe recuperar ni serializar el catálogo completo durante SSR.')
}
if (/ParamascotasecHome\s+products=/.test(homePage) || /products:\s*ProductType\[\]/.test(tenantHome)) {
  failures.push('La portada aún cruza el catálogo completo por la frontera Server/Client Components.')
}
requireText(tenantHome, '<DeferredAllProducts categoryIds=', 'Home debe diferir la carga paginada del catálogo.')
requireText(productApi, 'listProductPage', 'Falta el cliente de páginas de catálogo.')
requireText(productApi, 'seenCursors', 'El recorrido paginado debe detectar ciclos de cursor.')
if (catalogGrid.includes('Cargar más productos')) {
  failures.push('El catálogo no debe mezclar paginación numerada con un segundo botón de carga.')
}
requireText(deferredCatalog, 'pageSize: 48', 'La primera carga del Home debe estar acotada explícitamente.')
requireText(deferredCatalog, 'seenCursors', 'La paginación diferida del Home debe detectar ciclos de cursor.')
requireText(featuredProducts, 'max-w-full flex-wrap', 'Las categorías de Novedades deben ajustarse sin desbordar la pantalla.')
requireText(featuredProducts, 'tab-item relative shrink-0', 'Cada categoría de Novedades debe conservar su ancho legible.')
requireText(apiClient, 'const stablePublicReferencePaths = new Set<string>([', 'Falta el catálogo explícito de referencias públicas estables.')
for (const endpoint of [
  'apiEndpoints.settings.publicBrandLogos',
  'apiEndpoints.settings.publicProductCategories',
  'apiEndpoints.settings.publicProductCategoryReferences',
]) {
  requireText(apiClient, endpoint, `${endpoint} debe pertenecer al caché estable de referencias públicas.`)
}
requireText(apiClient, 'if (stablePublicReferencePaths.has(pathname))', 'La política de caché debe reconocer las referencias públicas estables.')
requireText(apiClient, "return { cache: 'force-cache', next: { revalidate: 300 } }", 'Las referencias públicas estables deben revalidarse cada 300 segundos.')

for (const documentPath of [
  'src/app/feeds/google-products.xml/route.ts',
  'src/app/sitemap.ts',
  'src/app/sitemap-images.xml/route.ts',
  'src/app/llms.txt/route.ts',
]) {
  const documentSource = read(documentPath)
  if (!/\b(listAllProducts|fetchAllProducts)\b/.test(documentSource)) {
    failures.push(`${documentPath} debe declarar explícitamente su recorrido completo paginado.`)
  }
}

const fullTraversalAllowlist = new Set([
  'src/lib/api/products.ts',
  'src/lib/products.ts',
  'src/app/feeds/google-products.xml/route.ts',
  'src/app/sitemap.ts',
  'src/app/sitemap-images.xml/route.ts',
  'src/app/llms.txt/route.ts',
])

for (const sourcePath of walk('src').filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))) {
  const source = read(sourcePath)
  if (/\b(?:fetchProducts|listProducts)\b/.test(source)) {
    failures.push(`${sourcePath} usa el contrato eliminado de catálogo completo.`)
  }
  if (/\b(?:fetchAllProducts|listAllProducts)\b/.test(source) && !fullTraversalAllowlist.has(sourcePath)) {
    failures.push(`${sourcePath} recorre el catálogo completo fuera de la allowlist documental/jobs.`)
  }
}

if (failures.length > 0) {
  console.error('[catalog-performance] FAIL')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('[catalog-performance] OK: vistas acotadas; recorridos completos limitados a documentos/jobs')
