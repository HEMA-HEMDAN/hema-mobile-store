import { getDb, runTransaction } from '../db/database';
import { Product, ProductType } from '../types';
import { getCurrentTimestamp } from '../utils/date';

export const productRepository = {
  async getAllProducts(options?: {
    activeOnly?: boolean;
    categoryId?: number | null;
    searchQuery?: string;
  }): Promise<Product[]> {
    const db = getDb();
    const activeOnly = options?.activeOnly ?? true;
    const categoryId = options?.categoryId;
    const searchQuery = options?.searchQuery?.trim();

    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (activeOnly) {
      query += ' AND p.active = 1';
    }

    if (categoryId !== undefined && categoryId !== null) {
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    if (searchQuery) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)';
      const pattern = `%${searchQuery}%`;
      params.push(pattern, pattern, pattern);
    }

    query += ' ORDER BY p.name ASC';

    return await db.getAllAsync<Product>(query, params);
  },

  async getProductById(id: number): Promise<Product | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Product>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [id]
    );
    return row || null;
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!barcode?.trim()) return null;
    const db = getDb();
    const row = await db.getFirstAsync<Product>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.barcode = ? AND p.active = 1`,
      [barcode.trim()]
    );
    return row || null;
  },

  async createProduct(
    productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product> {
    const db = getDb();
    const name = productData.name?.trim();
    if (!name) {
      throw new Error('اسم المنتج مطلوب');
    }

    const now = getCurrentTimestamp();
    const purchasePrice = Math.round(productData.purchase_price || 0);
    const sellingPrice = Math.round(productData.selling_price || 0);
    const productType: ProductType = productData.product_type === 'SERVICE' ? 'SERVICE' : 'PRODUCT';
    const stockQty = productType === 'SERVICE' ? 0 : Number(productData.stock_quantity || 0);
    const lowThreshold =
      productType === 'SERVICE' ? 0 : Number(productData.low_stock_threshold || 0);
    const unit = productData.unit?.trim() || (productType === 'SERVICE' ? 'خدمة' : 'قطعة');

    const result = await db.runAsync(
      `INSERT INTO products 
       (category_id, name, product_type, sku, barcode, purchase_price, selling_price, stock_quantity, low_stock_threshold, unit, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        productData.category_id ?? null,
        name,
        productType,
        productData.sku?.trim() || null,
        productData.barcode?.trim() || null,
        purchasePrice,
        sellingPrice,
        stockQty,
        lowThreshold,
        unit,
        now,
        now,
      ]
    );

    const newId = result.lastInsertRowId;

    // Record initial stock movement if quantity > 0
    if (productType === 'PRODUCT' && stockQty > 0) {
      await db.runAsync(
        `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
         VALUES (?, 'RESTOCK', ?, NULL, 'مخزون افتتاحي عند الإنشاء', ?)`,
        [newId, stockQty, now]
      );
    }

    const created = await this.getProductById(newId);
    return created!;
  },

  async updateProduct(
    id: number,
    productData: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error('المنتج غير موجود');
    }

    const now = getCurrentTimestamp();
    const name = productData.name !== undefined ? productData.name.trim() : existing.name;
    if (!name) {
      throw new Error('اسم المنتج مطلوب');
    }

    const categoryId = productData.category_id !== undefined ? productData.category_id : existing.category_id;
    const sku = productData.sku !== undefined ? (productData.sku?.trim() || null) : existing.sku;
    const barcode = productData.barcode !== undefined ? (productData.barcode?.trim() || null) : existing.barcode;
    const purchasePrice = productData.purchase_price !== undefined ? Math.round(productData.purchase_price) : existing.purchase_price;
    const sellingPrice = productData.selling_price !== undefined ? Math.round(productData.selling_price) : existing.selling_price;
    const productType: ProductType =
      productData.product_type === 'SERVICE' || existing.product_type === 'SERVICE'
        ? productData.product_type ?? existing.product_type
        : 'PRODUCT';
    const lowThreshold =
      productType === 'SERVICE'
        ? 0
        : productData.low_stock_threshold !== undefined
          ? Number(productData.low_stock_threshold)
          : existing.low_stock_threshold;
    const unit = productData.unit?.trim() || (productType === 'SERVICE' ? 'خدمة' : existing.unit);
    const newStock =
      productType === 'SERVICE'
        ? 0
        : productData.stock_quantity !== undefined
          ? Number(productData.stock_quantity)
          : existing.stock_quantity;
    const stockDiff = newStock - existing.stock_quantity;

    await runTransaction(async (transactionDb) => {
      await transactionDb.runAsync(
        `UPDATE products
         SET category_id = ?, name = ?, product_type = ?, sku = ?, barcode = ?, purchase_price = ?, selling_price = ?, stock_quantity = ?, low_stock_threshold = ?, unit = ?, updated_at = ?
         WHERE id = ?`,
        [
          categoryId,
          name,
          productType,
          sku,
          barcode,
          purchasePrice,
          sellingPrice,
          newStock,
          lowThreshold,
          unit,
          now,
          id,
        ]
      );

      if (stockDiff !== 0 && existing.product_type !== 'SERVICE') {
        const note =
          productType === 'SERVICE'
            ? 'إخراج المخزون عند تحويل المنتج إلى خدمة'
            : 'تعديل يدوي للمخزون';
        await transactionDb.runAsync(
          `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
           VALUES (?, 'ADJUSTMENT', ?, NULL, ?, ?)`,
          [id, stockDiff, note, now]
        );
      }
    });
  },

  async deactivateProduct(id: number): Promise<void> {
    const db = getDb();
    const now = getCurrentTimestamp();
    // Rule: "Never delete products physically if historical bills reference them. Use active/deactivated records where appropriate."
    await db.runAsync(
      'UPDATE products SET active = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  },

  async getLowStockProducts(): Promise<Product[]> {
    const db = getDb();
    return await db.getAllAsync<Product>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = 1 AND p.product_type = 'PRODUCT'
         AND p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold
       ORDER BY p.stock_quantity ASC`
    );
  },

  async getOutOfStockProducts(): Promise<Product[]> {
    const db = getDb();
    return await db.getAllAsync<Product>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = 1 AND p.product_type = 'PRODUCT' AND p.stock_quantity <= 0
       ORDER BY p.name ASC`
    );
  },

  async getInventoryTotals(): Promise<{ totalPurchaseValue: number; totalSellingValue: number }> {
    const db = getDb();
    const row = await db.getFirstAsync<{
      totalPurchaseValue: number | null;
      totalSellingValue: number | null;
    }>(
      `SELECT 
         SUM(stock_quantity * purchase_price) as totalPurchaseValue,
         SUM(stock_quantity * selling_price) as totalSellingValue
       FROM products 
       WHERE active = 1 AND product_type = 'PRODUCT' AND stock_quantity > 0`
    );

    return {
      totalPurchaseValue: Math.round(row?.totalPurchaseValue || 0),
      totalSellingValue: Math.round(row?.totalSellingValue || 0),
    };
  },
};
