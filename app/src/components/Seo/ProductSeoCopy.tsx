import Link from 'next/link'
import type { ProductType } from '@/type/ProductType'
import {
  getProductCurrentPrice,
  getProductSku,
  getProductVariantDisplayValues,
  getProductVariants,
} from '@/lib/catalog'
import { getCatalogPagePath } from '@/lib/seoUrls'

const getPetLabel = (gender?: string | null) => {
  if (gender === 'dog') return 'perros'
  if (gender === 'cat') return 'gatos'
  return 'mascotas'
}

const getCategoryPath = (product: ProductType) =>
  getCatalogPagePath(product.category || 'todos', { gender: product.gender })

type Props = {
  product: ProductType
}

export default function ProductSeoCopy({ product }: Props) {
  const price = getProductCurrentPrice(product)
  const sku = getProductSku(product)
  const variantLabels = getProductVariantDisplayValues(product)
  const variants = getProductVariants(product)
  const petLabel = getPetLabel(product.gender)
  const categoryPath = getCategoryPath(product)

  return (
    <section className="container py-12">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-secondary">
            Compra online en Ecuador
          </p>
          <h2 className="heading5 mt-2">
            {product.name} para {petLabel}
          </h2>
          <p className="mt-4 text-secondary">
            {product.description} En ParaMascotasEC puedes revisar precio, disponibilidad y opciones relacionadas antes de completar tu compra.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {product.brand ? <span className="rounded-full bg-surface px-3 py-1">Marca: {product.brand}</span> : null}
            {product.category ? <span className="rounded-full bg-surface px-3 py-1">Categoria: {product.category}</span> : null}
            {sku ? <span className="rounded-full bg-surface px-3 py-1">SKU: {sku}</span> : null}
            {price > 0 ? <span className="rounded-full bg-surface px-3 py-1">Desde USD {price.toFixed(2)}</span> : null}
          </div>
        </div>
        <div className="border-l border-line pl-0 lg:pl-8">
          <h3 className="text-title">Detalles utiles</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="text-secondary">Disponibilidad</dt>
              <dd className="font-semibold">{Number(product.quantity ?? 0) > 0 ? 'En stock' : 'Consultar stock'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="text-secondary">Variantes</dt>
              <dd className="text-right font-semibold">{variants.length > 1 ? `${variants.length} opciones` : 'Producto unico'}</dd>
            </div>
            {variantLabels.length > 0 ? (
              <div className="border-b border-line pb-3">
                <dt className="text-secondary">Presentaciones</dt>
                <dd className="mt-1 font-semibold">{variantLabels.join(', ')}</dd>
              </div>
            ) : null}
          </dl>
          <Link href={categoryPath} className="button-main mt-6 inline-flex rounded-full px-6 py-3">
            Ver productos relacionados
          </Link>
        </div>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <div>
          <h3 className="text-title">Como comprar</h3>
          <p className="mt-2 text-sm text-secondary">Agrega el producto al carrito, revisa cantidades disponibles y finaliza tu pedido desde checkout.</p>
        </div>
        <div>
          <h3 className="text-title">Antes de elegir</h3>
          <p className="mt-2 text-sm text-secondary">Confirma especie, talla, presentacion o etapa de vida. Para alimentos, revisa cambios graduales si tu mascota prueba una nueva marca.</p>
        </div>
        <div>
          <h3 className="text-title">Soporte</h3>
          <p className="mt-2 text-sm text-secondary">Si necesitas ayuda con presentacion, talla o disponibilidad, contacta a ParaMascotasEC antes de comprar.</p>
        </div>
      </div>
    </section>
  )
}
