import { TASK_MESSAGES as M, commentExcerpt, taskBoardPath, type CommentData, type TaskComment } from '@app/shared';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { fail, notFound, type Result, type Viewer } from '../../middleware/routeHelpers';
import { notifyUsers } from '../notifications/notifications.service';
import * as cq from './comments.queries';
import * as tq from './tasks.queries';

const commentNotFound = () => fail(404, M.commentNotFound);
const notAuthor = () => fail(403, M.commentNotAuthor);

/** Komentarze zadania, które osoba widzi (inaczej 404); poprawia tylko autor, usuwa autor albo administrator. */
export const listTaskComments = async (taskId: number, viewer: Viewer): Promise<Result<TaskComment[]>> => {
  if (!(await tq.findTask(pool, taskId, viewer))) return notFound();
  const rows = await cq.listComments(pool, taskId);
  return rows.map((c) => {
    const own = c.authorId === viewer.id;
    return { ...c, canEdit: own, canDelete: own || viewer.role === 'admin' };
  });
};

/**
 * Nowy komentarz: zadanie zablokowane (nie zniknie w trakcie do archiwum), autor z sesji. Przypisani poza autorem
 * dostają powiadomienie z początkiem komentarza (osoby w archiwum pomija `notifyUsers`).
 */
export const addComment = async (taskId: number, data: CommentData, viewer: Viewer): Promise<Result<{ id: number }>> =>
  withTransaction(async (conn) => {
    const task = await tq.findTask(conn, taskId, viewer, { lock: true });
    if (!task) return notFound();
    const id = await cq.insertComment(conn, taskId, { id: viewer.id, name: viewer.name }, data.text);
    const others = ((await tq.assigneesOf(conn, [taskId])).get(taskId) ?? []).filter((userId) => userId !== viewer.id);
    if (others.length > 0) {
      await notifyUsers(conn, {
        type: 'task_comment',
        userIds: others,
        params: { task: task.title, excerpt: commentExcerpt(data.text) },
        link: taskBoardPath(task.projectId, taskId),
        actor: { id: viewer.id, name: viewer.name },
      });
    }
    return { id };
  });

/** Poprawka tylko przez autora (także administrator nie poprawia cudzego); ten sam tekst niczego nie zmienia. */
export const editComment = async (commentId: number, data: CommentData, viewer: Viewer): Promise<Result> =>
  withTransaction(async (conn) => {
    const comment = await cq.findComment(conn, commentId, viewer, { lock: true });
    if (!comment) return commentNotFound();
    if (comment.authorId !== viewer.id) return notAuthor();
    if (comment.text !== data.text) await cq.updateCommentText(conn, commentId, data.text);
    return { ok: true as const };
  });

/** Usunięcie na stałe: autor albo administrator. */
export const removeComment = async (commentId: number, viewer: Viewer): Promise<Result> =>
  withTransaction(async (conn) => {
    const comment = await cq.findComment(conn, commentId, viewer, { lock: true });
    if (!comment) return commentNotFound();
    if (comment.authorId !== viewer.id && viewer.role !== 'admin') return notAuthor();
    await cq.deleteComment(conn, commentId);
    return { ok: true as const };
  });
