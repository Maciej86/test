import {
  LEAVE_TYPE_MESSAGES as M,
  type LeaveTypeData,
  type LeaveTypeDirection,
  type LeaveTypesListResponse,
} from '@app/shared';
import { pool, type Db } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { isDuplicateEntry } from '../../db/errors';
import { fail, notFound, type Result, type ServiceError } from '../../middleware/routeHelpers';
import { countRequestsByLeaveType } from '../my-leave/my-leave.queries';
import * as q from './leave-types.queries';

const nameTaken = () => fail(409, M.nameTaken, { fields: { name: M.nameTaken } });

/** Nazwa zajęta: przez widoczny typ zwykły błąd, przez ukryty podpowiedź „Przywróć go”. */
const nameConflict = async (db: Db, name: string, exceptId: number | null): Promise<{ error: ServiceError } | null> => {
  const other = await q.findByName(db, name, exceptId);
  if (!other) return null;
  if (!other.hidden) return nameTaken();
  return fail(409, M.nameTakenHidden, { fields: { name: M.nameTakenHidden }, hiddenType: { id: other.id, name: other.name } });
};

/** Wyścig dwóch zapisów: unikalny indeks w bazie odrzuca drugi; zamieniamy to na ten sam błąd pola. */

/** Lista typów z liczbą wniosków (z modułu Moje urlopy, wszystkie statusy). */
export const listTypes = async (): Promise<LeaveTypesListResponse> => {
  const [items, counts] = await Promise.all([q.listLeaveTypes(pool), countRequestsByLeaveType(pool)]);
  return { items: items.map((item) => ({ ...item, requestsCount: counts.get(item.id) ?? 0 })) };
};

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
    if (isDuplicateEntry(error)) return nameTaken();
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
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
  return { ok: true };
};

/** Strzałka: zamiana pozycji z sąsiednim widocznym typem (pozycje mogą mieć luki po ukryciu). */
export const moveType = async (id: number, direction: LeaveTypeDirection): Promise<Result> =>
  withTransaction(async (conn) => {
    const visible = await q.lockVisible(conn);
    const index = visible.findIndex((v) => v.id === id);
    if (index === -1) return notFound();
    const neighbour = visible[direction === 'up' ? index - 1 : index + 1];
    if (!neighbour) return { ok: true as const };
    await q.setPosition(conn, id, neighbour.position);
    await q.setPosition(conn, neighbour.id, visible[index]!.position);
    return { ok: true as const };
  });

/** Ukrycie: znika z formularza nowego wniosku; zawsze zostaje co najmniej jeden widoczny typ. */
export const hideType = async (id: number): Promise<Result> =>
  withTransaction(async (conn) => {
    // Najpierw blokada widocznych: drugie równoczesne „Ukryj” czeka i widzi już wynik pierwszego.
    const visible = await q.lockVisible(conn);
    const type = await q.findLeaveType(conn, id);
    if (!type) return notFound();
    if (type.hidden_at !== null) return fail(409, M.alreadyHidden);
    if (visible.length <= 1) return fail(409, M.lastVisible);
    await q.setHidden(conn, id);
    return { ok: true as const };
  });

/** Przywrócenie: typ wraca na koniec widocznych. */
export const unhideType = async (id: number): Promise<Result> =>
  withTransaction(async (conn) => {
    const type = await q.findLeaveType(conn, id);
    if (!type) return notFound();
    if (type.hidden_at === null) return fail(409, M.notHidden);
    await q.setVisible(conn, id, (await q.maxPosition(conn)) + 1);
    return { ok: true as const };
  });
