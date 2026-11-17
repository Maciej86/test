import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { LeaveBusyRange, LeaveRequestStatus, MyLeaveRequest } from '@app/shared';
import { pool } from '../../db/pool';

/** Pula połączeń albo połączenie transakcji: oba mają `query`. */
export type Db = Pick<typeof pool, 'query'>;

const PENDING: LeaveRequestStatus = 'pending';
const APPROVED: LeaveRequestStatus = 'approved';
const WITHDRAWN: LeaveRequestStatus = 'withdrawn';
/** Wnioski, które zajmują termin, dni z puli i limit typu. */
const ACTIVE: LeaveRequestStatus[] = [PENDING, APPROVED];

export interface RequestRow extends RowDataPacket {
  id: number;
  user_id: number;
  leave_type_id: number;
  leave_type_name: string;
  deducts_pool: number | boolean;
  /** Kolumny DATE: tekst RRRR-MM-DD. */
  date_from: string;
  date_to: string;
  working_days: number;
  days_from_carried: number;
  days_from_annual: number;
  pool_year: number;
  comment: string | null;
  status: LeaveRequestStatus;
  reject_reason: string | null;
  decided_by_name: string | null;
  decided_at: Date | null;
  created_at: Date;
}

const REQUEST_COLUMNS = `r.id, r.user_id, r.leave_type_id, lt.name AS leave_type_name, lt.deducts_pool, r.date_from, r.date_to, r.working_days,
  r.days_from_carried, r.days_from_annual, r.pool_year, r.comment, r.status, r.reject_reason, r.decided_by_name, r.decided_at, r.created_at
  FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id`;

export const toRequest = (r: RequestRow): MyLeaveRequest => ({
  id: r.id,
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
  rejectReason: r.reject_reason,
  decidedByName: r.decided_by_name,
  decidedAt: r.decided_at ? r.decided_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

/* Wnioski jednej osoby: każde zapytanie ma user_id w warunku. */

/** Wnioski osoby z roku puli: czekające na górze, potem od najnowszego terminu. */
export const listRequests = async (db: Db, userId: number, year: number): Promise<MyLeaveRequest[]> => {
  const [rows] = await db.query<RequestRow[]>(
    `SELECT ${REQUEST_COLUMNS} WHERE r.user_id = ? AND r.pool_year = ? ORDER BY r.status = ? DESC, r.date_from DESC, r.id DESC`, // rule-ok: wstawiona tylko stała lista kolumn REQUEST_COLUMNS z tego pliku, dane idą przez ?
    [userId, year, PENDING],
  );
  return rows.map(toRequest);
};

/** Lata, w których osoba ma wnioski, od najnowszego. */
export const listRequestYears = async (db: Db, userId: number): Promise<number[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DISTINCT pool_year FROM leave_requests WHERE user_id = ? ORDER BY pool_year DESC', [userId]);
  return rows.map((r) => Number(r.pool_year));
};

/** Terminy zajęte przez własne wnioski czekające i zatwierdzone z roku puli. */
export const listBusy = async (db: Db, userId: number, year: number): Promise<LeaveBusyRange[]> => {
  const [rows] = await db.query<RequestRow[]>(
    `SELECT ${REQUEST_COLUMNS} WHERE r.user_id = ? AND r.pool_year = ? AND r.status IN (?) ORDER BY r.date_from`, // rule-ok: wstawiona tylko stała lista kolumn REQUEST_COLUMNS z tego pliku, dane idą przez ?
    [userId, year, ACTIVE],
  );
  return rows.map((r) => ({ dateFrom: r.date_from, dateTo: r.date_to, leaveTypeName: r.leave_type_name, status: r.status }));
};

/** Dni czekające i zatwierdzone osoby w roku puli, według typu (do limitów typów). */
export const sumTypeUsage = async (db: Db, userId: number, year: number): Promise<Map<number, number>> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT leave_type_id, SUM(working_days) AS days FROM leave_requests WHERE user_id = ? AND pool_year = ? AND status IN (?) GROUP BY leave_type_id',
    [userId, year, ACTIVE],
  );
  return new Map(rows.map((r) => [Number(r.leave_type_id), Number(r.days)]));
};

