import {
  ACTIVITY_LOG_PAGE_SIZE,
  APP_TIME_ZONE,
  CONTRACT_TYPES_PATH,
  LEAVE_TYPES_PATH,
  TASKS_PATH,
  dayjs,
  archiveEmployeesPath,
  archiveTaskPath,
  employeesSearchPath,
  leaveRequestPath,
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

/** Rekord w archiwum: przycisk „Otwórz w archiwum” (zadanie z podglądem, konto i pula z wyszukaniem po loginie). */
const archiveLinkOf = (row: q.EntryRow, record: q.FoundRecord): string | null => {
  if (row.area === 'tasks') return archiveTaskPath(row.entityId);
  if (row.area === 'users' || row.area === 'leave_pools') return archiveEmployeesPath(record.login ?? '');
  return null;
};

/** Adres przycisku „Otwórz” dla rekordu, który jest (w archiwum: adres w Archiwum). Usunięty rekord nie trafia tutaj. */
const linkOf = (row: q.EntryRow, record: q.FoundRecord): string | null => {
  if (record.archived) return archiveLinkOf(row, record);
  switch (row.area) {
    case 'leave_requests':
      return leaveRequestPath(row.entityId);
    case 'tasks':
      return record.projectId ? taskBoardPath(record.projectId, row.entityId) : TASKS_PATH;
    case 'projects':
      return taskBoardPath(row.entityId);
    case 'users':
    case 'leave_pools':
      return employeesSearchPath(record.login ?? '');
    case 'leave_types':
      return LEAVE_TYPES_PATH;
    case 'contract_types':
      return CONTRACT_TYPES_PATH;
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
