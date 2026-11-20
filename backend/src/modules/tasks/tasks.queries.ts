import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { BoardPerson, Role, TaskColumn } from '@app/shared';
import type { Db } from '../../db/pool';
import { likePattern } from '../../db/like';
import type { Viewer } from '../../middleware/routeHelpers';

/** Zadanie z bazy (bez przypisanych osób i urlopów). */
export interface TaskRow {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  column: TaskColumn;
  position: number;
  completedAt: string | null;
  finishedAt: string | null;
  createdByName: string;
  createdAt: string;
}

const toTask = (r: RowDataPacket): TaskRow => ({
  id: r.id as number,
  projectId: r.project_id as number,
  title: r.title as string,
  description: (r.description as string | null) ?? null,
  dueDate: (r.due_date as string | null) ?? null,
  column: r.column_key as TaskColumn,
  position: r.position as number,
  completedAt: r.completed_at ? new Date(r.completed_at as string).toISOString() : null,
  finishedAt: r.finished_at ? new Date(r.finished_at as string).toISOString() : null,
  createdByName: r.created_by_name as string,
  createdAt: new Date(r.created_at as string).toISOString(),
});

const TASK_COLUMNS_SQL = 't.id, t.project_id, t.title, t.description, t.due_date, t.column_key, t.position, t.completed_at, t.finished_at, t.created_by_name, t.created_at';

/** Projekt, który osoba widzi: administrator każdy, pracownik tylko swój (warunek w SQL); inaczej null. */
export const findVisibleProject = async (db: Db, id: number, viewer: Viewer): Promise<{ id: number; name: string } | null> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.name FROM projects p
     WHERE p.id = ? AND (? = 'admin' OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))`,
    [id, viewer.role, viewer.id],
  );
  return rows[0] ? { id: rows[0].id as number, name: rows[0].name as string } : null;
};

/**
 * Osoby na tablicy: aktywni administratorzy, członkowie projektu i osoby przypisane do jego zadań (także z archiwum
 * albo spoza projektu). `assignable` = konto aktywne i (administrator albo członek).
 */
export const boardPeople = async (db: Db, projectId: number): Promise<BoardPerson[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.role, u.archived_at,
       EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = u.id) AS is_member
     FROM users u
     WHERE (u.role = 'admin' AND u.archived_at IS NULL)
        OR u.id IN (SELECT user_id FROM project_members WHERE project_id = ?)
        OR u.id IN (SELECT ta.user_id FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id WHERE t.project_id = ? AND t.archived_at IS NULL)
     ORDER BY u.last_name, u.first_name`,
    [projectId, projectId, projectId],
  );
  return rows.map((r) => {
    const archived = r.archived_at !== null;
    const role = r.role as Role;
    return { id: r.id as number, name: r.name as string, role, archived, assignable: !archived && (role === 'admin' || Boolean(r.is_member)) };
  });
};

