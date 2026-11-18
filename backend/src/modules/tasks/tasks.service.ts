import {
  TASK_HIDE_DONE_AFTER_DAYS,
  TASK_LEAVE_LOOKAHEAD_DAYS,
  dayjs,
  ISO_DATE_FORMAT,
  todayIsoDate,
  type BoardResponse,
  type BoardTask,
  type TaskLeave,
} from '@app/shared';
import { pool } from '../../db/pool';
import { notFound, type Result, type Viewer } from '../../middleware/routeHelpers';
import { listApprovedLeaves } from '../leave-requests/leave-requests.queries';
import * as q from './tasks.queries';

/** Do kiedy szukać urlopów przy zadaniu: termin, a bez terminu dziś + 14 dni; zrealizowane i po terminie: wcale. */
const leaveUntil = (task: q.TaskRow, today: string): string | null => {
  if (task.column === 'done') return null;
  const until = task.dueDate ?? dayjs(today).add(TASK_LEAVE_LOOKAHEAD_DAYS, 'day').format(ISO_DATE_FORMAT);
  return until < today ? null : until;
};

/**
 * Tablica projektu dla osoby, która go widzi (inaczej 404). Zrealizowane starsze niż 30 dni tylko z `includeOldDone`.
 * Przy otwartych zadaniach zatwierdzone urlopy przypisanych osób przed terminem (powiązanie z Wnioskami urlopowymi).
 */
export const getBoard = async (projectId: number, viewer: Viewer, includeOldDone: boolean): Promise<Result<BoardResponse>> => {
  const project = await q.findVisibleProject(pool, projectId, viewer);
  if (!project) return notFound();
  // W UTC: zmiana czasu letniego nie przesuwa granicy o godzinę.
  const doneSince = dayjs().utc().subtract(TASK_HIDE_DONE_AFTER_DAYS, 'day').toDate();
  const [people, rows, oldDoneCount] = await Promise.all([
    q.boardPeople(pool, projectId),
    q.boardTasks(pool, projectId, { includeOldDone, doneSince }),
    includeOldDone ? Promise.resolve(0) : q.countOldDone(pool, projectId, doneSince),
  ]);
  const assignees = await q.assigneesOf(pool, rows.map((t) => t.id));

  const today = todayIsoDate();
  const ranges = rows.map((t) => ({ task: t, until: leaveUntil(t, today), ids: assignees.get(t.id) ?? [] }));
  const withLeaves = ranges.filter((r) => r.until !== null && r.ids.length > 0);
  const leaveUserIds = [...new Set(withLeaves.flatMap((r) => r.ids))].sort((a, b) => a - b);
  const lastDay = withLeaves.reduce((max, r) => (r.until! > max ? r.until! : max), today);
  const leaves: TaskLeave[] = leaveUserIds.length === 0 ? [] : await listApprovedLeaves(pool, leaveUserIds, today, lastDay);

  const tasks: BoardTask[] = ranges.map(({ task, until, ids }) => {
    const { projectId: _projectId, ...rest } = task;
    return {
      ...rest,
      assigneeIds: ids,
      leaves: until === null ? [] : leaves.filter((l) => ids.includes(l.userId) && l.dateFrom <= until && l.dateTo >= today),
    };
  });
  return { project, people, tasks, oldDoneCount };
};
