import { Router } from 'express';
import {
  closeYearSchema,
  employeeCreateSchema,
  employeePasswordSchema,
  employeeUpdateSchema,
  employeesListQuerySchema,
  type CloseYearInput,
  type EmployeeCreateData,
  type EmployeePasswordInput,
  type EmployeeData,
  type EmployeesListQuery,
} from '@app/shared';
import { idParam, reply } from '../../middleware/routeHelpers';
import { validateBody } from '../../middleware/validateBody';
import { validateQuery } from '../../middleware/validateQuery';
import {
  archiveEmployee,
  closeYear,
  createEmployee,
  getCloseYearPreview,
  listEmployeesPage,
  restoreEmployee,
  setEmployeePassword,
  updateEmployee,
  type Actor,
} from './employees.service';

/** Moduł Pracownicy: podpięty w app.ts przez mountModule (rola admin z nawigacji). */
export const employeesRoutes = Router();

const actorOf = (user: Express.Request['user']): Actor => ({ id: user!.id, name: user!.name });

employeesRoutes.get('/', validateQuery(employeesListQuerySchema), async (req, res) => {
  res.json(await listEmployeesPage(req.query as unknown as EmployeesListQuery, actorOf(req.user)));
});

employeesRoutes.post('/', validateBody(employeeCreateSchema), async (req, res) => {
  reply(res, await createEmployee(req.body as EmployeeCreateData, actorOf(req.user)), 201);
});

employeesRoutes.put('/:id', validateBody(employeeUpdateSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await updateEmployee(id, req.body as EmployeeData, actorOf(req.user)));
});

employeesRoutes.post('/:id/password', validateBody(employeePasswordSchema), async (req, res) => {
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await setEmployeePassword(id, (req.body as EmployeePasswordInput).password, actorOf(req.user)));
});

employeesRoutes.post('/:id/archive', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await archiveEmployee(id, actorOf(req.user)));
});

employeesRoutes.post('/:id/restore', async (req, res) => { // rule-ok: bez danych wejściowych, tylko numer z adresu
  const id = idParam(res, req.params.id);
  if (id !== null) reply(res, await restoreEmployee(id, actorOf(req.user)));
});

employeesRoutes.get('/close-year', async (_req, res) => {
  res.json(await getCloseYearPreview());
});

employeesRoutes.post('/close-year', validateBody(closeYearSchema), async (req, res) => {
  reply(res, await closeYear(req.body as CloseYearInput, actorOf(req.user)));
});
