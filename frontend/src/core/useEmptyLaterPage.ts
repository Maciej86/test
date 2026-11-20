import { useEffect } from 'react';

/**
 * Pusta strona 2+ listy (ostatnia rzecz ze strony rozpatrzona, przywrócona albo usunięta; stary link z `page=9`):
 * to nie „pusta lista”, tylko powrót na stronę 1. Zwraca true, dopóki trwa ten powrót (ekran nie pokazuje wtedy
 * pustego stanu).
 *
 *   const emptyLaterPage = useEmptyLaterPage(data, params.page, () => setParams({ page: 1 }));
 */
export const useEmptyLaterPage = (data: { items: unknown[] } | undefined, page: number, toFirstPage: () => void): boolean => {
  const empty = data !== undefined && data.items.length === 0 && page > 1;
  useEffect(() => {
    if (empty) toFirstPage();
    // Tylko pojawienie się pustej strony jest powodem: `toFirstPage` jest nową funkcją przy każdym rysowaniu.
  }, [empty]);
  return empty;
};
