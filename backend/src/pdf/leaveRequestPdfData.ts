import type { RowDataPacket } from 'mysql2';
import type { LeaveRequestStatus } from '@app/shared';
import type { Db } from '../db/pool';
import type { LeaveRequestPdfData } from './leaveRequestPdf';

// Wniosek do PDF dla obu tras: „Moje urlopy” (tylko własny, z `userId`) i „Wnioski urlopowe” (administrator, dowolny).

export interface PdfRequestRow extends RowDataPacket {
  id: number;
  employee_name: string;
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
  decided_by_name: string | null;
  decided_at: Date | null;
  created_at: Date;
}

const PDF_COLUMNS = `SELECT r.id, u.name AS employee_name, lt.name AS leave_type_name, lt.deducts_pool, r.date_from, r.date_to,
  r.working_days, r.days_from_carried, r.days_from_annual, r.pool_year, r.comment, r.status, r.decided_by_name, r.decided_at,
  r.created_at
  FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id JOIN users u ON u.id = r.user_id`;

/** Wniosek z imieniem i nazwiskiem osoby; z `userId` tylko jej własny (cudzy → null). */
export const findRequestForPdf = async (db: Db, id: number, userId?: number): Promise<PdfRequestRow | null> => {
  const [rows] =
    userId === undefined
      ? await db.query<PdfRequestRow[]>(`${PDF_COLUMNS} WHERE r.id = ?`, [id]) // rule-ok: wstawiona tylko stała lista kolumn PDF_COLUMNS z tego pliku, dane idą przez ?
      : await db.query<PdfRequestRow[]>(`${PDF_COLUMNS} WHERE r.id = ? AND r.user_id = ?`, [id, userId]); // rule-ok: jak wyżej
  return rows[0] ?? null;
};

/** Wiersz z bazy → dane dokumentu (chwile jako tekst ISO). */
export const toPdfData = (row: PdfRequestRow): LeaveRequestPdfData => ({
  id: row.id,
  createdAt: row.created_at.toISOString(),
  employeeName: row.employee_name,
  leaveTypeName: row.leave_type_name,
  deductsPool: Boolean(row.deducts_pool),
  dateFrom: row.date_from,
  dateTo: row.date_to,
  workingDays: row.working_days,
  daysFromCarried: row.days_from_carried,
  daysFromAnnual: row.days_from_annual,
  poolYear: row.pool_year,
  comment: row.comment,
  decidedByName: row.decided_by_name,
  decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
});
