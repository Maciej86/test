import type { RowDataPacket } from 'mysql2';
import type { NotificationType } from '@app/shared';
import { pool } from '../../db/pool';

/** Pula połączeń albo połączenie transakcji: oba mają `query`. */
export type Db = Pick<typeof pool, 'query'>;

export interface NewNotification {
  userId: number;
  type: NotificationType;
  params: Record<string, string | number>;
  actorName: string | null;
  link: string;
}

/** Wszystkie nowe powiadomienia jednym INSERT. */
export const insertNotifications = async (db: Db, rows: NewNotification[]): Promise<void> => {
  if (rows.length === 0) return;
  // mysql2 zamienia `VALUES ?` z tablicą wierszy na (…), (…) z parametrami.
  const values = rows.map((r) => [r.userId, r.type, JSON.stringify(r.params), r.actorName, r.link]);
  await db.query('INSERT INTO notifications (user_id, type, params, actor_name, link) VALUES ?', [values]);
};

/** Usuwa przeczytane powiadomienia tych osób starsze niż `days` dni; nieprzeczytane zostają. */
export const deleteOldRead = async (db: Db, userIds: number[], days: number): Promise<void> => {
  if (userIds.length === 0) return;
  await db.query(
    'DELETE FROM notifications WHERE user_id IN (?) AND read_at IS NOT NULL AND read_at < NOW() - INTERVAL ? DAY',
    [userIds, days],
  );
};

/** Z podanych osób tylko te z aktywnym kontem (bez archiwum). */
export const activeUserIds = async (db: Db, ids: number[]): Promise<number[]> => {
  if (ids.length === 0) return [];
  const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE id IN (?) AND archived_at IS NULL ORDER BY id', [ids]);
  return rows.map((r) => r.id as number);
};

/** Aktywni administratorzy. */
export const activeAdminIds = async (db: Db): Promise<number[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE role = ? AND archived_at IS NULL ORDER BY id', ['admin']);
  return rows.map((r) => r.id as number);
};