export interface NewRequestRow {
  userId: number;
  leaveTypeId: number;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  poolYear: number;
  comment: string | null;
}

export const insertRequest = async (db: Db, row: NewRequestRow): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO leave_requests (user_id, leave_type_id, date_from, date_to, working_days, days_from_carried, days_from_annual, pool_year, comment, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.userId, row.leaveTypeId, row.dateFrom, row.dateTo, row.workingDays, row.daysFromCarried, row.daysFromAnnual, row.poolYear, row.comment, PENDING],
  );
  return result.insertId;
};

/** Własny wniosek osoby; cudzy albo brak → null. */
export const findOwnRequest = async (db: Db, id: number, userId: number): Promise<RequestRow | null> => {
  const [rows] = await db.query<RequestRow[]>(`SELECT ${REQUEST_COLUMNS} WHERE r.id = ? AND r.user_id = ?`, [id, userId]); // rule-ok: wstawiona tylko stała lista kolumn REQUEST_COLUMNS z tego pliku, dane idą przez ?
  return rows[0] ?? null;
};

/** Wycofanie: tylko czekający wniosek tej osoby; zwraca liczbę zmienionych (0 = już nie czekał). */
export const setWithdrawn = async (db: Db, id: number, userId: number): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>('UPDATE leave_requests SET status = ? WHERE id = ? AND user_id = ? AND status = ?', [
    WITHDRAWN,
    id,
    userId,
    PENDING,
  ]);
  return result.affectedRows;
};

/* Dla innych modułów (SPEC.md, „Powiązania”): same liczby. */

export interface PoolUsage {
  usedCarried: number;
  usedAnnual: number;
  pendingCarried: number;
  pendingAnnual: number;
}

/** Zatwierdzone i czekające dni z puli osób w roku puli, z zapisanego podziału (zaległe / pula roczna). */
export const sumPoolUsage = async (db: Db, userIds: number[], year: number): Promise<Map<number, PoolUsage>> => {
  const usage = new Map<number, PoolUsage>(userIds.map((id) => [id, { usedCarried: 0, usedAnnual: 0, pendingCarried: 0, pendingAnnual: 0 }]));
  if (userIds.length === 0) return usage;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT user_id,
       SUM(CASE WHEN status = ? THEN days_from_carried ELSE 0 END) AS used_carried,
       SUM(CASE WHEN status = ? THEN days_from_annual ELSE 0 END) AS used_annual,
       SUM(CASE WHEN status = ? THEN days_from_carried ELSE 0 END) AS pending_carried,
       SUM(CASE WHEN status = ? THEN days_from_annual ELSE 0 END) AS pending_annual
     FROM leave_requests WHERE user_id IN (?) AND pool_year = ? AND status IN (?) GROUP BY user_id`,
    [APPROVED, APPROVED, PENDING, PENDING, userIds, year, ACTIVE],
  );
  for (const r of rows) {
    usage.set(Number(r.user_id), {
      usedCarried: Number(r.used_carried),
      usedAnnual: Number(r.used_annual),
      pendingCarried: Number(r.pending_carried),
      pendingAnnual: Number(r.pending_annual),
    });
  }
  return usage;
};

/**
 * Wnioski czekające na decyzję z roku puli (blokują „Zamknij rok”). Odczyt z blokadą (FOR SHARE) widzi najnowszy
 * stan, a nie migawkę z początku transakcji: wniosek złożony w chwili zamykania roku też się policzy.
 */
export const countPendingRequests = async (db: Db, year: number): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM leave_requests WHERE pool_year = ? AND status = ? FOR SHARE', [
    year,
    PENDING,
  ]);
  return Number(rows[0]?.total ?? 0);
};

/** Liczba wniosków (wszystkie statusy) według typu urlopu: kolumna „Wnioski” w Typach urlopów. */
export const countRequestsByLeaveType = async (db: Db = pool): Promise<Map<number, number>> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT leave_type_id, COUNT(*) AS total FROM leave_requests GROUP BY leave_type_id');
  return new Map(rows.map((r) => [Number(r.leave_type_id), Number(r.total)]));
};
