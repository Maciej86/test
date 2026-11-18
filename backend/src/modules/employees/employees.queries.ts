import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { EmployeeSort, Role } from '@app/shared';
import { pool, type Db } from '../../db/pool';
import { likePattern } from '../../db/like';

export interface EmployeeRow extends RowDataPacket {
  id: number;
  /** Wyliczane przez bazę z first_name i last_name. */
  name: string;
  first_name: string;
  last_name: string;
  login: string;
  email: string | null;
  role: Role;
  /** Kolumna DATE: tekst RRRR-MM-DD. */
  hired_on: string | null;
  contract_type_id: number | null;
  contract_type_name: string | null;
  contract_type_hidden_at: Date | null;
  annual_days: number | null;
  carried_days: number | null;
}

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  login: string;
  email: string | null;
  role: Role;
  hired_on: string | null;
  contract_type_id: number | null;
  archived_at: Date | null;
}

export interface PoolRow extends RowDataPacket {
  id: number;
  user_id: number;
  year: number;
  annual_days: number;
  carried_days: number;
  closed_at: Date | null;
}

/** Kolejność listy: tylko z tej mapy (nazwa z adresu nigdy nie trafia do SQL). */
const ORDER_BY: Record<EmployeeSort, Record<'asc' | 'desc', string>> = {
  name: {
    asc: 'u.last_name ASC, u.first_name ASC',
    desc: 'u.last_name DESC, u.first_name DESC',
  },
  days_left: {
    asc: "u.role = 'admin', p.annual_days + p.carried_days ASC, u.last_name ASC, u.first_name ASC",
    desc: "u.role = 'admin', p.annual_days + p.carried_days DESC, u.last_name ASC, u.first_name ASC",
  },
};

