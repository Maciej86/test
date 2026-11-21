import type { TFunction } from 'i18next';
import type { LeaveRequestView } from '../../common/leave-request/DetailsDrawer';
import type { DecisionRequest } from '../../common/leave-request/DecisionModals';
import { leaveSplitText } from '../../common/LeaveRequestParts';
import { OPEN_YEAR, POOLS, TODAY, overlapping, poolLeft, type MockRequest } from './data';

/** „2 z puli 2026”, „4 z zaległego i 2 z puli 2026”, „nie odejmuje z puli” albo „nie liczą się do puli”. */
export const splitText = (r: MockRequest, t: TFunction) =>
  leaveSplitText(t, { status: r.status, daysFromCarried: r.fromCarried, daysFromAnnual: r.fromAnnual, poolYear: OPEN_YEAR });

/** Czekający wniosek z terminem przed dziś: można go rozpatrzyć, ale administrator powinien to widzieć. */
export const isLate = (r: MockRequest) => r.status === 'pending' && r.from < TODAY;

/** Wniosek makiety w postaci wspólnego panelu szczegółów (`common/leave-request/DetailsDrawer`). */
export const toView = (r: MockRequest, t: TFunction): LeaveRequestView => {
  const pool = POOLS[r.employee];
  const active = r.status === 'pending' || r.status === 'approved';
  return {
    id: r.id,
    employee: r.employee,
    status: r.status,
    from: r.from,
    to: r.to,
    typeLine: `${r.type}, ${t('days', { count: r.days })} (${splitText(r, t)})`,
    late: isLate(r),
    comment: r.comment,
    createdAt: r.createdAt,
    decided: r.decidedBy && r.decidedAt ? { by: r.decidedBy, at: r.decidedAt } : undefined,
    reason: r.reason,
    pool: pool && active
      ? {
          year: OPEN_YEAR,
          used: pool.used,
          pending: pool.pending,
          left: poolLeft(pool),
          total: pool.annual + pool.carried,
          carried: pool.carried,
          note: r.deducts ? t('pool_after_approve', { count: poolLeft(pool) }) : t('pool_no_deduct'),
        }
      : undefined,
  };
};

/** Wniosek makiety w oknie decyzji (`common/leave-request/DecisionModals`). */
export const toDecision = (r: MockRequest): DecisionRequest => {
  const pool = POOLS[r.employee];
  return {
    employee: r.employee,
    type: r.type,
    from: r.from,
    to: r.to,
    days: r.days,
    reserved: r.deducts ? r.fromCarried + r.fromAnnual : 0,
    late: isLate(r),
    started: r.from <= TODAY,
    othersApproved: overlapping(r).filter((o) => o.status === 'approved').map((o) => o.employee),
    poolLeft: pool ? poolLeft(pool) : undefined,
  };
};

/** Wniosek makiety w pasku „Kto jeszcze ma wtedy wolne” (`common/leave-request/TeamStrip`). */
export const toStrip = (r: MockRequest) => ({
  request: { employeeName: r.employee, dateFrom: r.from, dateTo: r.to },
  others: overlapping(r).map((o) => ({ employeeName: o.employee, dateFrom: o.from, dateTo: o.to, status: o.status })),
});
