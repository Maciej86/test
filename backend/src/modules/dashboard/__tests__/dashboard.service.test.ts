import { describe, it } from 'vitest';

describe('dashboard service', () => {
  it.todo('today comes from todayIsoDate(); absences cover today and 13 more days');
  it.todo('admin: lists limited to DASHBOARD_BOX_LIMIT with total; doneSince = today − TASK_HIDE_DONE_AFTER_DAYS');
  it.todo('employee: own pool, own pending and next approved, own tasks (viewer id)');
  it.todo('employee without a pool → pool: null');
});
