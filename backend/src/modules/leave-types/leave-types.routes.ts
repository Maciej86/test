import { Router } from 'express';
import { leaveTypeSchema, type LeaveTypeData } from '@app/shared';
import { idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { createType, listTypes, updateType } from './leave-types.service';

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
