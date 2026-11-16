import { SESSION_KEEPALIVE_MS } from '@app/shared';
import { sessionRedirect } from '../api/client';

/**
 * Ostatnia czynność człowieka (ruch myszy, klawisz, dotyk, przewijanie), wspólna dla wszystkich kart aplikacji przez
 * localStorage: praca w jednej karcie nie wyloguje z drugiej. Bez localStorage (tryb prywatny, blokada) liczy się
 * tylko ta karta.
 */
const ACTIVITY_KEY = 'app.lastActivityAt';
const LOGOUT_KEY = 'app.logoutAt';

let localLast = Date.now();

const read = (key: string): number => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};

const write = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // brak localStorage: zostaje pamięć tej karty
  }
};

export const markActivity = (now = Date.now()): void => {
  localLast = now;
  write(ACTIVITY_KEY, now);
};

export const lastActivityAt = (): number => {
  return Math.max(localLast, read(ACTIVITY_KEY));
};

/** Czy człowiek coś robił w ostatniej minucie (tylko takie zapytania przedłużają sesję na serwerze). */
export const isRecentlyActive = (now = Date.now()): boolean => {
  return now - lastActivityAt() <= SESSION_KEEPALIVE_MS;
};

/** Daje znać innym kartom, że ta się wylogowała. */
export const announceLogout = (): void => {
  write(LOGOUT_KEY, Date.now());
};

/** Wylogowanie w innej karcie przenosi tę na ekran logowania. Zwraca funkcję, która przestaje nasłuchiwać. */
export const watchLogoutInOtherTabs = (): () => void => {
  const handler = (event: StorageEvent) => {
    if (event.key === LOGOUT_KEY) sessionRedirect.go('/login');
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
