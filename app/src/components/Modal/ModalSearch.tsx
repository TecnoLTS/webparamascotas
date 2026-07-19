'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from '@/components/Common/AppImage';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import InlineSpinner from '@/components/Other/InlineSpinner';
import Product from '../Product/Product';
import { useModalSearchContext } from '@/context/ModalSearchContext';
import useProducts from '@/hooks/useProducts';
import { getCatalogBrandStats } from '@/lib/catalog';
import { buildProductSearchIndex, filterProductsBySearch, sanitizeProductSearchQuery } from '@/lib/productSearch';

const ModalSearch = () => {
  const { isModalOpen, closeModalSearch } = useModalSearchContext();
  const [searchKeyword, setSearchKeyword] = useState('');
  const router = useRouter();
  const deferredSearchKeyword = useDeferredValue(searchKeyword)
  const trimmedSearchKeyword = sanitizeProductSearchQuery(deferredSearchKeyword)
  const { products, loading, error } = useProducts({
    search: trimmedSearchKeyword || undefined,
    pageSize: 16,
    enabled: isModalOpen,
  });
  const productSearchIndex = useMemo(() => buildProductSearchIndex(products), [products])
  const liveResults = useMemo(
    () => trimmedSearchKeyword
      ? filterProductsBySearch(products, trimmedSearchKeyword, productSearchIndex).slice(0, 4)
      : products.slice(0, 4),
    [productSearchIndex, products, trimmedSearchKeyword]
  )
  const suggestedKeywords = useMemo(() => {
    const topBrands = getCatalogBrandStats(products)
      .slice(0, 4)
      .map((item) => item.brand)

    if (topBrands.length > 0) {
      return topBrands
    }

    return ['Ropa', 'Alimento', 'Salud', 'Accesorios']
  }, [products])

  const handleSearch = (value: string) => {
    const nextQuery = sanitizeProductSearchQuery(value)
    if (!nextQuery) {
      return
    }

    router.push(`/search-result?query=${encodeURIComponent(nextQuery)}`);
    closeModalSearch();
    setSearchKeyword('');
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: isModalOpen ? 'auto' : 'none',
    opacity: isModalOpen ? 1 : 0,
    visibility: isModalOpen ? 'visible' : 'hidden',
  };

  return (
    <>
      <div
        className="modal-search-block"
        style={overlayStyle}
        aria-hidden={!isModalOpen}
        onClick={closeModalSearch}
      >
        <div
          className={`modal-search-main md:p-10 p-6 rounded-[32px] ${
            isModalOpen ? 'open' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="form-search relative">
            <Icon.MagnifyingGlass
              className="absolute heading5 right-6 top-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => {
                handleSearch(searchKeyword);
              }}
            />
            <input
              type="text"
              placeholder="Buscar por marca, producto, categoría o SKU"
              className="text-button-lg h-14 rounded-2xl border border-line w-full pl-6 pr-12"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
            />
          </div>

          <div className="keyword mt-8">
            <div className="heading5">Búsquedas sugeridas</div>
            <div className="list-keyword flex items-center flex-wrap gap-3 mt-4">
              {suggestedKeywords.map((keyword) => (
                <div
                  key={keyword}
                  className="item px-4 py-1.5 border border-line rounded-full cursor-pointer duration-300 hover:bg-black hover:text-white"
                  onClick={() => handleSearch(keyword)}
                >
                  {keyword}
                </div>
              ))}
            </div>
          </div>

          <div className="list-recent mt-8">
            <div className="heading6">{trimmedSearchKeyword ? 'Resultados rápidos' : 'Productos destacados'}</div>

            {loading && (
              <div className="flex items-center gap-2 py-4 text-secondary">
                <InlineSpinner size={18} className="text-black" />
                <span>Cargando productos...</span>
              </div>
            )}

            {error && !loading && (
              <div className="py-4 text-secondary">
                No se pudieron cargar productos.
              </div>
            )}

            {!loading && products.length > 0 && (
              <div className="list-product pb-5 hide-product-sold grid xl:grid-cols-4 sm:grid-cols-2 gap-7 mt-4">
                {liveResults.map((product) => (
                  <Product key={product.id} data={product} type="grid" />
                ))}
              </div>
            )}

            {!loading && !error && trimmedSearchKeyword && liveResults.length === 0 && (
              <div className="py-4 text-secondary">
                No encontramos productos para esa búsqueda.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalSearch;
