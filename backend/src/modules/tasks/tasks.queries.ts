import type { RowDataPacket } from 'mysql2';
import type { BoardPerson, Role, TaskColumn } from '@app/shared';
import type { Db } from '../../db/pool';
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
  createdByName: r.created_by_name as string,
  createdAt: new Date(r.created_at as string).toISOString(),
});

const TASK_COLUMNS_SQL = 't.id, t.project_id, t.title, t.description, t.due_date, t.column_key, t.position, t.completed_at, t.created_by_name, t.created_at';

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
