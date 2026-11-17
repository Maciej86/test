import {
  EMPLOYEE_MESSAGES,
  SERVER_MESSAGES,
  todayIsoDate,
  type CloseYearInput,
  type CloseYearPreview,
  type EmployeeCreateData,
  type EmployeeData,
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
import { fail, type Result, type ServiceError } from '../../middleware/routeHelpers';
import { findContractType, listSelectableContractTypes } from '../contract-types/contract-types.queries';
import { countPendingRequests, sumPoolUsage } from '../my-leave/my-leave.queries';
import * as q from './employees.queries';

/** Kto wykonuje zmianę (z `req.user`). */
export interface Actor {
  id: number;
  name: string;
}

/** Bieżący rok kalendarzowy w strefie aplikacji. */
export const currentYear = () => Number(todayIsoDate().slice(0, 4));

/** Rok otwarty: najmniejszy rok z niezamkniętą pulą; bez pul bieżący rok. */
export const getOpenYear = async (db: q.Db = pool): Promise<number> => {
  return (await q.minOpenYear(db)) ?? currentYear();
};

/** Dni z wniosków dla puli: zatwierdzone (z tego z zaległego) i czekające na decyzję. */
export interface PoolUsageDays {
  usedDays: number;
  pendingDays: number;
  usedCarried: number;
}

const NO_USAGE: PoolUsageDays = { usedDays: 0, pendingDays: 0, usedCarried: 0 };

/** Wykorzystane (zatwierdzone) i czekające dni z puli, z wniosków modułu Moje urlopy (zapisany podział). */
export const getPoolUsage = async (userIds: number[], year: number, db: q.Db = pool): Promise<Map<number, PoolUsageDays>> => {
  const usage = await sumPoolUsage(db, userIds, year);
  return new Map(
    userIds.map((id) => {
      const u = usage.get(id);
      return [id, u ? { usedDays: u.usedCarried + u.usedAnnual, pendingDays: u.pendingCarried + u.pendingAnnual, usedCarried: u.usedCarried } : NO_USAGE];
    }),
  );
};

/** Pula z liczbami do pokazania: zaległe schodzą pierwsze (ile z zaległego, zapisał wniosek przy złożeniu). */
export const toPool = (year: number, annualDays: number, carriedDays: number, usage: PoolUsageDays): EmployeePool => {
  const leftCarriedDays = Math.max(0, carriedDays - usage.usedCarried);
  const leftDays = Math.max(0, annualDays + carriedDays - usage.usedDays);
  return { year, annualDays, carriedDays, usedDays: usage.usedDays, pendingDays: usage.pendingDays, leftDays, leftCarriedDays };
};

export const listEmployeesPage = async (query: EmployeesListQuery, me: Actor): Promise<EmployeesListResponse> => {
  const year = await getOpenYear();
  const { rows, total } = await q.listEmployees(pool, { ...query, year, pageSize: PAGE_SIZE });
  const usage = await getPoolUsage(rows.map((r) => r.id), year);
  const items: EmployeeListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    firstName: r.first_name,
    lastName: r.last_name,
    login: r.login,
    email: r.email,
    role: r.role,
    hiredOn: r.hired_on,
    contractType: r.contract_type_id !== null ? { id: r.contract_type_id, name: r.contract_type_name ?? '', hidden: r.contract_type_hidden_at !== null } : null,
    isMe: r.id === me.id,
    pool:
      r.role === 'employee' && r.annual_days !== null
        ? toPool(year, r.annual_days, r.carried_days ?? 0, usage.get(r.id) ?? NO_USAGE)
        : null,
  }));
  return { items, total, page: query.page, pageSize: PAGE_SIZE, openYear: year, counts: await q.countEmployees(pool) };
};

/** Login i e-mail są niepowtarzalne razem z archiwum; konto w archiwum → podpowiedź przywrócenia. */
const findConflict = async (db: q.Db, login: string, email: string | null, exceptId: number | null): Promise<{ error: ServiceError } | null> => {
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
};

