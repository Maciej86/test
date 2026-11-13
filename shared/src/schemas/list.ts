import { z } from 'zod';

/** Najdłuższy tekst wyszukiwania na listach. */
export const LIST_SEARCH_MAX = 100;

/**
 * Parametry listy z adresu: `?page=2&search=kowal&sort=name&dir=desc`. Sortować można tylko po kolumnach
 * z listy `sortable` (nazwa kolumny z adresu nigdy nie trafia do SQL bez tego sprawdzenia). Ten sam schemat
 * czyta adres na froncie i sprawdza zapytanie na serwerze (`validateQuery`).
 */
export function listQuerySchema<const S extends readonly [string, ...string[]]>(sortable: S, defaultSort: S[number] = sortable[0]) {
  return z.object({
    page: z.coerce.number().int().min(1).catch(1).default(1),
    search: z.string().trim().max(LIST_SEARCH_MAX).catch('').default(''),
    sort: z.enum(sortable, { error: 'validation.list_sort' }).default(defaultSort),
    dir: z.enum(['asc', 'desc']).catch('asc').default('asc'),
  });
}

export type ListQuery<S extends string = string> = { page: number; search: string; sort: S; dir: 'asc' | 'desc' };

/** Odpowiedź każdej listy z API. */
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
