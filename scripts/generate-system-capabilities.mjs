#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = new Set(process.argv.slice(2))
const getArgValue = (name, fallback = undefined) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  return fallback
}

const mode = args.has('--check') ? 'check' : 'write'
const workspaceRoot = path.resolve(getArgValue('--workspace', path.join(__dirname, '..', '..')))
const frontendRoot = path.join(workspaceRoot, 'paramascotasec')
const frontendAppRoot = path.join(frontendRoot, 'app')
const backendRoot = path.join(workspaceRoot, 'paramascotasec-backend')
const facturadorRoot = path.join(workspaceRoot, 'Facturador')
const capabilityDir = path.join(frontendRoot, 'docs', 'capabilities')
const generatedJsonPath = path.join(frontendRoot, 'docs', 'system-capabilities.generated.json')
const generatedTsPath = path.join(frontendAppRoot, 'src', 'generated', 'systemCapabilities.ts')

const errors = []

const fail = (message) => {
  errors.push(message)
}

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'))

const loadPhpArray = (filePath) => {
  const output = execFileSync(
    'php',
    ['-r', 'echo json_encode(require $argv[1], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);', filePath],
    { encoding: 'utf8' },
  )
  return JSON.parse(output)
}

const walkFiles = (dir, predicate, files = []) => {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'generated') continue
      walkFiles(fullPath, predicate, files)
      continue
    }
    if (predicate(fullPath)) files.push(fullPath)
  }
  return files
}

const routeFromAppFile = (filePath, marker) => {
  const appDir = path.join(frontendAppRoot, 'src', 'app')
  const relative = path.relative(appDir, path.dirname(filePath)).replaceAll(path.sep, '/')
  if (!relative || relative === '.') return '/'
  return `/${relative}`.replace(/\/+/g, '/')
}

const loadCapabilityFiles = () => {
  if (!existsSync(capabilityDir)) {
    fail(`No existe el directorio de capacidades: ${capabilityDir}`)
    return []
  }

  const files = readdirSync(capabilityDir)
    .filter((file) => file.endsWith('.json'))
    .sort()

  if (files.length === 0) {
    fail(`No hay archivos de capacidades en ${capabilityDir}`)
    return []
  }

  return files.map((file) => {
    const filePath = path.join(capabilityDir, file)
    const data = readJson(filePath)
    return { file, filePath, ...data }
  })
}

const flattenCapabilities = (modules) => {
  const capabilities = []
  const seen = new Map()

  for (const module of modules) {
    if (!module.domain || typeof module.domain !== 'string') {
      fail(`${module.file}: falta domain`)
      continue
    }
    if (!Array.isArray(module.capabilities)) {
      fail(`${module.file}: capabilities debe ser un arreglo`)
      continue
    }
    for (const capability of module.capabilities) {
      if (!capability.id || typeof capability.id !== 'string') {
        fail(`${module.file}: capacidad sin id`)
        continue
      }
      if (seen.has(capability.id)) {
        fail(`Capability duplicada ${capability.id} en ${module.file} y ${seen.get(capability.id)}`)
        continue
      }
      seen.set(capability.id, module.file)
      capabilities.push({
        domain: module.domain,
        source: `paramascotasec/docs/capabilities/${module.file}`,
        ...capability,
      })
    }
  }

  return capabilities.sort((a, b) => a.id.localeCompare(b.id))
}

const routeId = (scope, method, routePath) => `${scope}:${method.toUpperCase()}:${routePath}`

const normalizeApiUse = (rawPath) => {
  let value = rawPath.replace(/\$\{[^}]+\}/g, '{param}')
  value = value.replace(/[?#].*$/, '')
  value = value.replace(/\/+$/, '') || '/'
  return value
}

const routePatternToRegex = (routePath) => {
  const escaped = routePath
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{[a-zA-Z0-9_]+\\\}/g, '[^/]+')
    .replace(/\\\[\\.\\.\\.[a-zA-Z0-9_]+\\\]/g, '.+')
    .replace(/\\\[[a-zA-Z0-9_]+\\\]/g, '[^/]+')
  return new RegExp(`^${escaped}$`)
}

const routeMatches = (routePath, usedPath) => {
  const normalized = normalizeApiUse(usedPath)
  const comparable = normalized.replace(/\{param\}/g, 'x')
  return routePatternToRegex(routePath).test(comparable)
}

