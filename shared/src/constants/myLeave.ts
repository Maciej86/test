/** Wnioski urlopowe (moduł Moje urlopy; decyzje: moduł Wnioski urlopowe). */

/** Komentarz dla administratora: do 500 znaków (VARCHAR(500) w bazie). */
export const LEAVE_REQUEST_COMMENT_MAX = 500;

/** Statusy wniosku; ten moduł ustawia tylko `pending` (złożenie) i `withdrawn` (wycofanie). */
export const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn', 'cancelled'] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];
