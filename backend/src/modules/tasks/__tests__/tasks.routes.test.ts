import { describe, it } from 'vitest';

describe('tasks routes', () => {
  it.todo('POST task 201 and 400 for due date in the past');
  it.todo('POST task 400 for assignee outside the project');
  it.todo('PUT task allows a past due date, 404 for archived task');
  it.todo('POST move 400 for beforeTaskId from another project');
  it.todo('POST archive then 404 on the second time');
  it.todo('abuse: forged ids in the address give 404 without calling the service');
});
