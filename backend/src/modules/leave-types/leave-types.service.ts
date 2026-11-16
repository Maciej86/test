import { LEAVE_TYPE_MESSAGES as M, SERVER_MESSAGES, type LeaveTypeData, type LeaveTypesListResponse } from '@app/shared';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { fail, type Result, type ServiceError } from '../../middleware/routeHelpers';
import * as q from './leave-types.queries';

const notFound = () => fail(404, SERVER_MESSAGES.notFound);
const nameTaken = () => fail(409, M.nameTaken, { fields: { name: M.nameTaken } });

/** Nazwa zajęta: przez widoczny typ zwykły błąd, przez ukryty podpowiedź „Przywróć go”. */
const nameConflict = async (db: q.Db, name: string, exceptId: number | null): Promise<{ error: ServiceError } | null> => {
  const other = await q.findByName(db, name, exceptId);
  if (!other) return null;
  if (!other.hidden) return nameTaken();
  return fail(409, M.nameTakenHidden, { fields: { name: M.nameTakenHidden }, hiddenType: { id: other.id, name: other.name } });
};

/** Wyścig dwóch zapisów: unikalny indeks w bazie odrzuca drugi; zamieniamy to na ten sam błąd pola. */
const isDuplicate = (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'ER_DUP_ENTRY';

export const listTypes = async (): Promise<LeaveTypesListResponse> => ({ items: await q.listLeaveTypes(pool) });

/** Nowy typ na końcu widocznych. */
export const createType = async (data: LeaveTypeData): Promise<Result<{ id: number }>> => {
  try {
    return await withTransaction(async (conn) => {
      const conflict = await nameConflict(conn, data.name, null);
      if (conflict) return conflict;
      const position = (await q.maxPosition(conn)) + 1;
      return { id: await q.insertLeaveType(conn, data, position) };
    });
  } catch (error) {
    if (isDuplicate(error)) return nameTaken();
    throw error;
  }
};

/** Zmiana nazwy i zasad; złożonych wniosków nie przelicza (ustalenie 2a). */
export const updateType = async (id: number, data: LeaveTypeData): Promise<Result> => {
  if (!(await q.findLeaveType(pool, id))) return notFound();
  const conflict = await nameConflict(pool, data.name, id);
  if (conflict) return conflict;
  try {
    await q.updateLeaveType(pool, id, data);
  } catch (error) {
    if (isDuplicate(error)) return nameTaken();
    throw error;
  }
  return { ok: true };
};
