import { useContext } from 'react';
import { UNSAFE_DataRouterContext, useLocation } from 'react-router';

/**
 * Filtry z adresu (`?search=…&page=2`) czytane w chwili kliknięcia, a nie z ostatniego przerysowania ekranu. Router
 * zmienia adres od razu, a ekran przerysowuje chwilę później („w tle”); klik w tej chwili (np. w wiersz zaraz po
 * wyszukaniu) z `useLocation().search` zabrałby stare filtry.
 *
 *   const currentSearch = useCurrentSearch();
 *   onClick={() => navigate(`/admin/leave-requests/${id}${currentSearch()}`)}
 */
export const useCurrentSearch = (): (() => string) => {
  const router = useContext(UNSAFE_DataRouterContext)?.router;
  const { search } = useLocation();
  // Bez routera danych (np. MemoryRouter w testach) zostaje adres z ostatniego przerysowania.
  return () => router?.state.location.search ?? search;
};
