import {
  TASK_MESSAGES as M,
  TASK_HIDE_DONE_AFTER_DAYS,
  TASK_FORM_LEAVE_DAYS,
  TASK_LEAVE_LOOKAHEAD_DAYS,
  dayjs,
  ISO_DATE_FORMAT,
  todayIsoDate,
  type BoardResponse,
  type BoardTask,
  type TaskColumn,
  type TaskData,
  type TaskLeave,
  type TaskMoveInput,
  taskBoardPath,
} from '@app/shared';
import type { PoolConnection } from 'mysql2/promise';
import { diffChanges, logActivity } from '../../db/activityLog';
import { withTransaction } from '../../db/transaction';
import { notifyUsers } from '../notifications/notifications.service';
import { pool } from '../../db/pool';
import { fail, notFound, type Result, type Viewer } from '../../middleware/routeHelpers';
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
  // Jedno zapytanie: urlopy osób z tablicy i przypisanych, od dziś do najdalszego terminu (co najmniej 180 dni).
  const formUntil = dayjs(today).add(TASK_FORM_LEAVE_DAYS, 'day').format(ISO_DATE_FORMAT);
  const lastDay = ranges.reduce((max, r) => (r.until !== null && r.until > max ? r.until : max), formUntil);
  const leaveUserIds = [...new Set([...people.map((p) => p.id), ...ranges.flatMap((r) => r.ids)])].sort((a, b) => a - b);
  const leaves: TaskLeave[] = leaveUserIds.length === 0 ? [] : await listApprovedLeaves(pool, leaveUserIds, today, lastDay);
  const peopleIds = new Set(people.map((p) => p.id));

  const tasks: BoardTask[] = ranges.map(({ task, until, ids }) => {
    const { projectId: _projectId, ...rest } = task;
    return {
      ...rest,
      assigneeIds: ids,
      leaves: until === null ? [] : leaves.filter((l) => ids.includes(l.userId) && l.dateFrom <= until && l.dateTo >= today),
    };
  });
  return { project, people, tasks, oldDoneCount, leaves: leaves.filter((l) => peopleIds.has(l.userId) && l.dateFrom <= formUntil) };
};

const ENTITY = 'tasks';

const assigneeNotAllowed = () => fail(400, M.assigneeNotAllowed, { fields: { assigneeIds: M.assigneeNotAllowed } });

/** Przypisać można osoby z `assignable` na tablicy; już przypisane (`current`) mogą zostać, nawet gdy przestały spełniać warunek. */
const assigneesAllowed = async (conn: PoolConnection, projectId: number, ids: number[], current: number[]): Promise<boolean> => {
  const added = ids.filter((id) => !current.includes(id));
  if (added.length === 0) return true;
  const people = await q.boardPeople(conn, projectId);
  return added.every((id) => people.some((p) => p.id === id && p.assignable));
};

/** Data realizacji po zmianie kolumny: wejście do „Zrealizowane” = teraz, wyjście = brak, bez zmiany kolumny = bez zmian. */
const completedAtFor = (from: TaskColumn | null, to: TaskColumn, current: string | null): Date | null => {
  if (to !== 'done') return null;
  if (from === 'done' && current) return new Date(current);
  return new Date();
};

const notifyAssigned = (conn: PoolConnection, projectId: number, taskId: number, data: TaskData, userIds: number[], viewer: Viewer) =>
  userIds.length === 0
    ? Promise.resolve(0)
    : notifyUsers(conn, {
        type: 'task_assigned',
        userIds,
        params: { task: data.title, ...(data.dueDate ? { dueDate: data.dueDate } : {}) },
        link: taskBoardPath(projectId, taskId),
        actor: { id: viewer.id, name: viewer.name },
      });

/**
 * Zadanie do zapisu: najpierw blokada projektu (jedna kolejność blokad dla wszystkich zapisów), potem zadanie
 * przeczytane od nowa pod blokadą. Niewidoczne, w archiwum albo projekt usunięty w międzyczasie: null.
 */
const lockTaskForWrite = async (conn: PoolConnection, taskId: number, viewer: Viewer): Promise<q.TaskRow | null> => {
  const seen = await q.findTask(conn, taskId, viewer);
  if (!seen || !(await q.lockProject(conn, seen.projectId))) return null;
  return q.findTask(conn, taskId, viewer, { lock: true });
};

/** Nowe zadanie na górze wybranej kolumny; przypisani dostają powiadomienie. */
export const createTask = async (projectId: number, data: TaskData, viewer: Viewer): Promise<Result<{ id: number }>> =>
  withTransaction(async (conn) => {
    const project = await q.findVisibleProject(conn, projectId, viewer);
    if (!project || !(await q.lockProject(conn, projectId))) return notFound();
    if (!(await assigneesAllowed(conn, projectId, data.assigneeIds, []))) return assigneeNotAllowed();
    const columnIds = await q.columnTaskIds(conn, projectId, data.column);
    const id = await q.insertTask(conn, {
      projectId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      column: data.column,
      completedAt: completedAtFor(null, data.column, null),
      createdBy: viewer.id,
      createdByName: viewer.name,
    });
    await q.setPositions(conn, [id, ...columnIds]);
    await q.setAssignees(conn, id, data.assigneeIds);
    await notifyAssigned(conn, projectId, id, data, data.assigneeIds, viewer);
    await logActivity(conn, {
      userId: viewer.id,
      userName: viewer.name,
      action: 'create',
      entityType: ENTITY,
      entityId: id,
      changes: diffChanges({}, { title: data.title, due_date: data.dueDate, column_key: data.column, assignee_ids: data.assigneeIds }),
    });
    return { id };
  });

