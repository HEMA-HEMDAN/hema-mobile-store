import * as SQLite from 'expo-sqlite';
import { migrateDbIfNeeded } from './migrations';

const DB_NAME = 'shop_inventory.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = getDb();
    await migrateDbIfNeeded(db);
    return db;
  })();

  return initPromise;
}

/**
 * Runs a transactional callback using expo-sqlite transaction.
 */
export async function runTransaction<T>(
  callback: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = getDb();
  let result: T;
  
  await db.withTransactionAsync(async () => {
    result = await callback(db);
  });

  return result!;
}
