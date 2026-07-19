import {
  listProductPage,
  listAllProducts,
  getProduct,
  createProduct as createProductRequest,
  updateProduct as updateProductRequest,
  deleteProduct as deleteProductRequest,
} from './api/products'
import { groupCatalogProducts } from './catalog'

const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

export const fetchProductPage = async (options: Parameters<typeof listProductPage>[0] = {}) => {
  if (isBuild && !process.env.DATABASE_URL) return []
  const page = await listProductPage(options)
  return groupCatalogProducts(page.products)
}

// Explicit full traversal for documents/jobs that genuinely require every
// public item. Interactive views should consume listProductPage instead.
export const fetchAllProducts = async (options?: { fresh?: boolean }) => {
  if (isBuild && !process.env.DATABASE_URL) return []
  const products = await listAllProducts(options?.fresh ? { cache: 'no-store' } : undefined)
  return groupCatalogProducts(products)
}

export const createProduct = (...args: Parameters<typeof createProductRequest>) =>
  createProductRequest(...args)

export const updateProduct = (...args: Parameters<typeof updateProductRequest>) =>
  updateProductRequest(...args)

export const deleteProduct = (...args: Parameters<typeof deleteProductRequest>) =>
  deleteProductRequest(...args)

export { listProductPage, listAllProducts, getProduct }
