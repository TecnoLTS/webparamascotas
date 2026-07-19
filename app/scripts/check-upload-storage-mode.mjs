import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const errors = []
const read = (path) => readFileSync(resolve(root, path), 'utf8')

const validate = (environment) => {
  const appEnv = String(environment.APP_ENV || 'production').trim().toLowerCase()
  const production = appEnv === 'production' || appEnv === 'prod'
  const requireHaRaw = String(environment.REQUIRE_HA ?? 'false').trim().toLowerCase()
  if (!['1', '0', 'true', 'false', 'yes', 'no', 'on', 'off'].includes(requireHaRaw)) {
    throw new Error('invalid REQUIRE_HA')
  }
  const requireHa = ['1', 'true', 'yes', 'on'].includes(requireHaRaw)
  const mode = String(environment.PRODUCT_IMAGE_UPLOAD_MODE || (production || requireHa ? 'backend-object-storage' : 'local'))
    .trim()
    .toLowerCase()
  if (!['local', 'backend-object-storage'].includes(mode)) throw new Error('invalid upload mode')
  if (production && !requireHa) throw new Error('production requires HA')
  if ((production || requireHa) && mode !== 'backend-object-storage') throw new Error('HA requires backend storage')
  if (mode === 'local' && appEnv !== 'qa') throw new Error('local is QA-only')
  if (mode === 'backend-object-storage') {
    const publicBase = new URL(String(environment.NEXT_PUBLIC_UPLOADS_BASE_URL || ''))
    if (publicBase.protocol !== 'https:' || publicBase.username || publicBase.password || publicBase.search || publicBase.hash) {
      throw new Error('invalid public uploads base')
    }
  }
  return mode
}

const expectValid = (name, environment, expectedMode) => {
  try {
    const mode = validate(environment)
    if (mode !== expectedMode) errors.push(`${name}: expected ${expectedMode}, got ${mode}`)
  } catch (error) {
    errors.push(`${name}: unexpectedly rejected (${error.message})`)
  }
}
const expectInvalid = (name, environment) => {
  try {
    validate(environment)
    errors.push(`${name}: configuration was unexpectedly accepted`)
  } catch {}
}

expectValid('QA local', {
  APP_ENV: 'qa',
  REQUIRE_HA: 'false',
  PRODUCT_IMAGE_UPLOAD_MODE: 'local',
}, 'local')
expectValid('production object storage', {
  APP_ENV: 'production',
  REQUIRE_HA: 'true',
  PRODUCT_IMAGE_UPLOAD_MODE: 'backend-object-storage',
  NEXT_PUBLIC_UPLOADS_BASE_URL: 'https://cdn.example.test/catalog',
}, 'backend-object-storage')
expectInvalid('production local', {
  APP_ENV: 'production',
  REQUIRE_HA: 'true',
  PRODUCT_IMAGE_UPLOAD_MODE: 'local',
})
expectInvalid('production without HA', {
  APP_ENV: 'production',
  REQUIRE_HA: 'false',
  PRODUCT_IMAGE_UPLOAD_MODE: 'backend-object-storage',
  NEXT_PUBLIC_UPLOADS_BASE_URL: 'https://cdn.example.test/catalog',
})
expectInvalid('object storage without public HTTPS base', {
  APP_ENV: 'qa',
  REQUIRE_HA: 'true',
  PRODUCT_IMAGE_UPLOAD_MODE: 'backend-object-storage',
  NEXT_PUBLIC_UPLOADS_BASE_URL: 'http://cdn.example.test/catalog',
})

const uploadHandler = read('src/lib/server/productImageUpload.ts')
const productMapper = read('src/lib/productMapper.ts')
const compose = read('../docker-compose.yml')
const dockerfile = read('Dockerfile')
const backendConfiguration = read('../../backend/src/Infrastructure/Storage/StorageConfiguration.php')
const backendRoutes = read('../../backend/src/Modules/CatalogInventory/routes.php')
const backendStorage = read('../../backend/src/Modules/CatalogInventory/Infrastructure/CatalogImageStorage.php')

for (const token of [
  "'local' | 'backend-object-storage'",
  'backendCatalogImageUploadUrl',
  'isExpectedBackendPublicUrl',
  'url.origin !== base.origin',
  'expectedPrefix',
  'forwardUploadAuthenticationHeaders(req.headers)',
  'attachInternalProxyToken(headers)',
]) {
  if (!uploadHandler.includes(token)) errors.push(`productImageUpload.ts is missing ${token}`)
}

for (const forbidden of ['OBJECT_STORAGE_ACCESS_KEY', 'OBJECT_STORAGE_SECRET_KEY', 'OBJECT_STORAGE_SESSION_TOKEN']) {
  if (compose.includes(forbidden) || dockerfile.includes(forbidden)) {
    errors.push(`Next runtime must not receive ${forbidden}`)
  }
}

const productionService = compose.split(/\n  runtime:/)[0]
if (productionService.includes('./app/public/uploads:/app/public/uploads:rw')) {
  errors.push('Production frontend must not write to a host uploads volume.')
}
if (!compose.includes('PRODUCT_IMAGE_UPLOAD_MODE: ${PRODUCT_IMAGE_UPLOAD_MODE:-backend-object-storage}')) {
  errors.push('Production Compose must default to backend-object-storage.')
}
if (!compose.includes('PRODUCT_IMAGE_UPLOAD_MODE: ${PRODUCT_IMAGE_UPLOAD_MODE:-local}')) {
  errors.push('QA Compose must preserve local upload mode.')
}
if (!backendConfiguration.includes('OBJECT_STORAGE_PUBLIC_BASE_URL')) {
  errors.push('Backend storage configuration must require the public uploads base URL.')
}
if (!backendRoutes.includes("'/api/admin/catalog/images'")) {
  errors.push('CatalogInventory admin upload route is missing.')
}
if (!productMapper.includes('isObjectStorageUploadUrl(url)')) {
  errors.push('Product mapper must preserve configured CDN/object-storage URLs.')
}
for (const token of ['tenants/%s/%s/%s', 'MAX_TOTAL_BYTES', 'hasWebpSignature', 'array_reverse($attempted)']) {
  if (!backendStorage.includes(token)) errors.push(`Catalog image storage is missing ${token}`)
}

if (errors.length > 0) {
  console.error('Upload storage mode check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Upload storage mode check passed.')
