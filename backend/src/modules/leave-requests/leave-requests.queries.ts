import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { LeaveRequestFilter, LeaveRequestStatus } from '@app/shared';
import { PAGE_SIZE } from '../../config/constants';
import type { pool } from '../../db/pool';
import type { Actor } from '../../middleware/routeHelpers';
import type { PoolRow } from '../employees/employees.queries';

export type Db = Pick<typeof pool, 'query'>;

const PENDING: LeaveRequestStatus = 'pending';
const ACTIVE: LeaveRequestStatus[] = ['pending', 'approved'];

/** Wniosek dowolnej osoby z imieniem i nazwiskiem (lista i szczegóły administratora). */
export interface RequestRow extends RowDataPacket {
  id: number;
  user_id: number;
  employee_name: string;
  employee_archived_at: Date | null;
  leave_type_id: number;
  leave_type_name: string;
  deducts_pool: number | boolean;
  date_from: string;
  date_to: string;
  working_days: number;
  days_from_carried: number;
  days_from_annual: number;
  pool_year: number;
  comment: string | null;
  status: LeaveRequestStatus;
  decision_reason: string | null;
  decided_by_name: string | null;
  decided_at: Date | null;
  created_at: Date;
}

/** Wiersz po zamianie: pola jak w API plus numer osoby (do puli), bez liczb puli. */
export interface RequestItem {
  id: number;
  userId: number;
  employeeName: string;
  employeeArchived: boolean;
  leaveTypeName: string;
  deductsPool: boolean;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  poolYear: number;
  comment: string | null;
  status: LeaveRequestStatus;
  decisionReason: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const SELECT_REQUEST = `SELECT r.id, r.user_id, u.name AS employee_name, u.archived_at AS employee_archived_at, r.leave_type_id,
  lt.name AS leave_type_name, lt.deducts_pool, r.date_from, r.date_to, r.working_days, r.days_from_carried, r.days_from_annual,
  r.pool_year, r.comment, r.status, r.decision_reason, r.decided_by_name, r.decided_at, r.created_at`;
const FROM = 'FROM leave_requests r JOIN users u ON u.id = r.user_id JOIN leave_types lt ON lt.id = r.leave_type_id';

export const toItem = (r: RequestRow): RequestItem => ({
  id: r.id,
  userId: r.user_id,
  employeeName: r.employee_name,
  employeeArchived: r.employee_archived_at !== null,
  leaveTypeName: r.leave_type_name,
  deductsPool: Boolean(r.deducts_pool),
  dateFrom: r.date_from,
  dateTo: r.date_to,
  workingDays: r.working_days,
  daysFromCarried: r.days_from_carried,
  daysFromAnnual: r.days_from_annual,
  poolYear: r.pool_year,
  comment: r.comment,
  status: r.status,
  decisionReason: r.decision_reason,
  decidedByName: r.decided_by_name,
  decidedAt: r.decided_at ? r.decided_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

export interface ListFilters {
  status: LeaveRequestFilter;
  /** Rok puli; nie dotyczy zakładki „Czekają” (czekające ze wszystkich lat). */
  year: number;
  leaveTypeId: number | undefined;
  search: string;
  page: number;
}

/**
 * Strona listy administratora. Kolejność (odpowiedź 7a): czekające od najdawniej złożonego, pozostałe od najnowszego
 * terminu. WHERE składa się tylko z gotowych kawałków z `?`.
 */
export const listRequests = async (db: Db, f: ListFilters): Promise<{ rows: RequestItem[]; total: number }> => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.status !== 'all') {
    where.push('r.status = ?');
    params.push(f.status);
  }
  if (f.status !== 'pending') {
    where.push('r.pool_year = ?');
    params.push(f.year);
  }
  if (f.leaveTypeId !== undefined) {
    where.push('r.leave_type_id = ?');
    params.push(f.leaveTypeId);
  }
  if (f.search !== '') {
    where.push('u.name LIKE ?');
    params.push(`%${f.search}%`);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const order = f.status === 'pending' ? 'r.created_at ASC, r.id ASC' : 'r.date_from DESC, r.id DESC';
  const [rows] = await db.query<RequestRow[]>(
    `${SELECT_REQUEST} ${FROM} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`, // rule-ok: kolumny i FROM to stałe z tego pliku, WHERE z gotowych kawałków z ?, ORDER BY z dwóch stałych
    [...params, PAGE_SIZE, (f.page - 1) * PAGE_SIZE],
  );
  const [count] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total ${FROM} ${whereSql}`, params); // rule-ok: jak wyżej
  return { rows: rows.map(toItem), total: Number(count[0]?.total ?? 0) };
};

/** Ile wniosków czeka na decyzję (wszystkie lata) i kiedy złożono najstarszy. */
export const pendingSummary = async (db: Db): Promise<{ count: number; oldestAt: string | null }> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total, MIN(created_at) AS oldest FROM leave_requests WHERE status = ?', [PENDING]);
  const oldest = rows[0]?.oldest as Date | null | undefined;
  return { count: Number(rows[0]?.total ?? 0), oldestAt: oldest ? oldest.toISOString() : null };
};

/** Lata puli, w których są wnioski, od najnowszego. */
export const listRequestYears = async (db: Db): Promise<number[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DISTINCT pool_year FROM leave_requests ORDER BY pool_year DESC');
  return rows.map((r) => Number(r.pool_year));
};

/** Jeden wniosek; `lock`: blokada wiersza do końca transakcji (decyzje dwóch administratorów po kolei). */
export const findRequest = async (db: Db, id: number, opts: { lock?: boolean } = {}): Promise<RequestItem | null> => {
  const [rows] = await db.query<RequestRow[]>(
    `${SELECT_REQUEST} ${FROM} WHERE r.id = ?${opts.lock ? ' FOR UPDATE' : ''}`, // rule-ok: stałe z tego pliku, numer przez ?
    [id],
  );
  return rows[0] ? toItem(rows[0]) : null;
};

/** Inne osoby z wnioskiem czekającym albo zatwierdzonym, który ma choć jeden wspólny dzień z terminem. */
export const listOverlapping = async (
  db: Db,
  r: { userId: number; dateFrom: string; dateTo: string },
): Promise<{ employeeName: string; dateFrom: string; dateTo: string; status: LeaveRequestStatus }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.name AS employee_name, r.date_from, r.date_to, r.status FROM leave_requests r JOIN users u ON u.id = r.user_id
     WHERE r.user_id <> ? AND r.status IN (?) AND r.date_from <= ? AND r.date_to >= ? ORDER BY r.date_from, u.name`,
    [r.userId, ACTIVE, r.dateTo, r.dateFrom],
  );
  return rows.map((o) => ({ employeeName: o.employee_name, dateFrom: o.date_from, dateTo: o.date_to, status: o.status }));
};

/** Pula otwarta (najstarszy niezamknięty rok) każdej z osób; osoby bez puli nie ma w mapie. */
export const findOpenPools = async (db: Db, userIds: number[]): Promise<Map<number, PoolRow>> => {
  if (userIds.length === 0) return new Map();
  const [rows] = await db.query<PoolRow[]>(
    `SELECT p.id, p.user_id, p.year, p.annual_days, p.carried_days, p.closed_at FROM leave_pools p
     WHERE p.user_id IN (?) AND p.closed_at IS NULL ORDER BY p.year DESC`,
    [userIds],
  );
  // Malejąco po roku: ostatni zapis dla osoby to jej najstarszy otwarty rok (tak jak findOpenPoolOfUser).
  return new Map(rows.map((p) => [p.user_id, p]));
};

/** Czy pula osoby na dany rok istnieje i nie jest zamknięta (anulowanie urlopu tylko w otwartym roku). */
export const isPoolOpen = async (db: Db, userId: number, year: number): Promise<boolean> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 AS open FROM leave_pools WHERE user_id = ? AND year = ? AND closed_at IS NULL', [userId, year]);
  return rows.length > 0;
};

/**
 * Decyzja: zmiana statusu tylko, gdy wniosek ma jeszcze status `from` (drugi administrator albo wycofanie w tej samej
 * chwili nic już nie zmieni). Zwraca liczbę zmienionych wierszy (0 = ktoś był szybszy).
 */
export const setDecision = async (
  db: Db,
  id: number,
  d: { from: LeaveRequestStatus; to: LeaveRequestStatus; actor: Actor; reason: string | null },
): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    'UPDATE leave_requests SET status = ?, decided_by = ?, decided_by_name = ?, decided_at = NOW(), decision_reason = ? WHERE id = ? AND status = ?',
    [d.to, d.actor.id, d.actor.name, d.reason, id, d.from],
  );
  return result.affectedRows;
};
