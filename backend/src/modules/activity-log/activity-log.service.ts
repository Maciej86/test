import {
  ACTIVITY_LOG_PAGE_SIZE,
  APP_TIME_ZONE,
  TASKS_PATH,
  dayjs,
  taskBoardPath,
  type ActivityChange,
  type ActivityLogItem,
  type ActivityLogListResponse,
  type ActivityLogPerson,
  type ActivityLogQuery,
} from '@app/shared';
import { pool } from '../../db/pool';
import * as q from './activity-log.queries';

/** Pola zmian z numerami osób; serwer oddaje w nich imiona (null = konto usunięte). */
const PERSON_FIELDS = ['assignee_ids', 'member_ids', 'added_member_id'] as const;
const isPersonField = (field: string) => (PERSON_FIELDS as readonly string[]).includes(field);

const personIds = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : typeof value === 'number' ? [value] : [];

const toNames = (value: unknown, names: Map<number, string>): unknown => {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'number' ? names.get(v) ?? null : v));
  return typeof value === 'number' ? names.get(value) ?? null : value;
};

const withNames = (changes: Record<string, ActivityChange>, names: Map<number, string>): Record<string, ActivityChange> =>
  Object.fromEntries(
    Object.entries(changes).map(([field, c]) =>
      isPersonField(field) ? [field, { before: toNames(c.before, names), after: toNames(c.after, names) }] : [field, c],
    ),
  );

/** Adres przycisku „Otwórz” dla rekordu, który jest (w archiwum i usunięty: brak). */
const linkOf = (row: q.EntryRow, record: q.FoundRecord): string | null => {
  if (record.archived) return null;
  switch (row.area) {
    case 'leave_requests':
      return `/admin/leave-requests/${row.entityId}`;
    case 'tasks':
      return record.projectId ? taskBoardPath(record.projectId, row.entityId) : TASKS_PATH;
    case 'projects':
      return taskBoardPath(row.entityId);
    case 'users':
    case 'leave_pools':
      return `/admin/employees?search=${encodeURIComponent(record.login ?? '')}`;
    case 'leave_types':
      return '/admin/leave-types';
    case 'contract_types':
      return '/admin/contract-types';
    default:
      return null;
  }
};

/** Początek dnia RRRR-MM-DD w strefie aplikacji, jako chwila UTC (jak `created_at`). */
const dayStart = (day: string, plusDays = 0): Date => dayjs.tz(day, APP_TIME_ZONE).add(plusDays, 'day').toDate();

/** Strona dziennika z ustalonym stanem rekordu, adresem „Otwórz” i imionami osób w zmianach. */
export const getList = async (query: ActivityLogQuery): Promise<ActivityLogListResponse> => {
  const { rows, total } = await q.listEntries(pool, {
    page: query.page,
    pageSize: ACTIVITY_LOG_PAGE_SIZE,
    search: query.search,
    area: query.area,
    userId: query.userId,
    fromAt: query.from ? dayStart(query.from) : undefined,
    toAt: query.to ? dayStart(query.to, 1) : undefined,
  });
  const records = await q.findRecords(pool, rows.map((r) => ({ area: r.area, id: r.entityId })));
  const ids = new Set<number>();
  for (const r of rows) {
    for (const [field, c] of Object.entries(r.changes)) {
      if (isPersonField(field)) [...personIds(c.before), ...personIds(c.after)].forEach((id) => ids.add(id));
    }
  }
  const names = await q.userNames(pool, [...ids]);
  const items: ActivityLogItem[] = rows.map((r) => {
    const record = records.get(`${r.area}:${r.entityId}`);
    return {
      ...r,
      changes: withNames(r.changes, names),
      state: !record ? 'deleted' : record.archived ? 'archived' : 'exists',
      link: record ? linkOf(r, record) : null,
    };
  });
  return { items, total, page: query.page, pageSize: ACTIVITY_LOG_PAGE_SIZE };
};

export const getPeople = (): Promise<ActivityLogPerson[]> => q.listPeople(pool);
