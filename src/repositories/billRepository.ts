import { getDb, runTransaction } from '../db/database';
import { Bill, BillItem, CartItem } from '../types';
import { getCurrentTimestamp, getTodayDateRange } from '../utils/date';

export const billRepository = {
  async getNextInvoiceNumber(): Promise<number> {
    const db = getDb();
    const row = await db.getFirstAsync<{ maxInv: number | null }>(
      'SELECT MAX(invoice_number) as maxInv FROM bills'
    );
    const maxInv = row?.maxInv;
    return maxInv ? maxInv + 1 : 1001;
  },

  async saveBillTransaction(
    cartItems: CartItem[],
    discountPiastres = 0,
    allowNegativeStock = false
  ): Promise<Bill> {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('السلة فارغة، لا يمكن إتمام الفاتورة');
    }

    if (discountPiastres < 0) {
      throw new Error('قيمة الخصم غير صالحة');
    }

    return await runTransaction(async (db) => {
      // 1. Calculate subtotal & validate stock for all items inside transaction
      let subtotal = 0;

      for (const item of cartItems) {
        if (item.quantity <= 0) {
          throw new Error(`الكمية المطلوبة للمنتج (${item.product.name}) غير صالحة`);
        }

        // Fetch fresh product from DB to ensure accurate stock
        const freshProduct = await db.getFirstAsync<{
          id: number;
          name: string;
          stock_quantity: number;
          selling_price: number;
          active: number;
        }>('SELECT id, name, stock_quantity, selling_price, active FROM products WHERE id = ?', [
          item.product.id,
        ]);

        if (!freshProduct || freshProduct.active !== 1) {
          throw new Error(`المنتج (${item.product.name}) غير متاح حالياً`);
        }

        if (!allowNegativeStock && freshProduct.stock_quantity < item.quantity) {
          throw new Error(`لا يمكن بيع كمية أكبر من المخزون المتاح للمنتج (${freshProduct.name})`);
        }

        const unitPrice = item.unit_price ?? freshProduct.selling_price;
        const itemTotal = Math.round(unitPrice * item.quantity);
        subtotal += itemTotal;
      }

      const total = Math.max(0, subtotal - discountPiastres);

      // 2. Get next invoice number
      const rowInv = await db.getFirstAsync<{ maxInv: number | null }>(
        'SELECT MAX(invoice_number) as maxInv FROM bills'
      );
      const invoiceNumber = (rowInv?.maxInv ?? 1000) + 1;
      const now = getCurrentTimestamp();

      // 3. Create bill record
      const resBill = await db.runAsync(
        'INSERT INTO bills (invoice_number, subtotal, discount, total, created_at) VALUES (?, ?, ?, ?, ?)',
        [invoiceNumber, subtotal, discountPiastres, total, now]
      );
      const billId = resBill.lastInsertRowId;

      // 4. Create bill_items snapshots, decrease product stock & create stock movements
      for (const item of cartItems) {
        const freshProduct = (await db.getFirstAsync<{
          name: string;
          selling_price: number;
          purchase_price: number;
          stock_quantity: number;
        }>('SELECT name, selling_price, purchase_price, stock_quantity FROM products WHERE id = ?', [
          item.product.id,
        ]))!;

        const unitPrice = item.unit_price ?? freshProduct.selling_price;
        const itemTotal = Math.round(unitPrice * item.quantity);

        // Snapshot insert into bill_items (including purchase_price for profit tracking)
        await db.runAsync(
          `INSERT INTO bill_items (bill_id, product_id, product_name, unit_price, purchase_price, quantity, total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [billId, item.product.id, freshProduct.name, unitPrice, freshProduct.purchase_price ?? 0, item.quantity, itemTotal]
        );

        // Decrease product stock
        const newStock = freshProduct.stock_quantity - item.quantity;
        await db.runAsync(
          'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?',
          [newStock, now, item.product.id]
        );

        // Create stock movement (type: SALE)
        await db.runAsync(
          `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
           VALUES (?, 'SALE', ?, ?, ?, ?)`,
          [
            item.product.id,
            -item.quantity,
            billId,
            `فاتورة مبيعات رقم #${invoiceNumber}`,
            now,
          ]
        );
      }

      return {
        id: billId,
        invoice_number: invoiceNumber,
        subtotal,
        discount: discountPiastres,
        total,
        created_at: now,
      };
    });
  },

  async getBills(limit = 50, offset = 0, searchQuery?: string): Promise<Bill[]> {
    const db = getDb();
    let query = 'SELECT * FROM bills WHERE 1=1';
    const params: (string | number)[] = [];

    if (searchQuery?.trim()) {
      const q = searchQuery.trim();
      const numVal = parseInt(q, 10);
      if (!isNaN(numVal)) {
        query += ' AND (invoice_number = ? OR invoice_number LIKE ?)';
        params.push(numVal, `%${q}%`);
      } else {
        query += ' AND created_at LIKE ?';
        params.push(`%${q}%`);
      }
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await db.getAllAsync<Bill>(query, params);
  },

  async getBillById(id: number): Promise<{ bill: Bill; items: BillItem[] } | null> {
    const db = getDb();
    const bill = await db.getFirstAsync<Bill>('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) return null;

    const items = await db.getAllAsync<BillItem>(
      'SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC',
      [id]
    );

    return { bill, items };
  },

  async getTodayBills(): Promise<Bill[]> {
    const db = getDb();
    const { startISO, endISO } = getTodayDateRange();
    return await db.getAllAsync<Bill>(
      'SELECT * FROM bills WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
      [startISO, endISO]
    );
  },

  async getTodaySummary(): Promise<{ totalSales: number; billCount: number }> {
    const db = getDb();
    const { startISO, endISO } = getTodayDateRange();
    const row = await db.getFirstAsync<{ totalSales: number | null; billCount: number }>(
      `SELECT SUM(total) as totalSales, COUNT(*) as billCount 
       FROM bills 
       WHERE created_at >= ? AND created_at <= ?`,
      [startISO, endISO]
    );

    return {
      totalSales: row?.totalSales || 0,
      billCount: row?.billCount || 0,
    };
  },

  /**
   * Calculate net profit for a date range.
   * netProfit = Σ (unit_price - purchase_price) * quantity  [from bill_items]
   * damagedItemsLoss = Σ purchase_price * |quantity_change|  [from DAMAGED stock movements]
   */
  async getProfitSummary(
    startISO: string,
    endISO: string
  ): Promise<{ netProfit: number; damagedItemsLoss: number }> {
    const db = getDb();

    // Net profit from sales: revenue minus cost of goods sold
    const profitRow = await db.getFirstAsync<{ netProfit: number | null }>(
      `SELECT SUM((bi.unit_price - bi.purchase_price) * bi.quantity) as netProfit
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE b.created_at >= ? AND b.created_at <= ?`,
      [startISO, endISO]
    );

    // Damaged items loss: cost of damaged stock (purchase_price * damaged_qty)
    const damagedRow = await db.getFirstAsync<{ damagedLoss: number | null }>(
      `SELECT SUM(p.purchase_price * ABS(sm.quantity_change)) as damagedLoss
       FROM stock_movements sm
       JOIN products p ON sm.product_id = p.id
       WHERE sm.type = 'DAMAGED'
         AND sm.created_at >= ? AND sm.created_at <= ?`,
      [startISO, endISO]
    );

    return {
      netProfit: Math.round(profitRow?.netProfit || 0),
      damagedItemsLoss: Math.round(damagedRow?.damagedLoss || 0),
    };
  },
};
