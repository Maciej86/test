import { Router } from 'express';
import { notificationsQuerySchema, type NotificationsQuery } from '@app/shared';
import { idParam, reply } from '../../middleware/routeHelpers';
import { validateQuery } from '../../middleware/validateQuery';
import { getList, getSummary, readAll, readOne } from './notifications.service';

/** Powiadomienia zalogowanej osoby; zawsze tylko własne (`req.user.id`). */
export const notificationsRoutes = Router();

notificationsRoutes.get('/summary', async (req, res) => {
  reply(res, await getSummary(req.user!.id));
});

notificationsRoutes.get('/', validateQuery(notificationsQuerySchema), async (req, res) => {
  reply(res, await getList(req.user!.id, req.query as unknown as NotificationsQuery));
});

notificationsRoutes.post('/read-all', async (req, res) => { // rule-ok: bez danych wejściowych, tylko własne powiadomienia z req.user
  reply(res, await readAll(req.user!.id));
});

notificationsRoutes.post('/:id/read', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id === null) return;
  const result = await readOne(req.user!.id, id);
  if ('error' in result) return reply(res, result);
  res.status(204).end();
});
