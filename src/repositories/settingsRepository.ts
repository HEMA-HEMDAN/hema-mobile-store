import { getDb } from '../db/database';
import { ShopSettings } from '../types';

export const settingsRepository = {
  async getSettings(): Promise<ShopSettings> {
    const db = getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settingsMap: Record<string, string> = {};

    rows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });

    const parsedThreshold = parseInt(settingsMap['low_stock_threshold_default'] || '5', 10);
    const low_stock_threshold_default = isNaN(parsedThreshold) ? 5 : parsedThreshold;

    return {
      shop_name: settingsMap['shop_name'] || 'القبطان',
      shop_phone: settingsMap['shop_phone'] || '',
      currency: settingsMap['currency'] || 'ج.م',
      receipt_footer: settingsMap['receipt_footer'] || 'شكراً لزيارتكم!',
      low_stock_threshold_default,
      allow_negative_stock: settingsMap['allow_negative_stock'] === 'true',
      device_id: settingsMap['device_id'] || 'DEVICE-DEFAULT',
      last_sync_at: settingsMap['last_sync_at'] || null,
    };
  },

  async updateSettings(settings: Partial<ShopSettings>): Promise<void> {
    const db = getDb();
    
    if (settings.shop_name !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'shop_name',
        settings.shop_name.trim() || 'القبطان',
      ]);
    }

    if (settings.shop_phone !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'shop_phone',
        settings.shop_phone.trim(),
      ]);
    }

    if (settings.currency !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'currency',
        settings.currency.trim() || 'ج.م',
      ]);
    }

    if (settings.receipt_footer !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'receipt_footer',
        settings.receipt_footer.trim(),
      ]);
    }

    if (settings.low_stock_threshold_default !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'low_stock_threshold_default',
        settings.low_stock_threshold_default.toString(),
      ]);
    }

    if (settings.allow_negative_stock !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'allow_negative_stock',
        settings.allow_negative_stock ? 'true' : 'false',
      ]);
    }

    if (settings.device_id !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'device_id',
        settings.device_id,
      ]);
    }

    if (settings.last_sync_at !== undefined) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'last_sync_at',
        settings.last_sync_at || '',
      ]);
    }
  },
};
