import { describe, it } from 'vitest';

describe('notifications routes', () => {
  it.todo('GET /notifications/summary without login → 401');
  it.todo('with temporary password → 403');
  it.todo('GET /notifications/summary → own summary');
  it.todo('GET /notifications → own list with query; unread=2 → 400');
  it.todo('POST /notifications/:id/read → 204; not a number or someone else\'s → 404');
  it.todo('POST /notifications/read-all → updated count');
});
