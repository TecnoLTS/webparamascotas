export type ReportPeriodSummary = {
    period: {
        period_key: string;
        start_date: string;
        end_date: string;
        end_exclusive?: string;
        timezone?: string;
    };
    timezone: string;
    realized_statuses: string[];
    sales: {
        orders_count: number;
        total: number;
        net: number;
        tax: number;
        shipping: number;
    };
    profit: {
        cost: number;
        gross_profit: number;
        gross_margin: number;
        period_expenses: number;
        paid_expenses: number;
        pending_expenses: number;
        overdue_expenses: number;
        committed_expenses: number;
        financial_adjustments: number;
        net_cash_profit: number;
        net_cash_margin: number;
        net_period_profit: number;
        net_period_margin: number;
        net_committed_profit?: number;
        net_committed_margin?: number;
    };
    expenses: {
        paid_count: number;
        pending_count: number;
        overdue_count: number;
    };
    adjustments?: { total?: number; count?: number };
    purchase_invoices?: {
        invoices_count: number;
        subtotal: number;
        tax_total: number;
        total: number;
        units_total: number;
        products_count: number;
        suppliers_count: number;
    };
    orders: Array<{
        id: string;
        created_at: string;
        status: string;
        user_name?: string | null;
        customer_email?: string | null;
        customer_phone?: string | null;
        customer_document_type?: string | null;
        customer_document_number?: string | null;
        payment_method?: string | null;
        delivery_method?: string | null;
        discount_code?: string | null;
        discount_total?: number;
        items_subtotal?: number;
        vat_rate?: number;
        shipping_base?: number;
        shipping_tax_amount?: number;
        item_lines_count?: number;
        units_count?: number;
        items_summary?: string;
        gross: number;
        net: number;
        vat: number;
        shipping: number;
        cost?: number;
        profit?: number;
        margin?: number;
        average_unit_net?: number;
    }>;
    products: Array<{
        product_id: string;
        product_name: string;
        category: string;
        orders_count: number;
        units_sold: number;
        gross_revenue: number;
        net_revenue: number;
        vat_amount: number;
        shipping_amount: number;
        cost: number;
        profit: number;
        margin: number;
        order_refs: string[];
    }>;
    categories: Array<{
        category: string;
        orders_count: number;
        units_sold: number;
        gross_revenue: number;
        net_revenue: number;
        vat_amount: number;
        shipping_amount: number;
        cost: number;
        profit: number;
        margin: number;
        order_refs: string[];
    }>;
}

export type InventoryRecommendedAction =
    | 'monitor'
    | 'restock_now'
    | 'restock_soon'
    | 'rotate_or_discount'
    | 'remove_expired'
    | 'reduce_or_promote'
    | 'fix_data'
    | 'review_assortment'

export type InventoryIntelligenceRow = {
    product_id: string;
    legacy_id?: string | null;
    name: string;
    sku: string;
    category: string;
    product_type?: string;
    supplier: string;
    quantity: number;
    status: 'available' | 'low' | 'critical' | 'out' | 'expiring' | 'expired' | 'overstock';
    avg_daily_units: number;
    units_sold_window?: number;
    coverage_days: number | null;
    reorder_point: number;
    critical_point?: number;
    stock_max: number;
    unit_cost: number;
    inventory_cost: number;
    unit_price: number;
    price_net?: number;
    market_value: number;
    potential_profit?: number;
    margin: number;
    expiration_date: string | null;
    expiration_alert_days?: number;
    days_to_expire?: number | null;
    days_expired?: number | null;
    open_lots_count: number;
    unlinked_open_lots_count?: number;
    last_purchase_invoice_id?: string;
    last_purchase_invoice_number?: string;
    last_purchase_issued_at?: string | null;
    last_purchase_received_at?: string | null;
    last_purchase_quantity?: number;
    last_purchase_unit_cost?: number;
    priority_score: number;
    recommended_action: InventoryRecommendedAction;
    suggested_purchase_qty: number;
    suggested_purchase_cost: number;
    quality_issues?: string[];
    published?: boolean;
}

