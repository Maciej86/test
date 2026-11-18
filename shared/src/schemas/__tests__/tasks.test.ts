import { describe, it } from 'vitest';

describe('tasks schemas', () => {
  it.todo('textRange trims and checks min and max');
  it.todo('projectSchema name 2-60 characters');
  it.todo('projectSchema members 0-50 without duplicates');
  it.todo('taskSchema title 3-150 characters');
  it.todo('taskSchema description up to 2000 characters');
  it.todo('taskSchema assignees 0-10 without duplicates');
  it.todo('taskSchema column only draft, in_progress, done');
  it.todo('newTaskSchema due date not before today in Europe/Warsaw');
  it.todo('taskSchema accepts a past due date');
  it.todo('taskMoveSchema beforeTaskId number or null');
  it.todo('boardQuerySchema oldDone only 0 or 1');
});