/** Zadania tablicy bez archiwum; zrealizowane przed `doneSince` tylko z `includeOldDone`. */
export const boardTasks = async (db: Db, projectId: number, opts: { includeOldDone: boolean; doneSince: Date }): Promise<TaskRow[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ${TASK_COLUMNS_SQL} FROM tasks t
     WHERE t.project_id = ? AND t.archived_at IS NULL AND (t.column_key <> 'done' OR ? OR t.completed_at >= ?)
     ORDER BY FIELD(t.column_key, 'draft', 'in_progress', 'done'), t.position`, // rule-ok: wstawiona tylko stała lista kolumn TASK_COLUMNS_SQL z tego pliku, dane idą przez ?
    [projectId, opts.includeOldDone, opts.doneSince],
  );
  return rows.map(toTask);
};

/** Ile zrealizowanych jest schowanych (starszych niż `doneSince`). */
export const countOldDone = async (db: Db, projectId: number, doneSince: Date): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM tasks WHERE project_id = ? AND archived_at IS NULL AND column_key = 'done' AND completed_at < ?",
    [projectId, doneSince],
  );
  return Number(rows[0]?.total ?? 0);
};

/** Przypisane osoby każdego z zadań. */
export const assigneesOf = async (db: Db, taskIds: number[]): Promise<Map<number, number[]>> => {
  const map = new Map<number, number[]>();
  if (taskIds.length === 0) return map;
  const [rows] = await db.query<RowDataPacket[]>('SELECT task_id, user_id FROM task_assignees WHERE task_id IN (?) ORDER BY task_id, user_id', [taskIds]);
  for (const r of rows) map.set(r.task_id as number, [...(map.get(r.task_id as number) ?? []), r.user_id as number]);
  return map;
};

/** Zadanie (bez archiwum) z projektu, który osoba widzi; `lock` blokuje wiersz do końca transakcji. */
export const findTask = async (db: Db, id: number, viewer: Viewer, opts: { lock?: boolean } = {}): Promise<TaskRow | null> => {
  const sql = `SELECT ${TASK_COLUMNS_SQL} FROM tasks t
     WHERE t.id = ? AND t.archived_at IS NULL AND (? = 'admin' OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = ?))`;
  const [rows] = await db.query<RowDataPacket[]>(opts.lock ? `${sql} FOR UPDATE` : sql, [id, viewer.role, viewer.id]); // rule-ok: wstawiona tylko stała lista kolumn i stałe FOR UPDATE z tego pliku, dane idą przez ?
  return rows[0] ? toTask(rows[0]) : null;
};

/** Zadania kolumny (bez archiwum) w kolejności, zablokowane: dwa przeciągnięcia naraz czekają na siebie. */
export const columnTaskIds = async (db: Db, projectId: number, column: TaskColumn): Promise<number[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM tasks WHERE project_id = ? AND column_key = ? AND archived_at IS NULL ORDER BY position, id FOR UPDATE',
    [projectId, column],
  );
  return rows.map((r) => r.id as number);
};

/** Pozycje 1..n w podanej kolejności (bez dziur i powtórzeń). */
export const setPositions = async (db: Db, ids: number[]): Promise<void> => {
  for (const [index, id] of ids.entries()) await db.query('UPDATE tasks SET position = ? WHERE id = ?', [index + 1, id]);
};

export const insertTask = async (
  db: Db,
  t: { projectId: number; title: string; description: string | null; dueDate: string | null; column: TaskColumn; completedAt: Date | null; createdBy: number; createdByName: string },
): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO tasks (project_id, title, description, due_date, column_key, position, completed_at, created_by, created_by_name)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [t.projectId, t.title, t.description, t.dueDate, t.column, t.completedAt, t.createdBy, t.createdByName],
  );
  return result.insertId;
};

export const updateTask = async (db: Db, id: number, t: { title: string; description: string | null; dueDate: string | null }): Promise<void> => {
  await db.query('UPDATE tasks SET title = ?, description = ?, due_date = ? WHERE id = ?', [t.title, t.description, t.dueDate, id]);
};

/** Nowa kolumna i data realizacji (liczy usługa: wejście do „Zrealizowane” = teraz, wyjście = brak). */
export const setColumn = async (db: Db, id: number, column: TaskColumn, completedAt: Date | null): Promise<void> => {
  await db.query('UPDATE tasks SET column_key = ?, completed_at = ? WHERE id = ?', [column, completedAt, id]);
};

export const setAssignees = async (db: Db, taskId: number, userIds: number[]): Promise<void> => {
  await db.query('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);
  if (userIds.length === 0) return;
  await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES ?', [userIds.map((id) => [taskId, id])]);
};

/** „Usuń” na tablicy: do archiwum (przywraca administrator w module Archiwum). */
export const archiveTask = async (db: Db, id: number, byUserId: number): Promise<void> => {
  await db.query('UPDATE tasks SET archived_at = NOW(), archived_by = ? WHERE id = ?', [byUserId, id]);
};

/**
 * Blokada projektu na czas zapisu zadania. Każdy zapis zadań (dodanie, zmiana, przeniesienie, archiwum) i usunięcie
 * projektu blokuje najpierw projekt, więc dwa zapisy w tym samym projekcie czekają na siebie zamiast się zakleszczyć.
 * Daje nazwę projektu (do historii zmian); projekt usunięty w międzyczasie: null.
 */
export const lockProject = async (db: Db, projectId: number): Promise<string | null> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id, name FROM projects WHERE id = ? FOR UPDATE', [projectId]);
  return rows[0] ? (rows[0].name as string) : null;
};

/** Znacznik „Zakończone”: data albo brak (cofnięcie). */
export const setFinished = async (db: Db, id: number, at: Date | null): Promise<void> => {
  await db.query('UPDATE tasks SET finished_at = ? WHERE id = ?', [at, id]);
};

/** Liczba zadań (także w archiwum), do których osoba jest przypisana: kolumna „Historia” w Archiwum. */
export const countAssignmentsByUser = async (db: Db, userIds: number[]): Promise<Map<number, number>> => {
  if (userIds.length === 0) return new Map();
  const [rows] = await db.query<RowDataPacket[]>('SELECT user_id, COUNT(*) AS total FROM task_assignees WHERE user_id IN (?) GROUP BY user_id', [userIds]);
  return new Map(rows.map((r) => [Number(r.user_id), Number(r.total)]));
};

/* ---------- Archiwum (moduł Archiwum używa tych funkcji przez tasks.service.ts) ---------- */

/** Zadanie z projektem i tym, kto je przeniósł do archiwum; `archived` = czy jest w archiwum. */
export interface AnyTaskRow {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  projectName: string;
  column: TaskColumn;
  dueDate: string | null;
  archivedAt: string | null;
  archivedByName: string | null;
  archived: boolean;
}

const ANY_TASK_SQL = `SELECT t.id, t.title, t.description, t.project_id, p.name AS project_name, t.column_key, t.due_date, t.archived_at,
       a.name AS archived_by_name
     FROM tasks t JOIN projects p ON p.id = t.project_id LEFT JOIN users a ON a.id = t.archived_by`;

const toAnyTask = (r: RowDataPacket): AnyTaskRow => ({
  id: r.id as number,
  title: r.title as string,
  description: (r.description as string | null) ?? null,
  projectId: r.project_id as number,
  projectName: r.project_name as string,
  column: r.column_key as TaskColumn,
  dueDate: (r.due_date as string | null) ?? null,
  archivedAt: r.archived_at ? new Date(r.archived_at as string).toISOString() : null,
  archivedByName: (r.archived_by_name as string | null) ?? null,
  archived: r.archived_at !== null && r.archived_at !== undefined,
});

/** Zadania w archiwum, najnowsze w archiwum na górze; szukanie po tytule, filtr projektu. */
export const listArchivedTasks = async (
  db: Db,
  q: { search: string; projectId?: number; page: number; pageSize: number },
): Promise<{ rows: AnyTaskRow[]; total: number }> => {
  const where = ['t.archived_at IS NOT NULL'];
  const params: unknown[] = [];
  if (q.search) {
    where.push('t.title LIKE ?');
    params.push(likePattern(q.search));
  }
  if (q.projectId !== undefined) {
    where.push('t.project_id = ?');
    params.push(q.projectId);
  }
  const [rows] = await db.query<RowDataPacket[]>(
    `${ANY_TASK_SQL} WHERE ${where.join(' AND ')} ORDER BY t.archived_at DESC, t.id DESC LIMIT ? OFFSET ?`, // rule-ok: stała lista kolumn, WHERE z gotowych kawałków z ?
    [...params, q.pageSize, (q.page - 1) * q.pageSize],
  );
  const [count] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM tasks t WHERE ${where.join(' AND ')}`, params); // rule-ok: WHERE z gotowych kawałków z ?
  return { rows: rows.map(toAnyTask), total: Number(count[0]?.total ?? 0) };
};