export type InventoryIntelligenceAction = {
    id: string;
    product_id: string;
    name: string;
    sku?: string;
    supplier?: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail: string;
    action: InventoryRecommendedAction;
    priority_score: number;
    suggested_purchase_qty: number;
    suggested_purchase_cost: number;
}

export type InventoryPurchasePlanGroup = {
    supplier: string;
    items_count: number;
    units: number;
    estimated_cost: number;
    max_priority_score: number;
    items: Array<{
        product_id: string;
        name: string;
        sku?: string;
        quantity: number;
        unit_cost: number;
        estimated_cost: number;
        priority_score: number;
    }>;
}

export type InventoryIntelligence = {
    summary: {
        total_skus: number;
        total_units: number;
        skus_with_stock: number;
        inventory_cost: number;
        market_value: number;
        potential_profit: number;
        purchase_recommended_skus: number;
        suggested_purchase_units: number;
        suggested_purchase_cost: number;
        risk_skus: number;
        expired_units: number;
        expiring_units: number;
        overstock_capital: number;
        avg_margin: number;
    };
    health: {
        available: number;
        out_of_stock: number;
        critical_stock: number;
        low_stock: number;
        overstock: number;
        expired_products: number;
        expiring_products: number;
        purchase_recommended: number;
        review_recommended: number;
        data_quality_issues: number;
    };
    actions: InventoryIntelligenceAction[];
    purchasePlan: InventoryPurchasePlanGroup[];
    categories: Array<{
        category: string;
        skus: number;
        units: number;
        inventory_cost: number;
        market_value: number;
        suggested_purchase_units: number;
        suggested_purchase_cost: number;
        risk_skus: number;
    }>;
    suppliers: Array<{
        supplier: string;
        skus: number;
        units: number;
        inventory_cost: number;
        market_value: number;
        suggested_purchase_units: number;
        suggested_purchase_cost: number;
        risk_skus: number;
    }>;
    rows: InventoryIntelligenceRow[];
    parameters: {
        window_days: number;
        target_days: number;
        realized_statuses: string[];
        cost_source?: string;
    };
    generated_at: string;
}

