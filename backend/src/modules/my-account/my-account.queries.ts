import type { RowDataPacket } from 'mysql2';
import type { MyAccount, Role } from '@app/shared';
import type { Db } from '../../db/pool';

interface AccountRow extends RowDataPacket {
  name: string;
  login: string;
  role: Role;
  email: string | null;
  /** Kolumna DATE: tekst RRRR-MM-DD. */
  hired_on: string | null;
  contract_type_name: string | null;
}

/** Dane własnego, aktywnego konta; nazwa typu umowy także wtedy, gdy typ jest ukryty. Bez hasła. */
export const findMyAccount = async (db: Db, userId: number): Promise<MyAccount | null> => {
  const [rows] = await db.query<AccountRow[]>(
    'SELECT u.name, u.login, u.role, u.email, u.hired_on, ct.name AS contract_type_name FROM users u LEFT JOIN contract_types ct ON ct.id = u.contract_type_id WHERE u.id = ? AND u.archived_at IS NULL',
    [userId],
  );
  const r = rows[0];
  return r ? { name: r.name, login: r.login, role: r.role, email: r.email, hiredOn: r.hired_on, contractTypeName: r.contract_type_name } : null;
};

/** Czy adres ma już inne konto (także w archiwum, jak unikalny indeks `uq_users_email`). */
export const isEmailTaken = async (db: Db, email: string, exceptUserId: number): Promise<boolean> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, exceptUserId]);
  return rows.length > 0;
};

/** Obecny e-mail z blokadą wiersza do końca transakcji (dwa zapisy naraz nie zgubią wpisu historii). */
export const lockMyEmail = async (db: Db, userId: number): Promise<string | null> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT email FROM users WHERE id = ? FOR UPDATE', [userId]);
  return (rows[0]?.email as string | null | undefined) ?? null;
};

export const setMyEmail = async (db: Db, userId: number, email: string | null): Promise<void> => {
  await db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
};

/** Skrót hasła z blokadą wiersza: zmiana hasła sprawdza, czy nikt go nie zmienił od chwili sprawdzenia obecnego. */
export const lockPasswordHash = async (db: Db, userId: number): Promise<string | null> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT password_hash FROM users WHERE id = ? FOR UPDATE', [userId]);
  return (rows[0]?.password_hash as string | undefined) ?? null;
};
