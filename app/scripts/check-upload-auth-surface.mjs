import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  forwardUploadAuthenticationHeaders,
  resolveUploadAuthSurface,
  validateDashboardUploadSecurity,
} from '../src/lib/server/uploadAuthSurface.mjs'

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const dashboardCookie = 'pm_auth_dashboard=dashboard-jwt; pm_csrf_dashboard=dashboard-csrf'
const dashboardInput = new Headers({
  authorization: 'Bearer dashboard-token',
  cookie: dashboardCookie,
  host: 'admin.paramascotasec.com',
  origin: 'https://admin.paramascotasec.com',
  'x-auth-surface': 'dashboard',
  'x-csrf-token': 'dashboard-csrf',
  'x-forwarded-host': 'admin.paramascotasec.com',
  'x-forwarded-proto': 'https',
})
const dashboardOutput = forwardUploadAuthenticationHeaders(dashboardInput)
assert(dashboardOutput.get('x-auth-surface') === 'dashboard', 'Exact dashboard surface must be preserved.')
assert(dashboardOutput.get('cookie') === dashboardCookie, 'pm_auth_dashboard and pm_csrf_dashboard must be forwarded unchanged.')
assert(dashboardOutput.get('x-csrf-token') === 'dashboard-csrf', 'Dashboard CSRF header must be forwarded.')
assert(dashboardOutput.get('authorization') === 'Bearer dashboard-token', 'Dashboard Bearer token must be forwarded.')
assert(validateDashboardUploadSecurity(dashboardInput).ok, 'Matching Dashboard origin and double-submit CSRF must pass.')

const withoutCsrfHeader = new Headers(dashboardInput)
withoutCsrfHeader.delete('x-csrf-token')
assert(validateDashboardUploadSecurity(withoutCsrfHeader).status === 403, 'Missing Dashboard CSRF header must return 403.')

const foreignOrigin = new Headers(dashboardInput)
foreignOrigin.set('origin', 'https://paramascotasec.com')
assert(validateDashboardUploadSecurity(foreignOrigin).status === 403, 'Foreign ecommerce origin must return 403 on Dashboard uploads.')

const wrongCsrf = new Headers(dashboardInput)
wrongCsrf.set('x-csrf-token', 'different-csrf')
assert(!validateDashboardUploadSecurity(wrongCsrf).ok, 'Mismatched Dashboard CSRF values must be denied.')

const duplicateCsrfCookie = new Headers(dashboardInput)
duplicateCsrfCookie.set('cookie', `${dashboardCookie}; pm_csrf_dashboard=dashboard-csrf`)
assert(!validateDashboardUploadSecurity(duplicateCsrfCookie).ok, 'Ambiguous duplicate CSRF cookies must be denied.')

const originalDashboardCsrfCookieName = process.env.DASHBOARD_AUTH_CSRF_COOKIE_NAME
process.env.DASHBOARD_AUTH_CSRF_COOKIE_NAME = 'custom_csrf_dashboard'
const customCsrfInput = new Headers(dashboardInput)
customCsrfInput.set('cookie', 'pm_auth_dashboard=dashboard-jwt; custom_csrf_dashboard=custom-csrf')
customCsrfInput.set('x-csrf-token', 'custom-csrf')
assert(validateDashboardUploadSecurity(customCsrfInput).ok, 'Configured Dashboard CSRF cookie name must be supported.')
process.env.DASHBOARD_AUTH_CSRF_COOKIE_NAME = 'pm_csrf_ecommerce'
assert(!validateDashboardUploadSecurity(dashboardInput).ok, 'CSRF cookie configuration outside the Dashboard surface must fail closed.')
if (originalDashboardCsrfCookieName === undefined) delete process.env.DASHBOARD_AUTH_CSRF_COOKIE_NAME
else process.env.DASHBOARD_AUTH_CSRF_COOKIE_NAME = originalDashboardCsrfCookieName

const ecommerceCookie = 'pm_auth_ecommerce=ecommerce-jwt; pm_csrf_ecommerce=ecommerce-csrf'
const ecommerceOutput = forwardUploadAuthenticationHeaders(new Headers({
  cookie: ecommerceCookie,
  'x-csrf-token': 'ecommerce-csrf',
}))
assert(ecommerceOutput.get('x-auth-surface') === 'ecommerce', 'Missing surface must default to ecommerce.')
assert(ecommerceOutput.get('cookie') === ecommerceCookie, 'Ecommerce cookies must remain unchanged.')
assert(ecommerceOutput.get('x-csrf-token') === 'ecommerce-csrf', 'Ecommerce CSRF header must remain unchanged.')

for (const untrusted of [null, '', 'Dashboard', 'ecommerce', ' dashboard ', 'platform', 'customer']) {
  assert(resolveUploadAuthSurface(untrusted) === 'ecommerce', `Untrusted surface ${String(untrusted)} must fall back to ecommerce.`)
}

const root = process.cwd()
const uploadHandler = readFileSync(resolve(root, 'src/lib/server/productImageUpload.ts'), 'utf8')
const uploadSecurityHelper = readFileSync(resolve(root, 'src/lib/server/uploadAuthSurface.mjs'), 'utf8')
const gatewaySync = readFileSync(resolve(root, '../../gatewayapisix/scripts/sync-apisix.sh'), 'utf8')
assert(
  uploadHandler.includes('forwardUploadAuthenticationHeaders(req.headers)'),
  'productImageUpload must use the tested surface forwarding helper.',
)
assert(
  uploadHandler.includes('validateDashboardUploadSecurity(req.headers)'),
  'productImageUpload must reject invalid origin/CSRF before validating or writing an image.',
)
const securityValidationIndex = uploadHandler.indexOf('validateDashboardUploadSecurity(req.headers)')
assert(
  securityValidationIndex >= 0
    && securityValidationIndex < uploadHandler.indexOf('resolveProductImageUploadMode()')
    && securityValidationIndex < uploadHandler.indexOf('validateAdminRequest(req)')
    && securityValidationIndex < uploadHandler.indexOf('req.formData()'),
  'Origin/CSRF validation must run before storage selection, admin lookup and multipart processing.',
)
assert(!uploadSecurityHelper.includes('console.'), 'Upload security helpers must never log cookies or CSRF tokens.')
assert(
  gatewaySync.includes('removed_headers.append("X-Auth-Surface")'),
  'APISIX proxy-rewrite must erase client-controlled auth surface by default.',
)
assert(
  !gatewaySync.includes('("frontend-uploads", {'),
  'The Dashboard-only upload handler must not be exposed as a public ecommerce route.',
)
assert(
  gatewaySync.includes('"uri": f"{dashboard_api_prefix}/uploads/images"'),
  'The upload route must remain registered only inside each Dashboard host contract.',
)

if (errors.length > 0) {
  console.error('Upload auth-surface check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Upload auth-surface check passed: Dashboard uploads require exact origin and double-submit CSRF.')
