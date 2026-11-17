import {
  LEAVE_REQUESTS_MESSAGES as M,
  currentYear,
  type LeaveRequestDetails,
  type LeaveRequestListItem,
  type LeaveRequestStatus,
  type LeaveRequestsListQuery,
  type LeaveRequestsListResponse,
  type NotificationType,
} from '@app/shared';
import { PAGE_SIZE } from '../../config/constants';
import { diffChanges, logActivity } from '../../db/activityLog';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { fail, notFound, type Actor, type Result, type ServiceError } from '../../middleware/routeHelpers';
import type { PoolRow } from '../employees/employees.queries';
import { getPoolUsage, type PoolUsageDays } from '../employees/employees.service';
import { listLeaveTypes } from '../leave-types/leave-types.queries';
import { notifyUsers } from '../notifications/notifications.service';
import { buildLeaveRequestPdf, leaveRequestPdfFileName } from '../../pdf/leaveRequestPdf';
import { findRequestForPdf, toPdfData } from '../../pdf/leaveRequestPdfData';
import { renderPdf } from '../../pdf/renderPdf';
import * as q from './leave-requests.queries';

/** Pula z liczbami: dni do wykorzystania = pula + zaległe − zatwierdzone − czekające (jak w „Moich urlopach”). */
const poolNumbers = (p: PoolRow, usage: PoolUsageDays) => {
  const total = p.annual_days + p.carried_days;
  return { year: p.year, annualDays: p.annual_days, carriedDays: p.carried_days, used: usage.usedDays, pending: usage.pendingDays, left: Math.max(0, total - usage.usedDays - usage.pendingDays), total };
};

/** Liczby otwartych pul osób; pule w różnych latach liczone osobno dla każdego roku. */
const openPoolNumbers = async (userIds: number[]) => {
  const pools = await q.findOpenPools(pool, [...new Set(userIds)]);
  const byYear = new Map<number, number[]>();
  for (const p of pools.values()) byYear.set(p.year, [...(byYear.get(p.year) ?? []), p.user_id]);
  const numbers = new Map<number, ReturnType<typeof poolNumbers>>();
  for (const [year, ids] of byYear) {
    const usage = await getPoolUsage(ids, year);
    for (const id of ids) numbers.set(id, poolNumbers(pools.get(id)!, usage.get(id)!));
  }
  return numbers;
};

/**
 * Wiersz dla ekranu. Anulować można zatwierdzony wniosek z roku, który nie jest zamknięty: lata od najstarszego
 * otwartego w górę są otwarte (rok zamyka się po kolei w „Zamknij rok”).
 */
const toListItem = (r: q.RequestItem, open: ReturnType<typeof poolNumbers> | undefined): LeaveRequestListItem => {
  const { userId: _userId, ...item } = r;
  return {
    ...item,
    poolLeft: open ? { left: open.left, total: open.total } : null,
    canCancel: r.status === 'approved' && open !== undefined && r.poolYear >= open.year,
  };
};

export const listLeaveRequests = async (query: LeaveRequestsListQuery): Promise<LeaveRequestsListResponse> => {
  const year = query.year ?? currentYear();
  const { rows, total } = await q.listRequests(pool, { status: query.status, year, leaveTypeId: query.leaveTypeId, search: query.search, page: query.page });
  const open = await openPoolNumbers(rows.map((r) => r.userId));
  const [summary, years, types] = await Promise.all([q.pendingSummary(pool), q.listRequestYears(pool), listLeaveTypes(pool)]);
  return {
    items: rows.map((r) => toListItem(r, open.get(r.userId))),
    total,
    page: query.page,
    pageSize: PAGE_SIZE,
    pendingCount: summary.count,
    oldestPendingAt: summary.oldestAt,
    years: [...new Set([currentYear(), ...years])].sort((a, b) => b - a),
    leaveTypes: types.map((t) => ({ id: t.id, name: t.name })),
  };
};

const isActive = (status: LeaveRequestStatus) => status === 'pending' || status === 'approved';

