import { getDb } from '../db/database';
import { SyncEntityType, SyncOperation, SyncOperationType } from '../types';
import { getCurrentTimestamp } from '../utils/date';
import { generateUUID } from '../utils/uuid';
import { settingsRepository } from './settingsRepository';

export const syncRepository = {
  /**
   * Inserts a sync operation row into SQLite database.
   */
  async recordOperation(
    operationType: SyncOperationType,
    entityType: SyncEntityType,
    entityId: string | number,
    payload: any,
    providedOperationId?: string,
    providedDeviceId?: string,
    dbOverride?: any
  ): Promise<SyncOperation> {
    const db = dbOverride || getDb();
    const settings = await settingsRepository.getSettings();

    const operationId = providedOperationId || generateUUID();
    const deviceId = providedDeviceId || settings.device_id;
    const now = getCurrentTimestamp();
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload);

    await db.runAsync(
      `INSERT INTO sync_operations (operation_id, device_id, operation_type, entity_type, entity_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        operationId,
        deviceId,
        operationType,
        entityType,
        String(entityId),
        payloadJson,
        now,
      ]
    );

    return {
      operation_id: operationId,
      device_id: deviceId,
      operation_type: operationType,
      entity_type: entityType,
      entity_id: String(entityId),
      payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
      created_at: now,
    };
  },

  /**
   * Checks if an operation_id was already recorded or imported.
   */
  async isOperationImported(operationId: string, dbOverride?: any): Promise<boolean> {
    const db = dbOverride || getDb();
    const row = (await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM sync_operations WHERE operation_id = ?',
      [operationId]
    )) as { count: number } | null;
    return (row?.count || 0) > 0;
  },

  /**
   * Returns pending sync operations for export.
   */
  async getOperationsForExport(limit = 500): Promise<SyncOperation[]> {
    const db = getDb();
    const rows = (await db.getAllAsync('SELECT * FROM sync_operations ORDER BY id ASC LIMIT ?', [limit])) as Array<{
      id: number;
      operation_id: string;
      device_id: string;
      operation_type: SyncOperationType;
      entity_type: SyncEntityType;
      entity_id: string;
      payload: string;
      created_at: string;
    }>;

    return rows.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload),
    }));
  },

  /**
   * Gets total count of recorded sync operations on this device.
   */
  async getSyncOperationsCount(): Promise<number> {
    const db = getDb();
    const row = (await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM settings'
    )) as { count: number } | null;

    const syncOpsRow = (await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM sync_operations'
    )) as { count: number } | null;

    return syncOpsRow?.count || 0;
  },
};
