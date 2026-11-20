import type { PoolConnection } from 'mysql2/promise';
import {
  CONTRACT_TYPE_MESSAGES as M,
  type ContractTypeData,
  type OrderDirection,
  type ContractTypesListResponse,
} from '@app/shared';
import { pool, type Db } from '../../db/pool';
import { swapWithNeighbour } from '../../db/ordering';
import { withTransaction } from '../../db/transaction';
import { isDuplicateEntry } from '../../db/errors';
import { diffChanges, logActivity, type Changes } from '../../db/activityLog';
import { fail, notFound, type Actor, type Result, type ServiceError } from '../../middleware/routeHelpers';
import * as q from './contract-types.queries';

const ENTITY = 'contract_types';

/** Wpis historii zmian typu (zmiana kolejności nie trafia do historii). */
const logType = (conn: PoolConnection, actor: Actor, id: number, name: string, action: string, changes: Changes) =>
  logActivity(conn, { userId: actor.id, userName: actor.name, action, entityType: ENTITY, entityId: id, entityName: name, changes });

/** Pola typu do „przed → po” (te same nazwy z wiersza bazy i z formularza). */
const fieldsOfData = (d: ContractTypeData) => ({ name: d.name });
const fieldsOfRow = (t: NonNullable<Awaited<ReturnType<typeof q.findContractType>>>) => ({ name: t.name });

const nameTaken = () => fail(409, M.nameTaken, { fields: { name: M.nameTaken } });

/** Nazwa zajęta: przez widoczny typ zwykły błąd, przez ukryty podpowiedź „Przywróć go”. */
const nameConflict = async (db: Db, name: string, exceptId: number | null): Promise<{ error: ServiceError } | null> => {
  const other = await q.findByName(db, name, exceptId);
  if (!other) return null;
  if (!other.hidden) return nameTaken();
  return fail(409, M.nameTakenHidden, { fields: { name: M.nameTakenHidden }, hiddenType: { id: other.id, name: other.name } });
};

/** Wyścig dwóch zapisów: unikalny indeks w bazie odrzuca drugi; zamieniamy to na ten sam błąd pola. */

export const listTypes = async (): Promise<ContractTypesListResponse> => ({ items: await q.listContractTypes(pool) });

/** Nowy typ na końcu widocznych. */
export const createType = async (data: ContractTypeData, actor: Actor): Promise<Result<{ id: number }>> => {
  try {
    return await withTransaction(async (conn) => {
      const conflict = await nameConflict(conn, data.name, null);
      if (conflict) return conflict;
      const position = (await q.maxPosition(conn)) + 1;
      const id = await q.insertContractType(conn, data, position);
      await logType(conn, actor, id, data.name, 'create', diffChanges({}, fieldsOfData(data)));
      return { id };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
};

/** Zmiana nazwy; pracownicy z tym typem od razu widzą nową nazwę. */
export const updateType = async (id: number, data: ContractTypeData, actor: Actor): Promise<Result> => {
  try {
    return await withTransaction(async (conn) => {
      const before = await q.findContractType(conn, id, { forUpdate: true });
      if (!before) return notFound();
      const conflict = await nameConflict(conn, data.name, id);
      if (conflict) return conflict;
      await q.updateContractType(conn, id, data);
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

/**
 * Ukrycie: znika z okna pracownika, pracownicy z tym typem go zachowują. Można ukryć także ostatni widoczny typ,
 * bo rodzaj umowy jest nieobowiązkowy.
 */
export const hideType = async (id: number, actor: Actor): Promise<Result> =>
  withTransaction(async (conn) => {
    // Tylko blokada: równoczesne „Ukryj”, „Przesuń” i „Przywróć” czekają na siebie po kolei.
    await q.lockVisible(conn);
    const type = await q.findContractType(conn, id);
    if (!type) return notFound();
    if (type.hidden) return fail(409, M.alreadyHidden);
    await q.setHidden(conn, id);
    await logType(conn, actor, id, type.name, 'hide', {});
    return { ok: true as const };
  });

/** Przywrócenie: typ wraca na koniec widocznych. */
export const unhideType = async (id: number, actor: Actor): Promise<Result> =>
  withTransaction(async (conn) => {
    const type = await q.findContractType(conn, id);
    if (!type) return notFound();
    if (!type.hidden) return fail(409, M.notHidden);
    await q.setVisible(conn, id, (await q.maxPosition(conn)) + 1);
    await logType(conn, actor, id, type.name, 'unhide', {});
    return { ok: true as const };
  });
