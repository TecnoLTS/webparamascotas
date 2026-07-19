'use client'

import dynamic from 'next/dynamic'

import type { PricingCalc, PricingMargins } from '@/lib/api/settings'
import type { ProductReferenceData, ProductReferenceKey } from '@/lib/productReferenceData'
import type {
    Order,
    ProductEditorMode,
    ProductFormState,
    ProductProcurementDetail,
    PurchaseInvoiceDetail,
    SalesRankingRow,
} from '../types'

const ProductEditorModal = dynamic(() => import('./ProductEditorModal'), {
    ssr: false,
})
const PurchaseInvoiceDetailModal = dynamic(() => import('./PurchaseInvoiceDetailModal'), {
    ssr: false,
})
const ProductProcurementDetailModal = dynamic(() => import('./ProductProcurementDetailModal'), {
    ssr: false,
})
const SalesProductDetailModal = dynamic(() => import('./SalesProductDetailModal'), {
    ssr: false,
})
const OrderDetailModal = dynamic(() => import('./OrderDetailModal'), {
    ssr: false,
})

type PanelModalsProps = {
    isProductModalOpen: boolean
    editingProduct: any | null
    adminProductsList: any[]
    productEditorMode: ProductEditorMode
    productEditorInitialForm: ProductFormState
    vatMultiplier: number
    taxConfigurationReady: boolean
    normalizedMargins: PricingMargins
    normalizedCalc: PricingCalc
    productReferenceData: ProductReferenceData
    activeTab?: string
    openReferenceCatalog: (key: ProductReferenceKey) => void
    onProductReferenceDataUpdated: (data: ProductReferenceData) => void
    closeProductModal: () => void
    setAdminProductsList: (products: any[]) => void
    onProductsChanged?: () => void
    refreshPurchaseInvoices: () => Promise<void>
    handleLogout: () => void
    showNotification: (text: string, type?: 'success' | 'error') => void
    isPurchaseInvoiceModalOpen: boolean
    purchaseInvoiceDetailLoading: boolean
    selectedPurchaseInvoice: PurchaseInvoiceDetail | null
    closePurchaseInvoiceModal: () => void
    formatMoney: (value: any) => string
    formatIsoDate: (value?: string | null) => string
    formatDateTimeEcuador: (value: string, options?: Intl.DateTimeFormatOptions) => string
    isProductProcurementModalOpen: boolean
    productProcurementDetailLoading: boolean
    selectedProductProcurementDetail: ProductProcurementDetail | null
    selectedProcurementSalesProduct: SalesRankingRow | null
    currentSalesPeriod: { start: string | null; end: string | null }
    historicalSalesPeriod: { start: string | null; end: string | null }
    closeProductProcurementModal: () => void
    handleOpenPurchaseInvoice: (id: string) => void
    isSalesProductModalOpen: boolean
    selectedSalesProduct: SalesRankingRow | null
    closeSalesProductModal: () => void
    isOrderModalOpen: boolean
    selectedOrder: Order | null
    selectedOrderContact: { name: string; email: string; phone: string }
    selectedOrderStatusBadge: { label: string; className: string }
    canViewSelectedOrderInvoice: boolean
    canManageSelectedOrderStatus: boolean
    canCancelSelectedOrder: boolean
    closeOrderModal: () => void
    handleGenerateInvoice: () => void
    handleUpdateSelectedOrderStatus: (status: string) => void
    getOrderVatSubtotal: (order: any) => number
    getOrderVatAmount: (order: any) => number
    getOrderShipping: (order: any) => number
    getItemNetPrice: (item: any, order: any) => number
}

