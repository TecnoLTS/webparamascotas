import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

const read = (relativePath) => readFile(path.join(appRoot, relativePath), 'utf8')

const main = async () => {
  const [controller, customerDashboard, customerOrders, adminOrders, types, checkout] = await Promise.all([
    read('src/app/my-account/MyAccountController.tsx'),
    read('src/app/my-account/components/CustomerDashboardTab.tsx'),
    read('src/app/my-account/components/CustomerOrdersPanel.tsx'),
    read('src/app/my-account/components/AdminOrdersPanel.tsx'),
    read('src/app/my-account/types.ts'),
    read('src/app/checkout/CheckoutClient.tsx'),
  ])

  const failures = []
  const check = (condition, message) => {
    if (!condition) failures.push(message)
  }

  check(
    /requestApi<any>\(apiEndpoints\.order\(orderId\)\)/.test(controller),
    'el modal de pedido no consulta GET /orders/{id}',
  )
  check(
    (controller.match(/onOpenOrder=\{\(order\) => handleViewOrder\(order\.id\)\}/g) ?? []).length >= 2,
    'los listados de cliente abren el detalle remoto por id',
  )
  check(!/order\.items\??(?:\.|\[)/.test(customerDashboard), 'el dashboard de cliente consume lineas desde la lista')
  check(!/order\.items\??(?:\.|\[)/.test(customerOrders), 'el historial de cliente consume lineas desde la lista')
  check(!/order\.order_notes/.test(adminOrders), 'la tabla admin consume notas desde la lista')
  check(/items_count\?: number;/.test(types), 'el tipo Order no declara items_count')
  check(/units_count\?: number;/.test(types), 'el tipo Order no declara units_count')
  check(
    /const quoteDeliveryMethod = deliveryMethod === 'delivery' && !quoteShippingAddress\s*\? 'pickup'\s*:\s*deliveryMethod/.test(checkout),
    'checkout no cotiza los productos mientras la ubicación de entrega está pendiente',
  )
  check(
    /delivery_method: quoteDeliveryMethod/.test(checkout),
    'checkout no usa la cotización independiente de productos',
  )
  check(
    !/deliveryMethod === 'delivery' && !quoteShippingAddress\) \{\s*setQuote\(null\)\s*return/.test(checkout),
    'checkout vuelve a borrar precios e IVA cuando falta la ubicación de entrega',
  )

  if (failures.length > 0) {
    console.error('[order-summary-contract] FAIL')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log('[order-summary-contract] OK: lista resumen; detalle bajo demanda')
}

main().catch((error) => {
  console.error('[order-summary-contract] Error inesperado:', error)
  process.exit(1)
})
