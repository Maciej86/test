/** Typy urlopów (moduł Typy urlopów). */

/** Nazwa typu: do 40 znaków (VARCHAR(40) w bazie). */
export const LEAVE_TYPE_NAME_MAX = 40;
/** Roczny limit dni na osobę: 1–365; brak = bez limitu. */
export const LEAVE_TYPE_LIMIT_MIN = 1;
export const LEAVE_TYPE_LIMIT_MAX = 365;
/**
 * Kolor typu w Kalendarzu: kolory Mantine z motywu. Bez żółtego i czerwonego (to kolory statusów: czeka, odrzucony).
 * Długość nazwy mieści się w VARCHAR(10) w bazie.
 */
export const LEAVE_TYPE_COLORS = ['green', 'teal', 'cyan', 'navy', 'grape', 'orange'] as const;
export type LeaveTypeColor = (typeof LEAVE_TYPE_COLORS)[number];
/** Jak liczyć dni urlopu: robocze (bez weekendów i świąt) albo kalendarzowe (wszystkie). */
export const LEAVE_DAY_COUNTS = ['working', 'calendar'] as const;
export type LeaveDayCount = (typeof LEAVE_DAY_COUNTS)[number];
/** Kolor nowego typu. */
export const LEAVE_TYPE_DEFAULT_COLOR: LeaveTypeColor = 'green';


/** Klucze błędów serwera modułu (teksty w shared/locales/pl/leave-types.json, sekcja server). */
export const LEAVE_TYPE_MESSAGES = {
  nameTaken: 'leave-types.server.name_taken',
  nameTakenHidden: 'leave-types.server.name_taken_hidden',
  lastVisible: 'leave-types.server.last_visible',
  alreadyHidden: 'leave-types.server.already_hidden',
  notHidden: 'leave-types.server.not_hidden',
} as const;

/** Ekran „Typy urlopów” (Ustawienia). */
export const LEAVE_TYPES_PATH = '/admin/leave-types';
