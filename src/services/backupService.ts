import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { getDb, runTransaction } from '../db/database';
import { BackupData, Category, Product, Bill, BillItem, StockMovement } from '../types';
import { getCurrentTimestamp } from '../utils/date';

export const BACKUP_VERSION = '1.0';

export const backupService = {
  /**
   * Generates complete JSON backup structure from SQLite tables.
   */
  async generateBackupObject(): Promise<BackupData> {
    const db = getDb();

    const categories = await db.getAllAsync<Category>('SELECT * FROM categories');
    const products = await db.getAllAsync<Product>('SELECT * FROM products');
    const bills = await db.getAllAsync<Bill>('SELECT * FROM bills');
    const billItems = await db.getAllAsync<BillItem>('SELECT * FROM bill_items');
    const stockMovements = await db.getAllAsync<StockMovement>('SELECT * FROM stock_movements');
    const settingsRows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');

    const settings: Record<string, string> = {};
    settingsRows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return {
      version: BACKUP_VERSION,
      exported_at: getCurrentTimestamp(),
      categories,
      products,
      bills,
      bill_items: billItems,
      stock_movements: stockMovements,
      settings,
    };
  },

  /**
   * Saves backup JSON file directly to local phone storage without share popup.
   */
  async saveBackupFileToDevice(): Promise<string> {
    const backupData = await this.generateBackupObject();
    const jsonString = JSON.stringify(backupData, null, 2);

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileNameWithoutExt = `shop_backup_${dateStr}`;
    const fileName = `${fileNameWithoutExt}.json`;

    if (FileSystem.StorageAccessFramework) {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileNameWithoutExt,
            'application/json'
          );
          await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          return 'تم حفظ نسخة النسخ الاحتياطي الكاملة بنجاح في المجلد المختار على الهاتف.';
        }
      } catch (e) {
        // Fallback to internal document directory
      }
    }

    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return `تم حفظ ملف النسخة الاحتياطية الكاملة بنجاح على الهاتف في:\n${fileName}`;
  },

  /**
   * Validates structure of a backup JSON object before attempting restore.
   */
  validateBackupData(data: any): BackupData {
    if (!data || typeof data !== 'object') {
      throw new Error('ملف النسخة الاحتياطية غير صالحة');
    }

    if (!data.version || typeof data.version !== 'string') {
      throw new Error('إصدار النسخة الاحتياطية غير معروف');
    }

    if (!Array.isArray(data.categories)) {
      throw new Error('بيانات الفئات مفقودة أو غير صالحة');
    }

    if (!Array.isArray(data.products)) {
      throw new Error('بيانات المنتجات مفقودة أو غير صالحة');
    }

    if (!Array.isArray(data.bills)) {
      throw new Error('بيانات الفواتير مفقودة أو غير صالحة');
    }

    if (!Array.isArray(data.bill_items)) {
      throw new Error('بيانات عناصر الفواتير مفقودة أو غير صالحة');
    }

    if (!Array.isArray(data.stock_movements)) {
      throw new Error('بيانات حركة المخزون مفقودة أو غير صالحة');
    }

    if (!data.settings || typeof data.settings !== 'object') {
      throw new Error('إعدادات المحل مفقودة أو غير صالحة');
    }

    return data as BackupData;
  },

  /**
   * Restores data transactionally. Rollbacks completely if any step fails.
   */
  async restoreBackupData(backupData: BackupData): Promise<void> {
    const validated = this.validateBackupData(backupData);

    await runTransaction(async (db) => {
      // 1. Clear existing tables in correct order (respecting foreign key dependencies)
      await db.execAsync(`
        DELETE FROM bill_items;
        DELETE FROM stock_movements;
        DELETE FROM bills;
        DELETE FROM products;
        DELETE FROM categories;
        DELETE FROM settings;
      `);

      // 2. Restore settings
      for (const [key, value] of Object.entries(validated.settings)) {
        await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [
          key,
          String(value),
        ]);
      }

      // 3. Restore categories
      for (const cat of validated.categories) {
        await db.runAsync(
          'INSERT INTO categories (id, name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.active ?? 1, cat.created_at, cat.updated_at]
        );
      }

      // 4. Restore products
      for (const prod of validated.products) {
        await db.runAsync(
          `INSERT INTO products 
           (id, category_id, name, sku, barcode, purchase_price, selling_price, stock_quantity, low_stock_threshold, unit, active, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prod.id,
            prod.category_id ?? null,
            prod.name,
            prod.sku ?? null,
            prod.barcode ?? null,
            prod.purchase_price ?? 0,
            prod.selling_price ?? 0,
            prod.stock_quantity ?? 0,
            prod.low_stock_threshold ?? 0,
            prod.unit || 'قطعة',
            prod.active ?? 1,
            prod.created_at,
            prod.updated_at,
          ]
        );
      }

      // 5. Restore bills
      for (const bill of validated.bills) {
        await db.runAsync(
          'INSERT INTO bills (id, invoice_number, subtotal, discount, total, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            bill.id,
            bill.invoice_number,
            bill.subtotal,
            bill.discount ?? 0,
            bill.total,
            bill.created_at,
          ]
        );
      }

      // 6. Restore bill items
      for (const item of validated.bill_items) {
        await db.runAsync(
          `INSERT INTO bill_items (id, bill_id, product_id, product_name, unit_price, quantity, total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.bill_id,
            item.product_id,
            item.product_name,
            item.unit_price,
            item.quantity,
            item.total,
          ]
        );
      }

      // 7. Restore stock movements
      for (const mv of validated.stock_movements) {
        await db.runAsync(
          `INSERT INTO stock_movements (id, product_id, type, quantity_change, reference_id, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            mv.id,
            mv.product_id,
            mv.type,
            mv.quantity_change,
            mv.reference_id ?? null,
            mv.note ?? null,
            mv.created_at,
          ]
        );
      }
    });
  },

  /**
   * Prompts user to pick a JSON file via document picker and restores it.
   */
  async pickAndRestoreBackup(): Promise<void> {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Accepts JSON or generic files from document picker in Expo Go
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const pickedAsset = result.assets[0];
    const fileUri = pickedAsset.uri;
    let content = '';

    try {
      // Use fetch API to read local picked file URI (works seamlessly in Expo Go for content:// & cache file:// URIs)
      const res = await fetch(fileUri);
      content = await res.text();
    } catch (fetchErr) {
      // Fallback read
      content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    let jsonParsed: any;
    try {
      jsonParsed = JSON.parse(content);
    } catch (err) {
      throw new Error('الملف المختار ليس ملف JSON صالح');
    }

    await this.restoreBackupData(jsonParsed);
  },
};
