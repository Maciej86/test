import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CalendarResponse } from '@app/shared';
import { api } from '../../core/api/client';

/**
 * Kalendarz od dnia `from` (null = dziś według serwera). Przy przesuwaniu zakresu zostaje poprzedni widok, dopóki nie
 * przyjdzie nowy (ekran nie skacze). Decyzje o wnioskach odświeżają klucz `calendar` (`core/leaveRequestDecisions`).
 */
export const useCalendar = (from: string | null) => {
  return useQuery({
    queryKey: ['calendar', from],
    queryFn: () => api.get<CalendarResponse>('/calendar', { params: from ? { from } : {} }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
};
