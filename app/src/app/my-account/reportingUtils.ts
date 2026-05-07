import type {
  DashboardStats,
  ProductDetailMetric,
  PurchaseInvoiceSummary,
  SalesRankingRow,
} from './types'

type ProductSalesRanking = DashboardStats['businessMetrics'] extends infer BM
  ? BM extends { productSalesRanking?: infer PR } ? PR : never
  : never

type SalesTrendRow = { day: string; date?: string; total: number }

const formatTrendDateLabel = (row: SalesTrendRow, options: Intl.DateTimeFormatOptions) => {
  const rawDate = String(row.date || row.day || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toLocaleDateString('es-EC', {
      timeZone: 'UTC',
      ...options,
    })
  }

  return String(row.day || '-')
}

export const summarizeStrategicAlerts = (
  strategicAlerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string; action: string }>,
) => {
  return strategicAlerts.reduce((acc, alert) => {
    if (alert.type === 'critical') acc.critical += 1
    if (alert.type === 'warning') acc.warning += 1
    if (alert.type === 'info') acc.info += 1
    return acc
  }, { critical: 0, warning: 0, info: 0 })
}

export const filterStrategicAlerts = (
  strategicAlerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string; action: string }>,
  severity: 'all' | 'critical' | 'warning' | 'info',
) => {
  if (severity === 'all') return strategicAlerts
  return strategicAlerts.filter((alert) => alert.type === severity)
}

export const buildSalesRankingRows = (
  productSalesRanking: ProductSalesRanking | undefined,
  salesRankingView: 'month' | 'historical' | 'range',
): SalesRankingRow[] => {
  if (!productSalesRanking) return []
  const source = salesRankingView === 'month'
    ? productSalesRanking.monthlyRanking
    : salesRankingView === 'range'
      ? (productSalesRanking.rangeRanking ?? [])
      : productSalesRanking.historicalRanking
  const prefix = salesRankingView === 'month'
    ? 'month'
    : salesRankingView === 'range'
      ? 'range'
      : 'historical'
  return source.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    category: item.category,
    orders_count: Number(item[`${prefix}_orders_count` as keyof typeof item] ?? 0),
    units_sold: Number(item[`${prefix}_units_sold` as keyof typeof item] ?? 0),
    gross_revenue: Number(item[`${prefix}_gross_revenue` as keyof typeof item] ?? 0),
    net_revenue: Number(item[`${prefix}_net_revenue` as keyof typeof item] ?? 0),
    vat_amount: Number(item[`${prefix}_vat_amount` as keyof typeof item] ?? 0),
    shipping_amount: Number(item[`${prefix}_shipping_amount` as keyof typeof item] ?? 0),
    cost: Number(item[`${prefix}_cost` as keyof typeof item] ?? 0),
    profit: Number(item[`${prefix}_profit` as keyof typeof item] ?? 0),
    margin: Number(item[`${prefix}_margin` as keyof typeof item] ?? 0),
    month_orders_count: Number(item.month_orders_count ?? 0),
    month_units_sold: Number(item.month_units_sold ?? 0),
    month_gross_revenue: Number(item.month_gross_revenue ?? 0),
    month_net_revenue: Number(item.month_net_revenue ?? 0),
    month_vat_amount: Number(item.month_vat_amount ?? 0),
    month_shipping_amount: Number(item.month_shipping_amount ?? 0),
    month_cost: Number(item.month_cost ?? 0),
    month_profit: Number(item.month_profit ?? 0),
    month_margin: Number(item.month_margin ?? 0),
    range_orders_count: Number(item.range_orders_count ?? 0),
    range_units_sold: Number(item.range_units_sold ?? 0),
    range_gross_revenue: Number(item.range_gross_revenue ?? 0),
    range_net_revenue: Number(item.range_net_revenue ?? 0),
    range_vat_amount: Number(item.range_vat_amount ?? 0),
    range_shipping_amount: Number(item.range_shipping_amount ?? 0),
    range_cost: Number(item.range_cost ?? 0),
    range_profit: Number(item.range_profit ?? 0),
    range_margin: Number(item.range_margin ?? 0),
    historical_orders_count: Number(item.historical_orders_count ?? 0),
    historical_units_sold: Number(item.historical_units_sold ?? 0),
    historical_gross_revenue: Number(item.historical_gross_revenue ?? 0),
    historical_net_revenue: Number(item.historical_net_revenue ?? 0),
    historical_vat_amount: Number(item.historical_vat_amount ?? 0),
    historical_shipping_amount: Number(item.historical_shipping_amount ?? 0),
    historical_cost: Number(item.historical_cost ?? 0),
    historical_profit: Number(item.historical_profit ?? 0),
    historical_margin: Number(item.historical_margin ?? 0),
  }))
}

