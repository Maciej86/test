/** Kalendarz: nieobecności całego zespołu (tylko administrator). */
export const CALENDAR_PATH = '/admin/calendar';

/** Kalendarz pokazuje dzień początku i 60 kolejnych (61 kolumn). */
export const CALENDAR_RANGE_DAYS = 61;
/** O ile dni przesuwają strzałki. */
export const CALENDAR_STEP_DAYS = 30;
/** Najwcześniejszy i najpóźniejszy początek zakresu w adresie (`?from=`). */
export const CALENDAR_FROM_MIN = '2000-01-01';
export const CALENDAR_FROM_MAX = '2099-12-31';

/** Adres kalendarza od wybranego dnia (link „Pokaż w kalendarzu”). */
export const calendarPath = (from: string): string => `${CALENDAR_PATH}?from=${from}`;
