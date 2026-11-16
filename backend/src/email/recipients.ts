import type mysql from 'mysql2/promise';
import { pool } from '../db/pool';

export interface EmailRecipient {
  name: string;
  email: string;
}

/** Adresaci e-maila o nowym wniosku: aktywni administratorzy z e-mailem do powiadomień (nigdy login). */
export const listAdminEmails = async (db: Pick<mysql.Pool, 'query'> = pool): Promise<EmailRecipient[]> => {
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT name, email FROM users WHERE role = 'admin' AND archived_at IS NULL AND email IS NOT NULL ORDER BY id",
  );
  return rows.map((r) => ({ name: String(r.name), email: String(r.email) }));
};