export const buildSalesTrendPreview = (salesTrendRows: SalesTrendRow[]) => {
  const rows = salesTrendRows.slice(-8).map((item) => ({
    ...item,
    displayDay: formatTrendDateLabel(item, { day: '2-digit', month: 'short' }),
  }))
  const max = Math.max(...rows.map((item) => Number(item.total ?? 0)), 0)
  return { rows, max }
}

export const summarizeInventoryRows = (inventoryManagementRows: Array<{
  stock: number
  inventoryCost: number
  inventoryMarket: number
  stockStatus: 'available' | 'low' | 'out' | 'expiring' | 'expired'
}>) => {
  return inventoryManagementRows.reduce((acc, row) => {
    acc.totalSkus += 1
    acc.totalUnits += row.stock
    acc.totalCost += row.inventoryCost
    acc.totalMarket += row.inventoryMarket
    if (row.stockStatus === 'out') acc.out += 1
    if (row.stockStatus === 'low') acc.low += 1
    if (row.stockStatus === 'expiring') acc.expiring += 1
    if (row.stockStatus === 'expired') acc.expired += 1
    return acc
  }, { totalSkus: 0, totalUnits: 0, totalCost: 0, totalMarket: 0, out: 0, low: 0, expiring: 0, expired: 0 })
}

export const summarizePurchaseInvoices = (recentPurchaseInvoices: PurchaseInvoiceSummary[]) => {
  const summary = recentPurchaseInvoices.reduce((acc, invoice) => {
    acc.totalInvoices += 1
    acc.totalUnits += Number(invoice.units_total ?? 0)
    acc.totalAmount += Number(invoice.total ?? 0)
    if (invoice.supplier_name) {
      acc.suppliers.add(String(invoice.supplier_name).trim().toUpperCase())
    }
    return acc
  }, {
    totalInvoices: 0,
    totalUnits: 0,
    totalAmount: 0,
    suppliers: new Set<string>(),
  })

  return {
    totalInvoices: summary.totalInvoices,
    totalUnits: summary.totalUnits,
    totalAmount: summary.totalAmount,
    suppliersCount: summary.suppliers.size,
  }
}

export const buildProductBreakdownMeta = (
  dashboardStats: DashboardStats | null,
  selectedProductMetric: ProductDetailMetric,
) => {
  const report = dashboardStats?.businessMetrics?.report
  switch (selectedProductMetric) {
    case 'gross':
      return {
        title: 'Venta Total por Producto',
        subtitle: 'Incluye IVA y prorrateo de envío según participación en ventas netas.',
        total: Number(report?.sales?.total ?? dashboardStats?.businessMetrics?.salesSummary?.gross ?? 0),
      }
    case 'vat':
      return {
        title: 'IVA Cobrado por Producto',
        subtitle: 'Calculado con el IVA real aplicado a cada producto, incluyendo exentos.',
        total: Number(report?.sales?.tax ?? dashboardStats?.businessMetrics?.salesSummary?.vat ?? 0),
      }
    case 'shipping':
      return {
        title: 'Envío Cobrado por Producto',
        subtitle: 'Distribución proporcional al peso de cada producto en ventas netas.',
        total: Number(report?.sales?.shipping ?? dashboardStats?.businessMetrics?.salesSummary?.shipping ?? 0),
      }
    case 'profit':
      return {
        title: 'Utilidad Bruta por Producto',
        subtitle: 'Utilidad estimada = venta neta del producto - costo acumulado vendido.',
        total: Number(report?.profit?.gross_profit ?? dashboardStats?.businessMetrics?.profitStats?.profit ?? 0),
      }
    case 'inventory':
      return {
        title: 'Valor de Inventario por Producto',
        subtitle: 'Costo inmovilizado actual por SKU (stock x costo unitario).',
        total: Number(dashboardStats?.businessMetrics?.inventoryValue?.cost_value ?? 0),
      }
    case 'net':
    default:
      return {
        title: 'Venta Neta por Producto',
        subtitle: 'Sin IVA ni envío. Basado solo en pedidos completados o entregados.',
        total: Number(report?.sales?.net ?? dashboardStats?.businessMetrics?.salesSummary?.net ?? 0),
      }
  }
}

