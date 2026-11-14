import {
  EMPLOYEE_MESSAGES,
  todayIsoDate,
  type ArchivedUserHint,
  type EmployeeCreateData,
  type EmployeeListItem,
  type EmployeePool,
  type EmployeesListQuery,
  type EmployeesListResponse,
} from '@app/shared';
import { hashPassword } from '../../auth/password';
import { PAGE_SIZE } from '../../config/constants';
import { diffChanges, logActivity } from '../../db/activityLog';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import * as q from './employees.queries';

/** Kto wykonuje zmianę (z `req.user`). */
export interface Actor {
  id: number;
  name: string;
}

/** Błąd do odesłania przez trasę: status, klucz, ewentualnie błędy pól i podpowiedź „Przywróć konto”. */
export interface ServiceError {
  status: number;
  message: string;
  fields?: Record<string, string>;
  archivedUser?: ArchivedUserHint;
}

export type Result<T = { ok: true }> = T | { error: ServiceError };

const fail = (status: number, message: string, extra: Omit<ServiceError, 'status' | 'message'> = {}) => ({
  error: { status, message, ...extra },
});

/** Bieżący rok kalendarzowy w strefie aplikacji. */
export const currentYear = () => Number(todayIsoDate().slice(0, 4));

/** Rok otwarty: najmniejszy rok z niezamkniętą pulą; bez pul bieżący rok. */
export async function getOpenYear(db: q.Db = pool): Promise<number> {
  return (await q.minOpenYear(db)) ?? currentYear();
}

/**
 * Wykorzystane (zatwierdzone) i czekające dni z puli. Wniosków jeszcze nie ma, więc na razie zera;
 * moduł „Moje urlopy” podmieni tę funkcję na liczenie z leave_requests.
 */
export async function getPoolUsage(userIds: number[], _year: number): Promise<Map<number, { usedDays: number; pendingDays: number }>> {
  return new Map(userIds.map((id) => [id, { usedDays: 0, pendingDays: 0 }]));
}

/** Pula z liczbami do pokazania: zaległe schodzą pierwsze. */
export function toPool(year: number, annualDays: number, carriedDays: number, usage: { usedDays: number; pendingDays: number }): EmployeePool {
  const usedFromCarried = Math.min(usage.usedDays, carriedDays);
  const leftCarriedDays = carriedDays - usedFromCarried;
  const leftDays = Math.max(0, annualDays + carriedDays - usage.usedDays);
  return { year, annualDays, carriedDays, usedDays: usage.usedDays, pendingDays: usage.pendingDays, leftDays, leftCarriedDays };
}

export async function listEmployeesPage(query: EmployeesListQuery, me: Actor): Promise<EmployeesListResponse> {
  const year = await getOpenYear();
  const { rows, total } = await q.listEmployees(pool, { ...query, year, pageSize: PAGE_SIZE });
  const usage = await getPoolUsage(rows.map((r) => r.id), year);
  const items: EmployeeListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    login: r.login,
    email: r.email,
    role: r.role,
    isMe: r.id === me.id,
    pool:
      r.role === 'employee' && r.annual_days !== null
        ? toPool(year, r.annual_days, r.carried_days ?? 0, usage.get(r.id) ?? { usedDays: 0, pendingDays: 0 })
        : null,
  }));
  return { items, total, page: query.page, pageSize: PAGE_SIZE, openYear: year, counts: await q.countEmployees(pool) };
}

/** Login i e-mail są niepowtarzalne razem z archiwum; konto w archiwum → podpowiedź przywrócenia. */
async function findConflict(db: q.Db, login: string, email: string | null, exceptId: number | null): Promise<{ error: ServiceError } | null> {
  const others = await q.findAccountsWithLoginOrEmail(db, login, email, exceptId);
  for (const field of ['login', 'email'] as const) {
    const other = others.find((o) => (field === 'login' ? o.login === login : email !== null && o.email === email));
    if (!other) continue;
    if (other.archived_at) {
      const key = field === 'login' ? EMPLOYEE_MESSAGES.loginTakenArchived : EMPLOYEE_MESSAGES.emailTakenArchived;
      return fail(409, key, { fields: { [field]: key }, archivedUser: { id: other.id, name: other.name } });
    }
    const key = field === 'login' ? EMPLOYEE_MESSAGES.loginTaken : EMPLOYEE_MESSAGES.emailTaken;
    return fail(409, key, { fields: { [field]: key } });
  }
  return null;
}

/** Wyścig dwóch zapisów: unikalny indeks w bazie odrzuca drugi; zamieniamy to na ten sam błąd pola. */
function duplicateError(error: unknown): { error: ServiceError } | null {
  if (!(error instanceof Error) || (error as { code?: string }).code !== 'ER_DUP_ENTRY') return null;
  const field = error.message.includes('uq_users_email') ? 'email' : 'login';
  const key = field === 'email' ? EMPLOYEE_MESSAGES.emailTaken : EMPLOYEE_MESSAGES.loginTaken;
  return fail(409, key, { fields: { [field]: key } });
}

const accountFields = (d: { name: string; login: string; email: string | null; role: string }) => ({
  name: d.name,
  login: d.login,
  email: d.email,
  role: d.role,
});

export async function createEmployee(input: EmployeeCreateData, actor: Actor): Promise<Result<{ id: number }>> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await withTransaction(async (conn) => {
      const conflict = await findConflict(conn, input.login, input.email, null);
      if (conflict) return conflict;
      const id = await q.insertUser(conn, { name: input.name, login: input.login, email: input.email, role: input.role, passwordHash });
      const log = { userId: actor.id, userName: actor.name, entityId: id };
      await logActivity(conn, { ...log, action: 'create', entityType: 'users', changes: diffChanges({}, accountFields(input)) });
      if (input.role === 'employee' && input.annualDays !== undefined) {
        const year = await getOpenYear(conn);
        await q.upsertPool(conn, id, year, input.annualDays, input.carriedDays);
        await logActivity(conn, {
          ...log,
          action: 'create',
          entityType: 'leave_pools',
          changes: diffChanges({}, { year, annual_days: input.annualDays, carried_days: input.carriedDays }),
        });
      }
      return { id };
    });
  } catch (error) {
    const duplicate = duplicateError(error);
    if (duplicate) return duplicate;
    throw error;
  }
}