/** Projekty, które mają zadania w archiwum (pole wyboru projektu w Archiwum). */
export const archivedTaskProjects = async (db: Db): Promise<{ id: number; name: string }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT p.id, p.name FROM projects p WHERE EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.archived_at IS NOT NULL) ORDER BY p.name',
  );
  return rows.map((r) => ({ id: r.id as number, name: r.name as string }));
};

export const countArchivedTasks = async (db: Db): Promise<number> => {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM tasks WHERE archived_at IS NOT NULL');
  return Number(rows[0]?.total ?? 0);
};

/** Zadanie w archiwum albo poza nim (Archiwum sprawdza stan samo); `lock` blokuje wiersz zadania. */
export const findAnyTask = async (db: Db, id: number, opts: { lock?: boolean } = {}): Promise<AnyTaskRow | null> => {
  const sql = `${ANY_TASK_SQL} WHERE t.id = ?`;
  const [rows] = await db.query<RowDataPacket[]>(opts.lock ? `${sql} FOR UPDATE OF t` : sql, [id]); // rule-ok: stała lista kolumn i stałe FOR UPDATE, dane idą przez ?
  return rows[0] ? toAnyTask(rows[0]) : null;
};

/** Przypisane osoby zadania z imieniem i znacznikiem archiwum, po nazwisku. */
export const assigneeNames = async (db: Db, taskId: number): Promise<{ name: string; archived: boolean }[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT u.name, u.archived_at FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ? ORDER BY u.last_name, u.first_name',
    [taskId],
  );
  return rows.map((r) => ({ name: r.name as string, archived: r.archived_at !== null }));
};

export const restoreTask = async (db: Db, id: number): Promise<void> => {
  await db.query('UPDATE tasks SET archived_at = NULL, archived_by = NULL WHERE id = ?', [id]);
};

/** Usunięcie na stałe; komentarze i przypisania znikają razem z zadaniem (CASCADE). */
export const deleteTask = async (db: Db, id: number): Promise<void> => {
  await db.query('DELETE FROM tasks WHERE id = ?', [id]);
};
