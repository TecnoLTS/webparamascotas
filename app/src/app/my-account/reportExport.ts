import { formatDateTimeEcuador, formatMoney, getLocalSalePaymentMethodLabel } from './formatting'
import type {
  AdminReportSection,
  DashboardStats,
  PurchaseInvoiceSummary,
  SalesRankingRow,
} from './types'
import type { InventoryManagementRow } from './adminProductDerivations'

export type ReportFinancialSummary = {
  scopeLabel: string
  ordersCount: number
  gross: number
  net: number
  vat: number
  shipping: number
  cost: number
  grossProfit: number
  periodExpenses: number
  paidExpenses: number
  pendingExpenses: number
  overdueExpenses: number
  financialAdjustments: number
  netProfit: number
  flowProfit: number
  grossMargin: number
  netMargin: number
  flowMargin: number
  roi: number
  netRoi: number
  flowRoi: number
  averageOrderNet: number
}

type ExportContext = {
  section: AdminReportSection
  reportTitle: string
  generatedAt?: string | number | Date
  currentDateLabel: string
  selectedRankingMonth: string
  selectedRankingMonthLabel: string
  salesRankingView: 'month' | 'historical' | 'range'
  dashboardStats: DashboardStats | null
  financialScopeLabel: string
  financialSummary: ReportFinancialSummary
  salesOrders: Array<{
    id: string
    created_at: string
    status: string
    user_name?: string | null
    customer_email?: string | null
    customer_phone?: string | null
    customer_document_type?: string | null
    customer_document_number?: string | null
    payment_method?: string | null
    delivery_method?: string | null
    discount_code?: string | null
    discount_total?: number
    items_subtotal?: number
    vat_rate?: number
    shipping_base?: number
    shipping_tax_amount?: number
    item_lines_count?: number
    units_count?: number
    items_summary?: string
    gross: number
    net: number
    vat: number
    shipping: number
    cost?: number
    profit?: number
    margin?: number
    average_unit_net?: number
  }>
  salesRankingRows: SalesRankingRow[]
  salesCategories: Array<{ category: string; total: number }>
  salesTrendRows: Array<{ day: string; date?: string; total: number }>
  inventoryManagementRows: InventoryManagementRow[]
  recentPurchaseInvoices: PurchaseInvoiceSummary[]
}

type CellType = 'String' | 'Number'

type WorkbookCell = {
  value: string | number
  type?: CellType
  styleId?: string
  mergeAcross?: number
}

type WorksheetDefinition = {
  name: string
  rows: WorkbookCell[][]
  columnWidths?: number[]
}