export const getLeaveRequest = async (id: number): Promise<Result<LeaveRequestDetails>> => {
  const r = await q.findRequest(pool, id);
  if (!r) return notFound();
  const open = (await openPoolNumbers([r.userId])).get(r.userId);
  const others = isActive(r.status) ? await q.listOverlapping(pool, { userId: r.userId, dateFrom: r.dateFrom, dateTo: r.dateTo }) : [];
  // Boks puli tylko dla roku wniosku, gdy jest otwarty (najstarszy otwarty rok osoby).
  const showPool = isActive(r.status) && open !== undefined && open.year === r.poolYear;
  const poolBox = showPool
    ? { year: open.year, annualDays: open.annualDays, carriedDays: open.carriedDays, used: open.used, pending: open.pending, left: open.left }
    : null;
  return { ...toListItem(r, open), pool: poolBox, others };
};

type Decision = { from: LeaveRequestStatus; to: LeaveRequestStatus; type: NotificationType; reason: string | null };

const alreadyDecided = (r: q.RequestItem): { error: ServiceError } =>
  fail(409, M.alreadyDecided, { current: r.status, decidedByName: r.decidedByName });

/**
 * Decyzja w transakcji: blokada wiersza wniosku, sprawdzenie statusu, zmiana z warunkiem statusu, historia zmian
 * i powiadomienie pracownika. Drugi administrator (albo wycofanie) w tej samej chwili dostaje 409 `already_decided`.
 */
const decide = (id: number, actor: Actor, d: Decision, extraCheck?: (conn: q.Db, r: q.RequestItem) => Promise<{ error: ServiceError } | null>): Promise<Result> =>
  withTransaction(async (conn) => {
    const r = await q.findRequest(conn, id, { lock: true });
    if (!r) return notFound();
    if (r.status !== d.from) {
      if (d.from === 'approved' && r.status !== 'cancelled') return fail(409, M.notApproved);
      return alreadyDecided(r);
    }
    const refused = extraCheck ? await extraCheck(conn, r) : null;
    if (refused) return refused;
    if ((await q.setDecision(conn, id, { from: d.from, to: d.to, actor, reason: d.reason })) === 0) return alreadyDecided(r);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'status',
      entityType: 'leave_requests',
      entityId: id,
      changes: diffChanges(
        { status: d.from, ...(d.reason !== null ? { decision_reason: r.decisionReason } : {}) },
        { status: d.to, ...(d.reason !== null ? { decision_reason: d.reason } : {}) },
      ),
    });
    await notifyUsers(conn, {
      type: d.type,
      userIds: [r.userId],
      params: { leaveType: r.leaveTypeName, dateFrom: r.dateFrom, dateTo: r.dateTo, ...(d.reason !== null ? { reason: d.reason } : {}) },
      link: `/admin/my-leave?year=${r.poolYear}`,
      actor,
    });
    return { ok: true as const };
  });

export const approveRequest = (id: number, actor: Actor): Promise<Result> =>
  decide(id, actor, { from: 'pending', to: 'approved', type: 'leave_approved', reason: null });

export const rejectRequest = (id: number, reason: string, actor: Actor): Promise<Result> =>
  decide(id, actor, { from: 'pending', to: 'rejected', type: 'leave_rejected', reason });

/** Anulowanie zatwierdzonego urlopu, dopóki pula roku wniosku nie jest zamknięta (dni wracają do puli). */
export const cancelRequest = (id: number, reason: string, actor: Actor): Promise<Result> =>
  decide(id, actor, { from: 'approved', to: 'cancelled', type: 'leave_cancelled', reason }, async (conn, r) =>
    (await q.isPoolOpen(conn, r.userId, r.poolYear)) ? null : fail(409, M.yearClosed, { year: r.poolYear }),
  );

/** PDF dowolnego zatwierdzonego wniosku (ten sam dokument co w „Moich urlopach”). */
export const getLeaveRequestPdf = async (id: number): Promise<Result<{ fileName: string; pdf: Buffer }>> => {
  const row = await findRequestForPdf(pool, id);
  if (!row) return notFound();
  if (row.status !== 'approved') return fail(409, M.notApproved);
  return { fileName: leaveRequestPdfFileName(row.id), pdf: await renderPdf(buildLeaveRequestPdf(toPdfData(row))) };
};
