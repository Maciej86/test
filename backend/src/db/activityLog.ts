import type { PoolConnection } from 'mysql2/promise';

export type Changes = Record<string, { before: unknown; after: unknown }>;

export interface ActivityEntry {
  userId: number | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: number;
  changes: Changes;
}

const IGNORED_FIELDS = new Set(['updated_at']);

/** Pary „przed → po” tylko dla pól, które się zmieniły. */
export function diffChanges(before: Record<string, unknown>, after: Record<string, unknown>): Changes {
  const changes: Changes = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED_FIELDS.has(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return changes;
}

/** Zapis do historii zmian na połączeniu wołającego, czyli w tej samej transakcji co zmiana. */
export async function logActivity(conn: PoolConnection, entry: ActivityEntry): Promise<void> {
  await conn.query(
    'INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, changes) VALUES (?, ?, ?, ?, ?, ?)',
    [entry.userId, entry.userName, entry.action, entry.entityType, entry.entityId, JSON.stringify(entry.changes)],
  );
}
