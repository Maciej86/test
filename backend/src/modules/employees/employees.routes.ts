import { Router, type Response } from 'express';
import { employeeCreateSchema, employeesListQuerySchema, type EmployeeCreateData, type EmployeesListQuery } from '@app/shared';
import { sendError } from '../../middleware/errors';
import { validateBody } from '../../middleware/validateBody';
import { validateQuery } from '../../middleware/validateQuery';
import { createEmployee, listEmployeesPage, type Actor, type Result } from './employees.service';

/** Moduł Pracownicy: podpięty w app.ts przez mountModule (rola admin z nawigacji). */
export const employeesRoutes = Router();

const actorOf = (user: Express.Request['user']): Actor => ({ id: user!.id, name: user!.name });

/** Wynik usługi → odpowiedź: błąd jednym formatem, sukces jako JSON. */
function reply<T>(res: Response, result: Result<T>, status = 200) {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    const { status: code, message, fields, archivedUser } = result.error;
    return sendError(res, code, message, fields, archivedUser ? { archivedUser } : undefined);
  }
  res.status(status).json(result);
}

employeesRoutes.get('/', validateQuery(employeesListQuerySchema), async (req, res) => {
  res.json(await listEmployeesPage(req.query as unknown as EmployeesListQuery, actorOf(req.user)));
});

employeesRoutes.post('/', validateBody(employeeCreateSchema), async (req, res) => {
  reply(res, await createEmployee(req.body as EmployeeCreateData, actorOf(req.user)), 201);
});
