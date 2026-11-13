import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { QUERY_STALE_MS } from '../../config/constants';

/** Ponawiamy tylko błędy sieci i serwera (5xx); 4xx (brak dostępu, złe dane) od powtarzania się nie zmieni. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response && error.response.status < 500) return false;
  return failureCount < 2;
}

/**
 * Pobieranie danych w całej aplikacji (TanStack Query). Moduły mają hooki w `<module>.api.ts`:
 * useQuery do odczytu, useMutation do zapisu, a po zapisie invalidateQueries odświeża listę.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: QUERY_STALE_MS },
      mutations: { retry: false },
    },
  });
}
