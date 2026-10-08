import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { getDb, runTransaction } from '../db/database';
import { syncRepository } from '../repositories/syncRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import {
  SyncFileFormat,
  SyncImportResult,
  Product,
  Category,
  Bill,
  BillItem,
} from '../types';
import { getCurrentTimestamp } from '../utils/date';

export const SYNC_VERSION = 1;

export const syncService = {
  /**
   * Saves sync export JSON file directly to local phone storage directory without share popup.
   */
  async exportSyncFileToDevice(): Promise<string> {
    const settings = await settingsRepository.getSettings();
    const ops = await syncRepository.getOperationsForExport(1000);

    const syncData: SyncFileFormat = {
      type: 'shop_sync',
      version: SYNC_VERSION,
      device_id: settings.device_id,
      exported_at: getCurrentTimestamp(),
      operations: ops,
    };

    const jsonString = JSON.stringify(syncData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileNameWithoutExt = `shop_sync_${dateStr}`;
    const fileName = `${fileNameWithoutExt}.json`;

    await settingsRepository.updateSettings({ last_sync_at: getCurrentTimestamp() });

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
          return 'تم حفظ ملف المزامنة بنجاح في المجلد المختار على الهاتف.';
        }
      } catch (e) {
        // Fallback to internal document directory
      }
    }

    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return `تم حفظ ملف التغييرات (المزامنة) بنجاح على الهاتف في:\n${fileName}`;
  },

  /**
   * Validates structure of a sync JSON object.
   */
  validateSyncFile(data: any): SyncFileFormat {
    if (!data || typeof data !== 'object') {
      throw new Error('ملف المزامنة غير صالح');
    }

    if (data.type !== 'shop_sync' || data.version !== SYNC_VERSION) {
      throw new Error('إصدار ملف المزامنة غير متوافق');
    }

    if (!data.device_id || typeof data.device_id !== 'string') {
      throw new Error('معرف الجهاز مفقود في ملف المزامنة');
    }

    if (!Array.isArray(data.operations)) {
      throw new Error('بيانات التغييرات مفقودة أو غير صالحة');
    }

    return data as SyncFileFormat;
  },

  /**
   * Processes imported sync operations inside a single transactional block.
   */
  async processImportData(syncData: SyncFileFormat): Promise<SyncImportResult> {
    const validated = this.validateSyncFile(syncData);
    const settings = await settingsRepository.getSettings();

    let importedCount = 0;
    let skippedCount = 0;
    let conflictCount = 0;
    const errors: string[] = [];

    await runTransaction(async (db) => {
      for (const op of validated.operations) {
        try {
          if (!op.operation_id || !op.operation_type || !op.payload) {
            errors.push(`عملية مفقودة البيانات: ${op.operation_id || 'بدون معرف'}`);
            continue;
          }

          // 1. Check idempotency: skip if operation_id was already imported or created locally
          const alreadyImported = await syncRepository.isOperationImported(op.operation_id, db);
          if (alreadyImported || op.device_id === settings.device_id) {
            skippedCount++;
            continue;
          }

          const payload = typeof op.payload === 'string' ? JSON.parse(op.payload) : op.payload;

          // 2. Process based on Operation Type
          switch (op.operation_type) {
            case 'SALE': {
              const { bill, items } = payload as { bill: Bill; items: BillItem[] };
              if (bill && items) {
                // Ensure unique invoice_number safely
                const existingBill = await db.getFirstAsync<{ id: number }>(
                  'SELECT id FROM bills WHERE invoice_number = ?',
                  [bill.invoice_number]
                );

                let invoiceNumToUse = bill.invoice_number;
                if (existingBill) {
                  const maxInvRow = await db.getFirstAsync<{ maxInv: number | null }>(
                    'SELECT MAX(invoice_number) as maxInv FROM bills'
                  );
                  invoiceNumToUse = (maxInvRow?.maxInv || 1000) + 1;
                  conflictCount++;
                }

                // Insert bill
                const resBill = await db.runAsync(
                  'INSERT INTO bills (invoice_number, subtotal, discount, total, created_at) VALUES (?, ?, ?, ?, ?)',
                  [invoiceNumToUse, bill.subtotal, bill.discount ?? 0, bill.total, bill.created_at || op.created_at]
                );
                const billId = resBill.lastInsertRowId;

                // Insert bill items & decrease product stock
                for (const item of items) {
                  await db.runAsync(
                    `INSERT INTO bill_items (bill_id, product_id, product_name, unit_price, quantity, total)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      billId,
                      item.product_id,
                      item.product_name,
                      item.unit_price,
                      item.quantity,
                      item.total,
                    ]
                  );

                  // Update stock
                  const prodRow = await db.getFirstAsync<{ stock_quantity: number }>(
                    'SELECT stock_quantity FROM products WHERE id = ?',
                    [item.product_id]
                  );

                  if (prodRow) {
                    const newStock = prodRow.stock_quantity - item.quantity;
                    await db.runAsync(
                      'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?',
                      [newStock, op.created_at, item.product_id]
                    );

                    // Insert stock movement
                    await db.runAsync(
                      `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
                       VALUES (?, 'SALE', ?, ?, ?, ?)`,
                      [
                        item.product_id,
                        -item.quantity,
                        billId,
                        `مزامنة مبيعات فاتورة #${invoiceNumToUse}`,
                        op.created_at,
                      ]
                    );
                  }
                }
              }
              break;
            }

            case 'RESTOCK':
            case 'ADJUSTMENT': {
              const { product_id, quantity_change, note, type } = payload;
              const prodRow = await db.getFirstAsync<{ stock_quantity: number }>(
                'SELECT stock_quantity FROM products WHERE id = ?',
                [product_id]
              );

              if (prodRow) {
                const newStock = prodRow.stock_quantity + quantity_change;
                await db.runAsync(
                  'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?',
                  [newStock, op.created_at, product_id]
                );

                await db.runAsync(
                  `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
                   VALUES (?, ?, ?, NULL, ?, ?)`,
                  [product_id, type || op.operation_type, quantity_change, note || 'مزامنة مخزون', op.created_at]
                );
              } else {
                conflictCount++;
              }
              break;
            }

            case 'PRODUCT_CREATE':
            case 'PRODUCT_UPDATE': {
              const prod = payload as Product;
              if (prod) {
                const localProd = await db.getFirstAsync<{ updated_at: string }>(
                  'SELECT updated_at FROM products WHERE id = ? OR name = ?',
                  [prod.id, prod.name]
                );

                // Last-Write-Wins (LWW) conflict strategy
                if (!localProd || new Date(prod.updated_at) >= new Date(localProd.updated_at)) {
                  await db.runAsync(
                    `INSERT OR REPLACE INTO products 
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
                      prod.created_at || op.created_at,
                      prod.updated_at || op.created_at,
                    ]
                  );
                } else {
                  conflictCount++;
                }
              }
              break;
            }

            case 'PRODUCT_DEACTIVATE': {
              const { id: prodId, updated_at } = payload;
              await db.runAsync('UPDATE products SET active = 0, updated_at = ? WHERE id = ?', [
                updated_at || op.created_at,
                prodId,
              ]);
              break;
            }

            case 'CATEGORY_CREATE':
            case 'CATEGORY_UPDATE': {
              const cat = payload as Category;
              if (cat) {
                const localCat = await db.getFirstAsync<{ updated_at: string }>(
                  'SELECT updated_at FROM categories WHERE id = ? OR name = ?',
                  [cat.id, cat.name]
                );

                if (!localCat || new Date(cat.updated_at) >= new Date(localCat.updated_at)) {
                  await db.runAsync(
                    'INSERT OR REPLACE INTO categories (id, name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                    [cat.id, cat.name, cat.active ?? 1, cat.created_at || op.created_at, cat.updated_at || op.created_at]
                  );
                } else {
                  conflictCount++;
                }
              }
              break;
            }

            case 'CATEGORY_DEACTIVATE': {
              const { id: catId, updated_at } = payload;
              await db.runAsync('UPDATE categories SET active = 0, updated_at = ? WHERE id = ?', [
                updated_at || op.created_at,
                catId,
              ]);
              break;
            }
          }

          // 3. Record operation into sync_operations table for local audit & idempotency
          await syncRepository.recordOperation(
            op.operation_type,
            op.entity_type,
            op.entity_id,
            payload,
            op.operation_id,
            op.device_id,
            db
          );

          importedCount++;
        } catch (err: any) {
          errors.push(`خطأ في العملية #${op.operation_id}: ${err.message}`);
        }
      }

      await settingsRepository.updateSettings({ last_sync_at: getCurrentTimestamp() });
    });

    return {
      importedCount,
      skippedCount,
      conflictCount,
      errors,
    };
  },

  /**
   * Document picker entry point to import sync JSON file safely in Expo Go.
   */
  async pickAndImportSyncFile(): Promise<SyncImportResult> {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { importedCount: 0, skippedCount: 0, conflictCount: 0, errors: [] };
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
    } catch (e) {
      throw new Error('الملف المختار ليس ملف JSON صالح للمزامنة');
    }

    return await this.processImportData(jsonParsed);
  },
};