/** Przeniesienie do innej kolumny: karta na wskazane miejsce w nowej, stara kolumna numerowana od nowa. */
const changeColumn = async (conn: PoolConnection, task: q.TaskRow, column: TaskColumn, newOrder: number[]) => {
  await q.setColumn(conn, task.id, column, completedAtFor(task.column, column, task.completedAt));
  await q.setPositions(conn, newOrder);
  await q.setPositions(conn, (await q.columnTaskIds(conn, task.projectId, task.column)).filter((id) => id !== task.id));
};

/** Zmiana zadania z podglądu; zmiana kolumny stawia kartę na górze nowej kolumny. */
export const updateTask = async (taskId: number, data: TaskData, viewer: Viewer): Promise<Result> =>
  withTransaction(async (conn) => {
    const task = await lockTaskForWrite(conn, taskId, viewer);
    if (!task) return notFound();
    const before = (await q.assigneesOf(conn, [taskId])).get(taskId) ?? [];
    if (!(await assigneesAllowed(conn, task.projectId, data.assigneeIds, before))) return assigneeNotAllowed();
    await q.updateTask(conn, taskId, { title: data.title, description: data.description, dueDate: data.dueDate });
    if (data.column !== task.column) {
      const target = (await q.columnTaskIds(conn, task.projectId, data.column)).filter((id) => id !== taskId);
      await changeColumn(conn, task, data.column, [taskId, ...target]);
    }
    const sameAssignees = before.length === data.assigneeIds.length && before.every((id) => data.assigneeIds.includes(id));
    if (!sameAssignees) await q.setAssignees(conn, taskId, data.assigneeIds);
    await notifyAssigned(conn, task.projectId, taskId, data, data.assigneeIds.filter((id) => !before.includes(id)), viewer);
    const changes = diffChanges(
      { title: task.title, description: task.description, due_date: task.dueDate, column_key: task.column, assignee_ids: before },
      { title: data.title, description: data.description, due_date: data.dueDate, column_key: data.column, assignee_ids: sameAssignees ? before : data.assigneeIds },
    );
    if (Object.keys(changes).length > 0) {
      await logActivity(conn, { userId: viewer.id, userName: viewer.name, action: 'update', entityType: ENTITY, entityId: taskId, changes });
    }
    return { ok: true as const };
  });

/** Przeciągnięcie karty: przed wskazaną kartę tej samej kolumny docelowej albo na jej koniec. */
export const moveTask = async (taskId: number, move: TaskMoveInput, viewer: Viewer): Promise<Result> =>
  withTransaction(async (conn) => {
    const task = await lockTaskForWrite(conn, taskId, viewer);
    if (!task) return notFound();
    const target = (await q.columnTaskIds(conn, task.projectId, move.column)).filter((id) => id !== taskId);
    const index = move.beforeTaskId === null ? target.length : target.indexOf(move.beforeTaskId);
    if (index === -1) return fail(400, M.beforeTaskInvalid);
    const order = [...target.slice(0, index), taskId, ...target.slice(index)];
    if (move.column === task.column) {
      await q.setPositions(conn, order);
      return { ok: true as const };
    }
    await changeColumn(conn, task, move.column, order);
    await logActivity(conn, {
      userId: viewer.id,
      userName: viewer.name,
      action: 'status',
      entityType: ENTITY,
      entityId: taskId,
      changes: { column_key: { before: task.column, after: move.column } },
    });
    return { ok: true as const };
  });

/** „Usuń” na tablicy: zadanie trafia do archiwum. */
export const archiveTask = async (taskId: number, viewer: Viewer): Promise<Result> =>
  withTransaction(async (conn) => {
    const task = await lockTaskForWrite(conn, taskId, viewer);
    if (!task) return notFound();
    await q.archiveTask(conn, taskId, viewer.id);
    await logActivity(conn, { userId: viewer.id, userName: viewer.name, action: 'archive', entityType: ENTITY, entityId: taskId, changes: {} });
    return { ok: true as const };
  });

/** Znacznik „Zakończone”: karta zostaje w kolumnie, wyszarzona; ponowne oznaczenie zostawia pierwszą datę. */
export const finishTask = async (taskId: number, finished: boolean, viewer: Viewer): Promise<Result> =>
  withTransaction(async (conn) => {
    const task = await lockTaskForWrite(conn, taskId, viewer);
    if (!task) return notFound();
    const at = finished ? (task.finishedAt ? new Date(task.finishedAt) : new Date()) : null;
    await q.setFinished(conn, taskId, at);
    if (Boolean(task.finishedAt) !== finished) {
      await logActivity(conn, {
        userId: viewer.id,
        userName: viewer.name,
        action: 'status',
        entityType: ENTITY,
        entityId: taskId,
        changes: { finished: { before: Boolean(task.finishedAt), after: finished } },
      });
    }
    return { ok: true as const };
  });
