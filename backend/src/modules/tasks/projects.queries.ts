import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Role } from '@app/shared';
import type { Db } from '../../db/pool';
import type { Viewer } from '../../middleware/routeHelpers';

/** Projekty widoczne dla osoby: administrator wszystkie, pracownik tylko te, do których należy (warunek w SQL). */
export const listProjects = async (
  db: Db,
  viewer: Viewer,
): Promise<{ id: number; name: string; position: number; createdAt: string; openCount: number; doneCount: number; archivedCount: number }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.position, p.created_at,
       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.archived_at IS NULL AND t.column_key <> 'done') AS open_count,
       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.archived_at IS NULL AND t.column_key = 'done') AS done_count,
       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.archived_at IS NOT NULL) AS archived_count
     FROM projects p
     WHERE ? = 'admin' OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
     ORDER BY p.position`,
    [viewer.role, viewer.id],
  );
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    position: r.position as number,
    createdAt: r.created_at as string,
    openCount: Number(r.open_count),
    doneCount: Number(r.done_count),
    archivedCount: Number(r.archived_count),
  }));
};

/** Członkowie projektów z liczbą ich otwartych zadań w danym projekcie (ostrzeżenie przy usuwaniu z projektu). */
export const listMembers = async (
  db: Db,
  projectIds: number[],
): Promise<{ projectId: number; id: number; name: string; archived: boolean; openTasks: number }[]> => {
  if (projectIds.length === 0) return [];
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT pm.project_id, u.id AS user_id, u.name, u.archived_at,
       (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
        WHERE ta.user_id = u.id AND t.project_id = pm.project_id AND t.column_key <> 'done' AND t.archived_at IS NULL) AS open_tasks
     FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id IN (?) ORDER BY u.last_name, u.first_name`,
    [projectIds],
  );
  return rows.map((r) => ({
    projectId: r.project_id as number,
    id: r.user_id as number,
    name: r.name as string,
    archived: r.archived_at !== null,
    openTasks: Number(r.open_tasks),
  }));
};

export const findProject = async (db: Db, id: number, opts: { lock?: boolean } = {}): Promise<{ id: number; name: string; position: number } | null> => {
  const sql = opts.lock ? 'SELECT id, name, position FROM projects WHERE id = ? FOR UPDATE' : 'SELECT id, name, position FROM projects WHERE id = ?';
  const [rows] = await db.query<RowDataPacket[]>(sql, [id]);
  const r = rows[0];
  return r ? { id: r.id as number, name: r.name as string, position: r.position as number } : null;
};

/** Projekt o tej nazwie (bez wielkości liter: porównanie utf8mb4_polish_ci), inny niż `exceptId`. */
export const findByName = async (db: Db, name: string, exceptId: number | null): Promise<{ id: number } | null> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM projects WHERE name = ? AND (? IS NULL OR id <> ?) LIMIT 1', [name, exceptId, exceptId]);
  return rows[0] ? { id: rows[0].id as number } : null;
};

export const maxPosition = async (db: Db): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COALESCE(MAX(position), 0) AS max_position FROM projects');
  return Number(rows[0]?.max_position ?? 0);
};

export const insertProject = async (db: Db, name: string, position: number): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>('INSERT INTO projects (name, position) VALUES (?, ?)', [name, position]);
  return result.insertId;
};

export const renameProject = async (db: Db, id: number, name: string): Promise<void> => {
  await db.query('UPDATE projects SET name = ? WHERE id = ?', [name, id]);
};

/** Wszystkie projekty w kolejności, zablokowane do zmiany kolejności strzałkami. */
export const lockProjects = async (db: Db): Promise<{ id: number; position: number }[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, position FROM projects ORDER BY position FOR UPDATE');
  return rows.map((r) => ({ id: r.id as number, position: r.position as number }));
};

export const setPosition = async (db: Db, id: number, position: number): Promise<void> => {
  await db.query('UPDATE projects SET position = ? WHERE id = ?', [position, id]);
};

export const memberIds = async (db: Db, projectId: number): Promise<number[]> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM project_members WHERE project_id = ? ORDER BY user_id', [projectId]);
  return rows.map((r) => r.user_id as number);
};

export const addMembers = async (db: Db, projectId: number, userIds: number[]): Promise<void> => {
  if (userIds.length === 0) return;
  await db.query('INSERT IGNORE INTO project_members (project_id, user_id) VALUES ?', [userIds.map((id) => [projectId, id])]);
};

export const removeMembers = async (db: Db, projectId: number, userIds: number[]): Promise<void> => {
  if (userIds.length === 0) return;
  await db.query('DELETE FROM project_members WHERE project_id = ? AND user_id IN (?)', [projectId, userIds]);
};

/** Osoby usunięte z projektu znikają z przypisań w jego niezrealizowanych zadaniach (także tych w archiwum). */
export const unassignOpenTasks = async (db: Db, projectId: number, userIds: number[]): Promise<void> => {
  if (userIds.length === 0) return;
  await db.query(
    `DELETE ta FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
     WHERE t.project_id = ? AND t.column_key <> 'done' AND ta.user_id IN (?)`,
    [projectId, userIds],
  );
};

/** Wszystkie zadania projektu, także w archiwum (tyle zniknie przy usunięciu projektu). */
export const countAllTasks = async (db: Db, projectId: number): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM tasks WHERE project_id = ?', [projectId]);
  return Number(rows[0]?.total ?? 0);
};

/** Usunięcie na stałe; zadania, przypisania i członkostwa znikają przez ON DELETE CASCADE. */
export const deleteProject = async (db: Db, id: number): Promise<void> => {
  await db.query('DELETE FROM projects WHERE id = ?', [id]);
};

/** Rola i archiwum wybranych osób (sprawdzenie członków i przypisanych). */
export const findUsers = async (db: Db, ids: number[]): Promise<{ id: number; role: Role; archived: boolean }[]> => {
  if (ids.length === 0) return [];
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, role, archived_at FROM users WHERE id IN (?)', [ids]);
  return rows.map((r) => ({ id: r.id as number, role: r.role as Role, archived: r.archived_at !== null }));
};

/** Projekty, w których osoba ma przypisane otwarte zadanie, a nie jest członkiem. */
export const projectsWithOpenAssignment = async (db: Db, userId: number): Promise<{ id: number; name: string }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT p.id, p.name FROM projects p
     JOIN tasks t ON t.project_id = p.id
     JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = ?
     WHERE t.column_key <> 'done' AND t.archived_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
     ORDER BY p.position`,
    [userId, userId],
  );
  return rows.map((r) => ({ id: r.id as number, name: r.name as string }));
};
