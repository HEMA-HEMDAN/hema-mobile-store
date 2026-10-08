import { getDb } from '../db/database';
import { productRepository } from '../repositories/productRepository';
import { ReportSummary, Product } from '../types';
import {
  getTodayDateRange,
  getThisWeekDateRange,
  getThisMonthDateRange,
} from '../utils/date';

export const reportService = {
  async getReportSummary(
    period: 'today' | 'week' | 'month' | 'custom',
    customStartISO?: string,
    customEndISO?: string
  ): Promise<ReportSummary> {
    const db = getDb();
    let startISO = customStartISO;
    let endISO = customEndISO;

    if (period === 'today') {
      const range = getTodayDateRange();
      startISO = range.startISO;
      endISO = range.endISO;
    } else if (period === 'week') {
      const range = getThisWeekDateRange();
      startISO = range.startISO;
      endISO = range.endISO;
    } else if (period === 'month') {
      const range = getThisMonthDateRange();
      startISO = range.startISO;
      endISO = range.endISO;
    }

    // 1. Sales & Bills aggregates
    let salesQuery = 'SELECT COUNT(*) as billsCount, SUM(total) as totalSales FROM bills WHERE 1=1';
    const salesParams: string[] = [];

    if (startISO && endISO) {
      salesQuery += ' AND created_at >= ? AND created_at <= ?';
      salesParams.push(startISO, endISO);
    }

    const salesAgg = await db.getFirstAsync<{
      billsCount: number;
      totalSales: number | null;
    }>(salesQuery, salesParams);

    const billsCount = salesAgg?.billsCount || 0;
    const totalSales = salesAgg?.totalSales || 0;
    const averageBillValue = billsCount > 0 ? Math.round(totalSales / billsCount) : 0;

    // 2. Top-selling products
    let topProdQuery = `
      SELECT 
        bi.product_id,
        bi.product_name,
        SUM(bi.quantity) as total_quantity,
        SUM(bi.total) as total_revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE 1=1
    `;
    const topProdParams: string[] = [];

    if (startISO && endISO) {
      topProdQuery += ' AND b.created_at >= ? AND b.created_at <= ?';
      topProdParams.push(startISO, endISO);
    }

    topProdQuery += `
      GROUP BY bi.product_id, bi.product_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    const topSellingProducts = await db.getAllAsync<{
      product_id: number;
      product_name: string;
      total_quantity: number;
      total_revenue: number;
    }>(topProdQuery, topProdParams);

    // 3. Inventory details & values
    const lowStockProducts = await productRepository.getLowStockProducts();
    const outOfStockProducts = await productRepository.getOutOfStockProducts();
    const inventoryTotals = await productRepository.getInventoryTotals();

    return {
      period,
      startDate: startISO,
      endDate: endISO,
      totalSales,
      billsCount,
      averageBillValue,
      topSellingProducts,
      lowStockProducts,
      outOfStockProducts,
      inventoryValuePurchase: inventoryTotals.totalPurchaseValue,
      inventoryValueSelling: inventoryTotals.totalSellingValue,
    };
  },
};
