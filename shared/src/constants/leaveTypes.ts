/** Typy urlopów (moduł Typy urlopów). */

/** Nazwa typu: do 40 znaków (VARCHAR(40) w bazie). */
export const LEAVE_TYPE_NAME_MAX = 40;
/** Roczny limit dni na osobę: 1–365; brak = bez limitu. */
export const LEAVE_TYPE_LIMIT_MIN = 1;
export const LEAVE_TYPE_LIMIT_MAX = 365;

/** Kierunek strzałek kolejności. */
export const LEAVE_TYPE_DIRECTIONS = ['up', 'down'] as const;
export type LeaveTypeDirection = (typeof LEAVE_TYPE_DIRECTIONS)[number];

/** Klucze błędów serwera modułu (teksty w shared/locales/pl/leave-types.json, sekcja server). */
export const LEAVE_TYPE_MESSAGES = {
  nameTaken: 'leave-types.server.name_taken',
  nameTakenHidden: 'leave-types.server.name_taken_hidden',
  lastVisible: 'leave-types.server.last_visible',
  alreadyHidden: 'leave-types.server.already_hidden',
  notHidden: 'leave-types.server.not_hidden',
} as const;
