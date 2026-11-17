import { Router } from 'express';
import { MY_LEAVE_MESSAGES, myLeaveRequestsQuerySchema, type MyLeaveRequestsQuery } from '@app/shared';
import { sendError } from '../../middleware/errors';
import { validateQuery } from '../../middleware/validateQuery';
import { getMyLeaveOverview, listMyRequests } from './my-leave.service';

/** Moduł Moje urlopy: podpięty w app.ts przez mountModule (rola employee z nawigacji). Zawsze tylko req.user. */
export const myLeaveRoutes = Router();

myLeaveRoutes.get('/overview', async (req, res) => {
  const overview = await getMyLeaveOverview(req.user!.id);
  if (!overview) return sendError(res, 404, MY_LEAVE_MESSAGES.noPool);
  res.json(overview);
});

myLeaveRoutes.get('/requests', validateQuery(myLeaveRequestsQuerySchema), async (req, res) => {
  res.json(await listMyRequests(req.user!.id, (req.query as unknown as MyLeaveRequestsQuery).year));
});
