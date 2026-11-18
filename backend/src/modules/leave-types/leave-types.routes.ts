import { Router } from 'express';
import { leaveTypeSchema, orderMoveSchema, type LeaveTypeData, type OrderMoveInput } from '@app/shared';
import { idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { createType, hideType, listTypes, moveType, unhideType, updateType } from './leave-types.service';

/** Moduł Typy urlopów: podpięty w app.ts przez mountModule (rola admin z nawigacji). */
export const leaveTypesRoutes = Router();

leaveTypesRoutes.get('/', async (_req, res) => {
  res.json(await listTypes());
});

leaveTypesRoutes.post('/', validateBody(leaveTypeSchema), async (req, res) => {
  reply(res, await createType(req.body as LeaveTypeData), 201);
});

leaveTypesRoutes.put('/:id', validateBody(leaveTypeSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await updateType(id, req.body as LeaveTypeData));
});

leaveTypesRoutes.post('/:id/move', validateBody(orderMoveSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await moveType(id, (req.body as OrderMoveInput).direction));
});

leaveTypesRoutes.post('/:id/hide', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await hideType(id));
});

leaveTypesRoutes.post('/:id/unhide', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await unhideType(id));
});