const loadBackendRoutes = () => {
  const routeFile = path.join(backendRoot, 'config', 'routes.php')
  if (!existsSync(routeFile)) {
    fail(`No existe el registro backend ${routeFile}`)
    return []
  }
  return loadPhpArray(routeFile).map((route) => ({
    id: routeId('backend', route.method, route.path),
    method: route.method.toUpperCase(),
    path: route.path,
    handler: route.handler,
    capabilityId: route.capability,
    source: 'paramascotasec-backend/config/routes.php',
  }))
}

const loadFacturadorRoutes = () => {
  const routeFile = path.join(facturadorRoot, 'config', 'routes.capabilities.php')
  if (!existsSync(routeFile)) {
    fail(`No existe el registro Facturador ${routeFile}`)
    return []
  }
  return loadPhpArray(routeFile).map((route) => ({
    id: routeId('facturador', route.method, route.path),
    method: route.method.toUpperCase(),
    path: route.path,
    auth: route.auth ?? 'unknown',
    capabilityId: route.capability,
    source: 'Facturador/config/routes.capabilities.php',
  }))
}

const loadFrontendPages = () => {
  const appDir = path.join(frontendAppRoot, 'src', 'app')
  return walkFiles(appDir, (file) => path.basename(file) === 'page.tsx')
    .map((file) => ({
      path: routeFromAppFile(file, 'page.tsx'),
      source: path.relative(workspaceRoot, file).replaceAll(path.sep, '/'),
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

const loadFrontendHandlers = () => {
  const appDir = path.join(frontendAppRoot, 'src', 'app')
  const handlers = walkFiles(appDir, (file) => path.basename(file) === 'route.ts')
    .map((file) => ({
      method: 'ANY',
      path: routeFromAppFile(file, 'route.ts'),
      source: path.relative(workspaceRoot, file).replaceAll(path.sep, '/'),
    }))

  const specialFiles = [
    { file: path.join(appDir, 'robots.ts'), path: '/robots.txt' },
    { file: path.join(appDir, 'sitemap.ts'), path: '/sitemap.xml' },
  ]
  for (const item of specialFiles) {
    if (existsSync(item.file)) {
      handlers.push({
        method: 'GET',
        path: item.path,
        source: path.relative(workspaceRoot, item.file).replaceAll(path.sep, '/'),
      })
    }
  }

  return handlers.sort((a, b) => a.path.localeCompare(b.path))
}

const flattenRegisteredFrontendPages = (capabilities) => {
  const pages = []
  for (const capability of capabilities) {
    for (const page of capability.frontend?.pages ?? []) {
      pages.push({ ...page, capabilityId: capability.id })
    }
  }
  return pages
}

const flattenRegisteredFrontendHandlers = (capabilities) => {
  const handlers = []
  for (const capability of capabilities) {
    for (const handler of capability.frontend?.handlers ?? []) {
      handlers.push({
        method: (handler.method ?? 'ANY').toUpperCase(),
        ...handler,
        capabilityId: capability.id,
      })
    }
  }
  return handlers
}

const extractFrontendApiUses = () => {
  const srcDir = path.join(frontendAppRoot, 'src')
  const files = walkFiles(srcDir, (file) => /\.(ts|tsx)$/.test(file))
  const uses = []
  const callMarkers = ['requestApi(', 'fetchJson(', 'toPublicApiUrl(', 'fetch(']
  const stringRegex = /(['"`])(\/api\/(?:\\.|(?!\1).)+)\1/g

  for (const file of files) {
    const relative = path.relative(workspaceRoot, file).replaceAll(path.sep, '/')
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (!callMarkers.some((marker) => line.includes(marker))) return
      for (const match of line.matchAll(stringRegex)) {
        uses.push({
          path: normalizeApiUse(match[2]),
          source: `${relative}:${index + 1}`,
        })
      }
    })
  }

  return uses.sort((a, b) => `${a.path}${a.source}`.localeCompare(`${b.path}${b.source}`))
}

const assertCapabilityIntegrity = (capabilities, backendRoutes, facturadorRoutes) => {
  const capabilityIds = new Set(capabilities.map((capability) => capability.id))

  for (const capability of capabilities) {
    if (!capability.summary) fail(`${capability.id}: falta summary`)
    if (!capability.auth) fail(`${capability.id}: falta auth`)
    if (!capability.gateway?.exposure) fail(`${capability.id}: falta gateway.exposure`)
    if (!capability.e2e?.mode) fail(`${capability.id}: falta e2e.mode`)
    if (!capability.e2e || !Object.prototype.hasOwnProperty.call(capability.e2e, 'assertDb')) {
      fail(`${capability.id}: falta e2e.assertDb`)
    }
    if (!capability.e2e || !Object.prototype.hasOwnProperty.call(capability.e2e, 'cleanup')) {
      fail(`${capability.id}: falta e2e.cleanup`)
    }

    for (const page of capability.frontend?.pages ?? []) {
      if (!page.path) fail(`${capability.id}: pagina frontend sin path`)
      if (!page.seo?.policy) fail(`${capability.id}: ${page.path} falta seo.policy`)
      if (page.seo?.policy === 'indexable' && page.seo?.canonical !== 'self') {
        fail(`${capability.id}: ${page.path} indexable debe declarar canonical self`)
      }
      if (page.seo?.policy === 'noindex' && page.seo?.follow !== true) {
        fail(`${capability.id}: ${page.path} noindex debe declarar follow true`)
      }
    }

    const hasExternalMail = capability.externalEffects?.mail?.enabledInDevelopment
    if (hasExternalMail && capability.externalEffects?.mail?.requiresAllowlist !== true) {
      fail(`${capability.id}: correo development requiere allowlist`)
    }
    const sri = capability.externalEffects?.sri
    if (sri?.environment === 'produccion' && sri.enabledInDevelopment !== false) {
      fail(`${capability.id}: SRI produccion no puede habilitarse en development`)
    }
    if (sri?.environment === 'pruebas' && sri.forbidProduction !== true) {
      fail(`${capability.id}: SRI pruebas debe declarar forbidProduction`)
    }
  }

  for (const route of [...backendRoutes, ...facturadorRoutes]) {
    if (!route.capabilityId) fail(`${route.id}: falta capabilityId`)
    if (route.capabilityId && !capabilityIds.has(route.capabilityId)) {
      fail(`${route.id}: capabilityId inexistente ${route.capabilityId}`)
    }
  }

  const mutatingRoutes = backendRoutes.filter((route) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method))
  const mutatingCapabilities = new Set(mutatingRoutes.map((route) => route.capabilityId).filter(Boolean))
  for (const capabilityId of mutatingCapabilities) {
    const capability = capabilities.find((item) => item.id === capabilityId)
    if (!capability) continue
    if (capability.e2e?.stateless === true) continue
    if (!capability.e2e?.fixture) fail(`${capabilityId}: capacidad mutante debe declarar e2e.fixture`)
    if (capability.e2e?.assertDb !== true) fail(`${capabilityId}: capacidad mutante debe declarar e2e.assertDb=true`)
    if (capability.e2e?.cleanup !== true) fail(`${capabilityId}: capacidad mutante debe declarar e2e.cleanup=true`)
  }
}

const assertFrontendCoverage = (capabilities, frontendPages, frontendHandlers, apiUses, backendRoutes) => {
  const registeredPages = flattenRegisteredFrontendPages(capabilities)
  const registeredHandlers = flattenRegisteredFrontendHandlers(capabilities)

  for (const page of frontendPages) {
    if (!registeredPages.some((registered) => registered.path === page.path)) {
      fail(`Pagina frontend sin capacidad: ${page.path} (${page.source})`)
    }
  }

  for (const registered of registeredPages) {
    if (!frontendPages.some((page) => page.path === registered.path)) {
      fail(`Capacidad declara pagina inexistente: ${registered.path} (${registered.capabilityId})`)
    }
  }

  for (const handler of frontendHandlers) {
    if (!registeredHandlers.some((registered) => registered.path === handler.path)) {
      fail(`Route handler frontend sin capacidad: ${handler.path} (${handler.source})`)
    }
  }

  const declaredApiRoutes = [
    ...backendRoutes.map((route) => route.path),
    ...registeredHandlers.filter((handler) => handler.path.startsWith('/api/')).map((handler) => handler.path),
  ].filter((routePath) => routePath !== '/api/[...path]')

  for (const use of apiUses) {
    const matched = declaredApiRoutes.some((routePath) => routeMatches(routePath, use.path))
    if (!matched) {
      fail(`Uso API frontend sin ruta declarada: ${use.path} (${use.source})`)
    }
  }
}

const groupRoutesByCapability = (routes) => {
  const grouped = new Map()
  for (const route of routes) {
    const list = grouped.get(route.capabilityId) ?? []
    list.push(route)
    grouped.set(route.capabilityId, list)
  }
  return grouped
}

const buildGeneratedJson = (capabilities, backendRoutes, facturadorRoutes, frontendPages, frontendHandlers, apiUses) => {
  const backendByCapability = groupRoutesByCapability(backendRoutes)
  const facturadorByCapability = groupRoutesByCapability(facturadorRoutes)

  const generatedCapabilities = capabilities.map((capability) => ({
    ...capability,
    backendRoutes: backendByCapability.get(capability.id) ?? [],
    facturadorRoutes: facturadorByCapability.get(capability.id) ?? [],
  }))

  return {
    schemaVersion: 1,
    generatedBy: 'paramascotasec/scripts/generate-system-capabilities.mjs',
    capabilities: generatedCapabilities,
    indexes: {
      backendRoutes,
      facturadorRoutes,
      frontendPages,
      frontendHandlers,
      frontendApiUses: apiUses,
    },
  }
}

const toTsString = (value) => JSON.stringify(value, null, 2)

const buildGeneratedTs = (backendRoutes, facturadorRoutes) => {
  const allRoutes = backendRoutes.map((route) => ({
    id: route.id,
    method: route.method,
    path: route.path,
    capabilityId: route.capabilityId,
  }))

  return `// Generated by ../scripts/generate-system-capabilities.mjs. Do not edit by hand.\n\nexport const backendApiRoutes = ${toTsString(allRoutes)} as const\n\nexport const facturadorApiRoutes = ${toTsString(facturadorRoutes.map((route) => ({ id: route.id, method: route.method, path: route.path, capabilityId: route.capabilityId })))} as const\n\nexport type BackendApiRouteId = typeof backendApiRoutes[number]['id']\nexport type FacturadorApiRouteId = typeof facturadorApiRoutes[number]['id']\n\nconst backendRouteById = new Map<string, { path: string }>(backendApiRoutes.map((route) => [route.id, route]))\n\nexport function buildApiRoute(id: BackendApiRouteId, params: Record<string, string | number> = {}): string {\n  const route = backendRouteById.get(id)\n  if (!route) {\n    throw new Error(\`Ruta API no registrada: \${id}\`)\n  }\n\n  let resolved = route.path\n  for (const [key, value] of Object.entries(params)) {\n    resolved = resolved.replace(new RegExp(\`\\\\{\${key}\\\\}\`, 'g'), encodeURIComponent(String(value)))\n  }\n\n  if (/\\{[a-zA-Z0-9_]+\\}/.test(resolved)) {\n    throw new Error(\`Faltan parametros para ruta API: \${id}\`)\n  }\n\n  return resolved\n}\n`
}

const ensureUpToDate = (filePath, content) => {
  if (!existsSync(filePath)) {
    fail(`Archivo generado faltante: ${path.relative(workspaceRoot, filePath)}`)
    return
  }
  const current = readFileSync(filePath, 'utf8')
  if (current !== content) {
    fail(`Archivo generado desactualizado: ${path.relative(workspaceRoot, filePath)}`)
  }
}

const main = () => {
  const modules = loadCapabilityFiles()
  const capabilities = flattenCapabilities(modules)
  const backendRoutes = loadBackendRoutes()
  const facturadorRoutes = loadFacturadorRoutes()
  const frontendPages = loadFrontendPages()
  const frontendHandlers = loadFrontendHandlers()
  const apiUses = extractFrontendApiUses()

  assertCapabilityIntegrity(capabilities, backendRoutes, facturadorRoutes)
  assertFrontendCoverage(capabilities, frontendPages, frontendHandlers, apiUses, backendRoutes)

  const generatedJson = `${JSON.stringify(buildGeneratedJson(capabilities, backendRoutes, facturadorRoutes, frontendPages, frontendHandlers, apiUses), null, 2)}\n`
  const generatedTs = buildGeneratedTs(backendRoutes, facturadorRoutes)

  if (mode === 'check') {
    ensureUpToDate(generatedJsonPath, generatedJson)
    ensureUpToDate(generatedTsPath, generatedTs)
  } else if (errors.length === 0) {
    writeFileSync(generatedJsonPath, generatedJson)
    writeFileSync(generatedTsPath, generatedTs)
  }

  if (errors.length > 0) {
    console.error('Capability registry invalido:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  const action = mode === 'check' ? 'validado' : 'generado'
  console.log(`Capability registry ${action}: ${capabilities.length} capacidades, ${backendRoutes.length} rutas backend, ${facturadorRoutes.length} rutas Facturador.`)
}

main()
