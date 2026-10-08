import { getDb } from '../db/database';
import { Category } from '../types';
import { getCurrentTimestamp } from '../utils/date';

export const categoryRepository = {
  async getAllCategories(includeInactive = false): Promise<Category[]> {
    const db = getDb();
    const query = includeInactive
      ? 'SELECT * FROM categories ORDER BY name ASC'
      : 'SELECT * FROM categories WHERE active = 1 ORDER BY name ASC';
    return await db.getAllAsync<Category>(query);
  },

  async getCategoryById(id: number): Promise<Category | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
    return row || null;
  },

  async createCategory(name: string): Promise<Category> {
    const db = getDb();
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('اسم الفئة مطلوب');
    }

    const now = getCurrentTimestamp();
    const result = await db.runAsync(
      'INSERT INTO categories (name, active, created_at, updated_at) VALUES (?, 1, ?, ?)',
      [trimmed, now, now]
    );

    return {
      id: result.lastInsertRowId,
      name: trimmed,
      active: 1,
      created_at: now,
      updated_at: now,
    };
  },

  async updateCategory(id: number, name: string): Promise<void> {
    const db = getDb();
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('اسم الفئة مطلوب');
    }

    const now = getCurrentTimestamp();
    await db.runAsync(
      'UPDATE categories SET name = ?, updated_at = ? WHERE id = ?',
      [trimmed, now, id]
    );
  },

  async isCategoryReferencedByActiveProducts(id: number): Promise<boolean> {
    const db = getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND active = 1',
      [id]
    );
    return (row?.count || 0) > 0;
  },

  async deactivateCategory(id: number): Promise<void> {
    const isReferenced = await this.isCategoryReferencedByActiveProducts(id);
    if (isReferenced) {
      throw new Error('لا يمكن إلغاء تفعيل الفئة لأنها مرتبطة بمنتجات نشطة');
    }

    const db = getDb();
    const now = getCurrentTimestamp();
    await db.runAsync(
      'UPDATE categories SET active = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  },
};
