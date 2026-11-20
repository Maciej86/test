import { useLayoutEffect, useRef } from 'react';
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
  const read = (current: URLSearchParams): z.output<S> => {
    const raw: Params = Object.fromEntries(current);
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    const bad = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
    const cleaned = schema.safeParse(Object.fromEntries(Object.entries(raw).filter(([key]) => !bad.has(key))));
    return cleaned.success ? cleaned.data : schema.parse({});
  };
  const params = read(searchParams);
  // Najnowszy adres, wspólny dla wszystkich wersji `update` (także tej zapamiętanej wcześniej). Router pokazuje
  // wysłane adresy z opóźnieniem i po kolei, więc pojawienie się starszego z nich nie cofa nowszego, jeszcze
  // czekającego. Inny adres (przycisk wstecz, link) to zmiana z zewnątrz.
  // Liczy się tylko adres naprawdę pokazany na ekranie (efekt), nie samo rysowanie: router zmienia adres w trybie
  // przejścia, a pod obciążeniem React zaczyna rysować nowy adres, przerywa i rysuje jeszcze raz stary. Gdyby takie
  // przerwane rysowanie się liczyło, powrót do starego adresu wyglądałby jak zmiana z zewnątrz i cofał wybór.
  const latest = useRef(searchParams);
  const pending = useRef<string[]>([]);
  const shown = searchParams.toString();
  const committed = useRef(shown);
  useLayoutEffect(() => {
    // Ten sam adres pokazany ponownie (np. ekran schowany i odsłonięty) to żadna zmiana.
    if (shown === committed.current) return;
    committed.current = shown;
    const sentAt = pending.current.indexOf(shown);
    if (sentAt >= 0) {
      pending.current = pending.current.slice(sentAt + 1);
      if (pending.current.length === 0) latest.current = searchParams;
    } else {
      pending.current = [];
      latest.current = searchParams;
    }
  }, [shown]);

  // Liczone od adresu w chwili zmiany, nie z chwili rysowania: spóźnione wyszukiwanie (300 ms) wysłane po wyborze
  // innego filtra nie cofa tego wyboru.
  const update = (next: Partial<z.output<S>>) => {
    const now = read(latest.current);
    // Lista ze stronami wraca na stronę 1; lista bez stron (np. wybór roku) nie dostaje `page` w adresie.
    const merged: Params = { ...now, ...('page' in now ? { page: 1 } : {}), ...next };
    const entries = Object.entries(merged).filter(([key, value]) => value !== undefined && (defaults as Params)[key] !== value);
    const nextParams = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]));
    latest.current = nextParams;
    pending.current = [...pending.current, nextParams.toString()];
    setSearchParams(nextParams);
  };
  return [params, update];
};
