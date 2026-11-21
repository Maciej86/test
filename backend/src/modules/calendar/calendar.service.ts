import { CALENDAR_RANGE_DAYS, ISO_DATE_FORMAT, dayjs, todayIsoDate, type CalendarResponse } from '@app/shared';
import { pool } from '../../db/pool';
import { listActiveUsers } from '../employees/employees.queries';
import { listCalendarAbsences } from '../leave-requests/leave-requests.queries';

/**
 * Kalendarz od dnia `from` (brak = dziś) przez 61 dni: aktywni pracownicy (bez administratorów i archiwum) i ich
 * wnioski czekające albo zatwierdzone w tym czasie. Koniec zakresu i „dziś” liczy serwer.
 */
export const getCalendar = async (from: string | null): Promise<CalendarResponse> => {
  const today = todayIsoDate();
  const start = from ?? today;
  const to = dayjs(start).add(CALENDAR_RANGE_DAYS - 1, 'day').format(ISO_DATE_FORMAT);
  const people = await listActiveUsers(pool, 'employee');
  const absences = await listCalendarAbsences(pool, people.map((p) => p.id), start, to);
  return { from: start, to, today, people, absences };
};
