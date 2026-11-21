import {
  leaveRequestPath,
  canWithdrawRequest,
  checkLeaveRequest,
  MY_LEAVE_MESSAGES as M,
  currentYear,
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
import { findRequestForPdf, toPdfData } from '../../pdf/leaveRequestPdfData';
import { renderPdf } from '../../pdf/renderPdf';
import { withTransaction } from '../../db/transaction';
import type { NewLeaveRequestEmailData } from '../../email/templates/newLeaveRequest';
import { emailAdminsAboutNewRequest } from '../../email/notifyAdmins';
import { fail, notFound, type Actor, type Result, type ServiceError } from '../../middleware/routeHelpers';
import { findOpenPoolOfUser, type PoolRow } from '../employees/employees.queries';
import { findSelectableLeaveType, listSelectableLeaveTypes } from '../leave-types/leave-types.queries';
import { notifyAdmins } from '../notifications/notifications.service';
import * as q from './my-leave.queries';

/** Szczegóły wniosku u administratora (link w powiadomieniu; ten sam adres co w e-mailu). */

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

/** Wniosek dla ekranu: czy pracownik może go jeszcze wycofać, liczy serwer (`canWithdrawRequest`). */
const withCanWithdraw = (r: q.StoredRequest, today: string): MyLeaveRequest => ({ ...r, canWithdraw: canWithdrawRequest(r, today) });

/** Wnioski osoby z wybranego roku; bez roku: rok otwarty (bez puli: bieżący rok). */
export const listMyRequests = async (userId: number, year?: number): Promise<MyLeaveRequestsResponse> => {
  const listYear = year ?? (await findOpenPoolOfUser(pool, userId, false))?.year ?? currentYear();
  const today = todayIsoDate();
  const items = await q.listRequests(pool, userId, listYear);
  return { year: listYear, items: items.map((r) => withCanWithdraw(r, today)) };
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
 * kolei): dni (sposobem z typu), podział (najpierw zaległe), rok puli, status. Typ bez zatwierdzania: wniosek od razu
 * zatwierdzony, administratorzy dostają „Zgłoszona nieobecność”. Powiadomienie i historia w tej samej transakcji,
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
    const today = todayIsoDate();
    const check = checkLeaveRequest(
      { type: { ...type, usedOfLimit: typeUsage.get(type.id) ?? 0 }, dateFrom: input.dateFrom, dateTo: input.dateTo, today },
      { poolYear: open.year, annualDays: open.annual_days, carriedDays: open.carried_days, ...usage, busy },
    );
    if (check.kind !== 'ok') return refusal(check, type.name);

    const row: q.NewRequestRow = {
      userId: actor.id,
      leaveTypeId: type.id,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      dayCount: check.dayCount,
      workingDays: check.workingDays,
      daysFromCarried: check.fromCarried,
      daysFromAnnual: check.fromAnnual,
      poolYear: open.year,
      comment: input.comment,
      autoApproved: !type.requiresApproval,
    };
    const id = await q.insertRequest(conn, row);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'create',
      entityType: 'leave_requests',
      entityId: id,
      entityName: actor.name,
      entityContext: { leaveType: type.name, from: row.dateFrom, to: row.dateTo, days: row.workingDays },
      changes: diffChanges({}, {
        leave_type: type.name,
        date_from: row.dateFrom,
        date_to: row.dateTo,
        working_days: row.workingDays,
        days_from_carried: row.daysFromCarried,
        days_from_annual: row.daysFromAnnual,
        // Tylko to, co odbiega od zwykłego wniosku: dni kalendarzowe i zatwierdzenie bez decyzji.
        ...(row.dayCount === 'calendar' ? { day_count: row.dayCount } : {}),
        ...(row.autoApproved ? { status: 'approved', auto_approved: true } : {}),
      }),
    });
    await notifyAdmins(conn, {
      type: row.autoApproved ? 'leave_absence_reported' : 'leave_request_new',
      params: { employee: actor.name, leaveType: type.name, dateFrom: row.dateFrom, dateTo: row.dateTo, days: row.workingDays, dayCount: row.dayCount },
      link: leaveRequestPath(id),
      actor,
    });
    email = {
      requestId: id,
      employeeName: actor.name,
      leaveTypeName: type.name,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      workingDays: row.workingDays,
      dayCount: row.dayCount,
      autoApproved: row.autoApproved,
      daysFromCarried: row.daysFromCarried,
      daysFromAnnual: row.daysFromAnnual,
      leftAfter: check.leftAfter,
      comment: row.comment,
    };
    const saved = await q.findOwnRequest(conn, id, actor.id);
    return withCanWithdraw(q.toRequest(saved!), today);
  });
  if (email) emailInBackground(email);
  return result;
};

/**
 * Wycofanie własnego wniosku: czekającego albo zatwierdzonego automatycznie, póki wolno (`canWithdrawRequest`: do
 * pierwszego dnia albo w dniu złożenia); dni wracają do puli (wniosek przestaje się liczyć).
 */
export const withdrawRequest = async (id: number, actor: Actor): Promise<Result> =>
  withTransaction(async (conn) => {
    const request = await q.findOwnRequest(conn, id, actor.id);
    if (!request) return notFound();
    const state = { status: request.status, autoApproved: Boolean(request.auto_approved), dateFrom: request.date_from, createdAt: request.created_at };
    if (!canWithdrawRequest(state, todayIsoDate())) return fail(409, M.cannotWithdraw);
    // Warunek statusu w samym UPDATE: drugie wycofanie wysłane naraz nic już nie zmieni.
    if ((await q.setWithdrawn(conn, id, actor.id, request.status)) === 0) return fail(409, M.cannotWithdraw);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'status',
      entityType: 'leave_requests',
      entityId: id,
      entityName: actor.name,
      entityContext: { leaveType: request.leave_type_name, from: request.date_from, to: request.date_to, days: request.working_days },
      changes: diffChanges({ status: request.status }, { status: 'withdrawn' }),
    });
    await notifyAdmins(conn, {
      type: 'leave_request_withdrawn',
      params: { employee: actor.name, leaveType: request.leave_type_name, dateFrom: request.date_from, dateTo: request.date_to },
      link: leaveRequestPath(id),
      actor,
    });
    return { ok: true as const };
  });

/** PDF własnego zatwierdzonego wniosku (do wydruku i podpisu); cudzy albo brak → 404, inny status → 409. */
export const getRequestPdf = async (id: number, userId: number): Promise<Result<{ fileName: string; pdf: Buffer }>> => {
  const row = await findRequestForPdf(pool, id, userId);
  if (!row) return notFound();
  if (row.status !== 'approved') return fail(409, M.notApproved);
  const pdf = await renderPdf(buildLeaveRequestPdf(toPdfData(row)));
  return { fileName: leaveRequestPdfFileName(row.id), pdf };
};
