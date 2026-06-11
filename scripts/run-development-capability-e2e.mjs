#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(process.argv.includes('--workspace') ? process.argv[process.argv.indexOf('--workspace') + 1] : path.join(__dirname, '..', '..'))
const manifestPath = path.join(workspaceRoot, 'paramascotasec', 'docs', 'system-capabilities.generated.json')
const gatewayEnvPath = path.join(workspaceRoot, 'Gateway', 'entorno', '.env')
const reportDir = path.join(workspaceRoot, 'reports', 'e2e', 'development')
const reportPath = path.join(reportDir, 'capability-e2e-report.json')

const parseEnvFile = (filePath) => {
  const env = {}
  if (!existsSync(filePath)) return env
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

const gatewayEnv = parseEnvFile(gatewayEnvPath)
if ((gatewayEnv.GATEWAY_ENV ?? gatewayEnv.ENTORNO_MODE) !== 'development') {
  throw new Error('E2E development bloqueado: Gateway no esta en development.')
}
if (gatewayEnv.PUBLIC_BILLING_ENV_SEGMENT !== 'test') {
  throw new Error('E2E development bloqueado: el segmento publico de facturacion debe ser test.')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const domain = gatewayEnv.PRIMARY_SITE_DOMAIN || 'paramascotasec.com'
const scheme = gatewayEnv.PUBLIC_SCHEME || 'https'
const tenant = gatewayEnv.PUBLIC_TENANT_SLUG || 'paramascotasec'
const apiSegment = gatewayEnv.PUBLIC_API_SERVICE_SEGMENT || 'api'
const billingSegment = gatewayEnv.PUBLIC_BILLING_SERVICE_SEGMENT || 'facturacion'
const resolveIp = process.env.E2E_RESOLVE_IP
  || (gatewayEnv.GATEWAY_BIND_IP || '')
  || (gatewayEnv.PRIMARY_SITE_LOCAL_IPS || '').split(',').map((value) => value.trim()).filter(Boolean)[0]
  || '127.0.0.1'

const report = {
  mode: 'development',
  domain,
  resolveIp,
  generatedBy: 'paramascotasec/scripts/run-development-capability-e2e.mjs',
  results: [],
  scenarioCoverage: [],
}

const addResult = (name, outcome, details = {}) => {
  report.results.push({ name, outcome, ...details })
}

const curlStatus = (urlPath, method = 'GET') => {
  const url = `${scheme}://${domain}${urlPath}`
  const args = [
    '-k',
    '--silent',
    '--show-error',
    '--output',
    '/dev/null',
    '--write-out',
    '%{http_code}',
    '--max-time',
    '25',
    '--request',
    method,
  ]
  if (scheme === 'https' && resolveIp) {
    args.push('--resolve', `${domain}:443:${resolveIp}`)
  }
  args.push(url)
  return execFileSync('curl', args, { encoding: 'utf8' }).trim()
}

const expectStatus = (name, urlPath, expectedStatuses, method = 'GET') => {
  const status = curlStatus(urlPath, method)
  const expected = new Set(expectedStatuses.map(String))
  if (!expected.has(status)) {
    addResult(name, 'failed', { urlPath, method, httpStatus: status, expected: [...expected] })
    return false
  }
  addResult(name, 'passed', { urlPath, method, httpStatus: status })
  return true
}

const apiGatewayPath = (apiPath) => `/${tenant}/${apiSegment}${apiPath.replace(/^\/api/, '')}`
const billingGatewayPath = (billingPath) => `/${tenant}/${billingSegment}${billingPath.replace(/^\/api\/test\/v1/, '')}`

const publicPageSamples = []
const publicHandlerSamples = []
const scenarioCapabilities = []

for (const capability of manifest.capabilities) {
  if (capability.e2e?.mode === 'scenario') {
    scenarioCapabilities.push({
      capabilityId: capability.id,
      scenario: capability.e2e.scenario,
      fixture: capability.e2e.fixture,
      cleanup: capability.e2e.cleanup,
      status: 'declared',
    })
  }

  for (const page of capability.frontend?.pages ?? []) {
    if (page.samplePath) {
      publicPageSamples.push({ capabilityId: capability.id, path: page.samplePath, seo: page.seo })
    }
  }
  for (const handler of capability.frontend?.handlers ?? []) {
    if (handler.public === true && (handler.method ?? 'GET').toUpperCase() === 'GET' && !handler.path.includes('[')) {
      publicHandlerSamples.push({ capabilityId: capability.id, path: handler.path })
    }
  }
}

let failed = false
for (const sample of publicPageSamples) {
  failed = !expectStatus(`page:${sample.capabilityId}:${sample.path}`, sample.path, [200]) || failed
}

for (const sample of publicHandlerSamples) {
  failed = !expectStatus(`handler:${sample.capabilityId}:${sample.path}`, sample.path, [200]) || failed
}

const publicBackendGetPaths = [
  '/api/health',
  '/api/products',
  '/api/settings/shipping',
  '/api/settings/store-status',
  '/api/settings/brand-logos',
  '/api/settings/product-categories',
  '/api/settings/product-category-references',
]

for (const apiPath of publicBackendGetPaths) {
  failed = !expectStatus(`tenant-api:${apiPath}`, apiGatewayPath(apiPath), [200]) || failed
}

const adminProbePaths = manifest.indexes.backendRoutes
  .filter((route) => route.method === 'GET' && route.path.startsWith('/api/admin/') && !route.path.includes('{'))
  .slice(0, 10)
  .map((route) => route.path)

for (const apiPath of adminProbePaths) {
  failed = !expectStatus(`admin-unauth:${apiPath}`, apiGatewayPath(apiPath), [401, 403]) || failed
}

failed = !expectStatus('billing-health', `/${tenant}/${billingSegment}/health`, [200]) || failed
failed = !expectStatus('legacy-api-block', '/api/products', [404]) || failed
failed = !expectStatus('legacy-facturador-block', '/facturador/api/test/v1/invoices/rides', [404]) || failed
failed = !expectStatus('legacy-uploads-block', '/uploads-api/images', [404, 405]) || failed

for (const route of manifest.indexes.facturadorRoutes) {
  if (route.path.startsWith('/api/production/')) {
    addResult(`facturador-production-guard:${route.path}`, 'passed', { guard: 'not-called-in-development' })
  }
}

report.scenarioCoverage = scenarioCapabilities
mkdirSync(reportDir, { recursive: true })
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

if (failed) {
  console.error(`Capability E2E development fallo. Reporte: ${reportPath}`)
  process.exit(1)
}

console.log(`Capability E2E development OK. Reporte: ${reportPath}`)
