import { Router } from 'express';
import { leaveDecisionReasonSchema, leaveRequestsListQuerySchema, type LeaveRequestsListQuery } from '@app/shared';
import { actorOf, idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { validateQuery } from '../../middleware/validateQuery';
import { sendInlinePdf } from '../../pdf/sendInlinePdf';
import { approveRequest, cancelRequest, getLeaveRequest, getLeaveRequestPdf, listLeaveRequests, rejectRequest } from './leave-requests.service';

/** Moduł Wnioski urlopowe: podpięty w app.ts przez mountModule (rola admin z nawigacji). Kto decyduje = req.user. */
export const leaveRequestsRoutes = Router();

leaveRequestsRoutes.get('/', validateQuery(leaveRequestsListQuerySchema), async (req, res) => {
  res.json(await listLeaveRequests(req.query as unknown as LeaveRequestsListQuery));
});

leaveRequestsRoutes.get('/:id', async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await getLeaveRequest(id));
});

leaveRequestsRoutes.post('/:id/approve', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await approveRequest(id, actorOf(req.user)));
});

leaveRequestsRoutes.post('/:id/reject', validateBody(leaveDecisionReasonSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await rejectRequest(id, (req.body as { reason: string }).reason, actorOf(req.user)));
});

leaveRequestsRoutes.post('/:id/cancel', validateBody(leaveDecisionReasonSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await cancelRequest(id, (req.body as { reason: string }).reason, actorOf(req.user)));
});

leaveRequestsRoutes.get('/:id/pdf', async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id === null) return;
  const result = await getLeaveRequestPdf(id);
  if ('error' in result) return reply(res, result);
  sendInlinePdf(res, result.fileName, result.pdf);
});