export interface DashboardStats {
    totalSales: {
        amount: number;
        progress: { percentage: number; current: number; previous: number };
    };
    newOrders: {
        count: number;
        progress: { percentage: number; current: number; previous: number };
    };
    newClients: {
        count: number;
        progress: { percentage: number; current: number; previous: number };
    };
    monthlyPerformance: Array<{ day: string, date?: string, total: number, gross: number, cost: number }>;
    salesTrend30Days?: Array<{ day: string, date?: string, total: number, gross: number, cost: number }>;
    topProducts?: Array<{ name: string, sold: number, revenue: number }>;
    salesByCategory?: Array<{ category: string, total: number }>;
    productAnalysis?: {
        averageMargin: number;
        weightedMargin?: number;
        lowMarginOpportunities: number;
        missingCostCount?: number;
        stockValueAtCost?: number;
        totalMonitored: number;
        pricedCostedProducts?: number;
    };
    tax?: { rate: number; multiplier: number; credit_current_rate?: number; credit_carryforward_rate?: number };
    businessMetrics?: {
        averageOrderValue: number;
        salesSummary?: {
            orders_count?: number;
            gross?: number;
            net?: number;
            vat?: number;
            shipping?: number;
            average_order_net?: number;
            average_order_gross?: number;
        };
        financialTrends?: FinancialTrends;
        profitStats: {
            revenue: number;
            cost: number;
            shipping_collected?: number;
            shipping_cost?: number;
            operating_expenses?: number;
            period_expenses?: number;
            paid_expenses?: number;
            pending_expenses?: number;
            overdue_expenses?: number;
            committed_expenses?: number;
            financial_adjustments?: number;
            gross_profit?: number;
            gross_margin?: number;
            net_cash_profit?: number;
            net_cash_margin?: number;
            net_period_profit?: number;
            net_period_margin?: number;
            net_committed_profit?: number;
            net_committed_margin?: number;
            net_profit?: number;
            net_margin?: number;
            expense_source?: string;
            profit: number;
            margin: number;
            roi?: number;
            net_roi?: number;
            cash_net_roi?: number;
            committed_net_roi?: number;
        };
        inventoryValue: { market_value: number, cost_value: number, total_items: number, products_count?: number, skus_with_stock?: number };
        inventoryIntelligence?: InventoryIntelligence;
        ordersByStatus: Array<{ status: string, count: number }>;
        recentOrders: Array<{ id: string, user_name: string, total: number, status: string, created_at: string }>;
        salesDeepDive?: {
            daily: {
                current: Array<{ day: string, total: string }>;
                previous: Array<{ day: string, total: string }>;
            };
            categories: Array<{ category: string, current: string, previous: string, growth: number }>;
        };
        inventoryDeepDive?: {
            highValueItems: Array<{ name: string, quantity: number, cost: string, total_cost: string }>;
            riskItems: Array<{
                name: string;
                quantity: number;
                status?: InventoryIntelligenceRow['status'];
                reorder_point?: number | string;
                critical_point?: number | string;
                units_sold_30d?: number | string;
                avg_daily_units?: number | string;
                estimated_days_left?: number | string | null;
            }>;
            expiringItems?: Array<{
                id?: string;
                legacy_id?: string;
                name: string;
                quantity: number | string;
                expiration_date: string;
                expiration_alert_days?: number | string;
                days_to_expire: number | string;
            }>;
            expiredItems?: Array<{
                id?: string;
                legacy_id?: string;
                name: string;
                quantity: number | string;
                expiration_date: string;
                days_expired: number | string;
            }>;
            health: {
                out_of_stock: number | string;
                low_stock: number | string;
                critical_stock?: number | string;
                overstock: number | string;
                expired_products?: number | string;
                expiring_products?: number | string;
            };
        };
        aovDeepDive?: {
            distribution: Array<{ bucket: string, count: number, revenue: string, avg_order_value?: string | number, order_share?: string | number, revenue_share?: string | number }>;
        };
        traceability?: {
            orders: Array<{
                id: string;
                created_at: string;
                status: string;
                user_name?: string;
                gross: number;
                net: number;
                vat: number;
                shipping: number;
            }>;
            products: Array<{
                product_id: string;
                product_name: string;
                category: string;
                units_sold: number;
                gross_revenue?: number;
                net_revenue: number;
                vat_amount?: number;
                shipping_amount?: number;
                cost?: number;
                profit?: number;
                margin?: number;
                order_refs: string[];
            }>;
            categories: Array<{
                category: string;
                gross_revenue?: number;
                net_revenue: number;
                vat_amount?: number;
                shipping_amount?: number;
                cost?: number;
                profit?: number;
                margin?: number;
                order_refs: string[];
            }>;
        };
        productSalesRanking?: {
            period: { start: string; end: string };
            selectedMonth?: string;
            historicalPeriod?: { start: string | null; end: string | null };
            rangePeriod?: { start: string; end: string };
            monthlyTotals: { units_sold: number; net_revenue: number };
            monthlyFinancial?: {
                orders_count: number;
                gross: number;
                net: number;
                vat: number;
                shipping: number;
                cost: number;
                profit: number;
                margin: number;
            };
            rangeTotals?: { units_sold: number; net_revenue: number };
            rangeFinancial?: {
                orders_count: number;
                gross: number;
                net: number;
                vat: number;
                shipping: number;
                cost: number;
                profit: number;
                margin: number;
            };
            historicalTotals: { units_sold: number; net_revenue: number };
            historicalFinancial?: {
                orders_count: number;
                gross: number;
                net: number;
                vat: number;
                shipping: number;
                cost: number;
                profit: number;
                margin: number;
            };
            monthlyRanking: Array<{
                product_id: string;
                product_name: string;
                category: string;
                month_orders_count: number;
                month_units_sold: number;
                month_gross_revenue: number;
                month_net_revenue: number;
                month_vat_amount: number;
                month_shipping_amount: number;
                month_cost: number;
                month_profit: number;
                month_margin: number;
                range_orders_count?: number;
                range_units_sold?: number;
                range_gross_revenue?: number;
                range_net_revenue?: number;
                range_vat_amount?: number;
                range_shipping_amount?: number;
                range_cost?: number;
                range_profit?: number;
                range_margin?: number;
                historical_orders_count: number;
                historical_units_sold: number;
                historical_gross_revenue: number;
                historical_net_revenue: number;
                historical_vat_amount: number;
                historical_shipping_amount: number;
                historical_cost: number;
                historical_profit: number;
                historical_margin: number;
            }>;
            historicalRanking: Array<{
                product_id: string;
                product_name: string;
                category: string;
                month_orders_count: number;
                month_units_sold: number;
                month_gross_revenue: number;
                month_net_revenue: number;
                month_vat_amount: number;
                month_shipping_amount: number;
                month_cost: number;
                month_profit: number;
                month_margin: number;
                range_orders_count?: number;
                range_units_sold?: number;
                range_gross_revenue?: number;
                range_net_revenue?: number;
                range_vat_amount?: number;
                range_shipping_amount?: number;
                range_cost?: number;
                range_profit?: number;
                range_margin?: number;
                historical_orders_count: number;
                historical_units_sold: number;
                historical_gross_revenue: number;
                historical_net_revenue: number;
                historical_vat_amount: number;
                historical_shipping_amount: number;
                historical_cost: number;
                historical_profit: number;
                historical_margin: number;
            }>;
            rangeRanking?: Array<{
                product_id: string;
                product_name: string;
                category: string;
                month_orders_count: number;
                month_units_sold: number;
                month_gross_revenue: number;
                month_net_revenue: number;
                month_vat_amount: number;
                month_shipping_amount: number;
                month_cost: number;
                month_profit: number;
                month_margin: number;
                range_orders_count?: number;
                range_units_sold?: number;
                range_gross_revenue?: number;
                range_net_revenue?: number;
                range_vat_amount?: number;
                range_shipping_amount?: number;
                range_cost?: number;
                range_profit?: number;
                range_margin?: number;
                historical_orders_count: number;
                historical_units_sold: number;
                historical_gross_revenue: number;
                historical_net_revenue: number;
                historical_vat_amount: number;
                historical_shipping_amount: number;
                historical_cost: number;
                historical_profit: number;
                historical_margin: number;
            }>;
        };
        report?: ReportPeriodSummary;
    };
    strategicAlerts?: Array<{ type: 'critical' | 'warning' | 'info', message: string, action: string }>;
}

