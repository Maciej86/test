/** Rodzaje powiadomień (moduł Powiadomienia). Tekst: `types.<rodzaj>.title|detail` w notifications.json. */
export const NOTIFICATION_TYPES = [
  'leave_request_new',
  'leave_absence_reported',
  'leave_request_withdrawn',
  'leave_approved',
  'leave_rejected',
  'leave_cancelled',
  'task_assigned',
  'project_added',
  'task_comment',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Ile ostatnich powiadomień widać w dzwonku. */
export const NOTIFICATION_BELL_LIMIT = 8;
/** Po ilu dniach znikają przeczytane powiadomienia (nieprzeczytane zostają). */
export const NOTIFICATION_KEEP_DAYS = 90;
/** Co ile dzwonek pyta serwer o nowe powiadomienia. */
export const NOTIFICATION_REFRESH_MS = 60_000;
/** Powiadomienie prowadzi tylko do adresów w panelu. */
export const NOTIFICATION_LINK_PREFIX = '/admin/';
/** Strona „Powiadomienia” (bez pozycji w menu). */
export const NOTIFICATIONS_PATH = '/admin/notifications';
/** Powyżej tej liczby dzwonek pokazuje „99+”. */
export const NOTIFICATION_BADGE_MAX = 99;
/** Imię i nazwisko osoby (kopia w powiadomieniu) — tyle co users.name. */
export const NOTIFICATION_ACTOR_NAME_MAX = 141;
