import { describe, it } from 'vitest';

describe('activity-log service', () => {
  it.todo('state: exists, archived or deleted from the record lookup');
  it.todo('link for each area: leave request, task, project, user, leave pool, leave type, contract type');
  it.todo('no link for archived and deleted records');
  it.todo('person ids in changes become names; missing account becomes "deleted account"');
});
