/** Obszary historii zmian (kolumna `activity_log.entity_type`). Tekst: `area.<obszar>` w activity-log.json. */
export const ACTIVITY_AREAS = ['leave_requests', 'leave_pools', 'tasks', 'projects', 'users', 'leave_types', 'contract_types'] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];

/** Rekord, którego dotyczy wpis: jest, jest w archiwum albo usunięto go na stałe (serwer sprawdza przy odczycie). */
export const ACTIVITY_STATES = ['exists', 'archived', 'deleted'] as const;
export type ActivityState = (typeof ACTIVITY_STATES)[number];

/** Rodzaj zmiany decyduje o kolorze ikony wpisu. */
export type ActivityTone = 'neutral' | 'positive' | 'negative' | 'muted';

/** Wpisów na stronę dziennika. */
export const ACTIVITY_LOG_PAGE_SIZE = 50;

/** Ekran historii zmian (tylko administrator). */
export const ACTIVITY_LOG_PATH = '/admin/activity-log';

export const ACTIVITY_LOG_MESSAGES = {
  datesOrder: 'activity-log.validation.dates_order',
} as const;
