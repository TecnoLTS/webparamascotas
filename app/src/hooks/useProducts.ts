import { useEffect, useState } from 'react'
import { ProductType } from '@/type/ProductType'
import { listProductPage } from '@/lib/api/products'
import { groupCatalogProducts } from '@/lib/catalog'

type UseProductsResult = {
  products: ProductType[]
  loading: boolean
  error: string | null
}

type UseProductsOptions = {
  search?: string
  pageSize?: number
  enabled?: boolean
}

const useProducts = ({ search, pageSize = 16, enabled = true }: UseProductsOptions = {}): UseProductsResult => {
  const [products, setProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const page = await listProductPage({ pageSize, search })
        if (!active) return
        setProducts(groupCatalogProducts(page.products))
        setError(null)
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar productos')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [enabled, pageSize, search])

  return { products, loading, error }
}

export default useProducts
