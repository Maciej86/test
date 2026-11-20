import type { RowDataPacket } from 'mysql2';
import type { ActivityArea, ActivityChange } from '@app/shared';
import type { Db } from '../../db/pool';
import { likePattern } from '../../db/like';

/** Wpis z bazy, przed sprawdzeniem stanu rekordu i zamianą numerów osób na imiona. */
export interface EntryRow {
  id: number;
  createdAt: string;
  userName: string;
  action: string;
  area: ActivityArea;
  entityId: number;
  entityName: string;
  entityContext: Record<string, string | number> | null;
  changes: Record<string, ActivityChange>;
}

export interface EntryFilters {
  page: number;
  pageSize: number;
  search: string;
  area?: ActivityArea;
  userId?: number;
  /** Początek dnia „od” (UTC, jak `created_at`). */
  fromAt?: Date;
  /** Początek dnia po dniu „do” (UTC): `created_at < toAt`. */
  toAt?: Date;
}

/** mysql2 oddaje kolumnę JSON jako obiekt; tekst (VARCHAR `entity_context`) czytamy ostrożnie. */
const parseJson = <T>(value: unknown): T | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const toEntry = (r: RowDataPacket): EntryRow => ({
  id: r.id as number,
  createdAt: (r.created_at as Date).toISOString(),
  userName: r.user_name as string,
  action: r.action as string,
  area: r.entity_type as ActivityArea,
  entityId: r.entity_id as number,
  entityName: r.entity_name as string,
  entityContext: parseJson(r.entity_context),
  changes: parseJson(r.changes) ?? {},
});

const whereOf = (f: EntryFilters): { sql: string; params: unknown[] } => {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (f.search) {
    parts.push('(a.entity_name LIKE ? OR a.entity_context LIKE ? OR a.user_name LIKE ?)');
    const like = likePattern(f.search);
    params.push(like, like, like);
  }
  if (f.area) {
    parts.push('a.entity_type = ?');
    params.push(f.area);
  }
  if (f.userId) {
    parts.push('a.user_id = ?');
    params.push(f.userId);
  }
  if (f.fromAt) {
    parts.push('a.created_at >= ?');
    params.push(f.fromAt);
  }
  if (f.toAt) {
    parts.push('a.created_at < ?');
    params.push(f.toAt);
  }
  return { sql: parts.length > 0 ? ` WHERE ${parts.join(' AND ')}` : '', params };
};

/** Strona dziennika: najnowsze na górze, filtry tylko jako parametry `?`. */
export const listEntries = async (db: Db, f: EntryFilters): Promise<{ rows: EntryRow[]; total: number }> => {
  const where = whereOf(f);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT a.id, a.created_at, a.user_name, a.action, a.entity_type, a.entity_id, a.entity_name, a.entity_context, a.changes
     FROM activity_log a${where.sql} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`, // rule-ok: WHERE z gotowych kawałków z ?, dane tylko w parametrach
    [...where.params, f.pageSize, (f.page - 1) * f.pageSize],
  );
  const [count] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM activity_log a${where.sql}`, where.params); // rule-ok: ten sam WHERE z ?
  return { rows: rows.map(toEntry), total: Number(count[0]?.total ?? 0) };
};

/** Osoby do filtra „Kto zmienił”: autorzy wpisów z kontem (także w archiwum), z obecnym imieniem. */
export const listPeople = async (db: Db): Promise<{ userId: number; userName: string }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT a.user_id, COALESCE(MAX(u.name), MAX(a.user_name)) AS user_name
     FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.user_id IS NOT NULL GROUP BY a.user_id ORDER BY user_name`,
  );
  return rows.map((r) => ({ userId: r.user_id as number, userName: r.user_name as string }));
};

export interface FoundRecord {
  archived: boolean;
  /** Zadanie: projekt (adres tablicy). */
  projectId?: number;
  /** Konto i pula dni: login (wyszukanie na liście pracowników). */
  login?: string;
}

export interface RecordRef {
  area: ActivityArea;
  id: number;
}

const ids = (refs: RecordRef[], areas: ActivityArea[]) => [...new Set(refs.filter((r) => areas.includes(r.area)).map((r) => r.id))];

/**
 * Rekordy, których dotyczą wpisy: klucz `<obszar>:<numer>`; brak klucza = usunięty na stałe. Pula dni należy do
 * konta (numer wpisu to numer osoby). Jedno zapytanie na obszar.
 */
export const findRecords = async (db: Db, refs: RecordRef[]): Promise<Map<string, FoundRecord>> => {
  const found = new Map<string, FoundRecord>();
  const simple = async (area: ActivityArea, table: string) => {
    const list = ids(refs, [area]);
    if (list.length === 0) return;
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id FROM ${table} WHERE id IN (?)`, [list]); // rule-ok: nazwa tabeli tylko ze stałych w tym pliku
    for (const r of rows) found.set(`${area}:${r.id}`, { archived: false });
  };

  await simple('leave_requests', 'leave_requests');
  const taskIds = ids(refs, ['tasks']);
  if (taskIds.length > 0) {
    const [rows] = await db.query<RowDataPacket[]>('SELECT id, project_id, archived_at FROM tasks WHERE id IN (?)', [taskIds]);
    for (const r of rows) found.set(`tasks:${r.id}`, { archived: r.archived_at !== null, projectId: r.project_id as number });
  }
  await simple('projects', 'projects');
  const userIds = ids(refs, ['users', 'leave_pools']);
  if (userIds.length > 0) {
    const [rows] = await db.query<RowDataPacket[]>('SELECT id, login, archived_at FROM users WHERE id IN (?)', [userIds]);
    for (const r of rows) {
      const record = { archived: r.archived_at !== null, login: r.login as string };
      found.set(`users:${r.id}`, record);
      found.set(`leave_pools:${r.id}`, record);
    }
  }
  await simple('leave_types', 'leave_types');
  await simple('contract_types', 'contract_types');
  return found;
};

/** Imiona osób ze zmian (przypisani, osoby w projekcie); brak w mapie = konto usunięte. */
export const userNames = async (db: Db, list: number[]): Promise<Map<number, string>> => {
  if (list.length === 0) return new Map();
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, name FROM users WHERE id IN (?)', [list]);
  return new Map(rows.map((r) => [r.id as number, r.name as string]));
};
