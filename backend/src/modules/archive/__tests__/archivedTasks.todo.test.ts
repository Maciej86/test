import { describe, it } from 'vitest';

describe('archived tasks', () => {
  it.todo('list: only archived tasks, filtered by project and title, with projects that have archived tasks');
  it.todo('details: active task → 404');
  it.todo('details: description, assignees with archived flag, comments');
  it.todo('restore: missing task or deleted project → 404');
  it.todo('restore: active task → 409 not_archived');
  it.todo('restore: goes to the end of its column and logs restore');
  it.todo('delete: active task → 409 archive_first');
  it.todo('delete: deletes the task and logs delete');
});
