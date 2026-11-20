import { describe, it } from 'vitest';

describe('activity-log queries', () => {
  it.todo('listEntries: newest first, 50 per page, total count');
  it.todo('listEntries: search by entity name, context and author through LIKE ?');
  it.todo('listEntries: area, author and inclusive date range filters as parameters');
  it.todo('listPeople: distinct authors sorted by name');
  it.todo('recordStates: existing, archived and missing records per area');
  it.todo('userNames: names for user ids from changes');
});
