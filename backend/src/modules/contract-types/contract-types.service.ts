import {
  CONTRACT_TYPE_MESSAGES as M,
  type ContractTypeData,
  type ContractTypeDirection,
  type ContractTypesListResponse,
} from '@app/shared';
import { pool, type Db } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { isDuplicateEntry } from '../../db/errors';
import { fail, notFound, type Result, type ServiceError } from '../../middleware/routeHelpers';
import * as q from './contract-types.queries';

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
export const createType = async (data: ContractTypeData): Promise<Result<{ id: number }>> => {
  try {
    return await withTransaction(async (conn) => {
      const conflict = await nameConflict(conn, data.name, null);
      if (conflict) return conflict;
      const position = (await q.maxPosition(conn)) + 1;
      return { id: await q.insertContractType(conn, data, position) };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
};

/** Zmiana nazwy; pracownicy z tym typem od razu widzą nową nazwę. */
export const updateType = async (id: number, data: ContractTypeData): Promise<Result> => {
  if (!(await q.findContractType(pool, id))) return notFound();
  const conflict = await nameConflict(pool, data.name, id);
  if (conflict) return conflict;
  try {
    await q.updateContractType(pool, id, data);
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
  return { ok: true };
};

/** Strzałka: zamiana pozycji z sąsiednim widocznym typem (pozycje mogą mieć luki po ukryciu). */
export const moveType = async (id: number, direction: ContractTypeDirection): Promise<Result> =>
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

/**
 * Ukrycie: znika z okna pracownika, pracownicy z tym typem go zachowują. Można ukryć także ostatni widoczny typ,
 * bo rodzaj umowy jest nieobowiązkowy.
 */
export const hideType = async (id: number): Promise<Result> =>
  withTransaction(async (conn) => {
    // Tylko blokada: równoczesne „Ukryj”, „Przesuń” i „Przywróć” czekają na siebie po kolei.
    await q.lockVisible(conn);
    const type = await q.findContractType(conn, id);
    if (!type) return notFound();
    if (type.hidden) return fail(409, M.alreadyHidden);
    await q.setHidden(conn, id);
    return { ok: true as const };
  });

/** Przywrócenie: typ wraca na koniec widocznych. */
export const unhideType = async (id: number): Promise<Result> =>
  withTransaction(async (conn) => {
    const type = await q.findContractType(conn, id);
    if (!type) return notFound();
    if (!type.hidden) return fail(409, M.notHidden);
    await q.setVisible(conn, id, (await q.maxPosition(conn)) + 1);
    return { ok: true as const };
  });
