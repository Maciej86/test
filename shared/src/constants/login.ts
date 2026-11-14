/** Logowanie i sesja (moduł Logowanie). Wspólne dla serwera, aplikacji i makiet. */

/** Długości pól kont (te same co kolumny w backend/migrations/001_users.sql). */
export const USER_NAME_MAX = 150;
export const LOGIN_MIN = 3;
export const LOGIN_MAX = 190;
export const EMAIL_MAX = 190;
/** Hasło: minimum z ustaleń, maksimum wynika z bcrypt (sposób zapisu haseł). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** Wylogowanie po bezczynności: po 30 minutach, ostrzeżenie minutę wcześniej. */
export const IDLE_LOGOUT_MS = 30 * 60_000;
export const IDLE_WARNING_MS = 60_000;
/** Przy czynności bez zapytań do serwera aplikacja co najwyżej co minutę potwierdza, że osoba pracuje. */
export const SESSION_KEEPALIVE_MS = 60_000;
/** Nagłówek żądania wysłanego po czynności człowieka; tylko takie żądania przedłużają sesję. */
export const USER_ACTIVITY_HEADER = 'X-User-Activity';
