import {
  checkLeaveRequest,
  MY_LEAVE_MESSAGES as M,
  todayIsoDate,
  type LeaveRequestCheck,
  type LeaveRequestData,
  type MyLeaveOverview,
  type MyLeaveRequest,
  type MyLeaveRequestsResponse,
} from '@app/shared';
import { diffChanges, logActivity } from '../../db/activityLog';
import { pool } from '../../db/pool';
import { buildLeaveRequestPdf, leaveRequestPdfFileName } from '../../pdf/leaveRequestPdf';
import { renderPdf } from '../../pdf/renderPdf';
import { withTransaction } from '../../db/transaction';
import type { NewLeaveRequestEmailData } from '../../email/templates/newLeaveRequest';
import { emailAdminsAboutNewRequest } from '../../email/notifyAdmins';
import { fail, notFound, type Actor, type Result, type ServiceError } from '../../middleware/routeHelpers';
import { findOpenPoolOfUser, type PoolRow } from '../employees/employees.queries';
import { findSelectableLeaveType, listSelectableLeaveTypes } from '../leave-types/leave-types.queries';
import { notifyAdmins } from '../notifications/notifications.service';
import * as q from './my-leave.queries';

/** Gdzie administrator rozpatruje wnioski (link w powiadomieniu). */
const LEAVE_REQUESTS_LINK = '/admin/leave-requests';

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

type Refusal = Exclude<LeaveRequestCheck, { kind: 'ok' }>;

/** Powód odmowy → błąd dla ekranu: „Od” przed dziś przy polu, reszta 409 z danymi do komunikatu w ramce okna. */
const refusal = (check: Refusal, leaveType: string): { error: ServiceError } => {
  switch (check.kind) {
    case 'past_date':
      return fail(400, M.pastDate, { fields: { dateFrom: M.pastDate } });
    case 'pool_not_ready':
      return fail(409, M.poolNotReady, { year: check.year, openYear: check.openYear });
    case 'year_closed':
      return fail(409, M.yearClosed, { year: check.year });
    case 'overlap':
      return fail(409, M.overlap, { other: check.other });
    case 'no_working_days':
      return fail(409, M.noWorkingDays);
    case 'limit_exceeded':
      return fail(409, M.limitExceeded, { leaveType, limit: check.limit, used: check.used, days: check.days });
    case 'not_enough_days':
      return fail(409, M.notEnoughDays, { days: check.days, left: check.left, pending: check.pending });
  }
};

/** Wyślij e-mail bez czekania; błąd wysyłki nie zmienia odpowiedzi (wniosek jest już zapisany). */
const emailInBackground = (data: NewLeaveRequestEmailData) => {
  void emailAdminsAboutNewRequest(data).catch((error: unknown) => console.error('email failed', { requestId: data.requestId }, error));
};

/**
 * Złożenie wniosku. Serwer liczy wszystko sam pod blokadą puli tej osoby (dwa wnioski wysłane naraz liczą się po
 * kolei): dni robocze, podział (najpierw zaległe), rok puli, status. Powiadomienie i historia w tej samej transakcji,
 * e-mail po zapisie.
 */
