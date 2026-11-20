import { z } from 'zod';
import { ACTIVITY_AREAS, ACTIVITY_LOG_MESSAGES as M, type ActivityArea, type ActivityState } from '../constants/activityLog';
import { addressNumber } from './fields';
import { listQuerySchema, type ListResponse } from './list';

const listBase = listQuerySchema(['created_at']).pick({ page: true, search: true });
/** Dzień z adresu; zły (np. 30.02) jest pomijany jak inne złe parametry listy. */
const optionalDay = z.iso.date().optional().catch(undefined);

/**
 * Filtry historii zmian z adresu: `?page=2&search=kowal&area=tasks&userId=7&from=2026-11-01&to=2026-11-20`
 * (front i GET /api/activity-log). Kolejność stała: najnowsze na górze. Daty włącznie; „do” przed „od” to błąd
 * pola `to` (serwer: 400, adres: filtr pominięty).
 */
export const activityLogQuerySchema = listBase
  .extend({
    area: z.enum(ACTIVITY_AREAS).optional().catch(undefined),
    userId: addressNumber.optional().catch(undefined),
    from: optionalDay,
    to: optionalDay,
  })
  .superRefine((v, ctx) => {
    if (v.from && v.to && v.to < v.from) ctx.addIssue({ code: 'custom', path: ['to'], message: M.datesOrder });
  });

export type ActivityLogQuery = z.output<typeof activityLogQuerySchema>;

/** Para „przed → po”; osoby (`assignee_ids`, `member_ids`, `added_member_id`) serwer oddaje już jako imiona. */
export interface ActivityChange {
  before: unknown;
  after: unknown;
}

/** Jeden wpis historii z API. `link`: adres przycisku „Otwórz” (rekord w archiwum: adres w Archiwum) albo null (usunięty). */
export interface ActivityLogItem {
  id: number;
  createdAt: string;
  userName: string;
  area: ActivityArea;
  action: string;
  entityId: number;
  entityName: string;
  /** Dane do krótkiego opisu, np. `{ project: 'Marketing' }`; zdanie z `context.<obszar>` w activity-log.json. */
  entityContext: Record<string, string | number> | null;
  changes: Record<string, ActivityChange>;
  state: ActivityState;
  link: string | null;
}

export type ActivityLogListResponse = ListResponse<ActivityLogItem>;

/** Osoba z filtra „Kto zmienił” (GET /api/activity-log/people). */
export interface ActivityLogPerson {
  userId: number;
  userName: string;
}
