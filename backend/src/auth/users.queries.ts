import type { RowDataPacket } from 'mysql2';
import { isRole, type SessionUser } from '@app/shared';
import { pool } from '../db/pool';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  role: string;
  must_change_password: number;
  password_hash?: string;
  token_version?: number;
}

const toSessionUser = (row: UserRow): SessionUser | null => {
  if (!isRole(row.role)) return null;
  return { id: row.id, name: row.name, role: row.role, mustChangePassword: Boolean(row.must_change_password) };
};

/**
 * Aktywne konto (nie w archiwum) po numerze i wersji sesji z tokenu; `authenticate` woła to przy każdym żądaniu.
 * Inna wersja (hasło zmienione po wystawieniu tokenu) = brak konta, czyli niezalogowany.
 */
export const findActiveUserById = async (id: number, tokenVersion: number): Promise<SessionUser | null> => {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, name, role, must_change_password FROM users WHERE id = ? AND token_version = ? AND archived_at IS NULL',
    [id, tokenVersion],
  );
  return rows[0] ? toSessionUser(rows[0]) : null;
};

/** Aktywne konto po loginie (małymi literami), razem ze skrótem hasła do sprawdzenia przy logowaniu. */
export const findActiveUserByLogin = async (
  login: string,
): Promise<{ user: SessionUser; passwordHash: string; tokenVersion: number } | null> => {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, name, role, must_change_password, password_hash, token_version FROM users WHERE login = ? AND archived_at IS NULL',
    [login],
  );
  const user = rows[0] ? toSessionUser(rows[0]) : null;
  return user && rows[0]!.password_hash
    ? { user, passwordHash: rows[0]!.password_hash, tokenVersion: rows[0]!.token_version ?? 0 }
    : null;
};

/** Skrót hasła konta (do sprawdzenia, czy nowe hasło nie jest takie samo jak tymczasowe). */
export const findPasswordHash = async (id: number): Promise<string | null> => {
  const [rows] = await pool.query<UserRow[]>('SELECT password_hash FROM users WHERE id = ?', [id]);
  return rows[0]?.password_hash ?? null;
};

/**
 * Zapisuje nowy skrót hasła, zdejmuje obowiązek zmiany hasła tymczasowego i podnosi wersję sesji (inne sesje tej
 * osoby się kończą). Zwraca nową wersję do ciasteczka osoby, która zmieniła hasło.
 */
export const updatePassword = async (id: number, passwordHash: string): Promise<number> => {
  await pool.query(
    'UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?',
    [passwordHash, id],
  );
  const [rows] = await pool.query<UserRow[]>('SELECT token_version FROM users WHERE id = ?', [id]);
  return rows[0]?.token_version ?? 0;
};
