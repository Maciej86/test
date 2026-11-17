import { Router } from 'express';
import {
  leaveRequestSchema,
  MY_LEAVE_MESSAGES,
  myLeaveRequestsQuerySchema,
  type LeaveRequestData,
  type MyLeaveRequestsQuery,
} from '@app/shared';
import { sendError } from '../../middleware/errors';
import { sendInlinePdf } from '../../pdf/sendInlinePdf';
import { actorOf, idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { validateQuery } from '../../middleware/validateQuery';
import { createRequest, getMyLeaveOverview, getRequestPdf, listMyRequests, withdrawRequest } from './my-leave.service';

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

myLeaveRoutes.post('/requests', validateBody(leaveRequestSchema), async (req, res) => {
  reply(res, await createRequest(req.body as LeaveRequestData, actorOf(req.user)), 201);
});

myLeaveRoutes.post('/requests/:id/withdraw', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await withdrawRequest(id, actorOf(req.user)));
});

/** PDF własnego zatwierdzonego wniosku (w nowej karcie). */
myLeaveRoutes.get('/requests/:id/pdf', async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id === null) return;
  const result = await getRequestPdf(id, req.user!.id);
  if ('error' in result) return reply(res, result);
  sendInlinePdf(res, result.fileName, result.pdf);
});
