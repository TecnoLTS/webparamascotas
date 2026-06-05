import type {
  DashboardStats,
  InventoryIntelligence,
  InventoryIntelligenceRow,
  ProductDetailMetric,
  ProductRankingActionItem,
  ProductRankingDecisionAction,
  ProductRankingDecisionRow,
  PurchaseInvoiceSummary,
  ReportPeriodSummary,
  SalesRankingRow,
  TraceabilityIssue,
  TraceabilityIssueSeverity,
  TraceabilitySummary,
} from './types'

type ProductSalesRanking = DashboardStats['businessMetrics'] extends infer BM
  ? BM extends { productSalesRanking?: infer PR } ? PR : never
  : never

type SalesTrendRow = { day: string; date?: string; total: number }

type TraceabilitySource = Pick<ReportPeriodSummary, 'orders' | 'products' | 'categories' | 'sales' | 'profit'> | null | undefined

const toNumber = (value: unknown): number => {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

const toText = (value: unknown): string => String(value ?? '').trim()

const toOrderRefs = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean)
  }
  return toText(value).split(',').map((item) => item.trim()).filter(Boolean)
}

const percentOf = (part: number, total: number): number => total > 0 ? (part / total) * 100 : 0

export const getRankingActionLabel = (action?: string): string => {
  switch (action) {
    case 'restock_now':
      return 'Comprar ahora'
    case 'restock_soon':
      return 'Reponer pronto'
    case 'rotate_or_discount':
      return 'Rotar o liquidar'
    case 'remove_expired':
      return 'Retirar vencido'
    case 'reduce_or_promote':
      return 'Promover sobrestock'
    case 'fix_data':
    case 'fix_cost':
      return 'Corregir costo'
    case 'protect_margin':
      return 'Proteger margen'
    case 'review_assortment':
      return 'Revisar surtido'
    case 'review_no_sales':
      return 'Revisar sin movimiento'
    case 'monitor':
    default:
      return 'Monitorear'
  }
}

const severityWeight: Record<TraceabilityIssueSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
}

const traceabilityIssueSort = (a: TraceabilityIssue, b: TraceabilityIssue) => {
  const severityDelta = severityWeight[b.severity] - severityWeight[a.severity]
  if (severityDelta !== 0) return severityDelta
  return toNumber(b.impact) - toNumber(a.impact)
}

const getInventoryRowKeys = (row: InventoryIntelligenceRow) => [
  row.product_id,
  row.legacy_id,
].map((value) => toText(value)).filter(Boolean)

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

export const buildTraceabilitySummary = (source: TraceabilitySource): TraceabilitySummary => {
  const orders = source?.orders ?? []
  const products = source?.products ?? []
  const categories = source?.categories ?? []
  const grossSales = toNumber(source?.sales?.total) || orders.reduce((acc, order) => acc + toNumber(order.gross), 0)
  const netSales = toNumber(source?.sales?.net) || orders.reduce((acc, order) => acc + toNumber(order.net), 0)
  const vat = toNumber(source?.sales?.tax) || orders.reduce((acc, order) => acc + toNumber(order.vat), 0)
  const shipping = toNumber(source?.sales?.shipping) || orders.reduce((acc, order) => acc + toNumber(order.shipping), 0)
  const cost = toNumber(source?.profit?.cost) || products.reduce((acc, product) => acc + toNumber(product.cost), 0)
  const grossProfit = toNumber(source?.profit?.gross_profit) || (netSales - cost)
  const grossMargin = toNumber(source?.profit?.gross_margin) || percentOf(grossProfit, netSales)

  const ordersWithContact = orders.filter((order) => toText(order.customer_email) || toText(order.customer_phone)).length
  const ordersWithDocument = orders.filter((order) => toText(order.customer_document_number)).length
  const ordersWithPayment = orders.filter((order) => toText(order.payment_method)).length
  const ordersWithDelivery = orders.filter((order) => toText(order.delivery_method)).length
  const productsWithOrderRefs = products.filter((product) => toOrderRefs(product.order_refs).length > 0).length
  const productsWithCost = products.filter((product) => toNumber(product.units_sold) <= 0 || toNumber(product.cost) > 0).length

  const coverageParts = [
    orders.length > 0 ? ordersWithContact / orders.length : 1,
    orders.length > 0 ? ordersWithDocument / orders.length : 1,
    orders.length > 0 ? ordersWithPayment / orders.length : 1,
    orders.length > 0 ? ordersWithDelivery / orders.length : 1,
    products.length > 0 ? productsWithOrderRefs / products.length : 1,
    products.length > 0 ? productsWithCost / products.length : 1,
  ]
  const coverageScore = coverageParts.length > 0
    ? (coverageParts.reduce((acc, item) => acc + item, 0) / coverageParts.length) * 100
    : 100

  const issues = buildTraceabilityIssues(source)

  return {
    ordersAudited: orders.length,
    productsAudited: products.length,
    categoriesAudited: categories.length,
    grossSales,
    netSales,
    vat,
    shipping,
    cost,
    grossProfit,
    grossMargin,
    coverageScore,
    ordersWithContact,
    ordersWithDocument,
    ordersWithPayment,
    ordersWithDelivery,
    productsWithOrderRefs,
    productsWithCost,
    issuesCount: issues.length,
    criticalIssues: issues.filter((issue) => issue.severity === 'critical').length,
    warningIssues: issues.filter((issue) => issue.severity === 'warning').length,
    infoIssues: issues.filter((issue) => issue.severity === 'info').length,
  }
}

