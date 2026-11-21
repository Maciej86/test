import { Router } from 'express';
import { calendarQuerySchema, type CalendarQuery } from '@app/shared';
import { validateQuery } from '../../middleware/validateQuery';
import { getCalendar } from './calendar.service';

/** Moduł Kalendarz: podpięty w app.ts przez mountModule (rola admin z nawigacji); tylko odczyt. */
export const calendarRoutes = Router();

calendarRoutes.get('/', validateQuery(calendarQuerySchema), async (req, res) => {
  res.json(await getCalendar((req.query as unknown as CalendarQuery).from));
});
