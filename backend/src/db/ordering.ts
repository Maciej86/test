import type { OrderDirection } from '@app/shared';
import { notFound, type Result } from '../middleware/routeHelpers';
import type { Db } from './pool';

/**
 * Strzałka kolejności: zamiana pozycji z sąsiadem w `rows` (już posortowanych i zablokowanych `FOR UPDATE`;
 * pozycje mogą mieć luki). Pierwszy w górę i ostatni w dół: bez zmian.
 */
export const swapWithNeighbour = async (
  db: Db,
  rows: { id: number; position: number }[],
  id: number,
  direction: OrderDirection,
  setPosition: (db: Db, id: number, position: number) => Promise<void>,
): Promise<Result> => {
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return notFound();
  const neighbour = rows[direction === 'up' ? index - 1 : index + 1];
  if (!neighbour) return { ok: true };
  await setPosition(db, id, neighbour.position);
  await setPosition(db, neighbour.id, rows[index]!.position);
  return { ok: true };
};
