'use client'

export const ECUADOR_SRI_VAT_RATES = [0, 5, 12, 13, 14, 15] as const

export function isSupportedEcuadorSriVatRate(value: unknown): boolean {
  const rate = Number(value)
  return Number.isFinite(rate) && ECUADOR_SRI_VAT_RATES.some((supportedRate) => supportedRate === rate)
}

type TaxesPanelProps = {
  vatRate: number
  vatCreditCurrentRate: number
  vatCreditCarryforwardRate: number
  vatCreditCurrentDisplayRate: number
  vatCreditCarryforwardDisplayRate: number
  vatLoading: boolean
  vatSaving: boolean
  vatConfigurationReady: boolean
  setVatRate: (value: number) => void
  setVatCreditCurrentRate: (value: number) => void
  setVatCreditCarryforwardRate: (value: number) => void
  onSaveVat: () => void
  onOpenShipments: () => void
}

export default function TaxesPanel({
  vatRate,
  vatCreditCurrentRate,
  vatCreditCarryforwardRate,
  vatCreditCurrentDisplayRate,
  vatCreditCarryforwardDisplayRate,
  vatLoading,
  vatSaving,
  vatConfigurationReady,
  setVatRate,
  setVatCreditCurrentRate,
  setVatCreditCarryforwardRate,
  onSaveVat,
  onOpenShipments,
}: TaxesPanelProps) {
  return (
    <div className="tab text-content w-full">
      <div className="heading5 pb-4">Impuestos y cargos</div>
      <p className="text-secondary mb-6">Configura IVA general y comportamiento tributario SRI usado por el balance. La operación de envíos y mapa está en la pestaña <span className="font-semibold text-black">Envíos y mapa</span>.</p>
      <div className="mb-8 p-6 rounded-xl border border-line bg-surface">
        {!vatConfigurationReady ? (
          <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            La configuración tributaria canónica no está disponible. Recarga el panel; no se muestran ni guardan valores de respaldo.
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,1fr,1fr,auto] lg:items-end">
          <div className="group">
            <label
              htmlFor="vatRate"
              className="text-secondary text-xs uppercase font-bold mb-2 block"
              title="Incrementa el precio final del cliente. El IVA no cuenta como utilidad."
            >
              IVA (%)
            </label>
            <select
              id="vatRate"
              className="border border-line px-4 py-2 rounded-lg w-full"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              disabled={vatLoading || vatSaving}
            >
              {ECUADOR_SRI_VAT_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
            <p className="text-secondary text-xs mt-2">Los precios del catálogo se muestran con IVA incluido.</p>
            <p className="text-[11px] text-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Subir el IVA aumenta el total pagado por el cliente, pero no cambia la utilidad del producto.
            </p>
          </div>
          <div>
            <label htmlFor="vatCreditCurrentRate" className="text-secondary text-xs uppercase font-bold mb-2 block">
              Credito utilizable (%)
            </label>
            <input
              id="vatCreditCurrentRate"
              type="number"
              step="1"
              min="0"
              max="100"
              className="border border-line px-4 py-2 rounded-lg w-full"
              value={vatCreditCurrentRate}
              onChange={(e) => setVatCreditCurrentRate(Number(e.target.value))}
              disabled={vatLoading || vatSaving}
            />
            <p className="text-secondary text-xs mt-2">Porcentaje del IVA de compras aplicable al período actual.</p>
          </div>
          <div>
            <label htmlFor="vatCreditCarryforwardRate" className="text-secondary text-xs uppercase font-bold mb-2 block">
              Credito diferido (%)
            </label>
            <input
              id="vatCreditCarryforwardRate"
              type="number"
              step="1"
              min="0"
              max="100"
              className="border border-line px-4 py-2 rounded-lg w-full"
              value={vatCreditCarryforwardRate}
              onChange={(e) => setVatCreditCarryforwardRate(Number(e.target.value))}
              disabled={vatLoading || vatSaving}
            />
            <p className="text-secondary text-xs mt-2">Porcentaje que se reserva como crédito para el siguiente mes.</p>
          </div>
          <button
            className="button-main py-2 px-6"
            onClick={onSaveVat}
            disabled={vatLoading || vatSaving}
          >
            {vatSaving ? 'Guardando...' : 'Guardar impuestos'}
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-line bg-white px-4 py-3 text-xs text-secondary">
          Parametros actuales del balance: IVA compras utilizable {vatCreditCurrentDisplayRate.toLocaleString('es-EC', { maximumFractionDigits: 1 })}% · diferido {vatCreditCarryforwardDisplayRate.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%. Si el SRI cambia la regla, ajusta estos porcentajes aqui.
        </div>
          </>
        )}
      </div>
      <div className="mb-8 p-6 rounded-xl border border-line bg-surface">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="heading6">Envíos y límites del mapa</div>
            <p className="text-secondary text-sm mt-1">El radio gratis de 5 km, la tarifa fuera de radio y el control de consultas del mapa ahora se administran desde la pestaña de envíos.</p>
          </div>
          <button
            type="button"
            className="button-main py-2 px-6"
            onClick={onOpenShipments}
          >
            Abrir Envíos y mapa
          </button>
        </div>
      </div>
    </div>
  )
}
