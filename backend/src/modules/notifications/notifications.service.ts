import { NOTIFICATION_KEEP_DAYS, NOTIFICATION_LINK_PREFIX, type NotificationType } from '@app/shared';
import { activeAdminIds, activeUserIds, deleteOldRead, insertNotifications, type Db } from './notifications.queries';

/** Co i dla kogo zapisać. `actor` = `req.user` modułu, który tworzy powiadomienie (sam go nie dostaje). */
export interface NotifyInput {
  type: NotificationType;
  params: Record<string, string | number>;
  link: string;
  actor: { id: number; name: string };
}

/** Adres w panelu: zaczyna się od /admin/ i nie prowadzi na inny serwer (`//`). */
const isPanelLink = (link: string): boolean => link.startsWith(NOTIFICATION_LINK_PREFIX) && !link.includes('//');

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
  return notifyUsers(conn, { ...input, userIds: await activeAdminIds(conn) });
};