export const createRequest = async (input: LeaveRequestData, actor: Actor): Promise<Result<MyLeaveRequest>> => {
  let email: NewLeaveRequestEmailData | null = null;
  const result = await withTransaction(async (conn): Promise<Result<MyLeaveRequest>> => {
    const open = await findOpenPoolOfUser(conn, actor.id, true);
    if (!open) return fail(404, M.noPool);
    const type = await findSelectableLeaveType(input.leaveTypeId, conn);
    if (!type) return fail(400, M.typeUnavailable, { fields: { leaveTypeId: M.typeUnavailable } });

    const [usageByUser, typeUsage, busy] = await Promise.all([
      q.sumPoolUsage(conn, [actor.id], open.year),
      q.sumTypeUsage(conn, actor.id, open.year),
      q.listBusy(conn, actor.id, open.year),
    ]);
    const usage = usageByUser.get(actor.id) ?? EMPTY_USAGE;
    const check = checkLeaveRequest(
      { type: { ...type, usedOfLimit: typeUsage.get(type.id) ?? 0 }, dateFrom: input.dateFrom, dateTo: input.dateTo, today: todayIsoDate() },
      { poolYear: open.year, annualDays: open.annual_days, carriedDays: open.carried_days, ...usage, busy },
    );
    if (check.kind !== 'ok') return refusal(check, type.name);

    const row: q.NewRequestRow = {
      userId: actor.id,
      leaveTypeId: type.id,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      workingDays: check.workingDays,
      daysFromCarried: check.fromCarried,
      daysFromAnnual: check.fromAnnual,
      poolYear: open.year,
      comment: input.comment,
    };
    const id = await q.insertRequest(conn, row);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'create',
      entityType: 'leave_requests',
      entityId: id,
      changes: diffChanges({}, {
        leave_type: type.name,
        date_from: row.dateFrom,
        date_to: row.dateTo,
        working_days: row.workingDays,
        days_from_carried: row.daysFromCarried,
        days_from_annual: row.daysFromAnnual,
      }),
    });
    await notifyAdmins(conn, {
      type: 'leave_request_new',
      params: { employee: actor.name, leaveType: type.name, dateFrom: row.dateFrom, dateTo: row.dateTo, days: row.workingDays },
      link: LEAVE_REQUESTS_LINK,
      actor,
    });
    email = {
      requestId: id,
      employeeName: actor.name,
      leaveTypeName: type.name,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      workingDays: row.workingDays,
      daysFromCarried: row.daysFromCarried,
      daysFromAnnual: row.daysFromAnnual,
      leftAfter: check.leftAfter,
      comment: row.comment,
    };
    const saved = await q.findOwnRequest(conn, id, actor.id);
    return q.toRequest(saved!);
  });
  if (email) emailInBackground(email);
  return result;
};

/** Wycofanie własnego wniosku, który czeka na decyzję; dni wracają do puli (wniosek przestaje się liczyć). */
export const withdrawRequest = async (id: number, actor: Actor): Promise<Result> =>
  withTransaction(async (conn) => {
    const request = await q.findOwnRequest(conn, id, actor.id);
    if (!request) return notFound();
    if (request.status !== 'pending') return fail(409, M.notPending);
    // Warunek statusu w samym UPDATE: drugie wycofanie wysłane naraz nic już nie zmieni.
    if ((await q.setWithdrawn(conn, id, actor.id)) === 0) return fail(409, M.notPending);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'status',
      entityType: 'leave_requests',
      entityId: id,
      changes: diffChanges({ status: request.status }, { status: 'withdrawn' }),
    });
    await notifyAdmins(conn, {
      type: 'leave_request_withdrawn',
      params: { employee: actor.name, leaveType: request.leave_type_name, dateFrom: request.date_from, dateTo: request.date_to },
      link: LEAVE_REQUESTS_LINK,
      actor,
    });
    return { ok: true as const };
  });

/** PDF własnego zatwierdzonego wniosku (do wydruku i podpisu); cudzy albo brak → 404, inny status → 409. */
export const getRequestPdf = async (id: number, userId: number): Promise<Result<{ fileName: string; pdf: Buffer }>> => {
  const row = await q.findOwnRequestForPdf(pool, id, userId);
  if (!row) return notFound();
  if (row.status !== 'approved') return fail(409, M.notApproved);
  const pdf = await renderPdf(
    buildLeaveRequestPdf({
      id: row.id,
      createdAt: row.created_at.toISOString(),
      employeeName: row.employee_name,
      leaveTypeName: row.leave_type_name,
      deductsPool: Boolean(row.deducts_pool),
      dateFrom: row.date_from,
      dateTo: row.date_to,
      workingDays: row.working_days,
      daysFromCarried: row.days_from_carried,
      daysFromAnnual: row.days_from_annual,
      poolYear: row.pool_year,
      comment: row.comment,
      decidedByName: row.decided_by_name,
      decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
    }),
  );
  return { fileName: leaveRequestPdfFileName(row.id), pdf };
};
