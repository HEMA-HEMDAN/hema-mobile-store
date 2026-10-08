import * as SQLite from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  // Execute table definitions and indexes
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
      ['shop_name', 'محل التجارة'],
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

  // Seed initial sample data if categories table is empty
  const categoriesCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );

  if (!categoriesCount || categoriesCount.count === 0) {
    const now = new Date().toISOString();
    
    // Seed categories
    const resCat1 = await db.runAsync(
      'INSERT INTO categories (name, active, created_at, updated_at) VALUES (?, 1, ?, ?)',
      ['مواد غذائية', now, now]
    );
    const resCat2 = await db.runAsync(
      'INSERT INTO categories (name, active, created_at, updated_at) VALUES (?, 1, ?, ?)',
      ['مشروبات', now, now]
    );
    const resCat3 = await db.runAsync(
      'INSERT INTO categories (name, active, created_at, updated_at) VALUES (?, 1, ?, ?)',
      ['منظفات', now, now]
    );

    const cat1Id = resCat1.lastInsertRowId;
    const cat2Id = resCat2.lastInsertRowId;
    const cat3Id = resCat3.lastInsertRowId;

    // Seed products
    // Note: Prices in piastres (15.50 EGP = 1550)
    const seedProducts = [
      {
        catId: cat1Id,
        name: 'أرز مصري ممتاز 1 كجم',
        sku: 'RICE-01',
        barcode: '6221001',
        purchase: 2500, // 25.00 EGP
        selling: 3200,  // 32.00 EGP
        stock: 50,
        lowThreshold: 10,
        unit: 'كجم',
      },
      {
        catId: cat1Id,
        name: 'زيت عباد الشمس 1 لتر',
        sku: 'OIL-01',
        barcode: '6221002',
        purchase: 5000, // 50.00 EGP
        selling: 6500,  // 65.00 EGP
        stock: 3,       // Low stock!
        lowThreshold: 5,
        unit: 'عبوة',
      },
      {
        catId: cat2Id,
        name: 'عصير برتقال طبيعي 250 مل',
        sku: 'JUICE-01',
        barcode: '6221003',
        purchase: 800,  // 8.00 EGP
        selling: 1200,  // 12.00 EGP
        stock: 0,       // Out of stock!
        lowThreshold: 10,
        unit: 'علبة',
      },
      {
        catId: cat3Id,
        name: 'مسحوق غسيل أوتوماتيك 1 كجم',
        sku: 'DET-01',
        barcode: '6221004',
        purchase: 4000, // 40.00 EGP
        selling: 5500,  // 55.00 EGP
        stock: 20,
        lowThreshold: 5,
        unit: 'كيس',
      },
    ];

    for (const prod of seedProducts) {
      const resProd = await db.runAsync(
        `INSERT INTO products 
         (category_id, name, sku, barcode, purchase_price, selling_price, stock_quantity, low_stock_threshold, unit, active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          prod.catId,
          prod.name,
          prod.sku,
          prod.barcode,
          prod.purchase,
          prod.selling,
          prod.stock,
          prod.lowThreshold,
          prod.unit,
          now,
          now,
        ]
      );

      // Record initial stock movement
      if (prod.stock > 0) {
        await db.runAsync(
          `INSERT INTO stock_movements (product_id, type, quantity_change, reference_id, note, created_at)
           VALUES (?, 'RESTOCK', ?, NULL, 'مخزون افتتاحي', ?)`,
          [resProd.lastInsertRowId, prod.stock, now]
        );
      }
    }
  }
}