/** Wyścig dwóch zapisów: unikalny indeks w bazie odrzuca drugi; zamieniamy to na ten sam błąd pola. */
const duplicateError = (error: unknown): { error: ServiceError } | null => {
  if (!(error instanceof Error) || (error as { code?: string }).code !== 'ER_DUP_ENTRY') return null;
  const field = error.message.includes('uq_users_email') ? 'email' : 'login';
  const key = field === 'email' ? EMPLOYEE_MESSAGES.emailTaken : EMPLOYEE_MESSAGES.loginTaken;
  return fail(409, key, { fields: { [field]: key } });
};

/**
 * Typ umowy do zapisu: widoczny albo ten, który osoba już ma (ukryty zostaje u niej). Zwraca nazwę do historii.
 * Nieistniejący i cudzy ukryty → 400 pod polem.
 */
const checkContractType = async (db: q.Db, typeId: number | null, currentTypeId: number | null): Promise<{ name: string | null } | { error: ServiceError }> => {
  if (typeId === null) return { name: null };
  const type = await findContractType(db, typeId, { forShare: true });
  if (!type || (type.hidden && type.id !== currentTypeId)) {
    return fail(400, EMPLOYEE_MESSAGES.contractTypeUnavailable, { fields: { contractTypeId: EMPLOYEE_MESSAGES.contractTypeUnavailable } });
  }
  return { name: type.name };
};

/** Nazwa obecnego typu osoby (do historii); brak → null. */
const contractTypeName = async (db: q.Db, typeId: number | null): Promise<string | null> =>
  typeId === null ? null : ((await findContractType(db, typeId))?.name ?? null);

/** Pola konta do historii zmian (nazwy kolumn w bazie); typ umowy jako nazwa, żeby wpis był czytelny po zmianie nazwy. */
const accountFields = (d: q.AccountData, contractTypeName: string | null) => ({
  first_name: d.firstName,
  last_name: d.lastName,
  login: d.login,
  email: d.email,
  role: d.role,
  hired_on: d.hiredOn,
  contract_type: contractTypeName,
});

const accountOf = (u: q.UserRow): q.AccountData => ({
  firstName: u.first_name,
  lastName: u.last_name,
  login: u.login,
  email: u.email,
  role: u.role,
  hiredOn: u.hired_on ?? null,
  contractTypeId: u.contract_type_id ?? null,
});

const accountInput = (d: EmployeeData): q.AccountData => ({
  firstName: d.firstName,
  lastName: d.lastName,
  login: d.login,
  email: d.email,
  role: d.role,
  hiredOn: d.hiredOn,
  contractTypeId: d.contractTypeId,
});

