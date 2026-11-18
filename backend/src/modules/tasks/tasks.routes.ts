import { Router } from 'express';
import {
  boardQuerySchema,
  newTaskSchema,
  orderMoveSchema,
  projectDeleteSchema,
  projectSchema,
  taskFinishSchema,
  taskMoveSchema,
  taskSchema,
  type BoardQuery,
  type OrderMoveInput,
  type ProjectData,
  type ProjectDeleteInput,
  type TaskData,
  type TaskFinishInput,
  type TaskMoveInput,
} from '@app/shared';
import { requireRole } from '../../middleware/requireRole';
import { actorOf, idParam, reply, viewerOf } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { validateQuery } from '../../middleware/validateQuery';
import { createProject, deleteProject, listCandidates, listProjects, moveProject, updateProject } from './projects.service';
import { archiveTask, createTask, finishTask, getBoard, moveTask, updateTask } from './tasks.service';

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

tasksRoutes.get('/projects/:id/board', validateQuery(boardQuerySchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await getBoard(id, viewerOf(req.user), (req.query as unknown as BoardQuery).oldDone));
});

tasksRoutes.post('/projects/:id/tasks', validateBody(newTaskSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await createTask(id, req.body as TaskData, viewerOf(req.user)), 201);
});

tasksRoutes.put('/:taskId', validateBody(taskSchema), async (req, res) => {
  const id = idParam(res, req.params.taskId);
  if (id !== null) reply(res, await updateTask(id, req.body as TaskData, viewerOf(req.user)));
});

tasksRoutes.post('/:taskId/move', validateBody(taskMoveSchema), async (req, res) => {
  const id = idParam(res, req.params.taskId);
  if (id !== null) reply(res, await moveTask(id, req.body as TaskMoveInput, viewerOf(req.user)));
});

tasksRoutes.post('/:taskId/archive', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.taskId);
  if (id !== null) reply(res, await archiveTask(id, viewerOf(req.user)));
});

tasksRoutes.post('/:taskId/finish', validateBody(taskFinishSchema), async (req, res) => {
  const id = idParam(res, req.params.taskId);
  if (id !== null) reply(res, await finishTask(id, (req.body as TaskFinishInput).finished, viewerOf(req.user)));
});
