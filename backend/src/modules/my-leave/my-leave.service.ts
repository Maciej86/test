import { todayIsoDate, type MyLeaveOverview, type MyLeaveRequestsResponse } from '@app/shared';
import { pool } from '../../db/pool';
import { findOpenPoolOfUser, type PoolRow } from '../employees/employees.queries';
import { listSelectableLeaveTypes } from '../leave-types/leave-types.queries';
import * as q from './my-leave.queries';

/** Liczby puli roku otwartego: zostało = pula + zaległe − zatwierdzone − czekające (nigdy poniżej 0). */
const poolNumbers = (row: PoolRow, usage: q.PoolUsage): MyLeaveOverview['pool'] => {
  const pendingDays = usage.pendingCarried + usage.pendingAnnual;
  return {
    year: row.year,
    annualDays: row.annual_days,
    carriedDays: row.carried_days,
    usedCarried: usage.usedCarried,
    usedAnnual: usage.usedAnnual,
    pendingDays,
    pendingCarried: usage.pendingCarried,
    leftDays: Math.max(0, row.annual_days + row.carried_days - usage.usedCarried - usage.usedAnnual - pendingDays),
    leftCarriedDays: Math.max(0, row.carried_days - usage.usedCarried - usage.pendingCarried),
  };
};

const EMPTY_USAGE: q.PoolUsage = { usedCarried: 0, usedAnnual: 0, pendingCarried: 0, pendingAnnual: 0 };

/** Ekran „Moje urlopy” (i boks na pulpicie): pula roku otwartego, limity typów, lata, zajęte terminy; bez puli → null. */
export const getMyLeaveOverview = async (userId: number): Promise<MyLeaveOverview | null> => {
  const open = await findOpenPoolOfUser(pool, userId, false);
  if (!open) return null;
  const [usage, typeUsage, types, years, busy] = await Promise.all([
    q.sumPoolUsage(pool, [userId], open.year),
    q.sumTypeUsage(pool, userId, open.year),
    listSelectableLeaveTypes(pool),
    q.listRequestYears(pool, userId),
    q.listBusy(pool, userId, open.year),
  ]);
  return {
    pool: poolNumbers(open, usage.get(userId) ?? EMPTY_USAGE),
    types: types.map((t) => ({ ...t, usedOfLimit: typeUsage.get(t.id) ?? 0 })),
    years: [...new Set([open.year, ...years])].sort((a, b) => b - a),
    busy,
  };
};

/** Wnioski osoby z wybranego roku; bez roku: rok otwarty (bez puli: bieżący rok). */
export const listMyRequests = async (userId: number, year?: number): Promise<MyLeaveRequestsResponse> => {
  const listYear = year ?? (await findOpenPoolOfUser(pool, userId, false))?.year ?? Number(todayIsoDate().slice(0, 4));
  return { year: listYear, items: await q.listRequests(pool, userId, listYear) };
};