export const createEmployee = async (input: EmployeeCreateData, actor: Actor): Promise<Result<{ id: number }>> => {
  const passwordHash = await hashPassword(input.password);
  try {
    return await withTransaction(async (conn) => {
      const contractType = await checkContractType(conn, input.contractTypeId, null);
      if ('error' in contractType) return contractType;
      const conflict = await findConflict(conn, input.login, input.email, null);
      if (conflict) return conflict;
      const id = await q.insertUser(conn, { ...accountInput(input), passwordHash });
      const log = { userId: actor.id, userName: actor.name, entityId: id };
      const changes = diffChanges({}, accountFields(accountInput(input), contractType.name));
      await logActivity(conn, { ...log, action: 'create', entityType: 'users', changes });
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
};

const notFound = () => fail(404, SERVER_MESSAGES.notFound);

/** Konto spoza archiwum albo null. */
const findActiveEmployee = async (db: q.Db, id: number) => {
  const user = await q.findUser(db, id);
  return user && !user.archived_at ? user : null;
};

export const updateEmployee = async (id: number, input: EmployeeData, actor: Actor): Promise<Result> => {
  try {
    return await withTransaction(async (conn) => {
      const before = await findActiveEmployee(conn, id);
      if (!before) return notFound();
      if (id === actor.id && input.role !== before.role) return fail(409, EMPLOYEE_MESSAGES.ownRole);
      const contractType = await checkContractType(conn, input.contractTypeId, before.contract_type_id);
      if ('error' in contractType) return contractType;
      const conflict = await findConflict(conn, input.login, input.email, id);
      if (conflict) return conflict;

      const log = { userId: actor.id, userName: actor.name, entityId: id };
      const beforeTypeName =
        before.contract_type_id === input.contractTypeId ? contractType.name : await contractTypeName(conn, before.contract_type_id);
      const accountChanges = diffChanges(accountFields(accountOf(before), beforeTypeName), accountFields(accountInput(input), contractType.name));
      if (Object.keys(accountChanges).length > 0) {
        await q.updateUser(conn, id, accountInput(input));
        await logActivity(conn, { ...log, action: 'update', entityType: 'users', changes: accountChanges });
      }

      if (input.role === 'employee' && input.annualDays !== undefined) {
        const year = await getOpenYear(conn);
        const pool = await q.findPool(conn, id, year);
        const after = { annual_days: input.annualDays, carried_days: input.carriedDays };
        const poolChanges = pool
          ? diffChanges({ annual_days: pool.annual_days, carried_days: pool.carried_days }, after)
          : diffChanges({}, { year, ...after });
        if (Object.keys(poolChanges).length > 0) {
          await q.upsertPool(conn, id, year, input.annualDays, input.carriedDays);
          await logActivity(conn, { ...log, action: pool ? 'update' : 'create', entityType: 'leave_pools', changes: poolChanges });
        }
      }
      return { ok: true as const };
    });
  } catch (error) {
    const duplicate = duplicateError(error);
    if (duplicate) return duplicate;
    throw error;
  }
};

export const setEmployeePassword = async (id: number, password: string, actor: Actor): Promise<Result> => {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (conn) => {
    if (!(await findActiveEmployee(conn, id))) return notFound();
    await q.setTemporaryPassword(conn, id, passwordHash);
    // Samo zdarzenie, bez hasła i skrótu.
    await logActivity(conn, {
      userId: actor.id, userName: actor.name, entityId: id, action: 'update', entityType: 'users',
      changes: { password: { before: null, after: 'reset' } },
    });
    return { ok: true as const };
  });
};

/** Do archiwum: konto przestaje działać od razu (authenticate czyta bazę przy każdym żądaniu). */
export const archiveEmployee = async (id: number, actor: Actor): Promise<Result> => {
  return withTransaction(async (conn) => {
    const user = await q.findUser(conn, id);
    if (!user) return notFound();
    if (id === actor.id) return fail(409, EMPLOYEE_MESSAGES.archiveSelf);
    if (user.archived_at) return fail(409, EMPLOYEE_MESSAGES.alreadyArchived);
    await q.setArchived(conn, id, actor.id);
    await logActivity(conn, { userId: actor.id, userName: actor.name, entityId: id, action: 'archive', entityType: 'users', changes: {} });
    return { ok: true as const };
  });
};

/** Przywrócenie z archiwum (link „Przywróć konto” i później moduł Archiwum). */
export const restoreEmployee = async (id: number, actor: Actor): Promise<Result> => {
  return withTransaction(async (conn) => {
    const user = await q.findUser(conn, id);
    if (!user) return notFound();
    if (!user.archived_at) return fail(409, EMPLOYEE_MESSAGES.notArchived);
    await q.setArchived(conn, id, null);
    await logActivity(conn, { userId: actor.id, userName: actor.name, entityId: id, action: 'restore', entityType: 'users', changes: {} });
    return { ok: true as const };
  });
};

const leftDaysByUser = async (pools: q.YearPoolRow[], year: number, db: q.Db = pool): Promise<Map<number, number>> => {
  const usage = await getPoolUsage(pools.map((p) => p.user_id), year, db);
  return new Map(pools.map((p) => [p.user_id, toPool(year, p.annual_days, p.carried_days, usage.get(p.user_id) ?? NO_USAGE).leftDays]));
};

/** Podgląd okna „Zamknij rok”: pracownicy spoza archiwum z pulą roku otwartego. */
export const getCloseYearPreview = async (): Promise<CloseYearPreview> => {
  const year = await getOpenYear();
  const pools = (await q.findOpenPoolsForYear(pool, year)).filter((p) => p.role === 'employee' && !p.archived_at);
  const left = await leftDaysByUser(pools, year);
  return {
    year,
    nextYear: year + 1,
    canClose: year <= currentYear(),
    pendingRequests: await countPendingRequests(pool, year),
    rows: pools.map((p) => ({ userId: p.user_id, name: p.name, left: left.get(p.user_id) ?? 0, annualDays: p.annual_days })),
  };
};

/**
 * Zamknięcie roku otwartego: każda jego pula (także osób w archiwum) dostaje closed_at, a na następny rok powstaje
 * pula z zaległymi = wszystkie niewykorzystane dni i pulą roczną z okna (brak w oknie → jak w zamykanym roku).
 */
export const closeYear = async (input: CloseYearInput, actor: Actor): Promise<Result> => {
  return withTransaction(async (conn) => {
    const year = await getOpenYear(conn);
    if (input.year !== year) return fail(409, EMPLOYEE_MESSAGES.yearNotOpen);
    if (year > currentYear()) return fail(409, EMPLOYEE_MESSAGES.yearTooEarly);
    const pools = await q.findOpenPoolsForYear(conn, year);
    // Dni z czekających wniosków przeszłyby na następny rok podwójnie: najpierw decyzje (pule są już zablokowane).
    if ((await countPendingRequests(conn, year)) > 0) return fail(409, EMPLOYEE_MESSAGES.pendingRequests);
    const left = await leftDaysByUser(pools, year, conn);
    const typed = new Map(input.pools.map((p) => [p.userId, p.annualDays]));
    for (const p of pools) {
      const annual = typed.get(p.user_id) ?? p.annual_days;
      const carried = left.get(p.user_id) ?? 0;
      await q.closePool(conn, p.id);
      await q.upsertPool(conn, p.user_id, year + 1, annual, carried);
      await logActivity(conn, {
        userId: actor.id, userName: actor.name, entityId: p.user_id, action: 'update', entityType: 'leave_pools',
        changes: {
          closed_year: { before: null, after: year },
          ...diffChanges({ annual_days: p.annual_days, carried_days: p.carried_days }, { annual_days: annual, carried_days: carried }),
        },
      });
    }
    return { ok: true as const };
  });
};

/* Funkcje dla innych modułów (SPEC.md, „Powiązania”). */

/** Pula osoby na rok, z policzonymi dniami; administrator albo brak puli → null. */
export const getPool = async (userId: number, year: number): Promise<EmployeePool | null> => {
  const user = await q.findUser(pool, userId);
  if (!user || user.role !== 'employee') return null;
  const row = await q.findPool(pool, userId, year);
  if (!row) return null;
  const usage = (await getPoolUsage([userId], year)).get(userId) ?? NO_USAGE;
  return toPool(year, row.annual_days, row.carried_days, usage);
};

/** Typy umów do wyboru w oknie pracownika (widoczne, w ustalonej kolejności). */
export const listContractTypeOptions = async () => ({ items: await listSelectableContractTypes() });

/** Osoby spoza archiwum (np. do przypisania zadania): tylko numer i imię z nazwiskiem. */
export const listActiveUsers = async (): Promise<{ id: number; name: string }[]> => {
  return q.listActiveUsers(pool);
};
