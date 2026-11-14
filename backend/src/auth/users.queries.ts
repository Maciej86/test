import type { RowDataPacket } from 'mysql2';
import { isRole, type SessionUser } from '@app/shared';
import { pool } from '../db/pool';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  role: string;
  must_change_password: number;
  password_hash?: string;
}

function toSessionUser(row: UserRow): SessionUser | null {
  if (!isRole(row.role)) return null;
  return { id: row.id, name: row.name, role: row.role, mustChangePassword: Boolean(row.must_change_password) };
}

/** Aktywne konto (nie w archiwum) po numerze; `authenticate` woła to przy każdym żądaniu. */
export async function findActiveUserById(id: number): Promise<SessionUser | null> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, name, role, must_change_password FROM users WHERE id = ? AND archived_at IS NULL',
    [id],
  );
  return rows[0] ? toSessionUser(rows[0]) : null;
}

/** Aktywne konto po loginie (małymi literami), razem ze skrótem hasła do sprawdzenia przy logowaniu. */
export async function findActiveUserByLogin(login: string): Promise<{ user: SessionUser; passwordHash: string } | null> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, name, role, must_change_password, password_hash FROM users WHERE login = ? AND archived_at IS NULL',
    [login],
  );
  const user = rows[0] ? toSessionUser(rows[0]) : null;
  return user && rows[0]!.password_hash ? { user, passwordHash: rows[0]!.password_hash } : null;
}

/** Skrót hasła konta (do sprawdzenia, czy nowe hasło nie jest takie samo jak tymczasowe). */
export async function findPasswordHash(id: number): Promise<string | null> {
  const [rows] = await pool.query<UserRow[]>('SELECT password_hash FROM users WHERE id = ?', [id]);
  return rows[0]?.password_hash ?? null;
}

/** Zapisuje nowy skrót hasła i zdejmuje obowiązek zmiany hasła tymczasowego. */
export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await pool.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, id]);
}
