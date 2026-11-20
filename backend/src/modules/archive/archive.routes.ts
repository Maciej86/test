import { Router } from 'express';
import {
  archiveDeleteEmployeeSchema,
  archiveEmployeesQuerySchema,
  archiveTasksQuerySchema,
  type ArchiveDeleteEmployeeInput,
  type ArchiveEmployeesQuery,
  type ArchiveTasksQuery,
} from '@app/shared';
import { actorOf, idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { validateQuery } from '../../middleware/validateQuery';
import { countArchivedEmployees, deleteArchivedEmployee, listArchivedEmployees, restoreEmployee } from '../employees/employees.service';
import { countArchivedTasks, deleteArchivedTask, getArchivedTask, listArchivedTasks, restoreArchivedTask } from '../tasks/tasks.service';

/**
 * Moduł Archiwum: konta i zadania w archiwum, przywracanie i usuwanie na stałe. Podpięty w app.ts przez mountModule
 * (rola admin z nawigacji). Logika siedzi w modułach Pracownicy i Zadania; tu są tylko adresy.
 */
export const archiveRoutes = Router();

archiveRoutes.get('/counts', async (_req, res) => {
  const [employees, tasks] = await Promise.all([countArchivedEmployees(), countArchivedTasks()]);
  res.json({ employees, tasks });
});

archiveRoutes.get('/employees', validateQuery(archiveEmployeesQuerySchema), async (req, res) => {
  res.json(await listArchivedEmployees(req.query as unknown as ArchiveEmployeesQuery));
});

archiveRoutes.post('/employees/:id/restore', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await restoreEmployee(id, actorOf(req.user)));
});

archiveRoutes.delete('/employees/:id', validateBody(archiveDeleteEmployeeSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await deleteArchivedEmployee(id, (req.body as ArchiveDeleteEmployeeInput).confirmName, actorOf(req.user)));
});

archiveRoutes.get('/tasks', validateQuery(archiveTasksQuerySchema), async (req, res) => {
  res.json(await listArchivedTasks(req.query as unknown as ArchiveTasksQuery));
});

archiveRoutes.get('/tasks/:id', async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await getArchivedTask(id));
});

archiveRoutes.post('/tasks/:id/restore', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await restoreArchivedTask(id, actorOf(req.user)));
});

archiveRoutes.delete('/tasks/:id', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await deleteArchivedTask(id, actorOf(req.user)));
});
