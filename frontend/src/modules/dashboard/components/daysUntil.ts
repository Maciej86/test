import { dayjs } from '@app/shared';

/** Ile dni od `today` do `iso` (0 = dziś, ujemne = w przeszłości). */
export const daysUntil = (iso: string, today: string) => dayjs(iso).diff(dayjs(today), 'day');
