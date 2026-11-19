import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { TaskComment } from '@app/shared';
import type { Db } from '../../db/pool';
import type { Actor, Viewer } from '../../middleware/routeHelpers';

/** Komentarz z bazy (bez praw: te liczy usługa dla oglądającego). */
export type CommentRow = Omit<TaskComment, 'canEdit' | 'canDelete'>;

const toIso = (value: unknown): string => new Date(value as string).toISOString();

const toComment = (r: RowDataPacket): CommentRow => ({
  id: r.id as number,
  authorId: (r.user_id as number | null) ?? null,
  authorName: r.user_name as string,
  authorArchived: r.archived_at !== null && r.archived_at !== undefined,
  text: r.text as string,
  createdAt: toIso(r.created_at),
  editedAt: r.edited_at ? toIso(r.edited_at) : null,
});

/** Komentarze zadania od najstarszego; autor usunięty na stałe: `authorId` null i kopia nazwiska. */
export const listComments = async (db: Db, taskId: number): Promise<CommentRow[]> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT c.id, c.user_id, c.user_name, c.text, c.edited_at, c.created_at, u.archived_at
     FROM task_comments c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.task_id = ? ORDER BY c.created_at, c.id`,
    [taskId],
  );
  return rows.map(toComment);
};

/**
 * Komentarz zadania spoza archiwum z projektu, który osoba widzi (ten sam warunek co `findTask`), inaczej null;
 * `lock` blokuje tylko wiersz komentarza (nie zadanie ani konto autora) do końca transakcji.
 */
export const findComment = async (
  db: Db,
  id: number,
  viewer: Viewer,
  opts: { lock?: boolean } = {},
): Promise<(CommentRow & { taskId: number; projectId: number }) | null> => {
  const sql = `SELECT c.id, c.task_id, t.project_id, c.user_id, c.user_name, c.text, c.edited_at, c.created_at, u.archived_at
     FROM task_comments c JOIN tasks t ON t.id = c.task_id LEFT JOIN users u ON u.id = c.user_id
     WHERE c.id = ? AND t.archived_at IS NULL AND (? = 'admin' OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = ?))`;
  const [rows] = await db.query<RowDataPacket[]>(opts.lock ? `${sql} FOR UPDATE OF c` : sql, [id, viewer.role, viewer.id]); // rule-ok: wstawione tylko stałe FOR UPDATE OF c z tego pliku, dane idą przez ?
  const r = rows[0];
  return r ? { ...toComment(r), taskId: r.task_id as number, projectId: r.project_id as number } : null;
};

/** Nowy komentarz: autor i kopia jego nazwiska z sesji. */
export const insertComment = async (db: Db, taskId: number, author: Actor, text: string): Promise<number> => {
  const [result] = await db.query<ResultSetHeader>(
    'INSERT INTO task_comments (task_id, user_id, user_name, text) VALUES (?, ?, ?, ?)',
    [taskId, author.id, author.name, text],
  );
  return result.insertId;
};

/** Poprawka tekstu: dopisek „edytowany” (edited_at). */
export const updateCommentText = async (db: Db, id: number, text: string): Promise<void> => {
  await db.query('UPDATE task_comments SET text = ?, edited_at = NOW() WHERE id = ?', [text, id]);
};

export const deleteComment = async (db: Db, id: number): Promise<void> => {
  await db.query('DELETE FROM task_comments WHERE id = ?', [id]);
};

/** Liczba komentarzy każdego zadania (licznik na karcie); zadania bez komentarzy nie ma w mapie. */
export const commentCounts = async (db: Db, taskIds: number[]): Promise<Map<number, number>> => {
  if (taskIds.length === 0) return new Map();
  const [rows] = await db.query<RowDataPacket[]>('SELECT task_id, COUNT(*) AS n FROM task_comments WHERE task_id IN (?) GROUP BY task_id', [taskIds]);
  return new Map(rows.map((r) => [r.task_id as number, Number(r.n)]));
};
