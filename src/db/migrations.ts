import * as SQLite from 'expo-sqlite';

// Increment this when you want to force a fresh DB wipe on next launch
const CURRENT_DB_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check the current user_version
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  // If version is outdated, wipe everything and start fresh (Option B)
  if (currentVersion < CURRENT_DB_VERSION) {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS stock_movements;
      DROP TABLE IF EXISTS bill_items;
      DROP TABLE IF EXISTS bills;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS settings;
      PRAGMA foreign_keys = ON;
    `);
  }

  // Create tables
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      purchase_price INTEGER NOT NULL DEFAULT 0,
      selling_price INTEGER NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      low_stock_threshold REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'قطعة',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number INTEGER UNIQUE NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      purchase_price INTEGER NOT NULL DEFAULT 0,
      quantity REAL NOT NULL,
      total INTEGER NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity_change REAL NOT NULL,
      reference_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
  `);

  // Seed default settings if not exists
  const settingsCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM settings'
  );

  if (!settingsCount || settingsCount.count === 0) {
    const defaultSettings: [string, string][] = [
      ['shop_name', 'القبطان'],
      ['shop_phone', '01000000000'],
      ['currency', 'ج.م'],
      ['receipt_footer', 'شكراً لزيارتكم ونتمنى رؤيتكم قريباً!'],
      ['low_stock_threshold_default', '5'],
      ['allow_negative_stock', 'false'],
    ];

    for (const [key, value] of defaultSettings) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        key,
        value,
      ]);
    }
  }

  // Mark the DB as up-to-date
  await db.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION}`);
}
