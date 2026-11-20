// Docelowo: backend/src/modules/tasks/__tests__/dashboard.queries.test.ts
import { describe, it } from 'vitest';

describe('tasks queries for the dashboard', () => {
  it.todo('projectTaskCounts: every project in position order, zeros without tasks, without archived tasks');
  it.todo('projectTaskCounts: overdue = due_date < today and column ≠ done; doneRecently = completed_at >= doneSince');
  it.todo('listOverdueTasks: all projects, without archived and done, ORDER BY due_date, project and task position, with assignees and total');
  it.todo('listMyOpenTasks: assigned to viewer, draft or in_progress, not archived, visible project only');
  it.todo('listMyOpenTasks: overdue first, then due date, NULL last, then project and task position; total');
});
