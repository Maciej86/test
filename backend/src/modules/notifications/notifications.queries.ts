import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { NotificationItem, NotificationType } from '@app/shared';
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

interface NotificationRow extends RowDataPacket {
  id: number;
  type: NotificationType;
  params: Record<string, string | number> | string;
  actor_name: string | null;
  link: string | null;
  read_at: Date | null;
  created_at: Date;
}

const toItem = (r: NotificationRow): NotificationItem => ({
  id: r.id,
  type: r.type,
  // mysql2 zwykle oddaje kolumnę JSON jako obiekt; tekst zostawia, gdy baza zwróci go jako string.
  params: typeof r.params === 'string' ? (JSON.parse(r.params) as Record<string, string | number>) : r.params,
  actorName: r.actor_name,
  link: r.link,
  readAt: r.read_at ? r.read_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

/** Powiadomienia jednej osoby, od najnowszych; `unreadOnly` = tylko nieprzeczytane. */
export const listForUser = async (
  db: Db,
  userId: number,
  { page, unreadOnly, limit }: { page: number; unreadOnly: boolean; limit: number },
): Promise<{ items: NotificationItem[]; total: number }> => {
  const unread = unreadOnly ? 1 : 0;
  const [rows] = await db.query<NotificationRow[]>(
    'SELECT id, type, params, actor_name, link, read_at, created_at FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL) ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
    [userId, unread, limit, (page - 1) * limit],
  );
  const [count] = await db.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)',
    [userId, unread],
  );
  return { items: rows.map(toItem), total: Number(count[0]?.total ?? 0) };
};

export const countUnread = async (db: Db, userId: number): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]);
  return Number(rows[0]?.total ?? 0);
};

/** Oznacza własne powiadomienie jako przeczytane (pierwsza data zostaje). `false` = nie ma albo cudze. */
export const markRead = async (db: Db, userId: number, id: number): Promise<boolean> => {
  const [result] = await db.query<ResultSetHeader>(
    'UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return result.affectedRows > 0;
};

export const markAllRead = async (db: Db, userId: number): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [userId]);
  return result.affectedRows;
};