export type FinancialTrendPoint = {
    period: string;
    date: string;
    orders_count: number;
    gross_sales: number;
    net_sales: number;
    tax_collected: number;
    shipping_collected: number;
    product_cost: number;
    gross_profit: number;
    expenses_paid: number;
    expenses_cash_paid?: number;
    expenses_incurred?: number;
    period_expenses?: number;
    expenses_incurred_paid?: number;
    expenses_pending: number;
    expenses_overdue: number;
    committed_expenses: number;
    expenses_paid_count?: number;
    expenses_incurred_count?: number;
    expenses_pending_count?: number;
    expenses_overdue_count?: number;
    financial_adjustments: number;
    net_cash_profit: number;
    net_period_profit?: number;
    net_committed_profit: number;
    gross_margin: number;
    net_cash_margin: number;
    net_period_margin?: number;
    net_committed_margin: number;
}

export type FinancialTrends = {
    start_date?: string;
    daily?: FinancialTrendPoint[];
    monthly?: FinancialTrendPoint[];
    totals?: Partial<FinancialTrendPoint>;
}

export interface Order {
    id: string;
    order_number?: string;
    user_name?: string;
    user_email?: string;
    user_id?: string;
    items_count?: number;
    total: number;
    status: string;
    created_at: string;
    order_notes?: string | null;
    shipping_address?: Record<string, any> | string | null;
    billing_address?: Record<string, any> | string | null;
    delivery_method?: string | null;
    payment_method?: string | null;
    items?: Array<{
        order_id: string;
        product_id: string;
        product_name: string;
        product_image?: string | null;
        quantity: number;
        price: number;
    }>;
}

export interface ShippingProvider {
    id: number;
    name: string;
    status: string;
}

