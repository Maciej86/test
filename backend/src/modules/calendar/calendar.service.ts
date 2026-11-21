import { CALENDAR_RANGE_DAYS, ISO_DATE_FORMAT, dayjs, todayIsoDate, type CalendarResponse } from '@app/shared';
import { pool } from '../../db/pool';
import { listActiveUsers } from '../employees/employees.queries';
import { listCalendarAbsences } from '../leave-requests/leave-requests.queries';

/**
 * Kalendarz od dnia `from` (brak = dziś) przez 61 dni: aktywni pracownicy (bez administratorów i archiwum) i ich
 * wnioski czekające albo zatwierdzone w tym czasie, osobno nieobecni dziś. Koniec zakresu i „dziś” liczy serwer.
 */
export const getCalendar = async (from: string | null): Promise<CalendarResponse> => {
  const today = todayIsoDate();
  const start = from ?? today;
  const to = dayjs(start).add(CALENDAR_RANGE_DAYS - 1, 'day').format(ISO_DATE_FORMAT);
  const people = await listActiveUsers(pool, 'employee');
  const ids = people.map((p) => p.id);
  // „Dziś nie ma” zawsze o dzisiejszym dniu, także gdy widoczny zakres zaczyna się później.
  const [absences, todayOff] = await Promise.all([listCalendarAbsences(pool, ids, start, to), listCalendarAbsences(pool, ids, today, today)]);
  return { from: start, to, today, people, absences, todayOff };
};
