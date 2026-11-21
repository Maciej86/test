import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { LeaveTypeColor, LeaveTypeData, LeaveTypeItem, SelectableLeaveType } from '@app/shared';
import { pool, type Db } from '../../db/pool';

export interface LeaveTypeRow extends RowDataPacket {
  id: number;
  name: string;
  deducts_pool: number | boolean;
  yearly_limit: number | null;
  color: LeaveTypeColor;
  position: number;
  hidden_at: Date | null;
}

const toSelectable = (r: LeaveTypeRow): SelectableLeaveType => ({
  id: r.id,
  name: r.name,
  deductsPool: Boolean(r.deducts_pool),
  yearlyLimit: r.yearly_limit,
});

/** Lista na ekran: widoczne według kolejności, potem ukryte alfabetycznie. Liczbę wniosków dopisuje usługa (z Moich urlopów). */
export const listLeaveTypes = async (db: Db): Promise<LeaveTypeItem[]> => {
  const [rows] = await db.query<LeaveTypeRow[]>(
    'SELECT id, name, deducts_pool, yearly_limit, color, position, hidden_at FROM leave_types ORDER BY hidden_at IS NOT NULL, CASE WHEN hidden_at IS NULL THEN position END, name',
  );
  return rows.map((r) => ({ ...toSelectable(r), color: r.color, hidden: r.hidden_at !== null, requestsCount: 0 }));
};

export const findLeaveType = async (db: Db, id: number, opts: { lock?: boolean } = {}): Promise<LeaveTypeRow | null> => {
  const sql = 'SELECT id, name, deducts_pool, yearly_limit, color, position, hidden_at FROM leave_types WHERE id = ?';
  // Z blokadą (zmiana typu): drugi równoczesny zapis czeka, więc „przed” w historii zmian jest prawdziwe.
  const [rows] = await db.query<LeaveTypeRow[]>(opts.lock ? `${sql} FOR UPDATE` : sql, [id]); // rule-ok: dopisane tylko stałe FOR UPDATE
  return rows[0] ?? null;
};

/** Typ o tej nazwie (bez względu na wielkość liter, także ukryty), z pominięciem `exceptId`. */
export const findByName = async (db: Db, name: string, exceptId: number | null): Promise<{ id: number; name: string; hidden: boolean } | null> => {
  const [rows] = await db.query<LeaveTypeRow[]>(
    'SELECT id, name, deducts_pool, yearly_limit, color, position, hidden_at FROM leave_types WHERE name = ? AND (? IS NULL OR id <> ?) LIMIT 1',
    [name, exceptId, exceptId],
  );
  const r = rows[0];
  return r ? { id: r.id, name: r.name, hidden: r.hidden_at !== null } : null;
};

/** Największa pozycja (0 przy pustej tabeli); w transakcji blokuje tabelę, żeby dwa nowe typy nie dostały tej samej. */
export const maxPosition = async (db: Db): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT MAX(position) AS max FROM leave_types FOR UPDATE');
  return Number(rows[0]?.max ?? 0);
};

export const insertLeaveType = async (db: Db, data: LeaveTypeData, position: number): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    'INSERT INTO leave_types (name, deducts_pool, yearly_limit, color, position) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.deductsPool, data.yearlyLimit, data.color, position],
  );
  return result.insertId;
};

export const updateLeaveType = async (db: Db, id: number, data: LeaveTypeData): Promise<void> => {
  await db.query('UPDATE leave_types SET name = ?, deducts_pool = ?, yearly_limit = ?, color = ? WHERE id = ?', [
    data.name,
    data.deductsPool,
    data.yearlyLimit,
    data.color,
    id,
  ]);
};

/** Widoczne typy zablokowane do końca transakcji (przesuwanie, ukrywanie ostatniego). */
export const lockVisible = async (db: Db): Promise<{ id: number; position: number }[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, position FROM leave_types WHERE hidden_at IS NULL ORDER BY position FOR UPDATE');
  return rows.map((r) => ({ id: r.id as number, position: r.position as number }));
};

export const setPosition = async (db: Db, id: number, position: number): Promise<void> => {
  await db.query('UPDATE leave_types SET position = ? WHERE id = ?', [position, id]);
};

export const setHidden = async (db: Db, id: number): Promise<void> => {
  await db.query('UPDATE leave_types SET hidden_at = NOW() WHERE id = ?', [id]);
};

export const setVisible = async (db: Db, id: number, position: number): Promise<void> => {
  await db.query('UPDATE leave_types SET hidden_at = NULL, position = ? WHERE id = ?', [position, id]);
};

/** Dla modułu Moje urlopy: typy do wyboru w formularzu wniosku, w ustalonej kolejności. */
export const listSelectableLeaveTypes = async (db: Db = pool): Promise<SelectableLeaveType[]> => {
  const [rows] = await db.query<LeaveTypeRow[]>('SELECT id, name, deducts_pool, yearly_limit, color, position, hidden_at FROM leave_types WHERE hidden_at IS NULL ORDER BY position');
  return rows.map(toSelectable);
};

/** Dla modułu Moje urlopy: zasady wybranego typu; ukryty albo brak → null. */
export const findSelectableLeaveType = async (id: number, db: Db = pool): Promise<SelectableLeaveType | null> => {
  const [rows] = await db.query<LeaveTypeRow[]>('SELECT id, name, deducts_pool, yearly_limit, color, position, hidden_at FROM leave_types WHERE id = ? AND hidden_at IS NULL', [id]);
  return rows[0] ? toSelectable(rows[0]) : null;
};
