import { getDb, runTransaction } from '../db/database';
import { StockMovement, StockMovementType } from '../types';
import { getCurrentTimestamp } from '../utils/date';

export const stockRepository = {
  async getStockMovements(productId?: number, limit = 50): Promise<StockMovement[]> {
    const db = getDb();
    let query = `
      SELECT sm.*, p.name as product_name, b.client_name as client_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN bills b ON sm.type = 'SALE' AND sm.reference_id = b.id
    `;
    const params: (number | string)[] = [];

    if (productId) {
      query += ' WHERE sm.product_id = ?';
      params.push(productId);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ?';
    params.push(limit);

    return await db.getAllAsync<StockMovement>(query, params);
  },

  async updateStockAndRecordMovement(
    productId: number,
    type: StockMovementType,
    quantityChange: number,
    note?: string | null,
    referenceId?: number | null
  ): Promise<number> {
    if (quantityChange === 0) {
      throw new Error('مقدار التغيير في المخزون يجب ألا يساوي الصفر');
    }

    return await runTransaction(async (db) => {
      // 1. Fetch current product
      const product = await db.getFirstAsync<{
        stock_quantity: number;
        active: number;
        product_type: string | null;
      }>(
        'SELECT stock_quantity, active, product_type FROM products WHERE id = ?',
        [productId]
      );

      if (!product) {
        throw new Error('المنتج غير موجود');
      }
      if (product.product_type === 'SERVICE') {
        throw new Error('لا يمكن تسجيل حركات مخزون لخدمة');
      }

      const newQuantity = product.stock_quantity + quantityChange;
      const now = getCurrentTimestamp();

      // 2. Update product stock
      await db.runAsync(
        'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?',
        [newQuantity, now, productId]
      );

      // 3. Create stock movement row
      await db.runAsync(
        `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, type, quantityChange, referenceId ?? null, note ?? null, now]
      );

      return newQuantity;
    });
  },
};
