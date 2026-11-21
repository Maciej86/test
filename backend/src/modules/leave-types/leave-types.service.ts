import type { PoolConnection } from 'mysql2/promise';
import {
  LEAVE_TYPE_MESSAGES as M,
  type LeaveTypeData,
  type OrderDirection,
  type LeaveTypesListResponse,
} from '@app/shared';
import { pool, type Db } from '../../db/pool';
import { swapWithNeighbour } from '../../db/ordering';
import { withTransaction } from '../../db/transaction';
import { isDuplicateEntry } from '../../db/errors';
import { diffChanges, logActivity, type Changes } from '../../db/activityLog';
import { fail, notFound, type Actor, type Result, type ServiceError } from '../../middleware/routeHelpers';
import { countRequestsByLeaveType } from '../my-leave/my-leave.queries';
import * as q from './leave-types.queries';

const ENTITY = 'leave_types';

/** Wpis historii zmian typu (zmiana kolejności nie trafia do historii). */
const logType = (conn: PoolConnection, actor: Actor, id: number, name: string, action: string, changes: Changes) =>
  logActivity(conn, { userId: actor.id, userName: actor.name, action, entityType: ENTITY, entityId: id, entityName: name, changes });

/** Pola typu do „przed → po” (te same nazwy z wiersza bazy i z formularza). */
const fieldsOfData = (d: LeaveTypeData) => ({
  name: d.name,
  deducts_pool: d.deductsPool,
  yearly_limit: d.yearlyLimit,
  color: d.color,
  day_count: d.dayCount,
  requires_approval: d.requiresApproval,
});
const fieldsOfRow = (t: NonNullable<Awaited<ReturnType<typeof q.findLeaveType>>>) => ({
  name: t.name,
  deducts_pool: Boolean(t.deducts_pool),
  yearly_limit: t.yearly_limit,
  color: t.color,
  day_count: t.day_count,
  requires_approval: Boolean(t.requires_approval),
});

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
export const createType = async (data: LeaveTypeData, actor: Actor): Promise<Result<{ id: number }>> => {
  try {
    return await withTransaction(async (conn) => {
      const conflict = await nameConflict(conn, data.name, null);
      if (conflict) return conflict;
      const position = (await q.maxPosition(conn)) + 1;
      const id = await q.insertLeaveType(conn, data, position);
      await logType(conn, actor, id, data.name, 'create', diffChanges({}, fieldsOfData(data)));
      return { id };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
};

/** Zmiana nazwy i zasad; złożonych wniosków nie przelicza (ustalenie 2a). */
export const updateType = async (id: number, data: LeaveTypeData, actor: Actor): Promise<Result> => {
  try {
    return await withTransaction(async (conn) => {
      const before = await q.findLeaveType(conn, id, { lock: true });
      if (!before) return notFound();
      const conflict = await nameConflict(conn, data.name, id);
      if (conflict) return conflict;
      await q.updateLeaveType(conn, id, data);
      const changes = diffChanges(fieldsOfRow(before), fieldsOfData(data));
      if (Object.keys(changes).length > 0) await logType(conn, actor, id, data.name, 'update', changes);
      return { ok: true as const };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
};

/** Strzałka: zamiana pozycji z sąsiednim widocznym typem (pozycje mogą mieć luki po ukryciu). */
export const moveType = async (id: number, direction: OrderDirection): Promise<Result> =>
  withTransaction(async (conn) => {
    const visible = await q.lockVisible(conn);
    return swapWithNeighbour(conn, visible, id, direction, q.setPosition);
  });

/** Ukrycie: znika z formularza nowego wniosku; zawsze zostaje co najmniej jeden widoczny typ. */
export const hideType = async (id: number, actor: Actor): Promise<Result> =>
  withTransaction(async (conn) => {
    // Najpierw blokada widocznych: drugie równoczesne „Ukryj” czeka i widzi już wynik pierwszego.
    const visible = await q.lockVisible(conn);
    const type = await q.findLeaveType(conn, id);
    if (!type) return notFound();
    if (type.hidden_at !== null) return fail(409, M.alreadyHidden);
    if (visible.length <= 1) return fail(409, M.lastVisible);
    await q.setHidden(conn, id);
    await logType(conn, actor, id, type.name, 'hide', {});
    return { ok: true as const };
  });

/** Przywrócenie: typ wraca na koniec widocznych. */
export const unhideType = async (id: number, actor: Actor): Promise<Result> =>
  withTransaction(async (conn) => {
    const type = await q.findLeaveType(conn, id);
    if (!type) return notFound();
    if (type.hidden_at === null) return fail(409, M.notHidden);
    await q.setVisible(conn, id, (await q.maxPosition(conn)) + 1);
    await logType(conn, actor, id, type.name, 'unhide', {});
    return { ok: true as const };
  });
