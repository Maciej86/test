import { afterEach, describe, expect, it, vi } from 'vitest';
import { boardQuerySchema, boardViewSchema, newTaskSchema, taskFinishSchema, projectDeleteSchema, projectSchema, taskMoveSchema, taskSchema } from '../tasks';
import { textRange } from '../fields';
import { TASK_COLUMNS } from '../../constants/tasks';

const chars = (n: number) => 'a'.repeat(n);
const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const fieldErrors = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));
const task = { title: 'Zamówić ulotki', description: '', dueDate: '', column: 'draft', assigneeIds: [] };

afterEach(() => vi.useRealTimers());

describe('tasks schemas', () => {
  it('textRange trims and checks min and max', () => {
    const schema = textRange(3, 5);
    expect(schema.parse('  abc  ')).toBe('abc');
    expect(schema.safeParse('').error?.issues[0]?.message).toBe('validation.required');
    expect(schema.safeParse('ab').error?.issues[0]?.message).toBe('validation.too_short');
    expect(schema.safeParse('abcdef').error?.issues[0]?.message).toBe('validation.too_long');
  });

  it('projectSchema name 2-60 characters', () => {
    expect(fieldErrors(projectSchema.safeParse({ name: 'a', memberIds: [] })).name).toBe('validation.too_short');
    expect(projectSchema.safeParse({ name: 'ab', memberIds: [] }).success).toBe(true);
    expect(projectSchema.safeParse({ name: chars(60), memberIds: [] }).success).toBe(true);
    expect(fieldErrors(projectSchema.safeParse({ name: chars(61), memberIds: [] })).name).toBe('validation.too_long');
  });

  it('projectSchema members 0-50 without duplicates', () => {
    expect(projectSchema.safeParse({ name: 'Marketing', memberIds: ids(50) }).success).toBe(true);
    expect(fieldErrors(projectSchema.safeParse({ name: 'Marketing', memberIds: ids(51) })).memberIds).toBe('validation.too_many');
    expect(fieldErrors(projectSchema.safeParse({ name: 'Marketing', memberIds: [3, 3] })).memberIds).toBe('validation.duplicates');
    expect(projectSchema.parse({ name: 'Marketing', memberIds: ['7'] }).memberIds).toEqual([7]);
  });

  it('projectDeleteSchema needs the typed name', () => {
    expect(projectDeleteSchema.safeParse({ confirmName: '' }).success).toBe(false);
    expect(projectDeleteSchema.parse({ confirmName: ' Marketing ' }).confirmName).toBe('Marketing');
  });

  it('taskSchema title 3-150 characters', () => {
    expect(fieldErrors(taskSchema.safeParse({ ...task, title: 'ab' })).title).toBe('validation.too_short');
    expect(taskSchema.safeParse({ ...task, title: 'abc' }).success).toBe(true);
    expect(taskSchema.safeParse({ ...task, title: chars(150) }).success).toBe(true);
    expect(fieldErrors(taskSchema.safeParse({ ...task, title: chars(151) })).title).toBe('validation.too_long');
  });

  it('taskSchema description up to 2000 characters, empty is null', () => {
    expect(taskSchema.parse(task).description).toBeNull();
    expect(taskSchema.safeParse({ ...task, description: chars(2000) }).success).toBe(true);
    expect(fieldErrors(taskSchema.safeParse({ ...task, description: chars(2001) })).description).toBe('validation.too_long');
  });

  it('taskSchema assignees 0-10 without duplicates', () => {
    expect(taskSchema.safeParse({ ...task, assigneeIds: ids(10) }).success).toBe(true);
    expect(fieldErrors(taskSchema.safeParse({ ...task, assigneeIds: ids(11) })).assigneeIds).toBe('validation.too_many');
    expect(fieldErrors(taskSchema.safeParse({ ...task, assigneeIds: [2, 2] })).assigneeIds).toBe('validation.duplicates');
  });

  it('taskSchema column only draft, in_progress, done', () => {
    expect(TASK_COLUMNS).toEqual(['draft', 'in_progress', 'done']);
    for (const column of TASK_COLUMNS) expect(taskSchema.safeParse({ ...task, column }).success).toBe(true);
    expect(taskSchema.safeParse({ ...task, column: 'archive' }).success).toBe(false);
  });

  it('newTaskSchema due date not before today in Europe/Warsaw', () => {
    vi.useFakeTimers();
    // 17.11.2026 23:30 UTC = 18.11.2026 0:30 w Warszawie: „dziś” to już 18.11.
    vi.setSystemTime(new Date('2026-11-17T23:30:00Z'));
    expect(fieldErrors(newTaskSchema.safeParse({ ...task, dueDate: '2026-11-17' })).dueDate).toBe('tasks.due_in_past');
    expect(newTaskSchema.safeParse({ ...task, dueDate: '2026-11-18' }).success).toBe(true);
    expect(newTaskSchema.parse(task).dueDate).toBeNull();
  });

  it('taskSchema accepts a past due date', () => {
    expect(taskSchema.safeParse({ ...task, dueDate: '2020-01-01' }).success).toBe(true);
    expect(fieldErrors(taskSchema.safeParse({ ...task, dueDate: '2026-02-30' })).dueDate).toBe('validation.date');
  });

  it('taskMoveSchema beforeTaskId number or null', () => {
    expect(taskMoveSchema.parse({ column: 'done', beforeTaskId: null })).toEqual({ column: 'done', beforeTaskId: null });
    expect(taskMoveSchema.parse({ column: 'done', beforeTaskId: 12 }).beforeTaskId).toBe(12);
    expect(taskMoveSchema.safeParse({ column: 'done', beforeTaskId: 0 }).success).toBe(false);
    expect(taskMoveSchema.safeParse({ column: 'done' }).success).toBe(false);
  });

  it('boardQuerySchema oldDone only 0 or 1', () => {
    expect(boardQuerySchema.parse({}).oldDone).toBe(false);
    expect(boardQuerySchema.parse({ oldDone: '1' }).oldDone).toBe(true);
    expect(boardQuerySchema.safeParse({ oldDone: '2' }).success).toBe(false);
  });

  it('boardViewSchema: search, only mine and the task from the address', () => {
    expect(boardViewSchema.parse({})).toEqual({ search: '', mine: false, task: undefined });
    expect(boardViewSchema.parse({ search: ' ulotki ', mine: '1', task: '40' })).toEqual({ search: 'ulotki', mine: true, task: 40 });
    expect(boardViewSchema.safeParse({ task: '1e3' }).success).toBe(false);
    expect(boardViewSchema.parse({ mine: 'true' }).mine).toBe(true);
    expect(boardViewSchema.safeParse({ mine: 'yes' }).success).toBe(false);
  });

  it('taskFinishSchema needs true or false', () => {
    expect(taskFinishSchema.parse({ finished: true })).toEqual({ finished: true });
    expect(taskFinishSchema.safeParse({ finished: 'yes' }).success).toBe(false);
    expect(taskFinishSchema.safeParse({}).success).toBe(false);
  });
});