export default function PanelModals({
    isProductModalOpen,
    editingProduct,
    adminProductsList,
    productEditorMode,
    productEditorInitialForm,
    vatMultiplier,
    taxConfigurationReady,
    normalizedMargins,
    normalizedCalc,
    productReferenceData,
    activeTab,
    openReferenceCatalog,
    onProductReferenceDataUpdated,
    closeProductModal,
    setAdminProductsList,
    onProductsChanged,
    refreshPurchaseInvoices,
    handleLogout,
    showNotification,
    isPurchaseInvoiceModalOpen,
    purchaseInvoiceDetailLoading,
    selectedPurchaseInvoice,
    closePurchaseInvoiceModal,
    formatMoney,
    formatIsoDate,
    formatDateTimeEcuador,
    isProductProcurementModalOpen,
    productProcurementDetailLoading,
    selectedProductProcurementDetail,
    selectedProcurementSalesProduct,
    currentSalesPeriod,
    historicalSalesPeriod,
    closeProductProcurementModal,
    handleOpenPurchaseInvoice,
    isSalesProductModalOpen,
    selectedSalesProduct,
    closeSalesProductModal,
    isOrderModalOpen,
    selectedOrder,
    selectedOrderContact,
    selectedOrderStatusBadge,
    canViewSelectedOrderInvoice,
    canManageSelectedOrderStatus,
    canCancelSelectedOrder,
    closeOrderModal,
    handleGenerateInvoice,
    handleUpdateSelectedOrderStatus,
    getOrderVatSubtotal,
    getOrderVatAmount,
    getOrderShipping,
    getItemNetPrice,
}: PanelModalsProps) {
    return (
        <>
            {isProductModalOpen && (
                <ProductEditorModal
                    open={isProductModalOpen}
                    editingProduct={editingProduct}
                    existingProducts={adminProductsList}
                    editorMode={productEditorMode}
                    initialForm={productEditorInitialForm}
                    vatMultiplier={vatMultiplier}
                    taxConfigurationReady={taxConfigurationReady}
                    normalizedMargins={normalizedMargins}
                    normalizedCalc={normalizedCalc}
                    referenceData={productReferenceData}
                    onOpenReferenceCatalog={openReferenceCatalog}
                    onReferenceDataUpdated={onProductReferenceDataUpdated}
                    activeTab={activeTab}
                    onClose={closeProductModal}
                    onProductsUpdated={(products) => {
                        setAdminProductsList(products)
                        onProductsChanged?.()
                    }}
                    onRefreshPurchaseInvoices={refreshPurchaseInvoices}
                    onSessionExpired={handleLogout}
                    showNotification={showNotification}
                />
            )}

            {isPurchaseInvoiceModalOpen && (
                <PurchaseInvoiceDetailModal
                    open={isPurchaseInvoiceModalOpen}
                    loading={purchaseInvoiceDetailLoading}
                    invoice={selectedPurchaseInvoice}
                    onClose={closePurchaseInvoiceModal}
                    formatMoney={formatMoney}
                    formatIsoDate={formatIsoDate}
                    formatDateTime={formatDateTimeEcuador}
                />
            )}

            {isProductProcurementModalOpen && (
                <ProductProcurementDetailModal
                    open={isProductProcurementModalOpen}
                    loading={productProcurementDetailLoading}
                    detail={selectedProductProcurementDetail}
                    salesProduct={selectedProcurementSalesProduct}
                    currentPeriod={currentSalesPeriod}
                    historicalPeriod={historicalSalesPeriod}
                    formatMoney={formatMoney}
                    formatIsoDate={formatIsoDate}
                    onClose={closeProductProcurementModal}
                    onOpenPurchaseInvoice={handleOpenPurchaseInvoice}
                />
            )}

            {isSalesProductModalOpen && (
                <SalesProductDetailModal
                    open={isSalesProductModalOpen}
                    product={selectedSalesProduct}
                    currentPeriod={currentSalesPeriod}
                    historicalPeriod={historicalSalesPeriod}
                    formatMoney={formatMoney}
                    onClose={closeSalesProductModal}
                />
            )}

            {isOrderModalOpen && selectedOrder && (
                <OrderDetailModal
                    open={isOrderModalOpen}
                    order={selectedOrder}
                    orderContact={selectedOrderContact}
                    statusBadge={selectedOrderStatusBadge}
                    canViewInvoice={canViewSelectedOrderInvoice}
                    canManageStatus={canManageSelectedOrderStatus}
                    canCancelOrder={canCancelSelectedOrder}
                    onClose={closeOrderModal}
                    onViewInvoice={handleGenerateInvoice}
                    onUpdateStatus={handleUpdateSelectedOrderStatus}
                    formatDateTime={formatDateTimeEcuador}
                    formatMoney={formatMoney}
                    getVatSubtotal={getOrderVatSubtotal}
                    getVatAmount={getOrderVatAmount}
                    getShipping={getOrderShipping}
                    getItemNetPrice={getItemNetPrice}
                />
            )}
        </>
    )
}
