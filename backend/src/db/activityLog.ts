import type { PoolConnection } from 'mysql2/promise';

export type Changes = Record<string, { before: unknown; after: unknown }>;

export type ActivityContext = Record<string, string | number>;

export interface ActivityEntry {
  userId: number | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: number;
  /** Czego dotyczy wpis (osoba, tytuł zadania, nazwa projektu), zapamiętane w chwili zmiany. */
  entityName: string;
  /**
   * Dane do krótkiego opisu (bez słów: ekran układa z nich zdanie z `activity-log.json` → `context`), np.
   * `{ project: 'Marketing' }`, `{ leaveType: 'Wypoczynkowy', from: '2026-12-22', to: '2026-12-31', days: 6 }`.
   */
  entityContext?: ActivityContext | null;
  changes: Changes;
}

/** Długość kolumn `entity_name` i `entity_context`. */
const LABEL_MAX = 255;
const cut = (value: string): string => (value.length > LABEL_MAX ? value.slice(0, LABEL_MAX) : value);
/** Opis jako JSON; za długi (nie zmieści się w kolumnie) zostaje pominięty, żeby nie zapisać uciętego JSON. */
const contextJson = (context: ActivityContext | null | undefined): string | null => {
  if (!context) return null;
  const json = JSON.stringify(context);
  return json.length > LABEL_MAX ? null : json;
};

const IGNORED_FIELDS = new Set(['updated_at']);

/** Pary „przed → po” tylko dla pól, które się zmieniły. */
export const diffChanges = (before: Record<string, unknown>, after: Record<string, unknown>): Changes => {
  const changes: Changes = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED_FIELDS.has(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return changes;
};

/** Zapis do historii zmian na połączeniu wołającego, czyli w tej samej transakcji co zmiana. */
export const logActivity = async (conn: PoolConnection, entry: ActivityEntry): Promise<void> => {
  await conn.query(
    'INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, entity_name, entity_context, changes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.userId,
      entry.userName,
      entry.action,
      entry.entityType,
      entry.entityId,
      cut(entry.entityName),
      contextJson(entry.entityContext),
      JSON.stringify(entry.changes),
    ],
  );
};
