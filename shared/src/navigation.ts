import { isRole, type Role } from './constants/roles';

export interface SessionUser {
  id: number;
  name: string;
  role: Role;
  /** Konto ma hasło tymczasowe od administratora: najpierw musi ustawić własne (moduł Logowanie). */
  mustChangePassword: boolean;
}

/** Pozycja nawigacji konta lub panelu. `key` = nazwa folderu modułu, `label` = klucz tekstu. */
export interface NavItem {
  key: string;
  path: string;
  label: string;
  /** Nazwa ikony z Lucide (https://lucide.dev/icons/), np. 'house', 'calendar-days'. Mapa: common/icons.tsx. */
  icon: string;
  roles: Role[];
  /** Gotowa etykieta zamiast klucza `label` (np. nazwa projektu z serwera). */
  text?: string;
  children?: NavItem[];
  /** Strona ma też adres szczegółów `<path>/:id` (np. `/admin/leave-requests/24` z e-maila); ta sama strona i role. */
  detailPath?: boolean;
}

/** Pozycja strony dla odwiedzających (bez ról). */
export interface PublicNavItem {
  key: string;
  path: string;
  label: string;
}

export interface Areas {
  public: boolean;
  account: boolean;
  admin: boolean;
}

export type AreaHome = '/account' | '/admin';

export const canSee = (item: NavItem, user: SessionUser | null): boolean => {
  if (!user || !isRole(user.role)) return false;
  return item.roles.includes(user.role);
};

export const visibleNav = (items: NavItem[], user: SessionUser | null): NavItem[] => {
  const result: NavItem[] = [];
  for (const item of items) {
    if (!canSee(item, user)) continue;
    if (item.children && item.children.length > 0) {
      const children = visibleNav(item.children, user);
      if (children.length === 0) continue;
      result.push({ ...item, children });
    } else {
      result.push({ ...item });
    }
  }
  return result;
};

export const flattenNav = (items: NavItem[]): NavItem[] => {
  return items.flatMap((item) => [item, ...flattenNav(item.children ?? [])]);
};

/**
 * Role, które mają dostęp do modułu pozycji nawigacji `key` (jej role i role pozycji pod nią) albo null, gdy takiej
 * pozycji nie ma. Moduł może mieć pozycję w kilku miejscach (np. „Powiadomienia” w koncie dla pracownika i w panelu
 * dla administratora): wtedy role ze wszystkich. Z tego korzysta mountModule: menu i API mają jedno źródło uprawnień.
 */
export const rolesFor = (key: string, items: NavItem[]): Role[] | null => {
  const found = flattenNav(items).filter((item) => item.key === key);
  if (found.length === 0) return null;
  return [...new Set(flattenNav(found).flatMap((item) => item.roles))];
};

/**
 * Klucz pozycji menu, która ma być podświetlona dla adresu `pathname`: ta, której adres jest równy albo jest początkiem
 * bieżącego (`/admin/orders` dla `/admin/orders/5`). Wygrywa najdłuższy, więc „Pulpit” pod `/admin` nie świeci
 * na każdej podstronie panelu.
 */
/**
 * Adresy części aplikacji: ich pozycja (np. „Pulpit” pod /admin) podświetla się tylko na tym adresie, nie na
 * podstronach spoza menu (np. /admin/notifications).
 */
const PART_HOMES = ['/', '/admin', '/account'];

export const activeNavKey = (items: { key: string; path: string }[], pathname: string): string | null => {
  const matches = items.filter(
    (item) => pathname === item.path || (!PART_HOMES.includes(item.path) && pathname.startsWith(`${item.path}/`)),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.path.length > best.path.length ? item : best)).key;
};

/** Pozycja menu o kluczu `key`, którą ta osoba widzi (z kilku menu naraz), albo null. Np. „Moje konto” w menu użytkownika. */
export const findVisibleNavItem = (
  key: string,
  menus: NavItem[][],
  user: SessionUser | null,
): NavItem | null => {
  for (const items of menus) {
    const found = flattenNav(visibleNav(items, user)).find((item) => item.key === key);
    if (found) return found;
  }
  return null;
};

/** Inicjały do kółka w menu użytkownika: „Jan Kowalski” → „JK”, „Anna” → „A”. */
export const initials = (name: string): string => {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toLocaleUpperCase('pl'));
  if (letters.length === 0) return '?';
  return letters.length === 1 ? letters[0]! : letters[0]! + letters[letters.length - 1]!;
};

/** Adres w panelu: `/admin` albo `/admin/…`, z opcjonalnym `?…`, bez `#`. */
const ADMIN_PATH = /^\/admin(\/[^?#]*)?(\?[^#]*)?$/;

/**
 * Dokąd wrócić po zalogowaniu (`/login?next=…`, np. z linku w e-mailu). Tylko adres w panelu tej aplikacji; obcy
 * adres (`https://…`, `//…`), wyjście wyżej (`..`, także zakodowane `%2e`), `\`, zakodowane `/` i `\` oraz znaki
 * sterujące → `null` (wtedy Pulpit).
 */
export const safeNextPath = (raw: string | null | undefined): string | null => {
  if (!raw || !ADMIN_PATH.test(raw)) return null;
  if (raw.includes('//') || raw.includes('\\') || raw.includes('..') || /%(2e|2f|5c)/i.test(raw) || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
};
