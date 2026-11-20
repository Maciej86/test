import { Router } from 'express';
import { activityLogQuerySchema, type ActivityLogQuery } from '@app/shared';
import { validateQuery } from '../../middleware/validateQuery';
import { getList, getPeople } from './activity-log.service';

/**
 * Historia zmian: tylko odczyt (podpięta w app.ts przez mountModule, rola admin z nawigacji). Wpisy zapisują inne
 * moduły przez `logActivity`; tras zmiany ani usuwania wpisów nie ma.
 */
export const activityLogRoutes = Router();

activityLogRoutes.get('/', validateQuery(activityLogQuerySchema), async (req, res) => {
  res.json(await getList(req.query as unknown as ActivityLogQuery));
});

activityLogRoutes.get('/people', async (_req, res) => {
  res.json(await getPeople());
});