export interface ShippingPickup {
    id?: number | string;
    provider?: string;
    provider_name?: string;
    status?: string;
    scheduled_at?: string;
    date?: string;
    window?: string;
    reference?: string;
    order_id?: string | number;
    notes?: string;
}

export interface AdminUserSummary {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    email_verified?: boolean | null;
    document_type?: string | null;
    document_number?: string | null;
    business_name?: string | null;
    resolvedCompany?: string | null;
    resolvedPhone?: string | null;
    resolvedEmail?: string | null;
    resolvedAddressText?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    failed_login_attempts?: number | string | null;
    login_locked_until?: string | null;
    last_login_at?: string | null;
    security_block_event_type?: string | null;
    security_block_status?: string | null;
    security_blocked_at?: string | null;
    security_block_metadata?: Record<string, any> | string | null;
    orders_total?: number | string | null;
    orders_active?: number | string | null;
    orders_completed?: number | string | null;
    total_spent?: number | string | null;
    last_order_at?: string | null;
    last_order_id?: string | null;
    profile?: Record<string, any> | string | null;
    addresses?: any;
    last_shipping_address?: Record<string, any> | string | null;
    last_billing_address?: Record<string, any> | string | null;
}

export type DeepDiveView = 'sales' | 'profit' | 'aov' | 'inventory' | 'product-breakdown'
export type ProductDetailMetric = 'gross' | 'net' | 'vat' | 'shipping' | 'profit' | 'inventory'
export type AdminReportSection = 'general' | 'sales' | 'balance' | 'inventory' | 'traceability' | 'products-purchases'
export type SalesReportView = 'daily' | 'week' | 'month' | 'historical'
export type AdminMenuGroupKey = 'monitoring' | 'reporting' | 'catalog' | 'operations' | 'finance'

export type BillingRidePdf = {
    access_key: string;
    source_reference?: string | null;
    authorization_number?: string | null;
    authorization_date?: string | null;
    issue_date?: string | null;
    accounting_date?: string | null;
    order_created_at?: string | null;
    financial_period_key?: string | null;
    operational_error?: boolean | string | number | null;
    operational_error_code?: string | null;
    operational_error_label?: string | null;
    operational_error_reason?: string | null;
    operational_error_marked_at?: string | null;
    operational_error_actor?: string | null;
    customer_name?: string | null;
    customer_identification?: string | null;
    customer_email?: string | null;
    total?: number | string | null;
    total_tax?: number | string | null;
    establishment_code?: string | null;
    emission_point?: string | null;
    sequential?: string | null;
    ambiente?: string | null;
    sri_status?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    replacement_access_key?: string | null;
    replaced_access_key?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    pdf_exists?: boolean;
    pdf_can_generate?: boolean;
    pdf_size?: number | null;
    pdf_modified_at?: string | null;
}

export type BusinessExpenseStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type BusinessExpenseType = 'one_time' | 'recurring_instance'

