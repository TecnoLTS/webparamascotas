import type { AdminReportSection } from './types'

export const REPORT_SECTION_META: Record<AdminReportSection, { title: string; subtitle: string }> = {
  general: {
    title: 'Reporte general',
    subtitle: 'Vista ejecutiva con salud operativa, ventas netas, utilidad e inventario crítico.',
  },
  sales: {
    title: 'Reporte de ventas',
    subtitle: 'Corte comercial con pedidos vendidos, ventas brutas y netas, mix por categoría y productos líderes.',
  },
  balance: {
    title: 'Balance general',
    subtitle: 'Lectura financiera de ingresos, IVA, costo de venta, gastos y utilidad neta.',
  },
  inventory: {
    title: 'Reporte de inventario',
    subtitle: 'Capital en inventario, valor potencial de venta, disponibilidad, stock crítico y vencimientos.',
  },
  traceability: {
    title: 'Reporte de trazabilidad',
    subtitle: 'Auditoría de soporte por pedido, producto y categoría para validar ventas y rentabilidad.',
  },
}
