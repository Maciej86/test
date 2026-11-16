import {
  NOTIFICATION_BELL_LIMIT,
  NOTIFICATION_KEEP_DAYS,
  isPanelLink,
  SERVER_MESSAGES,
  type NotificationsListResponse,
  type NotificationsQuery,
  type NotificationsSummary,
  type NotificationType,
} from '@app/shared';
import { PAGE_SIZE } from '../../config/constants';
import { pool } from '../../db/pool';
import { fail, type Result } from '../../middleware/routeHelpers';
import {
  activeIdsByRole,
  activeUserIds,
  countUnread,
  deleteOldRead,
  insertNotifications,
  listForUser,
  markAllRead,
  markRead,
  type Db,
} from './notifications.queries';

/** Co i dla kogo zapisać. `actor` = `req.user` modułu, który tworzy powiadomienie (sam go nie dostaje). */
export interface NotifyInput {
  type: NotificationType;
  params: Record<string, string | number>;
  link: string;
  actor: { id: number; name: string };
}

/**
 * Powiadomienia dla wybranych osób. Wołaj w transakcji modułu, który zmienia dane (np. zatwierdzenie wniosku).
 * Pomija osobę wykonującą czynność, konta w archiwum i powtórzenia; sprząta stare przeczytane odbiorców.
 * Zwraca liczbę zapisanych powiadomień.
 */
export const notifyUsers = async (conn: Db, input: NotifyInput & { userIds: number[] }): Promise<number> => {
  if (!isPanelLink(input.link)) throw new Error(`Powiadomienie z adresem spoza panelu: ${input.link}`);
  const candidates = [...new Set(input.userIds)].filter((id) => id !== input.actor.id);
  if (candidates.length === 0) return 0;
  const recipients = await activeUserIds(conn, candidates);
  if (recipients.length === 0) return 0;
  await insertNotifications(
    conn,
    recipients.map((userId) => ({ userId, type: input.type, params: input.params, actorName: input.actor.name, link: input.link })),
  );
  await deleteOldRead(conn, recipients, NOTIFICATION_KEEP_DAYS);
  return recipients.length;
};

/** Powiadomienie dla każdego aktywnego administratora (np. nowy wniosek). */
export const notifyAdmins = async (conn: Db, input: NotifyInput): Promise<number> => {
  return notifyUsers(conn, { ...input, userIds: await activeIdsByRole(conn, 'admin') });
};

/** Dzwonek: liczba nieprzeczytanych i ostatnie powiadomienia tej osoby. */
export const getSummary = async (userId: number): Promise<NotificationsSummary> => {
  const [unread, { items }] = await Promise.all([
    countUnread(pool, userId),
    listForUser(pool, userId, { page: 1, unreadOnly: false, limit: NOTIFICATION_BELL_LIMIT }),
  ]);
  return { unread, latest: items };
};

/** Strona „Powiadomienia”: strona listy (wszystkie albo nieprzeczytane) i liczba nieprzeczytanych. */
export const getList = async (userId: number, query: NotificationsQuery): Promise<NotificationsListResponse> => {
  const [unread, { items, total }] = await Promise.all([
    countUnread(pool, userId),
    listForUser(pool, userId, { page: query.page, unreadOnly: query.unread === '1', limit: PAGE_SIZE }),
  ]);
  return { items, total, page: query.page, pageSize: PAGE_SIZE, unread };
};

export const readOne = async (userId: number, id: number): Promise<Result> => {
  return (await markRead(pool, userId, id)) ? { ok: true } : fail(404, SERVER_MESSAGES.notFound);
};

export const readAll = async (userId: number): Promise<{ updated: number }> => {
  return { updated: await markAllRead(pool, userId) };
};