/** Konta spoza archiwum z pulą na podany rok (strona listy). */
export const listEmployees = async (
  db: Db,
  q: { search: string; role?: Role; sort: EmployeeSort; dir: 'asc' | 'desc'; page: number; pageSize: number; year: number },
): Promise<{ rows: EmployeeRow[]; total: number }> => {
  const where = ['u.archived_at IS NULL'];
  const params: unknown[] = [];
  if (q.search) {
    // Całe „Imię Nazwisko” (name) też, żeby „jan kow” znalazło Jana Kowalskiego.
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.name LIKE ? OR u.login LIKE ?)');
    const pattern = likePattern(q.search);
    params.push(pattern, pattern, pattern, pattern);
  }
  if (q.role) {
    where.push('u.role = ?');
    params.push(q.role);
  }
  const from = `FROM users u LEFT JOIN leave_pools p ON p.user_id = u.id AND p.year = ? LEFT JOIN contract_types ct ON ct.id = u.contract_type_id WHERE ${where.join(' AND ')}`;
  const [rows] = await db.query<EmployeeRow[]>(
    `SELECT u.id, u.name, u.first_name, u.last_name, u.login, u.email, u.role, u.hired_on, u.contract_type_id, ct.name AS contract_type_name, ct.hidden_at AS contract_type_hidden_at, p.annual_days, p.carried_days ${from} ORDER BY ${ORDER_BY[q.sort][q.dir]} LIMIT ? OFFSET ?`, // rule-ok: ORDER BY tylko z mapy ORDER_BY, WHERE z gotowych kawałków z ?
    [q.year, ...params, q.pageSize, (q.page - 1) * q.pageSize],
  );
  const [count] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from}`, [q.year, ...params]); // rule-ok: WHERE z gotowych kawałków z ?
  return { rows, total: Number(count[0]?.total ?? 0) };
};

/** Liczba kont spoza archiwum i administratorów wśród nich (podpis pod tytułem listy). */
export const countEmployees = async (db: Db): Promise<{ all: number; admins: number }> => {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(role = 'admin'), 0) AS admins FROM users WHERE archived_at IS NULL",
  );
  return { all: Number(rows[0]?.total ?? 0), admins: Number(rows[0]?.admins ?? 0) };
};

/** Konta (także w archiwum) z tym loginem albo e-mailem, poza kontem `exceptId`. */
export const findAccountsWithLoginOrEmail = async (db: Db, login: string, email: string | null, exceptId: number | null): Promise<UserRow[]> => {
  const [rows] = await db.query<UserRow[]>(
    'SELECT id, name, first_name, last_name, login, email, role, hired_on, contract_type_id, archived_at FROM users WHERE (login = ? OR (? IS NOT NULL AND email = ?)) AND id <> ?',
    [login, email, email, exceptId ?? 0],
  );
  return rows;
};

export const findUser = async (db: Db, id: number): Promise<UserRow | null> => {
  const [rows] = await db.query<UserRow[]>(
    'SELECT id, name, first_name, last_name, login, email, role, hired_on, contract_type_id, archived_at FROM users WHERE id = ?',
    [id],
  );
  return rows[0] ?? null;
};

/** Dane konta z formularza (name składa baza z imienia i nazwiska). */
export interface AccountData {
  firstName: string;
  lastName: string;
  login: string;
  email: string | null;
  role: Role;
  hiredOn: string | null;
  contractTypeId: number | null;
}

/** Nowe konto zawsze z hasłem tymczasowym. */
export const insertUser = async (db: Db, u: AccountData & { passwordHash: string }): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    'INSERT INTO users (first_name, last_name, login, email, role, hired_on, contract_type_id, password_hash, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
    [u.firstName, u.lastName, u.login, u.email, u.role, u.hiredOn, u.contractTypeId, u.passwordHash],
  );
  return result.insertId;
};

export const updateUser = async (db: Db, id: number, u: AccountData): Promise<void> => {
  await db.query(
    'UPDATE users SET first_name = ?, last_name = ?, login = ?, email = ?, role = ?, hired_on = ?, contract_type_id = ? WHERE id = ?',
    [u.firstName, u.lastName, u.login, u.email, u.role, u.hiredOn, u.contractTypeId, id],
  );
};

/**
 * Hasło ustawione przez administratora jest tymczasowe: przy następnym kliknięciu osoba ustawia własne.
 * Podniesiona wersja sesji wylogowuje tę osobę na wszystkich urządzeniach.
 */
export const setTemporaryPassword = async (db: Db, id: number, passwordHash: string): Promise<void> => {
  await db.query(
    'UPDATE users SET password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?',
    [passwordHash, id],
  );
};

/** `byUserId` = kto archiwizuje; `null` = przywrócenie. */
export const setArchived = async (db: Db, id: number, byUserId: number | null): Promise<void> => {
  if (byUserId === null) {
    await db.query('UPDATE users SET archived_at = NULL, archived_by = NULL WHERE id = ?', [id]);
  } else {
    await db.query('UPDATE users SET archived_at = NOW(), archived_by = ? WHERE id = ?', [byUserId, id]);
  }
};

/** Najmniejszy rok z pulą bez `closed_at`; brak pul → null. */
export const minOpenYear = async (db: Db): Promise<number | null> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT MIN(year) AS year FROM leave_pools WHERE closed_at IS NULL');
  return rows[0]?.year ?? null;
};

export const findPool = async (db: Db, userId: number, year: number): Promise<PoolRow | null> => {
  const [rows] = await db.query<PoolRow[]>(
    'SELECT id, user_id, year, annual_days, carried_days, closed_at FROM leave_pools WHERE user_id = ? AND year = ?',
    [userId, year],
  );
  return rows[0] ?? null;
};

/**
 * Pula otwarta osoby (bez closed_at). `lock`: blokada wiersza do końca transakcji, żeby dwa wnioski złożone naraz
 * liczyły dni po kolei (moduł Moje urlopy).
 */
export const findOpenPoolOfUser = async (db: Db, userId: number, lock: boolean): Promise<PoolRow | null> => {
  const [rows] = await db.query<PoolRow[]>(
    lock
      ? 'SELECT id, user_id, year, annual_days, carried_days, closed_at FROM leave_pools WHERE user_id = ? AND closed_at IS NULL ORDER BY year LIMIT 1 FOR UPDATE'
      : 'SELECT id, user_id, year, annual_days, carried_days, closed_at FROM leave_pools WHERE user_id = ? AND closed_at IS NULL ORDER BY year LIMIT 1',
    [userId],
  );
  return rows[0] ?? null;
};

export const upsertPool = async (db: Db, userId: number, year: number, annualDays: number, carriedDays: number): Promise<void> => {
  await db.query(
    'INSERT INTO leave_pools (user_id, year, annual_days, carried_days) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE annual_days = VALUES(annual_days), carried_days = VALUES(carried_days)',
    [userId, year, annualDays, carriedDays],
  );
};

export interface YearPoolRow extends PoolRow {
  name: string;
  role: Role;
  archived_at: Date | null;
}

/** Wszystkie otwarte pule danego roku (także osób w archiwum), z imieniem i rolą; blokada samych pul (nie kont). */
export const findOpenPoolsForYear = async (db: Db, year: number): Promise<YearPoolRow[]> => {
  const [rows] = await db.query<YearPoolRow[]>(
    `SELECT p.id, p.user_id, p.year, p.annual_days, p.carried_days, p.closed_at, u.name, u.role, u.archived_at
     FROM leave_pools p JOIN users u ON u.id = p.user_id
     WHERE p.year = ? AND p.closed_at IS NULL ORDER BY u.last_name, u.first_name FOR UPDATE OF p`,
    [year],
  );
  return rows;
};

export const closePool = async (db: Db, id: number): Promise<void> => {
  await db.query('UPDATE leave_pools SET closed_at = NOW() WHERE id = ?', [id]);
};

/** Osoby spoza archiwum, opcjonalnie tylko z jedną rolą (np. pracownicy do projektu w module Zadania). */
export const listActiveUsers = async (db: Db, role?: Role): Promise<{ id: number; name: string }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id, name FROM users WHERE archived_at IS NULL AND (? IS NULL OR role = ?) ORDER BY last_name, first_name',
    [role ?? null, role ?? null],
  );
  return rows.map((r) => ({ id: r.id as number, name: r.name as string }));
};