const slugify = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const escapeXml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const toPlainNumber = (value: unknown): number => {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

const numberCell = (value: unknown, styleId = 'number'): WorkbookCell => ({
  value: toPlainNumber(value),
  type: 'Number',
  styleId,
})

const textCell = (value: unknown, styleId = 'text'): WorkbookCell => ({
  value: String(value ?? ''),
  type: 'String',
  styleId,
})

const percentCell = (value: unknown): WorkbookCell => ({
  value: toPlainNumber(value) / 100,
  type: 'Number',
  styleId: 'percent',
})

const moneyCell = (value: unknown): WorkbookCell => numberCell(value, 'currency')

const titleRow = (value: string, mergeAcross = 6): WorkbookCell[] => [
  { value, styleId: 'sheetTitle', mergeAcross, type: 'String' },
]

const subtitleRow = (value: string, mergeAcross = 6): WorkbookCell[] => [
  { value, styleId: 'sheetSubtitle', mergeAcross, type: 'String' },
]

const blankRow = (): WorkbookCell[] => []

const sectionTitleRow = (value: string, mergeAcross = 6): WorkbookCell[] => [
  { value, styleId: 'sectionTitle', mergeAcross, type: 'String' },
]

const metricRow = (label: string, cell: WorkbookCell): WorkbookCell[] => [
  textCell(label, 'label'),
  cell,
]

const headerRow = (headers: string[]): WorkbookCell[] => headers.map((header) => textCell(header, 'header'))

const getDeliveryMethodLabel = (method?: string | null): string => {
  const normalized = String(method || '').trim().toLowerCase()
  if (normalized === 'pickup') return 'Retiro en tienda'
  if (normalized === 'delivery') return 'Envío a domicilio'
  return normalized ? String(method) : 'Por definir'
}

const getPaymentMethodLabel = (method?: string | null): string => {
  const raw = String(method || '').trim()
  if (!raw) return 'Por definir'
  const label = getLocalSalePaymentMethodLabel(raw)
  return label === 'Otro' ? raw : label
}

const getCustomerDocument = (item: { customer_document_type?: string | null; customer_document_number?: string | null }): string => {
  const type = String(item.customer_document_type || '').trim()
  const number = String(item.customer_document_number || '').trim()
  return [type, number].filter(Boolean).join(' ') || '-'
}

const renderCell = (cell: WorkbookCell): string => {
  const style = cell.styleId ? ` ss:StyleID="${cell.styleId}"` : ''
  const mergeAcross = typeof cell.mergeAcross === 'number' && cell.mergeAcross > 0
    ? ` ss:MergeAcross="${cell.mergeAcross}"`
    : ''
  const type = cell.type ?? (typeof cell.value === 'number' ? 'Number' : 'String')
  return `<Cell${style}${mergeAcross}><Data ss:Type="${type}">${escapeXml(cell.value)}</Data></Cell>`
}

const renderWorksheet = (sheet: WorksheetDefinition): string => {
  const columns = (sheet.columnWidths ?? []).map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join('')
  const rows = sheet.rows.map((row) => `<Row>${row.map(renderCell).join('')}</Row>`).join('')
  return `
    <Worksheet ss:Name="${escapeXml(sheet.name)}">
      <Table>
        ${columns}
        ${rows}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <Selected/>
        <FreezePanes/>
        <FrozenNoSplit/>
        <SplitHorizontal>1</SplitHorizontal>
        <TopRowBottomPane>1</TopRowBottomPane>
        <Panes>
          <Pane>
            <Number>3</Number>
          </Pane>
        </Panes>
        <ProtectObjects>False</ProtectObjects>
        <ProtectScenarios>False</ProtectScenarios>
        <DisplayGridlines/>
      </WorksheetOptions>
    </Worksheet>
  `.trim()
}

const buildWorkbookXml = (worksheets: WorksheetDefinition[]): string => `
<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="sheetTitle">
      <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#EAF4FF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sheetSubtitle">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748B"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sectionTitle">
      <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#EEF2F7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#D9E7F5" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="label">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#334155"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="text">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="currency">
      <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/>
    </Style>
    <Style ss:ID="number">
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="integer">
      <NumberFormat ss:Format="#,##0"/>
    </Style>
    <Style ss:ID="percent">
      <NumberFormat ss:Format="0.00%"/>
    </Style>
  </Styles>
  ${worksheets.map(renderWorksheet).join('\n')}
</Workbook>
`.trim()

const getOrdersByStatusMap = (dashboardStats: DashboardStats | null) => new Map(
  (dashboardStats?.businessMetrics?.ordersByStatus ?? []).map((item) => [
    String(item.status ?? '').trim().toLowerCase(),
    Number(item.count ?? 0),
  ]),
)

const buildCoverSheet = (context: ExportContext): WorksheetDefinition => {
  const generatedAt = formatDateTimeEcuador(context.generatedAt ?? new Date())
  const periodReport = context.dashboardStats?.businessMetrics?.report
  return {
    name: 'Portada',
    columnWidths: [220, 220, 220, 220, 220, 220, 220],
    rows: [
      titleRow(context.reportTitle, 6),
      subtitleRow('Exportado desde el panel de reportes de Paramascotas. Libro compatible con Excel.', 6),
      blankRow(),
      metricRow('Reporte', textCell(context.reportTitle)),
      metricRow('Generado', textCell(generatedAt)),
      metricRow('Fecha visible', textCell(context.currentDateLabel)),
      metricRow('Sección', textCell(context.section)),
      metricRow('Alcance financiero', textCell(context.financialScopeLabel)),
      metricRow('Período reportado', textCell(periodReport?.period?.period_key ?? context.selectedRankingMonth)),
      metricRow('Rango reportado', textCell(periodReport ? `${periodReport.period.start_date} - ${periodReport.period.end_date}` : 'No disponible')),
      metricRow('Zona horaria contable', textCell(periodReport?.timezone ?? 'America/Guayaquil')),
      metricRow('Estados de venta incluidos', textCell((periodReport?.realized_statuses ?? ['completed', 'delivered']).join(', '))),
      ...(context.section === 'sales'
        ? [
            metricRow('Vista de ventas', textCell(context.salesRankingView === 'month' ? 'Mensual' : context.salesRankingView === 'range' ? 'Últimos 30 días' : 'Histórica')),
            metricRow('Mes seleccionado', textCell(context.salesRankingView === 'month' ? context.selectedRankingMonthLabel : 'No aplica')),
            metricRow('Clave mes', textCell(context.salesRankingView === 'month' ? context.selectedRankingMonth : 'No aplica')),
          ]
        : []),
    ],
  }
}

const buildGeneralWorksheets = (context: ExportContext): WorksheetDefinition[] => {
  const { dashboardStats, salesCategories, salesRankingRows } = context
  const financial = context.financialSummary
  const inventory = dashboardStats?.businessMetrics?.inventoryValue
  const traceability = dashboardStats?.businessMetrics?.traceability
  const statusMap = getOrdersByStatusMap(dashboardStats)
  const financialTrendRows = dashboardStats?.businessMetrics?.financialTrends?.monthly ?? []

  return [
    {
      name: 'Resumen',
      columnWidths: [240, 160, 160, 160, 160, 160, 160],
      rows: [
        titleRow('Resumen general', 4),
        subtitleRow('Vista ejecutiva consolidada del negocio.', 4),
        blankRow(),
        headerRow(['Indicador', 'Valor']),
        metricRow('Alcance financiero', textCell(financial.scopeLabel)),
        metricRow('Venta total', moneyCell(financial.gross)),
        metricRow('Venta neta', moneyCell(financial.net)),
        metricRow('IVA cobrado', moneyCell(financial.vat)),
        metricRow('Envío cobrado', moneyCell(financial.shipping)),
        metricRow('Costo vendido', moneyCell(financial.cost)),
        metricRow('Utilidad bruta', moneyCell(financial.grossProfit)),
        metricRow('Gastos del período', moneyCell(financial.periodExpenses)),
        metricRow('Gastos pagados', moneyCell(financial.paidExpenses)),
        metricRow('Obligaciones pendientes', moneyCell(financial.pendingExpenses)),
        metricRow('Obligaciones vencidas', moneyCell(financial.overdueExpenses)),
        metricRow('Utilidad neta', moneyCell(financial.netProfit)),
        metricRow('Utilidad neta pagada', moneyCell(financial.flowProfit)),
        metricRow('Margen bruto', percentCell(financial.grossMargin)),
        metricRow('Margen neto', percentCell(financial.netMargin)),
        metricRow('Margen neto pagado', percentCell(financial.flowMargin)),
        metricRow('ROI bruto', percentCell(financial.roi)),
        metricRow('ROI neto', percentCell(financial.netRoi)),
        metricRow('ROI neto pagado', percentCell(financial.flowRoi)),
        metricRow('Valor inventario al costo', moneyCell(inventory?.cost_value)),
        metricRow('Valor inventario a mercado', moneyCell(inventory?.market_value)),
        metricRow('Items en inventario', numberCell(inventory?.total_items, 'integer')),
        metricRow('Pedidos auditables', numberCell(traceability?.orders?.length, 'integer')),
        metricRow('Productos auditables', numberCell(traceability?.products?.length, 'integer')),
        metricRow('Categorías auditables', numberCell(traceability?.categories?.length, 'integer')),
        metricRow('Pedidos pendientes', numberCell(statusMap.get('pending') ?? 0, 'integer')),
        metricRow('Pedidos en proceso', numberCell(statusMap.get('processing') ?? 0, 'integer')),
      ],
    },
    {
      name: 'Tendencia financiera',
      columnWidths: [120, 140, 140, 140, 140, 140, 140, 140, 140, 140, 140],
      rows: [
        titleRow('Tendencia financiera mensual', 6),
        subtitleRow('Gastos y pagos se muestran por el mes al que pertenece el gasto.', 6),
        blankRow(),
        headerRow(['Mes', 'Venta neta', 'Costo', 'Utilidad bruta', 'Gastos del período', 'Gastos pagados', 'Pendientes', 'Vencidos', 'Ajustes', 'Utilidad neta', 'Utilidad neta pagada']),
        ...financialTrendRows.map((item) => [
          textCell(item.period),
          moneyCell(item.net_sales),
          moneyCell(item.product_cost),
          moneyCell(item.gross_profit),
          moneyCell(item.period_expenses ?? item.expenses_incurred ?? item.committed_expenses),
          moneyCell(item.expenses_cash_paid ?? item.expenses_paid),
          moneyCell(item.expenses_pending),
          moneyCell(item.expenses_overdue),
          moneyCell(item.financial_adjustments),
          moneyCell(item.net_period_profit ?? item.net_committed_profit),
          moneyCell(item.net_cash_profit),
        ]),
      ],
    },
    {
      name: 'Categorias',
      columnWidths: [220, 160, 160, 160],
      rows: [
        titleRow('Ventas por categoría', 2),
        blankRow(),
        headerRow(['Categoría', 'Total']),
        ...salesCategories.map((item) => [textCell(item.category), moneyCell(item.total)]),
      ],
    },
    {
      name: 'Top productos',
      columnWidths: [260, 180, 110, 110, 140, 140, 120],
      rows: [
        titleRow('Top productos', 5),
        blankRow(),
        headerRow(['Producto', 'Categoría', 'Pedidos', 'Unidades', 'Venta neta', 'Utilidad', 'Margen']),
        ...salesRankingRows.slice(0, 20).map((item) => [
          textCell(item.product_name),
          textCell(item.category),
          numberCell(item.orders_count, 'integer'),
          numberCell(item.units_sold, 'integer'),
          moneyCell(item.net_revenue),
          moneyCell(item.profit),
          percentCell(item.margin),
        ]),
      ],
    },
  ]
}

const buildSalesWorksheets = (context: ExportContext): WorksheetDefinition[] => {
  const { dashboardStats, salesRankingRows, selectedRankingMonth, selectedRankingMonthLabel, salesRankingView } = context
  const periodReport = dashboardStats?.businessMetrics?.report
  const financial = salesRankingView === 'month' && periodReport
    ? {
        orders_count: periodReport.sales.orders_count,
        gross: periodReport.sales.total,
        net: periodReport.sales.net,
        vat: periodReport.sales.tax,
        shipping: periodReport.sales.shipping,
        cost: periodReport.profit.cost,
        profit: periodReport.profit.gross_profit,
        margin: periodReport.profit.gross_margin,
      }
    : salesRankingView === 'range'
      ? dashboardStats?.businessMetrics?.productSalesRanking?.rangeFinancial
      : salesRankingView === 'month'
        ? dashboardStats?.businessMetrics?.productSalesRanking?.monthlyFinancial
        : dashboardStats?.businessMetrics?.productSalesRanking?.historicalFinancial
  const deepDive = dashboardStats?.businessMetrics?.salesDeepDive

  return [
    {
      name: 'Resumen',
      columnWidths: [240, 180, 180, 180, 180],
      rows: [
        titleRow('Resumen de ventas', 3),
        subtitleRow('Indicadores del período comercial seleccionado.', 3),
        blankRow(),
        headerRow(['Indicador', 'Valor']),
        metricRow('Vista activa', textCell(salesRankingView === 'month' ? 'Mensual' : salesRankingView === 'range' ? 'Últimos 30 días' : 'Histórica')),
        metricRow('Mes seleccionado', textCell(salesRankingView === 'month' ? selectedRankingMonthLabel : 'No aplica')),
        metricRow('Clave del mes', textCell(salesRankingView === 'month' ? selectedRankingMonth : 'No aplica')),
        metricRow('Pedidos', numberCell(financial?.orders_count, 'integer')),
        metricRow('Venta total', moneyCell(financial?.gross)),
        metricRow('Venta neta', moneyCell(financial?.net)),
        metricRow('IVA', moneyCell(financial?.vat)),
        metricRow('Envío cobrado', moneyCell(financial?.shipping)),
        metricRow('Costo vendido', moneyCell(financial?.cost)),
        metricRow('Utilidad bruta', moneyCell(financial?.profit)),
        metricRow('Margen', percentCell(financial?.margin)),
      ],
    },
    {
      name: 'Ventas del periodo',
      columnWidths: [260, 120, 100, 220, 220, 130, 140, 150, 130, 320, 80, 130, 130, 120, 120, 120, 120, 120, 100, 120, 120],
      rows: [
        titleRow('Ventas del período', 10),
        subtitleRow('Pedidos completados o entregados incluidos en el reporte seleccionado, con datos de auditoría comercial y financiera.', 10),
        blankRow(),
        headerRow([
          'Pedido',
          'Fecha',
          'Hora',
          'Cliente',
          'Email',
          'Teléfono',
          'Documento',
          'Entrega',
          'Pago',
          'Productos',
          'Unidades',
          'Subtotal items',
          'Venta total',
          'Venta neta',
          'IVA',
          'Envío',
          'Descuento',
          'Costo',
          'Utilidad',
          'Margen',
          'Estado',
        ]),
        ...context.salesOrders.map((item) => [
          textCell(item.id),
          textCell(formatDateTimeEcuador(item.created_at, { year: 'numeric', month: '2-digit', day: '2-digit' })),
          textCell(formatDateTimeEcuador(item.created_at, { hour: '2-digit', minute: '2-digit' })),
          textCell(item.user_name || 'Cliente sin nombre'),
          textCell(item.customer_email || '-'),
          textCell(item.customer_phone || '-'),
          textCell(getCustomerDocument(item)),
          textCell(getDeliveryMethodLabel(item.delivery_method)),
          textCell(getPaymentMethodLabel(item.payment_method)),
          textCell(item.items_summary || '-'),
          numberCell(item.units_count ?? 0, 'integer'),
          moneyCell(item.items_subtotal ?? 0),
          moneyCell(item.gross),
          moneyCell(item.net),
          moneyCell(item.vat),
          moneyCell(item.shipping),
          moneyCell(item.discount_total ?? 0),
          moneyCell(item.cost ?? 0),
          moneyCell(item.profit ?? 0),
          percentCell(item.margin ?? 0),
          textCell(item.status),
        ]),
      ],
    },
    {
      name: 'Ranking productos',
      columnWidths: [280, 180, 260, 100, 100, 130, 130, 110, 110, 130, 130, 100],
      rows: [
        titleRow('Ranking de productos', 9),
        subtitleRow('Ordenados por desempeño del período, con pedidos relacionados y desglose financiero.', 9),
        blankRow(),
        headerRow(['Producto', 'Categoría', 'Pedidos relacionados', 'Pedidos', 'Unidades', 'Venta total', 'Venta neta', 'IVA', 'Envío', 'Costo', 'Utilidad', 'Margen']),
        ...salesRankingRows.map((item) => [
          textCell(item.product_name),
          textCell(item.category),
          textCell(Array.isArray(item.order_refs) ? item.order_refs.join(', ') : '-'),
          numberCell(item.orders_count, 'integer'),
          numberCell(item.units_sold, 'integer'),
          moneyCell(item.gross_revenue),
          moneyCell(item.net_revenue),
          moneyCell(item.vat_amount),
          moneyCell(item.shipping_amount),
          moneyCell(item.cost),
          moneyCell(item.profit),
          percentCell(item.margin),
        ]),
      ],
    },
    {
      name: 'Categorias',
      columnWidths: [220, 160, 160, 160],
      rows: [
        titleRow('Comparativa por categorías', 2),
        blankRow(),
        headerRow(['Categoría', 'Periodo actual', 'Periodo previo', 'Crecimiento']),
        ...(deepDive?.categories ?? []).map((item) => [
          textCell(item.category),
          moneyCell(item.current),
          moneyCell(item.previous),
          percentCell(item.growth),
        ]),
      ],
    },
    {
      name: 'Tendencia diaria',
      columnWidths: [120, 140, 140],
      rows: [
        titleRow('Tendencia diaria', 2),
        blankRow(),
        headerRow(['Día', 'Actual', 'Anterior']),
        ...(deepDive?.daily?.current ?? []).map((item, index) => [
          textCell(item.day),
          moneyCell(item.total),
          moneyCell(deepDive?.daily?.previous?.[index]?.total ?? 0),
        ]),
      ],
    },
  ]
}

const buildBalanceWorksheets = (context: ExportContext): WorksheetDefinition[] => {
  const { dashboardStats } = context
  const financial = context.financialSummary
  const financialTrendRows = dashboardStats?.businessMetrics?.financialTrends?.monthly ?? []

  return [
    {
      name: 'Resumen',
      columnWidths: [240, 180, 180, 180],
      rows: [
        titleRow('Balance financiero', 3),
        subtitleRow('Resultado económico del período realizado.', 3),
        blankRow(),
        headerRow(['Indicador', 'Valor']),
        metricRow('Alcance financiero', textCell(financial.scopeLabel)),
        metricRow('Venta total', moneyCell(financial.gross)),
        metricRow('Venta neta', moneyCell(financial.net)),
        metricRow('IVA cobrado', moneyCell(financial.vat)),
        metricRow('Envío cobrado', moneyCell(financial.shipping)),
        metricRow('Costo vendido', moneyCell(financial.cost)),
        metricRow('Utilidad bruta', moneyCell(financial.grossProfit)),
        metricRow('Gastos del período', moneyCell(financial.periodExpenses)),
        metricRow('Gastos pagados', moneyCell(financial.paidExpenses)),
        metricRow('Obligaciones pendientes', moneyCell(financial.pendingExpenses)),
        metricRow('Obligaciones vencidas', moneyCell(financial.overdueExpenses)),
        metricRow('Utilidad neta', moneyCell(financial.netProfit)),
        metricRow('Utilidad neta pagada', moneyCell(financial.flowProfit)),
        metricRow('Margen bruto', percentCell(financial.grossMargin)),
        metricRow('Margen neto', percentCell(financial.netMargin)),
        metricRow('Margen neto pagado', percentCell(financial.flowMargin)),
        metricRow('ROI bruto', percentCell(financial.roi)),
        metricRow('ROI neto', percentCell(financial.netRoi)),
        metricRow('ROI neto pagado', percentCell(financial.flowRoi)),
      ],
    },
    {
      name: 'Tendencia financiera',
      columnWidths: [120, 140, 140, 140, 140, 140, 140, 140, 140, 140, 140],
      rows: [
        titleRow('Tendencia financiera mensual', 6),
        blankRow(),
        headerRow(['Mes', 'Venta neta', 'Costo', 'Utilidad bruta', 'Gastos del período', 'Gastos pagados', 'Pendientes', 'Vencidos', 'Ajustes', 'Utilidad neta', 'Utilidad neta pagada']),
        ...financialTrendRows.map((item) => [
          textCell(item.period),
          moneyCell(item.net_sales),
          moneyCell(item.product_cost),
          moneyCell(item.gross_profit),
          moneyCell(item.period_expenses ?? item.expenses_incurred ?? item.committed_expenses),
          moneyCell(item.expenses_cash_paid ?? item.expenses_paid),
          moneyCell(item.expenses_pending),
          moneyCell(item.expenses_overdue),
          moneyCell(item.financial_adjustments),
          moneyCell(item.net_period_profit ?? item.net_committed_profit),
          moneyCell(item.net_cash_profit),
        ]),
      ],
    },
    {
      name: 'Pedidos recientes',
      columnWidths: [260, 200, 120, 180, 120],
      rows: [
        titleRow('Pedidos realizados recientes', 4),
        blankRow(),
        headerRow(['Pedido', 'Cliente', 'Estado', 'Fecha y hora', 'Total']),
        ...(dashboardStats?.businessMetrics?.recentOrders ?? []).map((item) => [
          textCell(item.id),
          textCell(item.user_name),
          textCell(item.status),
          textCell(formatDateTimeEcuador(item.created_at)),
          moneyCell(item.total),
        ]),
      ],
    },
  ]
}

const buildInventoryWorksheets = (context: ExportContext): WorksheetDefinition[] => {
  const { dashboardStats, inventoryManagementRows, recentPurchaseInvoices } = context
  const inventory = dashboardStats?.businessMetrics?.inventoryValue
  const health = dashboardStats?.businessMetrics?.inventoryDeepDive?.health

  return [
    {
      name: 'Resumen',
      columnWidths: [240, 180, 180, 180],
      rows: [
        titleRow('Resumen de inventario', 3),
        blankRow(),
        headerRow(['Métrica', 'Valor']),
        metricRow('Valor al costo', moneyCell(inventory?.cost_value)),
        metricRow('Valor a mercado', moneyCell(inventory?.market_value)),
        metricRow('Items monitoreados', numberCell(inventory?.total_items, 'integer')),
        metricRow('Sin stock', numberCell(health?.out_of_stock, 'integer')),
        metricRow('Bajo stock', numberCell(health?.low_stock, 'integer')),
        metricRow('Sobrestock', numberCell(health?.overstock, 'integer')),
        metricRow('Por vencer', numberCell(health?.expiring_products, 'integer')),
        metricRow('Vencidos', numberCell(health?.expired_products, 'integer')),
      ],
    },
    {
      name: 'Detalle SKU',
      columnWidths: [260, 140, 120, 200, 70, 90, 100, 100, 110, 110, 110, 110, 110, 160, 140, 150, 140, 140, 100, 100],
      rows: [
        titleRow('Detalle por SKU', 10),
        blankRow(),
        headerRow(['Producto', 'Categoría', 'Tipo', 'SKU', 'Stock', 'Estado', 'PVP', 'Costo', 'Costo pond.', 'Valor costo', 'Valor mercado', 'Margen pond.', 'Utilidad pond.', 'Lote', 'Ubicación', 'Proveedor', 'Factura', 'Emitida', 'Cant. última', 'Costo última']),
        ...inventoryManagementRows.map((item) => [
          textCell(item.name),
          textCell(item.category),
          textCell(item.productType),
          textCell(item.sku),
          numberCell(item.stock, 'integer'),
          textCell(item.stockStatus),
          moneyCell(item.unitPrice),
          moneyCell(item.unitCost),
          moneyCell(item.weightedUnitCost),
          moneyCell(item.inventoryCost),
          moneyCell(item.inventoryMarket),
          percentCell(item.weightedMargin),
          moneyCell(item.weightedProfit),
          textCell(item.lotCode),
          textCell(item.storageLocation),
          textCell(item.supplier),
          textCell(item.lastPurchaseInvoiceNumber || item.lastPurchaseInvoiceId),
          textCell(item.lastPurchaseIssuedAt ? formatDateTimeEcuador(item.lastPurchaseIssuedAt) : ''),
          numberCell(item.lastPurchaseQuantity, 'integer'),
          moneyCell(item.lastPurchaseUnitCost),
        ]),
      ],
    },
    {
      name: 'Facturas compra',
      columnWidths: [140, 200, 140, 160, 110, 110, 110, 80, 90, 90],
      rows: [
        titleRow('Facturas de compra recientes', 5),
        blankRow(),
        headerRow(['Factura', 'Proveedor', 'Documento', 'Emitida', 'Subtotal', 'Impuestos', 'Total', 'Items', 'Unidades', 'Productos']),
        ...recentPurchaseInvoices.map((item) => [
          textCell(item.invoice_number),
          textCell(item.supplier_name),
          textCell(item.supplier_document ?? ''),
          textCell(formatDateTimeEcuador(item.issued_at)),
          moneyCell(item.subtotal),
          moneyCell(item.tax_total),
          moneyCell(item.total),
          numberCell(item.items_count, 'integer'),
          numberCell(item.units_total, 'integer'),
          numberCell(item.products_count, 'integer'),
        ]),
      ],
    },
  ]
}

const buildTraceabilityWorksheets = (context: ExportContext): WorksheetDefinition[] => {
  const traceability = context.dashboardStats?.businessMetrics?.traceability
  return [
    {
      name: 'Pedidos',
      columnWidths: [260, 180, 120, 180, 120, 120, 100, 100],
      rows: [
        titleRow('Trazabilidad por pedido', 5),
        blankRow(),
        headerRow(['Pedido', 'Fecha y hora', 'Estado', 'Cliente', 'Venta total', 'Venta neta', 'IVA', 'Envío']),
        ...(traceability?.orders ?? []).map((item) => [
          textCell(item.id),
          textCell(formatDateTimeEcuador(item.created_at)),
          textCell(item.status),
          textCell(item.user_name ?? ''),
          moneyCell(item.gross),
          moneyCell(item.net),
          moneyCell(item.vat),
          moneyCell(item.shipping),
        ]),
      ],
    },
    {
      name: 'Productos',
      columnWidths: [280, 180, 90, 120, 120, 100, 100, 320],
      rows: [
        titleRow('Trazabilidad por producto', 5),
        blankRow(),
        headerRow(['Producto', 'Categoría', 'Unidades', 'Venta total', 'Venta neta', 'IVA', 'Envío', 'Pedidos vinculados']),
        ...(traceability?.products ?? []).map((item) => [
          textCell(item.product_name),
          textCell(item.category),
          numberCell(item.units_sold, 'integer'),
          moneyCell(item.gross_revenue),
          moneyCell(item.net_revenue),
          moneyCell(item.vat_amount),
          moneyCell(item.shipping_amount),
          textCell((item.order_refs ?? []).join(', ')),
        ]),
      ],
    },
    {
      name: 'Categorias',
      columnWidths: [220, 120, 120, 100, 100, 320],
      rows: [
        titleRow('Trazabilidad por categoría', 4),
        blankRow(),
        headerRow(['Categoría', 'Venta total', 'Venta neta', 'IVA', 'Envío', 'Pedidos vinculados']),
        ...(traceability?.categories ?? []).map((item) => [
          textCell(item.category),
          moneyCell(item.gross_revenue),
          moneyCell(item.net_revenue),
          moneyCell(item.vat_amount),
          moneyCell(item.shipping_amount),
          textCell((item.order_refs ?? []).join(', ')),
        ]),
      ],
    },
  ]
}

const buildWorksheets = (context: ExportContext): WorksheetDefinition[] => {
  const sheets: WorksheetDefinition[] = [buildCoverSheet(context)]
  if (context.section === 'general') sheets.push(...buildGeneralWorksheets(context))
  if (context.section === 'sales') sheets.push(...buildSalesWorksheets(context))
  if (context.section === 'balance') sheets.push(...buildBalanceWorksheets(context))
  if (context.section === 'inventory') sheets.push(...buildInventoryWorksheets(context))
  if (context.section === 'traceability') sheets.push(...buildTraceabilityWorksheets(context))
  return sheets
}

export const buildReportExport = (context: ExportContext): { filename: string; content: string } => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return {
    filename: `${slugify(context.reportTitle)}-${stamp}.xls`,
    content: buildWorkbookXml(buildWorksheets(context)),
  }
}

export const downloadReportExport = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