export const buildTraceabilityIssues = (source: TraceabilitySource): TraceabilityIssue[] => {
  const issues: TraceabilityIssue[] = []
  const orders = source?.orders ?? []
  const products = source?.products ?? []

  const addIssue = (issue: Omit<TraceabilityIssue, 'id'>) => {
    issues.push({
      ...issue,
      id: `${issue.type}:${issue.entityType}:${issue.entityId}`,
    })
  }

  for (const order of orders) {
    const orderId = toText(order.id)
    const orderLabel = orderId ? `Pedido #${orderId}` : 'Pedido sin identificador'
    const hasContact = Boolean(toText(order.customer_email) || toText(order.customer_phone))
    const hasDocument = Boolean(toText(order.customer_document_number))
    const hasPayment = Boolean(toText(order.payment_method))
    const hasDelivery = Boolean(toText(order.delivery_method))
    const impact = toNumber(order.net)

    if (!hasContact) {
      addIssue({
        severity: 'warning',
        type: 'missing_contact',
        entityType: 'order',
        entityId: orderId,
        orderId,
        title: `${orderLabel} sin contacto`,
        detail: 'No hay email ni telefono para validar postventa, facturacion o entrega.',
        impact,
        actionLabel: 'Ver pedido',
      })
    }
    if (!hasDocument) {
      addIssue({
        severity: 'warning',
        type: 'missing_document',
        entityType: 'order',
        entityId: orderId,
        orderId,
        title: `${orderLabel} sin documento`,
        detail: 'Falta identificacion del cliente para una trazabilidad comercial completa.',
        impact,
        actionLabel: 'Ver pedido',
      })
    }
    if (!hasPayment) {
      addIssue({
        severity: 'info',
        type: 'missing_payment',
        entityType: 'order',
        entityId: orderId,
        orderId,
        title: `${orderLabel} sin forma de pago`,
        detail: 'La venta no tiene metodo de pago registrado en el resumen auditado.',
        impact,
        actionLabel: 'Ver pedido',
      })
    }
    if (!hasDelivery) {
      addIssue({
        severity: 'info',
        type: 'missing_delivery',
        entityType: 'order',
        entityId: orderId,
        orderId,
        title: `${orderLabel} sin entrega`,
        detail: 'La venta no tiene metodo de entrega registrado en el resumen auditado.',
        impact,
        actionLabel: 'Ver pedido',
      })
    }
  }

  for (const product of products) {
    const productId = toText(product.product_id)
    const productName = toText(product.product_name) || 'Producto sin nombre'
    const category = toText(product.category) || 'Sin categoria'
    const units = toNumber(product.units_sold)
    const net = toNumber(product.net_revenue)
    const cost = toNumber(product.cost)
    const profit = toNumber(product.profit)
    const margin = toNumber(product.margin)
    const refs = toOrderRefs(product.order_refs)

    if (units > 0 && cost <= 0) {
      addIssue({
        severity: 'critical',
        type: 'cost_zero',
        entityType: 'product',
        entityId: productId || productName,
        productId,
        productName,
        category,
        title: `${productName} vendido sin costo`,
        detail: 'La utilidad queda inflada porque el costo vendido es cero.',
        impact: net,
        actionLabel: 'Registrar compra',
      })
    }
    if (units > 0 && profit < 0) {
      addIssue({
        severity: 'critical',
        type: 'negative_margin',
        entityType: 'product',
        entityId: productId || productName,
        productId,
        productName,
        category,
        title: `${productName} con margen negativo`,
        detail: `Pierde dinero en el periodo auditado: utilidad ${profit.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
        impact: Math.abs(profit),
        actionLabel: 'Abrir producto',
      })
    } else if (units > 0 && margin > 0 && margin < 15) {
      addIssue({
        severity: 'warning',
        type: 'low_margin',
        entityType: 'product',
        entityId: productId || productName,
        productId,
        productName,
        category,
        title: `${productName} con margen bajo`,
        detail: `Margen bruto ${margin.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%. Revisar precio, costo o descuento.`,
        impact: net,
        actionLabel: 'Abrir producto',
      })
    }
    if (refs.length === 0) {
      addIssue({
        severity: 'warning',
        type: 'missing_order_refs',
        entityType: 'product',
        entityId: productId || productName,
        productId,
        productName,
        category,
        title: `${productName} sin pedidos vinculados`,
        detail: 'El producto aparece vendido pero no trae referencias de pedidos en el reporte.',
        impact: net,
        actionLabel: 'Abrir producto',
      })
    }
    if (!productId || !toText(product.product_name) || !toText(product.category)) {
      addIssue({
        severity: 'info',
        type: 'incomplete_product_data',
        entityType: 'product',
        entityId: productId || productName,
        productId,
        productName,
        category,
        title: `${productName} con ficha incompleta`,
        detail: 'Faltan identificador, nombre o categoria para auditar bien el mix comercial.',
        impact: net,
        actionLabel: 'Abrir producto',
      })
    }
  }

  return issues.sort(traceabilityIssueSort)
}

export const buildProductRankingDecisionRows = (
  salesRows: SalesRankingRow[],
  inventoryIntelligence?: InventoryIntelligence | null,
): ProductRankingDecisionRow[] => {
  const totalNet = salesRows.reduce((acc, item) => acc + toNumber(item.net_revenue), 0)
  const inventoryById = new Map<string, InventoryIntelligenceRow>()

  for (const row of inventoryIntelligence?.rows ?? []) {
    for (const key of getInventoryRowKeys(row)) {
      inventoryById.set(key, row)
    }
  }

  return salesRows.map((row) => {
    const inventory = inventoryById.get(toText(row.product_id))
    const units = toNumber(row.units_sold)
    const net = toNumber(row.net_revenue)
    const cost = toNumber(row.cost)
    const profit = toNumber(row.profit)
    const margin = toNumber(row.margin)
    const unitNet = units > 0 ? net / units : 0
    const unitCost = units > 0 ? cost / units : toNumber(inventory?.unit_cost)
    const unitProfit = units > 0 ? profit / units : unitNet - unitCost
    const stock = inventory ? toNumber(inventory.quantity) : null
    const coverageDays = inventory?.coverage_days === null || inventory?.coverage_days === undefined
      ? null
      : toNumber(inventory.coverage_days)
    let action = (inventory?.recommended_action ?? 'monitor') as ProductRankingDecisionAction
    let priority = toNumber(inventory?.priority_score)
    let reason = 'Venta estable; mantener seguimiento.'

    if (units > 0 && cost <= 0) {
      action = 'fix_cost'
      priority = Math.max(priority, 100)
      reason = 'Producto vendido sin costo registrado; corregir antes de decidir precio o reposicion.'
    } else if (margin < 0) {
      action = 'protect_margin'
      priority = Math.max(priority, 96)
      reason = 'Margen negativo en ventas realizadas; revisar costo, precio y descuentos.'
    } else if (stock !== null && stock <= 0 && units > 0) {
      action = 'restock_now'
      priority = Math.max(priority, 92)
      reason = 'Producto vendido en el periodo y sin stock disponible.'
    } else if (margin > 0 && margin < 15) {
      action = 'protect_margin'
      priority = Math.max(priority, 78)
      reason = 'Margen bajo; proteger precio o negociar costo antes de empujar volumen.'
    } else if (inventory?.status === 'overstock' || inventory?.recommended_action === 'reduce_or_promote') {
      action = 'reduce_or_promote'
      priority = Math.max(priority, 58)
      reason = 'Hay capital inmovilizado; promover rotacion sin sacrificar margen.'
    } else if (inventory?.recommended_action === 'restock_now' || inventory?.recommended_action === 'restock_soon') {
      action = inventory.recommended_action
      priority = Math.max(priority, inventory.recommended_action === 'restock_now' ? 88 : 70)
      reason = inventory.recommended_action === 'restock_now'
        ? 'La inteligencia de inventario recomienda compra inmediata.'
        : 'La cobertura se esta acercando al punto de reposicion.'
    } else if (inventory?.quality_issues?.length) {
      action = 'fix_data'
      priority = Math.max(priority, 62)
      reason = 'La ficha o los lotes tienen datos por completar.'
    }

    return {
      ...row,
      sku: toText((row as any).sku) || toText(inventory?.sku),
      contribution_pct: percentOf(net, totalNet),
      stock_current: stock,
      coverage_days: coverageDays,
      recommended_action: action,
      action_label: getRankingActionLabel(action),
      action_reason: reason,
      priority_score: priority,
      supplier: toText(inventory?.supplier) || 'Sin proveedor',
      suggested_purchase_qty: toNumber(inventory?.suggested_purchase_qty),
      suggested_purchase_cost: toNumber(inventory?.suggested_purchase_cost),
      unit_net: unitNet,
      unit_cost: unitCost,
      unit_profit: unitProfit,
      inventory_status: inventory?.status,
      inventory_quality_issues: inventory?.quality_issues ?? [],
    }
  })
}

export const buildProductRankingActionItems = (
  decisionRows: ProductRankingDecisionRow[],
  inventoryIntelligence?: InventoryIntelligence | null,
): ProductRankingActionItem[] => {
  const itemsById = new Map<string, ProductRankingActionItem>()
  const soldProductIds = new Set(decisionRows.map((row) => toText(row.product_id)).filter(Boolean))
  const upsertItem = (item: ProductRankingActionItem) => {
    const current = itemsById.get(item.id)
    if (
      !current
      || severityWeight[item.severity] > severityWeight[current.severity]
      || (severityWeight[item.severity] === severityWeight[current.severity] && item.priority_score > current.priority_score)
    ) {
      itemsById.set(item.id, item)
    }
  }

  for (const row of decisionRows) {
    if (['monitor', 'review_assortment'].includes(row.recommended_action) && row.priority_score < 55) continue
    const severity: TraceabilityIssueSeverity = row.priority_score >= 90
      ? 'critical'
      : row.priority_score >= 65
        ? 'warning'
        : 'info'
    upsertItem({
      id: `ranking:${row.recommended_action}:${row.product_id}`,
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      category: row.category,
      action: row.recommended_action,
      action_label: row.action_label,
      detail: row.action_reason,
      priority_score: row.priority_score,
      severity,
      stock_current: row.stock_current,
      coverage_days: row.coverage_days,
      supplier: row.supplier,
      suggested_purchase_qty: row.suggested_purchase_qty,
      suggested_purchase_cost: row.suggested_purchase_cost,
    })
  }

  for (const inventory of inventoryIntelligence?.rows ?? []) {
    const productId = toText(inventory.product_id)
    if (!productId || soldProductIds.has(productId)) continue
    const hasNoMovement = toNumber(inventory.units_sold_window) <= 0 && toNumber(inventory.quantity) > 0
    const hasOverstock = inventory.status === 'overstock' || inventory.recommended_action === 'reduce_or_promote'
    if (!hasNoMovement && !hasOverstock) continue

    upsertItem({
      id: `inventory:${productId}`,
      product_id: productId,
      product_name: inventory.name,
      sku: inventory.sku,
      category: inventory.category || 'Sin categoria',
      action: hasOverstock ? 'reduce_or_promote' : 'review_no_sales',
      action_label: getRankingActionLabel(hasOverstock ? 'reduce_or_promote' : 'review_no_sales'),
      detail: hasOverstock
        ? 'SKU con sobrestock o capital inmovilizado; crear rotacion controlada.'
        : 'SKU con inventario disponible y sin ventas en la ventana de inventario.',
      priority_score: Math.max(toNumber(inventory.priority_score), hasOverstock ? 55 : 35),
      severity: hasOverstock ? 'warning' : 'info',
      stock_current: toNumber(inventory.quantity),
      coverage_days: inventory.coverage_days === null ? null : toNumber(inventory.coverage_days),
      supplier: toText(inventory.supplier) || 'Sin proveedor',
      suggested_purchase_qty: 0,
      suggested_purchase_cost: 0,
    })
  }

  return Array.from(itemsById.values())
    .sort((a, b) => {
      const severityDelta = severityWeight[b.severity] - severityWeight[a.severity]
      if (severityDelta !== 0) return severityDelta
      return b.priority_score - a.priority_score
    })
    .slice(0, 12)
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
  stockStatus: 'available' | 'low' | 'critical' | 'out' | 'expiring' | 'expired'
  reorderPoint?: number
  criticalPoint?: number
}>) => {
  return inventoryManagementRows.reduce((acc, row) => {
    acc.totalSkus += 1
    acc.totalUnits += row.stock
    acc.totalCost += row.inventoryCost
    acc.totalMarket += row.inventoryMarket
    if (row.stockStatus === 'out') acc.out += 1
    if (row.stockStatus === 'critical') acc.critical += 1
    if (row.stockStatus === 'low') acc.low += 1
    if (row.stockStatus === 'expiring') acc.expiring += 1
    if (row.stockStatus === 'expired') acc.expired += 1
    return acc
  }, { totalSkus: 0, totalUnits: 0, totalCost: 0, totalMarket: 0, out: 0, critical: 0, low: 0, expiring: 0, expired: 0 })
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
