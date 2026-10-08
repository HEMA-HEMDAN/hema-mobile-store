export interface Category {
  id: number;
  name: string;
  active: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  category_id: number | null;
  category_name?: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  purchase_price: number; // in piastres (integer)
  selling_price: number;  // in piastres (integer)
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  active: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: number;
  invoice_number: number;
  subtotal: number; // in piastres
  discount: number; // in piastres
  total: number;    // in piastres
  created_at: string;
}

export interface BillItem {
  id: number;
  bill_id: number;
  product_id: number;
  product_name: string; // snapshot
  unit_price: number;   // snapshot in piastres
  quantity: number;
  total: number;        // in piastres
}

export type StockMovementType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'DAMAGED';

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  type: StockMovementType;
  quantity_change: number;
  reference_id: number | null;
  note: string | null;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number; // defaults to product.selling_price
  total: number;      // unit_price * quantity
}

export interface ShopSettings {
  shop_name: string;
  shop_phone: string;
  currency: string;
  receipt_footer: string;
  low_stock_threshold_default: number;
  allow_negative_stock: boolean;
  device_id: string;
  last_sync_at: string | null;
}

export interface BackupData {
  version: string;
  exported_at: string;
  categories: Category[];
  products: Product[];
  bills: Bill[];
  bill_items: BillItem[];
  stock_movements: StockMovement[];
  settings: Record<string, string>;
}

export type SyncOperationType =
  | 'SALE'
  | 'RESTOCK'
  | 'ADJUSTMENT'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DEACTIVATE'
  | 'CATEGORY_CREATE'
  | 'CATEGORY_UPDATE'
  | 'CATEGORY_DEACTIVATE';

export type SyncEntityType = 'BILL' | 'PRODUCT' | 'CATEGORY' | 'STOCK_MOVEMENT';

export interface SyncOperation {
  id?: number;
  operation_id: string; // UUID
  device_id: string;
  operation_type: SyncOperationType;
  entity_type: SyncEntityType;
  entity_id: string;
  payload: any; // parsed object or JSON string
  created_at: string;
}

export interface SyncFileFormat {
  type: 'shop_sync';
  version: number;
  device_id: string;
  exported_at: string;
  operations: SyncOperation[];
}

export interface SyncImportResult {
  importedCount: number;
  skippedCount: number;
  conflictCount: number;
  errors: string[];
}

export interface DashboardSummary {
  todaySalesTotal: number;       // in piastres
  todayBillsCount: number;
  totalInventoryValue: number;   // in piastres (stock_quantity * purchase_price)
  totalInventorySellingValue: number; // in piastres (stock_quantity * selling_price)
  lowStockCount: number;
  outOfStockCount: number;
  recentBills: Bill[];
  lowStockProducts: Product[];
}

export interface ReportSummary {
  period: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  totalSales: number;           // in piastres
  billsCount: number;
  averageBillValue: number;     // in piastres
  netProfit: number;            // in piastres (revenue - cost of goods sold)
  damagedItemsLoss: number;     // in piastres (purchase cost of damaged items)
  topSellingProducts: Array<{
    product_id: number;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  inventoryValuePurchase: number;
  inventoryValueSelling: number;
}