export const buildSalesProductBreakdown = (
  dashboardStats: DashboardStats | null,
  adminProductsList: any[],
  parseMoney: (value: any) => number,
  selectedProductMetric: ProductDetailMetric,
) => {
  const normalizeBooleanLike = (value: unknown) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['1', 'true', 'yes', 'y', 'on', 'si', 'sí'].includes(normalized)) return true
      if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
    }
    return false
  }
  const products = dashboardStats?.businessMetrics?.report?.products || dashboardStats?.businessMetrics?.traceability?.products || []
  const totalNet = products.reduce((acc, item) => acc + Number(item.net_revenue ?? 0), 0)
  const totalShipping = Number(dashboardStats?.businessMetrics?.report?.sales?.shipping ?? dashboardStats?.businessMetrics?.salesSummary?.shipping ?? 0)

  const productMetaEntries = (adminProductsList || []).flatMap((product: any) => {
      const productIds = Array.from(new Set([
        String(product.internalId ?? '').trim(),
        String(product.id ?? '').trim(),
      ].filter(Boolean)))
      const cost = parseMoney(product.business?.cost ?? product.cost)
      const explicitTaxRate = Number(product?.tax?.rate)
      const taxExempt = normalizeBooleanLike(
        product?.tax?.exempt
        ?? product?.taxExempt
        ?? product?.attributes?.taxExempt
        ?? product?.attributes?.tax_exempt
      )
      const resolvedTaxRate = Number.isFinite(explicitTaxRate)
        ? Math.max(explicitTaxRate, 0)
        : (taxExempt ? 0 : Number(dashboardStats?.tax?.rate ?? 0))
      const explicitTaxMultiplier = Number(product?.tax?.multiplier)
      const taxMultiplier = Number.isFinite(explicitTaxMultiplier) && explicitTaxMultiplier > 0
        ? explicitTaxMultiplier
        : 1 + (resolvedTaxRate / 100)

      return productIds.map((productId) => [productId, {
        cost,
        taxMultiplier: taxMultiplier > 0 ? taxMultiplier : 1,
      }] as const)
    })
  const productMetaByProductId = new Map<string, { cost: number; taxMultiplier: number }>(
    productMetaEntries,
  )

  return products
    .map((item) => {
      const productMeta = productMetaByProductId.get(String(item.product_id ?? ''))
      const net = Number(item.net_revenue ?? 0)
      const shipping = Number(item.shipping_amount ?? (totalNet > 0 ? (totalShipping * net) / totalNet : 0))
      const fallbackGrossItems = productMeta ? (net * productMeta.taxMultiplier) : net
      const gross = Number(item.gross_revenue ?? (fallbackGrossItems + shipping))
      const vat = Number(item.vat_amount ?? Math.max(fallbackGrossItems - net, 0))
      const units = Number(item.units_sold ?? 0)
      const unitCost = productMeta?.cost ?? 0
      const cost = Number.isFinite(Number(item.cost))
        ? Math.max(Number(item.cost), 0)
        : Math.max(unitCost * units, 0)
      const profit = Number.isFinite(Number(item.profit))
        ? Number(item.profit)
        : net - cost
      const metricValue = selectedProductMetric === 'gross'
        ? gross
        : selectedProductMetric === 'vat'
          ? vat
          : selectedProductMetric === 'shipping'
            ? shipping
            : selectedProductMetric === 'profit'
              ? profit
              : net

      return {
        ...item,
        units,
        net,
        gross,
        vat,
        shipping,
        cost,
        profit,
        metricValue,
      }
    })
    .sort((a, b) => b.metricValue - a.metricValue)
}

export const buildInventoryProductBreakdown = (
  adminProductsList: any[],
  parseMoney: (value: any) => number,
) => {
  return (adminProductsList || [])
    .map((product: any) => {
      const quantity = Number(product.quantity ?? 0)
      const unitCost = parseMoney(product.inventory?.procurement?.weightedUnitCost ?? product.business?.cost ?? product.cost)
      const unitPrice = parseMoney(product.price)
      const inventoryCost = Math.max(parseMoney(product.inventory?.procurement?.remainingCostTotal) || (quantity * unitCost), 0)
      const inventoryMarket = Math.max(quantity * unitPrice, 0)
      return {
        id: String(product.id ?? ''),
        name: String(product.name ?? 'Producto sin nombre'),
        category: String(product.category ?? 'Sin categoría'),
        quantity,
        unitCost,
        unitPrice,
        inventoryCost,
        inventoryMarket,
      }
    })
    .sort((a, b) => b.inventoryCost - a.inventoryCost)
}
