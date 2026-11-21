import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DashboardOwnRequest, LeaveBusyRange, LeaveDayCount, LeaveRequestStatus, MyLeaveRequest } from '@app/shared';
import { pool, type Db } from '../../db/pool';

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
  decision_reason: string | null;
  decided_by_name: string | null;
  decided_at: Date | null;
  created_at: Date;
  day_count: LeaveDayCount;
  auto_approved: number | boolean;
}

const REQUEST_COLUMNS = `r.id, r.user_id, r.leave_type_id, lt.name AS leave_type_name, lt.deducts_pool, r.date_from, r.date_to, r.working_days,
  r.days_from_carried, r.days_from_annual, r.pool_year, r.comment, r.status, r.decision_reason, r.decided_by_name, r.decided_at, r.created_at,
  r.day_count, r.auto_approved
  FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id`;

/** Wniosek z bazy; czy można go jeszcze wycofać, dolicza usługa (zależy od dziś). */
export type StoredRequest = Omit<MyLeaveRequest, 'canWithdraw'>;

export const toRequest = (r: RequestRow): StoredRequest => ({
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
  decisionReason: r.decision_reason,
  decidedByName: r.decided_by_name,
  decidedAt: r.decided_at ? r.decided_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
  dayCount: r.day_count,
  autoApproved: Boolean(r.auto_approved),
});

/* Wnioski jednej osoby: każde zapytanie ma user_id w warunku. */

/** Wnioski osoby z roku puli: czekające na górze, potem od najnowszego terminu. */
export const listRequests = async (db: Db, userId: number, year: number): Promise<StoredRequest[]> => {
  const [rows] = await db.query<RequestRow[]>(
    `SELECT ${REQUEST_COLUMNS} WHERE r.user_id = ? AND r.pool_year = ? ORDER BY r.status = ? DESC, r.date_from DESC, r.id DESC`, // rule-ok: wstawiona tylko stała lista kolumn REQUEST_COLUMNS z tego pliku, dane idą przez ?
    [userId, year, PENDING],
  );
  return rows.map(toRequest);
};

const toOwn = (r: RowDataPacket): DashboardOwnRequest => ({
  id: r.id as number,
  leaveTypeName: r.leave_type_name as string,
  dateFrom: r.date_from as string,
  dateTo: r.date_to as string,
  workingDays: r.working_days as number,
  dayCount: r.day_count as LeaveDayCount,
});

const OWN_COLUMNS = 'SELECT r.id, lt.name AS leave_type_name, r.date_from, r.date_to, r.working_days, r.day_count FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id';

/**
 * Pulpit pracownika: jego wnioski czekające (od najwcześniejszego początku) i najbliższy zatwierdzony urlop, który
 * jeszcze się nie skończył (trwający dziś też).
 */
export const listUpcomingOwn = async (db: Db, userId: number, today: string): Promise<{ pending: DashboardOwnRequest[]; nextApproved: DashboardOwnRequest | null }> => {
  const [pending] = await db.query<RowDataPacket[]>(
    `${OWN_COLUMNS} WHERE r.user_id = ? AND r.status = ? ORDER BY r.date_from, r.id`, // rule-ok: stała lista kolumn z tego pliku, dane przez ?
    [userId, PENDING],
  );
  const [next] = await db.query<RowDataPacket[]>(
    `${OWN_COLUMNS} WHERE r.user_id = ? AND r.status = ? AND r.date_to >= ? ORDER BY r.date_from, r.id LIMIT 1`, // rule-ok: jak wyżej
    [userId, APPROVED, today],
  );
  return { pending: pending.map(toOwn), nextApproved: next[0] ? toOwn(next[0]) : null };
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
  /** Sposób liczenia z typu w chwili złożenia; `workingDays` to dni wniosku liczone tym sposobem. */
  dayCount: LeaveDayCount;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  poolYear: number;
  comment: string | null;
  /** Typ bez zatwierdzania: wniosek od razu zatwierdzony (`approved`, chwila decyzji = chwila złożenia, bez osoby). */
  autoApproved: boolean;
}

export const insertRequest = async (db: Db, row: NewRequestRow): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO leave_requests (user_id, leave_type_id, date_from, date_to, day_count, working_days, days_from_carried, days_from_annual, pool_year,
       comment, status, auto_approved, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(?, NOW(), NULL))`,
    [
      row.userId, row.leaveTypeId, row.dateFrom, row.dateTo, row.dayCount, row.workingDays, row.daysFromCarried, row.daysFromAnnual, row.poolYear,
      row.comment, row.autoApproved ? APPROVED : PENDING, row.autoApproved, row.autoApproved,
    ],
  );
  return result.insertId;
};

/** Własny wniosek osoby; cudzy albo brak → null. */
export const findOwnRequest = async (db: Db, id: number, userId: number): Promise<RequestRow | null> => {
  const [rows] = await db.query<RequestRow[]>(`SELECT ${REQUEST_COLUMNS} WHERE r.id = ? AND r.user_id = ?`, [id, userId]); // rule-ok: wstawiona tylko stała lista kolumn REQUEST_COLUMNS z tego pliku, dane idą przez ?
  return rows[0] ?? null;
};


/**
 * Wycofanie wniosku tej osoby, tylko gdy ma wciąż status sprawdzony przed chwilą (czekający albo zatwierdzony
 * automatycznie); zwraca liczbę zmienionych (0 = w międzyczasie ktoś go zmienił, np. drugie wycofanie naraz).
 */
export const setWithdrawn = async (db: Db, id: number, userId: number, fromStatus: LeaveRequestStatus): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>('UPDATE leave_requests SET status = ? WHERE id = ? AND user_id = ? AND status = ?', [
    WITHDRAWN,
    id,
    userId,
    fromStatus,
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
/**
 * `lock`: odczyt z blokadą (FOR SHARE) widzi najnowszy stan, a nie migawkę z początku transakcji; „Zamknij rok” liczy
 * tak dni do przeniesienia po decyzji, którą inny administrator zapisał w tej samej chwili.
 */
export const sumPoolUsage = async (db: Db, userIds: number[], year: number, opts: { lock?: boolean } = {}): Promise<Map<number, PoolUsage>> => {
  const usage = new Map<number, PoolUsage>(userIds.map((id) => [id, { usedCarried: 0, usedAnnual: 0, pendingCarried: 0, pendingAnnual: 0 }]));
  if (userIds.length === 0) return usage;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT user_id,
       SUM(CASE WHEN status = ? THEN days_from_carried ELSE 0 END) AS used_carried,
       SUM(CASE WHEN status = ? THEN days_from_annual ELSE 0 END) AS used_annual,
       SUM(CASE WHEN status = ? THEN days_from_carried ELSE 0 END) AS pending_carried,
       SUM(CASE WHEN status = ? THEN days_from_annual ELSE 0 END) AS pending_annual
     FROM leave_requests WHERE user_id IN (?) AND pool_year = ? AND status IN (?) GROUP BY user_id${opts.lock ? ' FOR SHARE' : ''}`, // rule-ok: dopisana tylko stała blokada, dane idą przez ?
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

/** Liczba wniosków (wszystkie statusy) według osoby: Archiwum blokuje usunięcie konta z wnioskami. */
export const countRequestsByUser = async (db: Db, userIds: number[]): Promise<Map<number, number>> => {
  if (userIds.length === 0) return new Map();
  const [rows] = await db.query<RowDataPacket[]>('SELECT user_id, COUNT(*) AS total FROM leave_requests WHERE user_id IN (?) GROUP BY user_id', [userIds]);
  return new Map(rows.map((r) => [Number(r.user_id), Number(r.total)]));
};
