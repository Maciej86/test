import { Router } from 'express';
import { contractTypeSchema, orderMoveSchema, type ContractTypeData, type OrderMoveInput } from '@app/shared';
import { actorOf, idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { createType, hideType, listTypes, moveType, unhideType, updateType } from './contract-types.service';

/** Moduł Typy umów: podpięty w app.ts przez mountModule (rola admin z nawigacji). */
export const contractTypesRoutes = Router();

contractTypesRoutes.get('/', async (_req, res) => {
  res.json(await listTypes());
});

contractTypesRoutes.post('/', validateBody(contractTypeSchema), async (req, res) => {
  reply(res, await createType(req.body as ContractTypeData, actorOf(req.user)), 201);
});

contractTypesRoutes.put('/:id', validateBody(contractTypeSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await updateType(id, req.body as ContractTypeData, actorOf(req.user)));
});

contractTypesRoutes.post('/:id/move', validateBody(orderMoveSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await moveType(id, (req.body as OrderMoveInput).direction));
});

contractTypesRoutes.post('/:id/hide', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await hideType(id, actorOf(req.user)));
});

contractTypesRoutes.post('/:id/unhide', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await unhideType(id, actorOf(req.user)));
});
