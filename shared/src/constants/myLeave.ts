/** Wnioski urlopowe (moduł Moje urlopy; decyzje: moduł Wnioski urlopowe). */

/** Komentarz dla administratora: do 500 znaków (VARCHAR(500) w bazie). */
export const LEAVE_REQUEST_COMMENT_MAX = 500;

/** Statusy wniosku; ten moduł ustawia tylko `pending` (złożenie) i `withdrawn` (wycofanie). */
export const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn', 'cancelled'] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

/** Rok w adresie listy wniosków (`?year=2026`). */
export const LEAVE_REQUEST_YEAR_MIN = 2000;
export const LEAVE_REQUEST_YEAR_MAX = 2100;

/** Klucze błędów modułu (teksty w shared/locales/pl/my-leave.json, sekcje server i validation). */
export const MY_LEAVE_MESSAGES = {
  noPool: 'my-leave.server.no_pool',
  noWorkingDays: 'my-leave.server.no_working_days',
  poolNotReady: 'my-leave.server.pool_not_ready',
  yearClosed: 'my-leave.server.year_closed',
  overlap: 'my-leave.server.overlap',
  notEnoughDays: 'my-leave.server.not_enough_days',
  limitExceeded: 'my-leave.server.limit_exceeded',
  notPending: 'my-leave.server.not_pending',
  notApproved: 'my-leave.server.not_approved',
  typeUnavailable: 'my-leave.server.type_unavailable',
  pastDate: 'my-leave.validation.past_date',
  datesOrder: 'my-leave.validation.dates_order',
  sameYear: 'my-leave.validation.same_year',
} as const;

/** Ekran „Moje urlopy” (pozycja menu, linki z powiadomień i z Pulpitu). */
export const MY_LEAVE_PATH = '/admin/my-leave';