export type BusinessExpense = {
    id: string;
    tenant_id?: string;
    recurrence_id?: string | null;
    category: string;
    description: string;
    amount: number;
    tax_amount: number;
    total: number;
    expense_date: string;
    due_date?: string | null;
    paid_at?: string | null;
    status: BusinessExpenseStatus;
    type: BusinessExpenseType;
    payment_method?: string | null;
    reference?: string | null;
    notes?: string | null;
    source?: string | null;
    source_id?: string | null;
    payment_exists?: boolean;
    financial_period_key?: string;
    is_period_closed?: boolean;
    created_by_user_id?: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export type BusinessExpenseRecurrence = {
    id: string;
    tenant_id?: string;
    category: string;
    description: string;
    amount: number;
    tax_amount: number;
    total: number;
    frequency: 'weekly' | 'monthly';
    interval_count: number;
    start_date: string;
    next_due_date: string;
    payment_method?: string | null;
    reference?: string | null;
    notes?: string | null;
    active: boolean;
    created_by_user_id?: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export type BusinessExpenseSummary = {
    paid: number;
    pending: number;
    overdue: number;
    committed: number;
    cash_expenses?: number;
    committed_expenses?: number;
    paid_count?: number;
    pending_count?: number;
    overdue_count?: number;
}

export type FinancialPeriod = {
    id?: string | null;
    tenant_id?: string;
    period_key: string;
    start_date: string;
    end_date: string;
    status: 'open' | 'closed' | 'reopened';
    snapshot?: Record<string, any> | null;
    closed_by_user_id?: string | null;
    closed_at?: string | null;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export type FinancialAdjustment = {
    id: string;
    tenant_id?: string;
    period_key: string;
    adjustment_date: string;
    type: string;
    target_type?: string | null;
    target_id?: string | null;
    original_period_key?: string | null;
    description: string;
    amount: number;
    tax_amount: number;
    total: number;
    reason?: string | null;
    created_by_user_id?: string;
    created_at?: string | null;
}

export type FinancialPeriodPreview = {
    period: FinancialPeriod;
    snapshot: Record<string, any>;
    adjustments?: FinancialAdjustment[];
}
export type ProductPublicationFilter = 'all' | 'published' | 'hidden'
export type ProductEditorMode = 'create' | 'edit' | 'duplicate-variant' | 'restock'

export type PurchaseInvoiceFormState = {
    invoiceNumber: string;
    supplierName: string;
    supplierDocument: string;
    purchaseTaxRate: string;
    issuedAt: string;
    notes: string;
}

export type PurchaseInvoiceSummary = {
    id: string;
    invoice_number: string;
    supplier_name: string;
    supplier_document?: string | null;
    issued_at: string;
    subtotal: number;
    tax_total: number;
    total: number;
    notes?: string | null;
    created_at: string;
    items_count: number;
    units_total: number;
    products_count: number;
}

export type PurchaseInvoiceDetailItem = {
    id: string;
    product_id: string;
    product_name_snapshot?: string | null;
    quantity: number;
    unit_cost: number;
    line_total: number;
    created_at?: string | null;
    category?: string | null;
    brand?: string | null;
    metadata?: Record<string, any> | null;
}

export type PurchaseInvoiceDetail = {
    id: string;
    invoice_number: string;
    supplier_name: string;
    supplier_document?: string | null;
    issued_at: string;
    subtotal: number;
    tax_total: number;
    total: number;
    notes?: string | null;
    metadata?: Record<string, any> | null;
    created_at?: string | null;
    updated_at?: string | null;
    items: PurchaseInvoiceDetailItem[];
}

export type ProductProcurementLotDetail = {
    id: string;
    source_type: string;
    source_ref?: string | null;
    purchase_invoice_id?: string | null;
    purchase_invoice_item_id?: string | null;
    invoice_number?: string | null;
    supplier_name?: string | null;
    supplier_document?: string | null;
    issued_at?: string | null;
    received_at?: string | null;
    created_at?: string | null;
    purchased_quantity: number;
    consumed_quantity: number;
    remaining_quantity: number;
    unit_cost: number;
    purchase_total: number;
    remaining_cost_total: number;
    estimated_remaining_net_revenue: number;
    estimated_remaining_gross_revenue: number;
    estimated_remaining_profit: number;
    estimated_remaining_margin: number;
    status: 'open' | 'consumed';
}

export type ProductProcurementDetail = {
    product_id: string;
    legacy_id?: string | null;
    product_name: string;
    category: string;
    price_gross: number;
    price_net: number;
    entries_count: number;
    open_lots_count: number;
    purchased_units_total: number;
    consumed_units_total: number;
    remaining_units_total: number;
    remaining_cost_total: number;
    weighted_unit_cost: number;
    weighted_margin: number;
    weighted_profit: number;
    min_unit_cost: number;
    max_unit_cost: number;
    has_unlinked_stock: boolean;
    lots: ProductProcurementLotDetail[];
}

export type ProductFormState = {
    id: string;
    name: string;
    price: string;
    pvp: string;
    marketPrice: string;
    cost: string;
    taxExempt: boolean;
    quantity: string;
    category: string;
    brand: string;
    description: string;
    productType: string;
    published: boolean;
    attributes: Record<string, string>;
    purchaseInvoice: PurchaseInvoiceFormState;
    thumbImages: Array<{ url: string; width: string; height: string; altText?: string }>;
    galleryImages: Array<{ url: string; width: string; height: string; altText?: string }>;
}

export type AddressData = {
    firstName?: string;
    lastName?: string;
    company?: string;
    country?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    documentType?: string;
    documentNumber?: string;
    latitude?: number | null;
    longitude?: number | null;
    formattedAddress?: string;
    placeId?: string;
    distanceKm?: number | null;
    shippingZone?: 'free_radius' | 'standard_delivery' | string;
    shippingRule?: 'free_radius' | 'standard_delivery' | string;
    isFreeShipping?: boolean;
    storeAddress?: string;
    storeLatitude?: number | null;
    storeLongitude?: number | null;
    freeShippingRadiusKm?: number | null;
}

export type SalesRankingRow = {
    product_id: string;
    product_name: string;
    category: string;
    orders_count: number;
    units_sold: number;
    gross_revenue: number;
    net_revenue: number;
    vat_amount: number;
    shipping_amount: number;
    cost: number;
    profit: number;
    margin: number;
    order_refs?: string[];
    month_orders_count: number;
    month_units_sold: number;
    month_gross_revenue: number;
    month_net_revenue: number;
    month_vat_amount: number;
    month_shipping_amount: number;
    month_cost: number;
    month_profit: number;
    month_margin: number;
    range_orders_count: number;
    range_units_sold: number;
    range_gross_revenue: number;
    range_net_revenue: number;
    range_vat_amount: number;
    range_shipping_amount: number;
    range_cost: number;
    range_profit: number;
    range_margin: number;
    historical_orders_count: number;
    historical_units_sold: number;
    historical_gross_revenue: number;
    historical_net_revenue: number;
    historical_vat_amount: number;
    historical_shipping_amount: number;
    historical_cost: number;
    historical_profit: number;
    historical_margin: number;
}

export type TraceabilityIssueSeverity = 'critical' | 'warning' | 'info'

export type TraceabilityIssueType =
    | 'cost_zero'
    | 'negative_margin'
    | 'low_margin'
    | 'missing_contact'
    | 'missing_document'
    | 'missing_payment'
    | 'missing_delivery'
    | 'missing_order_refs'
    | 'incomplete_product_data'

export type TraceabilityIssue = {
    id: string;
    severity: TraceabilityIssueSeverity;
    type: TraceabilityIssueType;
    entityType: 'order' | 'product' | 'category';
    entityId: string;
    orderId?: string;
    productId?: string;
    productName?: string;
    category?: string;
    title: string;
    detail: string;
    impact?: number;
    actionLabel: string;
}

export type TraceabilitySummary = {
    ordersAudited: number;
    productsAudited: number;
    categoriesAudited: number;
    grossSales: number;
    netSales: number;
    vat: number;
    shipping: number;
    cost: number;
    grossProfit: number;
    grossMargin: number;
    coverageScore: number;
    ordersWithContact: number;
    ordersWithDocument: number;
    ordersWithPayment: number;
    ordersWithDelivery: number;
    productsWithOrderRefs: number;
    productsWithCost: number;
    issuesCount: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
}

export type ProductRankingDecisionAction =
    | InventoryRecommendedAction
    | 'fix_cost'
    | 'protect_margin'
    | 'review_no_sales'

export type ProductRankingDecisionRow = SalesRankingRow & {
    sku: string;
    contribution_pct: number;
    stock_current: number | null;
    coverage_days: number | null;
    recommended_action: ProductRankingDecisionAction;
    action_label: string;
    action_reason: string;
    priority_score: number;
    supplier: string;
    suggested_purchase_qty: number;
    suggested_purchase_cost: number;
    unit_net: number;
    unit_cost: number;
    unit_profit: number;
    inventory_status?: InventoryIntelligenceRow['status'];
    inventory_quality_issues: string[];
}

export type ProductRankingActionItem = {
    id: string;
    product_id: string;
    product_name: string;
    sku?: string;
    category: string;
    action: ProductRankingDecisionAction;
    action_label: string;
    detail: string;
    priority_score: number;
    severity: TraceabilityIssueSeverity;
    stock_current: number | null;
    coverage_days: number | null;
    supplier: string;
    suggested_purchase_qty: number;
    suggested_purchase_cost: number;
}

export type LocalSaleLineItem = {
    productId: string;
    internalId: string;
    name: string;
    category: string;
    sku: string;
    image: string;
    stock: number;
    quantity: number;
    price: number;
    cost: number;
}

export type LocalSaleQuote = {
    subtotal: number;
    items_subtotal_before_discount?: number;
    vat_rate: number;
    vat_subtotal: number;
    vat_amount: number;
    mixed_vat_rates?: boolean;
    shipping: number;
    shipping_base?: number;
    shipping_tax_rate?: number;
    shipping_tax_amount?: number;
    discount_code?: string | null;
    discount_total?: number;
    discounts_applied?: Array<{ code?: string; amount?: number; type?: string; value?: number }>;
    discount_rejections?: Array<{ code?: string; reason?: string; message?: string }>;
    distance_km?: number | null;
    shipping_rule?: 'free_radius' | 'standard_delivery' | string;
    is_free_shipping?: boolean;
    store_address?: string;
    total: number;
    items?: Array<{ product_id: string; quantity: number; price: number; total: number }>;
}

export type LocalSaleSubmissionResult = {
    status: 'success' | 'error';
    orderId: string | null;
    orderStatus?: string | null;
    message: string;
    customerName: string;
    documentNumber: string | null;
    paymentMethod: string;
    total: number;
    itemCount: number;
    units: number;
    createdAt: string;
    invoiceAvailable: boolean;
}

export type LocalSaleQuotationResult = {
    status: 'success' | 'error';
    quoteId: string | null;
    message: string;
    customerName: string;
    documentNumber: string | null;
    total: number;
    itemCount: number;
    units: number;
    createdAt: string;
    printable: boolean;
    emailSent?: boolean;
    emailMessage?: string | null;
    whatsappPrepared?: boolean;
    whatsappMessage?: string | null;
}

export type AdminLocalQuotation = {
    id: string;
    tenant_id?: string;
    status: 'quoted' | 'converted' | 'cancelled' | string;
    customer_name: string;
    customer_document_type?: string | null;
    customer_document_number?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_address?: {
        street?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        zip?: string | null;
    } | null;
    delivery_method?: string | null;
    payment_method?: string | null;
    discount_code?: string | null;
    notes?: string | null;
    items: Array<{
        product_id: string;
        quantity: number;
    }>;
    quote_snapshot: LocalSaleQuote;
    created_by_user_id?: string | null;
    converted_order_id?: string | null;
    valid_until?: string | null;
    converted_at?: string | null;
    created_at: string;
    updated_at?: string | null;
    item_count?: number;
    units?: number;
    email_delivery?: {
        requested?: boolean;
        sent?: boolean;
        recipient?: string | null;
        message?: string | null;
    };
}

export type PosShiftSummary = {
    orders_count: number;
    sales_total: number;
    cash_sales: number;
    electronic_sales: number;
    sales_by_payment: {
        cash: number;
        card: number;
        transfer: number;
        mixed: number;
        other: number;
    };
    movement_income: number;
    movement_expense: number;
    movement_adjustments: number;
    expected_cash: number;
    closing_cash: number | null;
    difference_cash: number | null;
    period: { start: string | null; end: string | null };
}

export type PosShift = {
    id: string;
    opened_by_user_id: string;
    opened_at: string;
    opening_cash: number;
    status: 'open' | 'closed';
    open_notes?: string | null;
    closed_by_user_id?: string | null;
    closed_at?: string | null;
    closing_cash?: number | null;
    close_notes?: string | null;
    expected_cash?: number | null;
    difference_cash?: number | null;
    summary?: PosShiftSummary;
}

export type PosMovement = {
    id: number;
    shift_id: string;
    type: 'income' | 'expense' | 'withdrawal' | 'deposit' | 'adjustment';
    amount: number;
    description?: string | null;
    business_expense_id?: string | null;
    created_by_user_id: string;
    created_at: string;
}
