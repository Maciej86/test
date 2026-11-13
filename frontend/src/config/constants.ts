/** Stałe interfejsu. Zmieniane tylko w kodzie. Wspólne z makietami są w shared/src/constants/ui.ts. */
export { NOTIFICATION_AUTOCLOSE_MS } from '@app/shared';

/** Dokąd przenosi aplikacja, gdy serwer powie, że sesja wygasła (tekst „Sesja wygasła…” robi moduł Logowanie). */
export const SESSION_EXPIRED_PATH = '/login?reason=expired';
/** Dokąd przenosi aplikacja, gdy osoba musi najpierw ustawić własne hasło (ekran robi moduł Logowanie). */
export const PASSWORD_CHANGE_PATH = '/change-password';
/** Jak długo pobrane dane uchodzą za świeże, zanim TanStack Query pobierze je ponownie. */
export const QUERY_STALE_MS = 30_000;
