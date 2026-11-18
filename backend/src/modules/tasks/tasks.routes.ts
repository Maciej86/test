import { Router } from 'express';
import { orderMoveSchema, projectDeleteSchema, projectSchema, type OrderMoveInput, type ProjectData, type ProjectDeleteInput } from '@app/shared';
import { requireRole } from '../../middleware/requireRole';
import { actorOf, idParam, reply, viewerOf } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { createProject, deleteProject, listCandidates, listProjects, moveProject, updateProject } from './projects.service';

/**
 * Moduł Zadania: podpięty w app.ts przez mountModule (role grupy „Zadania”: admin, employee). Projekty zmienia tylko
 * administrator (requireRole); tablice i zadania: każdy, kto widzi projekt (warunek w zapytaniach).
 */
export const tasksRoutes = Router();
const adminOnly = requireRole('admin');

tasksRoutes.get('/projects', async (req, res) => {
  res.json(await listProjects(viewerOf(req.user)));
});

tasksRoutes.get('/projects/candidates', adminOnly, async (_req, res) => {
  res.json(await listCandidates());
});

tasksRoutes.post('/projects', adminOnly, validateBody(projectSchema), async (req, res) => {
  reply(res, await createProject(req.body as ProjectData, actorOf(req.user)), 201);
});

tasksRoutes.put('/projects/:id', adminOnly, validateBody(projectSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await updateProject(id, req.body as ProjectData, actorOf(req.user)));
});

tasksRoutes.post('/projects/:id/move', adminOnly, validateBody(orderMoveSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await moveProject(id, (req.body as OrderMoveInput).direction));
});

tasksRoutes.delete('/projects/:id', adminOnly, validateBody(projectDeleteSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await deleteProject(id, (req.body as ProjectDeleteInput).confirmName, actorOf(req.user)));
});
