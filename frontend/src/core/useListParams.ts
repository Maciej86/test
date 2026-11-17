import { useSearchParams } from 'react-router';
import type { z } from 'zod';

type Params = Record<string, unknown>;

/**
 * Parametry listy (strona, szukanie, kolejność, filtry) w adresie strony: `?page=2&search=kowal`. Czyta je ten sam
 * schemat, który sprawdza zapytanie na serwerze, więc odświeżenie i wysłany link pokazują ten sam widok.
 * Zły parametr (np. stara zakładka z `?sort=foo`) zamienia się na domyślny, reszta zostaje. Zmiana filtra wraca na
 * stronę 1 (gdy schemat ma `page`); w adresie zostaje tylko to, co różni się od `defaults`.
 *
 *   const [params, setParams] = useListParams(employeesListQuerySchema, { page: 1, search: '', sort: 'name', dir: 'asc' });
 */
export const useListParams = <S extends z.ZodType<Params>>(
  schema: S,
  defaults: Partial<z.output<S>>,
): [z.output<S>, (next: Partial<z.output<S>>) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw: Params = Object.fromEntries(searchParams);
  const parsed = schema.safeParse(raw);
  let params: z.output<S>;
  if (parsed.success) {
    params = parsed.data;
  } else {
    const bad = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
    const cleaned = schema.safeParse(Object.fromEntries(Object.entries(raw).filter(([key]) => !bad.has(key))));
    params = cleaned.success ? cleaned.data : schema.parse({});
  }

  const update = (next: Partial<z.output<S>>) => {
    // Lista ze stronami wraca na stronę 1; lista bez stron (np. wybór roku) nie dostaje `page` w adresie.
    const merged: Params = { ...params, ...('page' in params ? { page: 1 } : {}), ...next };
    const entries = Object.entries(merged).filter(([key, value]) => value !== undefined && (defaults as Params)[key] !== value);
    setSearchParams(new URLSearchParams(entries.map(([key, value]) => [key, String(value)])));
  };
  return [params, update];
};
