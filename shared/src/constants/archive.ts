/** Archiwum: konta i zadania przeniesione do archiwum (moduł Archiwum). */

export const ARCHIVE_PATH = '/admin/archive';
/** Zakładka Pracownicy z wyszukaną osobą (przycisk „Otwórz w archiwum” w Historii zmian). */
export const archiveEmployeesPath = (search: string): string => `${ARCHIVE_PATH}?tab=employees&search=${encodeURIComponent(search)}`;
/** Zakładka Zadania z otwartym podglądem zadania. */
export const archiveTaskPath = (taskId: number): string => `${ARCHIVE_PATH}?tab=tasks&taskId=${taskId}`;

export const ARCHIVE_TABS = ['employees', 'tasks'] as const;
export type ArchiveTab = (typeof ARCHIVE_TABS)[number];

/** Klucze błędów serwera modułu (teksty w shared/locales/pl/archive.json, sekcja server). */
export const ARCHIVE_MESSAGES = {
  /** Konto z wnioskami urlopowymi zostaje w archiwum na zawsze (odpowiedź 1a). */
  hasLeaveRequests: 'archive.server.has_leave_requests',
  notArchived: 'archive.server.not_archived',
  confirmMismatch: 'archive.server.confirm_mismatch',
} as const;
