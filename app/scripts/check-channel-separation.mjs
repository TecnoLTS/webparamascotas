import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const errors = []
const read = (path) => readFileSync(resolve(root, path), 'utf8')

for (const path of ['src/app/login/page.tsx', 'src/app/my-account/page.tsx', 'src/lib/ecommerceChannel.ts']) {
  if (!existsSync(resolve(root, path))) {
    errors.push(`${path} is required for the ecommerce channel.`)
  }
}

const login = read('src/app/login/page.tsx')
const channel = read('src/lib/ecommerceChannel.ts')
const proxy = read('src/proxy.ts')
const nextConfig = read('next.config.js')
const apiClient = read('src/lib/apiClient.ts')
const dockerfile = read('Dockerfile')
const compose = read('../docker-compose.yml')
const logoutRoutes = [
  read('src/app/api/auth/logout/route.ts'),
  read('src/app/api/[...path]/route.ts'),
]
const taxesPanel = read('src/app/my-account/components/TaxesPanel.tsx')
const myAccountController = read('src/app/my-account/MyAccountController.tsx')
const accountMenu = read('src/components/Header/Menu/MenuPet.tsx')

if (!login.includes('normalizeEcommerceReturnPath')) {
  errors.push('Login return paths must be constrained to the ecommerce channel.')
}
for (const reserved of ["'/dashboard'", "'/api'"]) {
  if (!channel.includes(reserved)) {
    errors.push(`Ecommerce return-path validation must reserve ${reserved}.`)
  }
}
if (!channel.includes("value.startsWith('//')") || !channel.includes("target.origin !== base.origin")) {
  errors.push('Ecommerce return-path validation must reject protocol-relative and cross-origin URLs.')
}

for (const [index, source] of logoutRoutes.entries()) {
  if (source.includes('_dashboard')) {
    errors.push(`Logout route ${index + 1} must never expire Dashboard cookies.`)
  }
  if (/Clear-Site-Data[^\n]+cookies/.test(source)) {
    errors.push(`Logout route ${index + 1} must not clear every cookie on the origin.`)
  }
  if (!source.includes('AUTH_LEGACY_COOKIE_FALLBACK_ENABLED')) {
    errors.push(`Logout route ${index + 1} must gate legacy cookie cleanup behind explicit opt-in.`)
  }
}

for (const [name, source] of [
  ['apiClient', apiClient],
  ['Dockerfile', dockerfile],
  ['docker-compose', compose],
]) {
  if (!source.includes('pm_csrf_ecommerce')) {
    errors.push(`${name} must default to the ecommerce-specific CSRF cookie.`)
  }
}

for (const [name, source] of [['proxy', proxy], ['next.config.js', nextConfig]]) {
  if (!source.includes('X-Frontend-Channel') || !source.includes('ecommerce')) {
    errors.push(`${name} must identify responses as the ecommerce frontend channel.`)
  }
}

if (!taxesPanel.includes('ECUADOR_SRI_VAT_RATES = [0, 5, 12, 13, 14, 15]')) {
  errors.push('The ecommerce tax channel must expose the exact supported Ecuador SRI VAT catalog.')
}
if (!taxesPanel.includes('<select') || !taxesPanel.includes('id="vatRate"') || taxesPanel.includes('id="vatRate"\n              type="number"')) {
  errors.push('The ecommerce tax channel must use a closed VAT selector instead of a free-form number input.')
}
if (!myAccountController.includes('isSupportedEcuadorSriVatRate(vatRate)')
    || !myAccountController.includes('isSupportedEcuadorSriVatRate(canonicalRate)')) {
  errors.push('The ecommerce tax channel must reject unsupported VAT rates before write and after canonical reads.')
}

if (!accountMenu.includes("const STOREFRONT_LOGIN_PATH = '/login'")
    || !accountMenu.includes('href={STOREFRONT_LOGIN_PATH}')) {
  errors.push('The storefront account menu must send customer sign-in to /login.')
}
if (accountMenu.includes('href={DASHBOARD_SIGN_IN_PATH} prefetch={false} className="button-main w-full text-center">Iniciar sesión</Link>')) {
  errors.push('Customer sign-in must never point to the Dashboard auth surface.')
}
if (!accountMenu.includes("const STOREFRONT_ACCOUNT_PATH = '/my-account'")
    || !accountMenu.includes('href={STOREFRONT_ACCOUNT_PATH}')) {
  errors.push('Authenticated storefront customers must return to /my-account.')
}
if (!accountMenu.includes('router.replace(STOREFRONT_LOGIN_PATH)')) {
  errors.push('Storefront logout must return to the customer login surface.')
}
if (!accountMenu.includes('href={DASHBOARD_SIGN_IN_PATH}')
    || !accountMenu.includes('Panel administrativo')) {
  errors.push('The administrative entry must remain explicit and separate from customer sign-in.')
}

if (errors.length > 0) {
  console.error('Frontend channel separation check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Frontend channel separation check passed.')
