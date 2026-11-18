import type { PoolConnection } from 'mysql2/promise';
import {
  TASK_MESSAGES as M,
  taskBoardPath,
  type OrderDirection,
  type ProjectCandidate,
  type ProjectData,
  type ProjectsResponse,
} from '@app/shared';
import { logActivity } from '../../db/activityLog';
import { isDuplicateEntry } from '../../db/errors';
import { swapWithNeighbour } from '../../db/ordering';
import { pool, type Db } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { fail, notFound, type Actor, type Result, type Viewer } from '../../middleware/routeHelpers';
import { listActiveUsers } from '../employees/employees.queries';
import { notifyUsers } from '../notifications/notifications.service';
import * as q from './projects.queries';

const ENTITY = 'projects';

const nameTaken = () => fail(409, M.projectNameTaken, { fields: { name: M.projectNameTaken } });
const memberNotAllowed = () => fail(400, M.memberNotAllowed, { fields: { memberIds: M.memberNotAllowed } });

/**
 * Członkami mogą być tylko pracownicy spoza archiwum. Osoba, która już jest członkiem (`current`), może zostać,
 * nawet jeśli jej konto trafiło do archiwum, ale nie da się jej dodać od nowa.
 */
const membersAllowed = async (db: Db, memberIds: number[], current: number[]): Promise<boolean> => {
  const added = memberIds.filter((id) => !current.includes(id));
  const users = await q.findUsers(db, added);
  return added.every((id) => users.some((u) => u.id === id && u.role === 'employee' && !u.archived));
};

const notifyAdded = (conn: Db, projectId: number, name: string, userIds: number[], actor: Actor) =>
  userIds.length === 0
    ? Promise.resolve(0)
    : notifyUsers(conn, { type: 'project_added', userIds, params: { project: name }, link: taskBoardPath(projectId), actor });

/** Projekty widoczne dla osoby (menu i lista projektów), z członkami i liczbami zadań. */
export const listProjects = async (viewer: Viewer): Promise<ProjectsResponse> => {
  const projects = await q.listProjects(pool, viewer);
  const members = await q.listMembers(pool, projects.map((p) => p.id));
  return {
    items: projects.map((p) => ({
      ...p,
      members: members.filter((m) => m.projectId === p.id).map(({ projectId: _projectId, ...m }) => m),
    })),
  };
};

/** Pracownicy, których można dodać do projektu. */
export const listCandidates = async (): Promise<ProjectCandidate[]> => listActiveUsers(pool, 'employee');

/** Nowy projekt na końcu listy; członkowie dostają powiadomienie. */
export const createProject = async (data: ProjectData, actor: Actor): Promise<Result<{ id: number }>> => {
  try {
    return await withTransaction(async (conn) => {
      if (await q.findByName(conn, data.name, null)) return nameTaken();
      if (!(await membersAllowed(conn, data.memberIds, []))) return memberNotAllowed();
      const id = await q.insertProject(conn, data.name, (await q.maxPosition(conn)) + 1);
      await q.addMembers(conn, id, data.memberIds);
      await notifyAdded(conn, id, data.name, data.memberIds, actor);
      await logActivity(conn, {
        userId: actor.id,
        userName: actor.name,
        action: 'create',
        entityType: ENTITY,
        entityId: id,
        changes: { name: { before: null, after: data.name }, member_ids: { before: [], after: data.memberIds } },
      });
      return { id };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
};

/**
 * Zmiana nazwy i członków. Usunięta osoba znika z przypisań w niezrealizowanych zadaniach projektu (odpowiedź 14a),
 * nowi członkowie dostają powiadomienie.
 */
export const updateProject = async (id: number, data: ProjectData, actor: Actor): Promise<Result> => {
  try {
    return await withTransaction(async (conn) => {
      const project = await q.findProject(conn, id, { lock: true });
      if (!project) return notFound();
      if (await q.findByName(conn, data.name, id)) return nameTaken();
      const before = await q.memberIds(conn, id);
      if (!(await membersAllowed(conn, data.memberIds, before))) return memberNotAllowed();
      const removed = before.filter((m) => !data.memberIds.includes(m));
      const added = data.memberIds.filter((m) => !before.includes(m));
      if (project.name !== data.name) await q.renameProject(conn, id, data.name);
      if (removed.length > 0) {
        await q.removeMembers(conn, id, removed);
        await q.unassignOpenTasks(conn, id, removed);
      }
      await q.addMembers(conn, id, added);
      await notifyAdded(conn, id, data.name, added, actor);
      const after = [...data.memberIds].sort((a, b) => a - b);
      const changes = {
        ...(project.name !== data.name ? { name: { before: project.name, after: data.name } } : {}),
        ...(removed.length > 0 || added.length > 0 ? { member_ids: { before, after } } : {}),
      };
      if (Object.keys(changes).length > 0) {
        await logActivity(conn, { userId: actor.id, userName: actor.name, action: 'update', entityType: ENTITY, entityId: id, changes });
      }
      return { ok: true as const };
    });
  } catch (error) {
    if (isDuplicateEntry(error)) return nameTaken();
    throw error;
  }
};

/** Strzałka kolejności (ta sama kolejność w menu „Zadania”). */
export const moveProject = async (id: number, direction: OrderDirection): Promise<Result> =>
  withTransaction(async (conn) => swapWithNeighbour(conn, await q.lockProjects(conn), id, direction, q.setPosition));

/** Usunięcie na stałe razem z zadaniami (także z archiwum); trzeba podać dokładną nazwę projektu. */
export const deleteProject = async (id: number, confirmName: string, actor: Actor): Promise<Result<{ ok: true; deletedTasks: number }>> =>
  withTransaction(async (conn) => {
    const project = await q.findProject(conn, id, { lock: true });
    if (!project) return notFound();
    if (confirmName !== project.name) return fail(400, M.projectConfirmMismatch, { fields: { confirmName: M.projectConfirmMismatch } });
    const deletedTasks = await q.countAllTasks(conn, id);
    await q.deleteProject(conn, id);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'delete',
      entityType: ENTITY,
      entityId: id,
      changes: { name: { before: project.name, after: null }, deleted_tasks: { before: deletedTasks, after: 0 } },
    });
    return { ok: true as const, deletedTasks };
  });

/**
 * Dla modułu Pracownicy: administrator, który staje się pracownikiem, zostaje członkiem projektów, w których ma
 * otwarte zadania (ustalenie z 2026-11-18). Wołać w transakcji zmiany roli. Zwraca numery tych projektów.
 */
export const addMemberWhereAssigned = async (conn: PoolConnection, userId: number, actor: Actor): Promise<number[]> => {
  const projects = await q.projectsWithOpenAssignment(conn, userId);
  for (const p of projects) {
    await q.addMembers(conn, p.id, [userId]);
    await logActivity(conn, {
      userId: actor.id,
      userName: actor.name,
      action: 'update',
      entityType: ENTITY,
      entityId: p.id,
      changes: { added_member_id: { before: null, after: userId } },
    });
  }
  return projects.map((p) => p.id);
};
